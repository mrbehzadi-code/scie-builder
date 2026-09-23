import worker from './src/index.js';
import assert from 'node:assert/strict';

globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
const nativeFetch=globalThis.fetch;
globalThis.fetch=async()=>new Response(JSON.stringify({number:42}),{status:201,headers:{'content-type':'application/json'}});
const env={ALLOWED_ORIGIN:'https://mrbehzadi-code.github.io',GITHUB_REPOSITORY:'mrbehzadi-code/scie-builder',GITHUB_TOKEN:'test'};
const request=new Request('https://worker.example',{method:'POST',headers:{origin:env.ALLOWED_ORIGIN,'content-type':'application/json','x-idempotency-key':'test-1'},body:JSON.stringify({id:1,type:'surname',type_label:'فامیلی',value:'بهزادی مقدم'})});
const response=await worker.fetch(request,env);const body=await response.json();
assert.equal(response.status,202);assert.equal(body.ok,true);assert.equal(body.issue_number,42);
const feedbackRequest=new Request('https://worker.example/feedback',{method:'POST',headers:{origin:env.ALLOWED_ORIGIN,'content-type':'application/json','x-idempotency-key':'feedback-1'},body:JSON.stringify({id:2,kind:'relationship',person_a:'دکتر محمود فرزان',person_b:'دکتر عبدالرضا فرزان',relation:'sibling',note:'برادر هستند'})});
const feedbackResponse=await worker.fetch(feedbackRequest,env);assert.equal(feedbackResponse.status,202);assert.equal((await feedbackResponse.json()).ok,true);
const sourceReviewRequest=new Request('https://worker.example/feedback',{method:'POST',headers:{origin:env.ALLOWED_ORIGIN,'content-type':'application/json','x-idempotency-key':'source-review-1'},body:JSON.stringify({id:3,kind:'source_review',source_url:'https://eitaa.com/example',platform:'eitaa',verdict:'person_candidate',note:'نام فرد در صفحه دیده می‌شود'})});
const sourceReviewResponse=await worker.fetch(sourceReviewRequest,env);assert.equal(sourceReviewResponse.status,202);assert.equal((await sourceReviewResponse.json()).ok,true);
const blocked=await worker.fetch(new Request('https://worker.example',{method:'POST',headers:{origin:'https://evil.example'}}),env);assert.equal(blocked.status,403);
globalThis.fetch=nativeFetch;
console.log('worker tests: OK');
