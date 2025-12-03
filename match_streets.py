from __future__ import annotations

from collections import defaultdict
from pathlib import Path
import json
import re


MYHOME_PATH = Path("myhome.json")
SS_PATH = Path("ss_tbilisi_streets.json")
OUT_PATH = Path("street_mapping_myhome_to_ss.json")


def normalize_georgian_street(name: str) -> str:
  """
  Build a canonical key for Georgian street / microdistrict names so that
  myhome and ss variants are more likely to match.

  This is intentionally conservative and mostly removes:
  - trailing type abbreviations (ქ., ქ, ქუჩა, გამზ., პლატო, კვ., კვარტალი, ჩიხი, მოედანი)
  - punctuation and extra spaces
  """
  if not name:
    return ""

  s = name.strip()

  # Remove trailing commas and periods
  s = re.sub(r"[,\.\s]+$", "", s, flags=re.IGNORECASE)

  # Normalize short "შეს." -> full "შესახვევი" to reduce variants
  s = re.sub(r"\bშეს\.\b", " შესახვევი ", s, flags=re.IGNORECASE)

  # Strip Roman numerals used for branch numbering (I, II, III, IV, ...)
  # when they appear right before a type word like ქ./ქუჩა/ჩიხი/შესახვევი/კვ.
  # Examples:
  #   "ასპინძის I ქ."        -> "ასპინძის ქ."
  #   "ასკანის II ჩიხი"      -> "ასკანის ჩიხი"
  #   "13 ასურელი მამის I შეს." -> "13 ასურელი მამის შეს."
  s = re.sub(
    r"\s+[ivx]+\s+(?=(ქ\.?|ქუჩა|ჩიხი|შესახვევი|შეს\.?|კვ\.?|კვარტალი)\b)",
    " ",
    s,
    flags=re.IGNORECASE,
  )

  # Common trailing type tokens to strip (with or without dot)
  type_suffixes = [
    r"\bქუჩა",
    r"\bქ\.?",        # ქ / ქ.
    r"\bგამზ\.?",     # გამზ / გამზ.
    r"\bჩიხი",
    r"\bჩ\.",         # ჩ.
    r"\bკვარტალი",
    r"\bკვ\.?",       # კვ / კვ.
    r"\bპლატო",
    r"\bმიკრორაიონი",
    r"\bმ\/რ\.?",     # მ/რ / მ/რ.
    r"\bმოედანი",
  ]
  pattern = r"(?:\s+(?:{}))+$".format("|".join(type_suffixes))
  s = re.sub(pattern, "", s, flags=re.IGNORECASE)

  # Normalize hyphens / dashes to a single space
  s = re.sub(r"[-–—]+", " ", s)

  # Collapse multiple spaces
  s = re.sub(r"\s+", " ", s)

  return s.strip().lower()


def load_myhome():
  data = json.loads(MYHOME_PATH.read_text(encoding="utf-8"))
  rows = data.get("data", [])
  # Only Tbilisi (city_id == 1)
  return [row for row in rows if row.get("city_id") == 1]


def load_ss():
  rows = json.loads(SS_PATH.read_text(encoding="utf-8"))
  # ss_tbilisi_streets.json is already Tbilisi-only
  return rows


def build_ss_index(ss_rows):
  """
  Build index: canonical_name -> list of ss street rows.
  """
  index = defaultdict(list)
  for row in ss_rows:
    title = row.get("streetTitle") or ""
    canon = normalize_georgian_street(title)
    if canon:
      index[canon].append(row)
  return index


def match_myhome_to_ss():
  myhome_rows = load_myhome()
  ss_rows = load_ss()
  ss_index = build_ss_index(ss_rows)

  mappings = []
  unmatched = []

  for row in myhome_rows:
    mh_id = row.get("id")
    display_name = row.get("display_name") or ""
    canon = normalize_georgian_street(display_name)

    candidates = ss_index.get(canon, [])

    if not candidates:
      unmatched.append(
        {
          "myhome_id": mh_id,
          "display_name": display_name,
          "canonical": canon,
        }
      )
      continue

    # If multiple streets share the same canonical form, keep them all;
    # the consumer can later disambiguate using district info or handle 1:N.
    for cand in candidates:
      mappings.append(
        {
          "myhome_id": mh_id,
          "myhome_display_name": display_name,
          "myhome_canonical": canon,
          "ss_streetId": cand.get("streetId"),
          "ss_streetTitle": cand.get("streetTitle"),
          "ss_canonical": canon,
          "ss_districtTitle": cand.get("districtTitle"),
          "ss_subDistrictTitle": cand.get("subDistrictTitle"),
        }
      )

  return mappings, unmatched


def main():
  if not MYHOME_PATH.exists():
    raise SystemExit(f"{MYHOME_PATH} not found")
  if not SS_PATH.exists():
    raise SystemExit(f"{SS_PATH} not found")

  mappings, unmatched = match_myhome_to_ss()

  OUT_PATH.write_text(
    json.dumps(
      {
        "mappings": mappings,
        "unmatched": unmatched,
      },
      ensure_ascii=False,
      indent=2,
    ),
    encoding="utf-8",
  )

  print(f"Total myhome Tbilisi entries: {len(mappings) + len(unmatched)}")
  print(f"Matched: {len(mappings)}")
  print(f"Unmatched (need manual / more patterns): {len(unmatched)}")
  print(f"Saved detailed mapping to {OUT_PATH}")


if __name__ == "__main__":
  main()



