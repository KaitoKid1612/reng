#!/usr/bin/env python3
"""Build schema-compatible Reng lesson-content drafts from original JLPT question drafts.

Does not publish lessons, create assignments, or modify Supabase.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content" / "jlpt"
OUTPUT = SOURCE / "generated"
OUTPUT.mkdir(parents=True, exist_ok=True)

for level in ("n5", "n4"):
    source = json.loads((SOURCE / f"{level}-original-question-draft.json").read_text(encoding="utf-8"))
    if source.get("origin") != "original" or source.get("status") != "draft":
        raise ValueError(f"{level}: source must be an original draft")
    questions = source["questions"]
    ids = [q["id"] for q in questions]
    if len(ids) != len(set(ids)):
        raise ValueError(f"{level}: duplicate question IDs")
    for q in questions:
        if q.get("type") != "choice" or q.get("multiple") is not False:
            raise ValueError(f"{level}: unsupported question type: {q.get('id')}")
        if len(q.get("answer", [])) != 1 or not 0 <= q["answer"][0] < len(q["options"]):
            raise ValueError(f"{level}: invalid answer: {q['id']}")
    lesson_content = {
        "schemaVersion": 1,
        "vocab": [],
        "grammar": [],
        "slides": [{
            "id": f"jlpt-{level}-intro",
            "type": "note",
            "title": f"JLPT {level.upper()} – Bài luyện tập nháp",
            "body": "Bộ câu hỏi gốc đang chờ kiểm duyệt. Không xuất bản cho học viên trước khi kiểm tra nội dung."
        }],
        "questions": questions,
    }
    path = OUTPUT / f"{level}-lesson-content-draft.json"
    path.write_text(json.dumps(lesson_content, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{level.upper()}: {len(questions)} questions -> {path.relative_to(ROOT)}")
print("Generated drafts only. Review Japanese content before publishing.")
