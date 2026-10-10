/**
 * Shared chapter index for the book build scripts.
 *
 * The book files are named inconsistently in practice — `Chapter-21-Giving-The-Talk...md`,
 * `chapter-01-introduction.md`, `Chapter-5B-Your-First-Program...md` — so discovery must be
 * case-insensitive and must understand the `5B` style suffix. The old scripts hardcoded a
 * lowercase chapter-01..16 list and matched /^chapter-\d+/ case-sensitively, so they found
 * ZERO of the real files. This module is the single source of truth for both scripts.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_BOOK_DIR = path.join(process.cwd(), 'book');

// Chapter-21-… / chapter-01-… / Chapter-5B-…   (case-insensitive; optional letter suffix)
const CHAPTER_RE = /^chapter-(\d+)([a-z]*)[-_](.+?)\.md$/i;

/**
 * Discover chapter files, sorted by (number, suffix).
 * @param {string} [bookDir]
 * @returns {{ file: string, num: number, suffix: string, slug: string, title: string }[]}
 */
function discoverChapters(bookDir = DEFAULT_BOOK_DIR) {
  if (!fs.existsSync(bookDir)) return [];

  return fs
    .readdirSync(bookDir)
    .map(file => {
      const m = file.match(CHAPTER_RE);
      if (!m) return null;
      return {
        file,
        num: parseInt(m[1], 10),
        suffix: (m[2] || '').toUpperCase(),
        slug: m[3],
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.num - b.num || a.suffix.localeCompare(b.suffix) || a.slug.localeCompare(b.slug))
    .map(c => ({ ...c, title: readTitle(bookDir, c) }));
}

/** Prefer the file's own `#` heading; fall back to the filename slug. */
function readTitle(bookDir, chapter) {
  try {
    const head = fs.readFileSync(path.join(bookDir, chapter.file), 'utf-8').slice(0, 4000);
    const m = head.match(/^#\s+(.+)$/m);
    if (m) return m[1].replace(/[#*`]/g, '').trim();
  } catch {
    /* fall through to the slug */
  }
  return titleFromSlug(chapter.slug);
}

/** "Giving-The-Talk-Explaining-Your-Own-AI" → "Giving The Talk Explaining Your Own AI" */
function titleFromSlug(slug) {
  const acronyms = new Set(['ai', 'api', 'mcp', 'ui', 'cli', 'pdf', 'tts', 'llm', 'json', 'sql', 'comfyui', 'oss', 'gpu', 'cpu']);
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map(w => (acronyms.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/** "5B" / "22" — the chapter's display label. */
function chapterLabel(chapter) {
  return `${chapter.num}${chapter.suffix}`;
}

/** Read one chapter's markdown. */
function readChapter(bookDir, chapter) {
  return fs.readFileSync(path.join(bookDir, chapter.file), 'utf-8');
}

module.exports = {
  DEFAULT_BOOK_DIR,
  discoverChapters,
  readChapter,
  readTitle,
  titleFromSlug,
  chapterLabel,
};
