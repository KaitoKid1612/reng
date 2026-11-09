#!/usr/bin/env python3
"""Audit JLPT official audio URLs without saving or redistributing media."""
import argparse
import hashlib
import json
import urllib.request
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="content/jlpt/official-audio-manifest.json")
    parser.add_argument("--output", default="content/jlpt/audio-audit-results.json")
    parser.add_argument("--timeout", type=int, default=15)
    args = parser.parse_args()
    entries = json.loads(Path(args.manifest).read_text(encoding="utf-8"))["audio"]
    results = []
    for entry in entries:
        row = {**entry}
        try:
            req = urllib.request.Request(entry["url"], headers={"User-Agent": "Reng-JLPT-source-audit/1.0"})
            with urllib.request.urlopen(req, timeout=args.timeout) as response:
                row["httpStatus"] = response.status
                row["contentType"] = response.headers.get("Content-Type")
                digest = hashlib.sha256()
                count = 0
                while True:
                    block = response.read(65536)
                    if not block:
                        break
                    digest.update(block)
                    count += len(block)
                row["bytes"] = count
                row["sha256"] = digest.hexdigest()
                row["downloadVerified"] = response.status == 200 and count > 1000 and "audio" in (row["contentType"] or "").lower()
                row["playbackVerified"] = False
        except Exception as exc:
            row["downloadVerified"] = False
            row["error"] = str(exc)
        results.append(row)
        print(f'{row["year"]} {row["level"]} {row["section"]}: {"OK" if row.get("downloadVerified") else "FAILED"}')
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.output).write_text(json.dumps({"audio": results}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f'Checked {len(results)} links; report: {args.output}')

if __name__ == "__main__":
    main()
