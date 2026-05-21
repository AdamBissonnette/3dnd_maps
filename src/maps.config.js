/**
 * Map definitions. Tune in the UI, then paste into these blocks (or use Copy texture config).
 *
 * Assets live in public/assets/ — see scripts/setup-assets.sh or README.
 */
const base = import.meta.env.BASE_URL;

function asset(path) {
  return `${base}${path.replace(/^\//, '')}`;
}

export const MAPS = {
  barovia1: {
    id: 'barovia1',
    name: 'Barovia - Standard',
    stl: asset('assets/barovia1/barovia_map_v1.stl'),
    image: asset('assets/barovia1/Barovia-5e_trim.png'),
    orientation: { x: -Math.PI / 2, y: 0, z: 0 },
    upAxis: 'z',
    uvAxes: { u: 'x', v: 'y' },
    topFaceThreshold: 0.5,
    sideColor: 0x9a9a9a,
    texture: {
      offsetStep: 0.001,
      mirrorX: false,
      mirrorY: false,
      offsetX: -0.006,
      offsetY: 0.007,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      centerX: 0.5,
      centerY: 0.5,
    },
    camera: null,
    mesh: {
      color: 0xffffff,
      metalness: 0,
      roughness: 0.92,
    },
    scene: {
      background: 0xb7b7b7,
      fog: false,
    },
  },

  barovia2: {
    id: 'barovia2',
    name: 'Barovia - Berkel',
    stl: asset('assets/barovia2/barovia_map_v2-map.stl'),
    image: asset('assets/barovia2/map_og.png'),
    orientation: { x: -Math.PI / 2, y: 0, z: 0 },
    upAxis: 'z',
    uvAxes: { u: 'x', v: 'y' },
    topFaceThreshold: 0.5,
    sideColor: 0x9a9a9a,
    texture: {
      offsetStep: 0.01,
      mirrorX: false,
      mirrorY: false,
      offsetX: 0,
      offsetY: 0.01,
      scaleX: 1,
      scaleY: 0.95,
      rotation: 0,
      centerX: 0.5,
      centerY: 0.496,
    },
    camera: null,
    mesh: {
      color: 0xffffff,
      metalness: 0,
      roughness: 0.92,
    },
    scene: {
      background: 0xb7b7b7,
      fog: false,
    },
  },
};

export const DEFAULT_MAP_ID = 'barovia1';

export function getMapIdFromUrl() {
  const id = new URLSearchParams(window.location.search).get('map');
  return id && MAPS[id] ? id : DEFAULT_MAP_ID;
}
