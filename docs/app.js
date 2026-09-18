'use strict';

const PAGE=25;
const CORE_FILES=['intelligence.json','entity_resolution.json','profile_enrichment.json','external_enrichment.json','entities.json','knowledge_graph.json'];
let people=[],filtered=[],page=1,q='',src='all',cat='all',snap={},INT={},ER={},PROFILE={},EXT={},ENT={},KG={},BUILD={};
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const readLocalArray=key=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[]}catch{return[]}};
const valueOrDash=value=>value===undefined||value===null||value===''?'—':value;

async function loadJSON(path,{fallback=true}={}){
  const urls=[new URL(path,location.href)];
  if(fallback)urls.push(new URL(`https://raw.githubusercontent.com/mrbehzadi-code/scie-builder/main/docs/${path}`));
  const errors=[];
  for(const url of urls){
    try{url.searchParams.set('v',Date.now());const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error(`HTTP ${response.status}`);return await response.json()}
    catch(error){errors.push(`${url.href}: ${error.message}`)}
  }
  throw Error(errors.join(' | '));
}

async function loadData(){
  const raw=await loadJSON('data.json');
  snap=raw&&raw.content?JSON.parse(raw.content):raw;
  people=Array.isArray(snap.people)?snap.people:Array.isArray(snap.records)?snap.records:Array.isArray(snap)?snap:[];
  if(!people.length)throw Error('Snapshot بدون رکورد است');
}

async function loadLayers(){
  const targets=[['INT','intelligence.json'],['ER','entity_resolution.json'],['PROFILE','profile_enrichment.json'],['EXT','external_enrichment.json'],['ENT','entities.json'],['KG','knowledge_graph.json']];
  const results=await Promise.allSettled(targets.map(([,file])=>loadJSON(file)));
  const state={};
  results.forEach((result,index)=>{const [name,file]=targets[index];if(result.status==='fulfilled'){({INT,ER,PROFILE,EXT,ENT,KG}={INT,ER,PROFILE,EXT,ENT,KG,[name]:result.value});state[file]=true}else{console.warn(`${file} unavailable:`,result.reason);state[file]=false}});
  return state;
}

function applyIntelligence(){
  (INT.candidate_quality||[]).forEach(item=>{if(Number.isInteger(item.candidate_index)&&people[item.candidate_index])people[item.candidate_index]._quality=item});
  (PROFILE.profiles||[]).forEach(item=>{if(Number.isInteger(item.candidate_index)&&people[item.candidate_index])people[item.candidate_index]._profile=item});
  (EXT.profiles||[]).forEach(item=>{if(Number.isInteger(item.candidate_index)&&people[item.candidate_index])people[item.candidate_index]._external=item});
  const entityMap=new Map((ENT.entities||[]).map(item=>[item.entity_id,item]));
  const assignments=ENT.candidate_to_entity||{};
  people.forEach((person,index)=>{const id=assignments[String(index)];if(id){person._entity_id=id;person._entity=entityMap.get(id)||null}person._record_index=index});
}

function formatSnapshot(value){
  if(!value)return 'نامشخص';
  const date=new Date(`${String(value).slice(0,10)}T00:00:00Z`);
  if(Number.isNaN(date.getTime()))return String(value);
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Tehran'}).format(date);
}

function formatBuild(value){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return null;
  return {
    persian:new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Tehran'}).format(date),
    gregorian:new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Tehran'}).format(date).replace(',','')+' Asia/Tehran'
  };
}

async function loadBuildMeta(){
  try{
    BUILD=await loadJSON('build_meta.json',{fallback:false});
    const formatted=formatBuild(BUILD.deployed_at_utc);
    if(!formatted)throw Error('Invalid deployed_at_utc');
    $('buildPersian').textContent=formatted.persian;
    $('buildGregorian').textContent=`Updated: ${formatted.gregorian}`;
    $('footerBuild').textContent=`انتشار ${formatted.gregorian}`;
    if(BUILD.commit_sha){$('commitSha').hidden=false;$('commitSha').textContent=BUILD.commit_sha.slice(0,7)}
  }catch(error){
    console.warn('Build metadata unavailable:',error.message);
    $('buildPersian').textContent='زمان انتشار در دسترس نیست';
    $('buildGregorian').textContent='داده‌ها همچنان قابل استفاده‌اند';
  }
}

function buildMetrics(){
  const graph=KG.metrics||{},entities=ENT.metrics||{},intel=INT.metrics||{},external=EXT.metrics||{};
  const metrics=[
    ['رکوردهای کاندیدا',people.length,'داده‌های کشف‌شده','◎','#2459c4'],
    ['هویت‌های یکتا',entities.canonical_entities,'لایه هویت کانونی','◇','#7957c8'],
    ['سازمان‌ها',graph.node_types?.organization??intel.organizations_detected,'گره سازمانی واقعی','▦','#15936d'],
    ['گره‌های گراف',graph.nodes,'ساختار دانش','⌘','#168899'],
    ['یال‌های گراف',graph.edges,'پیوند شواهد','↗','#d18a16'],
    ['پروفایل غنی‌شده',external.enriched_total,'منبع خارجی زنده یا Cache','＋','#14785b']
  ];
  $('metrics').innerHTML=metrics.map(([title,value,sub,icon,color])=>`<article class="metric" style="--accent:${color}"><div class="metric-top"><div class="metric-value">${esc(valueOrDash(value))}</div><span class="metric-icon">${icon}</span></div><div class="metric-title">${esc(title)}</div><div class="metric-sub">${esc(sub)}</div></article>`).join('');
  const snapshot=formatSnapshot(snap.generated_at||INT.generated_at||ENT.generated_at);
  $('generated').textContent=snapshot;$('snapshotTop').textContent=snapshot;
  const nodeCount=valueOrDash(graph.nodes),edgeCount=valueOrDash(graph.edges);
  $('networkPreviewText').textContent=`${nodeCount} گره و ${edgeCount} یال ساختاریافته در Snapshot فعلی در دسترس است.`;
}

function statusRows(layerState){
  const rows=[
    ['کشف داده',people.length>0,'فعال'],['حل هویت',(ENT.entities||[]).length>0,'در دسترس'],['غنی‌سازی پروفایل',(PROFILE.profiles||[]).length>0,'در دسترس'],['ساخت گراف دانش',(KG.nodes||[]).length>0,'در دسترس'],['داشبورد',true,'فعال']
  ];
  $('systemStatus').innerHTML=rows.map(([label,ok,text])=>`<div class="status-row"><span>${label}</span><b class="${ok?'ok':'warn'}">${ok?text:'داده محدود'}</b></div>`).join('');
  if(Object.values(layerState).some(value=>!value))$('systemStatus').insertAdjacentHTML('beforeend','<div class="status-row"><span>برخی لایه‌های تکمیلی</span><b class="warn">نیازمند بررسی</b></div>');
}

function setupFilters(){
  const sources=[...new Set(people.map(person=>person.source).filter(Boolean))].sort();
  $('source').innerHTML='<option value="all">همه منابع</option>'+sources.map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('');
  const categories=[...new Set(people.map(person=>person.type).filter(Boolean))].sort();
  $('cats').innerHTML='<button type="button" class="chip active" data-c="all">همه</button>'+categories.map(value=>`<button type="button" class="chip" data-c="${esc(value)}">${esc(value)}</button>`).join('');
  document.querySelectorAll('[data-c]').forEach(button=>button.addEventListener('click',()=>{cat=button.dataset.c;page=1;document.querySelectorAll('[data-c]').forEach(item=>item.classList.toggle('active',item===button));render()}));
}

function searchable(person){
  return [person.name,person.source,person.type,person.detail,person.affiliation,person.organization,person.location,...(person.evidence||[])].filter(Boolean).join(' ').toLowerCase();
}

function render(){
  const query=q.toLocaleLowerCase('en');
  filtered=people.filter(person=>(!query||searchable(person).includes(query))&&(src==='all'||person.source===src)&&(cat==='all'||person.type===cat));
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE));page=Math.min(Math.max(1,page),pages);
  const start=(page-1)*PAGE,rows=filtered.slice(start,start+PAGE);
  $('count').textContent=`${filtered.length} رکورد`;
  $('pageinfo').textContent=`صفحه ${page.toLocaleString('fa-IR')} از ${pages.toLocaleString('fa-IR')}`;
  $('prev').disabled=page===1;$('next').disabled=page===pages;
  if(!rows.length){$('list').innerHTML='<div class="empty-state"><strong>نتیجه‌ای پیدا نشد</strong><small>عبارت جستجو یا فیلترها را تغییر دهید.</small><button type="button" class="button subtle" data-empty-reset>نمایش همه رکوردها</button></div>';return}
  $('list').innerHTML=rows.map((person,index)=>{
    const quality=person._quality||{},profile=person._profile||{},external=person._external||{};
    const organization=profile.organization||person.affiliation||person.organization||'';
    const location=profile.location?.raw||person.location||'';
    const qualityBadge=quality.evidence_strength?`<span class="badge quality ${esc(quality.evidence_strength)}">کیفیت ${esc(quality.score)}</span>`:'';
    const complete=profile.profile_completeness!==undefined?`<span class="badge complete">پروفایل ${esc(profile.profile_completeness)}٪</span>`:'';
    const entity=person._entity_id?`<span class="badge entity">${person._entity?.record_count>1?'هویت چندرکوردی':'شناسه کانونی'}</span>`:'';
    const enriched=external.status==='enriched'?`<span class="badge enriched">${external.data?.cached?'غنی‌شده · Cache':'غنی‌شده · زنده'}</span>`:'';
    return `<button type="button" class="person" data-record-index="${person._record_index}"><span class="no">${start+index+1}</span><span class="person-main"><span class="name">${esc(person.name||'بدون نام')}</span><span class="person-sub">${esc(person.source||'منبع نامشخص')} · ${esc(person.type||'کاندیدا')}</span></span><span class="person-context">${organization?`<span>${esc(organization)}</span>`:''}${location?`<span>${esc(location)}</span>`:''}</span><span class="badges">${qualityBadge}${complete}${entity}${enriched}</span></button>`;
  }).join('');
}

function resetFilters(){q='';src='all';cat='all';page=1;$('q').value='';$('source').value='all';document.querySelectorAll('[data-c]').forEach(item=>item.classList.toggle('active',item.dataset.c==='all'));render()}
function saveSearch(value){if(!value)return;let history=readLocalArray('scie_search_history').filter(item=>item!==value);history.unshift(value);localStorage.setItem('scie_search_history',JSON.stringify(history.slice(0,30)))}
function showHistory(){const history=readLocalArray('scie_search_history');$('history').innerHTML=history.map(value=>`<div class="hist" role="button" tabindex="0">${esc(value)}</div>`).join('');$('history').classList.toggle('open',document.activeElement===$('q')&&history.length>0)}

function field(label,value){return value===undefined||value===null||value===''?'':`<div class="detail-field"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`}
function fieldAlways(label,value){return `<div class="detail-field"><span>${esc(label)}</span><strong>${esc(valueOrDash(value))}</strong></div>`}
function detailSection(title,fields){const body=fields.filter(Boolean).join('');return body?`<section class="detail-section"><h3>${esc(title)}</h3><div class="detail-grid">${body}</div></section>`:''}
function openDetail(person){
  if(!person)return;
  const profile=person._profile||{},ids=profile.identifiers||{},location=profile.location||{},external=person._external?.data||{},quality=person._quality||{},entity=person._entity||{};
  const externalOrganizations=Array.isArray(external.institutions)?external.institutions.join('، '):Array.isArray(external.last_known_institutions)?external.last_known_institutions.map(item=>item?.name).filter(Boolean).join('، '):external.company||'';
  const topics=Array.isArray(external.topics)?external.topics.map(item=>item?.name).filter(Boolean).join('، '):'';
  $('dname').textContent=person.name||'بدون نام';
  $('dsummary').innerHTML=[`<span class="badge">${esc(person.type||'کاندیدا')}</span>`,quality.evidence_strength?`<span class="badge quality ${esc(quality.evidence_strength)}">کیفیت ${esc(quality.score)}</span>`:'',profile.profile_completeness!==undefined?`<span class="badge complete">پروفایل ${esc(profile.profile_completeness)}٪</span>`:''].join('');
  $('dmeta').innerHTML=[
    detailSection('هویت',[field('نام',person.name),field('نوع / ظرفیت',person.type),field('منبع',person.source),field('ارائه‌دهنده',profile.provider),field('وضعیت هویت',quality.verification||person.verification||entity.identity_status)]),
    detailSection('سازمان و مکان',[field('سازمان',profile.organization||person.affiliation||person.organization),field('مکان',location.raw||person.location),field('سازمان در منبع خارجی',externalOrganizations),field('مکان در منبع خارجی',external.location)]),
    detailSection('کیفیت شواهد',[field('کیفیت شواهد',quality.score!==undefined?`${quality.score} / 100 · ${quality.evidence_strength}`:''),field('کامل بودن پروفایل',profile.profile_completeness!==undefined?`${profile.profile_completeness}٪`:''),field('تعداد آثار علمی',profile.work_count??external.works_count),field('استنادها',external.cited_by_count)]),
    detailSection('شناسه‌ها',[fieldAlways('Entity ID',person._entity_id),fieldAlways('OpenAlex ID',ids.openalex_id),fieldAlways('GitHub username',ids.github_username||external.login),fieldAlways('ORCID',ids.orcid||external.orcid),field('تعداد رکورد در هویت',entity.record_count)]),
    detailSection('غنی‌سازی',[field('وضعیت داده تکمیلی',person._external?.status==='enriched'?(external.cached?'Cache معتبر':'Live provider'):''),field('نام در منبع',external.display_name),field('حوزه‌ها',topics),field('مخازن عمومی',external.public_repos),field('به‌روزرسانی منبع',external.updated_at)]),
    detailSection('جزئیات',[field('شرح',person.detail),field('فیلدهای ناقص',(profile.missing_fields||[]).join('، '))])
  ].join('');
  $('devidence').innerHTML=(person.evidence||[]).map(item=>`<span>${esc(item)}</span>`).join('');
  const url=person.url||person.source_url;$('durl').hidden=!url;$('durl').href=url||'#';
  $('detail').hidden=false;document.body.classList.add('modal-open');$('close').focus();
}
function closeDetail(){$('detail').hidden=true;document.body.classList.remove('modal-open')}

function buildIntel(){
  const metrics=INT.metrics||{},decisions=ER.decision_counts||{},profiles=PROFILE.metrics||{},external=EXT.metrics||{},entities=ENT.metrics||{};
  const cards=[['رکوردهای کاندیدا',people.length,true],['کیفیت قوی',metrics.quality_strong],['کیفیت متوسط',metrics.quality_medium],['کیفیت ضعیف',metrics.quality_weak],['اقلام شواهد',metrics.evidence_items],['دارای سازمان',profiles.with_organization],['دارای مکان',profiles.with_location],['پروفایل کامل',profiles.completeness_high],['غنی‌شده',external.enriched_total],['هویت‌های یکتا',entities.canonical_entities],['Likely Same',decisions.LIKELY_SAME_PERSON??0],['Uncertain',decisions.UNCERTAIN??0]];
  $('intel').innerHTML=cards.map(([label,value,featured])=>`<article class="analysis-card${featured?' featured':''}"><div class="big">${esc(valueOrDash(value))}</div><div class="label">${esc(label)}</div></article>`).join('');
  const groups=[...(INT.possible_duplicates||[]).map(item=>({...item,kind:'تکرار نام'})),...(INT.possible_duplicate_variants||[]).map(item=>({...item,kind:'تفاوت املایی'})),...(INT.possible_duplicate_stable_ids||[]).map(item=>({...item,kind:'شناسه منبع یکسان'}))].slice(0,30);
  $('dupes').innerHTML=groups.length?groups.map(group=>{const names=(group.candidate_indexes||[]).map(index=>people[index]?.name).filter(Boolean);return `<div class="dup"><div class="dup-title"><span>${esc(names.join(' ↔ '))}</span><span class="decision">${esc(group.review_status||'needs_review')}</span></div><div class="meta">${esc(group.kind)}</div></div>`}).join(''):'<div class="empty-state"><strong>تکرار احتمالی شناسایی نشد</strong></div>';
  const pairs=ER.pairs||[];
  $('resolutions').innerHTML=pairs.length?pairs.map(pair=>{const evidence=(pair.evidence||[]).map(item=>`${esc(item.type)}: ${esc(item.result)}${item.score!==undefined?' '+esc(item.score):''}`).join(' · ');return `<article class="resolution"><div class="resolution-title"><span>${esc(pair.name_a)} ↔ ${esc(pair.name_b)}</span><span class="decision">${esc(pair.decision)}</span></div><div class="meta">امتیاز: <b>${esc(pair.score)}</b> · اعتماد: ${esc(pair.confidence)} · بررسی انسانی: ${pair.human_review_required?'بله':'خیر'}</div><div class="meta">${esc(pair.explanation||'')}</div><div class="meta evidence-line">شواهد: ${evidence}</div></article>`}).join(''):'<div class="empty-state"><strong>خروجی حل هویت در دسترس نیست</strong></div>';
  const multi=(ENT.entities||[]).filter(item=>item.record_count>1);
  $('canonical').innerHTML=multi.length?multi.map(entity=>`<div class="entityrow"><div class="dup-title"><span>${esc(entity.primary_name)}</span><span class="decision">${esc(entity.identity_status)}</span></div><div class="meta">Entity ID: ${esc(entity.entity_id)} · رکوردها: ${esc(entity.record_count)}</div><div class="meta">منابع: ${esc((entity.sources||[]).join('، '))}</div><div class="meta">نام‌ها: ${esc((entity.aliases||[]).join(' ↔ '))}</div></div>`).join(''):'<div class="empty-state"><strong>هویت چندرکوردی وجود ندارد</strong></div>';
}

function renderKnowledgeGraph(){
  const metrics=KG.metrics||{},types=metrics.node_types||{},relations=metrics.relations||{};
  const cards=[['گره‌ها',metrics.nodes],['یال‌ها',metrics.edges],['هویت‌ها',types.entity],['سازمان‌ها',types.organization],['مکان‌ها',types.location],['وابستگی سازمانی',relations.AFFILIATED_WITH]];
  $('graphMetrics').innerHTML=cards.map(([label,value])=>`<article class="analysis-card"><div class="big">${esc(valueOrDash(value))}</div><div class="label">${esc(label)}</div></article>`).join('');
  const colors={entity:'#2b63d9',organization:'#15936d',location:'#d18a16',source:'#7957c8',capacity:'#168899',expertise:'#c33c75'};
  const nodes=(KG.preview?.nodes||[]).slice(0,90),edges=(KG.preview?.edges||[]).slice(0,180),byType={};nodes.forEach(node=>(byType[node.type]||(byType[node.type]=[])).push(node));
  const radii={source:65,capacity:115,organization:190,location:250,expertise:285,entity:300},offsets={source:.1,capacity:.6,organization:1.2,location:2.1,expertise:2.8,entity:0},positions={};
  Object.entries(byType).forEach(([type,items])=>items.forEach((node,index)=>{const angle=(offsets[type]||0)+2*Math.PI*index/Math.max(1,items.length),radius=radii[type]||260;positions[node.id]={x:550+radius*Math.cos(angle),y:310+radius*Math.sin(angle)}}));
  let svg='';edges.forEach(edge=>{const from=positions[edge.source],to=positions[edge.target];if(from&&to)svg+=`<line x1="${from.x.toFixed(1)}" y1="${from.y.toFixed(1)}" x2="${to.x.toFixed(1)}" y2="${to.y.toFixed(1)}" stroke="#d8e0eb" stroke-width="1" opacity=".72"><title>${esc(edge.relation)}</title></line>`});
  nodes.forEach(node=>{const position=positions[node.id];if(!position)return;const radius=4+Math.min(7,Math.sqrt(Number(node.degree||0))),color=colors[node.type]||'#64748b',label=String(node.label||'').length>24?`${String(node.label).slice(0,22)}…`:String(node.label||'');svg+=`<g><circle cx="${position.x.toFixed(1)}" cy="${position.y.toFixed(1)}" r="${radius.toFixed(1)}" fill="${color}" opacity=".92"><title>${esc(node.label)} · ${esc(node.type)} · degree ${esc(node.degree||0)}</title></circle>${node.type!=='entity'||Number(node.degree||0)>=5?`<text x="${(position.x+8).toFixed(1)}" y="${(position.y-7).toFixed(1)}" font-size="9" fill="#52647d">${esc(label)}</text>`:''}</g>`});
  $('graphSvg').innerHTML=svg||'<text x="550" y="310" text-anchor="middle" fill="#64748b">داده گراف در دسترس نیست.</text>';
  const hubs=KG.top_hubs||{},hubRows=(items,limit=10)=>(items||[]).slice(0,limit).map(item=>`<div class="hubrow"><span>${esc(item.label)}</span><b>${esc(item.degree)}</b></div>`).join('')||'<div class="empty-state"><small>داده‌ای موجود نیست.</small></div>';
  $('hubOrganizations').innerHTML=hubRows(hubs.organizations);$('hubLocations').innerHTML=hubRows(hubs.locations);$('hubSources').innerHTML=hubRows([...(hubs.sources||[]).slice(0,5),...(hubs.capacity_types||[]).slice(0,5)]);
  $('graphGap').innerHTML=(types.expertise??0)===0?'<div class="gap-note">در Snapshot فعلی داده تخصص ساختاریافته کافی وجود ندارد؛ برای حفظ یکپارچگی داده، گره تخصصی مصنوعی نمایش داده نمی‌شود.</div>':'';
}

function buildOrgs(){
  const orgs=new Map(),hubDegrees=new Map((KG.top_hubs?.organizations||[]).map(item=>[item.label,item.degree]));
  people.forEach(person=>{const name=person._profile?.organization||person.affiliation||person.organization;if(!name)return;const current=orgs.get(name)||{count:0,sources:new Set()};current.count++;if(person.source)current.sources.add(person.source);orgs.set(name,current)});
  const rows=[...orgs.entries()].sort((a,b)=>b[1].count-a[1].count).slice(0,60);
  $('orgs').innerHTML=rows.length?rows.map(([name,data])=>`<article class="org-card"><h3>${esc(name)}</h3><div class="org-stats"><span>${data.count.toLocaleString('fa-IR')} هویت پیوندخورده</span><span>${data.sources.size.toLocaleString('fa-IR')} منبع</span>${hubDegrees.has(name)?`<span>درجه اتصال ${esc(hubDegrees.get(name))}</span>`:''}</div></article>`).join(''):'<div class="empty-state"><strong>اطلاعات سازمانی موجود نیست</strong></div>';
}

function leads(){
  const key='scie_leads',read=()=>readLocalArray(key),draw=()=>{$('leadHistory').innerHTML=read().map(item=>`<div class="lead-item"><strong>${esc(item.type)} · ${esc(item.value)}</strong><small>${esc(item.location||'بدون مکان')} · ${new Date(item.at).toLocaleDateString('fa-IR')}</small>${item.note?`<small>${esc(item.note)}</small>`:''}</div>`).join('')||'<div class="empty-state"><strong>هنوز سرنخی ثبت نشده است</strong><small>اولین سرنخ شما در همین مرورگر ذخیره می‌شود.</small></div>'};
  $('save').addEventListener('click',()=>{const item={type:$('lt').value,value:$('lv').value.trim(),location:$('ll').value.trim(),note:$('ln').value.trim(),at:new Date().toISOString()};if(!item.value){$('leadStatus').textContent='مقدار سرنخ را وارد کنید';return}const items=read();items.unshift(item);localStorage.setItem(key,JSON.stringify(items.slice(0,100)));$('leadStatus').textContent='سرنخ در مرورگر ذخیره شد';$('lv').value='';$('ln').value='';draw()});
  $('export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(read(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='scie-leads.json';anchor.click();URL.revokeObjectURL(url)});draw();
}

function openTab(id){document.querySelectorAll('[data-tab]').forEach(button=>{const active=button.dataset.tab===id;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active))});document.querySelectorAll('.section').forEach(section=>section.classList.toggle('hidden',section.id!==id));window.scrollTo({top:$('metrics').offsetTop-20,behavior:'smooth'})}

function bindEvents(){
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>openTab(button.dataset.tab)));
  document.querySelectorAll('[data-open-tab]').forEach(button=>button.addEventListener('click',()=>openTab(button.dataset.openTab)));
  $('search').addEventListener('submit',event=>{event.preventDefault();q=$('q').value.trim();saveSearch(q);page=1;render();$('history').classList.remove('open')});
  $('q').addEventListener('focus',showHistory);$('q').addEventListener('input',showHistory);
  $('history').addEventListener('click',event=>{const item=event.target.closest('.hist');if(!item)return;$('q').value=item.textContent;q=item.textContent;page=1;render();$('history').classList.remove('open')});
  document.addEventListener('click',event=>{if(!event.target.closest('.search'))$('history').classList.remove('open')});
  $('source').addEventListener('change',event=>{src=event.target.value;page=1;render()});$('reset').addEventListener('click',resetFilters);
  $('prev').addEventListener('click',()=>{if(page>1){page--;render();$('list').scrollIntoView({block:'start'})}});$('next').addEventListener('click',()=>{if(page<Math.ceil(filtered.length/PAGE)){page++;render();$('list').scrollIntoView({block:'start'})}});
  $('list').addEventListener('click',event=>{const row=event.target.closest('.person');if(row)openDetail(people[Number(row.dataset.recordIndex)]);if(event.target.closest('[data-empty-reset]'))resetFilters()});
  $('close').addEventListener('click',closeDetail);document.querySelector('.detail-backdrop').addEventListener('click',closeDetail);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('detail').hidden)closeDetail()});
}

async function boot(){
  bindEvents();loadBuildMeta();
  try{
    await loadData();
    const layerState=await loadLayers();
    applyIntelligence();buildMetrics();statusRows(layerState);setupFilters();buildIntel();renderKnowledgeGraph();buildOrgs();leads();render();
    $('state').className='hero-state ready';$('state').innerHTML=`<span class="pulse"></span>Snapshot فعال · ${people.length.toLocaleString('fa-IR')} رکورد واقعی`;
  }catch(error){
    console.error(error);$('state').className='hero-state error';$('state').textContent='خطا در دریافت Snapshot';$('list').innerHTML=`<div class="error-state"><strong>بارگذاری داده‌های اصلی شکست خورد</strong><small>${esc(error.message)}</small><button class="button subtle" type="button" onclick="location.reload()">تلاش دوباره</button></div>`;$('count').textContent='داده بارگذاری نشد';
  }
}

boot();
