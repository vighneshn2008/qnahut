# ⚡ QNAHUT

**A cyber-futuristic platform for hosting live team quiz competitions.**

Run quiz nights for clubs, colleges, schools, and events — no accounts, no
cloud dependency, no per-institution lock-in. Spin up a server on your own
laptop, share a link, and go.

<p>
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D22-brightgreen">
  <img alt="stack" src="https://img.shields.io/badge/stack-Express%20%7C%20Socket.IO%20%7C%20SQLite-blue">
  <img alt="license" src="https://img.shields.io/badge/status-active-success">
</p>

---

## ✨ Why QNAHUT

- **Zero setup** — no env vars, no cloud accounts, no database to provision. A sqlite file is created automatically on first run.
- **Real-time everywhere** — questions, timers, buzzers, and scores sync instantly across host, projector, and every team's phone via Socket.IO.
- **Quick buzzer** — buzz timing is timestamped by the server, not the phone, so results are fair and millisecond-accurate.
- **Built-in demo** — a fully seeded sample quiz at `/host/demo` so you can try every feature before building your own.
- **Rich question types** — text, HTML (interactive/scripted), image, video, image-only, and video-only questions, each with its own marks, timer, and round.
- **Dedicated projector view** — a chrome-free, big-screen display for Question, Timer, Buzzer, and Leaderboard, driven live from the host dashboard.

---

## 📋 Table of Contents

1. [Installation](#1-installation)
2. [Launching the server](#2-launching-the-server)
3. [Hosting a Quiz](#3-hosting-a-quiz)
4. [Joining as a Team](#4-joining-as-a-team)
5. [Projector mode](#5-projector-mode)
6. [Buzzer Mode](#6-buzzer-mode)
7. [Environment Variables](#7-environment-variables)
8. [Architecture](#8-architecture)
9. [Demo Quiz](#9-demo-quiz)
10. [Project structure](#10-project-structure)

---

## 1. Installation

**Requirements:** Node.js 22+

```bash
cd qnahut
npm install
npm run dev
```

The server prints its local and network addresses on startup:

```
QNAHUT server is running
------------------------
Local:    http://localhost:3000
Network:  http://192.168.1.42:3000

Demo quiz ready -> host at /host/demo (token: demo-host-token, auto-filled)
Demo team codes: 1001, 1002, 1003, 1004
```

Open the **Local** address on the host computer, and the **Network** address
on every phone connected to the same Wi-Fi. No environment variables are
required — data is stored in a SQLite file at `data/qnahut.sqlite`, created
automatically on first run.

---

## 2. Launching the server

```bash
npm run dev
```

This starts Express (REST API + static pages) and Socket.IO (real-time
state) on a single port — default `3000`, override with:

```bash
PORT=4000 npm run dev
```

---

## 3. Hosting a Quiz

1. Go to `/` and click **Create a quiz** (or go straight to `/host`).
2. Walk through the setup wizard:
   - **Basics** — quiz name, description, theme colour
   - **Teams** — pick a team count with the stepper, then rename each team
   - **Scoring** — set correct/wrong marks and whether partial marking is allowed
   - **Modes** — toggle the live leaderboard and buzzer mode, set a default timer length
   - **Questions** — add text, HTML, image, video, image-only, or video-only questions, each with its own marks, timer, round, tiebreaker setting, answer, and display options
3. Click **Create quiz** to land on `/host/<quizId>`, your live control
   dashboard. A host session token is stored in browser local storage, so
   refreshing the dashboard keeps you logged in as host on that device.

You can try all of this instantly using the bundled **demo quiz** at
`/host/demo` — no setup required.

### The Host dashboard

| Panel | What it does |
|---|---|
| **Main panel** | Current question, media, timer controls (Start / Pause / Reset), question navigation |
| **Scoring panel** | One-tap scoring per team, custom score field, **Undo last scoring action** |
| **Projector control** | Switch the room's screen between Question, Timer, Buzzer, and Leaderboard |
| **Question management** | Add, edit, remove, or reorder questions and their settings |

### Keyboard dhortcuts (Host Dashboard)

| Key | Action |
|---|---|
| `dpace` | Start / pause the timer |
| `N` | Next question |
| `P` | Previous question |
| `B` | Reset the buzzer |
| `L` | Switch the projector to the leaderboard |

---

## 4. Joining as a Team

1. Open the local network address shown by the server, or scan the QR code
   from the host's **dhare** panel — this lands on `/join`.
2. Enter a 4-digit team code. No account, no sign-up.
3. Land on `/team`, showing the team name, connection status, and (when
   buzzer mode is on) a large **BUZZ** button sized for a thumb.

Reconnecting after a dropped Wi-Fi signal automatically restores the team's
identity, as long as the same browser tab/session is used.

---

## 5. Projector mode

Open `/projector/<quizId>` on the machine connected to your projector or TV.
It's chrome-free and built for large screens, always showing exactly what
the host has selected:

- **Question** — large type, question text and media (or a full-bleed image with no UI, for image-only questions)
- **Timer** — a large synchronized countdown
- **Buzzer** — "NO BUZZ YET" until a team buzzes, then a "FIRST BUZZ" announcement and the full buzz order
- **Leaderboard** — broadcast-style ranked list with staggered entry animation

Every connected projector updates immediately when the host switches views.

---

## 6. Buzzer Mode

1. The host enables **Buzzer mode** during setup (or later).
2. Each team gets a unique 4-digit code from the host's Share panel.
3. Pressing **BUZZ** sends a request the server timestamps itself — never
   trusting the phone's own clock.
4. The **first accepted buzz** locks the buzzer for everyone else and
   broadcasts instantly:
   - Buzzing team sees **YOU BUZZED FIRST**
   - Everyone else sees **TOO LATE** or **BUZZER LOCKED**
5. The host reviews the full buzz order, then presses **Reset buzzer**
   (`B`) before the next question.

`multiBuzzRecorded` (on by default) keeps recording buzzes after the lock,
so the host can see the complete order, not just the winner. Team answers
are submitted once per buzzer round and can't be replaced until the host
resets the buzzer or advances the question.

---

## 7. Environment Variables

None are required. Optional:

| Variable | Description |
|---|---|
| `PORT` | Port to listen on (default `3000`) |
| `QNAHUT_PUBLIC_URL` | Public base URL for QR/share links (e.g. `http://192.168.1.42:3000`); otherwise the server auto-detects its LAN IP |

---

## 8. Architecture

```
Host computer
  └─ QNAHUT server (Express + Socket.IO + SQLite)
       ├─ REST API   → quiz/question setup, joining, QR codes
       └─ docket.IO  → live state: questions, timer, buzzer, scores
              │
              ├─ Host dashboard   (/host/:quizId)
              ├─ Projector view   (/projector/:quizId)
              └─ Team buzzer      (/team, joined via /join)
```

| File | Responsibility |
|---|---|
| `server/db.js` | SQLite schema and connection (quizzes, teams, questions, score_events, buzzer_events) |
| `server/state.js` | Authoritative in-memory quiz state — every score, buzz, and question change flows through here, applied in memory for instant reads and persisted to SQLite |
| `server/socket.js` | Real-time Socket.IO handling: buzzer logic/locking, synchronized timer loop, question navigation, score broadcasts. The server is authoritative — clients only render what they're told |
| `server/routes.js` | REST endpoints for quiz/question creation, media upload, team joining, QR generation, read-only hydration |
| `server/seed.js` | Seeds the bundled demo quiz (`id: demo`) on first boot |
| `public/` | Static frontend — shared cyber-futuristic design system (`css/style.css`) plus one HTML/CSS/JS bundle per surface (landing, host, projector, join, team) |

### Real-time events (non-exhaustive)

`room:join`, `state:sync`, `question:next` / `question:prev` / `question:goto` / `question:changed`, `timer:start` / `timer:pause` / `timer:reset` / `timer:tick`, `buzzer:buzz` / `buzzer:result` / `buzzer:update` / `buzzer:reset`, `score:apply` / `score:undo` / `score:changed`, `leaderboard:updated`, `team:connected` / `team:disconnected`, `projector:setView` / `projector:view`

---

## 9. Demo Quiz

Bundled automatically — no setup required:

- **Host:** `/host/demo`
- **Team codes:** `1001` (Team Alpha), `1002` (Team Nova), `1003` (Team Vector), `1004` (Team Omega)
- **Projector:** `/projector/demo`
- 8 sample questions covering text, image, image-only, video, and negative/partial marking

---

## 10. Project structure

```
qnahut/
├── package.json
├── data/                      # SQLite database (created on first run)
├── server/
│   ├── index.js               # Express + Socket.IO entry point
│   ├── db.js                  # SQLite schema
│   ├── state.js               # Authoritative in-memory quiz state
│   ├── socket.js               # Real-time event handlers
│   ├── routes.js               # REST API
│   └── seed.js                 # Demo quiz seed data
└── public/
    ├── index.html              # Landing page
    ├── host.html                # Setup wizard + control dashboard
    ├── projector.html          # Broadcast / projector view
    ├── join.html                # Team join screen
    ├── team.html                # Team buzzer screen
    ├── css/                     # style.css (design system) + per-page styles
    ├── js/                      # shared.js + per-page client logic
    ├── img/                     # demo placeholder images
    └── uploads/                 # host-uploaded question media (created at runtime)
```

---

## 🤝 Contributing

Issues and pull requests are welcome. If you spot a bug or have an idea for
a feature, open an issue on the [GitHub repo](https://github.com/vighneshn2008/qnahut).

## 📄 License

No license file is currently specified in this repository.