/**
 * ClientReviewPage
 * Shareable, no-login page for clients to review journey touchpoints and leave notes.
 * Route: /journeys/:journeyId/client-review
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './ClientReviewPage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'https://bloom-backend.zeabur.app/api';

const TYPE_LABEL = { email: 'Email', sms: 'SMS', call: 'Call', task: 'Task' };

function TouchpointCard({ tp, index, total, note, onNoteChange }) {
  const content = tp.content || {};
  const day = tp.config?.day ?? null;

  return (
    <div className="cr-card">
      <div className="cr-card__meta">
        <span className="cr-card__index">{index + 1} of {total}</span>
        {day !== null && <span className="cr-card__day">Day {day}</span>}
        <span className={`cr-card__type cr-card__type--${tp.type}`}>
          {TYPE_LABEL[tp.type] || tp.type}
        </span>
        {tp.config?.clientNote && (
          <span className="cr-card__noted">Note saved ✓</span>
        )}
      </div>

      <h2 className="cr-card__name">{tp.name}</h2>

      {tp.type === 'email' && content.subject && (
        <div className="cr-card__subject">
          <span className="cr-card__label">Subject:</span> {content.subject}
        </div>
      )}

      {tp.type === 'email' && content.previewText && (
        <div className="cr-card__preview-text">
          <span className="cr-card__label">Preview text:</span> {content.previewText}
        </div>
      )}

      {/* Email HTML preview */}
      {tp.type === 'email' && content.body && (
        <div className="cr-card__email-preview">
          <iframe
            title={`Preview: ${tp.name}`}
            srcDoc={content.body}
            className="cr-card__iframe"
            sandbox="allow-same-origin"
          />
        </div>
      )}

      {/* SMS body */}
      {tp.type === 'sms' && content.body && (
        <div className="cr-card__sms-body">
          <p>{content.body}</p>
        </div>
      )}

      {/* Empty state */}
      {!content.body && (
        <div className="cr-card__empty">Content not yet added.</div>
      )}

      {/* Client notes */}
      <div className="cr-card__notes">
        <label className="cr-card__notes-label" htmlFor={`note-${tp.id}`}>
          Your notes for Bloom:
        </label>
        <textarea
          id={`note-${tp.id}`}
          className="cr-card__notes-input"
          rows={3}
          placeholder="e.g. Love the subject line. Can we soften the closing paragraph?"
          value={note}
          onChange={(e) => onNoteChange(tp.id, e.target.value)}
        />
        {tp.config?.clientNote && (
          <p className="cr-card__saved-note">
            Previously saved: <em>{tp.config.clientNote}</em>
          </p>
        )}
      </div>
    </div>
  );
}

export function ClientReviewPage() {
  const { journeyId } = useParams();

  const [journey, setJourney] = useState(null);
  const [touchpoints, setTouchpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // { [touchpointId]: noteText }
  const [notes, setNotes] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [jRes, tRes] = await Promise.all([
          fetch(`${API_BASE}/journeys/${journeyId}`),
          fetch(`${API_BASE}/touchpoints?journeyId=${journeyId}`),
        ]);

        if (!jRes.ok) throw new Error('Journey not found.');
        if (!tRes.ok) throw new Error('Could not load touchpoints.');

        const journeyData = await jRes.json();
        const touchpointData = await tRes.json();

        setJourney(journeyData);
        const sorted = [...touchpointData].sort(
          (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
        );
        setTouchpoints(sorted);

        // Pre-fill notes from any previously saved clientNote
        const savedNotes = {};
        sorted.forEach((tp) => {
          if (tp.config?.clientNote) savedNotes[tp.id] = tp.config.clientNote;
        });
        setNotes(savedNotes);
      } catch (err) {
        setError(err.message || 'Failed to load.');
      } finally {
        setLoading(false);
      }
    }
    if (journeyId) load();
  }, [journeyId]);

  const handleNoteChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Only submit touchpoints that have a non-empty note
      const toSave = Object.entries(notes).filter(([, v]) => v.trim() !== '');
      await Promise.all(
        toSave.map(([id, note]) =>
          fetch(`${API_BASE}/touchpoints/${id}/note`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note }),
          }).then((r) => {
            if (!r.ok) throw new Error(`Failed to save note for ${id}`);
          })
        )
      );
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="cr-loading">
        <div className="cr-loading__spinner" />
        <p>Loading journey…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cr-error">
        <h2>Something went wrong</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="cr-success">
        <div className="cr-success__icon">✓</div>
        <h2>Thank you!</h2>
        <p>Your feedback has been sent to the Bloom team. We'll follow up shortly.</p>
      </div>
    );
  }

  const hasNotes = Object.values(notes).some((n) => n.trim() !== '');

  return (
    <div className="cr-page">
      <header className="cr-header">
        <div className="cr-header__brand">
          <span className="cr-header__logo">🌸</span>
          <span className="cr-header__name">Bloom</span>
        </div>
        <div className="cr-header__journey">
          <h1 className="cr-header__title">{journey?.name}</h1>
          <p className="cr-header__subtitle">
            {touchpoints.length} touchpoints · Please review each one and leave notes where needed,
            then submit at the bottom.
          </p>
        </div>
      </header>

      <main className="cr-main">
        {touchpoints.map((tp, i) => (
          <TouchpointCard
            key={tp.id}
            tp={tp}
            index={i}
            total={touchpoints.length}
            note={notes[tp.id] || ''}
            onNoteChange={handleNoteChange}
          />
        ))}

        <div className="cr-submit">
          {submitError && <p className="cr-submit__error">{submitError}</p>}
          <button
            className="cr-submit__btn"
            onClick={handleSubmit}
            disabled={submitting || !hasNotes}
          >
            {submitting ? 'Sending…' : 'Submit Feedback'}
          </button>
          {!hasNotes && (
            <p className="cr-submit__hint">Add at least one note above to submit.</p>
          )}
        </div>
      </main>

      <footer className="cr-footer">
        <p>Powered by Bloom · Journey review for {journey?.client?.name || 'your venue'}</p>
      </footer>
    </div>
  );
}
