from __future__ import annotations
import json, os, re, time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'docs/data.json'; LEADS=ROOT/'input/discovery_leads.json'; RUNS=ROOT/'docs/lead_runs.json'

def norm(s): return re.sub(r'\s+',' ',str(s or '').strip()).casefold()
def fetch(url, headers=None, timeout=25):
    h={'User-Agent':'SCIE-Lead-Discovery/1.1'}; h.update(headers or {})
    req=Request(url,headers=h)
    with urlopen(req,timeout=timeout) as r: return r.read().decode('utf-8','ignore')
def queries(lead):
    v=lead.get('value','').strip(); loc=lead.get('location','').strip() or 'اردکان'; typ=lead.get('type')
    qs=[f'"{v}" {loc}',f'{v} Ardakan',f'{v} اردکان یزد']
    if typ=='surname': qs += [f'"{v}" اردکان خانواده',f'"{v}" Ardakan people']
    elif typ=='organization': qs += [f'"{v}" اردکان مدیر',f'"{v}" Ardakan company']
    elif typ=='expertise': qs += [f'"{v}" اردکان متخصص',f'"{v}" Ardakan expert']
    elif typ=='address': qs += [f'"{v}" اردکان',f'"{v}" Ardakan']
    return list(dict.fromkeys(qs))[:6]
def web_results(q):
    try:
        html=fetch('https://html.duckduckgo.com/html/?q='+quote(q))
        pat=r'<a[^>]+class=["\'][^"\']*result__a[^"\']*["\'][^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>'
        out=[]
        for url,title in re.findall(pat,html,re.I|re.S):
            title=re.sub('<[^>]+>',' ',title); title=' '.join(title.split())
            if title and url: out.append((title,url))
        return out[:12]
    except Exception as e: print('web search failed',q,e); return []
def openalex(lead):
    q=lead.get('value','').strip()
    try:
        raw=json.loads(fetch('https://api.openalex.org/authors?search='+quote(q)+'&per-page=15'))
        return [(a.get('display_name','').strip(),a.get('id','')) for a in raw.get('results',[]) if a.get('display_name')]
    except Exception as e: print('OpenAlex lead search failed',e); return []
def github(lead):
    q=lead.get('value','').strip()+' in:bio'
    try:
        raw=json.loads(fetch('https://api.github.com/search/users?q='+quote(q)+'&per_page=15',{'Accept':'application/vnd.github+json'}))
        return [(u.get('login',''),f"https://github.com/{u.get('login')}") for u in raw.get('items',[]) if u.get('login')]
    except Exception as e: print('GitHub lead search failed',e); return []
def add_candidate(people,existing,lead,name,url,source,detail,evidence):
    key=(norm(name),norm(url))
    if not name or key in existing: return False
    p={'name':name,'type':'کاندیدای کشف از سرنخ','source':source,'detail':detail,'location':lead.get('location') or 'Ardakan signal','evidence':evidence,'url':url,'verification':'needs_review','confidence':'low','lead_id':lead.get('id')}
    people.append(p); existing.add(key); return True
def main():
    event=json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text(encoding='utf-8')); issue=event.get('issue',{}); body=issue.get('body','') or ''
    if not issue.get('title','').startswith('[SCIE LEAD]'): return
    m=re.search(r'<!--SCIE_LEAD\n(.*?)\nSCIE_LEAD-->',body,re.S)
    if not m: raise SystemExit('SCIE lead payload missing')
    lead=json.loads(m.group(1)); lead['issue_number']=issue.get('number'); lead['submitted_at']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
    leads=json.loads(LEADS.read_text(encoding='utf-8')) if LEADS.exists() else {'schema':'scie-discovery-leads-v1','leads':[]}; leads.setdefault('leads',[]).append(lead); LEADS.write_text(json.dumps(leads,ensure_ascii=False,indent=2),encoding='utf-8')
    data=json.loads(DATA.read_text(encoding='utf-8')); people=data.setdefault('people',[]); existing={(norm(p.get('name')),norm(p.get('url'))) for p in people}; found=0
    for name,url in openalex(lead):
        if add_candidate(people,existing,lead,name,url,'Lead-guided OpenAlex Discovery',f"OpenAlex result for «{lead.get('value','')}»",[f"lead: {lead.get('value','')}",'source: OpenAlex']): found+=1
        if found>=20: break
    if found<20:
        for name,url in github(lead):
            if add_candidate(people,existing,lead,name,url,'Lead-guided GitHub Discovery',f"GitHub result for «{lead.get('value','')}»",[f"lead: {lead.get('value','')}",'source: GitHub']): found+=1
            if found>=25: break
    if found<25:
        for q in queries(lead):
            for title,url in web_results(q):
                if add_candidate(people,existing,lead,title,url,'Lead-guided Web Discovery',f"نتیجه وب برای سرنخ «{lead.get('value','')}»",[f"lead: {lead.get('value','')}",f'query: {q}']): found+=1
                if found>=30: break
            if found>=30: break
    data['generated_at']=time.strftime('%Y-%m-%d'); data.setdefault('stats',{})['people']=len(people); data['stats']['lead_guided_records']=sum(1 for p in people if p.get('source','').startswith('Lead-guided'))
    DATA.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    runs=json.loads(RUNS.read_text(encoding='utf-8')) if RUNS.exists() else {'runs':[]}; runs['runs'].append({'lead_id':lead.get('id'),'issue_number':lead.get('issue_number'),'value':lead.get('value'),'status':'completed','new_records':found,'completed_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}); runs['runs']=runs['runs'][-50:]; RUNS.write_text(json.dumps(runs,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Lead discovery complete: {found} new records; pool={len(people)}')
if __name__=='__main__': main()
