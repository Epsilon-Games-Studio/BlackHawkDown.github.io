// Comprueba que dos versiones del juego hacen EXACTAMENTE lo mismo: compara el árbol sintáctico
// (AST) de los <script> locales (en línea o con src="...") y el CSS (<style> o <link rel="stylesheet">),
// ignorando comentarios, espacios, comillas y formato.
//
//   node tools/verify.mjs viejo.html nuevo.html
//
// Necesita acorn (npm i acorn) o la variable ACORN con la ruta a su carpeta.
import fs from 'fs';
import path from 'path';

const acorn = await import(process.env.ACORN ? process.env.ACORN + '/dist/acorn.mjs' : 'acorn');

function loadScripts(htmlPath) {
  const dir = path.dirname(path.resolve(htmlPath));
  const html = fs.readFileSync(htmlPath, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const out = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    const srcM = attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (srcM) {
      if (/^https?:\/\//i.test(srcM[1])) continue;
      out.push(fs.readFileSync(path.resolve(dir, srcM[1]), 'utf8'));
    } else if (m[2].trim()) {
      out.push(m[2]);
    }
  }
  return out;
}

function loadCss(htmlPath) {
  const dir = path.dirname(path.resolve(htmlPath));
  const html = fs.readFileSync(htmlPath, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const parts = [];
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>|<link\b([^>]*)>/gi)) {
    if (m[2] !== undefined) {
      const attrs = m[2];
      if (!/\brel=["']stylesheet["']/i.test(attrs)) continue;
      const hrefM = attrs.match(/\bhref=["']([^"']+)["']/i);
      if (!hrefM || /^https?:\/\//i.test(hrefM[1])) continue;
      parts.push(fs.readFileSync(path.resolve(dir, hrefM[1]), 'utf8'));
    } else {
      parts.push(m[0].replace(/^<style\b[^>]*>|<\/style>$/gi, ''));
    }
  }
  return parts
    .join('')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^\w.])\.(\d)/g, '$10.$2')
    .replace(/"/g, "'")
    .replace(/\s+/g, '')
    .replace(/;}/g, '}')
    .toLowerCase();
}

function norm(node) {
  if (Array.isArray(node)) return node.map(norm);
  if (!node || typeof node !== 'object') return node;
  const o = {};
  for (const k of Object.keys(node)) {
    if (k === 'start' || k === 'end' || k === 'loc' || k === 'range' || k === 'raw') continue;
    o[k] = norm(node[k]);
  }
  if (node.type === 'Literal' && node.regex) o.value = String(node.value);
  if (node.type === 'Literal' && typeof node.value === 'bigint') o.value = String(node.value);
  if (node.type === 'Property' && !node.computed) {
    o.key = { k: node.key.type === 'Identifier' ? node.key.name : String(node.key.value) };
  }
  if (node.type === 'TemplateElement') {
    o.value = { cooked: String(node.value.cooked).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '') };
  }
  return o;
}

const [fileA, fileB] = process.argv.slice(2);
const [a, b] = [loadScripts(fileA), loadScripts(fileB)];
let ok = a.length === b.length;
console.log(`scripts: ${a.length} / ${b.length}`);
for (let i = 0; i < Math.min(a.length, b.length); i++) {
  const pa = JSON.stringify(norm(acorn.parse(a[i], { ecmaVersion: 'latest' })));
  const pb = JSON.stringify(norm(acorn.parse(b[i], { ecmaVersion: 'latest' })));
  const same = pa === pb;
  ok = ok && same;
  let where = '';
  if (!same) {
    let k = 0;
    while (pa[k] === pb[k]) k++;
    where = '\n   A: ' + pa.slice(k - 200, k + 200) + '\n   B: ' + pb.slice(k - 200, k + 200);
  }
  console.log(`  #${i + 1}  ${(a[i].length / 1e3).toFixed(0)} kB -> ${(b[i].length / 1e3).toFixed(0)} kB  ${same ? 'IGUAL' : 'DISTINTO' + where}`);
}
const [ca, cb] = [loadCss(fileA), loadCss(fileB)];
console.log(`CSS: ${(ca.length / 1e3).toFixed(0)} kB / ${(cb.length / 1e3).toFixed(0)} kB  ${ca === cb ? 'IGUAL' : 'DISTINTO'}`);
ok = ok && ca === cb;
console.log(ok ? 'OK: el código es el mismo' : 'FALLO');
process.exit(ok ? 0 : 1);
