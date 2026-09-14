import { Zap } from 'lucide-react';
import { useQuiz } from '../../context/QuizContext.jsx';
import { useNavigation, VIEWS } from '../../context/NavigationContext.jsx';
import ThemeControls from '../common/ThemeControls.jsx';
import Button from '../common/Button.jsx';

export default function TopBar() {
  const { quiz, reset } = useQuiz();
  const { setView } = useNavigation();

  function handleLogoClick() {
    setView(quiz ? VIEWS.HOST : VIEWS.LANDING);
  }

  function handleExit() {
    reset();
    setView(VIEWS.LANDING);
  }

  return (
    <header
      className="row topbar"
      style={{
        justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-panel)',
      }}
    >
      <button
        onClick={handleLogoClick}
        className="row gap-sm"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <Zap size={20} color="var(--color-accent-primary)" aria-hidden="true" />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>
          QNAHUT
        </span>
      </button>

      <div className="row gap-md topbar-actions">
        <ThemeControls />
        {quiz && (
          <Button variant="ghost" onClick={handleExit}>
            Exit quiz
          </Button>
        )}
      </div>
    </header>
  );
}
