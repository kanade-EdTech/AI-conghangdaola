"""Read the user's completed CSV pack and create lossless local icon links."""
from pathlib import Path
import csv,hashlib,json,re,sys,shutil

root=Path(__file__).resolve().parent.parent
source=Path(sys.argv[1]).resolve()
csv_files=list(source.glob('*.csv'))
if len(csv_files)!=1:raise ValueError('Expected one authoritative model CSV')
csv_bytes=csv_files[0].read_bytes()
rows=list(csv.DictReader(csv_files[0].open(encoding='utf-8-sig',newline='')))
source_manifest=json.loads((source/'manifest.json').read_text(encoding='utf-8'))
date=source_manifest.get('date','2026-10-22')
icons_dir=root/'assets/ai-icons';icons_dir.mkdir(parents=True,exist_ok=True)
manifest_file=icons_dir/'manifest.json';links_file=root/'data/ai-image-links.json';catalog_file=root/'data/llm-models.json'
manifest=json.loads(manifest_file.read_text(encoding='utf-8')) if manifest_file.exists() else {'schemaVersion':1,'icons':[]}
links=json.loads(links_file.read_text(encoding='utf-8')) if links_file.exists() else {'schemaVersion':1,'items':{},'families':{},'providers':{}}
if catalog_file.exists():
 old=json.loads(catalog_file.read_text(encoding='utf-8'))
 if old.get('importOrigin',{}).get('adapter')!='llm-image-pack':raise ValueError('Existing LLM catalog belongs to another editor; no overwrite')
existing={entry['key']:entry for entry in manifest['icons']}
models=[];providers={};seen=set();copied={};mapping={}
periods={'2025年上半年':'2025-h1','2025年下半年':'2025-h2','2026年上半年':'2026-h1','2026年下半年':'2026-h2'}
for record in rows:
 if record.get('archive_period') not in periods:raise ValueError('Missing or unsupported archive period')
 model_id=record['model_id'];identifier='builtin:llm:'+model_id.replace('/',':')
 if not re.fullmatch(r'builtin:llm:[a-zA-Z0-9._:-]{1,120}',identifier) or identifier in seen:raise ValueError('Invalid or duplicate model ID: '+model_id)
 seen.add(identifier)
 image_source=(source/record['icon_file']).resolve()
 if not image_source.is_relative_to(source):raise ValueError('Source icon path escapes pack')
 image=image_source.read_bytes();digest=hashlib.sha256(image).hexdigest()
 if digest!=record['icon_sha256']:raise ValueError('Icon checksum mismatch: '+model_id)
 if image[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('Expected PNG')
 image_key='llm-'+image_source.stem.lower()
 if not re.fullmatch(r'[a-z0-9-]+',image_key):raise ValueError('Unsafe icon key')
 relative='assets/ai-icons/'+image_key+'.png';destination=root/relative
 if destination.exists() and destination.read_bytes()!=image:raise ValueError('Conflicting existing asset: '+relative)
 entry={'key':image_key,'path':relative,'source':record['icon_source'],'acquiredAt':date,'sha256':digest,'usageNotes':'LobeHub family/company icon, shared across model versions. MIT; license retained.','sourcePackFile':record['icon_file']}
 if image_key in existing and existing[image_key]['sha256']!=digest:raise ValueError('Manifest collision: '+image_key)
 copied[relative]=image;existing[image_key]=entry;mapping[identifier]=image_key
 provider=model_id.split('/')[0]
 if provider in providers and providers[provider]!=record['company']:raise ValueError('Provider display conflict')
 providers[provider]=record['company']
 models.append({'id':identifier,'kind':'llm','name':record['model_name'],'aliases':[model_id],'providerId':provider,'providerName':record['company'],'categoryIds':[],
   'subtitle':record['archive_period'],'archivePeriod':periods[record['archive_period']],'familyId':image_key,'iconKey':image_key,'modelIdentity':{'modelId':model_id,'service':'OpenRouter'},
   'lifecycle':'unknown','sources':[record['model_source']],'verifiedAt':date})
catalog={'catalogRevision':'llm-pack-'+hashlib.sha256(csv_bytes).hexdigest()[:16],'verifiedAt':date,'providers':providers,'categories':{},'items':models,
 'importOrigin':{'adapter':'llm-image-pack','source':str(source),'csv':csv_files[0].name,'csvSha256':hashlib.sha256(csv_bytes).hexdigest(),'modelCount':len(models),'uniqueIconCount':len(copied),
 'note':'CSV and actual icon files are authoritative. Source pack is read-only for this importer.'}}
# All source checks complete before writing runtime inputs.
for relative,image in copied.items():(root/relative).write_bytes(image)
manifest['icons']=list(existing.values());links.setdefault('items',{}).update(mapping)
for file,value in [(manifest_file,manifest),(links_file,links),(catalog_file,catalog)]:file.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
shutil.copyfile(source/'LobeHub-Icons-LICENSE.txt',icons_dir/'LobeHub-Icons-LICENSE.txt')
report=dict(catalog['importOrigin'],linked=len(mapping),sourceManifestModelCount=source_manifest.get('model_count'))
(root/'output/ai-llm-import-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
lines=['# LLM 模型图片链接','',f'{len(models)} 款模型关联 {len(copied)} 张共享 PNG，条目和图片均来自用户提供的资料包。','',
 '前端与海报使用下列相同文件。导入器只读原资料包，按 CSV 逐条核对图片及哈希，不依赖 manifest 的汇总款数。','',
 '| 模型 | 品牌/企业 | 本地图片 |','| --- | --- | --- |']
for model in models:
 relative=existing[mapping[model['id']]]['path']
 lines.append('| '+model['name'].replace('|',' / ')+' | '+model['providerName'].replace('|',' / ')+' | [查看图片](../'+relative+') |')
lines.extend(['','映射文件：`data/ai-image-links.json`；图标清单：`assets/ai-icons/manifest.json`。','模型是独立条目，同品牌共用图标不合并排名。App 名单由独立资料包导入。',''])
(root/'docs/AI-LLM图片链接.md').write_text('\n'.join(lines),encoding='utf-8')
print('Imported',len(models),'models, linked',len(mapping),'icons, stored',len(copied),'unique PNG files; source pack unchanged')
