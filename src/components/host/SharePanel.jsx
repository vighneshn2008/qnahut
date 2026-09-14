import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';
import { useQuiz } from '../../context/QuizContext.jsx';
import Panel from '../common/Panel.jsx';
import Button from '../common/Button.jsx';

export default function SharePanel() {
  const { quiz } = useQuiz();
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [shareOrigin, setShareOrigin] = useState(() =>
    typeof window !== 'undefined' ? window.location.origin : '',
  );

  useEffect(() => {
    let active = true;
    fetch('/__qnahut-host')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active || !data?.host || typeof window === 'undefined') return;
        const port = window.location.port ? `:${window.location.port}` : '';
        setShareOrigin(`${window.location.protocol}//${data.host}${port}`);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const joinLink = `${shareOrigin}/join?quiz=${encodeURIComponent(quiz.id)}&token=${encodeURIComponent(quiz.accessToken || '')}`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(joinLink, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [joinLink]);

  function handleCopy() {
    navigator.clipboard
      ?.writeText(joinLink)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  return (
    <Panel title="Share">
      {qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt="Scan to join this quiz"
          width="180"
          height="180"
          style={{
            display: 'block',
            margin: '0 auto 16px',
            background: '#fff',
            padding: 8,
            borderRadius: 8,
          }}
        />
      ) : (
        <div
          className="panel-raised"
          style={{
            width: 180,
            height: 180,
            margin: '0 auto 16px',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
            Generating QR code…
          </span>
        </div>
      )}

      <div className="row gap-sm" style={{ marginBottom: 16 }}>
        <input className="input mono" readOnly value={joinLink} style={{ fontSize: 12 }} />
        <Button
          variant="ghost"
          className="btn-icon"
          onClick={handleCopy}
          aria-label="Copy join link"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </Button>
      </div>

      <p className="label" style={{ marginBottom: 8 }}>
        Team codes
      </p>
      <div className="row gap-xs wrap">
        {quiz.teams.map((team) => (
          <span key={team.id} className="badge mono">
            {team.name}: {team.code}
          </span>
        ))}
      </div>
    </Panel>
  );
}
