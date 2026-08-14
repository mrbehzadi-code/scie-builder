import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
OUTPUTS = ROOT / "outputs"
WEB = ROOT / "web"


def read_json(name, default):
    path = OUTPUTS / name
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def stats():
    discovery = read_json("discovery_results.json", [])
    entities = read_json("entities.json", [])
    clean = read_json("clean_entities.json", [])
    academic = read_json("academic_candidates.json", [])
    return {"web": len(discovery), "entities": len(entities), "clean": len(clean), "academic": len(academic)}


def people():
    result = []
    for item in read_json("clean_entities.json", []):
        if isinstance(item, dict):
            result.append({"name": item.get("name") or item.get("title"), "source": "کشف وب", "type": item.get("type") or "موجودیت", "detail": item.get("description") or ""})
    for item in read_json("academic_candidates.json", []):
        if isinstance(item, dict):
            result.append({"name": item.get("name"), "source": "OpenAlex", "type": "پژوهشگر", "detail": ", ".join(item.get("institutions", []))})
    return [x for x in result if x.get("name")]


class Handler(BaseHTTPRequestHandler):
    def send_json(self, payload):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/stats":
            return self.send_json(stats())
        if path == "/api/people":
            return self.send_json(people())
        if path in ("/", "/dashboard"):
            data = (WEB / "dashboard.html").read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        self.send_response(404)
        self.end_headers()


if __name__ == "__main__":
    host, port = "127.0.0.1", 8000
    print(f"SCIE Dashboard: http://{host}:{port}/dashboard")
    ThreadingHTTPServer((host, port), Handler).serve_forever()
