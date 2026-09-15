import { useState } from 'react';
import { QUESTION_TYPES, SLIDE_TYPES, createQuestion } from '../../utils/quizFactory.js';
import Button from './Button.jsx';
import MediaUpload from './MediaUpload.jsx';

const TYPE_LABELS = {
  text: 'Text question',
  image: 'Image question',
  video: 'Video question',
  'image-only': 'Image only',
  'video-only': 'Video only',
  html: 'Custom HTML',
  'round-header': 'Round header (slide)',
  info: 'Info slide',
  'image-slide': 'Full-screen image (slide)',
};

const TYPE_GROUPS = [
  { label: 'Questions', types: QUESTION_TYPES },
  { label: 'Slides (not scored)', types: SLIDE_TYPES },
];

/**
 * Controlled form for creating or editing a single item in the running
 * order — a scored question, or a non-scored slide (round header / info).
 * Pass `question` to edit in place, or omit it to create a new one.
 */
export default function QuestionForm({ question, onSave, onCancel }) {
  const [form, setForm] = useState(question || createQuestion());
  const isSlide = SLIDE_TYPES.includes(form.type);
  const needsMedia = ['image', 'video', 'image-only', 'video-only', 'image-slide'].includes(
    form.type,
  );
  const isImageSlide = form.type === 'image-slide';
  const isHtml = form.type === 'html';
  const needsText = !isSlide && !isHtml && !form.type.endsWith('-only');

  function patch(fields) {
    setForm((prev) => ({ ...prev, ...fields }));
  }

  function handleTypeChange(type) {
    patch({ type, isSlide: SLIDE_TYPES.includes(type) });
  }

  function handleSave() {
    onSave({ ...form, isSlide });
  }

  const canSave = isImageSlide
    ? Boolean(form.mediaData)
    : isSlide
      ? form.text.trim().length > 0
      : isHtml
        ? form.htmlContent.trim().length > 0
        : !needsText || form.text.trim().length > 0;

  return (
    <div className="stack gap-sm">
      <div>
        <label className="label" htmlFor="q-type">
          Item type
        </label>
        <select
          id="q-type"
          className="select"
          value={form.type}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          {TYPE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.types.map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABELS[type]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {isSlide && !isImageSlide && (
        <>
          <div>
            <label className="label" htmlFor="q-title">
              Title
            </label>
            <textarea
              id="q-title"
              className="textarea"
              rows={2}
              placeholder={form.type === 'round-header' ? 'Round 2' : 'Info'}
              value={form.text}
              onChange={(e) => patch({ text: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="q-body">
              Body text
            </label>
            <textarea
              id="q-body"
              className="textarea"
              rows={3}
              placeholder="Shown under the title on the shared screen."
              value={form.body}
              onChange={(e) => patch({ body: e.target.value })}
            />
          </div>
        </>
      )}

      {needsText && (
        <div>
          <label className="label" htmlFor="q-text">
            Question text
          </label>
          <textarea
            id="q-text"
            className="textarea"
            rows={2}
            value={form.text}
            onChange={(e) => patch({ text: e.target.value })}
          />
        </div>
      )}

      {isHtml && (
        <div>
          <label className="label" htmlFor="q-html">
            HTML content
          </label>
          <textarea
            id="q-html"
            className="textarea mono"
            rows={6}
            placeholder="<div>Anything goes here — layouts, embeds, formatted text…</div>"
            value={form.htmlContent}
            onChange={(e) => patch({ htmlContent: e.target.value })}
          />
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
            Scripts are allowed — <span className="mono">&lt;script&gt;</span> tags run on the
            projector, so you can add animations, counters, or embeds.
          </p>
        </div>
      )}

      {((needsMedia && !isImageSlide) || isHtml) && (
        <label className="row gap-sm" style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.fullscreenMedia === true}
            onChange={(e) => patch({ fullscreenMedia: e.target.checked })}
          />
          Display {isHtml ? 'HTML content' : 'media'} full screen on projector
        </label>
      )}

      {needsMedia && (
        <div className="row gap-sm wrap">
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="label" htmlFor="q-media">
              {form.type.startsWith('video') ? 'Video file' : 'Image file'}
            </label>
            <MediaUpload
              accept={form.type.startsWith('video') ? 'video/*' : 'image/*'}
              value={form.mediaData}
              onChange={(dataUrl, name) =>
                patch({ mediaData: dataUrl, mediaLabel: name || form.mediaLabel })
              }
              label={form.mediaData ? 'Replace file' : 'Upload file'}
            />
            <textarea
              className="textarea"
              rows={2}
              style={{ marginTop: 8 }}
              placeholder="Fallback label shown if no file is uploaded"
              value={form.mediaLabel}
              onChange={(e) => patch({ mediaLabel: e.target.value })}
            />
          </div>
          {form.type.startsWith('image') && (
            <div style={{ width: 140 }}>
              <label className="label" htmlFor="q-fit">
                Image fit
              </label>
              <select
                id="q-fit"
                className="select"
                value={form.imageFit}
                onChange={(e) => patch({ imageFit: e.target.value })}
              >
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
              </select>
            </div>
          )}
        </div>
      )}

      {!isSlide && (
        <>
          <div className="row gap-sm wrap">
            <div style={{ flex: 1, minWidth: 100 }}>
              <label className="label" htmlFor="q-timer">
                Timer (s)
              </label>
              <input
                id="q-timer"
                type="number"
                className="input"
                value={form.timer}
                onChange={(e) => patch({ timer: Number(e.target.value) })}
              />
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <label className="label" htmlFor="q-round">
                Round #
              </label>
              <input
                id="q-round"
                type="number"
                className="input"
                value={form.round}
                onChange={(e) => patch({ round: Number(e.target.value) })}
              />
            </div>
            <div style={{ flex: 2, minWidth: 140 }}>
              <label className="label" htmlFor="q-round-name">
                Round name
              </label>
              <textarea
                id="q-round-name"
                className="textarea"
                rows={2}
                placeholder="e.g. Picture round"
                value={form.roundName}
                onChange={(e) => patch({ roundName: e.target.value })}
              />
            </div>
          </div>

          <div className="panel-raised" style={{ padding: 12 }}>
            <p className="label" style={{ marginBottom: 10 }}>
              Scoring for this question
            </p>
            <div className="row gap-sm wrap">
              <div style={{ flex: 1, minWidth: 110 }}>
                <label className="label" htmlFor="q-points-correct">
                  Correct
                </label>
                <input
                  id="q-points-correct"
                  type="number"
                  className="input"
                  value={form.pointsCorrect}
                  onChange={(e) => patch({ pointsCorrect: Number(e.target.value) })}
                />
              </div>
              <div style={{ flex: 1, minWidth: 110 }}>
                <label className="label" htmlFor="q-points-wrong">
                  Wrong
                </label>
                <input
                  id="q-points-wrong"
                  type="number"
                  className="input"
                  value={form.pointsWrong}
                  onChange={(e) => patch({ pointsWrong: Number(e.target.value) })}
                />
              </div>
              {form.allowPartial && (
                <div style={{ flex: 1, minWidth: 110 }}>
                  <label className="label" htmlFor="q-points-partial">
                    Partial
                  </label>
                  <input
                    id="q-points-partial"
                    type="number"
                    className="input"
                    value={form.pointsPartial}
                    onChange={(e) => patch({ pointsPartial: Number(e.target.value) })}
                  />
                </div>
              )}
            </div>
            <label className="row gap-sm" style={{ cursor: 'pointer', marginTop: 10 }}>
              <input
                type="checkbox"
                checked={form.allowPartial}
                onChange={(e) => patch({ allowPartial: e.target.checked })}
              />
              Allow partial marking
            </label>
          </div>

          <div>
            <label className="label" htmlFor="q-answer">
              Answer
            </label>
            <textarea
              id="q-answer"
              className="textarea"
              rows={2}
              value={form.answer}
              onChange={(e) => patch({ answer: e.target.value })}
            />
          </div>

          <div className="row gap-md wrap">
            <label className="row gap-sm" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.hideAfterTimer === true}
                onChange={(e) => patch({ hideAfterTimer: e.target.checked })}
              />
              Hide question when timer ends
            </label>
            <label
              className="row gap-sm"
              style={{ cursor: 'pointer' }}
              title="Skips this question in the normal Next/Previous flow — it's only reachable by clicking it directly in the question nav strip."
            >
              <input
                type="checkbox"
                checked={form.tiebreaker}
                onChange={(e) => patch({ tiebreaker: e.target.checked })}
              />
              Tiebreaker (skip in sequence, jump to it from the nav)
            </label>

            <div>
              <label
                className="label"
                htmlFor="q-show-answer"
                style={{ marginBottom: 0, display: 'inline', marginRight: 8 }}
              >
                Reveal answer
              </label>
              <select
                id="q-show-answer"
                className="select"
                style={{ width: 'auto', display: 'inline-block' }}
                value={form.showAnswer}
                onChange={(e) => patch({ showAnswer: e.target.value })}
              >
                <option value="after-scoring">After scoring</option>
                <option value="on-timer-end">When the timer ends</option>
                <option value="manual">Only when the host chooses</option>
              </select>
            </div>
          </div>
        </>
      )}

      <div className="row gap-sm" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button variant="primary" onClick={handleSave} disabled={!canSave}>
          {question ? 'Save' : 'Add to running order'}
        </Button>
      </div>
    </div>
  );
}
