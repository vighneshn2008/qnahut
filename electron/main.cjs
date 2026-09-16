const { app, BrowserWindow, Menu, shell } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { WebSocketServer } = require('ws');

const isDev = process.env.NODE_ENV === 'development';
const devUrl = process.env.QNAHUT_DEV_URL || 'http://127.0.0.1:5173';
const appPort = Number(process.env.QNAHUT_PORT || 3000);
let localServer;

function localHostAddress() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    const address = entries?.find((entry) => entry.family === 'IPv4' && !entry.internal);
    if (address) return address.address;
  }
  return '127.0.0.1';
}

function startLocalServer() {
  const quizSnapshots = new Map();
  const snapshotRevisions = new Map();
  const websocketClients = new Set();
  let activeQuiz = null;
  const distDirectory = path.join(__dirname, '..', 'dist');

  function broadcastQuiz(quiz) {
    if (!quiz?.id) return;
    const message = JSON.stringify({ type: 'QUIZ_SNAPSHOT', quiz });
    for (const client of websocketClients) {
      if (client.readyState === 1 && client.quizId === quiz.id) client.send(message);
    }
  }

  function broadcastPresence(quizId) {
    const teamIds = [...websocketClients]
      .filter((client) => client.quizId === quizId && client.teamId)
      .map((client) => client.teamId);
    const message = JSON.stringify({ type: 'QUIZ_PRESENCE', teamIds });
    for (const client of websocketClients) {
      if (client.readyState === 1 && client.quizId === quizId) client.send(message);
    }
  }

  function isAuthorized(snapshot, accessToken) {
    return Boolean(snapshot?.accessToken && accessToken && snapshot.accessToken === accessToken);
  }

  function stampSnapshot(snapshot) {
    const nextRevision = (snapshotRevisions.get(snapshot.id) || 0) + 1;
    snapshotRevisions.set(snapshot.id, nextRevision);
    return { ...snapshot, syncRevision: nextRevision };
  }

  /**
   * Folds a guest's buzzer activity (buzzes + text answers) into the stored
   * snapshot without letting the guest overwrite the host's authoritative
   * fields (question index, timer, teams, scores). Returns the stored
   * snapshot unchanged when there is nothing new to merge, so an echo of the
   * host's own state never triggers another round of broadcasts.
   */
  function mergeBuzzerInto(existing, incoming) {
    if (!existing) return incoming;
    const existingBuzzer = existing.buzzer || { locked: false, order: [], answers: {} };
    const incomingBuzzer = incoming.buzzer || {};
    const incomingOrder = incomingBuzzer.order || [];
    const incomingEpoch = incomingBuzzer.buzzerEpoch || 0;
    if (incomingEpoch < (existingBuzzer.buzzerEpoch || 0)) return existing;
    const order = [...(existingBuzzer.order || [])];
    const known = new Set(order.map((entry) => entry.teamId));
    let changed = false;
    for (const entry of incomingOrder) {
      if (!known.has(entry.teamId)) {
        order.push(entry);
        known.add(entry.teamId);
        changed = true;
      }
    }
    const answers = { ...(existingBuzzer.answers || {}) };
    for (const [teamId, text] of Object.entries(incomingBuzzer.answers || {})) {
      if (answers[teamId] === undefined) {
        answers[teamId] = text;
        changed = true;
      }
    }
    if (!changed) return existing;
    return {
      ...existing,
      buzzer: {
        ...existingBuzzer,
        order,
        answers,
        locked:
          (incomingOrder.length > 0 && incomingBuzzer.locked === true) ||
          Boolean(existingBuzzer.locked),
        buzzerEpoch: Math.max(existingBuzzer.buzzerEpoch || 0, incomingEpoch),
        buzzerRevision: Math.max(
          existingBuzzer.buzzerRevision || 0,
          incomingBuzzer.buzzerRevision || 0,
        ),
      },
    };
  }

  localServer = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const pathname = requestUrl.pathname;

    if (pathname === '/__qnahut-host') {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ host: localHostAddress() }));
      return;
    }

    if (pathname === '/__qnahut-active') {
      response.setHeader('Content-Type', 'application/json');
      if (request.method === 'PUT') {
        readJson(
          request,
          (quiz) => {
            if (quiz && !isAuthorized(quiz, requestUrl.searchParams.get('token'))) {
              response.statusCode = 401;
              response.end(JSON.stringify({ error: 'Invalid quiz access token.' }));
              return;
            }
            if (activeQuiz && (quiz.buzzerEpoch || 0) < (activeQuiz.buzzerEpoch || 0)) {
              response.end(JSON.stringify({ ok: true, ignored: true }));
              return;
            }
            const isGuest = requestUrl.searchParams.get('origin') !== 'host';
            let storedQuiz = quiz;
            if (isGuest && activeQuiz) {
              storedQuiz = mergeBuzzerInto(activeQuiz, quiz);
              if (storedQuiz === activeQuiz) {
                response.end(JSON.stringify({ ok: true, ignored: true }));
                return;
              }
            }
            activeQuiz = stampSnapshot(storedQuiz);
            broadcastQuiz(activeQuiz);
            response.end(JSON.stringify({ ok: true }));
          },
          response,
        );
        return;
      }
      response.statusCode = activeQuiz ? 200 : 404;
      response.end(JSON.stringify(activeQuiz || { error: 'No quiz is running.' }));
      return;
    }

    const quizMatch = pathname.match(/^\/__qnahut-quiz\/([^/]+)$/);
    if (quizMatch) {
      const quizId = decodeURIComponent(quizMatch[1]);
      response.setHeader('Content-Type', 'application/json');
      if (request.method === 'GET') {
        const snapshot = quizSnapshots.get(quizId);
        if (snapshot && !isAuthorized(snapshot, requestUrl.searchParams.get('token'))) {
          response.statusCode = 401;
          response.end(JSON.stringify({ error: 'Invalid quiz access token.' }));
          return;
        }
        response.statusCode = snapshot ? 200 : 404;
        response.end(JSON.stringify(snapshot || { error: 'Quiz not found.' }));
        return;
      }
      if (request.method === 'PUT') {
        readJson(
          request,
          (quiz) => {
            const accessToken = requestUrl.searchParams.get('token');
            const existingSnapshot = quizSnapshots.get(quizId);
            if (
              !quiz.accessToken ||
              quiz.id !== quizId ||
              (existingSnapshot && existingSnapshot.accessToken && !isAuthorized(existingSnapshot, accessToken))
            ) {
              response.statusCode = 401;
              response.end(JSON.stringify({ error: 'Invalid quiz access token.' }));
              return;
            }
            if (
              existingSnapshot &&
              (quiz.buzzerEpoch || 0) < (existingSnapshot.buzzerEpoch || 0)
            ) {
              response.end(JSON.stringify({ ok: true, ignored: true }));
              return;
            }
            const isGuest = requestUrl.searchParams.get('origin') !== 'host';
            let storedQuiz = quiz;
            if (isGuest && existingSnapshot) {
              storedQuiz = mergeBuzzerInto(existingSnapshot, quiz);
              if (storedQuiz === existingSnapshot) {
                response.end(JSON.stringify({ ok: true, ignored: true }));
                return;
              }
            }
            const stampedQuiz = stampSnapshot(storedQuiz);
            quizSnapshots.set(quizId, stampedQuiz);
            activeQuiz = stampedQuiz;
            broadcastQuiz(stampedQuiz);
            response.end(JSON.stringify({ ok: true }));
          },
          response,
        );
        return;
      }
      response.statusCode = 405;
      response.end(JSON.stringify({ error: 'Method not allowed.' }));
      return;
    }

    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.normalize(path.join(distDirectory, requestedPath));
    const safePath = filePath.startsWith(distDirectory)
      ? filePath
      : path.join(distDirectory, 'index.html');
    fs.readFile(safePath, (error, content) => {
      if (error) {
        fs.readFile(path.join(distDirectory, 'index.html'), (fallbackError, fallbackContent) => {
          response.statusCode = fallbackError ? 404 : 200;
          response.setHeader('Content-Type', 'text/html');
          response.end(fallbackError ? 'Not found' : fallbackContent);
        });
        return;
      }
      response.setHeader('Content-Type', contentType(safePath));
      response.end(content);
    });
  });

  const websocketServer = new WebSocketServer({ server: localServer, path: '/__qnahut-ws' });
  websocketServer.on('connection', (client) => {
    websocketClients.add(client);
    client.on('message', (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        if (message.type !== 'SUBSCRIBE' || !message.quizId) return;
        const snapshot = quizSnapshots.get(message.quizId);
        if (!isAuthorized(snapshot, message.accessToken)) {
          client.close(1008, 'Invalid quiz access token');
          return;
        }
        client.quizId = message.quizId;
        client.teamId = message.teamId || null;
        broadcastPresence(message.quizId);
        if (snapshot && client.readyState === 1) {
          client.send(JSON.stringify({ type: 'QUIZ_SNAPSHOT', quiz: snapshot }));
        }
      } catch {
        client.close(1003, 'Invalid message');
      }
    });
    client.on('close', () => {
      const quizId = client.quizId;
      websocketClients.delete(client);
      if (quizId) broadcastPresence(quizId);
    });
  });

  localServer.listen(appPort, '0.0.0.0', () => {
    console.log(`QNAHUT available on http://${localHostAddress()}:${appPort}`);
  });
}

function readJson(request, onSuccess, response) {
  let body = '';
  request.on('data', (chunk) => {
    body += chunk;
  });
  request.on('end', () => {
    try {
      onSuccess(JSON.parse(body));
    } catch {
      response.statusCode = 400;
      response.end(JSON.stringify({ error: 'Invalid quiz snapshot.' }));
    }
  });
}

function contentType(filePath) {
  return (
    {
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.html': 'text/html',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
    }[path.extname(filePath)] || 'application/octet-stream'
  );
}

app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

function createWindow(projectorSearch = '') {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0a0c10',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isDev && url.startsWith(new URL(devUrl).origin)) return { action: 'allow' };

    const target = new URL(url);
    const isPackagedAppUrl = !isDev && target.origin === `http://127.0.0.1:${appPort}`;
    if ((!isDev && url.startsWith('file://')) || isPackagedAppUrl) {
      if (target.searchParams.get('view') === 'projector') {
        createWindow(target.search);
        return { action: 'deny' };
      }
    }

    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    window.loadURL(devUrl);
  } else {
    window.loadURL(`http://127.0.0.1:${appPort}${projectorSearch}`);
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  if (!isDev) startLocalServer();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  localServer?.close();
  if (process.platform !== 'darwin') app.quit();
});
