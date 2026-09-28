// Collects every CJK glyph used in src/scenes and writes it into the JP
// preload string in src/fonts.ts. Run after adding Japanese text.
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';

const dir = 'src/scenes';
const src = readdirSync(dir)
  .map((f) => readFileSync(`${dir}/${f}`, 'utf8'))
  .join('')
  .replace(/\/\/.*$/gm, '');
const chars = [...new Set([...src].filter((c) => c.codePointAt(0) > 0x3000 || '、。'.includes(c)))].sort().join('');
const half = Math.ceil(chars.length / 2);
const fonts = readFileSync('src/fonts.ts', 'utf8').replace(
  /const JP =\n(?:\s*'[^']*'\s*\+?)+;/,
  `const JP =\n  '${chars.slice(0, half)}' +\n  '${chars.slice(half)}';`,
);
writeFileSync('src/fonts.ts', fonts);
console.log(`${chars.length} glyphs`);
