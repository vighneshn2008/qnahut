/**
 * Builds the 80-question demo quiz and packages it into a single
 * .qnahutpkg.zip — the exact same format exportQuizPackage produces in the
 * browser — so it can be imported through the Settings → Quiz package flow.
 *
 *   node scripts/make-demo-package.mjs
 *
 * The bundled theme customises the fonts, adds a background image, a quiz
 * logo and a generated buzzer sound, so the zip exercises every feature.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { createDemoQuiz } from '../src/data/demoQuiz.js';
import { THEME_PRESETS } from '../src/data/defaultTheme.js';
import { mergeTheme } from '../src/utils/theme.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(rootDir, 'demo');
const outputFile = path.join(outputDir, 'qnahut-demo-80.qnahutpkg.zip');

function encodeBase64(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

function svgDataUrl(svg) {
  return `data:image/svg+xml;base64,${encodeBase64(svg)}`;
}

/** A tiny WAV file synthesized in-memory — acts as the themed buzzer sound. */
function createBeepWavDataUrl() {
  const sampleRate = 16000;
  const seconds = 0.3;
  const numSamples = Math.floor(sampleRate * seconds);
  const dataSize = numSamples;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate, 28);
  buf.writeUInt16LE(1, 32);
  buf.writeUInt16LE(8, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i += 1) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t * 40) * Math.min(1, (seconds - t) * 60);
    const wave =
      Math.sign(Math.sin(2 * Math.PI * 880 * t)) * 0.35 +
      Math.sign(Math.sin(2 * Math.PI * 660 * t)) * 0.3 +
      Math.sign(Math.sin(2 * Math.PI * 520 * t)) * 0.35;
    const value = Math.round(128 + wave * 110 * envelope);
    buf.writeUInt8(value, 44 + i);
  }
  return `data:audio/wav;base64,${buf.toString('base64')}`;
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

async function main() {
  const quiz = createDemoQuiz();
  const preset = THEME_PRESETS.find((p) => p.name === 'Deep Ocean') || THEME_PRESETS[0];

  const theme = mergeTheme({
    ...preset,
    name: 'Deep Ocean Demo',
    backgroundImage: svgDataUrl(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">' +
        '<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#0C1B30"/><stop offset=".5" stop-color="#14304E"/>' +
        '<stop offset="1" stop-color="#0B0713"/></linearGradient></defs>' +
        '<rect width="1920" height="1080" fill="url(#b)"/>' +
        '<circle cx="1600" cy="240" r="380" fill="#38BDF8" opacity="0.12"/>' +
        '<circle cx="260" cy="900" r="460" fill="#6366F1" opacity="0.10"/>' +
        '<text x="960" y="540" font-family="Arial" font-size="48" fill="#38BDF8" opacity="0.25" text-anchor="middle">demo-bg</text>' +
        '</svg>',
    ),
    buzzerSoundDataUrl: createBeepWavDataUrl(),
  });

  quiz.logoDataUrl = svgDataUrl(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#2DE2E6"/><stop offset="1" stop-color="#FF3D8A"/></linearGradient></defs>' +
      '<polygon points="100,8 178,54 178,146 100,192 22,146 22,54" fill="url(#g)"/>' +
      '<text x="100" y="122" font-family="Arial" font-size="42" font-weight="900" fill="#0A0C10" text-anchor="middle">Q</text>' +
      '</svg>',
  );

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

  let logoDataUrl = quiz.logoDataUrl;
  if (logoDataUrl && !isRemoteUrl(logoDataUrl)) {
    const ext = extensionFromDataUrl(logoDataUrl);
    media.file(`logo.${ext}`, dataUrlToBase64Body(logoDataUrl), { base64: true });
    logoDataUrl = null;
  }

  const manifest = {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    quiz: { ...quiz, questions, logoDataUrl, logoFile: 'media/logo.svg' },
    theme,
  };

  zip.file('quiz.json', JSON.stringify(manifest, null, 2));

  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputFile, buffer);

  const scored = questions.filter((q) => !q.isSlide).length;
  const slides = questions.filter((q) => q.isSlide).length;
  console.log(`Wrote ${outputFile}`);
  console.log(`  items: ${questions.length} (${scored} questions, ${slides} slides)`);
  console.log(`  size: ${(buffer.length / 1024).toFixed(1)} kB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});