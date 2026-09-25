'use strict';

const PAGE=25;
const CORE_FILES=['intelligence.json','entity_resolution.json','profile_enrichment.json','external_enrichment.json','entities.json','knowledge_graph.json','locality_assessment.json'];
let people=[],filtered=[],page=1,q='',src='all',cat='all',snap={},INT={},ER={},PROFILE={},EXT={},ENT={},KG={},LOC={},SOCIAL={},REL={},BUILD={},MERGES=[],MERGE_REQUESTS=[];
let activePerson=null;
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const FA_DIGITS='۰۱۲۳۴۵۶۷۸۹';
const faDigits=value=>String(value??'').replace(/[0-9]/g,digit=>FA_DIGITS[digit]);
const uiText=value=>String(value??'').replaceAll('کاندیدای کشف از سرنخ','کاندیدای معرفی‌شده به اطلس').replaceAll('سرنخ','معرفی به اطلس');
const PERSIAN_NAME_WORDS={ardakan:'اردکان',ardakani:'اردکانی',ardekani:'اردکانی',ardakanian:'اردکانیان',mohammad:'محمد',mohamad:'محمد',mohammadreza:'محمدرضا',mohammadpanah:'محمدپناه',ali:'علی',alireza:'علیرضا',reza:'رضا',hossein:'حسین',hossain:'حسین',hassan:'حسن',hasan:'حسن',hassanali:'حسن‌علی',seyed:'سید',abbas:'عباس',abolfazl:'ابوالفضل',mostafa:'مصطفی',ahmad:'احمد',ahmadreza:'احمدرضا',mahdi:'مهدی',mehdi:'مهدی',mojtaba:'مجتبی',amir:'امیر',hamid:'حمید',hamidreza:'حمیدرضا',hamed:'حامد',javad:'جواد',mohsen:'محسن',masoud:'مسعود',mahmoud:'محمود',davood:'داوود',ebrahimzadeh:'ابراهیم‌زاده',yadollah:'یدالله',gholamreza:'غلامرضا',zahra:'زهرا',fatemeh:'فاطمه',fateme:'فاطمه',maryam:'مریم',khadijeh:'خدیجه',tahereh:'طاهره',razieh:'راضیه',samira:'سمیرا',soheila:'سهیلا',shabnam:'شبنم',elham:'الهام',zohreh:'زهره',negar:'نگار',pegah:'پگاه',yalda:'یلدا',hasti:'هستی',shiva:'شیوا',sara:'سارا',sina:'سینا',yaser:'یاسر',arash:'آرش',payman:'پیمان',omid:'امید',saeid:'سعید',saeed:'سعید',soheil:'سهیل',vahid:'وحید',sobhan:'سبحان',akbar:'اکبر',adel:'عادل',amin:'امین',jalal:'جلال',shahram:'شهرام',farshad:'فرشاد',ahoo:'آهو',akhtar:'اختر',leili:'لیلی',firozabadi:'فیروزآبادی',ghasempour:'قاسم‌پور',hakimi:'حکیمی',aboutalebi:'ابوطالبی',abouei:'ابوئی',aboyee:'ابوئی',abbasian:'عباسیان',behjati:'بهجتی',kamali:'کمالی',shaker:'شاکر',afkhami:'افخمی',vahedian:'واحدیان',jahanbani:'جهانبانی',hatefi:'هاتفی',dehestani:'دهستانی',fotouhi:'فتوحی',yasini:'یاسینی',yassini:'یاسینی',davari:'داوری',mohiti:'محیطی',talebi:'طالبی',malekafzali:'ملک‌افضلی',mokhtari:'مختاری',tavakoli:'توکلی',ezoddini:'عزالدینی',mahboobi:'محبوبی',mahboubi:'محبوبی',dashti:'دشتی',shams:'شمس',salek:'سالک',taghavi:'تقوی',salahi:'صلاحی',falahi:'فلاحی',fatahi:'فتاحی',fattahi:'فتاحی',haerian:'حائریان',afzali:'افضلی',khodaei:'خدایی',khodaie:'خدایی',jafari:'جعفری',mirabzadeh:'میراب‌زاده',abedi:'عابدی',alemi:'عالمی',anaraki:'انارکی',hakimzadeh:'حکیم‌زاده',ehsani:'احسانی',mazloum:'مظلوم',nazemi:'ناظمی',asadian:'اسدیان',sarafraz:'سرافراز',torabi:'ترابی',piri:'پیری',ahmadi:'احمدی',sharafian:'شرفیان',sadat:'سادات',safaei:'صفایی',safaee:'صفایی',mellat:'ملت',beiki:'بیگی',ghanei:'قانع',adabi:'ادبی',amiri:'امیری',dehghani:'دهقانی',majdzadeh:'مجدزاده',ghazaei:'غذایی',rezaei:'رضایی',malek:'ملک',hosseinzadeh:'حسین‌زاده',roayaei:'رویایی',sahraee:'صحرایی',pourroostaei:'پورروستایی',moeini:'معینی',masoumi:'معصومی',moteallehi:'متعلهی',hafezi:'حافظی',zare:'زارع',ranjbar:'رنجبر',mahdavi:'مهدوی',ziaee:'ضیایی',ghaderi:'قادری',bakhshi:'بخشی',faezeh:'فائزه',paydar:'پایدار',payedar:'پایدار',ghotbzade:'قطب‌زاده'};
const LATIN_INITIALS={a:'ا',b:'ب',c:'س',d:'د',e:'ا',f:'ف',g:'گ',h:'ح',i:'ا',j:'ج',k:'ک',l:'ل',m:'م',n:'ن',o:'ا',p:'پ',q:'ق',r:'ر',s:'س',t:'ت',u:'ی',v:'و',w:'و',x:'اکس',y:'ی',z:'ز'};
function transliterateLatinWord(word){
  const clean=String(word).toLocaleLowerCase('en').replace(/[^a-z]/g,'');if(!clean)return word;
  if(PERSIAN_NAME_WORDS[clean])return PERSIAN_NAME_WORDS[clean];if(clean.length===1)return `${LATIN_INITIALS[clean]||clean}.`;
  const rules=[['tion','شن'],['kh','خ'],['gh','ق'],['sh','ش'],['ch','چ'],['zh','ژ'],['ph','ف'],['th','ت'],['oo','و'],['ou','و'],['ee','ی'],['ei','ی'],['ie','ی'],['ai','ای'],['ay','ای'],['ck','ک']];
  let value=clean;rules.forEach(([latin,fa])=>{value=value.replaceAll(latin,fa)});
  const letters={a:'ا',b:'ب',c:'ک',d:'د',e:'ِ',f:'ف',g:'گ',h:'ه',i:'ی',j:'ج',k:'ک',l:'ل',m:'م',n:'ن',o:'و',p:'پ',q:'ق',r:'ر',s:'س',t:'ت',u:'و',v:'و',w:'و',x:'کس',y:'ی',z:'ز'};
  return [...value].map(char=>letters[char]??char).join('').replace(/ِ+/g,'ِ');
}
function bilingualName(person){
  const original=String(person?.name||'بدون نام').trim(),explicitFa=String(person?.name_fa||person?.persian_name||'').trim();
  const hasLatin=/[A-Za-z]/.test(original);
  const transliterated=original.replace(/[A-Za-z]+/g,part=>transliterateLatinWord(part)).replace(/[\-‐–—]/g,'‌').replace(/_/g,' ').replace(/\s+/g,' ').trim();
  const persian=explicitFa||(hasLatin?transliterated:original);
  return {persian:persian||original,english:hasLatin?original:String(person?.name_en||person?.english_name||'').trim()};
}
const PERSIAN_ORG_WORDS={university:'دانشگاه',college:'کالج',institute:'مؤسسه',institution:'مؤسسه',research:'پژوهش',center:'مرکز',centre:'مرکز',hospital:'بیمارستان',school:'دانشکده',academy:'آکادمی',company:'شرکت',corporation:'شرکت',organization:'سازمان',society:'انجمن',medical:'پزشکی',medicine:'پزشکی',sciences:'علوم',science:'علوم',health:'سلامت',services:'خدمات',technology:'فناوری',technological:'فناوری',engineering:'مهندسی',education:'آموزش',culture:'فرهنگ',social:'اجتماعی',welfare:'رفاه',rehabilitation:'توان‌بخشی',islamic:'اسلامی',azad:'آزاد',national:'ملی',international:'بین‌المللی',iran:'ایران',iranian:'ایرانی',yazd:'یزد',tehran:'تهران',shiraz:'شیراز',kashan:'کاشان',isfahan:'اصفهان',mashhad:'مشهد',kerman:'کرمان',semnan:'سمنان',qom:'قم',zabol:'زابل',ardabil:'اردبیل',ardakan:'اردکان',ardakani:'اردکانی',ardahan:'آرداهان',alberta:'آلبرتا',tasmania:'تاسمانی',michigan:'میشیگان',maryland:'مریلند',california:'کالیفرنیا',irvine:'ارواین',london:'لندن',lund:'لوند',columbia:'کلمبیا',shahid:'شهید',sadoughi:'صدوقی',beheshti:'بهشتی',chamran:'چمران',shahed:'شاهد',sharif:'شریف',ferdowsi:'فردوسی',kharazmi:'خوارزمی',amirkabir:'امیرکبیر',modares:'مدرس',tarbiat:'تربیت',malaya:'مالایا',soil:'خاک',natural:'طبیعی',resources:'منابع',water:'آب',watershed:'آبخیز',management:'مدیریت',conservation:'حفاظت',automation:'اتوماسیون',branch:'واحد',and:'و',of:'',for:'برای'};
const PERSIAN_ORG_PHRASES={'shahid sadoughi university of medical sciences and health services':'دانشگاه علوم پزشکی و خدمات بهداشتی درمانی شهید صدوقی یزد','islamic azad university, yazd':'دانشگاه آزاد اسلامی یزد','university of maryland, college park':'دانشگاه مریلند، کالج پارک','soil conservation and watershed management research':'مرکز پژوهش حفاظت خاک و مدیریت آبخیز','university of social welfare and rehabilitation sciences':'دانشگاه علوم توان‌بخشی و سلامت اجتماعی','academic center for education, culture and research':'جهاد دانشگاهی','international society of automation':'انجمن بین‌المللی اتوماسیون','university of british columbia':'دانشگاه بریتیش کلمبیا','islamic azad university, science and research branch':'دانشگاه آزاد اسلامی، واحد علوم و تحقیقات'};
function bilingualOrganization(value,explicitFa=''){
  const original=String(value||'').trim(),manual=String(explicitFa||'').trim(),key=original.toLocaleLowerCase('en').replace(/\s+/g,' ').trim();
  if(!original&&!manual)return {persian:'',english:''};
  const hasLatin=/[A-Za-z]/.test(original),words=text=>text.replace(/[A-Za-z]+/g,word=>PERSIAN_ORG_WORDS[word.toLocaleLowerCase('en')]??transliterateLatinWord(word)).replace(/\s+,/g,'،').replace(/,/g,'،').replace(/\s+/g,' ').trim();let converted=PERSIAN_ORG_PHRASES[key];
  if(!converted&&hasLatin){let match;if((match=original.match(/^(.+?) University of Medical Sciences(?: and Health Services)?$/i)))converted=`دانشگاه علوم پزشکی ${words(match[1])}`;else if((match=original.match(/^(.+?) University of Technology$/i)))converted=`دانشگاه صنعتی ${words(match[1])}`;else if((match=original.match(/^University of (.+)$/i)))converted=`دانشگاه ${words(match[1])}`;else if((match=original.match(/^(.+?) University$/i)))converted=`دانشگاه ${words(match[1])}`;else if((match=original.match(/^Islamic Azad University,?\s*(.+)$/i)))converted=`دانشگاه آزاد اسلامی ${words(match[1])}`;else converted=words(original)}
  return {persian:manual||(hasLatin?converted:original),english:hasLatin?original:''};
}
const normalizeSearch=value=>String(value??'')
  .normalize('NFKC')
  .replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/ۀ/g,'ه').replace(/ة/g,'ه')
  .replace(/[َُِّْٰٕٔ]/g,'').replace(/[\u200c\u200d\u200e\u200f]/g,' ')
  .replace(/\s+/g,' ').trim().toLocaleLowerCase('fa-IR');
function localizeVisibleDigits(root=document.body){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:node=>{
    const parent=node.parentElement;
    return parent&&!['SCRIPT','STYLE','NOSCRIPT'].includes(parent.tagName)&&/[0-9]/.test(node.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
  }});
  const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(node=>{node.nodeValue=faDigits(node.nodeValue)});
}
function installPersianDigitRendering(){
  localizeVisibleDigits();
  new MutationObserver(mutations=>mutations.forEach(mutation=>{
    if(mutation.type==='characterData')localizeVisibleDigits(mutation.target.parentElement);
    mutation.addedNodes.forEach(node=>localizeVisibleDigits(node.nodeType===Node.TEXT_NODE?node.parentElement:node));
  })).observe(document.body,{subtree:true,childList:true,characterData:true});
}
const readLocalArray=key=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[]}catch{return[]}};
const valueOrDash=value=>value===undefined||value===null||value===''?'—':value;
const statusFa=value=>({needs_review:'نیازمند بازبینی',verified:'تأییدشده',confirmed:'تأییدشده',confirmed_by_human:'تأیید انسانی',probable:'ارتباط محتمل',possible:'ارتباط ضعیف',insufficient:'شواهد ناکافی',rejected_by_human:'ردشده',strong:'قوی',medium:'متوسط',weak:'ضعیف',enriched:'غنی‌شده'}[String(value||'')]||valueOrDash(value));
const ADMIN_API='https://scie-lead-api.scie-builder.workers.dev',relationLabels={family:'خانوادگی',colleague:'همکاری',organization:'هم‌سازمانی',expertise:'حوزه مشترک',education:'علمی / آموزشی',social:'اجتماعی',other:'سایر'};
let pendingAdminAction=null;
const adminToken=()=>localStorage.getItem('scie_admin_token')||'';
const authUser=()=>{try{return JSON.parse(localStorage.getItem('scie_auth_user')||'null')}catch{return null}};
let authMode='login';
function updateAdminUI(){const user=authUser(),loggedIn=Boolean(adminToken()&&user),isAdmin=user?.role==='admin',button=$('adminAccountButton'),global=$('globalAccountButton');if(button){button.textContent=isAdmin?'مدیر وارد شده':loggedIn?'حساب کاربری':'ورود مدیر';button.classList.toggle('logged-in',loggedIn)}if(global){global.textContent=loggedIn?`${user.username} · فعالیت‌های من`:'ورود / ثبت‌نام';global.classList.toggle('logged-in',loggedIn)}document.body.classList.toggle('admin-authenticated',isAdmin)}
function openAdminLogin(action=null){pendingAdminAction=action;$('adminLogin').hidden=false;$('adminLoginStatus').textContent='';$('adminUsername').focus()}
function closeAdminLogin(){$('adminLogin').hidden=true}
async function adminFetch(path,options={}){const response=await fetch(`${ADMIN_API}${path}`,{...options,headers:{'content-type':'application/json','authorization':`Bearer ${adminToken()}`,...options.headers}}),result=await response.json();if(response.status===401){localStorage.removeItem('scie_admin_token');localStorage.removeItem('scie_auth_user');updateAdminUI();throw Error('نشست کاربری معتبر نیست؛ دوباره وارد شوید.')}if(!response.ok)throw Error(result.error||'انجام عملیات ناموفق بود.');return result}
async function loadOverlays(){try{const result=await fetch(`${ADMIN_API}/data/overlays`,{headers:{origin:location.origin}}).then(response=>response.json());(result.overrides||[]).forEach(item=>{if(people[item.record_index])people[item.record_index][item.field]=item.value});REL.relationships=result.relationships||REL.relationships||[];MERGES=result.merges||[];applyMergeLayer()}catch(error){console.warn('overlays unavailable',error)}}
function applyMergeLayer(){
  people.forEach(person=>{delete person._merged_into;delete person._merged_records});
  MERGES.forEach(item=>{const primary=people[Number(item.primary_index)],duplicate=people[Number(item.duplicate_index)];if(!primary||!duplicate||primary===duplicate)return;duplicate._merged_into=primary._record_index;primary._merged_records=primary._merged_records||[];if(!primary._merged_records.includes(duplicate._record_index))primary._merged_records.push(duplicate._record_index);primary.evidence=[...new Set([...(primary.evidence||[]),...(duplicate.evidence||[])])];primary._merged_aliases=[...new Set([...(primary._merged_aliases||[]),duplicate.name,duplicate.name_fa].filter(Boolean))]})
}
async function showAccount(){const panel=$('accountPanel');panel.hidden=false;$('accountSummary').textContent='در حال دریافت فعالیت‌ها…';$('accountActivities').innerHTML='';try{const result=await adminFetch('/me/activity');$('accountSummary').innerHTML=`<strong>${esc(result.user.username)}</strong><span>${result.user.role==='admin'?'مدیر سامانه':'عضو اطلس'}</span>`;$('accountActivities').innerHTML=(result.activities||[]).map(item=>`<article><i>${esc({lead:'＋',feedback:'✓',record_edit:'✎',relationship_add:'⌘',relationship_delete:'×'}[item.kind]||'•')}</i><div><strong>${esc(item.summary)}</strong><small>${esc(new Date(item.created_at).toLocaleString('fa-IR'))}</small></div></article>`).join('')||'<div class="relation-empty">هنوز فعالیتی در حساب شما ثبت نشده است.</div>'}catch(error){$('accountSummary').textContent=error.message}}

async function loadJSON(path,{fallback=true,preferRaw=false}={}){
  const local=new URL(path,location.href),raw=new URL(`https://raw.githubusercontent.com/mrbehzadi-code/scie-builder/main/docs/${path}`);
  const urls=preferRaw?[raw,local]:[local];
  if(fallback&&!preferRaw)urls.push(raw);
  const errors=[];
  for(const url of urls){
    try{url.searchParams.set('v',Date.now());const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error(`HTTP ${response.status}`);return await response.json()}
    catch(error){errors.push(`${url.href}: ${error.message}`)}
  }
  throw Error(errors.join(' | '));
}

async function loadData(){
  const raw=await loadJSON('data.json',{preferRaw:true});
  snap=raw&&raw.content?JSON.parse(raw.content):raw;
  people=Array.isArray(snap.people)?snap.people:Array.isArray(snap.records)?snap.records:Array.isArray(snap)?snap:[];
  if(!people.length)throw Error('Snapshot بدون رکورد است');
}

async function loadLayers(){
  const targets=[['INT','intelligence.json'],['ER','entity_resolution.json'],['PROFILE','profile_enrichment.json'],['EXT','external_enrichment.json'],['ENT','entities.json'],['KG','knowledge_graph.json'],['LOC','locality_assessment.json'],['SOCIAL','social_discovery_report.json'],['REL','relationships.json']];
  const results=await Promise.allSettled(targets.map(([,file])=>loadJSON(file,{preferRaw:true})));
  const state={};
  results.forEach((result,index)=>{const [name,file]=targets[index];if(result.status==='fulfilled'){({INT,ER,PROFILE,EXT,ENT,KG,LOC,SOCIAL,REL}={INT,ER,PROFILE,EXT,ENT,KG,LOC,SOCIAL,REL,[name]:result.value});state[file]=true}else{console.warn(`${file} unavailable:`,result.reason);state[file]=false}});
  return state;
}

function applyIntelligence(){
  (INT.candidate_quality||[]).forEach(item=>{if(Number.isInteger(item.candidate_index)&&people[item.candidate_index])people[item.candidate_index]._quality=item});
  (PROFILE.profiles||[]).forEach(item=>{if(Number.isInteger(item.candidate_index)&&people[item.candidate_index])people[item.candidate_index]._profile=item});
  (EXT.profiles||[]).forEach(item=>{if(Number.isInteger(item.candidate_index)&&people[item.candidate_index])people[item.candidate_index]._external=item});
  (LOC.assessments||[]).forEach(item=>{if(Number.isInteger(item.candidate_index)&&people[item.candidate_index])people[item.candidate_index]._locality=item});
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
    ['نامزد شناسایی‌شده',people.length,'افراد و رکوردهای کاندیدا','♙','#2873e6'],
    ['هویت یکتا',entities.canonical_entities,'پس از حل هویت کانونی','◉','#ed7417'],
    ['سازمان شناسایی‌شده',graph.node_types?.organization??intel.organizations_detected,'گره‌های سازمانی واقعی','▥','#159c58'],
    ['ارتباط در گراف دانش',graph.edges,'یال‌های شواهد ساختاریافته','⌘','#6c2cad']
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
  $('cats').innerHTML='<button type="button" class="chip active" data-c="all">همه</button>'+categories.map(value=>`<button type="button" class="chip" data-c="${esc(value)}">${esc(uiText(value))}</button>`).join('');
  document.querySelectorAll('[data-c]').forEach(button=>button.addEventListener('click',()=>{cat=button.dataset.c;page=1;document.querySelectorAll('[data-c]').forEach(item=>item.classList.toggle('active',item===button));render()}));
}

function searchable(person){
  const localized=bilingualName(person),organization=bilingualOrganization(person.affiliation||person.organization||person._profile?.organization,person.organization_fa||person.affiliation_fa);return normalizeSearch([person.name,localized.persian,localized.english,...(person._merged_aliases||[]),organization.persian,organization.english,person.source,person.type,uiText(person.type),person.detail,person.affiliation,person.organization,person.location,...(person.evidence||[])].filter(Boolean).join(' '));
}

function avatarFor(name=''){
  const parts=String(name).trim().split(/\s+/).filter(Boolean);
  const initials=(parts.length>1?parts[0][0]+parts.at(-1)[0]:parts[0]?.slice(0,2)||'؟').toUpperCase();
  const hue=[...String(name)].reduce((sum,char)=>sum+char.charCodeAt(0),0)%360;
  return {initials,hue};
}

function renderPagination(pages){
  $('pageinfo').textContent=`صفحه ${page.toLocaleString('fa-IR')} از ${pages.toLocaleString('fa-IR')}`;
  $('first').disabled=$('prev').disabled=page===1;
  $('last').disabled=$('next').disabled=page===pages;
  const visible=new Set([1,pages,page-2,page-1,page,page+1,page+2].filter(value=>value>=1&&value<=pages));
  if(pages<=7)for(let value=1;value<=pages;value++)visible.add(value);
  const ordered=[...visible].sort((a,b)=>a-b),parts=[];
  ordered.forEach((value,index)=>{if(index&&value-ordered[index-1]>1)parts.push('<span class="page-ellipsis" aria-hidden="true">…</span>');parts.push(`<button type="button" class="page-number${value===page?' active':''}" data-page="${value}"${value===page?' aria-current="page"':''} aria-label="صفحه ${value.toLocaleString('fa-IR')}">${value.toLocaleString('fa-IR')}</button>`)});
  $('pageNumbers').innerHTML=parts.join('');
}

function render(){
  const query=normalizeSearch(q);
  filtered=people.filter(person=>person._merged_into===undefined&&(!query||searchable(person).includes(query))&&(src==='all'||person.source===src)&&(cat==='all'||person.type===cat));
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE));page=Math.min(Math.max(1,page),pages);
  const start=(page-1)*PAGE,rows=filtered.slice(start,start+PAGE);
  $('count').textContent=`${filtered.length} رکورد`;
  renderPagination(pages);
  if(!rows.length){$('list').innerHTML='<div class="empty-state"><strong>نتیجه‌ای پیدا نشد</strong><small>عبارت جستجو یا فیلترها را تغییر دهید.</small><button type="button" class="button subtle" data-empty-reset>نمایش همه رکوردها</button></div>';return}
  const tableHead='<div class="directory-head" aria-hidden="true"><span>#</span><span>نام و مشخصات</span><span>حوزه و نقش</span><span>سازمان / وابستگی</span><span>کیفیت شواهد</span><span>عملیات</span></div>';
  $('list').innerHTML=tableHead+rows.map((person,index)=>{
    const quality=person._quality||{},profile=person._profile||{},external=person._external||{};
    const organizationSource=person.affiliation||person.organization||profile.organization||'',organization=bilingualOrganization(organizationSource,person.organization_fa||person.affiliation_fa);
    const location=profile.location?.raw||person.location||'';
    const localized=bilingualName(person),avatar=avatarFor(localized.persian);
    const qualityBadge=quality.evidence_strength?`<span class="badge quality ${esc(quality.evidence_strength)}">کیفیت ${esc(quality.score)}</span>`:'';
    const complete=profile.profile_completeness!==undefined?`<span class="badge complete">پروفایل ${esc(profile.profile_completeness)}٪</span>`:'';
    const entity=person._merged_records?.length?`<span class="badge entity">${(person._merged_records.length+1).toLocaleString('fa-IR')} رکورد ادغام‌شده</span>`:person._entity_id?`<span class="badge entity">${person._entity?.record_count>1?'هویت چندرکوردی':'شناسه کانونی'}</span>`:'';
    const enriched=external.status==='enriched'?`<span class="badge enriched">${external.data?.cached?'غنی‌شده · Cache':'غنی‌شده · زنده'}</span>`:'';
    const locality=person._locality||{},localityLabel={confirmed:'اردکانی تأییدشده',confirmed_by_human:'تأیید انسانی',probable:'ارتباط محتمل',possible:'ارتباط ضعیف',insufficient:'شاهد ناکافی',rejected_by_human:'ردشده در بازبینی'}[locality.status]||'';
    const localityBadge=localityLabel?`<span class="badge ${locality.status==='rejected_by_human'?'weak':locality.status.includes('confirmed')?'strong':'medium'}">${localityLabel} · ${esc(locality.score||0)}</span>`:'';
    return `<div class="person" role="button" tabindex="0" data-record-index="${person._record_index}"><span class="no">${start+index+1}</span><span class="person-main"><span class="avatar" style="--avatar-hue:${avatar.hue}">${esc(avatar.initials)}</span><span class="identity"><span class="name">${esc(localized.persian)}</span>${localized.english?`<span class="name-latin" lang="en" dir="ltr">${esc(localized.english)}</span>`:''}<span class="person-sub">${esc(person.source||'منبع نامشخص')}</span></span></span><span class="person-role"><span>${esc(uiText(person.type||'کاندیدا'))}</span><small>${profile.work_count!==undefined?`${esc(profile.work_count)} اثر ثبت‌شده`:'ظرفیت شناسایی‌شده'}</small></span><span class="person-context"><span>${esc(organization.persian||'سازمان نامشخص')}</span>${organization.english?`<small class="org-latin" lang="en" dir="ltr">${esc(organization.english)}</small>`:''}${location&&location!=='—'?`<small>${esc(location)}</small>`:''}</span><span class="badges">${localityBadge}${qualityBadge}${complete}${entity}${enriched}</span><span class="row-actions"><button type="button" data-action="view" title="مشاهده جزئیات" aria-label="مشاهده جزئیات">◉</button><button type="button" data-action="save" title="نشان‌کردن" aria-label="نشان‌کردن">♡</button><button type="button" data-action="more" title="گزینه‌های بیشتر" aria-label="گزینه‌های بیشتر">•••</button></span></div>`;
  }).join('');
}

function resetFilters(){q='';src='all';cat='all';page=1;$('q').value='';$('source').value='all';document.querySelectorAll('[data-c]').forEach(item=>item.classList.toggle('active',item.dataset.c==='all'));render()}
function saveSearch(value){if(!value)return;let history=readLocalArray('scie_search_history').filter(item=>item!==value);history.unshift(value);localStorage.setItem('scie_search_history',JSON.stringify(history.slice(0,30)))}
function showHistory(){const history=readLocalArray('scie_search_history');$('history').innerHTML=history.map(value=>`<div class="hist" role="button" tabindex="0">${esc(value)}</div>`).join('');$('history').classList.toggle('open',document.activeElement===$('q')&&history.length>0)}

function field(label,value){return value===undefined||value===null||value===''?'':`<div class="detail-field"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`}
function fieldAlways(label,value){return `<div class="detail-field"><span>${esc(label)}</span><strong>${esc(valueOrDash(value))}</strong></div>`}
function editableField(label,value,key){return `<button type="button" class="detail-field editable-field" data-edit-key="${esc(key)}"><span>${esc(label)} <i>ویرایش</i></span><strong>${esc(valueOrDash(value))}</strong></button>`}
function detailSection(title,fields){const body=fields.filter(Boolean).join('');return body?`<section class="detail-section"><h3>${esc(title)}</h3><div class="detail-grid">${body}</div></section>`:''}
function openDetail(person){
  if(!person)return;
  activePerson=person;
  const profile=person._profile||{},ids=profile.identifiers||{},location=profile.location||{},external=person._external?.data||{},quality=person._quality||{},entity=person._entity||{},locality=person._locality||{};
  const externalOrganizations=Array.isArray(external.institutions)?external.institutions.join('، '):Array.isArray(external.last_known_institutions)?external.last_known_institutions.map(item=>item?.name).filter(Boolean).join('، '):external.company||'';
  const topics=Array.isArray(external.topics)?external.topics.map(item=>item?.name).filter(Boolean).join('، '):'';
  const localized=bilingualName(person),organizationSource=person.affiliation||person.organization||profile.organization||'',organization=bilingualOrganization(organizationSource,person.organization_fa||person.affiliation_fa),avatar=avatarFor(localized.persian),qualityScore=Math.max(0,Math.min(100,Number(quality.score||0))),localityScore=Math.max(0,Math.min(100,Number(locality.score||0))),completeness=Math.max(0,Math.min(100,Number(profile.profile_completeness||0)));
  $('dname').innerHTML=`${esc(localized.persian)}${localized.english?`<small class="detail-name-latin" lang="en" dir="ltr">${esc(localized.english)}</small>`:''}`;
  $('dAvatar').style.setProperty('--avatar-hue',avatar.hue);$('dAvatar').textContent=avatar.initials;
  $('dOrgHeadline').innerHTML=`${esc(organization.persian||'وابستگی سازمانی ثبت نشده')}${organization.english?`<small lang="en" dir="ltr">${esc(organization.english)}</small>`:''}`;
  $('dsummary').innerHTML=[`<span class="badge profile-type">${esc(uiText(person.type||'کاندیدا'))}</span>`,quality.evidence_strength?`<span class="badge quality ${esc(quality.evidence_strength)}">شواهد ${esc(statusFa(quality.evidence_strength))}</span>`:'',`<span class="badge ${locality.status?.includes('confirmed')?'strong':'medium'}">${esc(statusFa(locality.status))}</span>`].join('');
  $('dTrust').innerHTML=`<div class="trust-ring" style="--score:${qualityScore}"><strong>${faDigits(qualityScore)}</strong><span>از ۱۰۰</span></div><b>امتیاز اعتماد</b><small>${esc(statusFa(quality.evidence_strength))}</small>`;
  $('dQuickStats').innerHTML=[['آثار علمی',profile.work_count??external.works_count??'—','▣'],['کامل‌بودن پروفایل',`${completeness}٪`,'◔'],['ارتباط با اردکان',`${localityScore}٪`,'⌖'],['شواهد ثبت‌شده',(person.evidence||[]).length,'◆']].map(([label,value,icon])=>`<div><i>${icon}</i><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('');
  $('dmeta').innerHTML=[
    detailSection('هویت',[editableField('نام فارسی',localized.persian,'name_fa'),editableField('نام در منبع',localized.english||person.name,'name'),editableField('نوع / ظرفیت',uiText(person.type),'type'),editableField('منبع',person.source,'source'),field('ارائه‌دهنده',profile.provider),editableField('وضعیت هویت',statusFa(quality.verification||person.verification||entity.identity_status),'verification')]),
    detailSection('سازمان و مکان',[editableField('نام فارسی سازمان',organization.persian,'organization_fa'),editableField('نام سازمان در منبع',organization.english||organizationSource,'affiliation'),editableField('مکان',location.raw||person.location,'location'),field('سازمان در منبع خارجی',externalOrganizations),field('مکان در منبع خارجی',external.location)]),
    detailSection('کیفیت شواهد',[field('کیفیت شواهد',quality.score!==undefined?`${quality.score} / 100 · ${quality.evidence_strength}`:''),field('کامل بودن پروفایل',profile.profile_completeness!==undefined?`${profile.profile_completeness}٪`:''),field('تعداد آثار علمی',profile.work_count??external.works_count),field('استنادها',external.cited_by_count)]),
    detailSection('ارتباط با اردکان',[field('امتیاز ارتباط محلی',locality.score!==undefined?`${locality.score} / 100`:''),field('وضعیت',statusFa(locality.status)),field('نیازمند بررسی انسانی',locality.needs_human_review?'بله':'خیر'),field('شواهد امتیازدهی',(locality.reasons||[]).map(item=>item.signal).join('، '))]),
    detailSection('شناسه‌ها',[fieldAlways('Entity ID',person._entity_id),fieldAlways('OpenAlex ID',ids.openalex_id),fieldAlways('GitHub username',ids.github_username||external.login),fieldAlways('ORCID',ids.orcid||external.orcid),field('تعداد رکورد در هویت',entity.record_count)]),
    detailSection('غنی‌سازی',[field('وضعیت داده تکمیلی',person._external?.status==='enriched'?(external.cached?'Cache معتبر':'Live provider'):''),field('نام در منبع',external.display_name),field('حوزه‌ها',topics),field('مخازن عمومی',external.public_repos),field('به‌روزرسانی منبع',external.updated_at)]),
    detailSection('جزئیات',[editableField('شرح',person.detail,'detail'),editableField('نشانی منبع',person.url||person.source_url,'url'),field('فیلدهای ناقص',(profile.missing_fields||[]).join('، '))])
  ].join('');
  $('devidence').innerHTML=(person.evidence||[]).map(item=>`<span>${esc(item)}</span>`).join('');
  const url=person.url||person.source_url;$('durl').hidden=!url;$('durl').href=url||'#';
  $('verifyPerson').dataset.recordIndex=person._record_index;
  renderProfileRelations(person);
  $('detail').hidden=false;document.body.classList.add('modal-open');$('close').focus();
}
function closeDetail(){$('detail').hidden=true;activePerson=null;document.body.classList.remove('modal-open')}

function updateRecordInMemory(recordIndex,changes){
  const index=Number(recordIndex),record=Number.isInteger(index)?people[index]:null;
  if(!record)return null;
  Object.assign(record,changes);
  if(activePerson&&activePerson!==record&&Number(activePerson._record_index)===index)Object.assign(activePerson,changes);
  return record;
}

function refreshRecordViews(record,{message=''}={}){
  if(!record)return;
  render();
  buildOrgs();
  buildIntel();
  renderKnowledgeGraph();
  if(!$('detail').hidden){
    openDetail(record);
    if(message)$('adminEditStatus').textContent=message;
  }
}

async function editRecordField(key){
  if(!activePerson)return;
  if(!adminToken()){openAdminLogin(()=>editRecordField(key));return}
  if(authUser()?.role!=='admin'){$('adminEditStatus').textContent='ویرایش رکورد فقط برای مدیر سامانه فعال است.';return}
  const current={name_fa:bilingualName(activePerson).persian,name:activePerson.name,type:activePerson.type,source:activePerson.source,verification:activePerson.verification,organization_fa:activePerson.organization_fa||activePerson.affiliation_fa||bilingualOrganization(activePerson.affiliation||activePerson.organization||activePerson._profile?.organization).persian,affiliation:activePerson.affiliation||activePerson.organization||activePerson._profile?.organization,location:activePerson.location,detail:activePerson.detail,url:activePerson.url||activePerson.source_url}[key]||'';
  const next=prompt('مقدار جدید را وارد کنید:',current);if(next===null||next.trim()===String(current).trim())return;
  const recordIndex=Number(activePerson._record_index),previous=activePerson[key],pendingMessage='تغییر اعمال شد؛ در حال ذخیرهٔ دائمی…',record=updateRecordInMemory(recordIndex,{[key]:next.trim()});
  refreshRecordViews(record,{message:pendingMessage});
  try{
    const result=await adminFetch('/admin/record',{method:'POST',body:JSON.stringify({record_index:recordIndex,changes:{[key]:next.trim()}})}),saved=updateRecordInMemory(recordIndex,result.changes||{[key]:next.trim()});
    refreshRecordViews(saved,{message:'تغییر با موفقیت ذخیره شد و هم‌زمان در فهرست اصلی، جستجو و پروفایل اعمال شد.'});
  }catch(error){const restored=updateRecordInMemory(recordIndex,{[key]:previous});refreshRecordViews(restored,{message:`ذخیره ناموفق بود و تغییر بازگردانده شد: ${error.message}`})}
}

function renderProfileRelations(person){
  const index=person._record_index,sourceOrg=normalizeSearch(person.affiliation||person.organization||person._profile?.organization||''),seen=new Set(),connections=[];
  (REL.relationships||[]).forEach(rel=>{const a=Number(rel.person_a_index),b=Number(rel.person_b_index);if(a!==index&&b!==index)return;const other=a===index?b:a;if(!people[other]||seen.has(other))return;seen.add(other);connections.push({index:other,type:rel.type||'other',note:rel.note||relationLabels[rel.type],manual:true,id:rel.id})});
  if(sourceOrg)people.forEach((candidate,candidateIndex)=>{if(candidateIndex===index||seen.has(candidateIndex)||connections.length>=8)return;const org=normalizeSearch(candidate.affiliation||candidate.organization||candidate._profile?.organization||'');if(org&&org===sourceOrg){seen.add(candidateIndex);connections.push({index:candidateIndex,type:'organization',note:'وابستگی سازمانی مشترک'})}});
  people.forEach((candidate,candidateIndex)=>{if(candidateIndex===index||seen.has(candidateIndex)||connections.length>=10)return;if(candidate.type&&candidate.type===person.type){seen.add(candidateIndex);connections.push({index:candidateIndex,type:'expertise',note:'حوزه فعالیت مشابه'})}});
  const center=bilingualName(person),items=connections.map(item=>{const candidate=people[item.index],name=bilingualName(candidate),avatar=avatarFor(name.persian);return `<article class="relation-node relation-${esc(item.type)}" data-related-index="${item.index}"><div class="relation-avatar" style="--avatar-hue:${avatar.hue}">${esc(avatar.initials)}</div><div><strong>${esc(name.persian)}</strong>${name.english?`<small lang="en" dir="ltr">${esc(name.english)}</small>`:''}<span>${esc(relationLabels[item.type]||'ارتباط')} · ${esc(item.note||'')}</span></div>${item.manual&&authUser()?.role==='admin'?`<button type="button" data-delete-relation="${esc(item.id)}" aria-label="حذف ارتباط">×</button>`:''}</article>`}).join('');
  $('dRelations').innerHTML=`<div class="relation-center"><b>${esc(center.persian)}</b><span>${connections.length.toLocaleString('fa-IR')} ارتباط نمایشی</span></div><div class="relation-connections">${items||'<div class="relation-empty">هنوز ارتباط مستقیمی برای این فرد ثبت نشده است.</div>'}</div>`;
  $('relationPerson').innerHTML=people.map((candidate,candidateIndex)=>candidateIndex===index?'':`<option value="${candidateIndex}">${esc(bilingualName(candidate).persian)}</option>`).join('');
}

async function saveRelationship(event){event.preventDefault();if(!activePerson)return;if(!adminToken()){openAdminLogin(()=>saveRelationship(new Event('submit')));return}if(authUser()?.role!=='admin'){$('relationStatus').textContent='ویرایش گراف فقط برای مدیر سامانه مجاز است.';return}const other=Number($('relationPerson').value),payload={person_a_index:activePerson._record_index,person_b_index:other,type:$('relationType').value,note:$('relationNote').value.trim()},temporary={...payload,id:`pending-${Date.now()}`};REL.relationships=REL.relationships||[];REL.relationships.push(temporary);renderProfileRelations(activePerson);$('relationEditor').hidden=true;$('relationStatus').textContent='ارتباط اعمال شد؛ در حال ذخیره…';try{const result=await adminFetch('/admin/relationship',{method:'POST',body:JSON.stringify(payload)});Object.assign(temporary,result.relationship);renderProfileRelations(activePerson);$('relationStatus').textContent='ارتباط با موفقیت ذخیره شد.'}catch(error){REL.relationships=REL.relationships.filter(item=>item!==temporary);renderProfileRelations(activePerson);$('relationStatus').textContent=error.message}}

function buildIntel(){
  const metrics=INT.metrics||{},decisions=ER.decision_counts||{},profiles=PROFILE.metrics||{},external=EXT.metrics||{},entities=ENT.metrics||{};
  const cards=[['هویت‌های فعال',people.filter(person=>person._merged_into===undefined).length,true],['ادغام‌های قطعی',MERGES.length],['کیفیت قوی',metrics.quality_strong],['کیفیت متوسط',metrics.quality_medium],['کیفیت ضعیف',metrics.quality_weak],['اقلام شواهد',metrics.evidence_items],['دارای سازمان',profiles.with_organization],['دارای مکان',profiles.with_location],['پروفایل کامل',profiles.completeness_high],['غنی‌شده',external.enriched_total],['Likely Same',decisions.LIKELY_SAME_PERSON??0],['Uncertain',decisions.UNCERTAIN??0]];
  $('intel').innerHTML=cards.map(([label,value,featured])=>`<article class="analysis-card${featured?' featured':''}"><div class="big">${esc(valueOrDash(value))}</div><div class="label">${esc(label)}</div></article>`).join('');
  const applied=new Set(MERGES.map(item=>Number(item.duplicate_index))),groups=[...(INT.possible_duplicate_stable_ids||[]).map(item=>({...item,kind:'شناسه منبع کاملاً یکسان',confidence:100,automatic:true})),...(INT.possible_duplicates||[]).map(item=>({...item,kind:'نام کاملاً یکسان',confidence:88})),...(INT.possible_duplicate_variants||[]).map(item=>({...item,kind:'شباهت املایی نام',confidence:72}))].filter(group=>(group.candidate_indexes||[]).some(index=>!applied.has(Number(index)))).slice(0,40);
  $('mergeSummary').textContent=`${MERGES.length.toLocaleString('fa-IR')} ادغام اعمال‌شده · ${groups.length.toLocaleString('fa-IR')} مورد پیشنهادی`;
  $('dupes').innerHTML=groups.length?groups.map(group=>{const indexes=(group.candidate_indexes||[]).filter(index=>people[index]&&!applied.has(Number(index))),primary=indexes[0],duplicate=indexes[1];if(primary===undefined||duplicate===undefined)return '';const first=people[primary],second=people[duplicate],a=bilingualName(first),b=bilingualName(second),orgA=bilingualOrganization(first.affiliation||first.organization||first._profile?.organization,first.organization_fa).persian,orgB=bilingualOrganization(second.affiliation||second.organization||second._profile?.organization,second.organization_fa).persian;return `<article class="duplicate-card"><div class="duplicate-score"><strong>${Number(group.confidence||0).toLocaleString('fa-IR')}٪</strong><span>${group.automatic?'قطعی':'احتمال تکرار'}</span></div><div class="duplicate-people"><div><b>${esc(a.persian)}</b><small>${esc(a.english||'')} · ${esc(orgA||'سازمان نامشخص')}</small></div><i>⇄</i><div><b>${esc(b.persian)}</b><small>${esc(b.english||'')} · ${esc(orgB||'سازمان نامشخص')}</small></div></div><div class="duplicate-reason"><span>${esc(group.kind)}</span><small>${esc(group.reason||'مقایسه نام، سازمان و شناسه‌های منبع')}</small></div><button class="button ${authUser()?.role==='admin'?'primary':'subtle'}" type="button" data-merge-primary="${primary}" data-merge-duplicate="${duplicate}" data-merge-confidence="${Number(group.confidence||0)}" data-merge-reason="${esc(group.kind)}">${authUser()?.role==='admin'?'ادغام رکوردها':'پیشنهاد ادغام'}</button></article>`}).join(''):'<div class="empty-state"><strong>همه موارد قطعی یکپارچه شده‌اند</strong><small>در حال حاضر مورد بررسی‌نشده‌ای وجود ندارد.</small></div>';
  const pairs=ER.pairs||[];
  $('resolutions').innerHTML=pairs.length?pairs.map(pair=>{const evidence=(pair.evidence||[]).map(item=>`${esc(item.type)}: ${esc(item.result)}${item.score!==undefined?' '+esc(item.score):''}`).join(' · '),nameA=bilingualName({name:pair.name_a}).persian,nameB=bilingualName({name:pair.name_b}).persian;return `<article class="resolution"><div class="resolution-title"><span>${esc(nameA)} ↔ ${esc(nameB)}</span><span class="decision">${esc(pair.decision)}</span></div><div class="meta">امتیاز: <b>${esc(pair.score)}</b> · اعتماد: ${esc(pair.confidence)} · بررسی انسانی: ${pair.human_review_required?'بله':'خیر'}</div><div class="meta">${esc(pair.explanation||'')}</div><div class="meta evidence-line">شواهد: ${evidence}</div></article>`}).join(''):'<div class="empty-state"><strong>خروجی حل هویت در دسترس نیست</strong></div>';
  const multi=(ENT.entities||[]).filter(item=>item.record_count>1);
  $('canonical').innerHTML=multi.length?multi.map(entity=>`<div class="entityrow"><div class="dup-title"><span>${esc(bilingualName({name:entity.primary_name}).persian)}</span><span class="decision">${esc(entity.identity_status)}</span></div><div class="meta">Entity ID: ${esc(entity.entity_id)} · رکوردها: ${esc(entity.record_count)}</div><div class="meta">منابع: ${esc((entity.sources||[]).join('، '))}</div><div class="meta">نام‌ها: ${esc((entity.aliases||[]).map(name=>bilingualName({name}).persian).join(' ↔ '))}</div></div>`).join(''):'<div class="empty-state"><strong>هویت چندرکوردی وجود ندارد</strong></div>';
}

function renderMergeQueue(){
  const user=authUser(),rows=user?.role==='admin'?MERGE_REQUESTS.filter(item=>item.status==='pending'):MERGE_REQUESTS;
  if(!user){$('mergeQueue').innerHTML='<div class="merge-login-note">برای پیشنهاد ادغام و مشاهده نتیجه بررسی‌ها وارد حساب شوید.</div>';return}
  $('mergeQueue').innerHTML=rows.length?rows.map(item=>{const a=people[Number(item.primary_index)],b=people[Number(item.duplicate_index)],status={pending:'در انتظار تأیید مدیر',approved:'تأیید و اعمال شد',applied:'اعمال شد',rejected:'رد شد'}[item.status]||item.status;return `<article class="merge-request"><div><strong>${esc(a?bilingualName(a).persian:`رکورد ${item.primary_index}`)} ← ${esc(b?bilingualName(b).persian:`رکورد ${item.duplicate_index}`)}</strong><small>${esc(item.reason||'بدون توضیح')} · پیشنهاددهنده: ${esc(item.proposed_by_name||'کاربر')}</small></div><span class="merge-request-status ${esc(item.status)}">${esc(status)}</span>${user.role==='admin'&&item.status==='pending'?`<div class="merge-review-actions"><button type="button" data-merge-review="approve" data-merge-id="${esc(item.id)}">تأیید و ادغام</button><button type="button" data-merge-review="reject" data-merge-id="${esc(item.id)}">رد</button></div>`:''}</article>`}).join(''):'<div class="merge-login-note">پیشنهاد ادغام در انتظار بررسی وجود ندارد.</div>';
}
async function loadMergeRequests(){if(!adminToken()){MERGE_REQUESTS=[];renderMergeQueue();return}try{const result=await adminFetch('/merges');MERGE_REQUESTS=result.requests||[];renderMergeQueue()}catch(error){$('mergeStatus').textContent=error.message}}
async function submitMerge(primary,duplicate,confidence,reason){
  if(!adminToken()){openAdminLogin(()=>submitMerge(primary,duplicate,confidence,reason));return}
  const a=people[primary],b=people[duplicate];if(!a||!b)return;
  const isAdmin=authUser()?.role==='admin',message=isAdmin?`رکورد «${bilingualName(b).persian}» در «${bilingualName(a).persian}» ادغام شود؟`:`پیشنهاد ادغام «${bilingualName(b).persian}» با «${bilingualName(a).persian}» برای بررسی مدیر ارسال شود؟`;
  if(!confirm(message))return;$('mergeStatus').textContent=isAdmin?'در حال ادغام امن رکوردها…':'در حال ثبت پیشنهاد برای مدیر…';
  try{const result=await adminFetch('/merges/propose',{method:'POST',body:JSON.stringify({primary_index:primary,duplicate_index:duplicate,confidence,reason,evidence:{name_a:a.name,name_b:b.name,source_a:a.source,source_b:b.source}})});if(result.status==='applied'){MERGES.push({primary_index:primary,duplicate_index:duplicate,request_id:result.request?.id,merged_by:authUser().username,merged_at:new Date().toISOString()});applyMergeLayer();render();buildIntel();$('mergeStatus').textContent='ادغام با موفقیت اعمال شد؛ رکورد تکراری از فهرست حذف و اطلاعات آن به رکورد اصلی پیوند خورد.'}else $('mergeStatus').textContent=result.duplicate?'این پیشنهاد قبلاً ثبت شده و در انتظار بررسی مدیر است.':'پیشنهاد ثبت شد و پس از تأیید مدیر اعمال می‌شود.';await loadMergeRequests()}catch(error){$('mergeStatus').textContent=error.message}
}
async function reviewMergeRequest(id,action){$('mergeStatus').textContent=action==='approve'?'در حال اعمال ادغام…':'در حال رد پیشنهاد…';try{const result=await adminFetch('/admin/merge',{method:'POST',body:JSON.stringify({id,action})});if(result.merge){MERGES.push(result.merge);applyMergeLayer();render();buildIntel()}$('mergeStatus').textContent=action==='approve'?'پیشنهاد تأیید و ادغام فوراً اعمال شد.':'پیشنهاد ادغام رد شد.';await loadMergeRequests()}catch(error){$('mergeStatus').textContent=error.message}}

function renderKnowledgeGraph(){
  const metrics=KG.metrics||{},types=metrics.node_types||{},relations=metrics.relations||{};
  const cards=[['گره‌ها',metrics.nodes],['یال‌ها',metrics.edges],['هویت‌ها',types.entity],['سازمان‌ها',types.organization],['مکان‌ها',types.location],['وابستگی سازمانی',relations.AFFILIATED_WITH]];
  $('graphMetrics').innerHTML=cards.map(([label,value])=>`<article class="analysis-card"><div class="big">${esc(valueOrDash(value))}</div><div class="label">${esc(label)}</div></article>`).join('');
  const colors={entity:'#2b63d9',organization:'#15936d',location:'#d18a16',source:'#7957c8',capacity:'#168899',expertise:'#c33c75'};
  const nodes=(KG.preview?.nodes||[]).slice(0,90),edges=(KG.preview?.edges||[]).slice(0,180),byType={};nodes.forEach(node=>(byType[node.type]||(byType[node.type]=[])).push(node));
  const radii={source:65,capacity:115,organization:190,location:250,expertise:285,entity:300},offsets={source:.1,capacity:.6,organization:1.2,location:2.1,expertise:2.8,entity:0},positions={};
  Object.entries(byType).forEach(([type,items])=>items.forEach((node,index)=>{const angle=(offsets[type]||0)+2*Math.PI*index/Math.max(1,items.length),radius=radii[type]||260;positions[node.id]={x:550+radius*Math.cos(angle),y:310+radius*Math.sin(angle)}}));
  let svg='';edges.forEach(edge=>{const from=positions[edge.source],to=positions[edge.target];if(from&&to)svg+=`<line x1="${from.x.toFixed(1)}" y1="${from.y.toFixed(1)}" x2="${to.x.toFixed(1)}" y2="${to.y.toFixed(1)}" stroke="#d8e0eb" stroke-width="1" opacity=".72"><title>${esc(edge.relation)}</title></line>`});
  nodes.forEach(node=>{const position=positions[node.id];if(!position)return;const radius=4+Math.min(7,Math.sqrt(Number(node.degree||0))),color=colors[node.type]||'#64748b',rawLabel=uiText(node.label||''),fullLabel=node.type==='entity'?bilingualName({name:rawLabel}).persian:rawLabel,label=fullLabel.length>24?`${fullLabel.slice(0,22)}…`:fullLabel;svg+=`<g><circle cx="${position.x.toFixed(1)}" cy="${position.y.toFixed(1)}" r="${radius.toFixed(1)}" fill="${color}" opacity=".92"><title>${esc(fullLabel)} · ${esc(node.type)} · degree ${esc(node.degree||0)}</title></circle>${node.type!=='entity'||Number(node.degree||0)>=5?`<text x="${(position.x+8).toFixed(1)}" y="${(position.y-7).toFixed(1)}" font-size="9" fill="#52647d">${esc(label)}</text>`:''}</g>`});
  $('graphSvg').innerHTML=svg||'<text x="550" y="310" text-anchor="middle" fill="#64748b">داده گراف در دسترس نیست.</text>';
  const hubs=KG.top_hubs||{},hubRows=(items,limit=10)=>(items||[]).slice(0,limit).map(item=>`<div class="hubrow"><span>${esc(uiText(item.label))}</span><b>${esc(item.degree)}</b></div>`).join('')||'<div class="empty-state"><small>داده‌ای موجود نیست.</small></div>';
  $('hubOrganizations').innerHTML=hubRows(hubs.organizations);$('hubLocations').innerHTML=hubRows(hubs.locations);$('hubSources').innerHTML=hubRows([...(hubs.sources||[]).slice(0,5),...(hubs.capacity_types||[]).slice(0,5)]);
  $('graphGap').innerHTML=(types.expertise??0)===0?'<div class="gap-note">در Snapshot فعلی داده تخصص ساختاریافته کافی وجود ندارد؛ برای حفظ یکپارچگی داده، گره تخصصی مصنوعی نمایش داده نمی‌شود.</div>':'';
}

function buildOrgs(){
  const orgs=new Map(),hubDegrees=new Map((KG.top_hubs?.organizations||[]).map(item=>[item.label,item.degree]));
  people.forEach(person=>{if(person._merged_into!==undefined)return;const name=person.affiliation||person.organization||person._profile?.organization;if(!name)return;const current=orgs.get(name)||{count:0,sources:new Set()};current.count++;if(person.source)current.sources.add(person.source);orgs.set(name,current)});
  const rows=[...orgs.entries()].sort((a,b)=>b[1].count-a[1].count).slice(0,60);
  $('orgs').innerHTML=rows.length?rows.map(([name,data])=>`<article class="org-card"><h3>${esc(name)}</h3><div class="org-stats"><span>${data.count.toLocaleString('fa-IR')} هویت پیوندخورده</span><span>${data.sources.size.toLocaleString('fa-IR')} منبع</span>${hubDegrees.has(name)?`<span>درجه اتصال ${esc(hubDegrees.get(name))}</span>`:''}</div></article>`).join(''):'<div class="empty-state"><strong>اطلاعات سازمانی موجود نیست</strong></div>';
}

function setupVerification(){
  const api='https://scie-lead-api.scie-builder.workers.dev/feedback',options=people.map((person,index)=>{const localized=bilingualName(person);return `<option value="${index}">${esc(localized.persian)}${localized.english?` — ${esc(localized.english)}`:''} — ${esc(person.source||'منبع نامشخص')}</option>`}).join('');
  $('vrPerson').innerHTML=options;$('relA').innerHTML=options;$('relB').innerHTML=options;
  if(people.length>1)$('relB').selectedIndex=1;
  const counts=LOC.counts||{},cards=[['تأییدشده',Number(counts.confirmed||0)+Number(counts.confirmed_by_human||0)],['محتمل',counts.probable||0],['نیازمند بررسی',Number(counts.possible||0)+Number(counts.insufficient||0)],['ردشده با بازبینی انسانی',counts.rejected_by_human||0]];
  $('localitySummary').innerHTML=cards.map(([label,value])=>`<article class="analysis-card"><div class="big">${Number(value).toLocaleString('fa-IR')}</div><div class="label">${label}</div></article>`).join('');
  const send=async(payload,statusId,button)=>{button.disabled=true;$(statusId).textContent='در حال ثبت امن…';try{const response=await fetch(api,{method:'POST',headers:{'content-type':'application/json','x-idempotency-key':`${payload.kind}-${payload.id}`,...(adminToken()?{'authorization':`Bearer ${adminToken()}`}:{})},body:JSON.stringify(payload)}),result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'ثبت بازخورد ناموفق بود.');$(statusId).textContent='ثبت شد؛ نتیجه پس از پردازش خودکار در داده‌ها و گراف اعمال می‌شود.'}catch(error){$(statusId).textContent=error.message}finally{button.disabled=false}};
  const sourceRows=SOCIAL.restricted_or_unusable||[],attempts=SOCIAL.outbound_public_profiles||{};
  $('sourceReviewCount').textContent=`${sourceRows.length.toLocaleString('fa-IR')} مورد قابل بازبینی · ایتا ${Number(attempts.eitaa||0).toLocaleString('fa-IR')} · اینستاگرام ${Number(attempts.instagram||0).toLocaleString('fa-IR')}`;
  $('sourceReviewQueue').innerHTML=sourceRows.length?sourceRows.map((item,index)=>`<article class="source-review-item" data-source-review="${index}"><span class="platform">${esc(item.platform)}</span><a class="source-url" href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.url)}</a><button class="button subtle" type="button" data-source-select="${index}">انتخاب</button><small>${esc(item.result||'نیازمند بررسی انسانی')}</small></article>`).join(''):'<div class="empty-state"><strong>مورد حل‌نشده‌ای موجود نیست</strong></div>';
  $('sourceReviewQueue').addEventListener('click',event=>{const button=event.target.closest('[data-source-select]');if(!button)return;const index=Number(button.dataset.sourceSelect),item=sourceRows[index];if(!item)return;$('sourceReviewUrl').value=item.url;$('sourceReviewUrl').dataset.platform=item.platform;document.querySelectorAll('.source-review-item').forEach(row=>row.classList.toggle('selected',Number(row.dataset.sourceReview)===index));$('sourceReviewNote').focus()});
  $('sourceReviewSubmit').addEventListener('click',async()=>{const url=$('sourceReviewUrl').value,button=$('sourceReviewSubmit'),platform=$('sourceReviewUrl').dataset.platform||'',verdict=$('sourceReviewVerdict').value,note=$('sourceReviewNote').value.trim(),id=Date.now();if(!url){$('sourceReviewStatus').textContent='ابتدا یک نشانی را از فهرست انتخاب کنید.';return}if(!$('sourceReviewConsent').checked){$('sourceReviewStatus').textContent='برای ثبت، تأیید انتشار عمومی و نبود اطلاعات خصوصی لازم است.';return}button.disabled=true;$('sourceReviewStatus').textContent='در حال ثبت نتیجه…';try{let response=await fetch(api,{method:'POST',headers:{'content-type':'application/json','x-idempotency-key':`source-review-${id}`},body:JSON.stringify({id,kind:'source_review',source_url:url,platform,verdict,note})}),result=await response.json();if(!response.ok||!result.ok){response=await fetch('https://scie-lead-api.scie-builder.workers.dev',{method:'POST',headers:{'content-type':'application/json','x-idempotency-key':`source-review-fallback-${id}`},body:JSON.stringify({id,type:'free',type_label:'اعتبارسنجی منبع اجتماعی',value:note||url,location:'اردکان',note:`پلتفرم: ${platform} · نتیجه: ${verdict} · منبع عمومی: ${url}`})});result=await response.json()}if(!response.ok||!result.ok)throw Error(result.error||'ثبت نتیجه ناموفق بود.');$('sourceReviewStatus').textContent='ثبت شد؛ این مورد در صف پردازش و بازبینی منابع قرار گرفت.';$('sourceReviewNote').value=''}catch(error){$('sourceReviewStatus').textContent=error.message}finally{button.disabled=false}});
  $('vrSubmit').addEventListener('click',()=>{if(!$('vrConsent').checked){$('vrStatus').textContent='برای ثبت، تأیید انتشار عمومی و نبود اطلاعات خصوصی لازم است.';return}const index=Number($('vrPerson').value),person=people[index];if(!person)return;send({id:Date.now(),kind:'locality_review',record_index:index,person_name:person.name,verdict:$('vrVerdict').value,reason:$('vrReason').value,note:$('vrNote').value.trim()},'vrStatus',$('vrSubmit'))});
  $('relSubmit').addEventListener('click',()=>{if(!$('relConsent').checked){$('relStatus').textContent='برای ثبت، تأیید آگاهانهٔ انتشار عمومی لازم است.';return}const a=people[Number($('relA').value)],b=people[Number($('relB').value)];if(!a||!b||a===b){$('relStatus').textContent='دو فرد متفاوت را انتخاب کنید.';return}send({id:Date.now(),kind:'relationship',person_a:a.name,person_b:b.name,relation:$('relType').value,note:$('relNote').value.trim()},'relStatus',$('relSubmit'))});
}

async function leads(){
  const key='scie_leads',read=()=>readLocalArray(key),typeMap={'نام یا فرد':'person','فامیلی':'surname','نشانی / محله':'address','سازمان / شرکت':'organization','تخصص / حوزه':'expertise','توضیح آزاد':'free','سرنخ آزاد':'free'};
  const api='https://scie-lead-api.scie-builder.workers.dev';
  let remote=await loadJSON('lead_runs.json',{preferRaw:true}).catch(()=>({runs:[]}));
  const notifyButton=$('notify'),notificationSupported='Notification'in window;
  const updateNotifyButton=()=>{const active=notificationSupported&&Notification.permission==='granted';notifyButton.textContent=active?'اعلان پایان فعال است ✓':'فعال‌سازی اعلان پایان';notifyButton.disabled=!notificationSupported||Notification.permission==='denied'};
  const announce=item=>{const run=findRun(item),added=Number(run?.new_records||0),message=added?`${added.toLocaleString('fa-IR')} نامزد جدید به فهرست اضافه شد.`:'بررسی کامل شد؛ نتیجهٔ تازه‌ای پیدا نشد.';let toast=document.querySelector('.completion-toast');if(!toast){toast=document.createElement('div');toast.className='completion-toast';toast.setAttribute('role','alert');document.body.appendChild(toast)}toast.innerHTML=`<strong>بررسی معرفی «${esc(item.value)}» تمام شد</strong><small>${esc(message)}</small>`;toast.hidden=false;clearTimeout(toast._timer);toast._timer=setTimeout(()=>toast.hidden=true,9000);if(notificationSupported&&Notification.permission==='granted')new Notification('بررسی معرفی به اطلس تمام شد',{body:`${item.value} — ${message}`,tag:`scie-lead-${item.id}`})};
  const findRun=item=>[...(remote.runs||[])].reverse().find(run=>Number(run.lead_id)===Number(item.id)||(item.issue_number&&Number(run.issue_number)===Number(item.issue_number)))||[...(remote.runs||[])].reverse().find(run=>String(run.value||'').trim().toLocaleLowerCase('fa')===String(item.value||'').trim().toLocaleLowerCase('fa'));
  let pollTimer=null;
  const pending=()=>read().some(item=>item.status!=='failed'&&!findRun(item));
  const draw=()=>{$('leadHistory').innerHTML=read().map(item=>{const run=findRun(item),failed=item.status==='failed',done=run?.status==='completed',added=Number(run?.new_records||0),state=done?'تکمیل‌شده':failed?'ارسال ناموفق':item.status==='submitting'?'در حال ارسال':'در حال بررسی',finished=done&&run.completed_at?new Date(run.completed_at).toLocaleString('fa-IR'):'';return `<div class="lead-item"><div class="lead-item-head"><strong>${esc(item.type_label||item.type)} · ${esc(item.value)}</strong><span class="lead-state ${done?'done':'pending'}">${state}</span></div><small>${esc(item.location||'بدون مکان')} · ${new Date(item.at||item.created_at).toLocaleString('fa-IR')}</small>${done?`<small class="lead-result">${added?`${esc(added)} نامزد جدید به فهرست افزوده شد`:'بررسی کامل شد؛ نتیجهٔ تازه‌ای پیدا نشد'}${finished?` · پایان: ${esc(finished)}`:''}</small>`:''}${!done&&!failed?'<small>وضعیت هر ۱۰ ثانیه خودکار بررسی می‌شود.</small>':''}${failed?`<small class="lead-result">${esc(item.error||'ارسال ناموفق بود؛ دوباره تلاش کنید.')}</small>`:''}${item.note?`<small>${esc(item.note)}</small>`:''}</div>`}).join('')||'<div class="empty-state"><strong>هنوز معرفی‌ای ثبت نشده است</strong><small>نخستین پیشنهاد را برای جستجو و اعتبارسنجی ثبت کنید.</small></div>'};
  const refresh=async()=>{const before=new Set(read().filter(findRun).map(item=>item.id));remote=await loadJSON(`lead_runs.json?t=${Date.now()}`,{preferRaw:true}).catch(()=>remote);const completed=read().filter(item=>findRun(item)&&!before.has(item.id));draw();if(completed.length){$('leadStatus').textContent=`پردازش «${completed[0].value}» تمام شد و نتیجه در فهرست ثبت شد.`;completed.forEach(announce)}if(!pending()&&pollTimer){clearInterval(pollTimer);pollTimer=null}};
  const startPolling=()=>{if(!pollTimer&&pending())pollTimer=setInterval(refresh,10000)};
  $('save').addEventListener('click',async()=>{
    const label=$('lt').value,value=$('lv').value.trim(),location=$('ll').value.trim(),note=$('ln').value.trim(),at=new Date().toISOString();
    if(!value){$('leadStatus').textContent='موضوع معرفی را وارد کنید';return}
    const payload={id:Date.now(),type:typeMap[label]||'free',type_label:label,value,location,note,created_at:at};
    const button=$('save'),item={...payload,type:label,at,status:'submitting'},items=read().filter(old=>old.value!==value);items.unshift(item);localStorage.setItem(key,JSON.stringify(items.slice(0,100)));button.disabled=true;$('leadStatus').textContent='در حال ارسال امن و آغاز پردازش…';draw();
    try{
      const response=await fetch(api,{method:'POST',headers:{'content-type':'application/json','x-idempotency-key':String(payload.id),...(adminToken()?{'authorization':`Bearer ${adminToken()}`}:{})},body:JSON.stringify(payload)}),result=await response.json();
      if(!response.ok||!result.ok)throw new Error(result.error||'ثبت معرفی ناموفق بود.');
      const saved=read(),current=saved.find(old=>old.id===payload.id);if(current){current.status='submitted';current.issue_number=result.issue_number;localStorage.setItem(key,JSON.stringify(saved))}
      $('leadStatus').textContent='معرفی ثبت شد؛ جستجو و اعتبارسنجی خودکار آغاز شد.';$('lv').value='';$('ln').value='';draw();startPolling();
    }catch(error){const saved=read(),current=saved.find(old=>old.id===payload.id);if(current){current.status='failed';current.error=error.message;localStorage.setItem(key,JSON.stringify(saved))}$('leadStatus').textContent=error.message;draw()}
    finally{button.disabled=false}
  });
  notifyButton.addEventListener('click',async()=>{if(!notificationSupported){$('leadStatus').textContent='مرورگر شما اعلان سیستم را پشتیبانی نمی‌کند.';return}const permission=await Notification.requestPermission();updateNotifyButton();$('leadStatus').textContent=permission==='granted'?'اعلان پایان پردازش فعال شد.':'اجازهٔ اعلان داده نشد؛ اعلان داخل داشبورد همچنان نمایش داده می‌شود.'});
  $('export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(read(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='scie-leads.json';anchor.click();URL.revokeObjectURL(url)});updateNotifyButton();draw();startPolling();window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
}

function openTab(id){document.querySelectorAll('[data-tab]').forEach(button=>{const active=button.dataset.tab===id;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active))});document.querySelectorAll('.section').forEach(section=>section.classList.toggle('hidden',section.id!==id));window.scrollTo({top:$('metrics').offsetTop-20,behavior:'smooth'})}

function bindEvents(){
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>openTab(button.dataset.tab)));
  document.querySelectorAll('[data-open-tab]').forEach(button=>button.addEventListener('click',()=>openTab(button.dataset.openTab)));
  const revealResults=focusFilters=>{const target=focusFilters?document.querySelector('.filters'):document.querySelector('.directory');target?.scrollIntoView({block:focusFilters?'center':'start',behavior:'smooth'});if(focusFilters){target.classList.remove('filter-attention');void target.offsetWidth;target.classList.add('filter-attention');setTimeout(()=>target.classList.remove('filter-attention'),1400);$('source').focus()}};
  $('heroFilters').addEventListener('click',()=>{openTab('people');setTimeout(()=>revealResults(true),180)});
  document.querySelectorAll('[data-query]').forEach(button=>button.addEventListener('click',()=>{$('q').value=button.dataset.query;q=button.dataset.query;saveSearch(q);page=1;render();$('list').scrollIntoView({block:'start',behavior:'smooth'})}));
  $('search').addEventListener('submit',event=>{event.preventDefault();q=$('q').value.trim();saveSearch(q);page=1;render();$('history').classList.remove('open');revealResults(false)});
  let searchTimer;
  $('q').addEventListener('focus',showHistory);$('q').addEventListener('input',()=>{showHistory();clearTimeout(searchTimer);searchTimer=setTimeout(()=>{q=$('q').value.trim();page=1;render()},180)});
  $('history').addEventListener('click',event=>{const item=event.target.closest('.hist');if(!item)return;$('q').value=item.textContent;q=item.textContent;page=1;render();$('history').classList.remove('open')});
  document.addEventListener('click',event=>{if(!event.target.closest('.search'))$('history').classList.remove('open')});
  $('source').addEventListener('change',event=>{src=event.target.value;page=1;render()});$('reset').addEventListener('click',resetFilters);
  $('verifyPerson').addEventListener('click',()=>{const index=$('verifyPerson').dataset.recordIndex;closeDetail();openTab('verification');$('vrPerson').value=index;$('vrPerson').focus()});
  $('dmeta').addEventListener('click',event=>{const target=event.target.closest('[data-edit-key]');if(target)editRecordField(target.dataset.editKey)});
  $('adminAccountButton').addEventListener('click',()=>{if(adminToken())showAccount();else openAdminLogin()});$('globalAccountButton').addEventListener('click',()=>{if(adminToken())showAccount();else openAdminLogin()});
  document.querySelectorAll('[data-auth-mode]').forEach(button=>button.addEventListener('click',()=>{authMode=button.dataset.authMode;document.querySelectorAll('[data-auth-mode]').forEach(item=>item.classList.toggle('active',item===button));$('adminLoginTitle').textContent=authMode==='register'?'ساخت حساب کاربری':'ورود به سامانه';$('authSubmit').textContent=authMode==='register'?'ثبت‌نام و ورود':'ورود به سامانه';$('adminPassword').setAttribute('autocomplete',authMode==='register'?'new-password':'current-password');$('adminLoginStatus').textContent=''}));
  $('adminLoginForm').addEventListener('submit',async event=>{event.preventDefault();const status=$('adminLoginStatus');status.textContent=authMode==='register'?'در حال ساخت حساب…':'در حال ورود…';try{const response=await fetch(`${ADMIN_API}/auth/${authMode}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:$('adminUsername').value.trim(),password:$('adminPassword').value})}),result=await response.json();if(!response.ok)throw Error(result.error||'ورود ناموفق بود.');localStorage.setItem('scie_admin_token',result.token);localStorage.setItem('scie_auth_user',JSON.stringify(result.user));updateAdminUI();closeAdminLogin();buildIntel();loadMergeRequests();const action=pendingAdminAction;pendingAdminAction=null;if(activePerson)renderProfileRelations(activePerson);if(action)setTimeout(action,0)}catch(error){status.textContent=error.message}});
  $('closeAdminLogin').addEventListener('click',closeAdminLogin);document.querySelector('.admin-login-backdrop').addEventListener('click',closeAdminLogin);
  $('closeAccountPanel').addEventListener('click',()=>{$('accountPanel').hidden=true});document.querySelector('.account-panel-backdrop').addEventListener('click',()=>{$('accountPanel').hidden=true});$('accountLogout').addEventListener('click',()=>{localStorage.removeItem('scie_admin_token');localStorage.removeItem('scie_auth_user');MERGE_REQUESTS=[];$('accountPanel').hidden=true;updateAdminUI();buildIntel();renderMergeQueue();if(activePerson)renderProfileRelations(activePerson)});
  $('dupes').addEventListener('click',event=>{const button=event.target.closest('[data-merge-primary]');if(button)submitMerge(Number(button.dataset.mergePrimary),Number(button.dataset.mergeDuplicate),Number(button.dataset.mergeConfidence),button.dataset.mergeReason)});
  $('mergeQueue').addEventListener('click',event=>{const button=event.target.closest('[data-merge-review]');if(button)reviewMergeRequest(button.dataset.mergeId,button.dataset.mergeReview)});$('refreshMerges').addEventListener('click',loadMergeRequests);
  $('addRelation').addEventListener('click',()=>{if(!adminToken()){openAdminLogin(()=>{$('relationEditor').hidden=false});return}$('relationEditor').hidden=false;$('relationNote').focus()});$('cancelRelation').addEventListener('click',()=>{$('relationEditor').hidden=true});$('relationEditor').addEventListener('submit',saveRelationship);
  $('dRelations').addEventListener('click',async event=>{const remove=event.target.closest('[data-delete-relation]');if(remove){event.stopPropagation();const id=remove.dataset.deleteRelation,previous=[...(REL.relationships||[])];REL.relationships=previous.filter(item=>String(item.id)!==String(id));renderProfileRelations(activePerson);try{await adminFetch('/admin/relationship',{method:'POST',body:JSON.stringify({action:'delete',id})})}catch(error){REL.relationships=previous;renderProfileRelations(activePerson);$('relationStatus').textContent=error.message}return}const node=event.target.closest('[data-related-index]');if(node)openDetail(people[Number(node.dataset.relatedIndex)])});
  const goToPage=target=>{const pages=Math.max(1,Math.ceil(filtered.length/PAGE)),nextPage=Math.min(Math.max(1,target),pages);if(nextPage===page)return;page=nextPage;render();$('list').scrollIntoView({block:'start',behavior:'smooth'})};
  $('first').addEventListener('click',()=>goToPage(1));$('prev').addEventListener('click',()=>goToPage(page-1));$('next').addEventListener('click',()=>goToPage(page+1));$('last').addEventListener('click',()=>goToPage(Math.ceil(filtered.length/PAGE)));
  $('pageNumbers').addEventListener('click',event=>{const button=event.target.closest('[data-page]');if(button)goToPage(Number(button.dataset.page))});
  $('list').addEventListener('click',event=>{
    const row=event.target.closest('.person'),action=event.target.closest('[data-action]');
    if(action?.dataset.action==='save'){action.classList.toggle('saved');action.textContent=action.classList.contains('saved')?'♥':'♡';return}
    if(row)openDetail(people[Number(row.dataset.recordIndex)]);
    if(event.target.closest('[data-empty-reset]'))resetFilters();
  });
  $('list').addEventListener('keydown',event=>{const row=event.target.closest('.person');if(row&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openDetail(people[Number(row.dataset.recordIndex)])}});
  $('close').addEventListener('click',closeDetail);document.querySelector('.detail-backdrop').addEventListener('click',closeDetail);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('detail').hidden)closeDetail()});
}

async function boot(){
  installPersianDigitRendering();bindEvents();updateAdminUI();loadBuildMeta();
  try{
    await loadData();
    const layerState=await loadLayers();
    applyIntelligence();await loadOverlays();buildMetrics();statusRows(layerState);setupFilters();buildIntel();renderKnowledgeGraph();buildOrgs();setupVerification();await leads();render();await loadMergeRequests();
    $('state').className='hero-state ready';$('state').innerHTML=`<span class="pulse"></span>Snapshot فعال · ${people.filter(person=>person._merged_into===undefined).length.toLocaleString('fa-IR')} هویت یکتا`;
  }catch(error){
    console.error(error);$('state').className='hero-state error';$('state').textContent='خطا در دریافت Snapshot';$('list').innerHTML=`<div class="error-state"><strong>بارگذاری داده‌های اصلی شکست خورد</strong><small>${esc(error.message)}</small><button class="button subtle" type="button" onclick="location.reload()">تلاش دوباره</button></div>`;$('count').textContent='داده بارگذاری نشد';
  }
}

boot();
