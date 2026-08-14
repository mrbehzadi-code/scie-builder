from __future__ import annotations
import json, os, re, time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, urljoin
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'docs/data.json'
LEADS=ROOT/'input/discovery_leads.json'
RUNS=ROOT/'docs/lead_runs.json'

class ResultParser(HTMLParser):
    def __init__(self): super().__init__(); self.items=[]; self._a=None; self._text=[]; self._in_result=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='a' and 'result__a' in a.get('class',''):
            self._a=a.get('href',''); self._text=[]; self._in_result=True
    def handle_data(self,data):
        if self._in_result: self._text.append(data)
    def handle_endtag(self,tag):
        if tag=='a' and self._in_result:
            title=' '.join(''.join(self._text).split())
            if title and self._a: self.items.append((title,self._a))
            self._a=None; self._text=[]; self._in_result=False

def norm(s): return re.sub(r'\s+',' ',str(s or '').strip()).casefold()
def search(q):
    url='https://html.duckduckgo.com/html/?q='+quote(q)
    req=Request(url,headers={'User-Agent':'SCIE-Lead-Discovery/1.0'})
    try:
        html=urlopen(req,timeout=25).read().decode('utf-8','ignore')
        p=ResultParser(); p.feed(html); return p.items[:12]
    except Exception as e:
        print('search failed',q,e); return []

def queries(lead):
    v=lead.get('value','').strip(); loc=lead.get('location','').strip() or 'اردکان'
    base=[f'"{v}" {loc}',f'{v} Ardakan',f'{v} اردکان یزد']
    typ=lead.get('type')
    if typ=='surname': base += [f'"{v}" اردکان خانواده',f'"{v}" Ardakan people']
    elif typ=='organization': base += [f'"{v}" اردکان مدیر',f'"{v}" Ardakan company']
    elif typ=='expertise': base += [f'"{v}" اردکان متخصص',f'"{v}" Ardakan expert']
    elif typ=='address': base += [f'"{v}" اردکان',f'"{v}" Ardakan']
    return list(dict.fromkeys(base))[:6]

def main():
    event=json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text(encoding='utf-8'))
    issue=event.get('issue',{}); body=issue.get('body','') or ''
    if not issue.get('title','').startswith('[SCIE LEAD]'): return
    m=re.search(r'<!--SCIE_LEAD\n(.*?)\nSCIE_LEAD-->',body,re.S)
    if not m: raise SystemExit('SCIE lead payload missing')
    lead=json.loads(m.group(1)); lead['issue_number']=issue.get('number'); lead['submitted_at']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
    leads=json.loads(LEADS.read_text(encoding='utf-8')) if LEADS.exists() else {'schema':'scie-discovery-leads-v1','leads':[]}
    leads.setdefault('leads',[]).append(lead); LEADS.write_text(json.dumps(leads,ensure_ascii=False,indent=2),encoding='utf-8')
    data=json.loads(DATA.read_text(encoding='utf-8')); people=data.setdefault('people',[])
    existing={(norm(p.get('name')),norm(p.get('url'))) for p in people}
    found=[]
    for q in queries(lead):
        for title,url in search(q):
            full=urljoin('https://duckduckgo.com/',url)
            key=(norm(title),norm(full))
            if key in existing: continue
            p={'name':title,'type':'کاندیدای کشف از سرنخ','source':'Lead-guided Web Discovery','detail':f"نتیجه وب برای سرنخ «{lead.get('value','')}»",'location':lead.get('location') or 'Ardakan signal','evidence':[f"lead: {lead.get('value','')}",f'query: {q}'],'url':full,'verification':'needs_review','confidence':'low','lead_id':lead.get('id')}
            people.append(p); existing.add(key); found.append(p)
            if len(found)>=30: break
        if len(found)>=30: break
    data['generated_at']=time.strftime('%Y-%m-%d')
    data.setdefault('stats',{})['people']=len(people)
    data['stats']['lead_guided_records']=sum(1 for p in people if p.get('source')=='Lead-guided Web Discovery')
    DATA.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    runs=json.loads(RUNS.read_text(encoding='utf-8')) if RUNS.exists() else {'runs':[]}
    runs['runs'].append({'lead_id':lead.get('id'),'issue_number':lead.get('issue_number'),'value':lead.get('value'),'status':'completed','new_records':len(found),'completed_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())})
    runs['runs']=runs['runs'][-50:]; RUNS.write_text(json.dumps(runs,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Lead discovery complete: {len(found)} new records; pool={len(people)}')

if __name__=='__main__': main()
