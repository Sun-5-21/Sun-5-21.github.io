'use strict';
const $ = id=>document.getElementById(id);
const metrics = {
  id_abs_ua:['|ID|','µA',1], id_w:['ID/W','µA/µm',1], gmid:['gm/Id','1/V',1], gain:['gm/gds','V/V',1],
  ro:['ro','kΩ',1e-3], ft:['fT 估算','GHz',1e-9],
  cgs:['Cgs · 原始矩阵项','fF',1e15], cgd:['Cgd · 原始矩阵项','fF',1e15],
  cds:['Cds · 原始矩阵项','fF',1e15], cgg:['Cgg','fF',1e15],
  gm:['gm','mS',1e3], gds:['gds','µS',1e6], ids:['ids · 带符号','µA',1e6],
  vgs_abs_v:['|VGS|','V',1], vdsat:['VDSAT','V',1], vth:['Vth','V',1], region:['region','',1]
};
const keys=['process','device','l_um','w_um','vds_abs_v','body_reverse_v','corner','temperature_c'];
const colors=['#18795e','#cf8639','#6583b8','#a66b95','#7b9560','#b4685a'];
let dataset=null, current=null, solutions=[], plotted=[];
const processes=new Map();
let comparisonCurves=[];
function curveLabel(curve) {
  const c=curve.conditions;
  return `${c.process} · ${c.device} · L ${c.l_um} µm · W ${c.w_um} µm · |VDS| ${c.vds_abs_v} V · 体偏置 ${c.body_reverse_v} V · ${c.corner} · ${c.temperature_c} °C`;
}
function curveIdentity(curve) {
  return JSON.stringify(keys.map(key=>curve.conditions[key]));
}
function renderComparisons() {
  const list=$('comparison-list');
  list.replaceChildren();
  comparisonCurves.forEach((curve,index)=>{
    const row=document.createElement('div');row.className='comparison-row';
    const text=document.createElement('span');text.textContent=`对比组${index+1} · ${curveLabel(curve)}`;
    const remove=document.createElement('button');remove.className='button secondary';
    remove.textContent='移除';remove.setAttribute('aria-label','移除 '+curveLabel(curve));
    remove.addEventListener('click',()=>{comparisonCurves.splice(index,1);renderComparisons();draw();});
    row.append(text,remove);list.append(row);
  });
  if(dataset){
    const corners=[...new Set(dataset.curves.map(c=>c.conditions.corner))].join('、');
    const temps=[...new Set(dataset.curves.map(c=>c.conditions.temperature_c))].join('、');
    $('comparison-coverage').textContent=`当前数据覆盖工艺角 ${corners}，温度 ${temps} °C。导入包含更多条件的缓存后可添加相应曲线。`;
  }
}
$('pin-curve').addEventListener('click',()=>{
  if(!current)return;
  if(comparisonCurves.some(c=>curveIdentity(c)===curveIdentity(current)))return;
  if(comparisonCurves.length>=12){notice('最多添加 12 条对比曲线，请先移除部分曲线。');return;}
  comparisonCurves.push(current);notice('');renderComparisons();draw();
});
$('clear-curves').addEventListener('click',()=>{comparisonCurves=[];renderComparisons();draw();});
const fmt=v=>!GmidCore.finite(v)?'—':v===0?'0':Math.abs(v)>=1e5||Math.abs(v)<.001?v.toExponential(3):Number(v.toPrecision(5)).toString();
function option(value,text=value){const o=document.createElement('option');o.value=value;o.textContent=text;return o;}
Object.entries(metrics).filter(([k])=>!['region','id_abs_ua'].includes(k)).forEach(([k,v])=>$('metric').append(option(k,`${v[0]} [${v[1]}]`)));
function notice(message){$('notice').textContent=message;}
function candidates(ignoreL=false){return GmidCore.selectCurves(dataset.curves,Object.fromEntries(keys.map(k=>[k,$(k).value])),ignoreL);}
function cascade(start=0){
  if(!dataset)return;
  for(let i=start;i<keys.length;i++){
    const key=keys[i], el=$(key), old=el.value;
    const possible=GmidCore.selectCurves(dataset.curves,Object.fromEntries(keys.slice(0,i).map(k=>[k,$(k).value])));
    const values=[...new Set(possible.map(c=>c.conditions[key]))].sort((a,b)=>typeof a==='number'?a-b:String(a).localeCompare(String(b)));
    el.replaceChildren(...values.map(v=>option(v)));
    if(values.some(v=>String(v)===old))el.value=old;
  }
  current=candidates()[0]||null; solutions=[];
  $('readouts').replaceChildren();$('query-status').textContent='输入数值后查询，支持扫描范围内的线性插值。';
  $('model-tag').textContent=current?`${current.conditions.process} / ${current.conditions.model||current.conditions.device}`:'无数据';
  if(current){const c=current.conditions;$('conditions').textContent=`${c.device} · L ${c.l_um} µm · W ${c.w_um} µm · |VDS| ${c.vds_abs_v} V · 体偏置 ${c.body_reverse_v} V · ${c.corner} · ${c.temperature_c} °C`;}
  const selected=processes.get($('process').value);
  if(selected){
    $('source').textContent=`${selected.source||'导入缓存'} / ${selected.model_revision||'版本未注明'}${selected.model_notes?' · '+selected.model_notes:''}`;
    $('counts').textContent=`${selected.curves.length} 条曲线 · ${selected.curves.reduce((n,c)=>n+c.rows.length,0).toLocaleString()} 个扫描点`;
    $('date').textContent=selected.created_utc?`缓存生成于 ${selected.created_utc.slice(0,10)}`:'';
  }
  $('hover').textContent='移动到曲线上查看扫描点';
  draw();
}
keys.forEach((k,i)=>$(k).addEventListener('change',()=>cascade(i+1)));
function load(data){
  GmidCore.validate(data);processes.set(data.process,data);
  dataset={curves:[...processes.values()].flatMap(d=>d.curves)};
  comparisonCurves=comparisonCurves.filter(c=>c.conditions.process!==data.process);
  notice('');cascade();$('process').value=data.process;cascade(1);renderComparisons();
}
function svgEl(name,attrs={},text){const e=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
function draw(){
  const box=$('chart');box.replaceChildren();$('legend').replaceChildren();plotted=[];
  if(!current){const e=document.createElement('div');e.className='empty';e.textContent='请导入由独立仿真脚本生成的 dataset.json';box.append(e);return;}
  const ykey=$('metric').value;
  const roMode=ykey==='ro';
  $('ro-controls').hidden=!roMode;
  $('xmetric').disabled=roMode;
  if(roMode)$('xmetric').value='id_abs_ua';
  else if($('xmetric').value==='id_abs_ua')$('xmetric').value='gmid';
  const xkey=roMode?'id_abs_ua':$('xmetric').value,ym=metrics[ykey],xm=metrics[xkey],log=$('yscale').value==='log',xlog=$('xscale').value==='log';
  $('plot-title').textContent=`${ym[0]} vs ${xm[0]}${roMode?' · 固定 gm/Id 的宽度缩放估算':''}`;
  const baseCurves=$('compare').checked?candidates(true):[current];
  let curves=[...new Map([...baseCurves,...comparisonCurves].map(c=>[curveIdentity(c),c])).values()];
  if(roMode){
    const levels=$('ro-levels').value.split(/[,，\s]+/).filter(Boolean).map(Number);
    if(!levels.length||levels.some(x=>!Number.isFinite(x)||x<=0)||levels.length>8){box.textContent='请输入最多 8 个正数 gm/Id，用逗号分隔。';return;}
    const min=Number($('ro-min').value),max=Number($('ro-max').value);
    if(!(min>0&&max>min)){box.textContent='电流范围需满足 0 < 最小电流 < 最大电流。';return;}
    curves=curves.flatMap(curve=>GmidCore.roCurrentFamilies(curve,[...new Set(levels)],min,max));
  }
  const valid=r=>GmidCore.finite(r[xkey])&&GmidCore.finite(r[ykey])&&(!log||r[ykey]*ym[2]>0)&&(!xlog||r[xkey]*xm[2]>0);
  const all=curves.flatMap(c=>c.rows.filter(valid));
  if(!all.length){const e=document.createElement('div');e.className='empty';e.textContent='此坐标设置没有有效数据。对数坐标仅显示正值，可切换为线性坐标。';box.append(e);return;}
  const yval=r=>r[ykey]*ym[2];
  const [xlow,xhigh]=GmidCore.extent(all,r=>r[xkey]*xm[2]);
  const [ylow,yhigh]=GmidCore.extent(all,yval);
  const xa=GmidCore.axisTicks(xlow,xhigh,xlog),ya=GmidCore.axisTicks(ylow,yhigh,log);
  if(!xa||!ya){box.textContent='当前坐标范围不可用。对数坐标需要正数。';return;}
  const W=940,H=370,left=85,right=22,top=23,bottom=57;
  const tx=value=>xlog?Math.log10(value):value;
  const ty=value=>log?Math.log10(value):value;
  const sx=value=>left+(tx(value)-tx(xa.min))/(tx(xa.max)-tx(xa.min))*(W-left-right);
  const sy=value=>H-bottom-(ty(value)-ty(ya.min))/(ty(ya.max)-ty(ya.min))*(H-top-bottom);
  const svg=svgEl('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':$('plot-title').textContent,xmlns:'http://www.w3.org/2000/svg'});
  svg.append(svgEl('rect',{width:W,height:H,fill:'white'}));
  for(const tick of ya.ticks){
    svg.append(svgEl('line',{x1:left,x2:W-right,y1:sy(tick),y2:sy(tick),stroke:'#edf1ec'}));
    svg.append(svgEl('text',{x:left-12,y:sy(tick)+4,'text-anchor':'end',fill:'#7a8980','font-size':11},fmt(tick)));
  }
  for(const tick of xa.ticks){
    svg.append(svgEl('line',{x1:sx(tick),x2:sx(tick),y1:top,y2:H-bottom,stroke:'#edf1ec'}));
    svg.append(svgEl('text',{x:sx(tick),y:H-bottom+23,'text-anchor':'middle',fill:'#7a8980','font-size':11},fmt(tick)));
  }
  svg.append(svgEl('text',{x:(W+left-right)/2,y:H-9,'text-anchor':'middle',fill:'#60766b','font-size':12},`${xm[0]} [${xm[1]}]${xlog?' · log':''}`));
  svg.append(svgEl('text',{transform:`translate(17 ${H/2}) rotate(-90)`,'text-anchor':'middle',fill:'#60766b','font-size':12},`${ym[0]} [${ym[1]}]${log?' · log':''}`));
  curves.forEach((c,index)=>{
    let d='',pen=false;const color=colors[index%colors.length];
    c.rows.forEach(r=>{if(!valid(r)){pen=false;return;}const x=sx(r[xkey]*xm[2]),y=sy(yval(r));d+=`${pen?'L':'M'}${x.toFixed(2)},${y.toFixed(2)} `;pen=true;plotted.push({x,y,r,c});});
    svg.append(svgEl('path',{d,fill:'none',stroke:color,'stroke-width':c===current?2.8:1.8,'stroke-linejoin':'round'}));
    const legend=document.createElement('span');legend.style.setProperty('--color',color);const comparisonIndex=comparisonCurves.findIndex(curve=>curveIdentity(curve)===curveIdentity(c));
    const currentMatch=curveIdentity(c)===curveIdentity(current);
    const group=currentMatch?'当前组合':comparisonIndex>=0?`对比组${comparisonIndex+1}`:`L = ${c.conditions.l_um} µm`;
    legend.textContent=roMode?`${group} · gm/Id=${c.familyGmid}${c.familyBranch?' · 分支'+(c.familyBranch+1):''}`:group;
    legend.title=curveLabel(c);$('legend').append(legend);
  });
  (roMode?[]:solutions).filter(valid).forEach(r=>svg.append(svgEl('circle',{cx:sx(r[xkey]*xm[2]),cy:sy(yval(r)),r:6,fill:'#fff',stroke:'#163f31','stroke-width':2.5})));
  const hoverDot=svgEl('circle',{r:4,fill:'#244e3a',visibility:'hidden'});svg.append(hoverDot);
  svg.addEventListener('pointermove',e=>{const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const pos=pt.matrixTransform(svg.getScreenCTM().inverse());let best=null,dist=Infinity;for(const p of plotted){const d=(p.x-pos.x)**2+(p.y-pos.y)**2;if(d<dist){dist=d;best=p;}}if(best){hoverDot.setAttribute('cx',best.x);hoverDot.setAttribute('cy',best.y);hoverDot.setAttribute('visibility','visible');$('hover').textContent=`${curveLabel(best.c)}${roMode?` · gm/Id ${best.c.familyGmid} · 估算 W ${fmt(best.r.w_um)} µm`:""} · ${xm[0]} ${fmt(best.r[xkey]*xm[2])} ${xm[1]} · ${ym[0]} ${fmt(best.r[ykey]*ym[2])} ${ym[1]}`;}});
  svg.addEventListener('pointerleave',()=>hoverDot.setAttribute('visibility','hidden'));
  box.append(svg);
}
for(const id of ['ro-levels','ro-min','ro-max'])$(id).addEventListener('input',draw);
for(const id of ['xmetric','compare','xscale','yscale'])$(id).addEventListener('change',draw);
$('metric').addEventListener('change',()=>{if(['cgs','cgd','cds','ids'].includes($('metric').value))$('yscale').value='linear';draw();});
function query(e){
  if(e)e.preventDefault();if(!current)return;
  const raw=$('query-value').value,target=raw.trim()===''?NaN:Number(raw);
  const targetId=Number($('target-id').value);
  if(!GmidCore.finite(targetId)||targetId<=0){$('query-status').textContent='请输入大于 0 的目标电流，当前表格保留上次有效结果。';return;}

  $('readouts').replaceChildren();solutions=[];
  try{solutions=GmidCore.lookup(current.rows,$('query-key').value,target);}catch(err){$('query-status').textContent=err.message;draw();return;}
  if(!solutions.length){const [min,max]=GmidCore.extent(current.rows,r=>r[$('query-key').value]);$('query-status').textContent=min!==null?`无可用交点；有效扫描范围 ${fmt(min)}–${fmt(max)}。未执行外推。`:'此参数没有有效扫描值。';draw();return;}
  $('query-status').textContent=`找到 ${solutions.length} 个工作点${solutions.length>1?'；曲线非单调，请根据 VGS 选择工作点':''}。插值结果是估算，精确设计请在目标偏置复核。`;
  solutions.forEach((r,i)=>{
    const title=document.createElement('p');title.className='solution-title';title.textContent=`工作点 ${i+1} · ${r.interpolated?'相邻扫描点线性插值':'原始扫描点'} · |VGS| ${fmt(r.vgs_abs_v)} V`;$('readouts').append(title);
    const target=document.createElement('div');target.className='values';
    const sized=GmidCore.sizeForCurrent(r,current.conditions.w_um,targetId*1e-6);
    if(sized){
      const heading=document.createElement('p');heading.className='solution-title';
      heading.textContent='目标电流下的宽度缩放估算 · W = ID / (ID/W)，gm = (gm/ID) × ID。实际尺寸需重新仿真确认。';
      $('readouts').append(heading);
      const fields=[['目标 |ID|',targetId,'µA'],['估算 W',sized.w_um,'µm'],['gm/Id',r.gmid,'1/V'],['估算 gm',sized.gm*1e3,'mS'],['估算 ro',sized.ro===null?null:sized.ro*1e-3,'kΩ'],['估算 gds',sized.gds*1e6,'µS'],...['cgs','cgd','cds','cgg'].map(k=>['估算 '+k,sized[k]===null?null:sized[k]*1e15,'fF'])];
      for(const [name,value,unit] of fields){
        const cell=document.createElement('div');cell.className='value';
        const label=document.createElement('small');label.textContent=name;
        const number=document.createElement('strong');number.textContent=fmt(value);
        const suffix=document.createElement('em');suffix.textContent=unit;
        number.append(suffix);cell.append(label,number);target.append(cell);
      }
      $('readouts').append(target);
    }
    const reference=document.createElement('p');reference.className='solution-title';
    reference.textContent=`缓存参考器件 · W = ${current.conditions.w_um} µm · 以下参数对应参考宽度`;
    $('readouts').append(reference);
    const grid=document.createElement('div');grid.className='values';
    for(const k of ['gmid','id_w','vgs_abs_v','ro','gm','gds','gain','ft','cgs','cgd','cds','cgg','ids','vth','vdsat','region']){
      const m=metrics[k],cell=document.createElement('div');cell.className='value';const label=document.createElement('small');label.textContent=m[0];const val=document.createElement('strong');val.textContent=fmt(GmidCore.finite(r[k])?r[k]*m[2]:null);const unit=document.createElement('em');unit.textContent=m[1];val.append(unit);cell.append(label,val);grid.append(cell);
    }$('readouts').append(grid);
  });draw();
}
$('lookup').addEventListener('submit',query);
$('target-id').addEventListener('input',()=>{if(current)query();});
$('query-key').addEventListener('change',()=>{$('query-value').value={gmid:15,id_w:50,vgs_abs_v:.65}[$('query-key').value];});
function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export-svg').addEventListener('click',()=>{const svg=$('chart').querySelector('svg');if(svg)download(new XMLSerializer().serializeToString(svg),'gmid-curve.svg','image/svg+xml');});
$('export-csv').addEventListener('click',()=>{if(current)download(GmidCore.curveCSV(current),'gmid-current-curve.csv','text/csv;charset=utf-8');});
$('import').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{load(JSON.parse(await file.text()));}catch(err){notice('导入失败：'+err.message);}e.target.value='';});
try{if(window.GMID_DATASETS?.length){for(const data of window.GMID_DATASETS)load(data);if(processes.has('tsmcN65')){$('process').value='tsmcN65';cascade(1);}}else if(window.GMID_DATA)load(window.GMID_DATA);else{draw();notice('未找到默认缓存。请先运行独立扫描脚本，或导入 dataset.json。');}}catch(err){notice('缓存加载失败：'+err.message);}
