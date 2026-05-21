#!/usr/bin/env bash
# Link your STL + PNG files into public/assets/ (or copy them there).
# Usage:
#   ./scripts/setup-assets.sh /path/to/barovia_map1 /path/to/barovia_map2
#
# Each directory should contain the files referenced in src/maps.config.js.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MAP1_SRC="${1:-}"
MAP2_SRC="${2:-}"

if [[ -z "$MAP1_SRC" || -z "$MAP2_SRC" ]]; then
  echo "Usage: $0 <barovia_map1_dir> <barovia_map2_dir>"
  echo "Example:"
  echo "  $0 ~/blender_asset_libraries/model_working_dir/barovia_map1 \\"
  echo "     ~/blender_asset_libraries/model_working_dir/barovia_map2"
  exit 1
fi

link_file() {
  local src="$1"
  local dest="$2"
  if [[ ! -f "$src" ]]; then
    echo "Missing: $src"
    exit 1
  fi
  mkdir -p "$(dirname "$dest")"
  ln -sf "$src" "$dest"
  echo "Linked $dest -> $src"
}

mkdir -p "$ROOT/public/assets/barovia1" "$ROOT/public/assets/barovia2"

link_file "$MAP1_SRC/barovia_map_v1.stl" "$ROOT/public/assets/barovia1/barovia_map_v1.stl"
link_file "$MAP1_SRC/Barovia-5e_trim.png" "$ROOT/public/assets/barovia1/Barovia-5e_trim.png"
link_file "$MAP2_SRC/barovia_map_v2-map.stl" "$ROOT/public/assets/barovia2/barovia_map_v2-map.stl"
link_file "$MAP2_SRC/map_og.png" "$ROOT/public/assets/barovia2/map_og.png"

echo "Done. Assets are ready under public/assets/"
