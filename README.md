# STL Map Viewer

Interactive 3D terrain viewer: load an STL height map, drape a PNG texture, align it in the browser, and bake settings into config. Inspired by [Zootlocker’s Barovia viewer](https://github.com/Zootlocker/Zootlocker.github.io/tree/main/barovia) (Qgis2threejs), but built for your own Blender exports.

Includes two preconfigured **Barovia** maps with tuned texture alignment.

## Quick start (local)

```bash
npm install

# Symlink your files (dev), or copy them (for git):
chmod +x scripts/*.sh
./scripts/setup-assets.sh \
  /path/to/barovia_map1 \
  /path/to/barovia_map2

npm run dev
```

Open http://localhost:5173 — use `?map=barovia2` for the second map.

## Maps

Configured in [`src/maps.config.js`](src/maps.config.js). Assets are served from [`public/assets/`](public/assets/).

| Map | STL | Image |
|-----|-----|-------|
| Barovia Map 1 | `barovia1/barovia_map_v1.stl` | `Barovia-5e_trim.png` |
| Barovia Map 2 | `barovia2/barovia_map_v2-map.stl` | `map_og.png` |

## UI

- **Texture** — offset (step-aware arrow keys), mirror + scale per axis, rotation, center
- **Orientation** — live Rotate X/Y/Z; lay-flat presets; UV axes (reload)
- **Reset texture & orientation** — restore defaults from `maps.config.js`
- **Camera** — save view JSON for `camera` in config; reset auto-frame
- **Copy texture config** — paste into `maps.config.js`

## Add another map

1. Put STL + PNG under `public/assets/my_map/`
2. Add an entry to `MAPS` in `src/maps.config.js` (copy an existing block)
3. Reload the app

## Build static site

```bash
npm run build
npm run preview   # test dist/ locally
```

Output is in `dist/` — suitable for GitHub Pages or any static host.

---

## Publish to GitHub (like the original Barovia site)

The [original project](https://github.com/Zootlocker/Zootlocker.github.io) is a static site on **GitHub Pages**. This app uses the same idea: build with Vite, host the `dist/` folder.

### 1. Prepare assets for git

Symlinks are fine for local dev; **copy** real files before pushing:

```bash
./scripts/copy-assets-for-git.sh \
  /path/to/barovia_map1 \
  /path/to/barovia_map2
```

**Map 2’s STL is ~64 MB** — over GitHub’s 50 MB file limit. Use **Git LFS**:

```bash
brew install git-lfs   # once
git lfs install
git lfs track "*.stl"
git add .gitattributes
```

### 2. Create the repository on GitHub

1. Go to https://github.com/new
2. Name it (e.g. `3dnd_maps`)
3. Choose **Public**
4. Do **not** add a README if you already have one locally

### 3. Push from your machine

```bash
cd /path/to/3js_viewer
git init
git add .
git commit -m "Initial commit: STL map viewer with Barovia maps"
git branch -M main
git remote add origin https://github.com/AdamBissonnette/3dnd_maps.git
git push -u origin main
```

### 4. Enable GitHub Pages

**Option A — GitHub Actions (recommended)**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
        env:
          BASE_PATH: /3dnd_maps/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

In `vite.config.js`, set `base` to match your repo:

```js
export default defineConfig({
  base: process.env.BASE_PATH || '/',
});
```

In the repo: **Settings → Pages → Build and deployment**:

- **Recommended:** Source = **GitHub Actions** (uses the built `dist` artifact).
- **Also works:** Source = **Deploy from branch** `main`, folder **`/docs`** (the workflow commits the production build there).

Do **not** use “Deploy from branch” with folder **`/` (root)** — that serves the dev entry and breaks with a `/src/main.js` MIME error. If you must use root, the repo’s root `index.html` redirects to `docs/`.

Site URL: `https://adambissonnette.github.io/3dnd_maps/` (or `…/3dnd_maps/docs/` when using branch + root redirect)

**Troubleshooting:** If the console requests `…/src/main.js`, Pages is serving unbuilt sources. Use **GitHub Actions** or branch folder **`/docs`**, then hard-refresh.

**Texture tuning on the live site:** add `?config=1` (e.g. `https://adambissonnette.github.io/3dnd_maps/?config=1`). `npm run dev` on localhost always shows the tuning panel.

**Option B — Manual deploy from `dist/`**

```bash
npm run build
# Set base in vite.config.js to '/3dnd_maps/' first
npx gh-pages -d dist
```

Install once: `npm install -D gh-pages`

### 5. Fan content & copyright (Wizards of the Coast)

The included **Barovia** map textures and 3D terrain are based on *Dungeons & Dragons* setting material and map art (e.g. Mike Schley’s regional map). This project is **unofficial fan content** shared under [Wizards of the Coast’s Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy) (last updated **November 15, 2017**).

Per that policy, fan content should be:

- **Free** — no paywall, sale, or license of the fan work (GitHub Pages / ad-free hosting is generally aligned; do not sell the map files or viewer access)
- **Clearly unofficial** — not endorsed or sponsored by Wizards
- **Respectful of existing notices** — do not strip copyright / trademark notices from Wizards materials embedded in the images

**Required-style disclaimer** (from the policy; include in README, site footer, or repo description when you publish):

> This project is unofficial Fan Content permitted under the [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. © Wizards of the Coast LLC.

The **viewer source code** in this repository is a separate fan tool (Three.js STL + texture alignment). The **map PNGs and STLs** are fan derivatives of Wizards-related game content — only include them in a public repo if you are comfortable doing so under the Fan Content Policy. Alternatives:

- Publish **code only** and document “bring your own STL + image”
- Keep assets in a **private** repo or local-only copies

Wizards may restrict or request removal of fan content at any time. You are responsible for compliance with the policy and applicable law.

---

## Project layout

```
index.html
package.json
vite.config.js
src/
  main.js           # Three.js viewer
  maps.config.js    # Maps + tuned texture/orientation
public/
  assets/           # STL + PNG per map
scripts/
  setup-assets.sh   # symlinks for local dev
  copy-assets-for-git.sh
```

## License

The **application code** may use MIT or your preferred open-source license. **Dungeons & Dragons**, **Barovia**, and related art and setting material are © [Wizards of the Coast LLC](https://company.wizards.com/). This project is not affiliated with or endorsed by Wizards of the Coast.
