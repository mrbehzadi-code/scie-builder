"""Knowledge Graph v1 for SCIE.

Builds a conservative derived graph from canonical entities and structured evidence.
No new identity claims are created here. Raw discovery data remains untouched.
"""
from __future__ import annotations

import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "data.json"
ENTITIES = ROOT / "docs" / "entities.json"
PROFILE = ROOT / "docs" / "profile_enrichment.json"
EXTERNAL = ROOT / "docs" / "external_enrichment.json"
OUTPUT = ROOT / "docs" / "knowledge_graph.json"
RELATIONSHIPS = ROOT / "docs" / "relationships.json"


def clean(value) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def node_id(kind: str, label: str) -> str:
    digest = hashlib.sha1(f"{kind}:{label.lower()}".encode("utf-8")).hexdigest()[:12]
    return f"{kind}:{digest}"


def add_node(nodes: dict, kind: str, label: str, **attrs) -> str | None:
    label = clean(label)
    if not label or label in {"—", "-"}:
        return None
    nid = node_id(kind, label)
    if nid not in nodes:
        nodes[nid] = {"id": nid, "type": kind, "label": label, **attrs}
    else:
        for k, v in attrs.items():
            if v not in (None, "", [], {}):
                nodes[nid].setdefault(k, v)
    return nid


def add_entity_node(nodes: dict, entity_id: str, label: str, **attrs) -> str:
    nid = f"entity:{entity_id}"
    nodes[nid] = {
        "id": nid,
        "type": "entity",
        "label": clean(label) or entity_id,
        "entity_id": entity_id,
        **attrs,
    }
    return nid


def normalize_location_label(value: str) -> str | None:
    raw = clean(value)
    low = raw.lower()
    if not raw or low in {"ardakan signal", "اردکان signal"}:
        return None
    if ("ardakan" in low or "اردکان" in raw) and ("yazd" in low or "یزد" in raw):
        return "Ardakan, Yazd, Iran"
    return raw


def main() -> None:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    entity_layer = json.loads(ENTITIES.read_text(encoding="utf-8"))
    profiles = json.loads(PROFILE.read_text(encoding="utf-8")).get("profiles", []) if PROFILE.exists() else []
    external = json.loads(EXTERNAL.read_text(encoding="utf-8")).get("profiles", []) if EXTERNAL.exists() else []
    people = data.get("people", [])

    profile_by = {x.get("candidate_index"): x for x in profiles if isinstance(x, dict)}
    external_by = {x.get("candidate_index"): x for x in external if isinstance(x, dict)}

    nodes: dict[str, dict] = {}
    edges: list[dict] = []
    edge_keys = set()

    def edge(source: str | None, target: str | None, relation: str, evidence: str) -> None:
        if not source or not target or source == target:
            return
        key = (source, target, relation)
        if key in edge_keys:
            return
        edge_keys.add(key)
        edges.append({
            "source": source,
            "target": target,
            "relation": relation,
            "evidence": evidence,
        })

    for entity in entity_layer.get("entities", []):
        eid = entity.get("entity_id")
        if not eid:
            continue
        entity_node = add_entity_node(
            nodes,
            eid,
            entity.get("primary_name") or eid,
            record_count=entity.get("record_count", 1),
            identity_status=entity.get("identity_status"),
        )

        indexes = [i for i in entity.get("candidate_indexes", []) if isinstance(i, int) and 0 <= i < len(people)]

        for org in entity.get("organizations", []) or []:
            oid = add_node(nodes, "organization", org)
            edge(entity_node, oid, "AFFILIATED_WITH", "canonical entity profile")

        for loc in entity.get("locations", []) or []:
            loc_label = normalize_location_label(loc)
            lid = add_node(nodes, "location", loc_label) if loc_label else None
            edge(entity_node, lid, "LOCATED_IN", "canonical entity profile")

        for src in entity.get("sources", []) or []:
            sid = add_node(nodes, "source", src)
            edge(entity_node, sid, "EVIDENCED_BY", "discovery provenance")

        for idx in indexes:
            person = people[idx]
            ctype = clean(person.get("type"))
            if ctype:
                cid = add_node(nodes, "capacity", ctype)
                edge(entity_node, cid, "HAS_CAPACITY_TYPE", f"candidate {idx}")

            profile = profile_by.get(idx, {})
            provider = clean(profile.get("provider"))
            if provider:
                sid = add_node(nodes, "source", provider)
                edge(entity_node, sid, "EVIDENCED_BY", f"profile provider candidate {idx}")

            ext = external_by.get(idx, {})
            ext_data = ext.get("data") or {}
            if ext.get("status") == "enriched":
                company = clean(ext_data.get("company"))
                if company:
                    oid = add_node(nodes, "organization", company)
                    edge(entity_node, oid, "AFFILIATED_WITH", f"external provider candidate {idx}")

                ext_location = normalize_location_label(ext_data.get("location"))
                if ext_location:
                    lid = add_node(nodes, "location", ext_location)
                    edge(entity_node, lid, "LOCATED_IN", f"external provider candidate {idx}")

                institutions = ext_data.get("institutions") or []
                if institutions and isinstance(institutions[0] if institutions else None, str):
                    inst_names = institutions
                else:
                    inst_names = [
                        x.get("name") for x in (ext_data.get("last_known_institutions") or [])
                        if isinstance(x, dict) and x.get("name")
                    ]
                for inst in inst_names:
                    oid = add_node(nodes, "organization", inst)
                    edge(entity_node, oid, "AFFILIATED_WITH", f"academic provider candidate {idx}")

                for topic in ext_data.get("topics") or []:
                    if isinstance(topic, dict):
                        topic_name = clean(topic.get("name"))
                    else:
                        topic_name = clean(topic)
                    if topic_name:
                        tid = add_node(nodes, "expertise", topic_name)
                        edge(entity_node, tid, "HAS_EXPERTISE", f"academic topic candidate {idx}")

    # Human-reported social ties are represented explicitly as unverified claims.
    relationship_data = json.loads(RELATIONSHIPS.read_text(encoding="utf-8")) if RELATIONSHIPS.exists() else {"relationships": []}
    entity_by_name = {clean(n.get("label")).casefold(): nid for nid, n in nodes.items() if n.get("type") == "entity"}
    relation_names = {"sibling":"SIBLING_OF","brother":"SIBLING_OF","sister":"SIBLING_OF","parent":"PARENT_OF","colleague":"COLLEAGUE_OF","partner":"PARTNER_OF","teacher":"TEACHER_OF","student":"STUDENT_OF","relative":"RELATED_TO"}
    for item in relationship_data.get("relationships", []):
        left = entity_by_name.get(clean(item.get("person_a")).casefold())
        right = entity_by_name.get(clean(item.get("person_b")).casefold())
        relation = relation_names.get(item.get("relation"), "RELATED_TO")
        edge(left, right, relation, f"human asserted; unverified; issue {item.get('issue_number', '—')}")

    degree = Counter()
    relation_counts = Counter()
    for e in edges:
        degree[e["source"]] += 1
        degree[e["target"]] += 1
        relation_counts[e["relation"]] += 1

    for nid, node in nodes.items():
        node["degree"] = degree[nid]

    type_counts = Counter(n["type"] for n in nodes.values())

    def top_for(kind: str, limit: int = 15):
        rows = [n for n in nodes.values() if n["type"] == kind]
        rows.sort(key=lambda x: (-x.get("degree", 0), x["label"].lower()))
        return [{"id": x["id"], "label": x["label"], "degree": x.get("degree", 0)} for x in rows[:limit]]

    hub_nodes = sorted(
        nodes.values(),
        key=lambda x: (-x.get("degree", 0), x["type"], x["label"].lower())
    )
    selected_order = []
    selected_seen = set()
    for n in hub_nodes:
        include = (
            (n["type"] != "entity" and n.get("degree", 0) >= 2)
            or (n["type"] == "entity" and n.get("degree", 0) >= 3)
        )
        if include and n["id"] not in selected_seen:
            selected_order.append(n["id"])
            selected_seen.add(n["id"])
    selected = set(selected_order[:90])

    preview_edges = [e for e in edges if e["source"] in selected and e["target"] in selected][:180]
    preview_node_ids = {x for e in preview_edges for x in (e["source"], e["target"])}
    preview_nodes = [nodes[nid] for nid in preview_node_ids]

    result = {
        "generated_at": data.get("generated_at"),
        "metrics": {
            "nodes": len(nodes),
            "edges": len(edges),
            "connected_entities": sum(1 for n in nodes.values() if n["type"] == "entity" and n.get("degree", 0) > 0),
            "isolated_entities": sum(1 for n in nodes.values() if n["type"] == "entity" and n.get("degree", 0) == 0),
            "canonical_entity_count": len(entity_layer.get("entities", [])),
            "node_types": dict(type_counts),
            "relations": dict(relation_counts),
        },
        "top_hubs": {
            "organizations": top_for("organization"),
            "locations": top_for("location"),
            "sources": top_for("source"),
            "expertise": top_for("expertise"),
            "capacity_types": top_for("capacity"),
        },
        "preview": {
            "nodes": preview_nodes,
            "edges": preview_edges,
        },
        "nodes": list(nodes.values()),
        "edges": edges,
        "notice": "Derived evidence graph. Edges express observed structured evidence, not social ties unless explicitly stated.",
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result["metrics"], ensure_ascii=False))


if __name__ == "__main__":
    main()
