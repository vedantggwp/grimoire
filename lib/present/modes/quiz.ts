/**
 * present — Quiz mode
 *
 * Flashcard quiz extracted from article H2 sections.
 * Front: question about section. Back: first 2-3 sentences.
 * Session scoring, shuffle, flip animation.
 */

import type { SiteData, DesignConfig, ArticleData } from '../types.js';
import { pageShell } from '../html.js';

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
};

function questionForHeading(headingText: string, articleTitle: string): string {
  const key = headingText.toLowerCase();
  const template = QUESTION_TEMPLATES[key];
  if (template) return template.replace('{title}', articleTitle);
  return `Describe the ${headingText} aspect of ${articleTitle}.`;
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
        front: questionForHeading(heading.text, article.title),
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

  // Last resort: return the whole cleaned text truncated.
  return cleaned.length > 0 ? [cleaned.slice(0, 300)] : [];
}

function quizScript(): string {
  return `<script>
(function() {
  var cards = window.QUIZ_CARDS;
  var deck = [];
  var current = 0;
  var gotIt = 0;
  var reviewAgain = 0;
  var flipped = false;

  var front = document.getElementById('card-front');
  var back = document.getElementById('card-back');
  var flashcard = document.getElementById('flashcard');
  var scoreEl = document.getElementById('quiz-score');
  var progressEl = document.getElementById('quiz-progress');
  var gotItBtn = document.getElementById('btn-got-it');
  var reviewBtn = document.getElementById('btn-review');
  var restartBtn = document.getElementById('btn-restart');

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function start() {
    deck = shuffle(cards);
    current = 0;
    gotIt = 0;
    reviewAgain = 0;
    flipped = false;
    show();
  }

  function show() {
    if (current >= deck.length) {
      flashcard.style.display = 'none';
      gotItBtn.style.display = 'none';
      reviewBtn.style.display = 'none';
      restartBtn.style.display = 'inline-flex';
      progressEl.textContent = 'Done!';
      scoreEl.textContent = gotIt + ' got it, ' + reviewAgain + ' to review out of ' + deck.length;
      return;
    }

    flashcard.style.display = 'flex';
    gotItBtn.style.display = 'inline-flex';
    reviewBtn.style.display = 'inline-flex';
    restartBtn.style.display = 'none';

    front.textContent = deck[current].front;
    back.textContent = deck[current].back;
    back.style.display = 'none';
    front.style.display = 'block';
    flipped = false;

    progressEl.textContent = (current + 1) + ' / ' + deck.length;
    scoreEl.textContent = gotIt + ' got it, ' + reviewAgain + ' to review';
  }

  flashcard.addEventListener('click', function() {
    if (!flipped) {
      front.style.display = 'none';
      back.style.display = 'block';
      flipped = true;
    }
  });

  gotItBtn.addEventListener('click', function() {
    gotIt++;
    current++;
    show();
  });

  reviewBtn.addEventListener('click', function() {
    reviewAgain++;
    current++;
    show();
  });

  restartBtn.addEventListener('click', start);

  if (cards.length === 0) {
    flashcard.innerHTML = '<p style="color:var(--color-muted)">No flashcards available. Articles need H2 sections with content.</p>';
    gotItBtn.style.display = 'none';
    reviewBtn.style.display = 'none';
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
<div style="padding:var(--space-6) 0">
  <div class="content-column" style="text-align:center">
    <h1 style="margin-bottom:var(--space-2)">Quiz</h1>
    <p id="quiz-progress" style="color:var(--color-muted);margin-bottom:var(--space-2)"></p>
    <p id="quiz-score" style="color:var(--color-muted);font-size:var(--text-sm);margin-bottom:var(--space-6)"></p>
    <div class="flashcard" id="flashcard">
      <div id="card-front" style="font-size:var(--text-xl);font-family:var(--font-heading)"></div>
      <div id="card-back" style="font-size:var(--text-base);display:none;line-height:1.6"></div>
    </div>
    <div style="display:flex;gap:var(--space-3);justify-content:center;margin-top:var(--space-4)">
      <button class="btn btn--primary" id="btn-got-it">Got it</button>
      <button class="btn" id="btn-review">Review again</button>
      <button class="btn btn--primary" id="btn-restart" style="display:none">Restart</button>
    </div>
  </div>
</div>
${quizScript()}`;

  return pageShell(`${data.schema.topic} — Quiz`, 'quiz', body, config, data);
}
