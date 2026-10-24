const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const core=require('../src/ai/core.js'),fixture=require('./fixtures/ai.catalog.json');
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
async function setup(t){
 const base=path.resolve(__dirname,'../output');await fs.mkdir(base,{recursive:true});const root=await fs.mkdtemp(path.join(base,'ai-image-test-'));
 t.after(async()=>{assert.ok(root.startsWith(base+path.sep));await fs.rm(root,{recursive:true,force:true});});
 await fs.mkdir(path.join(root,'assets/ai-icons'),{recursive:true});await fs.mkdir(path.join(root,'data'));
 await fs.writeFile(path.join(root,'assets/ai-icons/shared.png'),pixel);
 const manifest={icons:[{key:'shared',path:'assets/ai-icons/shared.png',source:'test fixture',acquiredAt:'2026-10-23'}]};
 const write=async(links,customManifest=manifest)=>{await fs.writeFile(path.join(root,'assets/ai-icons/manifest.json'),JSON.stringify(customManifest));await fs.writeFile(path.join(root,'data/ai-image-links.json'),JSON.stringify(links));};
 return {root,write,manifest};
}
test('direct image mapping overrides builtin key, family and provider without changing input',async t=>{
 const {root,write}=await setup(t),{attachImageLinks,imageLinkReport}=await import('../scripts/ai-image-links.mjs');
 const catalog=core.clone(fixture);catalog.items[0].iconKey='not-used';catalog.items[0].familyId='family';
 await write({items:{[catalog.items[0].id]:'shared'},families:{family:'shared'},providers:{'demo-a':'shared'}});
 const next=await attachImageLinks(catalog,{root});assert.equal(next.items[0].iconKey,'shared');assert.equal(catalog.items[0].iconKey,'not-used');assert.equal(next.icons.shared,'./assets/ai-icons/shared.png');assert.equal(imageLinkReport(next).linked,30);
});
test('family links and provider links allow shared physical file across model versions',async t=>{
 const {root,write}=await setup(t),{attachImageLinks}=await import('../scripts/ai-image-links.mjs'),catalog=core.clone(fixture);
 catalog.items[0].familyId='family';await write({families:{family:'shared'},providers:{'demo-b':'shared'}});
 const next=await attachImageLinks(catalog,{root});assert.equal(next.items[0].iconKey,'shared');assert.equal(next.items[1].iconKey,'shared');assert.equal(Object.keys(next.icons).length,1);
});
test('missing key/file and mismatched SHA are explicit build failures',async t=>{
 const {root,write,manifest}=await setup(t),{attachImageLinks}=await import('../scripts/ai-image-links.mjs');
 await write({providers:{'demo-a':'missing'}});await assert.rejects(attachImageLinks(fixture,{root}),/不存在/);
 await write({}, {icons:[Object.assign({},manifest.icons[0],{sha256:'0'.repeat(64)})]});await assert.rejects(attachImageLinks(fixture,{root}),/哈希/);
 await write({}, {icons:[Object.assign({},manifest.icons[0],{path:'assets/ai-icons/absent.png'})]});await assert.rejects(attachImageLinks(fixture,{root}),/ENOENT/);
});
test('external paths, traversal, duplicate keys and fake image bytes rejected',async t=>{
 const {root,write,manifest}=await setup(t),{attachImageLinks}=await import('../scripts/ai-image-links.mjs');
 for(const value of ['https://example.test/icon.png','assets/ai-icons/../../private.png']){await write({}, {icons:[Object.assign({},manifest.icons[0],{path:value})]});await assert.rejects(attachImageLinks(fixture,{root}));}
 await write({}, {icons:manifest.icons.concat(manifest.icons)});await assert.rejects(attachImageLinks(fixture,{root}),/重复/);
 await fs.writeFile(path.join(root,'assets/ai-icons/shared.png'),'not a PNG');await write({});await assert.rejects(attachImageLinks(fixture,{root}),/格式/);
});
test('unmapped items stay unlinked instead of borrowing an unrelated brand icon',async t=>{
 const {root,write}=await setup(t),{attachImageLinks,imageLinkReport}=await import('../scripts/ai-image-links.mjs');await write({});const next=await attachImageLinks(fixture,{root});const report=imageLinkReport(next);assert.equal(report.linked,0);assert.equal(report.missing,60);assert.deepEqual(next.icons,{});
});
test('actual catalogs have 67 linked models and 23 linked Apps with no fixture boards',async()=>{
 const {prepareCatalog}=await import('../scripts/ai-catalog.mjs'),catalog=await prepareCatalog({demo:true});
 const models=catalog.items.filter(item=>item.kind==='llm');assert.equal(models.length,67);assert.equal(new Set(models.map(item=>item.id)).size,67);assert.equal(new Set(models.map(item=>item.iconKey)).size,15);assert.ok(models.every(item=>item.iconKey && catalog.icons[item.iconKey].startsWith('./assets/ai-icons/')));assert.deepEqual(catalog.demoKinds,[]);
 const apps=catalog.items.filter(item=>item.kind==='app');assert.equal(apps.length,23);assert.equal(new Set(apps.map(item=>item.id)).size,23);assert.ok(apps.every(item=>item.iconKey && catalog.icons[item.iconKey].startsWith('./assets/ai-icons/')));
 const studio=apps.find(item=>item.id==='builtin:app:web:qwen-studio');assert.equal(studio.name,'Qwen Studio');assert.notEqual(studio.id,apps.find(item=>item.name==='千问').id);assert.equal(studio.iconKey,models.find(item=>item.providerId==='qwen').iconKey);
});
test('real catalogs preserve custom rankings and archive prior fixture placements',async()=>{
 const {prepareCatalog}=await import('../scripts/ai-catalog.mjs'),catalog=await prepareCatalog({demo:true}),old=core.createEngine(fixture),next=core.createEngine(catalog);
 let state=old.initial();state=old.move(state,'llm','builtin:llm:example-01','hang');const custom=old.custom(state,'llm',{name:'我的本地模型'});state=old.move(custom.state,'llm',custom.id,'top');const merged=next.reconcile(state);assert.deepEqual(merged.boards.llm.tiers.top,[custom.id]);assert.equal(merged.boards.app.unavailablePlacements.find(item=>item.id==='builtin:llm:example-01'),undefined);assert.equal(merged.boards.llm.unavailablePlacements.find(item=>item.id==='builtin:llm:example-01').location,'hang');assert.equal(merged.boards.app.unranked.length,23);assert.equal(merged.boards.app.unavailablePlacements.length,48);next.validate(merged);
});

test('renaming the model board migrates only the old default title and preserves rankings',async()=>{
 const {prepareCatalog}=await import('../scripts/ai-catalog.mjs'),engine=core.createEngine(await prepareCatalog()),id='builtin:llm:openai:gpt-4o';
 let state=engine.move(engine.initial(),'llm',id,'hang');state.boards.llm.title='LLM 模型 从夯到拉';
 const next=engine.reconcile(state);assert.equal(next.boards.llm.title,'语言模型 从夯到拉');assert.deepEqual(next.boards.llm.tiers.hang,[id]);
 state.boards.llm.title='我的 LLM 模型体验';assert.equal(engine.reconcile(state).boards.llm.title,state.boards.llm.title);
});
