import { useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import Button from './Button.jsx';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a single image/video file and hands back a base64 data URL —
 * enough to preview it and to bundle it into an exported quiz package,
 * with no backend/storage service required.
 */
export default function MediaUpload({ accept, value, onChange, label = 'Upload file' }) {
  const inputRef = useRef(null);
  const [urlValue, setUrlValue] = useState('');

  useEffect(() => {
    setUrlValue(typeof value === 'string' && /^https?:\/\//i.test(value) ? value : '');
  }, [value]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChange(dataUrl, file.name);
  }

  function handleUrlSubmit() {
    const nextValue = urlValue.trim();
    if (!nextValue) return;
    onChange(nextValue, nextValue);
  }

  const isVideo = accept?.includes('video');

  return (
    <div className="stack gap-sm">
      <div className="row gap-sm">
        <Button variant="ghost" onClick={() => inputRef.current?.click()} icon={Upload}>
          {label}
        </Button>
        {value && (
          <Button
            variant="ghost"
            className="btn-icon"
            onClick={() => onChange(null, '')}
            aria-label="Remove file"
          >
            <X size={16} />
          </Button>
        )}
      </div>
      <div className="row gap-sm">
        <input
          className="input"
          type="url"
          value={urlValue}
          onChange={(event) => setUrlValue(event.target.value)}
          placeholder="Or paste image/video URL"
          style={{ flex: 1 }}
        />
        <Button variant="ghost" onClick={handleUrlSubmit} disabled={!urlValue.trim()}>
          Use URL
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      {value && (
        <div style={{ maxWidth: 260 }}>
          {isVideo ? (
            <video src={value} controls style={{ width: '100%', borderRadius: 'var(--radius)' }} />
          ) : (
            <img
              src={value}
              alt="Preview"
              style={{ width: '100%', borderRadius: 'var(--radius)' }}
            />
          )}
        </div>
      )}
    </div>
  );
}
