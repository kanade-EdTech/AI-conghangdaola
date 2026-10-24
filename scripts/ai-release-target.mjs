// Read-only release guard. No network calls, credentials, git mutations or uploads.
import {readFile} from 'node:fs/promises';
import {root} from './ai-catalog.mjs';
import path from 'node:path';
export function assertReleaseTarget(config,platform){
 if(config.applicationId!=='ai-tier-list')throw Error('AI application identity required');
 if(platform==='toy'){
  const target=config.platforms && config.platforms.toy;
  if(!target || !/^\d+$/.test(String(target.id || '')) || !/^[a-zA-Z0-9_-]+$/.test(target.slug || ''))throw Error('新AI Toy ID/slug尚未配置，禁止发布');
  if(String(target.id)==='43912508997632' || target.slug==='ra2-conghangdaola')throw Error('禁止覆盖红警Toy作品');
  return target;
 }
 if(platform==='github'){
  if(typeof config.githubRepository!=='string' || !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/.test(config.githubRepository))throw Error('新AI仓库尚未配置，禁止推送');
  if(/\/ra2-conghangdaola(?:\.git)?$/i.test(config.githubRepository))throw Error('禁止覆盖红警GitHub仓库');
  return config.githubRepository;
 }
 throw Error('Unknown release target');
}
if(process.argv[1] && path.resolve(process.argv[1])===path.resolve(root,'scripts/ai-release-target.mjs')){
 const config=JSON.parse(await readFile(path.join(root,'ai-project.json'),'utf8'));
 try{assertReleaseTarget(config,process.argv[2] || 'toy');console.log('Target configured; publishing still requires explicit authorization');}catch(error){console.error(error.message);process.exitCode=1;}
}
