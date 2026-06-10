/**
 * present/css — Quiz mode: Anki-style reveal cards
 */

export const QUIZ_CSS = `/* === Quiz — Anki-style reveal === */
.quiz-wrap {
  max-width: 620px;
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px) clamp(16px, 3vw, 24px);
}
.quiz-progress {
  height: 4px;
  background: var(--color-surface);
  border-radius: 2px;
  margin-bottom: 14px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.quiz-progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 2px;
  width: 0%;
  transition: width 300ms var(--ease);
}
.quiz-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: clamp(20px, 3vw, 32px);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-tertiary);
}
.quiz-counter { font-variant-numeric: tabular-nums; }
.quiz-score { font-variant-numeric: tabular-nums; }

.quiz-card {
  background: var(--color-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: clamp(24px, 4vw, 40px);
  box-shadow: var(--shadow-card);
  outline: none;
}
.quiz-card:focus-visible {
  box-shadow: var(--shadow-card), 0 0 0 3px var(--accent-muted);
}
.quiz-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin-bottom: 10px;
}
.quiz-question {
  font-family: var(--font-heading);
  font-size: clamp(19px, 1.2vw + 14px, 26px);
  font-weight: 500;
  line-height: 1.35;
  color: var(--color-text);
  margin: 0;
  text-wrap: balance;
}
.quiz-answer {
  display: none;
  font-family: var(--font-body);
  font-size: clamp(14px, 0.4vw + 12px, 16px);
  line-height: 1.7;
  color: var(--text-secondary);
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px dashed var(--border);
  animation: quiz-reveal 240ms var(--ease);
}
.quiz-answer.revealed { display: block; }
@keyframes quiz-reveal {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.quiz-actions {
  margin-top: clamp(18px, 3vw, 28px);
  display: flex;
  justify-content: center;
}
.quiz-feedback {
  display: none;
  gap: 12px;
  width: 100%;
  justify-content: center;
  flex-wrap: wrap;
  animation: quiz-reveal 240ms var(--ease);
}

.quiz-btn {
  padding: 10px 24px;
  border-radius: var(--radius-md);
  font-size: 13.5px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--color-surface);
  color: var(--color-text);
  transition: transform 120ms var(--ease), background 120ms var(--ease), border-color 120ms var(--ease);
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.quiz-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.quiz-btn:active { transform: translateY(1px); }

.quiz-btn--primary {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
  min-width: 160px;
}
.quiz-btn--primary:hover {
  filter: brightness(1.06);
  color: #fff;
  border-color: var(--color-accent);
}
.theme-dark .quiz-btn--primary { color: #0E0E0E; }

.quiz-btn--got-it {
  background: var(--color-success);
  color: #fff;
  border-color: var(--color-success);
}
.quiz-btn--got-it:hover {
  filter: brightness(1.06);
  color: #fff;
  border-color: var(--color-success);
}
.theme-dark .quiz-btn--got-it { color: #0E0E0E; }

.quiz-btn--review {
  background: var(--color-surface);
  color: var(--color-text);
}

/* Legacy compat for any tests still inspecting old quiz classes */
.flashcard, .flashcard-inner, .flashcard-front, .flashcard-back { display: none; }`;
