const JSON_HEADERS={"content-type":"application/json; charset=utf-8"};

function cors(origin,allowed){
  return {...JSON_HEADERS,"access-control-allow-origin":origin===allowed?origin:allowed,"access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type,x-idempotency-key,authorization","access-control-max-age":"86400","vary":"Origin"};
}

function reply(body,status,origin,allowed){
  return new Response(JSON.stringify(body),{status,headers:cors(origin,allowed)});
}

function clean(value,max=500){return String(value??'').trim().replace(/\s+/g,' ').slice(0,max)}

function validate(input){
  const allowedTypes=new Set(['person','surname','address','organization','expertise','free']);
  const lead={
    id:Number(input?.id)||Date.now(),type:clean(input?.type,32),type_label:clean(input?.type_label,80),
    value:clean(input?.value,180),location:clean(input?.location,180),note:clean(input?.note,1000),
    created_at:new Date().toISOString()
  };
  if(!allowedTypes.has(lead.type))throw new Error('نوع سرنخ معتبر نیست.');
  if(lead.value.length<2)throw new Error('مقدار سرنخ باید حداقل دو نویسه باشد.');
  return lead;
}

function issueBody(lead){
  return `سرنخ انسانی ثبت‌شده برای خط لولهٔ کشف SCIE.\n\n<!--SCIE_LEAD\n${JSON.stringify(lead,null,2)}\nSCIE_LEAD-->\n\n- نوع: ${lead.type_label||lead.type}\n- مقدار: ${lead.value}\n- مکان: ${lead.location||'ثبت نشده'}\n- انتظار: جستجو، اعتبارسنجی و افزودن نامزدهای جدید به Snapshot داشبورد`;
}

function validateFeedback(input){
  const kind=clean(input?.kind,32),base={id:Number(input?.id)||Date.now(),kind,created_at:new Date().toISOString()};
  if(kind==='locality_review'){
    const verdict=clean(input?.verdict,32);if(!['ardakani','not_ardakani','needs_evidence'].includes(verdict))throw new Error('نتیجهٔ راستی‌آزمایی معتبر نیست.');
    return {...base,record_index:Number(input?.record_index),person_name:clean(input?.person_name,180),verdict,reason:clean(input?.reason,120),note:clean(input?.note,1000)};
  }
  if(kind==='relationship'){
    const value={...base,person_a:clean(input?.person_a,180),person_b:clean(input?.person_b,180),relation:clean(input?.relation,32),note:clean(input?.note,1000)};
    if(!value.person_a||!value.person_b||value.person_a===value.person_b)throw new Error('دو فرد متفاوت را انتخاب کنید.');return value;
  }
  if(kind==='source_review'){
    const verdict=clean(input?.verdict,40);if(!['person_candidate','relevant_nonperson','irrelevant','needs_evidence'].includes(verdict))throw new Error('نتیجهٔ بررسی منبع معتبر نیست.');
    const value={...base,source_url:clean(input?.source_url,600),platform:clean(input?.platform,40),verdict,note:clean(input?.note,1000)};
    if(!/^https?:\/\//.test(value.source_url))throw new Error('نشانی منبع معتبر نیست.');return value;
  }
  throw new Error('نوع بازخورد معتبر نیست.');
}

function feedbackIssue(item){
  const relation=item.kind==='relationship',source=item.kind==='source_review',title=relation?`[SCIE RELATIONSHIP] ${item.person_a} ↔ ${item.person_b}`:source?`[SCIE SOURCE REVIEW] ${item.platform}`:`[SCIE FEEDBACK] ${item.person_name}`;
  const body=`بازخورد انسانی برای پردازش SCIE.\n\n<!--SCIE_FEEDBACK\n${JSON.stringify(item,null,2)}\nSCIE_FEEDBACK-->\n\nاین ادعا تا زمان تأیید با شواهد مستقل، بازخورد انسانی محسوب می‌شود.`;
  return {title,body};
}

function base64Decode(value){return new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\n/g,'')),char=>char.charCodeAt(0)))}
function base64Encode(value){const bytes=new TextEncoder().encode(value);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary)}
function secureEqual(a,b){a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);return mismatch===0}
const base64Url=value=>base64Encode(value).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
async function tokenSignature(payload,secret){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']),signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload));return btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')}
async function issueAdminToken(username,secret){const payload=base64Url(JSON.stringify({u:username,v:1}));return `${payload}.${await tokenSignature(payload,secret)}`}
async function isAdmin(request,env){const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,''),[payload,signature]=token.split('.');if(!payload||!signature||!env.ADMIN_KEY)return false;return secureEqual(signature,await tokenSignature(payload,env.ADMIN_KEY))}
async function loginAdmin(request,env,origin,allowed){const input=await request.json(),username=clean(input?.username,80),password=String(input?.password||'');if(!secureEqual(username,env.ADMIN_USERNAME||'admin')||!secureEqual(password,env.ADMIN_KEY||''))return reply({ok:false,error:'نام کاربری یا رمز عبور نادرست است.'},401,origin,allowed);return reply({ok:true,token:await issueAdminToken(username,env.ADMIN_KEY),username},200,origin,allowed)}
async function updateRecord(request,env,origin,allowed){
  if(!await isAdmin(request,env))return reply({ok:false,error:'نشست مدیریت معتبر نیست یا دسترسی مجاز نیست.'},401,origin,allowed);
  const input=await request.json(),index=Number(input?.record_index),allowedFields=new Set(['name','name_fa','type','source','verification','organization_fa','affiliation','location','detail','url']),changes={};
  if(!Number.isInteger(index)||index<0)throw new Error('شماره رکورد معتبر نیست.');
  for(const [key,value] of Object.entries(input?.changes||{})){if(!allowedFields.has(key))throw new Error(`ویرایش فیلد ${key} مجاز نیست.`);changes[key]=clean(value,key==='detail'?2000:600)}
  if(!Object.keys(changes).length)throw new Error('هیچ تغییری برای ذخیره ارسال نشده است.');
  const endpoint=`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/contents/docs/data.json`,headers={authorization:`Bearer ${env.GITHUB_TOKEN}`,accept:'application/vnd.github+json','content-type':'application/json','user-agent':'SCIE-Admin-API','x-github-api-version':'2022-11-28'};
  const currentResponse=await fetch(endpoint,{headers});const current=await currentResponse.json();if(!currentResponse.ok)throw new Error(`دریافت داده برای ویرایش ناموفق بود: ${current?.message||currentResponse.status}`);
  const document=JSON.parse(base64Decode(current.content)),records=Array.isArray(document)?document:(document.people||document.records||document.items);if(!Array.isArray(records)||!records[index])throw new Error('رکورد موردنظر پیدا نشد.');
  Object.assign(records[index],changes);document.generated_at=new Date().toISOString();
  const saveResponse=await fetch(endpoint,{method:'PUT',headers,body:JSON.stringify({message:`data: admin edit record ${index}`,content:base64Encode(JSON.stringify(document,null,2)+'\n'),sha:current.sha,branch:'main'})}),saved=await saveResponse.json();
  if(!saveResponse.ok)throw new Error(`ذخیره ویرایش ناموفق بود: ${saved?.message||saveResponse.status}`);
  return reply({ok:true,status:'saved',record_index:index,changes,commit:saved.commit?.sha||''},200,origin,allowed);
}
async function updateRelationship(request,env,origin,allowed){
  if(!await isAdmin(request,env))return reply({ok:false,error:'نشست مدیریت معتبر نیست یا دسترسی مجاز نیست.'},401,origin,allowed);
  const input=await request.json(),endpoint=`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/contents/docs/relationships.json`,headers={authorization:`Bearer ${env.GITHUB_TOKEN}`,accept:'application/vnd.github+json','content-type':'application/json','user-agent':'SCIE-Admin-API','x-github-api-version':'2022-11-28'};
  const currentResponse=await fetch(endpoint,{headers});const current=await currentResponse.json();if(!currentResponse.ok)throw new Error(`دریافت ارتباطات ناموفق بود: ${current?.message||currentResponse.status}`);const document=JSON.parse(base64Decode(current.content));document.relationships=Array.isArray(document.relationships)?document.relationships:[];
  let relationship=null;if(input.action==='delete'){document.relationships=document.relationships.filter(item=>String(item.id)!==String(input.id))}else{const a=Number(input.person_a_index),b=Number(input.person_b_index),allowedTypes=new Set(['family','colleague','organization','expertise','education','social','other']);if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a===b)throw new Error('دو فرد معتبر و متفاوت انتخاب کنید.');const type=clean(input.type,32);if(!allowedTypes.has(type))throw new Error('نوع ارتباط معتبر نیست.');relationship={id:crypto.randomUUID(),person_a_index:a,person_b_index:b,type,note:clean(input.note,500),updated_at:new Date().toISOString()};document.relationships.push(relationship)}document.generated_at=new Date().toISOString();
  const saveResponse=await fetch(endpoint,{method:'PUT',headers,body:JSON.stringify({message:`data: admin ${input.action==='delete'?'delete':'add'} relationship`,content:base64Encode(JSON.stringify(document,null,2)+'\n'),sha:current.sha,branch:'main'})}),saved=await saveResponse.json();if(!saveResponse.ok)throw new Error(`ذخیره ارتباط ناموفق بود: ${saved?.message||saveResponse.status}`);return reply({ok:true,status:'saved',relationship,commit:saved.commit?.sha||''},200,origin,allowed)
}

const fromBase64Url=value=>base64Decode(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));
async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']),bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:120000},key,256);return [...new Uint8Array(bits)].map(byte=>byte.toString(16).padStart(2,'0')).join('')}
async function issueToken(user,secret){const payload=base64Url(JSON.stringify({id:user.id,u:user.username,role:user.role||'user',v:2}));return `${payload}.${await tokenSignature(payload,secret)}`}
async function currentUser(request,env){const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,''),[payload,signature]=token.split('.');if(!payload||!signature||!env.ADMIN_KEY||!secureEqual(signature,await tokenSignature(payload,env.ADMIN_KEY)))return null;try{const claims=JSON.parse(fromBase64Url(payload));if(claims.role==='admin'&&claims.u===(env.ADMIN_USERNAME||'admin'))return {id:'admin',username:claims.u,role:'admin'};return await env.DB.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').bind(claims.id).first()}catch{return null}}
async function authRoute(request,env,origin,allowed,mode){const input=await request.json(),username=clean(input?.username,50),password=String(input?.password||'');if(!/^[A-Za-z0-9_.-]{3,50}$/.test(username)||password.length<8)return reply({ok:false,error:'نام کاربری باید حداقل ۳ نویسه و رمز عبور حداقل ۸ نویسه باشد.'},400,origin,allowed);if(mode==='login'&&secureEqual(username,env.ADMIN_USERNAME||'admin')&&secureEqual(password,env.ADMIN_KEY||'')){const user={id:'admin',username,role:'admin'};return reply({ok:true,token:await issueToken(user,env.ADMIN_KEY),user},200,origin,allowed)}if(mode==='register'){const exists=await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();if(exists)return reply({ok:false,error:'این نام کاربری قبلاً ثبت شده است.'},409,origin,allowed);const id=crypto.randomUUID(),salt=crypto.randomUUID(),hash=await passwordHash(password,salt),created=new Date().toISOString();await env.DB.prepare('INSERT INTO users (id,username,password_hash,salt,role,created_at) VALUES (?,?,?,?,?,?)').bind(id,username,hash,salt,'user',created).run();const user={id,username,role:'user',created_at:created};return reply({ok:true,token:await issueToken(user,env.ADMIN_KEY),user},201,origin,allowed)}const record=await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();if(!record||!secureEqual(record.password_hash,await passwordHash(password,record.salt)))return reply({ok:false,error:'نام کاربری یا رمز عبور نادرست است.'},401,origin,allowed);const user={id:record.id,username:record.username,role:record.role,created_at:record.created_at};return reply({ok:true,token:await issueToken(user,env.ADMIN_KEY),user},200,origin,allowed)}
async function d1UpdateRecord(request,env,origin,allowed){const user=await currentUser(request,env);if(user?.role!=='admin')return reply({ok:false,error:'این عملیات فقط برای مدیر مجاز است.'},403,origin,allowed);const input=await request.json(),index=Number(input?.record_index),allowedFields=new Set(['name','name_fa','type','source','verification','organization_fa','affiliation','location','detail','url']),changes={};if(!Number.isInteger(index)||index<0)throw new Error('شماره رکورد معتبر نیست.');for(const [field,value] of Object.entries(input?.changes||{})){if(!allowedFields.has(field))throw new Error('فیلد ویرایش مجاز نیست.');changes[field]=clean(value,field==='detail'?2000:600)}const now=new Date().toISOString();await env.DB.batch(Object.entries(changes).map(([field,value])=>env.DB.prepare('INSERT INTO record_overrides(record_index,field,value,updated_by,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(record_index,field) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=excluded.updated_at').bind(index,field,value,user.id,now)));await logActivity(env,user,'record_edit',`ویرایش رکورد ${index}`,{changes});return reply({ok:true,status:'saved',record_index:index,changes},200,origin,allowed)}
async function d1Relationship(request,env,origin,allowed){const user=await currentUser(request,env);if(user?.role!=='admin')return reply({ok:false,error:'این عملیات فقط برای مدیر مجاز است.'},403,origin,allowed);const input=await request.json();if(input.action==='delete'){await env.DB.prepare('DELETE FROM relationships WHERE id=?').bind(clean(input.id,80)).run();await logActivity(env,user,'relationship_delete','حذف یک ارتباط',{id:input.id});return reply({ok:true,status:'deleted'},200,origin,allowed)}const a=Number(input.person_a_index),b=Number(input.person_b_index),type=clean(input.type,32),allowedTypes=new Set(['family','colleague','organization','expertise','education','social','other']);if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a===b||!allowedTypes.has(type))throw new Error('اطلاعات ارتباط معتبر نیست.');const relationship={id:crypto.randomUUID(),person_a_index:a,person_b_index:b,type,note:clean(input.note,500),updated_by:user.id,updated_at:new Date().toISOString()};await env.DB.prepare('INSERT INTO relationships(id,person_a_index,person_b_index,type,note,updated_by,updated_at) VALUES(?,?,?,?,?,?,?)').bind(...Object.values(relationship)).run();await logActivity(env,user,'relationship_add','افزودن ارتباط بین افراد',relationship);return reply({ok:true,status:'saved',relationship},200,origin,allowed)}
async function logActivity(env,user,kind,summary,payload){if(!user)return;const now=new Date().toISOString();if(user.role==='admin')await env.DB.prepare("INSERT OR IGNORE INTO users(id,username,password_hash,salt,role,created_at) VALUES('admin',?,'managed-by-worker','managed-by-worker','admin',?)").bind(user.username,now).run();await env.DB.prepare('INSERT INTO activities(id,user_id,kind,summary,payload_json,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,kind,summary,JSON.stringify(payload||{}),now).run()}
async function overlays(env,origin,allowed){const edits=await env.DB.prepare('SELECT record_index,field,value,updated_at FROM record_overrides').all(),relationships=await env.DB.prepare('SELECT id,person_a_index,person_b_index,type,note,updated_at FROM relationships ORDER BY updated_at DESC').all();return reply({ok:true,overrides:edits.results||[],relationships:relationships.results||[]},200,origin,allowed)}
async function myActivity(request,env,origin,allowed){const user=await currentUser(request,env);if(!user)return reply({ok:false,error:'ابتدا وارد حساب شوید.'},401,origin,allowed);const rows=await env.DB.prepare('SELECT id,kind,summary,payload_json,created_at FROM activities WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(user.id).all();return reply({ok:true,user,activities:rows.results||[]},200,origin,allowed)}

export default {
  async fetch(request,env){
    const origin=request.headers.get('origin')||'',allowed=env.ALLOWED_ORIGIN;
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin,allowed)});
    if(origin!==allowed)return reply({ok:false,error:'مبدأ درخواست مجاز نیست.'},403,origin,allowed);
    try{
      const path=new URL(request.url).pathname;if(request.method==='GET'&&path==='/data/overlays')return await overlays(env,origin,allowed);if(request.method==='GET'&&path==='/me/activity')return await myActivity(request,env,origin,allowed);if(request.method!=='POST')return reply({ok:false,error:'متد درخواست مجاز نیست.'},405,origin,allowed);if(path==='/auth/register')return await authRoute(request,env,origin,allowed,'register');if(path==='/auth/login'||path==='/admin/login')return await authRoute(request,env,origin,allowed,'login');if(path==='/admin/record')return await d1UpdateRecord(request,env,origin,allowed);if(path==='/admin/relationship')return await d1Relationship(request,env,origin,allowed);if(!env.GITHUB_TOKEN)return reply({ok:false,error:'سرویس هنوز پیکربندی نشده است.'},503,origin,allowed);
      const feedback=new URL(request.url).pathname==='/feedback',item=feedback?validateFeedback(await request.json()):validate(await request.json());
      const key=clean(request.headers.get('x-idempotency-key')||item.id,100);
      const cacheKey=new Request(`https://scie-idempotency.invalid/${encodeURIComponent(key)}`);
      const cached=await caches.default.match(cacheKey);if(cached)return new Response(cached.body,{status:cached.status,headers:cors(origin,allowed)});
      const issue=feedback?feedbackIssue(item):{title:`[SCIE LEAD] ${item.value}`,body:issueBody(item)};
      const response=await fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/issues`,{method:'POST',headers:{authorization:`Bearer ${env.GITHUB_TOKEN}`,accept:'application/vnd.github+json','content-type':'application/json','user-agent':'SCIE-Lead-API','x-github-api-version':'2022-11-28'},body:JSON.stringify(issue)});
      const result=await response.json();
      if(!response.ok)return reply({ok:false,error:'ارسال سرنخ به خط لوله ناموفق بود.',detail:result?.message||''},502,origin,allowed);
      const payload={ok:true,status:'submitted',issue_number:result.number,tracking_id:item.id};
      const user=await currentUser(request,env);if(user)await logActivity(env,user,feedback?'feedback':'lead',feedback?'ثبت مشارکت راستی‌آزمایی':`معرفی ${item.value}`,item);
      const success=reply(payload,202,origin,allowed);await caches.default.put(cacheKey,new Response(JSON.stringify(payload),{status:202,headers:{...JSON_HEADERS,'cache-control':'max-age=600'}}));return success;
    }catch(error){return reply({ok:false,error:error?.message||'درخواست معتبر نیست.'},400,origin,allowed)}
  }
};
