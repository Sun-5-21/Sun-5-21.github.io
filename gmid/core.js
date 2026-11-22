(function(root) {
  'use strict';
  const finite = x => typeof x === 'number' && Number.isFinite(x);
  function extent(values, accessor=x=>x) {
    let min=Infinity,max=-Infinity;
    for(const item of values){const value=accessor(item);if(finite(value)){if(value<min)min=value;if(value>max)max=value;}}
    return min===Infinity?[null,null]:[min,max];
  }
  function validate(data) {
    if (!data || data.schema_version !== 1 || !Array.isArray(data.curves) || !data.curves.length)
      throw new Error('需要 schema_version=1 且包含曲线的缓存文件');
    if (typeof data.process !== 'string' || !data.process) throw new Error('缺少工艺名称');
    for (const [key,unit] of Object.entries({l_um:'um',w_um:'um',id_w:'uA/um',gmid:'1/V',ro:'ohm',ft:'Hz',ids:'A',gm:'S',gds:'S',capacitances:'F',body_reverse_v:'V'}))
      if(data.units?.[key]!==unit)throw new Error('不支持的单位 '+key+'，应为 '+unit);
    const seen=new Set();
    for (const c of data.curves) {
      if (!c.conditions || !Array.isArray(c.rows) || c.rows.length < 2) throw new Error('曲线缺少条件或扫描点');
      for (const k of ['process', 'device', 'corner'])
        if (typeof c.conditions[k] !== 'string' || !c.conditions[k]) throw new Error('缺少条件 '+k);
      for (const k of ['l_um', 'w_um', 'vds_abs_v', 'body_reverse_v', 'temperature_c'])
        if (!finite(c.conditions[k])) throw new Error('条件非数值 '+k);
      if (c.conditions.l_um <= 0 || c.conditions.w_um <= 0) throw new Error('尺寸必须为正');
      if(c.conditions.process!==data.process || !['NMOS','PMOS'].includes(c.conditions.device))throw new Error('工艺/器件不一致');
      if(c.conditions.vds_abs_v<=0 || c.conditions.body_reverse_v<0 || c.conditions.temperature_c<=-273.15)throw new Error('偏置或温度非法');
      const identity=JSON.stringify(['process','device','l_um','w_um','vds_abs_v','body_reverse_v','corner','temperature_c'].map(k=>c.conditions[k]));
      if(seen.has(identity))throw new Error('缓存包含重复条件');seen.add(identity);
      let last = -Infinity;
      for (const r of c.rows) {
        if (!finite(r.vgs_abs_v) || r.vgs_abs_v <= last) throw new Error('VGS 扫描必须严格递增');
        last = r.vgs_abs_v;
        for (const k of ['gmid', 'id_w', 'ro', 'gain', 'ft', 'ids', 'gm', 'gds', 'cgs', 'cgd', 'cds', 'cgg']) {
          if (!(k in r) || (r[k] !== null && !finite(r[k]))) throw new Error('无效或缺少参数 '+k);
        }
      }
    }
    return data;
  }
  function selectCurves(curves, selection, ignoreL=false) {
    return curves.filter(c=>Object.entries(selection).every(([k,v])=>(ignoreL&&k==='l_um')||String(c.conditions[k])===String(v)));
  }
  function curveCSV(curve) {
    const ck=Object.keys(curve.conditions), fields=Object.keys(curve.rows[0]);
    const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
    return '\ufeff'+[[...ck,...fields],...curve.rows.map(r=>[...ck.map(k=>curve.conditions[k]),...fields.map(k=>r[k])])]
      .map(row=>row.map(quote).join(',')).join('\r\n');
  }
  // Search adjacent VGS samples, never sort by gm/Id: preserve nonmonotonic branches.
  function lookup(rows, key, target) {
    if (!finite(target)) throw new Error('请输入有效数值');
    const hits = [];
    const push = r => { if (!hits.some(x => Math.abs(x.vgs_abs_v-r.vgs_abs_v) < 1e-10)) hits.push(r); };
    rows.forEach(r => { if (finite(r[key]) && Math.abs(r[key]-target) < 1e-12) push({...r, interpolated:false}); });
    for (let i=0; i<rows.length-1; i++) {
      const a=rows[i], b=rows[i+1], x=a[key], y=b[key];
      if (!finite(x) || !finite(y) || x===y || target<=Math.min(x,y) || target>=Math.max(x,y)) continue;
      const t=(target-x)/(y-x), out={};
      for (const k of Object.keys(a)) out[k] = finite(a[k]) && finite(b[k]) ? a[k]+t*(b[k]-a[k]) : null;
      // Discrete region code must not be interpolated into a fictitious region.
      out.region = a.region === b.region ? a.region : null;
      out.interpolated=true; push(out);
    }
    return hits.sort((a,b)=>a.vgs_abs_v-b.vgs_abs_v);
  }
  const api={finite, validate, lookup, selectCurves, curveCSV, extent};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.GmidCore=api;
})(typeof window !== 'undefined' ? window : globalThis);
