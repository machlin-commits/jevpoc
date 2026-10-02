import * as icons from '../frontend/node_modules/simple-icons/index.mjs';
import fs from 'node:fs';
import * as modern from '../frontend/node_modules/simple-icons-modern/index.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../shared/catalog.json',import.meta.url)));
const bySlug=Object.fromEntries([...Object.values(icons),...Object.values(modern)].map(i=>[i.slug,i]));
const paths={}; const missing=[];
for(const tech of catalog){const icon=bySlug[tech.slug];if(!icon){if(['llamaindex','pinecone','weaviate','chroma'].includes(tech.slug)){if(tech.slug==='llamaindex'){const svg=fs.readFileSync(new URL('../frontend/node_modules/@lobehub/icons-static-svg/icons/llamaindex.svg',import.meta.url),'utf8');paths[tech.slug]={path:svg.match(/<path d="([^"]+)"/)[1],hex:'111111'};}else if(!fs.existsSync(new URL(`../frontend/public/logos/${tech.slug}.svg`,import.meta.url))){missing.push(tech.slug)}continue;}missing.push(tech.slug);continue}tech.hex=tech.slug==='microsoft'?'#0078D4':'#'+icon.hex;paths[tech.slug]={path:icon.path,hex:icon.hex};}
if(missing.length){console.error('Missing icons:',[...new Set(missing)].join(', '));process.exit(1)}
fs.writeFileSync(new URL('../frontend/src/logo-paths.json',import.meta.url),JSON.stringify(paths));
fs.writeFileSync(new URL('../shared/catalog.json',import.meta.url),JSON.stringify(catalog,null,2)+'\n');
console.log('Exported',Object.keys(paths).length,'official brand SVG paths for',catalog.length,'entries');
