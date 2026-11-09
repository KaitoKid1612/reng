#!/usr/bin/env python3
"""Validate original JLPT question drafts without changing production data."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEVELS = ("n5", "n4")
SECTIONS = {"kanji", "vocabulary", "grammar", "particles", "reading", "listening", "sentence-order"}
errors = []
total = 0

for level in LEVELS:
    path = ROOT / "content" / "jlpt" / f"{level}-original-question-draft.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"{path}: {exc}")
        continue
    if data.get("schemaVersion") != 1 or data.get("level") != level.upper():
        errors.append(f"{path}: invalid schemaVersion or level")
    if data.get("origin") != "original" or data.get("status") != "draft":
        errors.append(f"{path}: origin/status must be original/draft")
    questions = data.get("questions")
    if not isinstance(questions, list) or not questions:
        errors.append(f"{path}: questions must be a nonempty list")
        continue
    ids = set()
    for number, q in enumerate(questions, 1):
        prefix = f"{path.name} question {number}"
        if not isinstance(q, dict):
            errors.append(f"{prefix}: must be an object")
            continue
        total += 1
        required = {"id", "type", "prompt", "options", "answer", "multiple", "points", "tags", "explain"}
        if set(q) != required:
            errors.append(f"{prefix}: unexpected/missing keys {sorted(set(q) ^ required)}")
        qid = q.get("id")
        if not isinstance(qid, str) or not qid.startswith(f"jlpt-{level}-") or qid in ids:
            errors.append(f"{prefix}: invalid or duplicate ID")
        ids.add(qid)
        if q.get("type") != "choice" or q.get("multiple") is not False:
            errors.append(f"{prefix}: expected single-choice")
        if not isinstance(q.get("prompt"), str) or not q["prompt"].strip():
            errors.append(f"{prefix}: empty prompt")
        options = q.get("options")
        if not isinstance(options, list) or not 2 <= len(options) <= 6 or any(not isinstance(x, str) or not x.strip() for x in options):
            errors.append(f"{prefix}: invalid options")
            continue
        if len(set(options)) != len(options):
            errors.append(f"{prefix}: duplicate options")
        answer = q.get("answer")
        if not isinstance(answer, list) or len(answer) != 1 or type(answer[0]) is not int or not 0 <= answer[0] < len(options):
            errors.append(f"{prefix}: answer must contain one valid zero-based index")
        if type(q.get("points")) is not int or not 1 <= q["points"] <= 100:
            errors.append(f"{prefix}: invalid points")
        if not isinstance(q.get("explain"), str) or not q["explain"].strip():
            errors.append(f"{prefix}: missing Vietnamese explanation")
        tags = q.get("tags")
        if not isinstance(tags, list) or len(tags) != 1 or tags[0] not in SECTIONS:
            errors.append(f"{prefix}: invalid section tag")
    print(f"{level.upper()}: {len(questions)} questions checked")

if errors:
    print(f"FAILED: {len(errors)} error(s)")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print(f"PASSED: {total} original draft questions; structural validation only.")
print("Japanese accuracy, rights review, and production integration still require separate checks.")
