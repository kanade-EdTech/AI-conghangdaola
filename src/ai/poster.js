(function (global) {
  'use strict';
  var app=global.AITier, colors={hang:'#f5aaa0',top:'#f7c59b',elite:'#f0df9d',npc:'#c7dfbd',la:'#b6d6ed',unranked:'#dedfe8'};
  function pages(snapshot) {
    var result=[], current={}, count=0;
    function fresh(){var p={};app.locations.forEach(function(l){p[l]=[];});return p;}
    current=fresh();
    app.locations.forEach(function(l){snapshot.rows[l].forEach(function(v){if(count===50){result.push(current);current=fresh();count=0;}current[l].push(v);count++;});});
    if(count || !result.length)result.push(current); return result;
  }
  function wrap(ctx,value,width) {
    var lines=[],line='';Array.from(value).forEach(function(c){if(line && ctx.measureText(line+c).width>width){lines.push(line);line='';}line+=c;});if(line)lines.push(line);return lines;
  }
  function nameLines(ctx,entry,width) {
    var parts=[entry.name],match;
    if(entry.kind==='llm'){
      match=/^Claude\s+(.+)$/.exec(entry.name);
      if(match)parts=['Claude',match[1]];
      else {
        match=/^(DeepSeek\s+\S+)\s+(.+)$/.exec(entry.name);
        if(match)parts=[match[1],match[2]];
      }
    }
    return parts.reduce(function(lines,part){return lines.concat(wrap(ctx,part,width));},[]);
  }
  function load(path) { return new Promise(function(resolve){if(!path)return resolve(null);var img=new Image(),done=false;var timer=setTimeout(function(){if(!done){done=true;resolve(null);}},2500);img.onload=function(){if(!done){done=true;clearTimeout(timer);resolve(img);}};img.onerror=function(){if(!done){done=true;clearTimeout(timer);resolve(null);}};img.src=path;}); }
  async function render(snapshot,pageIndex,width) {
    var all=pages(snapshot),p=all[pageIndex];if(!p)throw new Error('页码无效');
    width=width===720?720:1080;var height=270;
    app.locations.forEach(function(l){height+=(p[l].length?Math.ceil(p[l].length/6)*178:74)+14;});height+=90;
    var canvas=document.createElement('canvas'),scale=width/1080;canvas.width=width;canvas.height=Math.ceil(height*scale);
    if(canvas.width*canvas.height>4000000)throw new Error('图片过大，请缩小筛选范围');
    var ctx=canvas.getContext('2d');if(!ctx)throw new Error('当前环境无法绘图');ctx.scale(scale,scale);
    ctx.fillStyle='#f4f3ee';ctx.fillRect(0,0,1080,height);ctx.fillStyle='#6654db';ctx.font='bold 18px sans-serif';ctx.fillText('AI / YOUR EXPERIENCE. YOUR TIER.',36,46);
    ctx.fillStyle='#20232d';ctx.font='bold 36px sans-serif';var titleLines=wrap(ctx,snapshot.title,1000);titleLines.slice(0,2).forEach(function(line,i){ctx.fillText(line,36,101+i*43);});
    ctx.font='18px sans-serif';ctx.fillStyle='#646875';wrap(ctx,snapshot.summary,1000).slice(0,2).forEach(function(line,i){ctx.fillText(line,36,181+i*25);});
    ctx.font='15px sans-serif';ctx.fillText('个人体验排序 · '+snapshot.date+' · 第 '+(pageIndex+1)+' / '+all.length+' 页'+(snapshot.demo?' · 虚构示例开发预览':''),36,243);
    var y=270;
    for(var n=0;n<app.locations.length;n++){
      var l=app.locations[n],entries=p[l],rh=entries.length?Math.ceil(entries.length/6)*178:74;
      ctx.fillStyle='#fffefa';ctx.fillRect(28,y,1024,rh);ctx.fillStyle=colors[l];ctx.fillRect(28,y,91,rh);
      ctx.fillStyle='#30323b';ctx.font='bold 19px sans-serif';ctx.textAlign='center';ctx.fillText(app.labels[l],73,y+rh/2+7);ctx.textAlign='left';
      if(!entries.length){ctx.fillStyle='#9c9fa7';ctx.font='16px sans-serif';ctx.fillText('—',153,y+rh/2);}
      for(var i=0;i<entries.length;i++){
        var v=entries[i],x=130+(i%6)*150,cy=y+Math.floor(i/6)*178,icon=app.icon(v),image=await load(v.iconPath);
        ctx.fillStyle=image?'#ffffff':icon.color;ctx.fillRect(x+46,cy+10,38,38);ctx.fillStyle='white';ctx.font='bold 14px sans-serif';ctx.textAlign='center';
        if(image)ctx.drawImage(image,x+46,cy+10,38,38);else ctx.fillText(icon.letters,x+65,cy+35);
        ctx.fillStyle='#252936';ctx.font='16px sans-serif';var lines=nameLines(ctx,v,133);lines.slice(0,5).forEach(function(line,j){ctx.fillText(line,x+65,cy+69+j*18);});
        ctx.fillStyle='#737783';ctx.font='12px sans-serif';var sub=wrap(ctx,v.subtitle || '',133)[0] || '';ctx.fillText(sub,x+65,cy+162);ctx.textAlign='left';
      }
      y+=rh+14;
    }
    ctx.font='14px sans-serif';ctx.fillStyle='#747987';ctx.fillText('AI 从夯到拉 · '+(snapshot.catalogDate?'目录核验 '+snapshot.catalogDate:'目录核验日期未填写'),36,y+35);
    var data=canvas.toDataURL('image/png');canvas.width=1;canvas.height=1;return data;
  }
  app.poster={pages:pages,render:render};
})(window);
