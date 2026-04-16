/**
 * present — Quiz mode
 *
 * Flashcard quiz extracted from article H2 sections.
 * Option F: Linear Editorial — Duolingo-style 3D buttons, progress bar, flip cards.
 * Front: question about section. Back: first 2-3 sentences.
 * Session scoring, shuffle, flip animation.
 */

import type { SiteData, DesignConfig, ArticleData } from '../types.js';
import { pageShell } from '../html.js';
import { shortTopic } from '../hub.js';

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface FlashCard {
  readonly front: string;
  readonly back: string;
}

const SKIP_HEADINGS = new Set(['See Also', 'References', 'Sources']);

const QUESTION_TEMPLATES: Record<string, string> = {
  'overview': 'What is {title} and why does it matter?',
  'key capabilities': 'What are the key capabilities of {title}?',
  'how it works': 'Explain how {title} works.',
  'usage examples': 'Give an example of using {title}.',
  'limitations': 'What are the trade-offs or limitations of {title}?',
  'architecture': 'Describe the architecture of {title}.',
  'getting started': 'How do you get started with {title}?',
  'configuration': 'How is {title} configured?',
  'performance': 'What are the performance characteristics of {title}?',
  'security': 'What security considerations apply to {title}?',
  'integration': 'How do you integrate {title} with other systems?',
  'trade-offs': 'What are the trade-offs when using {title}?',
  'comparison': 'How does {title} compare to its alternatives?',
  'best practices': 'What are the best practices for {title}?',
  'patterns': 'What design patterns are used in {title}?',
  'setup': 'How do you set up {title}?',
  'installation': 'What steps are required to install {title}?',
  'api': 'What does the {title} API look like?',
  'data model': 'Describe the data model of {title}.',
  'deployment': 'How is {title} deployed?',
  'testing': 'How do you test {title}?',
  'troubleshooting': 'What would you check first when debugging {title}?',
  'ecosystem': 'What ecosystem exists around {title}?',
  'internals': 'How does {title} work under the hood?',
  'transport': 'How does data move through {title}?',
};

const QUESTION_VARIANTS: Record<string, readonly string[]> = {
  'overview': [
    'What is {title} and why does it matter?',
    'Summarize {title} in your own words.',
    'Why was {title} created and what problem does it solve?',
  ],
  'key capabilities': [
    'What are the key capabilities of {title}?',
    'What can {title} do that matters most?',
    'List the most important features of {title}.',
  ],
  'how it works': [
    'Explain how {title} works.',
    'Walk through the main mechanism of {title}.',
    'What happens step-by-step when {title} runs?',
  ],
  'usage examples': [
    'Give an example of using {title}.',
    'Describe a real-world scenario where you would use {title}.',
    'How would you apply {title} in practice?',
  ],
  'limitations': [
    'What are the trade-offs or limitations of {title}?',
    'When should you NOT use {title}?',
    'What constraints should you be aware of with {title}?',
  ],
  'architecture': [
    'Describe the architecture of {title}.',
    'What are the main components of {title} and how do they connect?',
    'Draw a mental model of how {title} is structured.',
  ],
  'getting started': [
    'How do you get started with {title}?',
    'What are the first steps to use {title}?',
    'If you were setting up {title} today, what would you do first?',
  ],
  'configuration': [
    'How is {title} configured?',
    'What configuration options does {title} expose?',
    'What settings matter most when configuring {title}?',
  ],
  'performance': [
    'What are the performance characteristics of {title}?',
    'Where are the bottlenecks in {title}?',
    'How would you optimize {title} for speed?',
  ],
};

function questionForHeading(headingText: string, articleTitle: string, slug: string): string {
  const key = headingText.toLowerCase();
  // Try variants first (for the original 9 keys)
  const variants = QUESTION_VARIANTS[key];
  if (variants) {
    const idx = (slug.length + headingText.length) % variants.length;
    return variants[idx].replace('{title}', articleTitle);
  }
  // Then try single templates (for the 16 new keys)
  const template = QUESTION_TEMPLATES[key];
  if (template) return template.replace('{title}', articleTitle);
  // Fallback — improved from "Describe the X aspect of Y"
  return `What should you know about ${headingText} in ${articleTitle}?`;
}

function extractCards(articles: readonly ArticleData[]): readonly FlashCard[] {
  const cards: FlashCard[] = [];

  for (const article of articles) {
    const h2Headings = article.headings.filter(h => h.level === 2);
    if (h2Headings.length === 0) continue;

    const sections = splitByH2(article.html);

    for (const heading of h2Headings) {
      if (SKIP_HEADINGS.has(heading.text)) continue;

      const section = sections.find(s =>
        s.heading.toLowerCase() === heading.text.toLowerCase()
      );
      if (!section) continue;

      const plainText = section.content.replace(/<[^>]+>/g, '').trim();
      if (plainText.length < 20) continue;

      const sentences = extractSentences(plainText, 3);
      if (sentences.length === 0) continue;

      cards.push({
        front: questionForHeading(heading.text, article.title, article.slug),
        back: sentences.join(' '),
      });
    }
  }

  return cards;
}

function splitByH2(html: string): Array<{ heading: string; content: string }> {
  const parts: Array<{ heading: string; content: string }> = [];
  const regex = /<h2[^>]*>(.*?)<\/h2>/gi;
  let match = regex.exec(html);
  const indices: Array<{ heading: string; start: number; end: number }> = [];

  while (match !== null) {
    const heading = match[1].replace(/<[^>]+>/g, '');
    indices.push({
      heading,
      start: match.index + match[0].length,
      end: 0,
    });
    match = regex.exec(html);
  }

  for (let i = 0; i < indices.length; i++) {
    const searchStart = indices[i].start;
    const nextH2 = html.indexOf('<h2', searchStart);
    const end = (nextH2 > searchStart) ? nextH2 : html.length;

    parts.push({
      heading: indices[i].heading,
      content: html.slice(searchStart, end).trim(),
    });
  }

  return parts;
}

function extractSentences(text: string, max: number): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  // Try sentence extraction first (prose with . ! ?)
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    return sentences.slice(0, max).map(s => s.trim());
  }

  // Fallback for bullet-style content without terminal punctuation:
  // split on common delimiters (em dash, en dash, newline, semicolon)
  // then take the first N non-empty chunks.
  const chunks = cleaned
    .split(/\s*[—–\n;]\s*/)
    .map(c => c.trim())
    .filter(c => c.length > 10);

  if (chunks.length > 0) {
    return chunks.slice(0, max);
  }

  // Last resort: truncate at a sentence boundary to avoid mid-word cuts.
  if (cleaned.length === 0) return [];
  const truncated = cleaned.slice(0, 350);
  const lastBoundary = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? '),
  );
  if (lastBoundary > 50) {
    return [truncated.slice(0, lastBoundary + 1)];
  }
  // Fall back to last space
  const lastSpace = truncated.lastIndexOf(' ', 300);
  return [truncated.slice(0, lastSpace > 50 ? lastSpace : 300) + '...'];
}

function quizScript(): string {
  return `<script>
(function() {
  var cards = window.QUIZ_CARDS;
  var deck = [];
  var current = 0;
  var gotIt = 0;
  var reviewAgain = 0;
  var revealed = false;

  var cardEl = document.getElementById('quiz-card');
  var questionEl = document.getElementById('quiz-question');
  var answerEl = document.getElementById('quiz-answer');
  var showBtn = document.getElementById('btn-show');
  var gotItBtn = document.getElementById('btn-got-it');
  var reviewBtn = document.getElementById('btn-review');
  var restartBtn = document.getElementById('btn-restart');
  var feedbackRow = document.getElementById('quiz-feedback');
  var scoreEl = document.getElementById('quiz-score');
  var progressEl = document.getElementById('quiz-progress');
  var progressFill = document.getElementById('quiz-progress-fill');

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function hide(el) { if (el) el.style.display = 'none'; }
  function show(el, display) { if (el) el.style.display = display || ''; }

  function start() {
    deck = shuffle(cards);
    current = 0;
    gotIt = 0;
    reviewAgain = 0;
    revealed = false;
    render();
  }

  function render() {
    if (current >= deck.length) {
      hide(cardEl);
      hide(showBtn);
      hide(feedbackRow);
      show(restartBtn, 'inline-flex');
      progressEl.textContent = 'Complete';
      scoreEl.textContent = gotIt + ' got it · ' + reviewAgain + ' to review · ' + deck.length + ' total';
      progressFill.style.width = '100%';
      return;
    }

    show(cardEl, 'block');
    show(showBtn, 'inline-flex');
    hide(feedbackRow);
    hide(restartBtn);
    revealed = false;

    questionEl.textContent = deck[current].front;
    answerEl.textContent = deck[current].back;
    answerEl.classList.remove('revealed');

    progressEl.textContent = (current + 1) + ' / ' + deck.length;
    scoreEl.textContent = gotIt + ' got it · ' + reviewAgain + ' to review';
    progressFill.style.width = ((current + 1) / deck.length * 100) + '%';
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    answerEl.classList.add('revealed');
    hide(showBtn);
    show(feedbackRow, 'flex');
  }

  showBtn.addEventListener('click', reveal);
  // Pressing Space or Enter while the card has focus reveals the answer
  cardEl.setAttribute('tabindex', '0');
  cardEl.addEventListener('keydown', function(e) {
    if ((e.key === ' ' || e.key === 'Enter') && !revealed) {
      e.preventDefault();
      reveal();
    }
  });

  gotItBtn.addEventListener('click', function() {
    gotIt++;
    current++;
    render();
  });

  reviewBtn.addEventListener('click', function() {
    reviewAgain++;
    current++;
    render();
  });

  restartBtn.addEventListener('click', start);

  if (!cards || cards.length === 0) {
    hide(cardEl);
    hide(showBtn);
    hide(feedbackRow);
    progressEl.textContent = '';
    scoreEl.textContent = 'No flashcards yet — articles need H2 sections with prose content.';
  } else {
    start();
  }
})();
</script>`;
}

export function generateQuizMode(data: SiteData, config: DesignConfig): string {
  const cards = extractCards(data.articles);
  const cardsJSON = JSON.stringify(cards);

  const body = `
<script>window.QUIZ_CARDS = ${cardsJSON};</script>
<div class="quiz-wrap">
  <div class="quiz-progress">
    <div class="quiz-progress-fill" id="quiz-progress-fill"></div>
  </div>
  <div class="quiz-meta">
    <span class="quiz-counter" id="quiz-progress"></span>
    <span class="quiz-score" id="quiz-score"></span>
  </div>
  <article class="quiz-card" id="quiz-card" aria-live="polite">
    <div class="quiz-label">Question</div>
    <p class="quiz-question" id="quiz-question"></p>
    <div class="quiz-answer" id="quiz-answer" aria-label="Answer"></div>
  </article>
  <div class="quiz-actions">
    <button class="quiz-btn quiz-btn--primary" id="btn-show">Show answer</button>
    <div class="quiz-feedback" id="quiz-feedback">
      <button class="quiz-btn quiz-btn--got-it" id="btn-got-it">Got it</button>
      <button class="quiz-btn quiz-btn--review" id="btn-review">Review again</button>
    </div>
    <button class="quiz-btn quiz-btn--primary" id="btn-restart" style="display:none">Restart</button>
  </div>
</div>
${quizScript()}`;

  return pageShell(`${shortTopic(data.schema.topic)} — Quiz`, 'quiz', body, config, data);
}
