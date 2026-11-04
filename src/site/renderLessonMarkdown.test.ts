import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderLessonMarkdown } from './renderLessonMarkdown.ts';

void test('renderLessonMarkdown renders Speech and Debate section badges', () => {
  const html = renderLessonMarkdown(
    '### Speech: Finding your voice\n\nHello.\n\n### Debate: Goals\n\nWorld.',
  );
  assert.match(html, /<span class="[^"]*">Speech<\/span> Finding your voice/);
  assert.match(html, /<span class="[^"]*">Debate<\/span> Goals/);
});

void test('renderLessonMarkdown wraps homework headings in the callout box', () => {
  const html = renderLessonMarkdown(
    '### Speech homework\n\nDo the reading.\n\n### Next section\n\nMore.',
  );
  assert.match(html, /border-amber-500[\s\S]*Speech homework[\s\S]*Do the reading/);
  assert.match(html, /<\/div>\s*<h3>Next section<\/h3>/);
});
