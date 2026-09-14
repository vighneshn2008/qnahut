# QNAHUT

A cyber-futuristic platform for hosting live team quiz competitions — quiz
clubs, colleges, schools, and events. One host dashboard, one shared screen,
and a fast, fair buzzer round.

No accounts. Teams join with a 4-digit code from any phone.

## Features

- **Setup wizard** — name your quiz, add teams, configure scoring (including
  optional partial marks and negative marking), toggle the live leaderboard
  and buzzer mode, and build out your question bank (text, image, video, or
  media-only questions), each with its own point value, timer, round, and
  reveal behaviour.
- **Host dashboard** — start/pause/reset the timer, move between questions,
  award scores per team with one tap (full / partial / zero / wrong / custom),
  undo the last scoring action, manage questions live without restarting, and
  switch what the shared screen is showing.
- **Shared/projector screen** — a distraction-free display for a TV or
  projector, mirroring the question, timer, buzzer state, or leaderboard.
- **Buzzer round** — fastest-finger-first, timestamped centrally so it's fair
  even with network lag differences between phones.
- **Theming** — the entire UI is styled off a small set of CSS custom
  properties. Import a theme as JSON from the top bar to reskin colours,
  fonts, and corner radius live; export the current theme to share it.
- **Keyboard shortcuts** (host dashboard) — `Space` start/pause timer,
  `N`/`P` next/previous question, `B` reset buzzer, `L` jump to leaderboard.
- **Gamified feel** — confetti bursts on the projector leaderboard (on first
  reveal and whenever the lead changes hands), a matching reward burst on a
  team's screen the moment they buzz in first, a glowing #1 leaderboard row,
  animated score pops when points are awarded, a shaking/urgent timer in the
  final seconds, and fade transitions between questions, wizard steps, and
  screens throughout.

> QNAHUT runs locally without accounts or a hosted service. Quiz state is
> managed with Redux Toolkit and synchronized between host, projector, and
> team devices through the built-in local HTTP/WebSocket host. Local storage,
> BroadcastChannel, and polling provide fallback behavior when a WebSocket is
> unavailable. Shared quiz links include a per-quiz capability token, which
> prevents accidental cross-quiz access. This local host is still intended
> for trusted networks and does not provide user accounts or production-grade
> identity and access management.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL. Click **Try the demo** on the landing page to
explore every feature instantly with a preloaded sample quiz, or **Create a
quiz** to run the setup wizard yourself.

### Electron desktop app

Run the app in a desktop window with Vite hot reload:

```bash
npm run desktop:dev
```

Run the packaged production build locally:

```bash
npm run desktop
```

Build a Windows installer:

```bash
npm run desktop:dist
```

## Project structure

```
src/
├── components/     # UI, grouped by area (landing, wizard, host, projector, join, team, common)
├── context/        # Theme, quiz compatibility API, and navigation providers
├── state/          # Pure quiz reducer (single source of truth for transitions)
├── store/          # Redux Toolkit store and selectors
├── data/           # Default theme tokens and the bundled demo quiz
├── hooks/          # Timer ticking, host keyboard shortcuts
├── utils/          # Small pure helpers (ids, theme merging, quiz factories)
├── styles/         # Global stylesheet and CSS variable design tokens
└── electron/       # Packaged local HTTP/WebSocket host
```

## Custom themes

A theme JSON file looks like this:

```json
{
  "name": "Sunset Arena",
  "colors": {
    "bgVoid": "#1a0f1f",
    "accentPrimary": "#ff8a5b",
    "accentSecondary": "#ffd23f"
  },
  "fonts": {
    "display": "'Poppins', sans-serif"
  },
  "radius": "16px"
}
```

Any fields you omit fall back to the default theme — see
`src/data/defaultTheme.js` for the full token list. Import it from the
palette icon in the top bar.

## Scripts

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start the dev server                 |
| `npm run build`        | Production build to `dist/`          |
| `npm run desktop:dev`  | Run the app in Electron with HMR     |
| `npm run desktop`      | Run the production app in Electron   |
| `npm run desktop:dist` | Build a Windows Electron installer   |
| `npm run preview`      | Preview the production build locally |
| `npm run lint`         | Lint the codebase                    |
| `npm run format`       | Format with Prettier                 |
| `npm run format:check` | Check formatting without writing     |

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) and the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE)
