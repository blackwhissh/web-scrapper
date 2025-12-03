from pathlib import Path
import json

from bs4 import BeautifulSoup


def load_next_data(html_path: Path) -> dict:
  """Extract and parse the __NEXT_DATA__ JSON from an ss.ge page dump."""
  html = html_path.read_text(encoding="utf-8")
  soup = BeautifulSoup(html, "html.parser")

  script = soup.find("script", id="__NEXT_DATA__", type="application/json")
  if not script or not script.string:
    raise RuntimeError("Could not find __NEXT_DATA__ script with JSON content")

  data = json.loads(script.string)
  return data


def extract_tbilisi_streets(next_data: dict):
  """Return flat list of Tbilisi streets with district / subdistrict info."""
  locations = (
    next_data
    .get("props", {})
    .get("pageProps", {})
    .get("locations", {})
    .get("visibleCities", [])
  )

  tbilisi = None
  for city in locations:
    # Tbilisi is cityId 95 and cityTitle "თბილისი"
    if city.get("cityId") == 95 or city.get("cityTitle") == "თბილისი":
      tbilisi = city
      break

  if not tbilisi:
    raise RuntimeError("Could not find Tbilisi (cityId=95 / cityTitle='თბილისი') in visibleCities")

  result = []
  for district in tbilisi.get("districts", []):
    district_id = district.get("districtId")
    district_title = district.get("districtTitle")

    for sub in district.get("subDistricts", []):
      sub_id = sub.get("subDistrictId")
      sub_title = sub.get("subDistrictTitle")

      for st in sub.get("streets", []):
        result.append(
          {
            "cityId": tbilisi.get("cityId"),
            "cityTitle": tbilisi.get("cityTitle"),
            "districtId": district_id,
            "districtTitle": district_title,
            "subDistrictId": sub_id,
            "subDistrictTitle": sub_title,
            "streetId": st.get("streetId"),
            "streetTitle": st.get("streetTitle"),
            "latitude": st.get("latitude"),
            "longitude": st.get("longitude"),
          }
        )

  return result


def main():
  html_path = Path("content.html")
  if not html_path.exists():
    raise SystemExit("content.html not found in project root")

  next_data = load_next_data(html_path)
  streets = extract_tbilisi_streets(next_data)

  print(f"Extracted {len(streets)} Tbilisi street entries")

  # Save flat JSON for further processing / matching
  out_json = Path("ss_tbilisi_streets.json")
  out_json.write_text(json.dumps(streets, ensure_ascii=False, indent=2), encoding="utf-8")
  print(f"Saved flat street list to {out_json}")

  # Also save a CSV with key columns
  out_csv = Path("ss_tbilisi_streets.csv")
  with out_csv.open("w", encoding="utf-8", newline="") as f:
    # Simple manual CSV (no extra dependency)
    header = [
      "cityId",
      "cityTitle",
      "districtId",
      "districtTitle",
      "subDistrictId",
      "subDistrictTitle",
      "streetId",
      "streetTitle",
      "latitude",
      "longitude",
    ]
    f.write(",".join(header) + "\n")

    def esc(value):
      if value is None:
        return ""
      text = str(value)
      # Escape double quotes for CSV
      text = text.replace('"', '""')
      # Wrap in quotes if it contains comma or quote
      if "," in text or '"' in text:
        return f'"{text}"'
      return text

    for row in streets:
      f.write(",".join(esc(row.get(col)) for col in header) + "\n")

  print(f"Saved CSV street list to {out_csv}")


if __name__ == "__main__":
  main()



