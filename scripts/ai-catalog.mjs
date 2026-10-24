import {readFile, access} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {attachImageLinks} from './ai-image-links.mjs';
const require=createRequire(import.meta.url),core=require('../src/ai/core.js');
export const root=fileURLToPath(new URL('../',import.meta.url));
async function exists(file){try{await access(file);return true;}catch{return false;}}
export async function prepareCatalog({demo=false,fixtureOnly=false}={}){
  if(fixtureOnly && !demo)throw Error('fixtureOnly requires demo mode');
  const names=['ai-apps.json','llm-models.json'],kinds=['app','llm'],present=fixtureOnly?[false,false]:await Promise.all(names.map(n=>exists(path.join(root,'data',n))));
  let catalog;
  if(demo){
    catalog=JSON.parse(await readFile(path.join(root,'tests/fixtures/ai.catalog.json'),'utf8'));
    catalog.demoKinds=kinds.slice();
  }else{
    if(!present.every(Boolean))throw Error('正式名单尚未齐备；开发预览请显式使用 --demo。不会替代或改写另一会话名单。');
    catalog={catalogRevision:'ai',verifiedAt:null,demo:false,demoKinds:[],items:[],providers:{},categories:{},icons:{}};
  }
  for(let index=0;index<names.length;index++){
    if(present[index]){
      const e=JSON.parse(await readFile(path.join(root,'data',names[index]),'utf8'));
      const items=Array.isArray(e)?e:e.items;if(!Array.isArray(items))throw Error(names[index]+' 应提供数组或items数组');
      if(!items.length || items.some(v=>v.kind!==kinds[index]))throw Error(names[index]+' 为空或存在错误榜单类型');
      if(items.some(v=>!v.verifiedAt || !Array.isArray(v.sources) || !v.sources.length || v.sources.some(source=>typeof source!=='string' || !/^https?:\/\//.test(source))))throw Error('正式内置条目必须附核验日期及来源URL，候选条目请先在名单侧处理。');
      catalog.items=catalog.items.filter(item=>item.kind!==kinds[index]);
      catalog.items.push(...items);
      catalog.demoKinds=catalog.demoKinds.filter(kind=>kind!==kinds[index]);
      catalog.catalogRevision+='|'+kinds[index]+':'+(e.catalogRevision || createHash('sha256').update(JSON.stringify(e)).digest('hex').slice(0,16));
      for(const field of ['providers','categories'])for(const [key,value] of Object.entries(e[field] || {})){
        if(['__proto__','constructor','prototype'].includes(key) || typeof value!=='string' || !value.trim() || value.length>100)throw Error('品牌/分类字典无效');
        if(Object.hasOwn(catalog[field],key) && catalog[field][key]!==value)throw Error('品牌/分类字典冲突：'+key);
        catalog[field][key]=value;
      }
    }
  }
  const overrideFile=path.join(root,'data/ai-catalog-overrides.json');
  if(!fixtureOnly && await exists(overrideFile)){
    const raw=await readFile(overrideFile,'utf8'),overrides=JSON.parse(raw),seen=new Set();
    if(overrides.schemaVersion!==1 || !Array.isArray(overrides.items))throw Error('目录修正格式无效');
    const allowed=['subtitle','aliases','sources','verifiedAt','archivePeriod','appIdentity'];
    for(const entry of overrides.items){
      if(!entry || typeof entry.id!=='string' || seen.has(entry.id) || !entry.patch || Array.isArray(entry.patch) || Object.keys(entry.patch).some(key=>!allowed.includes(key)))throw Error('目录修正条目无效');
      seen.add(entry.id);
      const item=catalog.items.find(v=>v.id===entry.id);
      if(!item){if(catalog.demoKinds.includes(entry.id.split(':')[1]))continue;throw Error('目录修正目标不存在：'+entry.id);}
      Object.assign(item,entry.patch);
      if(!item.verifiedAt || !Array.isArray(item.sources) || !item.sources.length || item.sources.some(source=>typeof source!=='string' || !/^https?:\/\//.test(source)))throw Error('目录修正来源无效');
    }
    for(const [provider,label] of Object.entries(overrides.providerLabels || {})){
      if(['__proto__','constructor','prototype'].includes(provider) || !Object.hasOwn(catalog.providers,provider) || typeof label!=='string' || !label.trim() || label.length>30)throw Error('品牌产品显示名称修正无效');
      catalog.providers[provider]=label;
      catalog.items.forEach(item=>{if(item.providerId===provider)item.providerName=label;});
    }
    catalog.catalogRevision+='|overrides:'+createHash('sha256').update(raw).digest('hex').slice(0,16);
  }
  catalog.demo=catalog.demoKinds.length>0;
  const verified=catalog.items.filter(v=>v.verifiedAt).map(v=>v.verifiedAt).sort();catalog.verifiedAt=verified[0] || null;
  catalog=await attachImageLinks(catalog,{root});
  core.createEngine(catalog).validate(core.createEngine(catalog).initial());
  for(const v of catalog.items)if(v.iconKey && !catalog.icons[v.iconKey])throw Error('图标引用不存在：'+v.iconKey);
  return catalog;
}
