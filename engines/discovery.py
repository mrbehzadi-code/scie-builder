"""
Discovery Engine
----------------
Finds real GitHub users matching configured criteria (location, language)
using the GitHub REST Search API, then enriches each match with full
profile data (name, bio, company, public repo count, followers, ...).

Search criteria live in discovery_config.json at the project root, so
non-technical changes (a different country, a different language) never
require touching this file.

Rate limits (unauthenticated):
  - Search API : 10 requests / minute
  - Core API   : 60 requests / hour   (used for per-user profile lookups)

Set a GITHUB_TOKEN environment variable to raise these limits substantially
(30 req/min search, 5000 req/hour core). Without a token, keep max_results
modest (10-20) or the profile-lookup step will hit the hourly limit.
"""

import json
import os
import time
from pathlib import Path
from urllib import request, error, parse

CONFIG_PATH = Path("discovery_config.json")
OUTPUT_JSON = Path("outputs/discovery.json")
OUTPUT_TXT = Path("outputs/discovery.txt")

API_BASE = "https://api.github.com"


def _headers():
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "SCIE-Builder-Discovery-Engine",
    }
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _get(url):
    req = request.Request(url, headers=_headers())
    with request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def load_config():
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            f"Missing {CONFIG_PATH}. Discovery Engine needs this file to know "
            f"what to search for."
        )
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def build_query(config):
    parts = ["type:user"]
    if config.get("location"):
        parts.append(f'location:{config["location"]}')
    if config.get("language"):
        parts.append(f'language:{config["language"]}')
    return " ".join(parts)


def search_users(query, max_results):
    users = []
    page = 1
    per_page = min(30, max_results)

    while len(users) < max_results:
        url = (
            f"{API_BASE}/search/users?q={parse.quote(query)}"
            f"&per_page={per_page}&page={page}"
        )
        try:
            data = _get(url)
        except error.HTTPError as e:
            body = e.read().decode("utf-8", errors="ignore")
            print(f"Search API error: {e.code} {e.reason} - {body[:200]}")
            break

        items = data.get("items", [])
        if not items:
            break

        users.extend(items)
        if len(items) < per_page:
            break

        page += 1
        time.sleep(2)  # stay under unauthenticated search rate limit

    return users[:max_results]


def fetch_profile(login):
    url = f"{API_BASE}/users/{login}"
    try:
        data = _get(url)
    except error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        is_rate_limited = e.code == 403 and "rate limit" in body.lower()
        return {
            "login": login,
            "error": f"{e.code} {e.reason}",
            "rate_limited": is_rate_limited,
        }

    return {
        "login": data.get("login"),
        "name": data.get("name"),
        "location": data.get("location"),
        "bio": data.get("bio"),
        "company": data.get("company"),
        "blog": data.get("blog") or None,
        "public_repos": data.get("public_repos"),
        "followers": data.get("followers"),
        "html_url": data.get("html_url"),
    }


def discover():
    config = load_config()
    query = build_query(config)
    max_results = config.get("max_results", 10)

    print()
    print("Discovery Engine")
    print("-" * 50)
    print(f"Query      : {query}")
    print(f"Max results: {max_results}")

    candidates = search_users(query, max_results)
    print(f"Matched    : {len(candidates)} GitHub login(s)")

    profiles = []
    for i, c in enumerate(candidates, 1):
        login = c.get("login")
        print(f"  [{i}/{len(candidates)}] fetching profile: {login}")
        profile = fetch_profile(login)
        profiles.append(profile)

        if profile.get("rate_limited"):
            print()
            print("GitHub rate limit hit. Stopping early instead of wasting")
            print("further requests. Set a GITHUB_TOKEN environment variable")
            print("to raise the limit (60/hour -> 5000/hour) and re-run.")
            break

        time.sleep(1)  # stay under unauthenticated core rate limit

    OUTPUT_JSON.parent.mkdir(exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(profiles, f, indent=2, ensure_ascii=False)

    with open(OUTPUT_TXT, "w", encoding="utf-8") as f:
        for p in profiles:
            if "error" in p:
                f.write(f"{p['login']} - ERROR: {p['error']}\n")
                continue
            name = p.get("name") or p.get("login")
            loc = p.get("location") or "unknown location"
            repos = p.get("public_repos")
            f.write(f"{name} ({p.get('login')}) - {loc} - {repos} public repos\n")

    print()
    print(f"{len(profiles)} profile(s) saved -> {OUTPUT_JSON}")
    print(f"Readable list saved   -> {OUTPUT_TXT}")
    print("-" * 50)

    return profiles
