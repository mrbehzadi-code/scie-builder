"""Conservative, explainable entity resolution for SCIE candidate records.

Raw candidates are never modified or merged. The engine emits pair decisions and
resolved entity groups as a separate derived layer.
"""
from __future__ import annotations
import argparse,json,re,unicodedata
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any,Iterable

WEIGHTS={"name":.40,"organization":.20,"location":.10,"academic":.15,"technical":.10,"publication":.05}
SAME_THRESHOLD=.92
LIKELY_SAME_THRESHOLD=.76
LIKELY_DIFFERENT_THRESHOLD=.28
PERSIAN_TO_LATIN=str.maketrans({"ا":"a","آ":"a","ب":"b","پ":"p","ت":"t","ث":"s","ج":"j","چ":"ch","ح":"h","خ":"kh","د":"d","ذ":"z","ر":"r","ز":"z","ژ":"zh","س":"s","ش":"sh","ص":"s","ض":"z","ط":"t","ظ":"z","ع":"a","غ":"gh","ف":"f","ق":"gh","ک":"k","گ":"g","ل":"l","م":"m","ن":"n","و":"v","ه":"h","ی":"y","ئ":"y","ء":"","ۀ":"h","ي":"y","ك":"k"})

def normalize_text(value:Any)->str:
    if value is None:return ""
    text=unicodedata.normalize("NFKC",str(value)).lower().translate(PERSIAN_TO_LATIN).replace("&"," and ")
    return re.sub(r"\s+"," ",re.sub(r"[^\w\s]"," ",text,flags=re.UNICODE)).strip()

def tokenize(value:Any)->set[str]:return {t for t in normalize_text(value).split() if t}

def similarity(a:Any,b:Any)->float|None:
    na,nb=normalize_text(a),normalize_text(b)
    if not na or not nb:return None
    if na==nb:return 1.0
    ta,tb=tokenize(na),tokenize(nb)
    jac=len(ta&tb)/len(ta|tb) if ta and tb else 0.0
    return round(max(jac,SequenceMatcher(None,na,nb).ratio()),4)

def _values(r:dict[str,Any],keys:Iterable[str])->list[str]:
    vals=[]
    for k in keys:
        v=r.get(k)
        if isinstance(v,list):vals.extend(str(x) for x in v if x)
        elif isinstance(v,dict):vals.extend(str(x) for x in v.values() if isinstance(x,(str,int,float)))
        elif v not in (None,"","—"):vals.append(str(v))
    return vals

def _best(a:list[str],b:list[str])->float|None:
    p=[similarity(x,y) for x in a for y in b];p=[x for x in p if x is not None]
    return max(p) if p else None

def _ids(r:dict[str,Any])->set[str]:
    out=set()
    for k in ("openalex_id","orcid","github_username","github_login","github_url","url","profile_url"):
        v=r.get(k)
        if v:
            s=str(v).lower()
            if "openalex.org/" in s or "orcid.org/" in s:out.add(s)
    return out

def _academic(r):return _values(r,("publication","publications","works","topics","affiliations","institutions"))
def _technical(r):return _values(r,("github_username","github_login","github_url","personal_website","website","profile_url","email_domain"))
def _pubs(r):return {normalize_text(v) for v in _values(r,("publication","publications","works","coauthors","co_authors","topics")) if normalize_text(v)}
ORG_STOPWORDS={"university","of","the","institute","institution","center","centre","research","and","branch"}
def _org(r):
    vals=_values(r,("organization","organisation","company","university","institution","affiliation","institutions"))
    if not vals and r.get("detail") and "·" in str(r["detail"]):vals.append(str(r["detail"]).split("·",1)[1].strip())
    return vals
def _loc(r):return _values(r,("location","birth_place","residence","work_location","city","province","country"))

def compare_pair(a:dict[str,Any],b:dict[str,Any])->dict[str,Any]:
    evidence=[];missing=[];conflicts=[]
    shared=_ids(a)&_ids(b)
    if shared:return {"decision":"SAME_PERSON","score":1.0,"confidence":1.0,"evidence":[{"type":"stable_identifier","result":"exact_match","values":sorted(shared)}],"missing_evidence":[],"conflicts":[],"human_review_required":False,"explanation":"The records share the same stable academic identifier."}
    name=similarity(a.get("name"),b.get("name"))
    if name is None:missing.append("name")
    else:evidence.append({"type":"name","result":"strong_match" if name>=.9 else "partial_match","score":name})
    org=_best(_org(a),_org(b))
    if org is None:missing.append("organization")
    else:
        evidence.append({"type":"organization","result":"exact_match" if org>=.97 else "partial_match","score":org})
        oa=tokenize(_org(a)[0])-ORG_STOPWORDS;ob=tokenize(_org(b)[0])-ORG_STOPWORDS
        if not (oa&ob):conflicts.append("organization")
    loc=_best(_loc(a),_loc(b))
    if loc is None:missing.append("location")
    else:
        evidence.append({"type":"location","result":"match" if loc>=.8 else "partial_match","score":loc})
        if loc<.25:conflicts.append("location")
    academic=_best(_academic(a),_academic(b))
    if academic is None:missing.append("academic")
    else:evidence.append({"type":"academic","result":"match" if academic>=.85 else "partial_match","score":academic})
    technical=_best(_technical(a),_technical(b))
    if technical is None:missing.append("technical")
    else:evidence.append({"type":"technical","result":"match" if technical>=.85 else "partial_match","score":technical})
    pa,pb=_pubs(a),_pubs(b)
    if not pa or not pb:pub=None;missing.append("publication")
    else:
        pub=len(pa&pb)/len(pa|pb);evidence.append({"type":"publication","result":"overlap" if pub>0 else "no_overlap","score":round(pub,4)})
    scores={"name":name,"organization":org,"location":loc,"academic":academic,"technical":technical,"publication":pub};available={k:v for k,v in scores.items() if v is not None};ws=sum(WEIGHTS[k] for k in available);score=round(sum(WEIGHTS[k]*v for k,v in available.items())/ws if ws else 0,4)
    strong=[k for k,v in available.items() if k!="name" and v>=.75]
    if not strong:decision="LIKELY_DIFFERENT_PERSON" if score<LIKELY_DIFFERENT_THRESHOLD else "UNCERTAIN"
    elif conflicts and score<SAME_THRESHOLD:decision="UNCERTAIN"
    elif score>=SAME_THRESHOLD and len(strong)>=2:decision="SAME_PERSON"
    elif score>=LIKELY_SAME_THRESHOLD:decision="LIKELY_SAME_PERSON"
    elif score<=LIKELY_DIFFERENT_THRESHOLD:decision="LIKELY_DIFFERENT_PERSON"
    else:decision="UNCERTAIN"
    confidence=round(min(1.0,score*(1 if not missing else .85)),4);review=decision in {"UNCERTAIN","LIKELY_SAME_PERSON"}
    if conflicts:explanation="Conflicting organization/location evidence prevents a safe automatic merge."
    elif decision=="SAME_PERSON":explanation="Strong agreement across independent identity evidence supports the same-person decision."
    elif decision=="LIKELY_SAME_PERSON":explanation="Name agreement plus independent supporting evidence is strong, but not sufficient for automatic identity confirmation."
    elif decision=="LIKELY_DIFFERENT_PERSON":explanation="Available evidence is weak or substantially inconsistent for a same-person resolution."
    else:explanation="Evidence is insufficient for a safe identity decision; human review is required."
    return {"decision":decision,"score":score,"confidence":confidence,"evidence":evidence,"missing_evidence":sorted(set(missing)),"conflicts":sorted(set(conflicts)),"human_review_required":review,"explanation":explanation}

def resolve_records(records:list[dict[str,Any]])->dict[str,Any]:
    pairs=[];groups=[];counts={d:0 for d in ("SAME_PERSON","LIKELY_SAME_PERSON","UNCERTAIN","LIKELY_DIFFERENT_PERSON")}
    for i in range(len(records)):
        for j in range(i+1,len(records)):
            r=compare_pair(records[i],records[j]);counts[r["decision"]]+=1
            if r["decision"]=="SAME_PERSON" and not r["human_review_required"]:
                merged={i,j};affected=[g for g in groups if g&merged]
                for g in affected:merged|=g;groups.remove(g)
                groups.append(merged)
            pairs.append({"candidate_a":i,"candidate_b":j,**r})
    entities=[];used=set()
    for g in groups:used|=g;entities.append({"entity_id":f"entity-{len(entities)+1:05d}","candidate_indexes":sorted(g)})
    for i in range(len(records)):
        if i not in used:entities.append({"entity_id":f"entity-{len(entities)+1:05d}","candidate_indexes":[i]})
    return {"input_count":len(records),"pair_count":len(pairs),"decision_counts":counts,"human_review_count":sum(p["human_review_required"] for p in pairs),"entities":entities,"pairs":pairs}

def load_records(path:Path)->list[dict[str,Any]]:
    data=json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data,dict) and isinstance(data.get("people"),list):return data["people"]
    if isinstance(data,list):return data
    raise ValueError("Expected a list of candidate records or an object containing 'people'.")

def main()->int:
    p=argparse.ArgumentParser(prog="entity-resolution");p.add_argument("input",type=Path,nargs="?",default=Path("docs/data.json"));p.add_argument("--output",type=Path,default=Path("outputs/entity_resolution.json"));a=p.parse_args();records=load_records(a.input);result=resolve_records(records);a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8");print(f"Candidates: {result['input_count']}");print(f"Pairs: {result['pair_count']}");print("Decisions:",result["decision_counts"]);print(f"Human review: {result['human_review_count']}");print(f"Entities: {len(result['entities'])}");return 0
if __name__=="__main__":raise SystemExit(main())
