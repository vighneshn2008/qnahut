import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import { QuizProvider, useQuiz } from './context/QuizContext.jsx';
import { NavigationProvider, useNavigation, VIEWS } from './context/NavigationContext.jsx';
import { useTimerTick } from './hooks/useTimerTick.js';

import TopBar from './components/layout/TopBar.jsx';
import Landing from './components/landing/Landing.jsx';
import Wizard from './components/wizard/Wizard.jsx';
import HostDashboard from './components/host/HostDashboard.jsx';
import Projector from './components/projector/Projector.jsx';
import Join from './components/join/Join.jsx';
import Team from './components/team/Team.jsx';

function ViewRouter() {
  const { view } = useNavigation();
  const { isRemoteMirror } = useQuiz();
  useTimerTick();

  // A pop-out projector window opened via "?view=projector&quiz=<id>" always
  // shows the projector, mirroring the host's quiz state live — it never
  // navigates anywhere else.
  if (isRemoteMirror) {
    return (
      <div className="view-fade-in">
        <Projector />
      </div>
    );
  }

  let Screen;
  switch (view) {
    case VIEWS.WIZARD:
      Screen = Wizard;
      break;
    case VIEWS.HOST:
      Screen = HostDashboard;
      break;
    case VIEWS.PROJECTOR:
      Screen = Projector;
      break;
    case VIEWS.JOIN:
      Screen = Join;
      break;
    case VIEWS.TEAM:
      Screen = Team;
      break;
    case VIEWS.LANDING:
    default:
      Screen = Landing;
  }

  // Remounting with a fresh key on view change replays the fade-in transition.
  return (
    <div key={view} className="view-fade-in">
      <Screen />
    </div>
  );
}

function ThemedRoot() {
  const { cssVars } = useTheme();
  const { view } = useNavigation();
  const { isRemoteMirror } = useQuiz();
  const isFullBleed = view === VIEWS.PROJECTOR || isRemoteMirror;

  return (
    <div className="app-root" style={cssVars}>
      {!isFullBleed && <TopBar />}
      <ViewRouter />
    </div>
  );
}

export default function App() {
  return (
    <QuizProvider>
      <ThemeProvider>
        <NavigationProvider>
          <ThemedRoot />
        </NavigationProvider>
      </ThemeProvider>
    </QuizProvider>
  );
}
