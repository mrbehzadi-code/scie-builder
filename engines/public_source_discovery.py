"""Discover people from public, indexable web sources.

This collector does not bypass logins or crawl private profiles/groups. It uses
public search-result pages, requires an Ardakan signal in returned text, extracts
person-like names, scores evidence, and keeps provenance for human review.
"""
from __future__ import annotations
import html, json, re, sys, time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlparse
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/'docs/data.json'; REGISTRY=ROOT/'discovery_sources.json'; REPORT=ROOT/'docs/public_discovery_report.json'; CURATED=[ROOT/'docs/web_candidates.json',ROOT/'docs/web_candidates_extended.json']
TARGET=1000
ROLES=['پزشک','دندانپزشک','وکیل','استاد','هیئت علمی','پژوهشگر','مهندس','مدیر','کارآفرین','هنرمند','ورزشکار','مربی','معلم','خبرنگار','فعال اجتماعی']
STOP={'اردکان','یزد','ایران','دانشگاه','اخبار','خبر','کانال','گروه','شرکت','اداره','شهرستان','صفحه','اینستاگرام','تلگرام','ایتا','خانه','سایت','پایگاه'}

def clean(value): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',str(value or '')))).strip(' -–—|:،')
def norm(value): return re.sub(r'[^\wآ-ی]+',' ',clean(value).casefold()).strip()
def fetch(url,timeout=8):
    with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 SCIE-Public-Discovery/1.0'}),timeout=timeout) as r:return r.read().decode('utf-8','ignore')
def unwrap(url):
    if 'duckduckgo.com/l/?' in url:
        value=parse_qs(urlparse(url).query).get('uddg',[''])[0]
        return unquote(value) or url
    return url
def search(query):
    try: page=fetch('https://www.bing.com/search?format=rss&q='+quote(query))
    except Exception as exc: return query,[],str(exc)
    out=[]
    try:
        root=ET.fromstring(page)
        for item in root.findall('.//item'):
            out.append({'url':clean(item.findtext('link')),'title':clean(item.findtext('title')),'snippet':clean(item.findtext('description'))})
    except ET.ParseError as exc: return query,[],str(exc)
    return query,out[:12],None
def source_for(url,sources):
    host=urlparse(url).netloc.casefold().removeprefix('www.')
    for src in sources:
        if any(host==d or host.endswith('.'+d) for d in src.get('domains',[])): return src['label']
    return 'وب عمومی و رسانه‌ها'
def names(text):
    found=[]
    patterns=[r'(?:دکتر|مهندس|استاد|پروفسور|آقای|خانم|حجت(?:‌|\s)*الاسلام)\s+([آ-ی][آ-ی‌\-]+(?:\s+[آ-ی][آ-ی‌\-]+){1,3})',r'\b(?:Dr\.?|Prof\.?)\s+([A-Z][A-Za-z\-]+(?:\s+[A-Z][A-Za-z\-]+){1,3})\b']
    for pattern in patterns:
        found += re.findall(pattern,text)
    first=clean(re.split(r'[|–—:\-]| درباره | در اردکان | اردکان',text,1)[0])
    words=first.split()
    if 2<=len(words)<=4 and all(w not in STOP for w in words) and (all(re.fullmatch(r'[آ-ی‌]+',w) for w in words) or all(re.fullmatch(r'[A-Z][A-Za-z.]+',w) for w in words)): found.append(first)
    return list(dict.fromkeys(clean(x) for x in found if 2<=len(clean(x).split())<=4))
def main():
    registry=json.loads(REGISTRY.read_text(encoding='utf-8')); sources=registry['sources']; queries=[]
    for role in ROLES:
        queries += [f'{role} اردکان',f'{role} "اهل اردکان"',f'{role} "اردکان یزد"']
        for src in sources:
            for template in src.get('query_templates',[])[:1]: queries.append(template.format(value=role))
    queries=list(dict.fromkeys(queries)); results=[]; errors=[]
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures=[pool.submit(search,q) for q in queries]
        for future in as_completed(futures):
            q,rows,error=future.result(); results.extend((q,row) for row in rows)
            if error: errors.append({'query':q,'error':error})
    grouped={}
    for query,row in results:
        returned=f"{row['title']} {row['snippet']}"; low=returned.casefold()
        if not ('اردکان' in returned or 'ardakan' in low): continue
        for name in names(row['title']):
            key=norm(name); item=grouped.setdefault(key,{'name':name,'hits':[]}); item['hits'].append({**row,'query':query,'source':source_for(row['url'],sources)})
    accepted=[]
    for item in grouped.values():
        unique_urls={h['url'] for h in item['hits']}; source_labels={h['source'] for h in item['hits']}; first=item['hits'][0]
        score=35+min(25,10*(len(unique_urls)-1))+min(20,10*(len(source_labels)-1))+(15 if any('اهل اردکان' in h['snippet'] or 'متولد اردکان' in h['snippet'] for h in item['hits']) else 0)
        if score<45: continue
        accepted.append({'name':item['name'],'type':'کاندیدای کشف عمومی','source':first['source'],'detail':first['snippet'] or first['title'],'location':'اردکان (نیازمند راستی‌آزمایی)','evidence':[f"public search: {first['query']}",f"independent URLs: {len(unique_urls)}",f"source groups: {len(source_labels)}"],'url':first['url'],'verification':'needs_review','confidence':'high' if score>=75 else 'medium' if score>=55 else 'low','public_evidence_score':min(score,100),'locality_claim':'candidate_not_confirmed'})
    accepted.sort(key=lambda x:(-x['public_evidence_score'],norm(x['name'])))
    # Merge the existing manually reviewed public-web seed set with precise source labels.
    for path in CURATED:
        if not path.exists(): continue
        for row in json.loads(path.read_text(encoding='utf-8')).get('candidates',[]):
            if not row.get('name') or not row.get('url'): continue
            accepted.append({**row,'source':source_for(row['url'],sources),'locality_claim':'candidate_not_confirmed','public_evidence_score':{'high':85,'medium':65,'low':45}.get(row.get('confidence'),45)})
    data=json.loads(DATA.read_text(encoding='utf-8')); people=data.setdefault('people',[]); existing={(norm(p.get('name')),p.get('url','')) for p in people}; added=[]
    for candidate in accepted:
        key=(norm(candidate['name']),candidate['url'])
        if key in existing: continue
        people.append(candidate);existing.add(key);added.append(candidate)
        if len(people)>=TARGET: break
    counts={}
    for person in people: counts[person.get('source','unknown')]=counts.get(person.get('source','unknown'),0)+1
    data['target']=TARGET;data['generated_at']=time.strftime('%Y-%m-%d');data.setdefault('stats',{})['people']=len(people);data['stats']['sources']=dict(sorted(counts.items()));data['stats']['public_source_records']=sum(1 for p in people if p.get('public_evidence_score') is not None);DATA.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    report={'generated_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'target':TARGET,'queries':len(queries),'search_results':len(results),'accepted_candidates':len(accepted),'new_records':len(added),'pool_size':len(people),'by_source':counts,'errors':errors[:30]};REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');sys.stdout.reconfigure(encoding='utf-8');print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__': main()
