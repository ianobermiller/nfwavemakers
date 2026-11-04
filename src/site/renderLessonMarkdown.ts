import { Marked } from 'marked';

const SPEECH_BADGE =
  'mr-1.5 inline-block rounded bg-blue-100 px-1.5 py-px align-middle text-[0.68rem] font-bold tracking-wider text-nf-blue uppercase dark:bg-sky-900/50 dark:text-sky-100';
const DEBATE_BADGE =
  'mr-1.5 inline-block rounded bg-amber-100 px-1.5 py-px align-middle text-[0.68rem] font-bold tracking-wider text-amber-900 uppercase dark:bg-amber-900/40 dark:text-amber-200';
const HOMEWORK_BOX =
  'mt-6 rounded-r-lg border-l-4 border-amber-500 bg-white px-5 pt-4 pb-1 shadow-sm dark:bg-slate-900 [&_h3]:mt-0';

const marked = new Marked();

marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      if (depth === 3) {
        const speech = /^Speech:\s*(.*)$/i.exec(text);
        if (speech?.[1] !== undefined) {
          return `<h3><span class="${SPEECH_BADGE}">Speech</span> ${speech[1]}</h3>\n`;
        }
        const debate = /^Debate:\s*(.*)$/i.exec(text);
        if (debate?.[1] !== undefined) {
          return `<h3><span class="${DEBATE_BADGE}">Debate</span> ${debate[1]}</h3>\n`;
        }
        if (/homework/i.test(text)) {
          return `<h3 class="lesson-homework">${text}</h3>\n`;
        }
      }
      return `<h${depth}>${text}</h${depth}>\n`;
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const titleAttr = title ? ` title="${title}"` : '';
      const external = /^https?:\/\//i.test(href);
      const rel = external ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${href}"${titleAttr}${rel}>${text}</a>`;
    },
  },
});

function wrapHomework(html: string): string {
  return html.replace(/<h3 class="lesson-homework">[\s\S]*?(?=<h3\b|$)/g, (block) => {
    return `<div class="${HOMEWORK_BOX}">${block.trim()}</div>\n`;
  });
}

export function renderLessonMarkdown(markdown: string): string {
  const html = marked.parse(markdown, { async: false });
  if (typeof html !== 'string') return '';
  return wrapHomework(html);
}
