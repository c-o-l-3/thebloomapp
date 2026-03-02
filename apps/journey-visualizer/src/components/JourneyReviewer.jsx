/**
 * JourneyReviewer Component
 * Sequential touchpoint editor/reviewer for an entire journey.
 * Navigate prev/next, edit inline, save, and print all.
 *
 * Route: /journeys/:journeyId/review
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Printer,
  Save,
  Mail,
  MessageSquare,
  Phone,
  Tag,
  Check,
  Loader2,
} from 'lucide-react';
import { getApiClient } from '../services/apiClient';
import './JourneyReviewer.css';

const apiClient = getApiClient();

export function JourneyReviewer() {
  const { journeyId } = useParams();
  const navigate = useNavigate();

  const [touchpoints, setTouchpoints] = useState([]);
  const [journey, setJourney] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());

  // Per-touchpoint edits: { [id]: { subject?, previewText?, body? } }
  const [edits, setEdits] = useState({});

  // Load journey + touchpoints
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [journeyData, touchpointsData] = await Promise.all([
          apiClient.getJourney(journeyId),
          apiClient.getTouchpoints(journeyId),
        ]);
        setJourney(journeyData);
        const sorted = [...touchpointsData].sort(
          (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
        );
        setTouchpoints(sorted);
      } catch (err) {
        console.error('Failed to load journey review:', err);
        setError('Failed to load journey. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    if (journeyId) load();
  }, [journeyId]);

  const current = touchpoints[currentIndex];

  // Merge saved content with any pending edits
  const getContent = useCallback(
    (tp) => {
      if (!tp) return {};
      return { ...(tp.content || {}), ...(edits[tp.id] || {}) };
    },
    [edits]
  );

  const content = getContent(current);
  const isEmail = current?.type === 'email';
  const hasUnsaved =
    current &&
    edits[current.id] &&
    Object.keys(edits[current.id]).length > 0;
  const isSaved = current && savedIds.has(current.id);

  // Field change
  const handleChange = (field, value) => {
    setEdits((prev) => ({
      ...prev,
      [current.id]: { ...(prev[current.id] || {}), [field]: value },
    }));
    // Clear "saved" indicator when re-editing
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(current.id);
      return next;
    });
  };

  // Save current touchpoint
  const handleSave = async () => {
    if (!current || !hasUnsaved) return;
    setSaving(true);
    try {
      const updatedContent = { ...(current.content || {}), ...edits[current.id] };
      await apiClient.updateTouchpoint(current.id, { content: updatedContent });
      setTouchpoints((prev) =>
        prev.map((tp) =>
          tp.id === current.id ? { ...tp, content: updatedContent } : tp
        )
      );
      setEdits((prev) => {
        const next = { ...prev };
        delete next[current.id];
        return next;
      });
      setSavedIds((prev) => new Set(prev).add(current.id));
      // Auto-clear saved badge after 3 s
      setTimeout(() => {
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(current.id);
          return next;
        });
      }, 3000);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save touchpoint. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Navigation
  const goPrev = () =>
    setCurrentIndex((i) => Math.max(0, i - 1));
  const goNext = () =>
    setCurrentIndex((i) => Math.min(touchpoints.length - 1, i + 1));

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA'
      )
        return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [touchpoints.length]);

  // Print all
  const handlePrintAll = () => window.print();

  // Type icon
  const getTypeIcon = (type) => {
    switch (type) {
      case 'email':
        return <Mail size={20} />;
      case 'sms':
        return <MessageSquare size={20} />;
      case 'call':
        return <Phone size={20} />;
      default:
        return <Tag size={20} />;
    }
  };

  // Format timing label
  const getTimingLabel = (config) => {
    if (!config) return null;
    const { delay, delayUnit } = config;
    if (delay === 0) return 'Immediate — send right away';
    return `Send after ${delay} ${delayUnit}`;
  };

  if (loading) {
    return (
      <div className="journey-reviewer__loading">
        <div className="journey-reviewer__spinner" />
        <p>Loading journey...</p>
      </div>
    );
  }

  if (error || !touchpoints.length) {
    return (
      <div className="journey-reviewer__error">
        <h2>Error Loading Journey</h2>
        <p>{error || 'No touchpoints found for this journey.'}</p>
        <button
          className="journey-reviewer__error-back"
          onClick={() => navigate(-1)}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="journey-reviewer">
      {/* ── Sticky Header ── */}
      <header className="journey-reviewer__header">
        <button
          className="journey-reviewer__back"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="journey-reviewer__nav">
          <button
            className="journey-reviewer__nav-btn"
            onClick={goPrev}
            disabled={currentIndex === 0}
            title="Previous touchpoint (←)"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="journey-reviewer__progress">
            {currentIndex + 1}
            <span className="journey-reviewer__progress-sep"> / </span>
            {touchpoints.length}
          </span>

          <button
            className="journey-reviewer__nav-btn"
            onClick={goNext}
            disabled={currentIndex === touchpoints.length - 1}
            title="Next touchpoint (→)"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="journey-reviewer__actions">
          {hasUnsaved && (
            <button
              className="journey-reviewer__save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 size={16} className="journey-reviewer__spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}

          {isSaved && !hasUnsaved && (
            <span className="journey-reviewer__saved-badge">
              <Check size={14} />
              Saved
            </span>
          )}

          <button
            className="journey-reviewer__print-btn"
            onClick={handlePrintAll}
          >
            <Printer size={18} />
            Print All
          </button>
        </div>
      </header>

      {/* ── Screen View: current touchpoint editor ── */}
      <main className="journey-reviewer__content">
        <div className="journey-reviewer__journey-label">
          {journey?.name}
          {touchpoints.filter((tp) => edits[tp.id]).length > 0 && (
            <span className="journey-reviewer__unsaved-count">
              {touchpoints.filter((tp) => edits[tp.id]).length} unsaved
            </span>
          )}
        </div>

        <div className="journey-reviewer__doc">
          {/* Doc meta row */}
          <div className="journey-reviewer__doc-header">
            <div className="journey-reviewer__doc-meta">
              <span className="journey-reviewer__doc-type">
                Touchpoint Review Document
              </span>
              <span className="journey-reviewer__doc-date">
                Generated: {new Date().toLocaleDateString()}
              </span>
            </div>
            <span
              className={`journey-reviewer__type-badge journey-reviewer__type-badge--${current.type}`}
            >
              {getTypeIcon(current.type)}
              {current.type.toUpperCase()}
            </span>
          </div>

          {/* Title */}
          <h1 className="journey-reviewer__tp-title">
            {getTypeIcon(current.type)}
            {current.name}
          </h1>

          {/* Timing */}
          {current.config && (
            <div className="journey-reviewer__timing">
              {getTimingLabel(current.config)}
            </div>
          )}

          {/* Editable content */}
          <section className="journey-reviewer__fields">
            <h2 className="journey-reviewer__section-title">Content</h2>

            {isEmail && (
              <>
                <div className="journey-reviewer__field">
                  <label className="journey-reviewer__field-label">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    className="journey-reviewer__field-input journey-reviewer__field-input--subject"
                    value={content.subject || ''}
                    onChange={(e) => handleChange('subject', e.target.value)}
                    placeholder="Enter subject line…"
                  />
                </div>

                <div className="journey-reviewer__field">
                  <label className="journey-reviewer__field-label">
                    Preview Text
                  </label>
                  <input
                    type="text"
                    className="journey-reviewer__field-input"
                    value={content.previewText || ''}
                    onChange={(e) =>
                      handleChange('previewText', e.target.value)
                    }
                    placeholder="Enter preview text…"
                  />
                </div>
              </>
            )}

            <div className="journey-reviewer__field">
              <label className="journey-reviewer__field-label">
                {isEmail ? 'Email Body' : 'Message Content'}
              </label>
              <textarea
                className="journey-reviewer__field-textarea"
                value={content.body || ''}
                onChange={(e) => handleChange('body', e.target.value)}
                placeholder={
                  isEmail
                    ? 'Enter email body (HTML supported)…'
                    : 'Enter SMS message…'
                }
                rows={isEmail ? 18 : 6}
              />
            </div>

            {/* Rendered preview for emails */}
            {isEmail && content.body && (
              <div className="journey-reviewer__field">
                <label className="journey-reviewer__field-label">
                  Rendered Preview
                </label>
                <div className="journey-reviewer__preview-box">
                  <div
                    className="journey-reviewer__rendered"
                    dangerouslySetInnerHTML={{ __html: content.body }}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Touchpoint progress dots */}
          <div className="journey-reviewer__dots">
            {touchpoints.map((tp, idx) => (
              <button
                key={tp.id}
                className={`journey-reviewer__dot ${
                  idx === currentIndex
                    ? 'journey-reviewer__dot--active'
                    : ''
                } ${edits[tp.id] ? 'journey-reviewer__dot--unsaved' : ''} ${
                  savedIds.has(tp.id) ? 'journey-reviewer__dot--saved' : ''
                }`}
                onClick={() => setCurrentIndex(idx)}
                title={`${idx + 1}. ${tp.name}`}
              />
            ))}
          </div>
        </div>
      </main>

      {/* ── Print-only: all touchpoints ── */}
      <div className="journey-reviewer__print-all" aria-hidden="true">
        {touchpoints.map((tp, idx) => {
          const tpContent = getContent(tp);
          const tpIsEmail = tp.type === 'email';
          return (
            <div key={tp.id} className="journey-reviewer__print-page">
              {/* Page header */}
              <div className="journey-reviewer__print-page-header">
                <span className="journey-reviewer__print-page-label">
                  {journey?.name} — Touchpoint {idx + 1} of{' '}
                  {touchpoints.length}
                </span>
                <span className="journey-reviewer__print-page-date">
                  {new Date().toLocaleDateString()}
                </span>
              </div>

              <h1 className="journey-reviewer__print-tp-name">
                {tp.name}
              </h1>

              {tp.config && (
                <p className="journey-reviewer__print-timing">
                  {getTimingLabel(tp.config)}
                </p>
              )}

              {tpIsEmail && tpContent.subject && (
                <div className="journey-reviewer__print-field">
                  <span className="journey-reviewer__print-field-label">
                    Subject
                  </span>
                  <span className="journey-reviewer__print-field-value journey-reviewer__print-field-value--subject">
                    {tpContent.subject}
                  </span>
                </div>
              )}

              {tpIsEmail && tpContent.previewText && (
                <div className="journey-reviewer__print-field">
                  <span className="journey-reviewer__print-field-label">
                    Preview Text
                  </span>
                  <span className="journey-reviewer__print-field-value">
                    {tpContent.previewText}
                  </span>
                </div>
              )}

              <div className="journey-reviewer__print-body">
                {tpIsEmail && tpContent.body ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: tpContent.body }}
                  />
                ) : (
                  <p>{tpContent.body || '(no content)'}</p>
                )}
              </div>

              <footer className="journey-reviewer__print-footer">
                <span>Journey Builder • Touchpoint Review</span>
                <span>
                  {idx + 1} / {touchpoints.length}
                </span>
              </footer>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default JourneyReviewer;
