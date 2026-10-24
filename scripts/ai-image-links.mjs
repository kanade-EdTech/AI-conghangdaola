import {readFile, realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const validKey=key=>typeof key==='string' && /^[a-zA-Z0-9._:-]{1,120}$/.test(key) && !['__proto__','prototype','constructor'].includes(key);
async function readOptional(file,fallback){
  try{return JSON.parse(await readFile(file,'utf8'));}
  catch(error){if(error.code==='ENOENT')return fallback;throw error;}
}

export async function attachImageLinks(input,{root}){
  const catalog=JSON.parse(JSON.stringify(input));
  const manifest=await readOptional(path.join(root,'assets/ai-icons/manifest.json'),{icons:[]});
  const links=await readOptional(path.join(root,'data/ai-image-links.json'),{});
  for(const field of ['items','families','providers']){
    if(links[field]!==undefined && (!links[field] || typeof links[field]!=='object' || Array.isArray(links[field])))throw Error('图片链接 '+field+' 必须为对象');
    for(const [key,value] of Object.entries(links[field] || {}))if(!validKey(key) || !validKey(value))throw Error('无效图片映射：'+key);
  }
  const icons=Object.create(null);
  const entries=Array.isArray(manifest.icons)?manifest.icons:Object.entries(manifest.icons || {}).map(([key,value])=>Object.assign({key},typeof value==='string'?{path:value}:value));
  for(const entry of entries){
    if(!validKey(entry.key) || typeof entry.path!=='string' || own(icons,entry.key))throw Error('图标键缺失、无效或重复');
    const relative=entry.path.replace(/^\.\//,'').replace(/\\/g,'/');
    if(!/^assets\/ai-icons\/[a-zA-Z0-9_./-]+\.(png|webp|jpg|jpeg)$/.test(relative) || relative.split('/').includes('..'))throw Error('图标必须是assets/ai-icons内的相对栅格图片');
    if(typeof entry.source!=='string' || !entry.source.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(entry.acquiredAt || ''))throw Error('图标需记录source和acquiredAt');
    const base=await realpath(path.join(root,'assets/ai-icons')),actual=await realpath(path.join(root,relative));
    if(!actual.startsWith(base+path.sep))throw Error('图片实际路径越界：'+entry.key);
    const bytes=await readFile(actual),hash=createHash('sha256').update(bytes).digest('hex');
    if(entry.sha256 && String(entry.sha256).toLowerCase()!==hash)throw Error('图片哈希不匹配：'+entry.key);
    const extension=path.extname(relative).toLowerCase();
    const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpeg=bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
    const webp=bytes.subarray(0,4).toString()==='RIFF' && bytes.subarray(8,12).toString()==='WEBP';
    if(!(extension==='.png'?png:extension==='.webp'?webp:jpeg))throw Error('图片格式与扩展名不符：'+entry.key);
    icons[entry.key]='./'+relative;
  }
  for(const field of ['items','families','providers'])for(const key of Object.values(links[field] || {}))if(!own(icons,key))throw Error('图片映射引用了不存在的图标：'+key);
  catalog.icons={};
  for(const item of catalog.items){
    const direct=own(links.items || {},item.id)?links.items[item.id]:null;
    const family=item.familyId && own(links.families || {},item.familyId)?links.families[item.familyId]:null;
    const provider=item.providerId && own(links.providers || {},item.providerId)?links.providers[item.providerId]:null;
    const iconKey=direct || item.iconKey || family || provider || null;
    if(iconKey && !own(icons,iconKey))throw Error('条目图片不存在：'+item.id+' → '+iconKey);
    item.iconKey=iconKey;
    if(iconKey)catalog.icons[iconKey]=icons[iconKey];
  }
  return catalog;
}

export function imageLinkReport(catalog){
  const items=catalog.items.map(item=>({id:item.id,kind:item.kind,name:item.name,iconKey:item.iconKey || null,path:item.iconKey?catalog.icons[item.iconKey]:null}));
  const boards={};for(const kind of ['app','llm']){const entries=items.filter(item=>item.kind===kind);boards[kind]={total:entries.length,linked:entries.filter(item=>item.path).length,missing:entries.filter(item=>!item.path).length};}
  return {catalogRevision:catalog.catalogRevision,demo:catalog.demo,total:items.length,linked:items.filter(item=>item.path).length,missing:items.filter(item=>!item.path).length,boards,items};
}
