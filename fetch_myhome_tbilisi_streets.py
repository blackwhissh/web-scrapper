from __future__ import annotations

import itertools
import json
import time
from pathlib import Path
from typing import Dict, Any

from urllib import request, parse


OUT_JSON = Path("myhome_tbilisi_streets.json")
OUT_CSV = Path("myhome_tbilisi_streets.csv")

# Georgian alphabet letters used for 2-letter prefixes
GE_LETTERS = [
  "ა",
  "ბ",
  "გ",
  "დ",
  "ე",
  "ვ",
  "ზ",
  "თ",
  "ი",
  "კ",
  "ლ",
  "მ",
  "ნ",
  "ო",
  "პ",
  "ჟ",
  "რ",
  "ს",
  "ტ",
  "უ",
  "ფ",
  "ქ",
  "ღ",
  "ყ",
  "შ",
  "ჩ",
  "ც",
  "ძ",
  "წ",
  "ჭ",
  "ხ",
  "ჯ",
  "ჰ",
]

BASE_URL = "https://api-locations.tnet.ge/v2/streets"


def fetch_prefix(prefix: str) -> list[Dict[str, Any]]:
  """
  Call the myhome streets search API with a given prefix and return the data list.
  The API requires q to be at least 2 characters, so we use 2-letter prefixes.
  """
  # Percent-encode the Georgian prefix
  q_encoded = parse.quote(prefix)
  url = f"{BASE_URL}?q={q_encoded}&city_id=1"

  req = request.Request(
    url,
    headers={
      "User-Agent": "Mozilla/5.0 (compatible; streets-fetcher/1.0)",
      "Accept": "application/json",
    },
  )
  with request.urlopen(req, timeout=10) as resp:
    body = resp.read().decode("utf-8")
  data = json.loads(body)
  return data.get("data") or []


def main():
  seen: Dict[int, Dict[str, Any]] = {}

  total_prefixes = len(GE_LETTERS) ** 2
  prefix_idx = 0

  for a, b in itertools.product(GE_LETTERS, repeat=2):
    prefix_idx += 1
    prefix = a + b
    # Avoid printing non-ASCII characters to consoles that don't support them
    print(f"[{prefix_idx}/{total_prefixes}] Fetching prefix")

    try:
      items = fetch_prefix(prefix)
    except Exception as e:
      print(f"  Error for prefix {prefix}: {e}")
      # Be resilient: skip this prefix and continue
      time.sleep(0.2)
      continue

    print(f"  Received {len(items)} items")

    for st in items:
      # Filter to Tbilisi streets only, in case city_id filter is not strictly enforced
      if st.get("city_id") != 1 and st.get("city_name") != "თბილისი":
        continue

      sid = st.get("id")
      if sid is None:
        continue

      if sid not in seen:
        seen[sid] = st

    # Be nice to the API
    time.sleep(0.2)

  streets = list(seen.values())
  print(f"Total unique Tbilisi streets collected from API: {len(streets)}")

  # Save JSON
  OUT_JSON.write_text(json.dumps(streets, ensure_ascii=False, indent=2), encoding="utf-8")
  print(f"Saved JSON to {OUT_JSON}")

  # Save CSV similar to previous myhome_tbilisi_streets.csv
  with OUT_CSV.open("w", encoding="utf-8", newline="") as f:
    header = [
      "city_id",
      "city_name",
      "district_id",
      "district_name",
      "urban_id",
      "urban_name",
      "id",
      "display_name",
      "search_display_name",
      "latitude",
      "longitude",
    ]
    f.write(",".join(header) + "\n")

    def esc(value: Any) -> str:
      if value is None:
        return ""
      text = str(value)
      text = text.replace('"', '""')
      if "," in text or '"' in text:
        return f'"{text}"'
      return text

    for st in streets:
      row = {
        "city_id": st.get("city_id"),
        "city_name": st.get("city_name"),
        "district_id": st.get("district_id"),
        "district_name": st.get("district_name"),
        "urban_id": st.get("urban_id"),
        "urban_name": st.get("urban_name"),
        "id": st.get("id"),
        "display_name": st.get("display_name"),
        "search_display_name": st.get("search_display_name"),
        "latitude": st.get("latitude"),
        "longitude": st.get("longitude"),
      }
      f.write(",".join(esc(row[col]) for col in header) + "\n")

  print(f"Saved CSV to {OUT_CSV}")


if __name__ == "__main__":
  main()


