import { Features, transform } from 'lightningcss';
import type { Plugin } from 'vite';

// De-googled Android often keeps an old WebView or Firefox (Bromite 108,
// Firefox ESR 115). Those engines drop @layer entirely, ignore oklch(), and
// reject gradients that say "in oklab" — which removes layout and hides text
// that sits on those gradients. iOS Safari is new enough that none of this shows.
const TARGETS = {
  android: 80 << 16,
  chrome: 80 << 16,
  firefox: 90 << 16,
  ios_saf: 14 << 16,
  safari: 14 << 16,
  samsung: 13 << 16,
};

export function downlevelCss(): Plugin {
  return {
    name: 'downlevel-css',
    // After Tailwind (also `pre`, registered first) and before Vite extracts CSS.
    enforce: 'pre',
    transform(code, id) {
      const path = id.split('?', 1)[0] ?? id;
      if (!path.endsWith('.css') || path.includes('node_modules')) return null;
      if (!code.includes('@layer') && !code.includes('oklch(') && !code.includes('in oklab')) {
        return null;
      }
      const prepared = stripGradientInterpolation(unwrapLayers(code));
      const result = transform({
        filename: path,
        code: Buffer.from(prepared),
        errorRecovery: true,
        include: Features.Colors | Features.Nesting | Features.MediaQueries | Features.LogicalProperties,
        targets: TARGETS,
      });
      return { code: result.code.toString(), map: null };
    },
  };
}

function unwrapLayers(css: string): string {
  let out = '';
  let i = 0;
  while (i < css.length) {
    if (css.startsWith('@layer', i) && (i === 0 || /[\s{};]/.test(css[i - 1] ?? ''))) {
      let j = i + '@layer'.length;
      while (j < css.length && css[j] !== '{' && css[j] !== ';') j++;
      if (css[j] === ';') {
        i = j + 1;
        continue;
      }
      if (css[j] === '{') {
        const end = matchingBrace(css, j);
        out += unwrapLayers(css.slice(j + 1, end));
        i = end + 1;
        continue;
      }
    }
    out += css[i];
    i++;
  }
  return out;
}

function stripGradientInterpolation(css: string): string {
  return css.replaceAll(/(--tw-gradient-position:[^;}]*) in oklab/g, '$1');
}

function matchingBrace(css: string, open: number): number {
  // Selectors contain escaped quotes (`content-['+']` → `\'`), so quote tracking
  // falsely swallows real braces. This stylesheet has no braces inside strings.
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 1;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error('Unbalanced CSS brace while unwrapping @layer');
}
