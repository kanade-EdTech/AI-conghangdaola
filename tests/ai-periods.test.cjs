const test=require('node:test'),assert=require('node:assert/strict'),ai=require('../src/ai/core.js');
async function setup(){const {prepareCatalog}=await import('../scripts/ai-catalog.mjs');return ai.createEngine(await prepareCatalog());}
test('four periods partition every builtin model exactly once, and combine with provider and search',async()=>{
 const e=await setup(),s=e.initial(),counts={'2025-h1':17,'2025-h2':13,'2026-h1':15,'2026-h2':22},all=[];
 for(const [period,count] of Object.entries(counts)){const ids=e.visible(e.setFilters(s,'llm',{period}),'llm');assert.equal(ids.length,count);all.push(...ids);}
 assert.equal(new Set(all).size,67);assert.deepEqual(new Set(all),new Set(e.visible(s,'llm')));
 const filtered=e.setFilters(s,'llm',{period:'2025-h1',provider:'openai',search:'GPT-4'});
 assert.deepEqual(e.visible(filtered,'llm'),['builtin:llm:openai:gpt-4o','builtin:llm:openai:gpt-4.1','builtin:llm:openai:gpt-4o-mini','builtin:llm:openai:gpt-4.1-mini']);
 assert.equal(e.visible(e.setFilters(s,'app',{period:'2025-h1'}),'app').length,23);
});
test('filtered period ordering and clearing preserve hidden models and latest peer order',async()=>{
 const e=await setup();let s=e.initial();const ids=e.items(s,'llm'),a=ids.filter(v=>v.archivePeriod==='2025-h1').slice(0,2).map(v=>v.id),hidden=ids.find(v=>v.archivePeriod==='2026-h2').id;
 for(const id of [a[0],hidden,a[1]])s=e.move(s,'llm',id,'hang');
 s=e.setFilters(s,'llm',{period:'2025-h1'});s=e.move(s,'llm',a[1],'hang',0);
 assert.deepEqual(s.boards.llm.tiers.hang,[a[1],hidden,a[0]]);
 const cleared=e.clear(s,'llm');assert.deepEqual(cleared.boards.llm.tiers.hang,[hidden]);
 const all=e.setFilters(s,'llm',{});assert.deepEqual(all.boards.llm.tiers.hang,[a[1],hidden,a[0]]);e.validate(all);
});
test('old drafts normalize missing period without losing placements, new period persists',async()=>{
 const e=await setup();let s=e.initial();const id=s.boards.llm.unranked[0];s=e.move(s,'llm',id,'hang');delete s.filters.app.period;delete s.filters.llm.period;
 const restored=e.reconcile(s);assert.equal(restored.filters.llm.period,'all');assert.deepEqual(restored.boards.llm.tiers.hang,[id]);
 const selected=e.setFilters(restored,'llm',{period:'2026-h2'});assert.equal(e.reconcile(JSON.parse(JSON.stringify(selected))).filters.llm.period,'2026-h2');
 assert.throws(()=>e.setFilters(s,'llm',{period:'2027-h1'}),/发布时段/);
});
test('custom model period supports add/edit/undo and unassigned filter',async()=>{
 const e=await setup(),s=e.initial(),r=e.custom(s,'llm',{name:'我的模型',archivePeriod:'2026-h2'});
 assert.ok(e.visible(e.setFilters(r.state,'llm',{period:'2026-h2'}),'llm').includes(r.id));
 const snapshot=e.snapshot(r.state,'llm'),edited=e.custom(r.state,'llm',{name:'我的模型'},r.id).state;
 assert.deepEqual(e.visible(e.setFilters(edited,'llm',{period:'unknown'}),'llm'),[r.id]);assert.equal(e.get(e.restore(edited,'llm',snapshot),r.id).archivePeriod,'2026-h2');
 assert.throws(()=>e.custom(s,'llm',{name:'错误分期',archivePeriod:'2027-h1'}));
});
