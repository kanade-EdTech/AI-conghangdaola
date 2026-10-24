import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {root} from './ai-catalog.mjs';
const selected=process.argv[2];if(selected && !['toy','xhs'].includes(selected))throw Error('Use ai-check.mjs [toy|xhs]');
// Use the parser already bundled with the current Node runtime, without npm installs.
const parserSource=process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'];
let parser=null;
if(parserSource){const scope={exports:{}};vm.runInNewContext(parserSource,scope);parser=scope.acorn || scope.exports;if(typeof parser.parse!=='function')throw Error('Bundled syntax parser unavailable');}
else console.warn('WARN: Node has no bundled Acorn parser; ES2017 parse gate unavailable in this runtime');
async function list(dir,prefix=''){let files=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=prefix+e.name;if(e.isDirectory())files=files.concat(await list(path.join(dir,e.name),p+'/'));else files.push(p);}return files.sort();}
for(const platform of selected?[selected]:['toy','xhs']){
 const manifest=JSON.parse(await readFile(path.join(root,'output','ai-build-'+platform+'.json'),'utf8')),dir=path.join(root,'dist',platform),files=await list(dir);
 if(JSON.stringify(files)!==JSON.stringify(manifest.files))throw Error('Build file list mismatch');
 let size=0,scriptText='';
 for(const file of files){
  const bytes=await readFile(path.join(dir,file));size+=bytes.length;
  if(createHash('sha256').update(bytes).digest('hex')!==manifest.hashes[file])throw Error('Stale or modified build: '+file);
  if(/\.(js|html|css)$/.test(file)){
   const text=bytes.toString('utf8');
   if(/RA2|ra2-tier-list|43912508997632|ra2-conghangdaola|磁暴|红警|尤复/.test(text))throw Error('Legacy game content in '+file);
   if(file.endsWith('.js')){new vm.Script(text,{filename:file});if(parser)parser.parse(text,{ecmaVersion:2017,sourceType:'script'});scriptText+=text+'\n';}
   if(platform==='xhs' && /\b(fetch|XMLHttpRequest|WebSocket|EventSource|Worker|SharedWorker|WebAssembly)\b|window\.open|\.clipboard\b|createObjectURL|\.download\s*=|\beval\s*\(|new\s+Function\s*\(/.test(text))throw Error('Prohibited mini-tool capability in '+file);
   if(file.endsWith('.html')){
    if(/<(?:iframe|object|base)\b|\son\w+\s*=|javascript:|type="module"/i.test(text))throw Error('Unsupported HTML');
    for(const match of text.matchAll(/(?:src|href)="([^"]+)"/g)){const ref=match[1];if(!ref.startsWith('./') || !files.includes(ref.slice(2)))throw Error('Invalid resource '+ref);}
   }
   if(/\?\.|\?\?|\bstructuredClone\s*\(|\.replaceAll\s*\(|\.at\s*\(/.test(text))throw Error('Unsupported baseline syntax/API: '+file);
  }
 }
 const context=vm.createContext({window:{}});
 for(const f of ['core.js','catalog.js','config.js'])vm.runInContext(await readFile(path.join(dir,f),'utf8'),context);
 const ai=context.window.AITier;ai.createEngine(ai.catalogData).validate(ai.createEngine(ai.catalogData).initial());
 if(manifest.demo!==ai.catalogData.demo)throw Error('Demo label mismatch');
 if(size>2*1024*1024)console.warn('WARN: uncompressed build exceeds project 2MiB target');
 console.log('PASS '+platform+': '+files.length+' files, '+size+' unpacked bytes, hashes/resources/isolation/capabilities/core validated'+(parser?', ES2017 parsed':''));
}
