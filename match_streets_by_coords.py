from __future__ import annotations

import csv
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, List, Dict, Any


MYHOME_CSV = Path("myhome_tbilisi_streets.csv")
SS_CSV = Path("ss_tbilisi_streets.csv")
OUT_JSON = Path("street_mapping_by_coords.json")
OUT_CSV = Path("street_mapping_by_coords.csv")


@dataclass
class Street:
  source: str  # 'myhome' or 'ss'
  city_id: Optional[int]
  city_name: str
  district_id: Optional[int]
  district_name: str
  urban_id: Optional[int]
  urban_name: str
  street_id: int
  street_title: str
  latitude: Optional[float]
  longitude: Optional[float]


def parse_float(value: str) -> Optional[float]:
  value = value.strip()
  if not value:
    return None
  try:
    return float(value)
  except ValueError:
    return None


def load_myhome_streets() -> List[Street]:
  streets: List[Street] = []
  with MYHOME_CSV.open("r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
      lat = parse_float(row.get("latitude", ""))
      lng = parse_float(row.get("longitude", ""))
      if lat is None or lng is None:
        continue
      streets.append(
        Street(
          source="myhome",
          city_id=int(row["city_id"]) if row.get("city_id") else None,
          city_name=row.get("city_name", ""),
          district_id=int(row["district_id"]) if row.get("district_id") else None,
          district_name=row.get("district_name", ""),
          urban_id=int(row["urban_id"]) if row.get("urban_id") else None,
          urban_name=row.get("urban_name", ""),
          street_id=int(row["id"]),
          street_title=row.get("display_name", ""),
          latitude=lat,
          longitude=lng,
        )
      )
  return streets


def load_ss_streets() -> List[Street]:
  streets: List[Street] = []
  with SS_CSV.open("r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
      lat = parse_float(row.get("latitude", ""))
      lng = parse_float(row.get("longitude", ""))
      if lat is None or lng is None:
        continue
      streets.append(
        Street(
          source="ss",
          city_id=int(row["cityId"]) if row.get("cityId") else None,
          city_name=row.get("cityTitle", ""),
          district_id=int(row["districtId"]) if row.get("districtId") else None,
          district_name=row.get("districtTitle", ""),
          urban_id=int(row["subDistrictId"]) if row.get("subDistrictId") else None,
          urban_name=row.get("subDistrictTitle", ""),
          street_id=int(row["streetId"]),
          street_title=row.get("streetTitle", ""),
          latitude=lat,
          longitude=lng,
        )
      )
  return streets


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
  """
  Great-circle distance between two points on Earth (in meters).
  """
  # Earth radius in meters
  R = 6371000.0
  phi1 = math.radians(lat1)
  phi2 = math.radians(lat2)
  dphi = math.radians(lat2 - lat1)
  dlambda = math.radians(lon2 - lon1)

  a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(
    dlambda / 2
  ) ** 2
  c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
  return R * c


def match_by_coords(
  mh_streets: List[Street],
  ss_streets: List[Street],
  max_distance_m: float = 100.0,
) -> List[Dict[str, Any]]:
  """
  For each myhome street, find the closest ss street within max_distance_m.
  Only accept matches when distance is <= max_distance_m.
  """
  matches: List[Dict[str, Any]] = []

  for mh in mh_streets:
    best_ss: Optional[Street] = None
    best_dist = float("inf")

    for ss in ss_streets:
      # Restrict to same city (both files should already be Tbilisi-only, but keep as safety)
      if mh.city_id is not None and ss.city_id is not None and mh.city_id != ss.city_id:
        continue

      # Additional safety: if both have district names and they differ, skip
      if mh.district_name and ss.district_name and mh.district_name != ss.district_name:
        continue

      d = haversine_distance_m(mh.latitude, mh.longitude, ss.latitude, ss.longitude)
      if d < best_dist:
        best_dist = d
        best_ss = ss

    if best_ss and best_dist <= max_distance_m:
      matches.append(
        {
          "distance_m": round(best_dist, 2),
          "myhome": {
            "street_id": mh.street_id,
            "street_title": mh.street_title,
            "district_name": mh.district_name,
            "urban_name": mh.urban_name,
            "latitude": mh.latitude,
            "longitude": mh.longitude,
          },
          "ss": {
            "streetId": best_ss.street_id,
            "streetTitle": best_ss.street_title,
            "districtTitle": best_ss.district_name,
            "subDistrictTitle": best_ss.urban_name,
            "latitude": best_ss.latitude,
            "longitude": best_ss.longitude,
          },
        }
      )

  return matches


def main():
  if not MYHOME_CSV.exists():
    raise SystemExit(f"{MYHOME_CSV} not found")
  if not SS_CSV.exists():
    raise SystemExit(f"{SS_CSV} not found")

  mh_streets = load_myhome_streets()
  ss_streets = load_ss_streets()

  print(f"Myhome streets with coords: {len(mh_streets)}")
  print(f"SS streets with coords: {len(ss_streets)}")

  # Use a relatively small radius (100m) but much larger than 30m so that
  # coordinates for the same street (which can differ slightly between systems)
  # still match.
  max_distance_m = 100.0
  matches = match_by_coords(mh_streets, ss_streets, max_distance_m=max_distance_m)
  print(f"Coordinate-based matches within {max_distance_m}m: {len(matches)}")

  # Save JSON
  OUT_JSON.write_text(
    json.dumps(matches, ensure_ascii=False, indent=2), encoding="utf-8"
  )
  print(f"Saved JSON mapping to {OUT_JSON}")

  # Save CSV summary
  with OUT_CSV.open("w", encoding="utf-8", newline="") as f:
    fieldnames = [
      "distance_m",
      "myhome_street_id",
      "myhome_street_title",
      "myhome_district_name",
      "myhome_urban_name",
      "myhome_latitude",
      "myhome_longitude",
      "ss_streetId",
      "ss_streetTitle",
      "ss_districtTitle",
      "ss_subDistrictTitle",
      "ss_latitude",
      "ss_longitude",
    ]
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()

    for m in matches:
      row = {
        "distance_m": m["distance_m"],
        "myhome_street_id": m["myhome"]["street_id"],
        "myhome_street_title": m["myhome"]["street_title"],
        "myhome_district_name": m["myhome"]["district_name"],
        "myhome_urban_name": m["myhome"]["urban_name"],
        "myhome_latitude": m["myhome"]["latitude"],
        "myhome_longitude": m["myhome"]["longitude"],
        "ss_streetId": m["ss"]["streetId"],
        "ss_streetTitle": m["ss"]["streetTitle"],
        "ss_districtTitle": m["ss"]["districtTitle"],
        "ss_subDistrictTitle": m["ss"]["subDistrictTitle"],
        "ss_latitude": m["ss"]["latitude"],
        "ss_longitude": m["ss"]["longitude"],
      }
      writer.writerow(row)

  print(f"Saved CSV mapping to {OUT_CSV}")


if __name__ == "__main__":
  main()


