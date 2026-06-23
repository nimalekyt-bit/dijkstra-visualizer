// Генерация локального fonts.css из Google Fonts css2 (webfonts/google.css).
// css2 отдаёт Inter / JetBrains Mono / Plus Jakarta Sans как variable-шрифты
// (один файл на сабсет для всех весов), поэтому блоки одного семейства+сабсета
// схлопываются в один @font-face с диапазоном font-weight: 400 800.
// Оставляем только сабсеты latin/latin-ext/cyrillic/cyrillic-ext.
//
// Регенерация:  node build-fonts.cjs   (нужен webfonts/google.css и интернет)
const fs = require('fs');
const https = require('https');
const path = require('path');

const src = fs.readFileSync('webfonts/google.css', 'utf8');
const KEEP = new Set(['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext']);
const re = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*{([^}]*)}/g;
const faces = new Map(); // fam|subset -> {fam, subset, url, range, fname}
let m;
while ((m = re.exec(src)) !== null) {
  const subset = m[1];
  if (!KEEP.has(subset)) continue;
  const b = m[2];
  const fam = (b.match(/font-family:\s*'([^']+)'/) || [])[1];
  const url = (b.match(/url\(([^)]+)\)/) || [])[1];
  const range = (b.match(/unicode-range:\s*([^;]+);/) || [])[1].trim();
  const key = fam + '|' + subset;
  if (!faces.has(key)) {
    faces.set(key, { fam, subset, url, range, fname: fam.replace(/\s+/g, '') + '-' + subset + '.woff2' });
  }
}

const head = `/* ============================================================================
 * fonts.css — Локальные веб-шрифты (offline-first). СГЕНЕРИРОВАНО build-fonts.cjs.
 * Источник: Google Fonts (variable woff2), сабсеты latin + cyrillic.
 *   --font-sans → Inter | --font-heading → Plus Jakarta Sans | --font-mono → JetBrains Mono
 * ============================================================================ */`;
const out = [head];
for (const f of faces.values()) {
  out.push(`/* ${f.subset} */
@font-face {
  font-family: '${f.fam}';
  font-style: normal;
  font-weight: 400 800;
  font-display: swap;
  src: url('webfonts/${f.fname}') format('woff2');
  unicode-range: ${f.range};
}`);
}
fs.writeFileSync('fonts.css', out.join('\n\n') + '\n');
console.log('Faces:', faces.size);

function dl(url, dest) {
  return new Promise((res, rej) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, r => {
      if (r.statusCode !== 200) { rej(new Error(r.statusCode + ' ' + url)); return; }
      r.pipe(file); file.on('finish', () => file.close(() => res()));
    }).on('error', rej);
  });
}
(async () => {
  let n = 0;
  for (const f of faces.values()) { await dl(f.url, path.join('webfonts', f.fname)); n++; process.stdout.write('.'); }
  console.log('\nDownloaded', n);
})();
