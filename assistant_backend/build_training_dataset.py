from __future__ import annotations

import argparse
import json
import random
import re
from pathlib import Path
from typing import Iterable


ROUTES = [
    ("booking", "Start booking", "/booking-request", "start_booking"),
    ("bookings", "View bookings", "/bookings", "navigate"),
    ("chats", "Open chats", "/chats", "navigate"),
    ("recipes", "Browse recipes", "/recipes", "navigate"),
    ("search", "Search meals", "/search", "search"),
    ("gym", "Gym meals", "/gym", "navigate"),
    ("explore", "Explore cooks", "/explore", "navigate"),
    ("kitchen", "My kitchen", "/my-kitchen", "navigate"),
    ("profile", "Profile", "/profile", "navigate"),
]

INTENT_TEMPLATES = {
    "booking": [
        "I want to book a chef for {meal}",
        "help me hire a cook for {meal}",
        "start a private chef booking",
        "book someone for dinner this weekend",
    ],
    "bookings": [
        "show my upcoming bookings",
        "where are my reservations",
        "open my booking list",
        "view my chef appointment",
    ],
    "chats": [
        "open my messages",
        "show my chat with the cook",
        "where are my conversations",
        "take me to chats",
    ],
    "recipes": [
        "open recipes",
        "show me recipes for {meal}",
        "I want to cook myself",
        "browse recipes",
    ],
    "search": [
        "search for {meal}",
        "find food near me",
        "look for {meal}",
        "find a dish my family will like",
    ],
    "gym": [
        "show gym meals",
        "find high protein food",
        "what should I eat after workout",
        "open gym nutrition",
    ],
    "explore": [
        "find cooks near me",
        "show featured cooks",
        "who is frequently booked",
        "find highly rated cooks",
    ],
    "kitchen": [
        "open my kitchen",
        "save my food preferences",
        "show pantry ideas",
        "where are my ingredients",
    ],
    "profile": [
        "open profile",
        "update my account",
        "show settings",
        "complete my profile",
    ],
}

MEALS = [
    "jollof rice",
    "high protein bowls",
    "brunch",
    "family dinner",
    "salmon and rice",
    "meal prep",
    "pasta",
    "healthy lunch",
]

PII_PATTERNS = [
    re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b"),
    re.compile(r"\+?\d[\d\s().-]{8,}\d"),
    re.compile(r"\b\d{1,5}\s+[A-Za-z0-9 .'-]+\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln)\b", re.I),
]


def scrub(text: str) -> str:
    next_text = text
    for pattern in PII_PATTERNS:
        next_text = pattern.sub("[redacted]", next_text)
    return next_text.strip()


def read_jsonl(path: Path) -> Iterable[dict]:
    if not path.exists():
        return
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def normalize_open_source_record(record: dict) -> dict | None:
    prompt = (
        record.get("prompt")
        or record.get("instruction")
        or record.get("question")
        or record.get("input")
        or ""
    )
    answer = record.get("answer") or record.get("response") or record.get("output") or ""

    if not isinstance(prompt, str) or not isinstance(answer, str):
        return None

    prompt = scrub(prompt)
    answer = scrub(answer)

    if len(prompt) < 4 or len(answer) < 4:
        return None

    return {
        "messages": [{"role": "user", "content": prompt}],
        "expected": {
            "reply": answer[:1200],
            "routeIntent": "food_knowledge",
            "actions": [],
        },
        "source": "open_source_sanitized",
    }


def synthetic_route_examples(limit: int) -> list[dict]:
    examples: list[dict] = []
    while len(examples) < limit:
        route_intent, label, route, action_type = random.choice(ROUTES)
        template = random.choice(INTENT_TEMPLATES[route_intent])
        prompt = template.format(meal=random.choice(MEALS))
        examples.append(
            {
                "messages": [{"role": "user", "content": prompt}],
                "expected": {
                    "routeIntent": route_intent,
                    "actions": [{"label": label, "route": route, "type": action_type}],
                },
                "source": "private_chef_route_synthetic",
            }
        )
    return examples


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", default="assistant_backend/data/open_source")
    parser.add_argument("--output", default="assistant_backend/training_dataset.5000.jsonl")
    parser.add_argument("--target", type=int, default=5000)
    args = parser.parse_args()

    random.seed(42)
    input_dir = Path(args.input_dir)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    records: list[dict] = []
    for path in sorted(input_dir.glob("*.jsonl")):
      for record in read_jsonl(path):
          normalized = normalize_open_source_record(record)
          if normalized:
              records.append(normalized)
          if len(records) >= args.target:
              break
      if len(records) >= args.target:
          break

    if len(records) < args.target:
        records.extend(synthetic_route_examples(args.target - len(records)))

    random.shuffle(records)
    with output_path.open("w", encoding="utf-8") as handle:
        for record in records[: args.target]:
            handle.write(json.dumps(record, ensure_ascii=True) + "\n")

    print(f"Wrote {min(len(records), args.target)} examples to {output_path}")


if __name__ == "__main__":
    main()

