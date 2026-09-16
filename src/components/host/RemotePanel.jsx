import { useEffect, useState } from 'react';
import { QrCode, X } from 'lucide-react';
import QRCode from 'qrcode';
import { useQuiz } from '../../context/QuizContext.jsx';
import Panel from '../common/Panel.jsx';
import Button from '../common/Button.jsx';

export default function RemotePanel() {
  const { quiz } = useQuiz();
  const [showQr, setShowQr] = useState(false);
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

  const remoteLink = `${shareOrigin}/remote?quiz=${encodeURIComponent(quiz.id)}&token=${encodeURIComponent(quiz.accessToken || '')}`;

  useEffect(() => {
    if (!showQr) return undefined;
    let active = true;
    QRCode.toDataURL(remoteLink, {
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
  }, [remoteLink, showQr]);

  return (
    <Panel
      title="Control from your phone"
      action={
        <Button
          variant="ghost"
          icon={showQr ? X : QrCode}
          onClick={() => setShowQr((value) => !value)}
          aria-expanded={showQr}
        >
          {showQr ? 'Hide' : 'Show'}
        </Button>
      }
    >
      {showQr ? (
        <>
          <p style={{ fontSize: 13, marginBottom: 12 }}>
            Scan to open the remote on your phone. Everything is protected by
            the host password.
          </p>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Scan to open the remote"
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
          <div className="row gap-sm" style={{ maxWidth: 320, margin: '0 auto' }}>
            <input className="input mono" readOnly value={remoteLink} style={{ fontSize: 12 }} />
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13, margin: 0 }}>
          Give yourself next/previous, timer and buzzer controls on a phone —
          handy when you walk the room.
        </p>
      )}
    </Panel>
  );
}