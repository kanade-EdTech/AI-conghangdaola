import {mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {root,prepareCatalog} from './ai-catalog.mjs';
import {imageLinkReport} from './ai-image-links.mjs';
const args=process.argv.slice(2),demo=args.includes('--demo'),requested=args.find(a=>!a.startsWith('--'));
if(args.some(a=>a.startsWith('--') && a!=='--demo') || requested && !['toy','xhs'].includes(requested))throw Error('Usage: ai-build.mjs [toy|xhs] [--demo]');
const catalog=await prepareCatalog({demo}),project=JSON.parse(await readFile(path.join(root,'ai-project.json'),'utf8'));
if(project.applicationId!=='ai-tier-list')throw Error('Wrong project identity');
await mkdir(path.join(root,'output'),{recursive:true});
for(const platform of requested?[requested]:['toy','xhs']){
 const version=project.platforms[platform][demo?'previewVersion':'version'];
 if(!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?$/.test(version))throw Error('Invalid platform version');
 const target=path.resolve(root,'dist',platform),allowed=path.resolve(root,'dist')+path.sep;
 if(!target.startsWith(allowed))throw Error('Unsafe build directory');
 await rm(target,{recursive:true,force:true});await mkdir(path.join(target,'interaction'),{recursive:true});
 const files=['index.html','style.css','core.js','storage.js','poster.js','app.js','interaction/session.js','interaction/hit-test.js','interaction/input.js','interaction/drag.js'];
 for(const file of files)await copyFile(path.join(root,'src/ai',file),path.join(target,file));
 await copyFile(path.join(root,'src/ai/platforms',platform+'.js'),path.join(target,'platform.js'));files.push('platform.js');
 const emitted=JSON.parse(JSON.stringify(catalog)),hashes=new Map(),assetFiles=[];
 for(const [key,relative] of Object.entries(catalog.icons || {})){
   const bytes=await readFile(path.join(root,relative)),hash=createHash('sha256').update(bytes).digest('hex');
   if(hashes.has(hash))emitted.icons[key]=hashes.get(hash);
   else {hashes.set(hash,relative);const dest=path.join(target,relative);await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,bytes);assetFiles.push(relative.replace(/^\.\//,''));}
 }
 let license='';
 if(assetFiles.length){
  try{license='/* Asset notice:\n'+(await readFile(path.join(root,'assets/ai-icons/LobeHub-Icons-LICENSE.txt'),'utf8')).replace(/\*\//g,'* /')+'\n*/\n';}catch(error){if(error.code!=='ENOENT')throw error;}
 }
 await writeFile(path.join(target,'catalog.js'),license+'window.AITier.catalogData='+JSON.stringify(emitted)+';\n');files.push('catalog.js');
 await writeFile(path.join(target,'config.js'),'window.AITier.config='+JSON.stringify({applicationId:'ai-tier-list',platform,version,demo:catalog.demo})+';\n');files.push('config.js');files.push(...assetFiles);
 const manifest={applicationId:'ai-tier-list',platform,version,demo:catalog.demo,catalogRevision:catalog.catalogRevision,verifiedAt:catalog.verifiedAt,counts:{app:catalog.items.filter(i=>i.kind==='app').length,llm:catalog.items.filter(i=>i.kind==='llm').length},files:files.sort(),hashes:{}};
 for(const file of manifest.files)manifest.hashes[file]=createHash('sha256').update(await readFile(path.join(target,file))).digest('hex');
 await writeFile(path.join(root,'output','ai-build-'+platform+'.json'),JSON.stringify(manifest,null,2));
 await writeFile(path.join(root,'output','ai-image-links-'+platform+'.json'),JSON.stringify(imageLinkReport(emitted),null,2));
 const imageReport=imageLinkReport(emitted);
 console.log('Images: LLM '+imageReport.boards.llm.linked+'/'+imageReport.boards.llm.total+', App '+imageReport.boards.app.linked+'/'+imageReport.boards.app.total+'; details: output/ai-image-links-'+platform+'.json');
 console.log('Built AI '+platform+' '+version+' ('+(emitted.demo?'development preview; fixture boards: '+emitted.demoKinds.join(', '):'real catalog')+')');
}
