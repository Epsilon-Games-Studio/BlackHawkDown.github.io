// Comprueba que dos builds del juego hacen EXACTAMENTE lo mismo: compara el árbol sintáctico
// (AST) de cada <script> en línea, ignorando comentarios, espacios, comillas y formato.
// Si sale "IGUAL", el código que corre es el mismo aunque el texto sea distinto.
//
//   node tools/verify.mjs viejo.html dist/index.html
//
// Necesita acorn (npm i acorn) o la variable ACORN con la ruta a su carpeta.
import fs from 'fs';
const acorn = await import(process.env.ACORN ? process.env.ACORN + '/dist/acorn.mjs' : 'acorn');

const scripts = f => [...fs.readFileSync(f, 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
function norm(node){
  if (Array.isArray(node)) return node.map(norm);
  if (!node || typeof node !== 'object') return node;
  const o = {};
  for (const k of Object.keys(node)){
    if (k === 'start' || k === 'end' || k === 'loc' || k === 'range' || k === 'raw') continue;
    o[k] = norm(node[k]);
  }
  if (node.type === 'Literal' && node.regex) o.value = String(node.value);
  if (node.type === 'Literal' && typeof node.value === 'bigint') o.value = String(node.value);
  if (node.type === 'Property' && !node.computed){   // {t:1} y {"t":1} son lo mismo
    o.key = { k: node.key.type === 'Identifier' ? node.key.name : String(node.key.value) };
  }
  // dentro de las plantillas van los shaders GLSL: sus comentarios // y /* */ no cuentan
  if (node.type === 'TemplateElement') o.value = { cooked: String(node.value.cooked).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '') };
  return o;
}
const [a, b] = process.argv.slice(2).map(scripts);
let ok = a.length === b.length;
console.log(`scripts en línea: ${a.length} / ${b.length}`);
for (let i = 0; i < Math.min(a.length, b.length); i++){
  const pa = JSON.stringify(norm(acorn.parse(a[i], { ecmaVersion:'latest' })));
  const pb = JSON.stringify(norm(acorn.parse(b[i], { ecmaVersion:'latest' })));
  const same = pa === pb; ok = ok && same;
  let where = '';
  if (!same){ let k = 0; while (pa[k] === pb[k]) k++; where = '\n   A: ' + pa.slice(k - 200, k + 200) + '\n   B: ' + pb.slice(k - 200, k + 200); }
  console.log(`  #${i + 1}  ${(a[i].length/1e3).toFixed(0)} kB -> ${(b[i].length/1e3).toFixed(0)} kB  ${same ? 'IGUAL' : 'DISTINTO' + where}`);
}
// El CSS no tiene AST aquí: lo comparo normalizado (sin comentarios ni espacios, 0.5 = .5, comillas iguales)
const css = f => [...fs.readFileSync(f, 'utf8').matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^\w.])\.(\d)/g, '$10.$2').replace(/"/g, "'")
  .replace(/\s+/g, '').replace(/;}/g, '}').toLowerCase();
const [ca, cb] = process.argv.slice(2).map(css);
console.log(`CSS: ${(ca.length/1e3).toFixed(0)} kB / ${(cb.length/1e3).toFixed(0)} kB  ${ca === cb ? 'IGUAL' : 'DISTINTO'}`);
ok = ok && ca === cb;
console.log(ok ? 'OK: el código es el mismo' : 'FALLO');
process.exit(ok ? 0 : 1);
