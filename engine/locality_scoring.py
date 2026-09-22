"""Evidence-based Ardakan locality scoring.

The surname or the word ``Ardakani`` alone is deliberately weak evidence.
This module creates a reviewable derived layer and never deletes raw records.
"""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'docs/data.json'; OUTPUT=ROOT/'docs/locality_assessment.json'; FEEDBACK=ROOT/'docs/user_feedback.json'

def text(person):
    return ' '.join(str(person.get(k,'') or '') for k in ('name','detail','location','affiliation','organization','evidence','url')).casefold()

def assess(person):
    raw=text(person); name=str(person.get('name','')).casefold(); reasons=[]; score=0
    strong=[('اردکان، یزد',45),('اردکان یزد',45),('ardakan, yazd',45),('ardakan yazd',45),('اهل اردکان',40),('متولد اردکان',40),('born in ardakan',40)]
    medium=[('دانشگاه اردکان',25),('ardakan university',25),('فرمانداری اردکان',25),('شهرداری اردکان',25),('شبکه بهداشت اردکان',25),('شهرستان اردکان',25)]
    for signal,weight in strong+medium:
        if signal in raw: score+=weight; reasons.append({'signal':signal,'weight':weight})
    if re.search(r'\b(ardakani|ardakan)\b',name) or 'اردکانی' in name:
        score+=8; reasons.append({'signal':'نام یا نام خانوادگی اردکانی (نشانهٔ ضعیف)','weight':8})
    if person.get('lead_id') and ('اردکان' in raw or 'ardakan' in raw):
        score+=10; reasons.append({'signal':'کشف هدایت‌شده همراه با شاهد مکانی','weight':10})
    independent=sum(1 for key in ('source','url','organization','affiliation','location') if person.get(key))
    if independent>=3: score+=10; reasons.append({'signal':'حداقل سه میدان مستقل','weight':10})
    score=min(score,100)
    status='confirmed' if score>=70 else 'probable' if score>=45 else 'possible' if score>=20 else 'insufficient'
    return {'score':score,'status':status,'reasons':reasons,'needs_human_review':score<70}

def main():
    data=json.loads(DATA.read_text(encoding='utf-8')); people=data.get('people',[])
    feedback=json.loads(FEEDBACK.read_text(encoding='utf-8')).get('reviews',[]) if FEEDBACK.exists() else []
    latest={}
    for row in feedback: latest[str(row.get('record_index'))]=row
    rows=[]
    for index,person in enumerate(people):
        row={'candidate_index':index,'name':person.get('name'),**assess(person)}
        review=latest.get(str(index))
        if review:
            row['human_review']=review
            if review.get('verdict')=='not_ardakani': row.update(status='rejected_by_human',needs_human_review=False)
            elif review.get('verdict')=='ardakani': row.update(status='confirmed_by_human',needs_human_review=False)
        rows.append(row)
    counts={}
    for row in rows: counts[row['status']]=counts.get(row['status'],0)+1
    OUTPUT.write_text(json.dumps({'schema':'scie-locality-assessment-v1','counts':counts,'assessments':rows},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(counts,ensure_ascii=False))

if __name__=='__main__': main()
