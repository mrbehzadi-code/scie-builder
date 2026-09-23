"""Harvest person candidates from public social pages with auditable provenance.

No authentication, private content, member lists, or access-control bypass is used.
Telegram public preview pages are crawled directly. Eitaa and Instagram URLs found
on those pages are treated as public profile metadata and fetched only when open.
"""
from __future__ import annotations

import html
import argparse
import json
import re
import sys
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "data.json"
REGISTRY = ROOT / "discovery_sources.json"
REPORT = ROOT / "docs" / "social_discovery_report.json"
TARGET = 1000
MAX_PAGES_PER_FEED = 120

TITLES = r"(?:دکتر|مهندس|استاد|پروفسور|آقای|خانم|حجت[‌\s]*الاسلام|سرکار\s+خانم|جناب\s+آقای)"
PERSIAN_NAME = r"[آ-ی][آ-ی‌\-]{1,24}(?:\s+[آ-ی][آ-ی‌\-]{1,24}){1,3}"
NAME_RE = re.compile(rf"{TITLES}\s+({PERSIAN_NAME})")
BAD_WORDS = {"اردکان", "یزد", "ایران", "دانشگاه", "بیمارستان", "شهرستان", "استان", "روابط", "عمومی", "اسلامی", "محترم", "گرامی", "عزیز", "شریف", "شهید", "امام"}


class TelegramPage(HTMLParser):
    def __init__(self):
        super().__init__(); self.messages=[]; self.links=[]; self._depth=0; self._parts=[]; self.ids=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs); cls=a.get("class", "")
        if "tgme_widget_message_text" in cls: self._depth=1; self._parts=[]
        elif self._depth: self._depth += 1
        href=a.get("href")
        if href: self.links.append(href)
        post=a.get("data-post")
        if post and "/" in post:
            try: self.ids.append(int(post.rsplit("/",1)[1]))
            except ValueError: pass
    def handle_endtag(self, tag):
        if self._depth:
            self._depth -= 1
            if not self._depth:
                text=re.sub(r"\s+", " ", html.unescape(" ".join(self._parts))).strip()
                if text: self.messages.append(text)
    def handle_data(self, data):
        if self._depth: self._parts.append(data)


def fetch(url, timeout=25):
    req=Request(url, headers={"User-Agent":"Mozilla/5.0 (compatible; SCIE-PublicResearch/1.0)"})
    with urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def norm(value):
    value=value.replace("ي","ی").replace("ك","ک")
    return re.sub(r"[^آ-یa-z0-9]+", " ", value.casefold()).strip()


def valid_name(name):
    words=name.split()
    return 2 <= len(words) <= 4 and not any(w in BAD_WORDS for w in words) and len(norm(name)) >= 5


def role(text):
    for label, needles in {
        "پزشکی و سلامت":("پزشک","دکتر","پرستار","درمان"),
        "دانش و دانشگاه":("استاد","پژوهشگر","هیئت علمی","دانشگاه"),
        "فنی و مهندسی":("مهندس","فنی","صنعت"),
        "فرهنگ و هنر":("هنرمند","شاعر","نویسنده","فرهنگ"),
        "مدیریت و جامعه":("مدیر","رئیس","شهردار","عضو شورا"),
    }.items():
        if any(x in text for x in needles): return label
    return "ظرفیت اجتماعی"


def crawl_telegram(feed):
    url=feed; seen=set(); rows=[]; outbound=set(); pages=0
    while url and pages < MAX_PAGES_PER_FEED:
        page=TelegramPage()
        try: page.feed(fetch(url))
        except Exception as exc: return rows, outbound, {"url":url,"error":str(exc),"pages":pages}
        pages += 1
        for link in page.links:
            host=urlparse(link).netloc.casefold().removeprefix("www.")
            if host in {"eitaa.com","instagram.com"}: outbound.add(link.split("?",1)[0])
        for text in page.messages:
            explicit_locality="اردکان" in text or "اردکانی" in text
            for name in NAME_RE.findall(text):
                name=re.sub(r"\s+", " ", name).strip(" -–—،؛:.()[]")
                if not valid_name(name): continue
                key=(norm(name), feed)
                if key in seen: continue
                seen.add(key)
                score=60 if explicit_locality else 45
                signal="Ardakan keyword in same public post" if explicit_locality else "professional name in an Ardakan-focused public channel"
                rows.append({"name":name,"type":role(text),"source":"کانال‌ها و گروه‌های عمومی تلگرام","detail":text[:420],"location":"اردکان (شاهد متنی؛ نیازمند راستی‌آزمایی)","evidence":["public Telegram preview",signal],"url":feed,"verification":"needs_review","confidence":"medium" if explicit_locality else "low","public_evidence_score":score,"locality_claim":"candidate_not_confirmed","access_scope":"public_post"})
        if not page.ids: break
        before=min(page.ids)
        next_url=feed + ("&" if "?" in feed else "?") + f"before={before}"
        if next_url==url: break
        url=next_url
        time.sleep(.08)
    return rows, outbound, {"url":feed,"pages":pages,"records":len(rows),"status":"ok"}


def public_profile_metadata(url, platform):
    try: raw=fetch(url, 15)
    except Exception as exc: return None, str(exc)
    title=re.search(r"<title[^>]*>(.*?)</title>",raw,re.I|re.S)
    desc=re.search(r'<meta[^>]+(?:name|property)=["\'](?:description|og:description)["\'][^>]+content=["\'](.*?)["\']',raw,re.I|re.S)
    text=html.unescape(re.sub(r"<[^>]+>"," ",(title.group(1) if title else "")+" "+(desc.group(1) if desc else "")))
    if "اردکان" not in text: return None, "no Ardakan signal in public metadata"
    match=NAME_RE.search(text)
    if not match or not valid_name(match.group(1)): return None, "no person name in public metadata"
    name=re.sub(r"\s+"," ",match.group(1)).strip()
    label="کانال‌ها، گروه‌ها و پروفایل‌های عمومی ایتا" if platform=="eitaa" else "صفحه‌ها و فرادادهٔ عمومی پروفایل‌های اینستاگرام"
    return {"name":name,"type":role(text),"source":label,"detail":text[:420],"location":"اردکان (فرادادهٔ عمومی؛ نیازمند راستی‌آزمایی)","evidence":[f"public {platform} profile metadata","Ardakan signal in public metadata"],"url":url,"verification":"needs_review","confidence":"low","public_evidence_score":45,"locality_claim":"candidate_not_confirmed","access_scope":"public_profile_metadata_only"}, None


def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--snapshot-only",action="store_true"); args=parser.parse_args()
    config=json.loads(REGISTRY.read_text(encoding="utf-8")); feeds=[]
    for source in config["sources"]:
        if source["id"]=="telegram": feeds=source.get("public_feeds",[])
    collected=[]; outbound=set(); coverage=[]
    if not args.snapshot_only:
        with ThreadPoolExecutor(max_workers=min(3, len(feeds) or 1)) as pool:
            futures={pool.submit(crawl_telegram,feed):feed for feed in feeds}
            for future in as_completed(futures):
                rows, links, status=future.result(); collected.extend(rows); outbound |= links; coverage.append(status)
    platform_attempts=Counter(); platform_errors=[]
    for link in sorted(outbound):
        platform="eitaa" if "eitaa.com" in link.casefold() else "instagram"
        platform_attempts[platform]+=1
        row,error=public_profile_metadata(link,platform)
        if row: collected.append(row)
        elif error: platform_errors.append({"platform":platform,"url":link,"result":error[:180]})
    data=json.loads(DATA.read_text(encoding="utf-8")); people=data.setdefault("people",[])
    # If a previous run crossed the exact delivery boundary, retain the newly
    # harvested social record and remove a lower-scored OpenAlex candidate.
    while len(people)>TARGET:
        removable=next((i for i in range(len(people)-1,-1,-1) if people[i].get("source")=="OpenAlex Discovery" and people[i].get("public_evidence_score",0)<=55),len(people)-1)
        people.pop(removable)
    existing={norm(p.get("name","")) for p in people if p.get("name")}; added=[]
    for row in sorted(collected,key=lambda x:(-x["public_evidence_score"],norm(x["name"]))):
        if len(people)>=TARGET: break
        key=norm(row["name"])
        if key in existing: continue
        people.append(row); existing.add(key); added.append(row)
    counts=Counter(p.get("source","unknown") for p in people)
    stats=data.setdefault("stats",{}); stats["people"]=len(people); stats["sources"]=dict(sorted(counts.items())); stats["social_public_records"]=sum(1 for p in people if p.get("access_scope")); data["target"]=TARGET; data["generated_at"]=time.strftime("%Y-%m-%d")
    DATA.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8")
    previous={}
    if args.snapshot_only and REPORT.exists():
        try: previous=json.loads(REPORT.read_text(encoding="utf-8"))
        except Exception: previous={}
    report={"generated_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"target":TARGET,"pool_size":len(people),"new_records":len(added),"records_in_snapshot_by_source":dict(sorted(counts.items())),"telegram":coverage or previous.get("telegram",[]),"outbound_public_profiles":dict(platform_attempts) or previous.get("outbound_public_profiles",{}),"platform_results":{"eitaa":sum(1 for x in collected if "ایتا" in x["source"]),"instagram":sum(1 for x in collected if "اینستاگرام" in x["source"])} if collected else previous.get("platform_results",{"eitaa":0,"instagram":0}),"restricted_or_unusable":platform_errors[:200] or previous.get("restricted_or_unusable",[]),"policy":"Public pages/metadata only; no login or private-content access."}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False))


if __name__=="__main__": main()
