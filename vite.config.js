import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'node:os';
import { WebSocketServer } from 'ws';

function localHostAddress() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    const address = entries?.find((entry) => entry.family === 'IPv4' && !entry.internal);
    if (address) return address.address;
  }
  return '127.0.0.1';
}

function localHostPlugin() {
  const quizSnapshots = new Map();
  const snapshotRevisions = new Map();
  const websocketClients = new Set();
  let activeQuiz = null;

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

  function attachWebSocketServer(httpServer) {
    if (!httpServer || httpServer.__qnahutWebSocketServer) return;
    const websocketServer = new WebSocketServer({ noServer: true });
    httpServer.__qnahutWebSocketServer = websocketServer;
    function handleConnection(client) {
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
    }
    websocketServer.on('connection', handleConnection);
    httpServer.on('upgrade', (request, socket, head) => {
      const requestUrl = new URL(request.url, 'http://localhost');
      if (requestUrl.pathname !== '/__qnahut-ws') return;
      websocketServer.handleUpgrade(request, socket, head, (client) => {
        websocketServer.emit('connection', client, request);
      });
    });
  }

  function middleware(_req, res, next) {
    const requestUrl = new URL(_req.url, 'http://localhost');
    if (requestUrl.pathname === '/__qnahut-host') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ host: localHostAddress() }));
      return;
    }

    if (requestUrl.pathname === '/__qnahut-active') {
      res.setHeader('Content-Type', 'application/json');
      if (_req.method === 'PUT') {
        let body = '';
        _req.on('data', (chunk) => {
          body += chunk;
        });
        _req.on('end', () => {
          try {
            const nextActiveQuiz = JSON.parse(body);
            if (
              activeQuiz &&
              (nextActiveQuiz.buzzerEpoch || 0) < (activeQuiz.buzzerEpoch || 0)
            ) {
              res.end(JSON.stringify({ ok: true, ignored: true }));
              return;
            }
            activeQuiz = stampSnapshot(nextActiveQuiz);
            if (activeQuiz && !isAuthorized(activeQuiz, requestUrl.searchParams.get('token'))) {
              res.statusCode = 401;
              res.end(JSON.stringify({ error: 'Invalid quiz access token.' }));
              return;
            }
            broadcastQuiz(activeQuiz);
            res.end(JSON.stringify({ ok: true }));
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid quiz snapshot.' }));
          }
        });
        return;
      }
      res.statusCode = activeQuiz ? 200 : 404;
      res.end(JSON.stringify(activeQuiz || { error: 'No quiz is running.' }));
      return;
    }

    const quizMatch = requestUrl.pathname.match(/^\/__qnahut-quiz\/([^/?]+)$/);
    if (!quizMatch) {
      next();
      return;
    }

    const quizId = decodeURIComponent(quizMatch[1]);
    res.setHeader('Content-Type', 'application/json');
    if (_req.method === 'GET') {
      const snapshot = quizSnapshots.get(quizId);
      if (snapshot && !isAuthorized(snapshot, requestUrl.searchParams.get('token'))) {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: 'Invalid quiz access token.' }));
        return;
      }
      res.statusCode = snapshot ? 200 : 404;
      res.end(JSON.stringify(snapshot || { error: 'Quiz not found.' }));
      return;
    }
    if (_req.method === 'PUT') {
      let body = '';
      _req.on('data', (chunk) => {
        body += chunk;
      });
      _req.on('end', () => {
        try {
          const snapshot = stampSnapshot(JSON.parse(body));
          const accessToken = requestUrl.searchParams.get('token');
          const existingSnapshot = quizSnapshots.get(quizId);
          if (
            !snapshot.accessToken ||
            snapshot.id !== quizId ||
            (existingSnapshot && existingSnapshot.accessToken && !isAuthorized(existingSnapshot, accessToken))
          ) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: 'Invalid quiz access token.' }));
            return;
          }
          if (
            existingSnapshot &&
            (snapshot.buzzerEpoch || 0) < (existingSnapshot.buzzerEpoch || 0)
          ) {
            res.end(JSON.stringify({ ok: true, ignored: true }));
            return;
          }
          quizSnapshots.set(quizId, snapshot);
          activeQuiz = snapshot;
          broadcastQuiz(snapshot);
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid quiz snapshot.' }));
        }
      });
      return;
    }
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed.' }));
  }

  return {
    name: 'qnahut-local-host',
    configureServer(server) {
      attachWebSocketServer(server.httpServer);
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      attachWebSocketServer(server.httpServer);
      server.middlewares.use(middleware);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), localHostPlugin()],
  server: {
    host: true,
    port: 3000,
  },
  preview: {
    host: true,
    port: 3000,
  },
});
