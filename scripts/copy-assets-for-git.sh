#!/usr/bin/env bash
# Copy STL/PNG into public/assets/ for committing to GitHub (replaces symlinks).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MAP1_SRC="${1:-}"
MAP2_SRC="${2:-}"

if [[ -z "$MAP1_SRC" || -z "$MAP2_SRC" ]]; then
  echo "Usage: $0 <barovia_map1_dir> <barovia_map2_dir>"
  exit 1
fi

copy() {
  local src="$1"
  local dest="$2"
  [[ -f "$src" ]] || { echo "Missing: $src"; exit 1; }
  mkdir -p "$(dirname "$dest")"
  cp -f "$src" "$dest"
  echo "Copied $(basename "$dest")"
}

mkdir -p "$ROOT/public/assets/barovia1" "$ROOT/public/assets/barovia2"
copy "$MAP1_SRC/barovia_map_v1.stl" "$ROOT/public/assets/barovia1/barovia_map_v1.stl"
if [[ -f "$MAP1_SRC/barovia_map_v2.stl" ]]; then
  copy "$MAP1_SRC/barovia_map_v2.stl" "$ROOT/public/assets/barovia1/barovia_map_v2.stl"
fi
copy "$MAP1_SRC/Barovia-5e_trim.png" "$ROOT/public/assets/barovia1/Barovia-5e_trim.png"
copy "$MAP2_SRC/barovia_map_v2-map.stl" "$ROOT/public/assets/barovia2/barovia_map_v2-map.stl"
copy "$MAP2_SRC/map_og.png" "$ROOT/public/assets/barovia2/map_og.png"
echo "Assets copied. Map 2 STL is ~64MB — install Git LFS before pushing (see README)."
