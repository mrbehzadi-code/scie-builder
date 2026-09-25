from __future__ import annotations
import json, os, re, time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'docs/data.json'; LEADS=ROOT/'input/discovery_leads.json'; RUNS=ROOT/'docs/lead_runs.json'; SOURCES=ROOT/'discovery_sources.json'

def norm(s): return re.sub(r'\s+',' ',str(s or '').strip()).casefold()
def fetch(url, headers=None, timeout=25):
    h={'User-Agent':'SCIE-Lead-Discovery/1.3'}; h.update(headers or {})
    with urlopen(Request(url,headers=h),timeout=timeout) as r: return r.read().decode('utf-8','ignore')
def lead_queries(lead):
    v=lead.get('value','').strip(); typ=lead.get('type'); context=' '.join(x for x in (lead.get('location','').strip(),lead.get('note','').strip()) if x)
    qs=[v,f'{v} Ardakan',f'Ardakan {v}',f'{v} اردکان',f'اردکان {v}']
    if context: qs += [f'{v} {context}',f'{v} {context} اردکان']
    if typ=='surname': qs += [f'{v} Ardakan family',f'{v} اردکان خانواده']
    if typ=='organization': qs += [f'{v} Ardakan company',f'{v} اردکان شرکت']
    if typ=='expertise': qs += [f'{v} Ardakan expert',f'{v} اردکان متخصص']
    if typ=='address': qs += [f'{v} Ardakan',f'{v} اردکان']
    return list(dict.fromkeys(qs))[:12]
def targeted_queries(lead):
    registry=json.loads(SOURCES.read_text(encoding='utf-8')) if SOURCES.exists() else {'sources':[]}; value=lead.get('value','').strip()
    out=[]
    for source in registry.get('sources',[]):
        for template in source.get('query_templates',[]): out.append((source.get('label','وب عمومی'),template.format(value=value)))
    return out
def web_results(q):
    try:
        html=fetch('https://html.duckduckgo.com/html/?q='+quote(q))
        pat=r'<a[^>]+class=["\'][^"\']*result__a[^"\']*["\'][^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>'
        out=[]
        for url,title in re.findall(pat,html,re.I|re.S):
            title=' '.join(re.sub('<[^>]+>',' ',title).split())
            if title and url: out.append((title,url))
        return out[:12]
    except Exception as e: print('web search failed',q,e); return []
def openalex(lead):
    results=[]
    for q in lead_queries(lead):
        try:
            raw=json.loads(fetch('https://api.openalex.org/authors?search='+quote(q)+'&per-page=15'))
            for a in raw.get('results',[]):
                if a.get('display_name'): results.append((a['display_name'].strip(),a.get('id',''),q))
            if len(results)>=25: break
        except Exception as e: print('OpenAlex lead search failed',q,e)
    return results
def github(lead):
    qs=[lead.get('value','').strip()+' in:bio','Ardakan in:bio','Ardakan in:location']
    out=[]
    for q in qs:
        try:
            raw=json.loads(fetch('https://api.github.com/search/users?q='+quote(q)+'&per_page=15',{'Accept':'application/vnd.github+json'}))
            out += [(u.get('login',''),f"https://github.com/{u.get('login')}",q) for u in raw.get('items',[]) if u.get('login')]
        except Exception as e: print('GitHub lead search failed',q,e)
        if len(out)>=20: break
    return out
def add_candidate(people,existing,lead,name,url,source,detail,evidence):
    key=(norm(name),norm(url))
    if not name or key in existing: return None
    combined=' '.join([name,url,detail,*evidence]).casefold(); explicit=any(x in combined for x in ('اردکان','ardakan'))
    record={'name':name,'type':'کاندیدای معرفی‌شده به اطلس','source':source,'detail':detail,'location':lead.get('location') or '', 'evidence':evidence,'url':url,'verification':'needs_review','confidence':'medium' if explicit else 'low','locality_claim':'candidate_not_confirmed','lead_id':lead.get('id')}
    people.append(record); existing.add(key)
    return {'record_index':len(people)-1,'name':name,'url':url,'source':source}
def source_counts(people):
    out={}
    for p in people:
        s=p.get('source','unknown'); out[s]=out.get(s,0)+1
    return dict(sorted(out.items()))
def main():
    event=json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text(encoding='utf-8')); issue=event.get('issue',{}); body=issue.get('body','') or ''
    if not issue.get('title','').startswith('[SCIE LEAD]'): return
    m=re.search(r'<!--SCIE_LEAD\n(.*?)\nSCIE_LEAD-->',body,re.S)
    if not m: raise SystemExit('SCIE lead payload missing')
    lead=json.loads(m.group(1)); lead['issue_number']=issue.get('number'); lead['submitted_at']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
    leads=json.loads(LEADS.read_text(encoding='utf-8')) if LEADS.exists() else {'schema':'scie-discovery-leads-v1','leads':[]}; leads.setdefault('leads',[]).append(lead); LEADS.write_text(json.dumps(leads,ensure_ascii=False,indent=2),encoding='utf-8')
    data=json.loads(DATA.read_text(encoding='utf-8')); people=data.setdefault('people',[]); existing={(norm(p.get('name')),norm(p.get('url'))) for p in people}; found=0; result_records=[]
    for name,url,q in openalex(lead):
        added=add_candidate(people,existing,lead,name,url,'Lead-guided OpenAlex Discovery',f"OpenAlex result for «{lead.get('value','')}»",[f"lead: {lead.get('value','')}",f'query: {q}'])
        if added: found+=1; result_records.append(added)
        if found>=20: break
    if found<20:
        for name,url,q in github(lead):
            added=add_candidate(people,existing,lead,name,url,'Lead-guided GitHub Discovery',f"GitHub result for «{lead.get('value','')}»",[f"lead: {lead.get('value','')}",f'query: {q}'])
            if added: found+=1; result_records.append(added)
            if found>=25: break
    if found<30:
        queries=[('وب عمومی',q) for q in lead_queries(lead)]+targeted_queries(lead)
        for source_label,q in queries:
            for title,url in web_results(q):
                added=add_candidate(people,existing,lead,title,url,f'Lead-guided {source_label}',f"نتیجه عمومی برای سرنخ «{lead.get('value','')}»",[f"lead: {lead.get('value','')}",f'public source: {source_label}',f'query: {q}'])
                if added: found+=1; result_records.append(added)
                if found>=45: break
            if found>=45: break
    data['generated_at']=time.strftime('%Y-%m-%d')
    stats=data.setdefault('stats',{})
    stats['people']=len(people)
    stats['lead_guided_records']=sum(1 for p in people if p.get('source','').startswith('Lead-guided'))
    stats['sources']=source_counts(people)
    stats['last_lead']={'id':lead.get('id'),'issue_number':lead.get('issue_number'),'type':lead.get('type'),'value':lead.get('value'),'completed_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'new_records':found}
    DATA.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    runs=json.loads(RUNS.read_text(encoding='utf-8')) if RUNS.exists() else {'runs':[]}; runs['runs'].append({'lead_id':lead.get('id'),'issue_number':lead.get('issue_number'),'value':lead.get('value'),'status':'completed','new_records':found,'result_records':result_records,'pool_size':len(people),'completed_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}); runs['runs']=runs['runs'][-50:]; RUNS.write_text(json.dumps(runs,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Lead discovery complete: {found} new records; pool={len(people)}')
if __name__=='__main__': main()
