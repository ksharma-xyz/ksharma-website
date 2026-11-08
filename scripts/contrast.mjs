// WCAG 2.x contrast check for every colour pair the Press design uses.
//   node scripts/contrast.mjs
// Exits non-zero if any pair is below its required ratio.
const hex = h => h.replace('#', '').match(/../g).map(x => parseInt(x, 16));
const toHex = a => '#' + a.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a, b, p) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v * p + B[i] * (1 - p))); };
const lum = h => hex(h).map(v => v / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const themes = {
  light: { paper: '#FBFCFE', ink: '#161A2B', muted: '#545B73', wash: '#F0F2F9', rule: '#DEE2EF', line: '#7A8099',
           signal: '#3149C9', accent: '#3149C9', accentHover: '#2639A6', onAccent: '#FFFFFF', codeBg: '#161A2B',
           chartA: '#8EA2FF', chartB: '#2A3AA0' },
  dark:  { paper: '#0E1020', ink: '#E6E8F2', muted: '#A0A6BE', wash: '#161A2E', rule: '#262B45', line: '#6B7290',
           signal: '#8EA2FF', accent: '#A9B8FF', accentHover: '#C3CEFF', onAccent: '#0E1020', codeBg: '#161A2E',
           chartA: '#8EA2FF', chartB: '#2A3AA0' }, // charts keep a light figure surface in both themes
};
const code = { text: '#E6E8F2', keyword: '#C3B5FF', string: '#A8E0B5', comment: '#A3AAC2', number: '#FFC78A',
               title: '#9CC8FF', attr: '#FFB3C7', builtin: '#9CE3E0', meta: '#C9CEDF' };

let fails = 0;
const row = (theme, fg, bg, f, b, min) => {
  const r = ratio(f, b); const ok = r >= min; if (!ok) fails++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${theme.padEnd(5)}  ${fg.padEnd(14)} ${f}  on ${bg.padEnd(10)} ${b}  ${r.toFixed(2).padStart(5)}:1  (needs ${min})`);
};
for (const [name, t] of Object.entries(themes)) {
  t.tint = mix(t.signal, t.paper, 0.09);
  console.log(`\n${name}: tint = ${t.tint} (9% signal into paper)`);
  for (const bg of ['paper', 'wash', 'tint']) {
    row(name, 'ink', bg, t.ink, t[bg], 4.5);
    row(name, 'muted', bg, t.muted, t[bg], 4.5);
    row(name, 'accent-text', bg, t.accent, t[bg], 4.5);
    row(name, 'focus ring', bg, t.accent, t[bg], 3);
    row(name, 'btn border', bg, t.line, t[bg], 3);
    row(name, 'primary btn', bg, t.accent, t[bg], 3);
  }
  row(name, 'on-accent', 'accent', t.onAccent, t.accent, 4.5);
  row(name, 'on-accent', 'accent:hov', t.onAccent, t.accentHover, 4.5);
  row(name, 'accent:hover', 'paper', t.accentHover, t.paper, 4.5);
  // Article charts (inline SVG in posts) sit on a light figure surface in both themes.
  const L = themes.light;
  row(name, 'chart ink', 'chartA', L.ink, t.chartA, 4.5);
  row(name, 'chart white', 'chartB', '#FFFFFF', t.chartB, 4.5);
  row(name, 'chart label', 'chart bg', L.muted, L.paper, 4.5);
  row(name, 'chart bar B', 'chart bg', t.chartB, L.paper, 3);
  for (const [k, v] of Object.entries(code)) row(name, 'code ' + k, 'codeBg', v, t.codeBg, 4.5);
}
console.log(fails ? `\n${fails} pair(s) below the minimum.` : '\nEvery pair meets its minimum.');
process.exit(fails ? 1 : 0);
