from __future__ import annotations
import json, os, re, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'docs/data.json'; FEEDBACK=ROOT/'docs/user_feedback.json'; RELATIONS=ROOT/'docs/relationships.json'; SOURCE_REVIEWS=ROOT/'docs/source_reviews.json'

def load(path,default): return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default
def save(path,value): path.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
def payload(issue):
    match=re.search(r'<!--SCIE_FEEDBACK\n(.*?)\nSCIE_FEEDBACK-->',issue.get('body','') or '',re.S)
    if not match: raise SystemExit('SCIE feedback payload missing')
    value=json.loads(match.group(1)); value['issue_number']=issue.get('number'); value['processed_at']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()); return value

def main():
    event=json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text(encoding='utf-8')); issue=event.get('issue',{})
    if not issue.get('title','').startswith(('[SCIE FEEDBACK]','[SCIE RELATIONSHIP]','[SCIE SOURCE REVIEW]')): return
    item=payload(issue); kind=item.get('kind')
    if kind=='locality_review':
        store=load(FEEDBACK,{'schema':'scie-user-feedback-v1','reviews':[]}); store['reviews'].append(item); store['reviews']=store['reviews'][-1000:]; save(FEEDBACK,store)
        data=load(DATA,{'people':[]}); idx=int(item.get('record_index',-1))
        if 0<=idx<len(data.get('people',[])):
            person=data['people'][idx]; person['community_review']={'verdict':item.get('verdict'),'reason':item.get('reason'),'note':item.get('note'),'reviewed_at':item['processed_at']}
            if item.get('verdict')=='not_ardakani': person['verification']='community_rejected'
            elif item.get('verdict')=='ardakani': person['verification']='community_confirmed'
            save(DATA,data)
    elif kind=='relationship':
        store=load(RELATIONS,{'schema':'scie-human-relationships-v1','relationships':[]}); item['status']='human_asserted_unverified'; store['relationships'].append(item); store['relationships']=store['relationships'][-1000:]; save(RELATIONS,store)
    elif kind=='source_review':
        store=load(SOURCE_REVIEWS,{'schema':'scie-source-review-v1','reviews':[]}); item['status']='human_reviewed_unverified'; store['reviews'].append(item); store['reviews']=store['reviews'][-2000:]; save(SOURCE_REVIEWS,store)
    else: raise SystemExit('Unsupported feedback kind')
    print(f'Processed {kind} feedback')

if __name__=='__main__': main()
