(function (root) {
  'use strict';
  var api = {}, kinds = ['app', 'llm'];
  var tiers = ['hang', 'top', 'elite', 'npc', 'la'], locations = tiers.concat(['unranked']);
  var labels = { hang:'夯', top:'顶级', elite:'人上人', npc:'NPC', la:'拉', unranked:'待排名' };
  var periods = {'2025-h1':'2025 上半年','2025-h2':'2025 下半年','2026-h1':'2026 上半年','2026-h2':'2026 下半年'};
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  function fail(message) { throw new Error(message); }
  function text(value, max, required) {
    if (typeof value !== 'string') fail('字段必须是文字');
    value = value.trim();
    if ((required && !value) || Array.from(value).length > max) fail('文字长度不符合要求（最多 ' + max + ' 字）');
    return value;
  }
  function norm(value) { return String(value || '').replace(/[！-～]/g, function (c) { return String.fromCharCode(c.charCodeAt(0)-65248); }).replace(/\u3000/g,' ').trim().toLowerCase(); }
  function safeId(id, kind, prefix) {
    return typeof id === 'string' && /^(builtin|custom):(app|llm):[a-zA-Z0-9._:-]{1,120}$/.test(id) && id.indexOf('__proto__') === -1 && id.split(':')[1] === kind && (!prefix || id.indexOf(prefix + ':') === 0);
  }
  function item(raw, prefix) {
    if (!raw || kinds.indexOf(raw.kind) < 0 || !safeId(raw.id, raw.kind, prefix)) fail('条目 ID 或榜单类型无效');
    var next = { id:raw.id, kind:raw.kind, name:text(raw.name,40,true), subtitle:text(raw.subtitle || '',40,false), providerId:raw.providerId || null,
      providerName:text(raw.providerName || '',30,false), aliases:raw.aliases || [], categoryIds:raw.categoryIds || [], iconKey:raw.iconKey || null,
      familyId:raw.familyId || null, archivePeriod:raw.archivePeriod || null, lifecycle:raw.lifecycle || 'unknown', verifiedAt:raw.verifiedAt || null, sources:raw.sources || [] };
    if (next.archivePeriod !== null && (next.kind !== 'llm' || !own(periods,next.archivePeriod))) fail('模型发布时段无效');
    if (next.familyId !== null) text(next.familyId,120,true);
    if (next.providerId !== null) text(next.providerId,100,true);
    if (!Array.isArray(next.aliases) || next.aliases.length > 20 || !Array.isArray(next.categoryIds) || next.categoryIds.length > 12) fail('别名或分类无效');
    next.aliases = next.aliases.map(function (v) { return text(v,80,true); });
    next.categoryIds = next.categoryIds.map(function (v) { return text(v,60,true); });
    if (next.iconKey !== null) text(next.iconKey,100,true);
    if (['active','preview','deprecated','retired','unknown'].indexOf(next.lifecycle) < 0) fail('生命周期无效');
    if (next.verifiedAt !== null && (typeof next.verifiedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(next.verifiedAt))) fail('核验日期无效');
    if (!Array.isArray(next.sources) || next.sources.length > 20 || next.sources.some(function (v) { return typeof v !== 'string' || v.length > 2000; })) fail('来源无效');
    if (raw.modelIdentity) next.modelIdentity = clone(raw.modelIdentity);
    return next;
  }
  function blankFilters() { return { search:'', provider:'all', category:'all', source:'all', period:'all' }; }
  function filter(raw) {
    if (!raw || typeof raw !== 'object') fail('筛选无效');
    var next = { search:text(raw.search || '',100,false), provider:text(raw.provider || 'all',140,true), category:text(raw.category || 'all',60,true), source:raw.source || 'all' };
    next.period = raw.period || 'all';
    if (next.period !== 'all' && next.period !== 'unknown' && !own(periods,next.period)) fail('发布时段筛选无效');
    if (['all','builtin','custom'].indexOf(next.source) < 0) fail('来源筛选无效');
    return next;
  }
  function row(board, location) { return location === 'unranked' ? board.unranked : board.tiers[location]; }
  function engine(input) {
    if (!input || !Array.isArray(input.items) || input.items.length > 2000 || typeof input.catalogRevision !== 'string') fail('目录无效');
    var builtins = input.items.map(function (v) { return item(v,'builtin'); }), byId = Object.create(null);
    builtins.forEach(function (v) { if (own(byId,v.id)) fail('重复的内置 ID'); byId[v.id] = v; });
    var providers = input.providers || {}, categories = input.categories || {};
    function items(state, kind) { return builtins.filter(function (v) { return v.kind === kind; }).concat(Object.keys(state.customItems).map(function (id) { return state.customItems[id]; }).filter(function (v) { return v.kind === kind; })); }
    function get(state, id) { return byId[id] || (own(state.customItems,id) ? state.customItems[id] : null); }
    function providerKey(v) { return v.providerId || (v.providerName ? 'user:' + norm(v.providerName) : 'none'); }
    function providerName(v) { return v.providerName || (v.providerId && own(providers,v.providerId) ? providers[v.providerId] : v.providerId) || '未填写'; }
    function createBoard(kind) { var b = { title:(kind === 'app' ? 'AI App' : '语言模型') + ' 从夯到拉', tiers:{}, unranked:[], unavailablePlacements:[] }; tiers.forEach(function (t) { b.tiers[t] = []; }); return b; }
    function initial() {
      var s = { applicationId:'ai-tier-list', schemaVersion:1, catalogRevision:input.catalogRevision, activeBoard:'app', boards:{ app:createBoard('app'), llm:createBoard('llm') }, filters:{ app:blankFilters(), llm:blankFilters() }, customItems:{}, knownItems:{}, savedAt:null };
      builtins.forEach(function (v) { s.boards[v.kind].unranked.push(v.id); s.knownItems[v.id] = clone(v); }); return s;
    }
    function shape(s) {
      if (!s || s.applicationId !== 'ai-tier-list' || s.schemaVersion !== 1 || typeof s.catalogRevision !== 'string' || kinds.indexOf(s.activeBoard) < 0 || !s.boards || !s.filters || !s.customItems || Array.isArray(s.customItems)) fail('存档版本或应用身份不匹配');
      if (JSON.stringify(s).length > 2000000) fail('存档过大');
      if (s.knownItems && (typeof s.knownItems !== 'object' || Array.isArray(s.knownItems) || Object.keys(s.knownItems).length > 4000)) fail('条目快照无效');
      if (Object.keys(s.customItems).length > 100) fail('自定义条目过多');
      Object.keys(s.customItems).forEach(function (id) { var v = item(s.customItems[id],'custom'); if (v.id !== id) fail('自定义 ID 不匹配'); });
      kinds.forEach(function (k) {
        if (Object.keys(s.customItems).filter(function (id) { return s.customItems[id].kind === k; }).length > 50) fail('每榜最多50个自定义条目');
        filter(s.filters[k]); var b = s.boards[k];
        if (!b || !b.tiers || !Array.isArray(b.unavailablePlacements) || b.unavailablePlacements.length > 2000) fail('排名结构损坏');
        text(b.title,30,true); var seen = new Set();
        locations.forEach(function (l) { var a = row(b,l); if (!Array.isArray(a) || a.length > 5000) fail('排名行损坏'); a.forEach(function (id) { if (!safeId(id,k) || seen.has(id)) fail('排名 ID 重复或跨榜'); seen.add(id); if (id.indexOf('custom:') === 0 && !own(s.customItems,id)) fail('缺少自定义元数据'); }); });
        b.unavailablePlacements.forEach(function (a) { if (!a || !safeId(a.id,k,'builtin') || locations.indexOf(a.location) < 0 || !Number.isInteger(a.index) || a.index < 0 || seen.has(a.id)) fail('归档损坏'); seen.add(a.id); });
      });
      return s;
    }
    function validate(s) {
      shape(s);
      kinds.forEach(function (k) { var expected = items(s,k).map(function (v) { return v.id; }), present = []; locations.forEach(function (l) { present = present.concat(row(s.boards[k],l)); }); if (present.length !== expected.length || expected.some(function (id) { return present.indexOf(id) < 0; })) fail('完整排名不变量失败'); });
      return s;
    }
    function reconcile(raw) {
      shape(raw); var s = clone(raw); s.knownItems = s.knownItems || {};
      if(s.boards.llm.title === 'LLM 模型 从夯到拉') s.boards.llm.title = '语言模型 从夯到拉';
      Object.keys(s.customItems).forEach(function(id){s.customItems[id]=item(s.customItems[id],'custom');});
      kinds.forEach(function (k) {
        s.filters[k] = filter(s.filters[k]);
        var b = s.boards[k], allowed = new Set(items(s,k).map(function (v) { return v.id; }));
        locations.forEach(function (l) { var original = row(b,l).slice(), kept = [];
          original.forEach(function (id,index) { if (allowed.has(id)) kept.push(id); else b.unavailablePlacements.push({ id:id, location:l, index:index, before:original[index-1] || null, after:original[index+1] || null, item:own(s.knownItems,id) ? s.knownItems[id] : null }); });
          if (l === 'unranked') b.unranked = kept; else b.tiers[l] = kept;
        });
        b.unavailablePlacements = b.unavailablePlacements.filter(function (a) {
          if (!allowed.has(a.id)) return true;
          var dest = row(b,a.location), at = a.before ? dest.indexOf(a.before) : -1;
          at = at >= 0 ? at + 1 : (a.after ? dest.indexOf(a.after) : -1);
          if (at < 0) at = Math.min(a.index,dest.length);
          dest.splice(at,0,a.id); return false;
        });
        var seen = new Set(); locations.forEach(function (l) { row(b,l).forEach(function (id) { seen.add(id); }); });
        items(s,k).forEach(function (v) { if (!seen.has(v.id)) b.unranked.push(v.id); });
      });
      builtins.forEach(function (v) { s.knownItems[v.id] = clone(v); });
      // Keep snapshots only for current or archived identities.
      var keep = new Set(builtins.map(function (v) { return v.id; })); kinds.forEach(function (k) { s.boards[k].unavailablePlacements.forEach(function (a) { keep.add(a.id); }); });
      Object.keys(s.knownItems).forEach(function (id) { if (!keep.has(id)) delete s.knownItems[id]; });
      s.catalogRevision = input.catalogRevision; return validate(s);
    }
    function visible(s, kind) {
      var f = filter(s.filters[kind]), q = norm(f.search);
      return items(s,kind).filter(function (v) { return (!q || norm([v.name,v.subtitle].concat(v.aliases).join(' ')).indexOf(q) >= 0) && (f.provider === 'all' || providerKey(v) === f.provider) && (f.category === 'all' || (f.category === 'none' ? !v.categoryIds.length : v.categoryIds.indexOf(f.category) >= 0)) && (f.source === 'all' || v.id.indexOf(f.source + ':') === 0) && (kind !== 'llm' || f.period === 'all' || (f.period === 'unknown' ? !v.archivePeriod : v.archivePeriod === f.period)); }).map(function (v) { return v.id; });
    }
    function project(s,kind) { var set = new Set(visible(s,kind)), b = clone(s.boards[kind]); locations.forEach(function (l) { var a = row(b,l).filter(function (id) { return set.has(id); }); if (l === 'unranked') b.unranked = a; else b.tiers[l] = a; }); return b; }
    function changeView(s,kind,fn) {
      var next = clone(s), view = project(s,kind), set = new Set(visible(s,kind)); fn(view);
      locations.forEach(function (l) { var queue = row(view,l).slice(), a = []; row(s.boards[kind],l).forEach(function (id) { if (!set.has(id)) a.push(id); else if (queue.length) a.push(queue.shift()); }); a = a.concat(queue); if (l === 'unranked') next.boards[kind].unranked = a; else next.boards[kind].tiers[l] = a; }); return validate(next);
    }
    function locate(b,id) { for (var i=0;i<locations.length;i++) { var index = row(b,locations[i]).indexOf(id); if (index >= 0) return { location:locations[i], index:index }; } return null; }
    function move(s,kind,id,target,index) {
      if (locations.indexOf(target) < 0 || visible(s,kind).indexOf(id) < 0) fail('移动目标无效');
      return changeView(s,kind,function (b) { var from = locate(b,id); row(b,from.location).splice(from.index,1); var dest = row(b,target), at = Number.isInteger(index) ? index : dest.length; dest.splice(Math.max(0,Math.min(at,dest.length)),0,id); });
    }
    function clear(s,kind) { return changeView(s,kind,function (b) { tiers.forEach(function (t) { b.unranked = b.unranked.concat(b.tiers[t]); b.tiers[t] = []; }); }); }
    function custom(s,kind,fields,id,allowDuplicate) {
      if (kinds.indexOf(kind) < 0) fail('榜单类型无效');
      var old = id && get(s,id);
      if (id && (!old || !safeId(id,kind,'custom'))) fail('只能编辑当前榜的自定义条目');
      if (!id && items(s,kind).filter(function (v) { return v.id.indexOf('custom:') === 0; }).length >= 50) fail('每榜最多50个自定义条目');
      var next = clone(s), candidate = item(Object.assign({},fields,{id:id || 'custom:'+kind+':'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12),kind:kind,aliases:[],iconKey:null,providerId:null,lifecycle:'unknown',sources:[],verifiedAt:null}),'custom');
      if (!id && get(s,candidate.id)) fail('条目 ID 冲突，请重试');
      if (!allowDuplicate && items(s,kind).some(function (v) { return v.id !== candidate.id && norm(v.name) === norm(candidate.name); })) { var error = new Error('当前榜单已有同名条目，是否继续？'); error.code = 'DUPLICATE'; throw error; }
      next.customItems[candidate.id] = candidate; if (!id) next.boards[kind].unranked.push(candidate.id); return { state:validate(next), id:candidate.id };
    }
    function remove(s,kind,id) { if (!safeId(id,kind,'custom') || !own(s.customItems,id)) fail('只能删除自定义条目'); var next = clone(s), at = locate(next.boards[kind],id); row(next.boards[kind],at.location).splice(at.index,1); delete next.customItems[id]; return validate(next); }
    function snapshot(s,kind) { var customItems = {}; Object.keys(s.customItems).forEach(function (id) { if (s.customItems[id].kind === kind) customItems[id] = clone(s.customItems[id]); }); return { board:clone(s.boards[kind]), customItems:customItems }; }
    function restore(s,kind,snap) { var next = clone(s); Object.keys(next.customItems).forEach(function (id) { if (next.customItems[id].kind === kind) delete next.customItems[id]; }); Object.keys(snap.customItems).forEach(function (id) { next.customItems[id] = clone(snap.customItems[id]); }); next.boards[kind] = clone(snap.board); return validate(next); }
    function setFilters(s,kind,f) { var next = clone(s); next.filters[kind] = filter(f); return validate(next); }
    return { initial:initial, validate:validate, reconcile:reconcile, items:items, get:get, providerKey:providerKey, providerName:providerName, categories:categories, visible:visible, project:project, locate:locate, move:move, clear:clear, custom:custom, remove:remove, snapshot:snapshot, restore:restore, setFilters:setFilters };
  }
  api.createEngine = engine; api.clone = clone; api.norm = norm; api.text = text; api.tiers = tiers; api.locations = locations; api.labels = labels; api.periods = periods;
  api.icon = function (v) { var hash=0; for(var i=0;i<v.id.length;i++) hash=(hash*31+v.id.charCodeAt(i))|0; return { color:'hsl('+Math.abs(hash%360)+', 48%, 36%)', letters:Array.from(v.name).filter(function(c){return !/\s/.test(c);}).slice(0,2).join('') }; };
  root.AITier = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
