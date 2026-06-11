#!/usr/bin/env python3
"""Generate content/manifest.json — the list of content the web app fetches.

Over HTTP a browser can't enumerate a directory the way the File System Access
API can, so the deployed app reads this manifest first, then fetches each file.
Re-run this whenever lessons/quizzes/flashcard decks are added or removed:

    python3 tools/gen_manifest.py
"""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


def main() -> None:
    lessons = sorted(rel(p) for p in (ROOT / "lessons").glob("*.json"))

    quizzes = []
    quizzes_dir = ROOT / "quizzes"
    if quizzes_dir.is_dir():
        for d in sorted(quizzes_dir.iterdir()):
            definition = d / "definition.json"
            if d.is_dir() and definition.is_file():
                quizzes.append(rel(definition))

    # Flashcard decks the app auto-loads on a fresh device (empty localStorage).
    decks = sorted(
        rel(p) for p in ROOT.glob("flashcards*.json")
    )

    manifest = {
        "schemaVersion": 1,
        "lessons": lessons,
        "quizzes": quizzes,
        "flashcardDecks": decks,
    }

    out = ROOT / "manifest.json"
    out.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Wrote {rel(out)}:")
    print(f"  {len(lessons)} lessons, {len(quizzes)} quizzes, {len(decks)} flashcard deck(s)")


if __name__ == "__main__":
    main()
