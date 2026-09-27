import {continueRender, delayRender} from 'remotion';

import '@fontsource/shippori-mincho-b1/800.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/noto-sans-jp/700.css';
import '@fontsource/noto-sans-jp/900.css';

// Fontsource splits CJK fonts into unicode-range chunks that the browser only
// fetches on demand. Ask for every glyph we use up front so no frame renders
// with a fallback face.
const JP =
  '、あでとのまアカケシスタテパビブムリルンー一中主事会作供侵入全内再切劇動可否告員壱外実審律思急態' +
  '戦承提断析果検決活源演界知種第算終結給緊総置考自致行解計設訴話認警議起部配闘限電青題';
const LATIN =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:.,-_%/+()[]#@!?';

const faces = [
  `800 100px "Shippori Mincho B1"`,
  `500 100px "Barlow Condensed"`,
  `600 100px "Barlow Condensed"`,
  `700 100px "Barlow Condensed"`,
  `700 100px "Noto Sans JP"`,
  `900 100px "Noto Sans JP"`,
];

const handle = delayRender('Loading fonts');
Promise.all(faces.map((f) => document.fonts.load(f, JP + LATIN)))
  .then(() => continueRender(handle))
  .catch((err) => {
    console.error(err);
    continueRender(handle);
  });
