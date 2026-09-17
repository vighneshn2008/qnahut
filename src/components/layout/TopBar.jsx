import { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { useQuiz } from '../../context/QuizContext.jsx';
import { useNavigation, VIEWS } from '../../context/NavigationContext.jsx';
import ThemeControls from '../common/ThemeControls.jsx';
import Button from '../common/Button.jsx';

const windowControls = typeof window !== 'undefined' ? window.qnahutWindowControls : undefined;

export default function TopBar() {
  const { quiz, reset } = useQuiz();
  const { setView } = useNavigation();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!windowControls) return;
    windowControls.isMaximized().then(setMaximized);
    return windowControls.onMaximizedChange(setMaximized);
  }, []);

  function handleLogoClick() {
    setView(quiz ? VIEWS.HOST : VIEWS.LANDING);
  }

  function handleExit() {
    reset();
    setView(VIEWS.LANDING);
  }

  function handleTitleDoubleClick(event) {
    if (windowControls && event.target === event.currentTarget) {
      windowControls.toggleMaximize();
    }
  }

  return (
    <header
      className="row topbar"
      onDoubleClick={handleTitleDoubleClick}
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
        <img src="/logo.png" alt="QNAHUT logo" style={{ height: 22, width: 'auto' }} />
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
        {windowControls && (
          <div className="titlebar-controls" role="group" aria-label="Window controls">
            <button
              type="button"
              className="titlebar-btn"
              onClick={() => windowControls.minimize()}
              title="Minimize"
              aria-label="Minimize"
            >
              <Minus size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="titlebar-btn"
              onClick={() => windowControls.toggleMaximize()}
              title={maximized ? 'Restore' : 'Maximize'}
              aria-label={maximized ? 'Restore' : 'Maximize'}
            >
              {maximized ? <Copy size={14} aria-hidden="true" /> : <Square size={13} aria-hidden="true" />}
            </button>
            <button
              type="button"
              className="titlebar-btn titlebar-btn-close"
              onClick={() => windowControls.close()}
              title="Close"
              aria-label="Close"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
