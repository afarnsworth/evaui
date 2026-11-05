// Wraps the tracker fragment (the form the artifact host expects) into a
// standalone page you can open directly or host anywhere.
import {readFileSync, writeFileSync} from 'node:fs';

const body = readFileSync('tracker/life-tracker.html', 'utf8');
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#030504">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}</style>
${body.trim()}
</html>
`;
writeFileSync('tracker/index.html', page);
console.log('wrote tracker/index.html');
