import { createQuestion, createSlide, createTeam } from '../utils/quizFactory.js';

const VIDEO_SAMPLE = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample';

function encodeBase64(str) {
  if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(str)));
  return Buffer.from(str, 'utf8').toString('base64');
}

/** Inline SVG image so the demo's image questions have real (self-hosted) media. */
function svgDataUrl(label, from, to, bg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="420" fill="${bg}"/>
  <rect width="640" height="420" fill="url(#g)" opacity="0.92"/>
  <circle cx="320" cy="180" r="92" fill="rgba(255,255,255,0.08)"/>
  <text x="320" y="212" font-family="Arial, sans-serif" font-size="86" font-weight="700" fill="#ffffff" text-anchor="middle">${label}</text>
</svg>`;
  return `data:image/svg+xml;base64,${encodeBase64(svg)}`;
}

function imageSpec({ label, from, to, bg, answer, ...rest }) {
  return { mediaData: svgDataUrl(label, from, to, bg), answer, ...rest };
}

function withRound(round, roundName) {
  return (item) => ({ ...item, round, roundName });
}

export function createDemoQuiz() {
  const questions = [];
  const headers = [];

  function header(text, body, round, roundName) {
    headers.push(createSlide('round-header', { text, body, round, roundName }));
  }

  function add(spec, round, roundName) {
    questions.push(createQuestion(withRound(round, roundName)(spec)));
  }

  // ————————————————————————————— Round 1 — Quick Fire —————————————————————————————
  header('Round 1', 'Ten fast text rounds — 12 seconds each, nothing goes into the negatives.', 1, 'Quick Fire');
  [
    ['What is the largest planet in our solar system?', 'Jupiter'],
    ['How many legs does a spider have?', '8'],
    ['What gas do plants absorb from the atmosphere?', 'Carbon dioxide'],
    ['What is the freezing point of water in degrees Celsius?', '0'],
    ['Which ocean is the largest on Earth?', 'Pacific'],
    ['How many continents are there on Earth?', '7'],
    ['What is the chemical symbol for oxygen?', 'O'],
    ['Which planet is closest to the Sun?', 'Mercury'],
    ['How many minutes are in an hour?', '60'],
    ['What is the only mammal that can truly fly?', 'Bat'],
  ].forEach(([text, answer]) =>
    add({
      type: 'text',
      text,
      answer,
      timer: 12,
      hideAfterTimer: true,
      pointsCorrect: 10,
      pointsWrong: -2,
      allowPartial: false,
      pointsPartial: 4,
    }, 1, 'Quick Fire'),
  );

  // ——————————————————————— Round 2 — General Knowledge ———————————————————————
  header('Round 2', 'Rich HTML slides — the scripted questions render live counters on the projector.', 2, 'General Knowledge');
  add({
    type: 'html',
    text: 'HTML question — type in any box.',
    htmlContent:
      '<div style="text-align:center"><h2>Which city is the capital of France?</h2><input id="ans" placeholder="Type here…" style="margin-top:12px;padding:10px 16px;font-size:18px;border-radius:8px;border:2px solid #888;"><script>document.getElementById("ans").focus();</script></div>',
    answer: 'Paris',
    timer: 20,
    pointsCorrect: 10,
    pointsWrong: -2,
    allowPartial: false,
  }, 2, 'General Knowledge');
  add({
    type: 'html',
    text: 'The script on this HTML slide reveals the answer itself after a countdown.',
    htmlContent:
      '<div style="text-align:center"><h2>Which prime number comes after 11?</h2><p style="font-size:72px;font-weight:800">&#63;</p><script>var el=document.querySelector("p");var n=3;var t=setInterval(function(){if(n===0){el.textContent="13";clearInterval(t);}else{el.textContent=n;n-=1;}},700);</script></div>',
    answer: '13',
    timer: 25,
    pointsCorrect: 10,
    pointsWrong: -2,
    allowPartial: false,
  }, 2, 'General Knowledge');
  [
    ['How many sides does a triangle have?', '3'],
    ['What do honey bees produce?', 'Honey'],
    ['What is the largest mammal on Earth?', 'Blue whale'],
    ['How many keys does a standard piano have?', '88'],
    ['What is the next number in this sequence? 1, 1, 2, 3, 5, …', '8'],
    ['What does H₂O stand for?', 'Water'],
    ['What is the fastest land animal?', 'Cheetah'],
    ['Which language is spoken in Brazil?', 'Portuguese'],
  ].forEach(([text, answer], i) =>
    add({
      type: i % 3 === 2 ? 'html' : 'text',
      htmlContent:
        i % 3 === 2
          ? `<div style="text-align:center"><h2>${text}</h2><p style="opacity:.75">Rendered with an HTML slide — any markup you paste in is re-created live.</p></div>`
          : '',
      text,
      answer,
      timer: 20,
      pointsCorrect: 10,
      pointsWrong: -2,
      allowPartial: false,
    }, 2, 'General Knowledge'),
  );

  // ——————————————————————— Round 3 — Picture Perfect ———————————————————————
  header('Round 3', 'Image questions with real inline media. Partial credit is on.', 3, 'Picture Perfect');
  [
    imageSpec({ label: 'COLOR', from: '#1E3A8A', to: '#B91C1C', bg: '#0F172A', answer: 'France', mediaLabel: 'A three-stripe vertical flag', imageFit: 'contain' }),
    imageSpec({ label: 'ROUND', from: '#DC2626', to: '#991B1B', bg: '#0B1220', answer: 'Japan', mediaLabel: 'A red circle on white', imageFit: 'contain' }),
    imageSpec({ label: 'E=mc²', from: '#0EA5E9', to: '#7C3AED', bg: '#0F172A', answer: 'Albert Einstein', mediaLabel: 'A famous physics formula', imageFit: 'contain' }),
    imageSpec({ label: 'π', from: '#F59E0B', to: '#EF4444', bg: '#1C1917', answer: 'Pi', mediaLabel: 'A mathematical constant', imageFit: 'contain' }),
    imageSpec({ label: '5 RINGS', from: '#22C55E', to: '#3B82F6', bg: '#0A0F1E', answer: 'Olympic Games', mediaLabel: 'Interlocking circles', imageFit: 'contain' }),
    imageSpec({ label: 'CHECKER', from: '#111827', to: '#374151', bg: '#18181B', answer: 'Motor racing', mediaLabel: 'A black-and-white pattern', imageFit: 'cover' }),
    imageSpec({ label: '42', from: '#14B8A6', to: '#6366F1', bg: '#0F172A', answer: '42', mediaLabel: 'The meaning of everything', imageFit: 'contain' }),
    imageSpec({ label: 'HEART', from: '#F43F5E', to: '#881337', bg: '#1C1917', answer: 'Heart', mediaLabel: 'A body organ', imageFit: 'contain' }),
    imageSpec({ label: 'SPIRAL', from: '#FBBF24', to: '#D97706', bg: '#292524', answer: 'Snail', mediaLabel: 'A coiled shell', imageFit: 'contain' }),
    imageSpec({ label: 'RAINBOW', from: '#EF4444', to: '#8B5CF6', bg: '#0F172A', answer: 'Rainbow', mediaLabel: 'Seven-colour arc', imageFit: 'cover', fullscreenMedia: true }),
  ].forEach((spec, i) =>
    add({
      type: i === 9 ? 'image-only' : 'image',
      text: i === 9 ? '' : 'What does this image show?',
      pointsCorrect: 15,
      pointsWrong: -3,
      allowPartial: true,
      pointsPartial: 7,
      timer: 25,
      fullscreenMedia: spec.fullscreenMedia || i === 9,
      ...spec,
    }, 3, 'Picture Perfect'),
  );

  // ———————————————————————— Round 4 — Screen Time ————————————————————————
  header('Round 4', 'Video round — remote MP4 links stream straight onto the projector.', 4, 'Screen Time');
  [
    ['BigBuckBunny.mp4', 'What animal is the star of this film?', 'Rabbit', false, 30, 15],
    ['ElephantsDream.mp4', 'Which animal inspired the name of this film?', 'Elephant', true, 30, 20],
    ['Sintel.mp4', 'What is the name of the main character in this short?', 'Sintel', false, 35, 20],
    ['TearsOfSteel.mp4', 'Which metal is in this film’s title?', 'Steel', false, 25, 15],
    ['ForBiggerBlazes.mp4', '“Blazes” in the title means…', 'Fire', true, 20, 10],
    ['ForBiggerJoyrides.mp4', 'What kind of vehicle appears in a “joyride”?', 'Car', false, 20, 10],
    ['SubaruOutbackOnStreetAndDirt.mp4', 'What type of vehicle is driving here?', 'Car', false, 25, 12],
    ['WhatCarCanYouGetForAGrand.mp4', 'What does this title ask about?', 'A car', true, 25, 12],
    ['WeAreGoingOnBullrun.mp4', 'Which animal is in the title?', 'Bull', false, 20, 10],
    ['VolkswagenGTIReview.mp4', 'Which car brand is being reviewed?', 'Volkswagen', false, 25, 15],
  ].forEach(([file, text, answer, fullscreen, timer, points], i) =>
    add({
      type: fullscreen ? 'video-only' : 'video',
      text,
      answer,
      fullscreenMedia: fullscreen,
      mediaData: `${VIDEO_SAMPLE}/${file}`,
      mediaLabel: file.replace(/\.mp4$/, ''),
      timer,
      pointsCorrect: points,
      pointsWrong: -2,
      allowPartial: i % 2 === 0,
      pointsPartial: Math.round(points / 2),
    }, 4, 'Screen Time'),
  );

  // ———————————————————————— Round 5 — Tricky Traps ————————————————————————
  header('Round 5', 'Negative marking is live from here on. Wrong answers cost points!', 5, 'Tricky Traps');
  [
    ['What is the chemical symbol for gold?', 'Au', 15],
    ['What is the largest hot desert on Earth?', 'Sahara', 15],
    ['What is the average of 2, 4 and 6?', '4', 12],
    ['What is pumped around the body by the heart?', 'Blood', 15],
    ['How many players are on the field for one cricket team?', '11', 15],
    ['Who painted the Mona Lisa?', 'Leonardo da Vinci', 20],
    ['What is the chemical formula for table salt?', 'NaCl', 15],
    ['What is the first element on the periodic table?', 'Hydrogen', 15],
    ['They say breakfast is the most important meal. Name the chemical symbol for sodium.', 'Na', 12],
    ['Which gas makes up about 78% of Earth’s atmosphere?', 'Nitrogen', 15],
  ].forEach(([text, answer, points], i) =>
    add({
      type: i === 5 ? 'html' : 'text',
      htmlContent:
        i === 5
          ? '<div style="text-align:center"><h2>Who painted the Mona Lisa?</h2><p style="opacity:.7">Strict text round — be precise!</p></div>'
          : '',
      text,
      answer,
      timer: 20,
      tiebreaker: i === 2,
      pointsCorrect: points,
      pointsWrong: -points / 2,
      allowPartial: false,
      hideAfterTimer: i === 8,
    }, 5, 'Tricky Traps'),
  );

  // ———————————————————————— Round 6 — Half Credit ————————————————————————
  header('Round 6', 'Picture-only round — partial credit is generous, speed matters.', 6, 'Half Credit');
  const partialImages = [
    imageSpec({ label: 'LION', from: '#F59E0B', to: '#B45309', bg: '#1C1917', answer: 'Lion', mediaLabel: 'A big cat silhouette' }),
    imageSpec({ label: 'APPLE', from: '#EF4444', to: '#7F1D1D', bg: '#1C1917', answer: 'Apple', mediaLabel: 'A fruit' }),
    imageSpec({ label: '♪', from: '#8B5CF6', to: '#312E81', bg: '#0F172A', answer: 'Eighth note', mediaLabel: 'Two dots joined by a beam' }),
    imageSpec({ label: '⚓', from: '#0EA5E9', to: '#0369A1', bg: '#0F172A', answer: 'Anchor', mediaLabel: 'Sea-faring equipment' }),
    imageSpec({ label: 'MOON', from: '#E5E7EB', to: '#6B7280', bg: '#0B1220', answer: 'Moon', mediaLabel: 'Earth’s satellite' }),
    imageSpec({ label: '☎', from: '#10B981', to: '#065F46', bg: '#111827', answer: 'Telephone', mediaLabel: 'Old-school communication' }),
    imageSpec({ label: 'RADIO', from: '#F43F5E', to: '#9F1239', bg: '#0F172A', answer: 'Radio', mediaLabel: 'Wireless sound device' }),
    imageSpec({ label: 'CLOCK', from: '#FBBF24', to: '#92400E', bg: '#292524', answer: 'Clock', mediaLabel: 'Tells the time' }),
    imageSpec({ label: 'KEY', from: '#A78BFA', to: '#4C1D95', bg: '#0F172A', answer: 'Key', mediaLabel: 'Opens a lock' }),
    imageSpec({ label: 'SUN', from: '#FDBA74', to: '#EA580C', bg: '#1C1917', answer: 'Sun', mediaLabel: 'Our nearest star' }),
  ];
  partialImages.forEach((spec, i) =>
    add({
      type: 'image-only',
      text: '',
      pointsCorrect: 12,
      pointsWrong: -2,
      allowPartial: true,
      pointsPartial: 6,
      timer: 15,
      fullscreenMedia: i === 9,
      imageFit: 'contain',
      ...spec,
    }, 6, 'Half Credit'),
  );

  // ——————————————————————— Round 7 — Race to the Finish ———————————————————————
  header('Round 7', 'Fast buzzer-friendly questions — the clock is your enemy.', 7, 'Race to the Finish');
  [
    ['How many seconds are in 5 minutes?', '300', 15, false],
    ['What is half of 150?', '75', 15, false],
    ['Which bird is famous for repeating human speech?', 'Parrot', 15, false],
    ['What is the tallest mountain above sea level?', 'Mount Everest', 20, false],
    ['Which insect has a queen and lives in a hive?', 'Bee', 15, false],
    ['How many sides does a hexagon have?', '6', 15, false],
    ['What is the currency of Japan?', 'Yen', 15, false],
    ['Which planet has the most moons?', 'Saturn', 20, false],
    ['What is the smallest country in the world?', 'Vatican City', 25, true],
    ['A trio has how many members?', '3', 10, false],
  ].forEach(([text, answer, points, tiebreaker], i) =>
    add({
      type: i % 4 === 0 ? 'html' : 'text',
      htmlContent:
        i % 4 === 0
          ? `<div style="text-align:center"><h2>${text}</h2><script>(function(){var b=document.createElement("button");b.textContent="Tap for hint";b.style.cssText="margin-top:14px;padding:10px 18px;border-radius:10px;border:0;background:#3b82f6;color:#fff;font-size:16px;cursor:pointer";b.onclick=function(){b.textContent="⭐ Short & sweet"};document.body.appendChild(b);})();</script></div>`
          : '',
      text,
      answer,
      timer: 15,
      tiebreaker,
      pointsCorrect: points,
      pointsWrong: -points / 3,
      allowPartial: true,
      pointsPartial: Math.round(points / 2),
      hideAfterTimer: i === 8,
    }, 7, 'Race to the Finish'),
  );

  // ————————————————————————— Round 8 — Grand Finale —————————————————————————
  header('Round 8', 'The final showdown — big points, tiebreakers and an image slide.', 8, 'Grand Finale');
  add({
    type: 'image-slide',
    text: '',
    body: 'Unanswered — this is an image slide, shown at fullscreen between questions.',
    mediaData: svgDataUrl('QNAHUT', '#2DE2E6', '#FF3D8A', '#0A0C10'),
    round: 8,
    roundName: 'Grand Finale',
  });
  [
    ['In which year did the first Moon landing happen?', '1969', 20, false],
    ['What is the name of the loudest natural sound ever recorded?', null, 0, false],
    ['What is the capital city of Australia?', 'Canberra', 25, false],
    ['How many bones are in the adult human body?', '206', 25, false],
    ['Which composer went deaf late in life?', 'Beethoven', 30, false],
    ['What is the name of our galaxy?', 'Milky Way', 20, false],
    ['Which chemical element has the atomic number 79?', 'Gold', 30, true],
    ['What is the only thing that can travel faster than light?', null, 0, false],
    ['Who wrote the theory of general relativity?', 'Einstein', 25, false],
    ['How many is a baker’s dozen?', '13', 15, false],
  ].forEach(([text, answer, points, tiebreaker], i) => {
    const isHtml = i % 5 === 2;
    add({
      type: isHtml ? 'html' : 'text',
      text: answer ? text : `${text} (skip and move on!)`,
      htmlContent:
        isHtml
          ? `<div style="text-align:center"><h2>${text}</h2><p style="opacity:.7">Grand finale — think fast</p></div>`
          : '',
      answer: answer || '',
      timer: i % 3 === 0 ? 15 : 25,
      tiebreaker,
      pointsCorrect: points,
      pointsWrong: points ? -points / 2 : 0,
      allowPartial: !(i % 2),
      pointsPartial: points ? Math.round(points / 2) : 0,
      fullscreenMedia: i === 6,
    }, 8, 'Grand Finale');
  });

  return {
    id: 'demo',
    name: 'QNAHUT Demo — 80 Questions',
    description:
      'Eighty questions across eight rounds: text, HTML slides with live scripts, image rounds, video clips, negative marking, partial credit, tiebreakers, image slides and fast buzzer rounds.',
    logoDataUrl: null,
    teams: [
      createTeam('Team Alpha', '1001'),
      createTeam('Team Nova', '1002'),
      createTeam('Team Vector', '1003'),
      createTeam('Team Omega', '1004'),
    ].map((t) => ({ ...t, connected: true })),
    modes: {
      leaderboard: true,
      buzzer: true,
      requireTextAnswer: false,
      allowMultipleBuzzes: true,
      defaultTimer: 25,
      projectorTimer: true,
      projectorBuzzer: true,
      projectorLeaderboard: true,
      hideQuestionAfterBuzz: false,
    },
    questions: [...headers, ...questions],
    currentQuestionIndex: 0,
    timer: { remaining: 25, running: false },
    buzzer: { locked: false, order: [], answers: {} },
    scoreEvents: [],
    projectorView: 'question',
    projectorQuestionRevealed: false,
  };
}