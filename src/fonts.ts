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
  '、。あがしだでとなぬのまみらアカクケコサシスセタダチッツテトネバパビブベマムモュリルワンー一中主了予事京会作供侵信候入全兵内再出切到劇力動北南可号同否告命員回壁声壱外完実審尾展市' +
  '度弐待律応思急意態戦承抽探提撃支断新期未東析果検極構標機次決沈注活測源演率画界目知種第答算終結給緊総線置考自致行装補見解計設訴話認警議起距路迎追送速達部配開闘防限離電青面音題高黙';
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
