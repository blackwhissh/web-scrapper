from pathlib import Path
import json


MYHOME_PATH = Path("myhome.json")
OUT_JSON = Path("myhome_tbilisi_streets.json")
OUT_CSV = Path("myhome_tbilisi_streets.csv")


def extract_tbilisi_streets():
  """Flatten Tbilisi streets from the new myhome.json structure."""
  data = json.loads(MYHOME_PATH.read_text(encoding="utf-8"))
  cities = data.get("data", {}).get("cities", [])

  if not cities:
    raise RuntimeError("No 'cities' array found in myhome.json -> data.cities")

  # Tbilisi appears to be the first city (id: 1, display_name: 'თბილისი')
  tbilisi = next((c for c in cities if c.get("id") == 1 or c.get("display_name") == "თბილისი"), None)
  if not tbilisi:
    raise RuntimeError("Could not find Tbilisi in data.cities (id=1/display_name='თბილისი')")

  streets = []

  for district in tbilisi.get("districts", []):
    district_id = district.get("id")
    district_name = district.get("display_name")

    for urban in district.get("urbans", []):
      # Streets appear to be loaded lazily; some builds of this JSON may not include them.
      # We support both possibilities:
      #  - explicit 'streets' in each urban (preferred)
      #  - or, if not present, skip (no way to get streets from this dump alone)
      urban_id = urban.get("id")
      urban_name = urban.get("display_name")
      urban_streets = urban.get("streets", []) or []

      for st in urban_streets:
        streets.append(
          {
            "city_id": tbilisi.get("id"),
            "city_name": tbilisi.get("display_name"),
            "district_id": district_id,
            "district_name": district_name,
            "urban_id": urban_id,
            "urban_name": urban_name,
            "id": st.get("id"),
            "display_name": st.get("display_name"),
            # myhome does not provide a separate English search name here; keep field for symmetry
            "search_display_name": "",
            "latitude": st.get("lat"),
            "longitude": st.get("lng"),
          }
        )

  return streets


def main():
  if not MYHOME_PATH.exists():
    raise SystemExit(f"{MYHOME_PATH} not found")

  streets = extract_tbilisi_streets()
  print(f"Found {len(streets)} myhome Tbilisi street entries")

  # Save as flat JSON similar to ss_tbilisi_streets.json
  OUT_JSON.write_text(
    json.dumps(streets, ensure_ascii=False, indent=2),
    encoding="utf-8",
  )
  print(f"Saved JSON to {OUT_JSON}")

  # Save as CSV with key columns, similar to ss_tbilisi_streets.csv
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

    def esc(value):
      if value is None:
        return ""
      text = str(value)
      text = text.replace('"', '""')
      if "," in text or '"' in text:
        return f'"{text}"'
      return text

    for row in streets:
      f.write(",".join(esc(row.get(col)) for col in header) + "\n")

  print(f"Saved CSV to {OUT_CSV}")


if __name__ == "__main__":
  main()



