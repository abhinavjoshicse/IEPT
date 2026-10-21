// Prints WCAG contrast ratios for the token pairs (both themes). node scripts/contrast.mjs
const L = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const C = (a, b) => {
  const [x, y] = [L(a), L(b)].sort((m, n) => n - m);
  return ((x + 0.05) / (y + 0.05)).toFixed(2);
};
const mix = (a, b, t) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
const T = {
  light: { bg: '#ECEAE4', elev: '#F8F7F3', edge: '#ECEAE4', ink: '#141512', mute: '#55574F', acc: '#F5B301', accText: '#6E4C00', accInk: '#141512', brand: '#005A8C', sealText: '#8A4F00', err: '#B83232', footer: '#E3E0D8', accSoft: [47, 143, 78, 0.1] },
  dark: { bg: '#0C0D0B', elev: '#161714', edge: '#2B2415', ink: '#F3F1EA', mute: '#A2A39B', acc: '#F5B301', accText: '#F5B301', accInk: '#111210', brand: '#6BB6E8', sealText: '#FFB13B', err: '#FF7B7B', footer: '#080907', accSoft: [143, 214, 148, 0.08] },
};
const rows = [];
for (const [mode, t] of Object.entries(T)) {
  const soft = mix(t.bg, '#' + t.accSoft.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join(''), t.accSoft[3]);
  rows.push(
    [mode, '--ink on --bg', C(t.ink, t.bg), '7.0'],
    [mode, '--mute on --bg', C(t.mute, t.bg), '4.5'],
    [mode, '--mute on gradient edge', C(t.mute, t.edge), '4.5'],
    [mode, '--mute on --bg-elev', C(t.mute, t.elev), '4.5'],
    [mode, '--mute on footer', C(t.mute, t.footer), '4.5'],
    [mode, '--acc-ink on --acc (buttons)', C(t.accInk, t.acc), '4.5'],
    [mode, '--acc-text on --bg (eyebrows)', C(t.accText, t.bg), '4.5'],
    [mode, 'eco text on eco strip', C(mode === 'light' ? '#256B3B' : '#8FD694', soft), '4.5'],
    [mode, '--brand (logo/links) on --bg', C(t.brand, t.bg), '4.5'],
    [mode, '--seal-text on --bg-elev (P-0x)', C(t.sealText, t.elev), '4.5'],
    [mode, 'error text on --bg-elev', C(t.err, t.elev), '4.5'],
  );
}
console.log('| Mode | Pair | Ratio | Needs |\n|---|---|---|---|');
for (const r of rows) console.log(`| ${r[0]} | ${r[1]} | ${r[2]}:1 ${+r[2] >= +r[3] ? '✅' : '❌'} | ≥ ${r[3]} |`);
