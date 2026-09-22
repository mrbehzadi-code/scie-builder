const JSON_HEADERS={"content-type":"application/json; charset=utf-8"};

function cors(origin,allowed){
  return {...JSON_HEADERS,"access-control-allow-origin":origin===allowed?origin:allowed,"access-control-allow-methods":"POST,OPTIONS","access-control-allow-headers":"content-type,x-idempotency-key","access-control-max-age":"86400","vary":"Origin"};
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

export default {
  async fetch(request,env){
    const origin=request.headers.get('origin')||'',allowed=env.ALLOWED_ORIGIN;
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin,allowed)});
    if(origin!==allowed)return reply({ok:false,error:'مبدأ درخواست مجاز نیست.'},403,origin,allowed);
    if(request.method!=='POST')return reply({ok:false,error:'متد درخواست مجاز نیست.'},405,origin,allowed);
    if(!env.GITHUB_TOKEN)return reply({ok:false,error:'سرویس هنوز پیکربندی نشده است.'},503,origin,allowed);
    try{
      const lead=validate(await request.json());
      const key=clean(request.headers.get('x-idempotency-key')||lead.id,100);
      const cacheKey=new Request(`https://scie-idempotency.invalid/${encodeURIComponent(key)}`);
      const cached=await caches.default.match(cacheKey);if(cached)return new Response(cached.body,{status:cached.status,headers:cors(origin,allowed)});
      const response=await fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/issues`,{method:'POST',headers:{authorization:`Bearer ${env.GITHUB_TOKEN}`,accept:'application/vnd.github+json','content-type':'application/json','user-agent':'SCIE-Lead-API','x-github-api-version':'2022-11-28'},body:JSON.stringify({title:`[SCIE LEAD] ${lead.value}`,body:issueBody(lead)})});
      const result=await response.json();
      if(!response.ok)return reply({ok:false,error:'ارسال سرنخ به خط لوله ناموفق بود.',detail:result?.message||''},502,origin,allowed);
      const payload={ok:true,status:'submitted',issue_number:result.number,tracking_id:lead.id};
      const success=reply(payload,202,origin,allowed);await caches.default.put(cacheKey,new Response(JSON.stringify(payload),{status:202,headers:{...JSON_HEADERS,'cache-control':'max-age=600'}}));return success;
    }catch(error){return reply({ok:false,error:error?.message||'درخواست معتبر نیست.'},400,origin,allowed)}
  }
};
