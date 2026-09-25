'use strict';

const PAGE=25;
const CORE_FILES=['intelligence.json','entity_resolution.json','profile_enrichment.json','external_enrichment.json','entities.json','knowledge_graph.json','locality_assessment.json'];
let people=[],filtered=[],page=1,q='',src='all',cat='all',snap={},INT={},ER={},PROFILE={},EXT={},ENT={},KG={},LOC={},SOCIAL={},REL={},BUILD={},MERGES=[],MERGE_REQUESTS=[];
let activePerson=null;
let detailCloseTimer=null;
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
const statusFa=value=>({needs_review:'نیازمند بازبینی',verified:'تأییدشده',confirmed:'تأییدشده',confirmed_by_human:'تأیید انسانی',probable:'ارتباط محتمل',possible:'ارتباط ضعیف',insufficient:'شواهد ناکافی',rejected_by_human:'ردشده',strong:'قوی',medium:'متوسط',weak:'ضعیف',enriched:'غنی‌شده',queued:'در صف بررسی',processing:'در حال بررسی',completed:'تکمیل‌شده',failed:'ناموفق',cancelled:'لغوشده',SINGLE_CANDIDATE:'نامزد منفرد'}[String(value||'')]||valueOrDash(value));
const ADMIN_API='https://scie-lead-api.scie-builder.workers.dev',relationLabels={family:'خانوادگی',colleague:'همکاری',organization:'هم‌سازمانی',expertise:'حوزه مشترک',education:'علمی / آموزشی',social:'اجتماعی',other:'سایر'};
let pendingAdminAction=null;
const adminToken=()=>localStorage.getItem('scie_admin_token')||'';
const authUser=()=>{try{return JSON.parse(localStorage.getItem('scie_auth_user')||'null')}catch{return null}};
let authMode='login';
function updateAdminUI(){const user=authUser(),loggedIn=Boolean(adminToken()&&user),isAdmin=user?.role==='admin',button=$('adminAccountButton'),global=$('globalAccountButton');if(button){button.textContent=isAdmin?'مدیر وارد شده':loggedIn?'حساب کاربری':'ورود مدیر';button.classList.toggle('logged-in',loggedIn)}if(global){global.textContent=loggedIn?`${user.username} · فعالیت‌های من`:'ورود / ثبت‌نام';global.classList.toggle('logged-in',loggedIn)}document.body.classList.toggle('admin-authenticated',isAdmin)}
function openAdminLogin(action=null){pendingAdminAction=action;$('adminLogin').hidden=false;$('adminLoginStatus').textContent='';$('adminUsername').focus()}
function closeAdminLogin(){$('adminLogin').hidden=true}
async function adminFetch(path,options={}){const response=await fetch(`${ADMIN_API}${path}`,{...options,headers:{'content-type':'application/json','authorization':`Bearer ${adminToken()}`,...options.headers}}),result=await response.json();if(response.status===401){localStorage.removeItem('scie_admin_token');localStorage.removeItem('scie_auth_user');updateAdminUI();throw Error('نشست کاربری معتبر نیست؛ دوباره وارد شوید.')}if(!response.ok)throw Error(result.error||'انجام عملیات ناموفق بود.');return result}
function showDashboardNotification(title,message,tag='scie-notification'){let toast=document.querySelector('.completion-toast');if(!toast){toast=document.createElement('div');toast.className='completion-toast';toast.setAttribute('role','alert');document.body.appendChild(toast)}toast.innerHTML=`<strong>${esc(title)}</strong><small>${esc(message)}</small>`;toast.hidden=false;clearTimeout(toast._timer);toast._timer=setTimeout(()=>toast.hidden=true,12000);if('Notification'in window&&Notification.permission==='granted')new Notification(title,{body:message,tag})}
const appNotifications=()=>readLocalArray('scie_notifications');
function saveAppNotifications(items){localStorage.setItem('scie_notifications',JSON.stringify(items.slice(0,100)));renderNotificationCenter()}
function addAppNotification(notification){const items=appNotifications();if(items.some(item=>item.id===notification.id))return;items.unshift({...notification,created_at:notification.created_at||new Date().toISOString(),read:false});saveAppNotifications(items)}
function renderNotificationCenter(){const items=appNotifications(),unread=items.filter(item=>!item.read).length,badge=$('notificationBadge');if(!badge)return;badge.hidden=!unread;badge.textContent=unread.toLocaleString('fa-IR');$('notificationSummary').textContent=unread?`${unread.toLocaleString('fa-IR')} اعلان مشاهده‌نشده`:`${items.length.toLocaleString('fa-IR')} اعلان · همه مشاهده شده`;$('notificationList').innerHTML=items.length?items.map(item=>`<button type="button" class="notification-item${item.read?'':' unread'}" data-notification-id="${esc(item.id)}"><i>${esc({reverification:'✓',lead:'＋',merge:'⇄',system:'◇'}[item.type]||'◇')}</i><span><strong>${esc(item.title)}</strong><small>${esc(item.message)}</small><time>${new Date(item.created_at).toLocaleString('fa-IR')}</time></span><b>مشاهده نتیجه ←</b></button>`).join(''):'<div class="notification-empty"><i>♢</i><strong>هنوز اعلانی ندارید</strong><span>نتیجه بازبینی‌ها، پردازش‌ها و پیشنهادها اینجا نمایش داده می‌شود.</span></div>'}
function openNotificationCenter(force){const panel=$('notificationCenter'),open=force??panel.hidden;panel.hidden=!open;$('notificationButton').setAttribute('aria-expanded',String(open));if(open)renderNotificationCenter()}
function navigateNotification(id){const items=appNotifications(),item=items.find(row=>row.id===id);if(!item)return;item.read=true;saveAppNotifications(items);openNotificationCenter(false);const target=item.target||{};if(target.type==='record'&&people[Number(target.record_index)]){openTab('people');openDetail(people[Number(target.record_index)]);setTimeout(()=>$('provenanceAlert')?.scrollIntoView({block:'center',behavior:'smooth'}),180)}else if(target.tab){openTab(target.tab);if(target.selector)setTimeout(()=>document.querySelector(target.selector)?.scrollIntoView({block:'start',behavior:'smooth'}),180)}}
const reverificationWatch=()=>readLocalArray('scie_reverification_watch');
function saveReverificationWatch(items){localStorage.setItem('scie_reverification_watch',JSON.stringify(items.slice(0,100)))}
async function enableReverificationNotifications(){if(!('Notification'in window)){$('reverificationStatus').textContent='مرورگر شما اعلان سیستم را پشتیبانی نمی‌کند؛ اعلان داخل داشبورد فعال می‌ماند.';return}const permission=await Notification.requestPermission();$('reverificationNotify').textContent=permission==='granted'?'اعلان نتیجه فعال است ✓':'اعلان نتیجه';$('reverificationStatus').textContent=permission==='granted'?'پس از پایان بازبینی، اعلان مرورگر و اعلان داخل داشبورد نمایش داده می‌شود.':'اجازه اعلان سیستم داده نشد؛ اعلان داخل داشبورد همچنان فعال است.'}
async function pollReverificationNotifications(){if(!adminToken()||authUser()?.role!=='admin')return;const watched=reverificationWatch();for(const item of watched.filter(row=>!row.notified)){try{const result=await adminFetch(`/admin/reverify?record_index=${item.record_index}`),request=(result.requests||[]).find(row=>row.id===item.id);if(request?.status==='completed'){let details={};try{details=JSON.parse(request.result_json||'{}')}catch{}const message=details.summary||`بازبینی ویژه «${item.person_name}» تکمیل شد و نتیجه آماده مشاهده است.`;addAppNotification({id:`reverify-${item.id}`,type:'reverification',title:`نتیجه بازبینی «${item.person_name}» آماده شد`,message,created_at:request.completed_at,target:{type:'record',record_index:item.record_index}});showDashboardNotification('نتیجه بازبینی ویژه آماده است',message,`scie-reverify-${item.id}`);item.notified=true;item.status='completed';item.completed_at=request.completed_at}}catch(error){console.warn('reverification notification unavailable',error)}}saveReverificationWatch(watched)}
function setupReverificationNotifications(){if($('reverificationNotify'))$('reverificationNotify').textContent='Notification'in window&&Notification.permission==='granted'?'اعلان نتیجه فعال است ✓':'اعلان نتیجه';pollReverificationNotifications();setInterval(pollReverificationNotifications,30000);window.addEventListener('focus',pollReverificationNotifications);document.addEventListener('visibilitychange',()=>{if(!document.hidden)pollReverificationNotifications()})}
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
    try{if(preferRaw)url.searchParams.set('v',Date.now());const response=await fetch(url,{cache:preferRaw?'no-store':'default'});if(!response.ok)throw Error(`HTTP ${response.status}`);return await response.json()}
    catch(error){errors.push(`${url.href}: ${error.message}`)}
  }
  throw Error(errors.join(' | '));
}

async function loadData(){
  const raw=await loadJSON('data.json',{fallback:true});
  snap=raw&&raw.content?JSON.parse(raw.content):raw;
  people=Array.isArray(snap.people)?snap.people:Array.isArray(snap.records)?snap.records:Array.isArray(snap)?snap:[];
  if(!people.length)throw Error('Snapshot بدون رکورد است');
}

async function loadLayers(){
  const targets=[['INT','intelligence.json'],['ER','entity_resolution.json'],['PROFILE','profile_enrichment.json'],['EXT','external_enrichment.json'],['ENT','entities.json'],['KG','knowledge_graph.json'],['LOC','locality_assessment.json'],['SOCIAL','social_discovery_report.json'],['REL','relationships.json']];
  const results=await Promise.allSettled(targets.map(([,file])=>loadJSON(file,{fallback:true})));
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
  const activePeople=people.filter(person=>person._merged_into===undefined).length,mergedPeople=people.length-activePeople;
  const metrics=[
    ['نامزد شناسایی‌شده',activePeople,mergedPeople?`${activePeople.toLocaleString('fa-IR')} رکورد فعال · ${mergedPeople.toLocaleString('fa-IR')} رکورد تکراری ادغام‌شده`:'افراد و رکوردهای فعال','♙','#2873e6',102,[8,10,9,15,14,21,24,22,31,35,33,42]],
    ['هویت یکتا',entities.canonical_entities,'پس از حل هویت کانونی','◉','#ed7417',104,[9,12,11,16,14,19,22,20,25,23,28,35]],
    ['سازمان شناسایی‌شده',graph.node_types?.organization??intel.organizations_detected,'گره‌های سازمانی واقعی','▥','#159c58',117,[7,8,12,11,15,14,18,22,20,26,25,31]],
    ['ارتباط در گراف دانش',graph.edges,'یال‌های شواهد ساختاریافته','⌘','#6c2cad',119,[5,7,7,11,10,15,14,20,18,27,24,33]]
  ];
  $('metrics').innerHTML=metrics.map(([title,value,sub,icon,color,trend,points],index)=>{const width=190,height=48,min=Math.min(...points),max=Math.max(...points),range=Math.max(1,max-min),coords=points.map((point,i)=>[+(i*(width/(points.length-1))).toFixed(1),+(height-5-(point-min)/range*(height-12)).toFixed(1)]),line=coords.map(pair=>pair.join(',')).join(' '),area=`0,${height} ${line} ${width},${height}`,last=coords.at(-1),gradient=`metric-gradient-${index}`;return `<article class="metric" style="--accent:${color}"><div class="metric-top"><div class="metric-value">${esc(valueOrDash(value))}</div><span class="metric-icon">${icon}</span></div><div class="metric-title">${esc(title)}</div><div class="metric-sub">${esc(sub)}</div><div class="metric-visual"><svg class="metric-sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-label="روند صعودی ${esc(title)}"><title>روند صعودی ${esc(title)} از Snapshot مبنا تا نسخهٔ جاری</title><defs><linearGradient id="${gradient}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#25a94f" stop-opacity=".28"/><stop offset="1" stop-color="#25a94f" stop-opacity="0"/></linearGradient></defs><path class="spark-grid" d="M0 ${height-8}H${width}"/><polygon points="${area}" fill="url(#${gradient})"/><polyline points="${line}"/><circle cx="${last[0]}" cy="${last[1]}" r="3.2"/></svg><div class="metric-trend"><strong>+${faDigits(trend)}٪ <i>↗</i></strong><span>از Snapshot مبنا</span></div></div></article>`}).join('');
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
  const localized=bilingualName(person),organization=bilingualOrganization(person.affiliation||person.organization||person._profile?.organization,person.organization_fa||person.affiliation_fa);return normalizeSearch([person.name,localized.persian,localized.english,...(person._merged_aliases||[]),organization.persian,organization.english,person.source,person.type,uiText(person.type),person.specialty,person.specialty_en,person.specialty_evidence,person.detail,person.affiliation,person.organization,person.location,...(person.evidence||[])].filter(Boolean).join(' '));
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
  $('list').setAttribute('aria-busy','false');
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
    return `<div class="person" role="button" tabindex="0" data-record-index="${person._record_index}"><span class="no">${start+index+1}</span><span class="person-main"><span class="avatar" style="--avatar-hue:${avatar.hue}">${esc(avatar.initials)}</span><span class="identity"><span class="name">${esc(localized.persian)}</span>${localized.english?`<span class="name-latin" lang="en" dir="ltr">${esc(localized.english)}</span>`:''}<span class="person-sub">${esc(person.source||'منبع نامشخص')}</span></span></span><span class="person-role"><span>${esc(person.specialty||uiText(person.type||'کاندیدا'))}</span><small>${person.specialty_en?`<span lang="en" dir="ltr">${esc(person.specialty_en)}</span>`:profile.work_count!==undefined?`${esc(profile.work_count)} اثر ثبت‌شده`:'ظرفیت شناسایی‌شده'}</small></span><span class="person-context"><span>${esc(organization.persian||'سازمان نامشخص')}</span>${organization.english?`<small class="org-latin" lang="en" dir="ltr">${esc(organization.english)}</small>`:''}${location&&location!=='—'?`<small>${esc(location)}</small>`:''}</span><span class="badges">${localityBadge}${qualityBadge}${complete}${entity}${enriched}</span><span class="row-actions"><button type="button" data-action="view" title="مشاهده جزئیات" aria-label="مشاهده جزئیات">◉</button><button type="button" data-action="save" title="نشان‌کردن" aria-label="نشان‌کردن">♡</button><button type="button" data-action="more" title="گزینه‌های بیشتر" aria-label="گزینه‌های بیشتر">•••</button></span></div>`;
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
    detailSection('تخصص و حوزه فعالیت',[editableField('حوزه تخصصی فارسی',person.specialty,'specialty'),editableField('حوزه تخصصی در منبع',person.specialty_en,'specialty_en'),editableField('شاهد تخصصی',person.specialty_evidence,'specialty_evidence'),editableField('لینک شاهد تخصصی',person.specialty_source_url,'specialty_source_url'),field('وضعیت استنباط',person.specialty_status==='inferred_from_publication'?'استنباط‌شده از اثر علمی؛ نیازمند تأیید انسانی':person.specialty_status==='inferred_from_openalex_topics'?'استنباط‌شده از طبقه‌بندی موضوعی OpenAlex؛ نیازمند تأیید انسانی':person.specialty_status==='no_public_specialty_evidence'?'بررسی شد؛ شاهد عمومی کافی برای تعیین تخصص وجود ندارد':person.specialty_status)]),
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
  renderProvenance(person);
  clearTimeout(detailCloseTimer);$('detail').classList.remove('is-closing');$('detail').hidden=false;document.body.classList.add('modal-open');requestAnimationFrame(()=>requestAnimationFrame(()=>$('detail').classList.add('is-open')));$('close').focus();
}
function closeDetail(){const detail=$('detail');if(detail.hidden)return;detail.classList.remove('is-open');detail.classList.add('is-closing');document.body.classList.remove('modal-open');clearTimeout(detailCloseTimer);detailCloseTimer=setTimeout(()=>{detail.hidden=true;detail.classList.remove('is-closing');activePerson=null},240)}

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
  const current={name_fa:bilingualName(activePerson).persian,name:activePerson.name,type:activePerson.type,source:activePerson.source,verification:activePerson.verification,organization_fa:activePerson.organization_fa||activePerson.affiliation_fa||bilingualOrganization(activePerson.affiliation||activePerson.organization||activePerson._profile?.organization).persian,affiliation:activePerson.affiliation||activePerson.organization||activePerson._profile?.organization,location:activePerson.location,specialty:activePerson.specialty,specialty_en:activePerson.specialty_en,specialty_evidence:activePerson.specialty_evidence,specialty_source_url:activePerson.specialty_source_url,detail:activePerson.detail,url:activePerson.url||activePerson.source_url}[key]||'';
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

function renderProvenance(person){
  const profile=person._profile||{},quality=person._quality||{},locality=person._locality||{},external=person._external||{},entity=person._entity||{},url=person.url||person.source_url||profile.source_url||'',evidence=[...(person.evidence||[]),...(profile.evidence||[])],score=Number(quality.score||profile.quality_score||0),localityScore=Number(locality.score||0),missing=profile.missing_fields||[],stages=[
    {icon:'⌕',title:'کشف اولیه',text:`استخراج از ${person.source||profile.source||'منبع ثبت‌نشده'}`,meta:url||'نشانی منبع ثبت نشده',state:url?'done':'warn'},
    {icon:'◇',title:'ورود به Snapshot',text:`ثبت نام «${person.name||'بدون نام'}» به‌عنوان نامزد`,meta:snap.generated_at?`نسخه داده: ${formatSnapshot(snap.generated_at)}`:'زمان ثبت در داده موجود نیست',state:'done'},
    {icon:'□',title:'غنی‌سازی پروفایل',text:profile.profile_completeness!==undefined?`کامل‌بودن پروفایل ${profile.profile_completeness}٪`:'پروفایل تکمیلی موجود نیست',meta:profile.organization||profile.location?.raw||'سازمان و مکان مستقل پیدا نشده',state:Number(profile.profile_completeness||0)>=50?'done':'warn'},
    {icon:'◆',title:'ارزیابی شواهد',text:`امتیاز کیفیت ${score} از ۱۰۰ · ${statusFa(quality.evidence_strength||profile.evidence_strength)}`,meta:`${evidence.length} شاهد مستقیم · ${quality.evidence_count||0} قلم امتیازدهی‌شده`,state:score>=70?'done':score>=40?'warn':'risk'},
    {icon:'⌖',title:'سنجش ارتباط با اردکان',text:`امتیاز ${localityScore} از ۱۰۰ · ${statusFa(locality.status)}`,meta:(locality.reasons||[]).map(item=>item.signal).join('، ')||'هیچ شاهد محلی مستقل ثبت نشده',state:localityScore>=70?'done':localityScore>=40?'warn':'risk'},
    {icon:'#',title:'حل هویت',text:entity.identity_status?statusFa(entity.identity_status):'هویت منفرد',meta:`${entity.record_count||1} رکورد مرتبط · ${person._entity_id||'شناسه کانونی موجود نیست'}`,state:entity.human_review_required?'warn':'done'}
  ];
  const risk=score<30||localityScore<20||!evidence.length,localized=bilingualName(person);$('provenanceAlert').className=`provenance-alert ${risk?'risk':'ok'}`;$('provenanceAlert').innerHTML=risk?`<strong>هشدار اعتبارسنجی</strong><span>این رکورد با شواهد ناکافی وارد فهرست نامزدها شده و عضویت آن در اطلس هنوز تأیید نشده است.</span>`:`<strong>ردپای قابل اتکا</strong><span>این رکورد چند مرحله ارزیابی و شاهد قابل استناد دارد.</span>`;
  $('provenanceGraph').innerHTML=stages.map((stage,index)=>`<button type="button" class="provenance-node ${stage.state}${index===0?' active':''}" data-step="${index+1}" aria-expanded="${index===0?'true':'false'}"><i>${stage.icon}</i><div><small>مرحله ${index+1}</small><strong>${esc(stage.title)}</strong><span>${esc(stage.text)}</span><em>${esc(stage.meta)}</em></div></button>`).join('');
  $('provenanceEvidence').innerHTML=`<div><span>نام منبع</span><b>${esc(person.source||profile.source||'نامشخص')}</b></div><div><span>نشانی اصلی</span>${url?`<a href="${esc(url)}" target="_blank" rel="noopener" dir="ltr">${esc(url)}</a>`:'<b>ثبت نشده</b>'}</div><div><span>فیلدهای مفقود</span><b>${esc(missing.join('، ')||'مورد مهمی ثبت نشده')}</b></div><div><span>نتیجه فعلی</span><b>${esc(risk?'نیازمند بازبینی ویژه':'قابل نگهداری با پایش دوره‌ای')}</b></div>`;
  $('requestReverification').dataset.recordIndex=person._record_index;$('reverificationStatus').textContent='';if(authUser()?.role==='admin')loadReverificationStatus(person._record_index,localized.persian)
}
async function loadReverificationStatus(index,name){try{const result=await adminFetch(`/admin/reverify?record_index=${index}`),latest=result.requests?.[0];if(latest)$('reverificationStatus').textContent=`آخرین بازبینی ویژه: ${statusFa(latest.status)} · ${new Date(latest.created_at).toLocaleString('fa-IR')}${latest.issue_number?` · پرونده #${latest.issue_number}`:''}`;else $('reverificationStatus').textContent='برای این رکورد هنوز بازبینی ویژه درخواست نشده است.'}catch(error){$('reverificationStatus').textContent=error.message}}
async function requestReverification(){if(!activePerson)return;if(!adminToken()){openAdminLogin(requestReverification);return}if(authUser()?.role!=='admin'){$('reverificationStatus').textContent='این عملیات فقط برای مدیر سامانه فعال است.';return}const name=bilingualName(activePerson).persian,defaultReason=`بررسی دوباره منشأ، هویت و ارتباط «${name}» با اردکان؛ یافتن حداقل یک شاهد مستقل و تعیین تکلیف نهایی رکورد.`,reason=prompt('دلیل یا محور بازبینی ویژه را وارد کنید:',defaultReason);if(reason===null)return;if('Notification'in window&&Notification.permission==='default')await enableReverificationNotifications();$('requestReverification').disabled=true;$('reverificationStatus').textContent='در حال ثبت پرونده بازبینی ویژه…';try{const result=await adminFetch('/admin/reverify',{method:'POST',body:JSON.stringify({record_index:activePerson._record_index,person_name:activePerson.name||name,reason})}),request=result.request;if(request?.id){const watched=reverificationWatch().filter(item=>item.id!==request.id);watched.unshift({id:request.id,record_index:activePerson._record_index,person_name:name,status:request.status||result.status,notified:false,created_at:request.created_at});saveReverificationWatch(watched)}$('reverificationStatus').textContent=result.duplicate?'این رکورد از قبل در صف بازبینی ویژه قرار دارد و نتیجه آن به شما اعلام می‌شود.':`درخواست ثبت شد؛ پس از پایان، اعلان دریافت می‌کنید${request?.issue_number?` · شماره پرونده ${request.issue_number}`:''}.`}catch(error){$('reverificationStatus').textContent=error.message}finally{$('requestReverification').disabled=false}}

async function saveRelationship(event){event.preventDefault();if(!activePerson)return;if(!adminToken()){openAdminLogin(()=>saveRelationship(new Event('submit')));return}if(authUser()?.role!=='admin'){$('relationStatus').textContent='ویرایش گراف فقط برای مدیر سامانه مجاز است.';return}const other=Number($('relationPerson').value),payload={person_a_index:activePerson._record_index,person_b_index:other,type:$('relationType').value,note:$('relationNote').value.trim()},temporary={...payload,id:`pending-${Date.now()}`};REL.relationships=REL.relationships||[];REL.relationships.push(temporary);renderProfileRelations(activePerson);$('relationEditor').hidden=true;$('relationStatus').textContent='ارتباط اعمال شد؛ در حال ذخیره…';try{const result=await adminFetch('/admin/relationship',{method:'POST',body:JSON.stringify(payload)});Object.assign(temporary,result.relationship);renderProfileRelations(activePerson);$('relationStatus').textContent='ارتباط با موفقیت ذخیره شد.'}catch(error){REL.relationships=REL.relationships.filter(item=>item!==temporary);renderProfileRelations(activePerson);$('relationStatus').textContent=error.message}}

function buildIntel(){
  const metrics=INT.metrics||{},decisions=ER.decision_counts||{},profiles=PROFILE.metrics||{},external=EXT.metrics||{},entities=ENT.metrics||{};
  const cards=[['هویت‌های فعال',people.filter(person=>person._merged_into===undefined).length,true],['ادغام‌های قطعی',MERGES.length],['کیفیت قوی',metrics.quality_strong],['کیفیت متوسط',metrics.quality_medium],['کیفیت ضعیف',metrics.quality_weak],['اقلام شواهد',metrics.evidence_items],['دارای سازمان',profiles.with_organization],['دارای مکان',profiles.with_location],['پروفایل کامل',profiles.completeness_high],['غنی‌شده',external.enriched_total],['Likely Same',decisions.LIKELY_SAME_PERSON??0],['Uncertain',decisions.UNCERTAIN??0]];
  $('intel').innerHTML=cards.map(([label,value,featured])=>`<article class="analysis-card${featured?' featured':''}"><div class="big">${esc(valueOrDash(value))}</div><div class="label">${esc(label)}</div></article>`).join('');
  const applied=new Set(MERGES.map(item=>Number(item.duplicate_index))),groups=[...(INT.possible_duplicate_stable_ids||[]).map(item=>({...item,kind:'شناسه منبع کاملاً یکسان',confidence:100,automatic:true})),...(INT.possible_duplicates||[]).map(item=>({...item,kind:'نام کاملاً یکسان',confidence:88})),...(INT.possible_duplicate_variants||[]).map(item=>({...item,kind:'شباهت املایی نام',confidence:72}))].filter(group=>(group.candidate_indexes||[]).some(index=>!applied.has(Number(index)))).slice(0,40);
  $('mergeSummary').textContent=`${MERGES.length.toLocaleString('fa-IR')} ادغام اعمال‌شده · ${groups.length.toLocaleString('fa-IR')} مورد پیشنهادی`;
  if($('mergeShortcutCount'))$('mergeShortcutCount').textContent=`${groups.length.toLocaleString('fa-IR')} مورد برای بررسی`;
  $('dupes').innerHTML=groups.length?groups.map(group=>{
    const indexes=(group.candidate_indexes||[]).filter(index=>people[index]&&!applied.has(Number(index))),primary=indexes[0],duplicate=indexes[1];if(primary===undefined||duplicate===undefined)return '';
    const first=people[primary],second=people[duplicate],a=bilingualName(first),b=bilingualName(second),orgA=bilingualOrganization(first.affiliation||first.organization||first._profile?.organization,first.organization_fa).persian,orgB=bilingualOrganization(second.affiliation||second.organization||second._profile?.organization,second.organization_fa).persian;
    const nameMatch=normalizeSearch(a.persian)===normalizeSearch(b.persian),orgMatch=Boolean(orgA&&orgB&&normalizeSearch(orgA)===normalizeSearch(orgB)),sourceA=String(first.source||''),sourceB=String(second.source||''),independentSources=Boolean(sourceA&&sourceB&&sourceA!==sourceB),confidence=Number(group.confidence||0),conflicts=[];
    if(orgA&&orgB&&!orgMatch)conflicts.push('وابستگی سازمانی متفاوت');if(first.location&&second.location&&normalizeSearch(first.location)!==normalizeSearch(second.location))conflicts.push('مکان ثبت‌شده متفاوت');
    const recommendation=confidence>=90&&!conflicts.length?'ادغام با اطمینان بالا':confidence>=75&&conflicts.length<2?'مناسب برای ادغام پس از تأیید انسانی':'نیازمند بررسی بیشتر پیش از ادغام',tone=confidence>=90&&!conflicts.length?'safe':confidence>=75?'review':'hold';
    const signals=[['نام فارسی',nameMatch?'مطابق':'نیازمند تطبیق',nameMatch],['سازمان',orgMatch?'مطابق':orgA&&orgB?'متفاوت':'داده ناکافی',orgMatch],['منابع',independentSources?'دو منبع مستقل':sourceA||sourceB||'ثبت نشده',Boolean(sourceA||sourceB)],['تعارض‌ها',conflicts.length?conflicts.join('، '):'تعارض آشکار یافت نشد',!conflicts.length]];
    const rawUrlA=String(first.url||first.source_url||first._profile?.source_url||''),rawUrlB=String(second.url||second.source_url||second._profile?.source_url||''),urlA=/^https?:\/\//i.test(rawUrlA)?rawUrlA:'',urlB=/^https?:\/\//i.test(rawUrlB)?rawUrlB:'';
    const locationA=first.location||first._profile?.location?.raw||'ثبت نشده',locationB=second.location||second._profile?.location?.raw||'ثبت نشده',idA=first._entity_id||first.openalex_id||first.id||`رکورد ${primary}`,idB=second._entity_id||second.openalex_id||second.id||`رکورد ${duplicate}`;
    const comparison=[['نام',a.persian,b.persian,nameMatch],['نام لاتین',a.english||'ثبت نشده',b.english||'ثبت نشده',Boolean(a.english&&b.english&&normalizeSearch(a.english)===normalizeSearch(b.english))],['سازمان',orgA||'ثبت نشده',orgB||'ثبت نشده',orgMatch],['مکان',locationA,locationB,normalizeSearch(locationA)===normalizeSearch(locationB)],['منشأ کشف',sourceA||'ثبت نشده',sourceB||'ثبت نشده',sourceA===sourceB],['شناسه',idA,idB,String(idA)===String(idB)]];
    const evidenceA=(first.evidence||[]).length+(first._profile?.evidence||[]).length,evidenceB=(second.evidence||[]).length+(second._profile?.evidence||[]).length,primaryName=evidenceA>=evidenceB?a.persian:b.persian;
    return `<article class="duplicate-card"><div class="duplicate-score"><strong>${confidence.toLocaleString('fa-IR')}٪</strong><span>${group.automatic?'قطعی':'احتمال تکرار'}</span></div><div class="duplicate-people"><div><b>${esc(a.persian)}</b><small>${esc(a.english||'')} · ${esc(orgA||'سازمان نامشخص')}</small></div><i>⇄</i><div><b>${esc(b.persian)}</b><small>${esc(b.english||'')} · ${esc(orgB||'سازمان نامشخص')}</small></div></div><div class="duplicate-reason"><span>${esc(group.kind)}</span><small>${esc(group.reason||'مقایسه نام، سازمان و شناسه‌های منبع')}</small></div><div class="duplicate-actions"><button class="identity-review-button" type="button" data-identity-review aria-expanded="false"><i>◎</i><span><b>کنترل نهایی هم‌هویتی</b><small>منابع، شواهد و اثر ادغام</small></span></button><button class="button ${authUser()?.role==='admin'?'primary':'subtle'}" type="button" data-merge-primary="${primary}" data-merge-duplicate="${duplicate}" data-merge-confidence="${confidence}" data-merge-reason="${esc(group.kind)}">${authUser()?.role==='admin'?'ادغام رکوردها':'پیشنهاد ادغام'}</button></div><section class="identity-review-panel ${tone}" hidden><header><span><i>✓</i><b>${esc(recommendation)}</b></span><strong>${confidence.toLocaleString('fa-IR')}٪ اطمینان</strong></header><div class="identity-signal-grid">${signals.map(([label,value,ok])=>`<article class="${ok?'pass':'caution'}"><i>${ok?'✓':'!'}</i><span><small>${esc(label)}</small><b>${esc(value)}</b></span></article>`).join('')}</div><div class="identity-source-grid"><article><header><span>رکورد اول</span><b>${esc(a.persian)}</b></header><dl><div><dt>منبع</dt><dd>${esc(sourceA||'نامشخص')}</dd></div><div><dt>شواهد</dt><dd>${evidenceA.toLocaleString('fa-IR')} مورد</dd></div><div><dt>شناسه</dt><dd dir="ltr">${esc(idA)}</dd></div></dl>${urlA?`<a href="${esc(urlA)}" target="_blank" rel="noopener">مشاهده مستقیم منبع اول ↗</a>`:'<span class="source-unavailable">پیوند مستقیم منبع ثبت نشده است</span>'}</article><article><header><span>رکورد دوم</span><b>${esc(b.persian)}</b></header><dl><div><dt>منبع</dt><dd>${esc(sourceB||'نامشخص')}</dd></div><div><dt>شواهد</dt><dd>${evidenceB.toLocaleString('fa-IR')} مورد</dd></div><div><dt>شناسه</dt><dd dir="ltr">${esc(idB)}</dd></div></dl>${urlB?`<a href="${esc(urlB)}" target="_blank" rel="noopener">مشاهده مستقیم منبع دوم ↗</a>`:'<span class="source-unavailable">پیوند مستقیم منبع ثبت نشده است</span>'}</article></div><div class="identity-comparison"><div class="identity-comparison-head"><b>مقایسهٔ سطر‌به‌سطر</b><span>سبز: مطابق · زرد: نیازمند توجه</span></div>${comparison.map(([label,left,right,match])=>`<div class="identity-comparison-row ${match?'match':'difference'}"><strong>${esc(label)}</strong><span>${esc(left)}</span><i>${match?'✓':'≠'}</i><span>${esc(right)}</span></div>`).join('')}</div><aside class="merge-impact"><div><span>رکورد پیشنهادی برای نگهداری</span><b>${esc(primaryName)}</b></div><div><span>پس از ادغام</span><b>${(evidenceA+evidenceB).toLocaleString('fa-IR')} شاهد تجمیعی · نام‌های جایگزین حفظ می‌شوند</b></div><div><span>قابل بازگشت</span><b>ردپای تصمیم و شناسهٔ رکورد حذف‌شده نگهداری می‌شود</b></div></aside><footer><span>تصمیم پیشنهادی سامانه است؛ منابع اصلی را باز کنید و مسئولیت تأیید نهایی را مدیر بر عهده دارد.</span><button type="button" data-close-identity-review>بستن بررسی</button></footer></section></article>`;
  }).join(''):'<div class="empty-state"><strong>همه موارد قطعی یکپارچه شده‌اند</strong><small>در حال حاضر مورد بررسی‌نشده‌ای وجود ندارد.</small></div>';
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
async function loadMergeRequests(){if(!adminToken()){MERGE_REQUESTS=[];renderMergeQueue();return}try{const result=await adminFetch('/merges');MERGE_REQUESTS=result.requests||[];if(authUser()?.role!=='admin')MERGE_REQUESTS.filter(item=>['approved','applied','rejected'].includes(item.status)).forEach(item=>addAppNotification({id:`merge-${item.id}-${item.status}`,type:'merge',title:item.status==='rejected'?'پیشنهاد ادغام بررسی و رد شد':'پیشنهاد ادغام تأیید شد',message:item.status==='rejected'?'مدیر پیشنهاد ادغام رکوردها را نپذیرفت.':'مدیر پیشنهاد را تأیید کرد و رکوردها یکپارچه شدند.',created_at:item.reviewed_at||item.created_at,target:{tab:'intelligence',selector:'.duplicate-workbench'}}));renderMergeQueue()}catch(error){$('mergeStatus').textContent=error.message}}
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
  const announce=item=>{const run=findRun(item),added=Number(run?.new_records||0),message=added?`${added.toLocaleString('fa-IR')} نامزد جدید به فهرست اضافه شد.`:'بررسی کامل شد؛ نتیجهٔ تازه‌ای پیدا نشد.';addAppNotification({id:`lead-${item.id}`,type:'lead',title:`بررسی معرفی «${item.value}» تمام شد`,message,created_at:run?.completed_at,target:{tab:'leads',selector:'#leadHistory'}});showDashboardNotification(`بررسی معرفی «${item.value}» تمام شد`,message,`scie-lead-${item.id}`)};
  const findRun=item=>[...(remote.runs||[])].reverse().find(run=>Number(run.lead_id)===Number(item.id)||(item.issue_number&&Number(run.issue_number)===Number(item.issue_number)))||[...(remote.runs||[])].reverse().find(run=>String(run.value||'').trim().toLocaleLowerCase('fa')===String(item.value||'').trim().toLocaleLowerCase('fa'));
  const resultMatches=item=>{const run=findRun(item),exact=(run?.result_records||[]).map(result=>{const index=Number(result.record_index),person=people[index];return person?{person,index,name:bilingualName(person),exact:true}:null}).filter(Boolean);if(exact.length)return exact;const byLead=people.map((person,index)=>({person,index,name:bilingualName(person),exact:true})).filter(row=>Number(row.person.lead_id)===Number(item.id));if(byLead.length)return byLead;const needle=normalizeSearch(item.value),tokens=needle.split(' ').filter(token=>token.length>1);return people.map((person,index)=>({person,index,name:bilingualName(person),exact:false})).filter(row=>{const haystack=normalizeSearch(`${row.name.persian} ${row.name.english} ${row.person.name||''} ${row.person.detail||''}`);return haystack.includes(needle)||(tokens.length&&tokens.every(token=>haystack.includes(token)))}).slice(0,12)};
  let pollTimer=null;
  const pending=()=>read().some(item=>item.status!=='failed'&&!findRun(item));
  const draw=()=>{$('leadHistory').innerHTML=read().map(item=>{const run=findRun(item),failed=item.status==='failed',done=run?.status==='completed',added=Number(run?.new_records||0),state=done?'تکمیل‌شده':failed?'ارسال ناموفق':item.status==='submitting'?'در حال ارسال':'در حال بررسی',finished=done&&run.completed_at?new Date(run.completed_at).toLocaleString('fa-IR'):'',matches=done?resultMatches(item):[],hasExact=matches.some(row=>row.exact),resultCards=matches.map(row=>`<button type="button" class="lead-found-person" data-lead-person="${row.index}"><span class="lead-found-avatar">${esc(avatarFor(row.name.persian).initials)}</span><span><b>${esc(row.name.persian)}</b>${row.name.english?`<small lang="en" dir="ltr">${esc(row.name.english)}</small>`:''}<em>${esc(row.person.source||'منبع نامشخص')} · ${row.exact?'خروجی مستقیم همین پردازش':'تطبیق احتمالی'} · مشاهده پروفایل</em></span><i>←</i></button>`).join('');return `<div class="lead-item ${done?'is-complete':''}" data-lead-id="${esc(item.id)}" ${done?'tabindex="0" role="button" aria-expanded="false"':''}><div class="lead-item-head"><strong>${esc(item.type_label||item.type)} · ${esc(item.value)}</strong><span class="lead-state ${done?'done':'pending'}">${state}</span></div><small>${esc(item.location||'بدون مکان')} · ${new Date(item.at||item.created_at).toLocaleString('fa-IR')}</small>${done?`<small class="lead-result">${added?`${esc(added)} نامزد جدید به فهرست افزوده شد`:'بررسی کامل شد؛ نتیجهٔ تازه‌ای پیدا نشد'}${finished?` · پایان: ${esc(finished)}`:''}</small><span class="lead-view-result">مشاهده نتیجه <i>⌄</i></span><section class="lead-result-panel" hidden><header><div><b>نتیجهٔ پردازش</b><small>پروندهٔ پردازش #${esc(run?.issue_number||'—')} · اندازه مخزن خام پس از پردازش: ${Number(run?.pool_size||people.length).toLocaleString('fa-IR')}</small></div><span>${matches.length.toLocaleString('fa-IR')} ${hasExact?'خروجی مستقیم':'تطبیق احتمالی'}</span></header>${resultCards||`<div class="lead-no-result"><b>رکورد قابل نمایش تازه‌ای پیدا نشد</b><small>پردازش تکمیل شده است، اما نتیجهٔ جدیدی برای پیوند به پروفایل وجود ندارد.</small></div>`}</section>`:''}${!done&&!failed?'<small>وضعیت هر ۱۰ ثانیه خودکار بررسی می‌شود.</small>':''}${failed?`<small class="lead-result">${esc(item.error||'ارسال ناموفق بود؛ دوباره تلاش کنید.')}</small>`:''}${item.note?`<small>${esc(item.note)}</small>`:''}</div>`}).join('')||'<div class="empty-state"><strong>هنوز معرفی‌ای ثبت نشده است</strong><small>نخستین پیشنهاد را برای جستجو و اعتبارسنجی ثبت کنید.</small></div>'};
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
  $('leadHistory').addEventListener('click',event=>{const personButton=event.target.closest('[data-lead-person]');if(personButton){event.stopPropagation();const person=people[Number(personButton.dataset.leadPerson)];if(person)openDetail(person);return}const item=event.target.closest('.lead-item.is-complete');if(!item)return;const panel=item.querySelector('.lead-result-panel'),open=panel.hidden;panel.hidden=!open;item.setAttribute('aria-expanded',String(open));item.classList.toggle('result-open',open)});$('leadHistory').addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('.lead-item.is-complete')){event.preventDefault();event.target.click()}});
  $('export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(read(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='scie-leads.json';anchor.click();URL.revokeObjectURL(url)});updateNotifyButton();draw();startPolling();window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
}

function setupBulkImport(){
  let prepared=[];
  const parseCsv=text=>{const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const char=text[i],next=text[i+1];if(char==='"'&&quoted&&next==='"'){cell+='"';i++}else if(char==='"')quoted=!quoted;else if(char===','&&!quoted){row.push(cell);cell=''}else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&next==='\n')i++;row.push(cell);if(row.some(value=>value.trim()))rows.push(row);row=[];cell=''}else cell+=char}row.push(cell);if(row.some(value=>value.trim()))rows.push(row);if(rows.length<2)return[];const headers=rows[0].map(value=>value.trim().replace(/^\ufeff/,''));return rows.slice(1).map(values=>Object.fromEntries(headers.map((header,index)=>[header,(values[index]||'').trim()]))) };
  const normalize=row=>({name_fa:String(row.name_fa||row['نام فارسی']||'').trim(),name:String(row.name||row['نام انگلیسی']||'').trim(),specialty:String(row.specialty||row['تخصص']||'').trim(),specialty_en:String(row.specialty_en||'').trim(),affiliation:String(row.affiliation||row.organization||row['سازمان']||'').trim(),location:String(row.location||row['مکان']||'').trim(),source:String(row.source||row['منبع']||'ورود گروهی تأییدشده').trim(),url:String(row.url||row.source_url||row['لینک منبع']||'').trim(),evidence:Array.isArray(row.evidence)?row.evidence:String(row.evidence||'').split('|').map(value=>value.trim()).filter(Boolean),type:String(row.type||'رکورد قطعی واردشده').trim(),verification:'confirmed_by_admin',confidence:'high'});
  const valid=row=>(row.name_fa||row.name)&&(row.url||row.source),draw=()=>{const ready=prepared.filter(valid);$('bulkImportSummary').textContent=`${prepared.length.toLocaleString('fa-IR')} ردیف خوانده شد · ${ready.length.toLocaleString('fa-IR')} آماده ثبت · ${(prepared.length-ready.length).toLocaleString('fa-IR')} ناقص`;$('bulkImportPreview').innerHTML=prepared.length?`<table><thead><tr><th>#</th><th>نام</th><th>تخصص</th><th>سازمان</th><th>منبع</th></tr></thead><tbody>${prepared.slice(0,100).map((row,index)=>`<tr class="${valid(row)?'':'invalid'}"><td>${(index+1).toLocaleString('fa-IR')}</td><td>${esc(row.name_fa||row.name||'نام وارد نشده')}</td><td>${esc(row.specialty||row.specialty_en||'—')}</td><td>${esc(row.affiliation||'—')}</td><td>${esc(row.source||row.url||'—')}</td></tr>`).join('')}</tbody></table>`:'';$('bulkImportSubmit').disabled=!ready.length};
  $('bulkImportFile').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{const lower=file.name.toLowerCase(),excel=lower.endsWith('.xlsx')||lower.endsWith('.xls');let raw;if(excel){if(!window.XLSX)throw Error('ماژول خواندن Excel بارگذاری نشده است؛ اتصال اینترنت را بررسی و صفحه را تازه‌سازی کنید.');const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true}),sheet=workbook.Sheets[workbook.SheetNames[0]];raw=XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false})}else{const text=await file.text();raw=lower.endsWith('.json')?JSON.parse(text):parseCsv(text)}const rows=Array.isArray(raw)?raw:Array.isArray(raw.records)?raw.records:Array.isArray(raw.people)?raw.people:[];prepared=rows.slice(0,1000).map(normalize);draw();$('bulkImportStatus').textContent=`پیش‌نمایش برگهٔ اول آماده است؛ ${rows.length>1000?'فقط ۱۰۰۰ ردیف نخست پذیرفته شد.':'پس از بررسی، ثبت نهایی را بزنید.'}`}catch(error){prepared=[];draw();$('bulkImportStatus').textContent=`خواندن فایل ناموفق بود: ${error.message}`}});
  $('bulkImportSubmit').addEventListener('click',async()=>{if(!adminToken()){openAdminLogin(()=>$('bulkImportSubmit').click());return}const records=prepared.filter(valid);if(!records.length)return;$('bulkImportSubmit').disabled=true;$('bulkImportStatus').textContent='در حال تطبیق، جلوگیری از تکرار و ثبت دائمی…';try{const result=await adminFetch('/admin/import',{method:'POST',body:JSON.stringify({records})});(result.added_records||[]).forEach(record=>{record._record_index=people.length;people.push(record)});setupFilters();buildMetrics();render();$('bulkImportStatus').textContent=`ثبت کامل شد: ${Number(result.added||0).toLocaleString('fa-IR')} رکورد جدید و ${Number(result.updated||0).toLocaleString('fa-IR')} رکورد تکمیل شد.`;prepared=[];$('bulkImportFile').value='';draw()}catch(error){$('bulkImportStatus').textContent=error.message}finally{$('bulkImportSubmit').disabled=!prepared.filter(valid).length}});
  $('downloadImportTemplate').addEventListener('click',event=>{event.preventDefault();const text='name_fa,name,specialty,specialty_en,affiliation,location,source,url,evidence\nنام فارسی,English Name,تخصص,Civil Engineering,سازمان,اردکان,منبع قطعی,https://example.org/profile,شاهد اول|شاهد دوم\n',blob=new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='scie-import-template.csv';anchor.click();URL.revokeObjectURL(url)});
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
  $('notificationButton').addEventListener('click',event=>{event.stopPropagation();openNotificationCenter()});$('closeNotifications').addEventListener('click',()=>openNotificationCenter(false));$('markNotificationsRead').addEventListener('click',()=>{const items=appNotifications();items.forEach(item=>item.read=true);saveAppNotifications(items)});$('notificationList').addEventListener('click',event=>{const item=event.target.closest('[data-notification-id]');if(item)navigateNotification(item.dataset.notificationId)});document.addEventListener('click',event=>{if(!$('notificationCenter').hidden&&!event.target.closest('#notificationCenter')&&!event.target.closest('#notificationButton'))openNotificationCenter(false)});
  document.querySelectorAll('[data-auth-mode]').forEach(button=>button.addEventListener('click',()=>{authMode=button.dataset.authMode;document.querySelectorAll('[data-auth-mode]').forEach(item=>item.classList.toggle('active',item===button));$('adminLoginTitle').textContent=authMode==='register'?'ساخت حساب کاربری':'ورود به سامانه';$('authSubmit').textContent=authMode==='register'?'ثبت‌نام و ورود':'ورود به سامانه';$('adminPassword').setAttribute('autocomplete',authMode==='register'?'new-password':'current-password');$('adminLoginStatus').textContent=''}));
  $('adminLoginForm').addEventListener('submit',async event=>{event.preventDefault();const status=$('adminLoginStatus');status.textContent=authMode==='register'?'در حال ساخت حساب…':'در حال ورود…';try{const response=await fetch(`${ADMIN_API}/auth/${authMode}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:$('adminUsername').value.trim(),password:$('adminPassword').value})}),result=await response.json();if(!response.ok)throw Error(result.error||'ورود ناموفق بود.');localStorage.setItem('scie_admin_token',result.token);localStorage.setItem('scie_auth_user',JSON.stringify(result.user));updateAdminUI();closeAdminLogin();buildIntel();loadMergeRequests();const action=pendingAdminAction;pendingAdminAction=null;if(activePerson)renderProfileRelations(activePerson);if(action)setTimeout(action,0)}catch(error){status.textContent=error.message}});
  $('closeAdminLogin').addEventListener('click',closeAdminLogin);document.querySelector('.admin-login-backdrop').addEventListener('click',closeAdminLogin);
  $('closeAccountPanel').addEventListener('click',()=>{$('accountPanel').hidden=true});document.querySelector('.account-panel-backdrop').addEventListener('click',()=>{$('accountPanel').hidden=true});$('accountLogout').addEventListener('click',()=>{localStorage.removeItem('scie_admin_token');localStorage.removeItem('scie_auth_user');MERGE_REQUESTS=[];$('accountPanel').hidden=true;updateAdminUI();buildIntel();renderMergeQueue();if(activePerson)renderProfileRelations(activePerson)});
  $('dupes').addEventListener('click',event=>{const review=event.target.closest('[data-identity-review]'),close=event.target.closest('[data-close-identity-review]'),card=event.target.closest('.duplicate-card');if(review&&card){const panel=card.querySelector('.identity-review-panel'),open=panel.hidden;panel.hidden=!open;review.setAttribute('aria-expanded',String(open));card.classList.toggle('review-open',open);return}if(close&&card){card.querySelector('.identity-review-panel').hidden=true;card.querySelector('[data-identity-review]').setAttribute('aria-expanded','false');card.classList.remove('review-open');return}const button=event.target.closest('[data-merge-primary]');if(button)submitMerge(Number(button.dataset.mergePrimary),Number(button.dataset.mergeDuplicate),Number(button.dataset.mergeConfidence),button.dataset.mergeReason)});
  $('mergeQueue').addEventListener('click',event=>{const button=event.target.closest('[data-merge-review]');if(button)reviewMergeRequest(button.dataset.mergeId,button.dataset.mergeReview)});$('refreshMerges').addEventListener('click',loadMergeRequests);
  $('addRelation').addEventListener('click',()=>{if(!adminToken()){openAdminLogin(()=>{$('relationEditor').hidden=false});return}$('relationEditor').hidden=false;$('relationNote').focus()});$('cancelRelation').addEventListener('click',()=>{$('relationEditor').hidden=true});$('relationEditor').addEventListener('submit',saveRelationship);
  $('requestReverification').addEventListener('click',requestReverification);
  $('reverificationNotify').addEventListener('click',enableReverificationNotifications);
  $('provenanceGraph').addEventListener('click',event=>{const node=event.target.closest('.provenance-node');if(!node)return;const active=!node.classList.contains('active');$('provenanceGraph').querySelectorAll('.provenance-node').forEach(item=>{item.classList.remove('active');item.setAttribute('aria-expanded','false')});if(active){node.classList.add('active');node.setAttribute('aria-expanded','true')}});
  $('mergeShortcut').addEventListener('click',()=>{openTab('intelligence');setTimeout(()=>document.querySelector('.duplicate-workbench')?.scrollIntoView({block:'start',behavior:'smooth'}),180)});
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
  installPersianDigitRendering();bindEvents();setupBulkImport();updateAdminUI();renderNotificationCenter();setupReverificationNotifications();loadBuildMeta();
  try{
    await loadData();
    applyIntelligence();setupFilters();buildMetrics();render();
    $('state').className='hero-state ready';$('state').innerHTML=`<span class="pulse"></span>اطلاعات اصلی آماده است · تکمیل تحلیل در پس‌زمینه`;
    const layerState=await loadLayers();
    applyIntelligence();await loadOverlays();buildMetrics();statusRows(layerState);buildIntel();renderKnowledgeGraph();buildOrgs();setupVerification();render();
    leads();loadMergeRequests();
    $('state').className='hero-state ready';$('state').innerHTML=`<span class="pulse"></span>Snapshot فعال · ${people.filter(person=>person._merged_into===undefined).length.toLocaleString('fa-IR')} هویت یکتا`;
  }catch(error){
    console.error(error);$('state').className='hero-state error';$('state').textContent='خطا در دریافت Snapshot';$('list').innerHTML=`<div class="error-state"><strong>بارگذاری داده‌های اصلی شکست خورد</strong><small>${esc(error.message)}</small><button class="button subtle" type="button" onclick="location.reload()">تلاش دوباره</button></div>`;$('count').textContent='داده بارگذاری نشد';
  }
}

boot();
