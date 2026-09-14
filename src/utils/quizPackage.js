import JSZip from 'jszip';
import { DEFAULT_THEME } from '../data/defaultTheme.js';

let pendingImportedQuiz = null;

export function setPendingImportedQuiz(quiz) {
  pendingImportedQuiz = quiz;
}

export function getPendingImportedQuiz() {
  return pendingImportedQuiz;
}

export function clearPendingImportedQuiz() {
  pendingImportedQuiz = null;
}

function extensionFromDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,/.exec(dataUrl || '');
  const mime = match?.[1] || '';
  if (mime.includes('png')) return 'png';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('svg')) return 'svg';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('quicktime')) return 'mov';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  return 'bin';
}

function dataUrlToBase64Body(dataUrl) {
  const commaIndex = dataUrl.indexOf(',');
  return commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1);
}

function isRemoteUrl(value) {
  return typeof value === 'string' && /^(https?:\/\/|\/\/)/i.test(value);
}

/**
 * Bundles everything needed to fully reproduce a quiz elsewhere — the
 * questions/slides/settings, the current theme, the logo, and every
 * uploaded image/video — into a single downloadable .zip "package".
 */
export async function exportQuizPackage(quiz, theme) {
  const zip = new JSZip();
  const media = zip.folder('media');

  const questions = quiz.questions.map((q) => {
    const clean = { ...q };
    if (q.mediaData && !isRemoteUrl(q.mediaData)) {
      const ext = extensionFromDataUrl(q.mediaData);
      const filename = `${q.id}.${ext}`;
      media.file(filename, dataUrlToBase64Body(q.mediaData), { base64: true });
      clean.mediaData = null;
      clean.mediaFile = `media/${filename}`;
    }
    return clean;
  });

  let logoFile = null;
  let logoDataUrl = quiz.logoDataUrl;
  if (quiz.logoDataUrl && !isRemoteUrl(quiz.logoDataUrl)) {
    const ext = extensionFromDataUrl(quiz.logoDataUrl);
    logoFile = `media/logo.${ext}`;
    media.file(`logo.${ext}`, dataUrlToBase64Body(quiz.logoDataUrl), { base64: true });
    logoDataUrl = null;
  }

  const manifest = {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    quiz: { ...quiz, questions, logoDataUrl, logoFile },
    theme: theme || DEFAULT_THEME,
  };

  zip.file('quiz.json', JSON.stringify(manifest, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(quiz.name || 'qnahut-quiz').toLowerCase().replace(/\s+/g, '-')}.qnahutpkg.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read media file from package.'));
    reader.readAsDataURL(blob);
  });
}

/** Reads a .zip package produced by exportQuizPackage and rehydrates it. */
export async function importQuizPackage(file) {
  let zip = null;
  let manifest;
  if (file.name?.toLowerCase().endsWith('.json') || file.type === 'application/json') {
    manifest = JSON.parse(await file.text());
  } else {
    zip = await JSZip.loadAsync(file);
    const manifestEntry = zip.file('quiz.json');
    if (!manifestEntry) throw new Error('That file is not a QNAHUT quiz package.');
    manifest = JSON.parse(await manifestEntry.async('string'));
  }
  if (!manifest.quiz || typeof manifest.quiz !== 'object') {
    throw new Error('The package does not contain a valid quiz.');
  }
  if (!Array.isArray(manifest.quiz.questions)) {
    throw new Error('The package quiz has no valid running order.');
  }

  const questions = await Promise.all(
    manifest.quiz.questions.map(async (q) => {
      if (!q || typeof q !== 'object') throw new Error('The package contains an invalid question.');
      if (!q.mediaFile || !zip) return q;
      const entry = zip.file(q.mediaFile);
      if (!entry) return q;
      const blob = await entry.async('blob');
      const mediaData = await blobToDataUrl(blob);
      const clean = { ...q, mediaData };
      delete clean.mediaFile;
      return clean;
    }),
  );

  let logoDataUrl = null;
  if (manifest.quiz.logoFile && zip) {
    const entry = zip.file(manifest.quiz.logoFile);
    if (entry) logoDataUrl = await blobToDataUrl(await entry.async('blob'));
  }

  const quiz = {
    ...manifest.quiz,
    questions,
    logoDataUrl: manifest.quiz.logoDataUrl || logoDataUrl,
  };

  return {
    quiz,
    theme: manifest.theme,
  };
}
