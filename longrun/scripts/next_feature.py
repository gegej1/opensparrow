#!/usr/bin/env python3
import json
import sys
from pathlib import Path


def to_int(value, fallback=999999):
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def feature_id(item, idx):
    raw = item.get("id")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    return f"<missing-id-{idx}>"


def depends_on(item):
    raw = item.get("depends_on")
    if not isinstance(raw, list):
        return []
    result = []
    for dep in raw:
        if isinstance(dep, str) and dep.strip():
            result.append(dep.strip())
    return result


def sort_key(pair):
    idx, item = pair
    return (to_int(item.get("priority", 999999)), feature_id(item, idx))


def main():
    if len(sys.argv) != 2:
        print("Usage: next_feature.py <feature_list.json>")
        sys.exit(1)

    path = Path(sys.argv[1])
    data = json.loads(path.read_text())
    if not isinstance(data, list):
        print("feature_list.json must be a JSON array")
        sys.exit(2)

    passed_ids = {feature_id(item, idx) for idx, item in enumerate(data) if bool(item.get("passes", False))}
    remaining = [(idx, item) for idx, item in enumerate(data) if not bool(item.get("passes", False))]
    if not remaining:
        print("ALL_PASSING")
        return

    unblocked = []
    blocked = []
    for idx, item in remaining:
        unmet = [dep for dep in depends_on(item) if dep not in passed_ids]
        if unmet:
            blocked.append((idx, item, unmet))
        else:
            unblocked.append((idx, item))

    if unblocked:
        _, item = sorted(unblocked, key=sort_key)[0]
        print(json.dumps(item, indent=2))
        return

    idx, item, unmet = sorted(blocked, key=lambda row: sort_key((row[0], row[1])))[0]
    payload = dict(item)
    payload["_blocked_by"] = unmet
    payload["_note"] = "No unblocked feature is available; resolve dependencies first."
    payload["_id_resolved"] = feature_id(item, idx)
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
