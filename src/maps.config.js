/**
 * Map definitions. Tune in the UI, then paste into these blocks (or use Copy texture config).
 *
 * Assets live in public/assets/ — see scripts/setup-assets.sh or README.
 */
const base = import.meta.env.BASE_URL;

function asset(path) {
  return `${base}${path.replace(/^\//, '')}`;
}

const baroviaStandardSettings = {
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
  lighting: {
    position: [1, 2, 1],
    intensity: 3,
  },
  scene: {
    background: 0xb7b7b7,
    fog: false,
  },
};

function baroviaStandardMap(id, name, stlPath) {
  return {
    id,
    name,
    stl: asset(stlPath),
    ...baroviaStandardSettings,
  };
}

export const MAPS = {
  barovia1: baroviaStandardMap('barovia1', 'Standard V1', 'assets/barovia1/barovia_map_v1.stl'),
  barovia1v2: baroviaStandardMap('barovia1v2', 'Standard V2', 'assets/barovia1/barovia_map_v2.stl'),
  barovia2: {
    id: 'barovia2',
    name: 'Berkle V1',
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
    lighting: {
      position: [1, 2, 1],
      intensity: 3,
    },
    scene: {
      background: 0xb7b7b7,
      fog: false,
    },
  },
};

/** Grouped entries for the map dropdown (optgroup label → options). */
export const MAP_MENU = [
  {
    label: 'Barovia',
    options: [
      { id: 'barovia1', label: 'Standard V1' },
      { id: 'barovia1v2', label: 'Standard V2' },
      { id: 'barovia2', label: 'Berkle V1' },
    ],
  },
];

export const DEFAULT_MAP_ID = 'barovia1';

export function getMapIdFromUrl() {
  const id = new URLSearchParams(window.location.search).get('map');
  return id && MAPS[id] ? id : DEFAULT_MAP_ID;
}
