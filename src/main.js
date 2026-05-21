import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import GUI from 'lil-gui';
import { DEFAULT_MAP_ID, getMapIdFromUrl, MAPS } from './maps.config.js';

const isPublicBuild = import.meta.env.PROD;
const container = document.getElementById('app');
const mapNav = document.getElementById('map-nav');
const statusEl = document.getElementById('status');
const copyBtn = document.getElementById('copy-config');
const hudIcon = document.getElementById('hud-icon');

if (isPublicBuild) {
  document.body.classList.add('public-build');
}

if (hudIcon) {
  hudIcon.src = `${import.meta.env.BASE_URL}favicon.ico`;
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 50000);
camera.position.set(120, 120, 120);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
keyLight.position.set(1, 2, 1);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
fillLight.position.set(-1, 0.5, -1);
scene.add(fillLight);

const loader = new STLLoader();
let activeMapId = getMapIdFromUrl();
let terrainMesh = null;
let gui = null;
let textureParams = null;
let currentTexture = null;

const mapLinks = new Map();

for (const map of Object.values(MAPS)) {
  const link = document.createElement('a');
  link.href = `?map=${map.id}`;
  link.textContent = map.name;
  link.dataset.mapId = map.id;
  link.addEventListener('click', (event) => {
    event.preventDefault();
    navigateToMap(map.id);
  });
  mapNav.appendChild(link);
  mapLinks.set(map.id, link);
}

updateMapNav(activeMapId);

function navigateToMap(mapId) {
  if (!MAPS[mapId] || mapId === activeMapId) return;
  const url = new URL(window.location.href);
  url.searchParams.set('map', mapId);
  window.history.replaceState({}, '', url);
  updateMapNav(mapId);
  loadMap(mapId);
}

function updateMapNav(mapId) {
  for (const [id, link] of mapLinks) {
    link.classList.toggle('active', id === mapId);
  }
}

if (!isPublicBuild) {
  copyBtn.addEventListener('click', async () => {
  if (!textureParams) return;
  const { offsetStep, ...texture } = textureParams;
  const snippet = JSON.stringify({ offsetStep, ...texture }, null, 2);
  await navigator.clipboard.writeText(snippet);
    setStatus('Texture config copied to clipboard');
  });
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function setStatus(text) {
  statusEl.textContent = text;
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

async function loadMap(mapId) {
  activeMapId = mapId;
  updateMapNav(mapId);
  const config = MAPS[mapId];
  if (!config) return;

  setStatus(`Loading ${config.name}…`);
  disposeTerrain();
  if (gui) {
    gui.destroy();
    gui = null;
  }

  scene.background = new THREE.Color(config.scene.background);
  if (config.scene.fog) {
    scene.fog = new THREE.Fog(config.scene.background, 80, 400);
  } else {
    scene.fog = null;
  }

  try {
    const [geometry, texture] = await Promise.all([
      loadGeometry(config.stl),
      loadTexture(config.image),
    ]);

    centerGeometry(geometry);
    const upAxis = config.upAxis ?? 'z';
    const upSign = detectUpSign(geometry, upAxis);
    applyPlanarUVs(geometry, config.uvAxes, upAxis, upSign, config.topFaceThreshold ?? 0.5);

    currentTexture = texture;
    textureParams = normalizeTextureParams(config.texture);
    applyTextureTransform(texture, textureParams);
    syncTextureConfig(config);

    const material = createTerrainMaterial(config, texture);

    terrainMesh = new THREE.Mesh(geometry, material);
    applyMeshOrientation(terrainMesh, config.orientation);
    terrainMesh.castShadow = false;
    terrainMesh.receiveShadow = false;
    scene.add(terrainMesh);

    frameCamera(terrainMesh, config);
    if (!isPublicBuild) setupGui(config);
    setStatus(config.name);
  } catch (err) {
    console.error(err);
    setStatus(`Failed: ${err.message}`);
  }
}

function loadGeometry(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

function centerGeometry(geometry) {
  geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  geometry.boundingBox.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.computeBoundingBox();
}

function applyMeshOrientation(mesh, orientation = {}) {
  mesh.rotation.set(orientation.x ?? 0, orientation.y ?? 0, orientation.z ?? 0);
}

function detectUpSign(geometry, upAxis) {
  const pos = geometry.attributes.position;
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const faceNormal = new THREE.Vector3();
  const upComponent = (n) => (upAxis === 'z' ? n.z : n.y);
  let positive = 0;
  let negative = 0;
  const step = Math.max(3, Math.floor(pos.count / 3000) * 3);

  for (let i = 0; i < pos.count; i += step) {
    vA.fromBufferAttribute(pos, i);
    vB.fromBufferAttribute(pos, i + 1);
    vC.fromBufferAttribute(pos, i + 2);
    ab.subVectors(vB, vA);
    ac.subVectors(vC, vA);
    faceNormal.crossVectors(ab, ac).normalize();
    const up = upComponent(faceNormal);
    if (up > 0.5) positive += 1;
    if (up < -0.5) negative += 1;
  }

  return positive >= negative ? 1 : -1;
}

function applyPlanarUVs(geometry, uvAxes, upAxis, upSign, topThreshold) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const uAxis = uvAxes.u;
  const vAxis = uvAxes.v;
  const uMin = min[uAxis];
  const uMax = max[uAxis];
  const vMin = min[vAxis];
  const vMax = max[vAxis];
  const uSpan = uMax - uMin || 1;
  const vSpan = vMax - vMin || 1;

  const pos = geometry.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const faceNormal = new THREE.Vector3();
  const upComponent = (n) => (upAxis === 'z' ? n.z : n.y);

  for (let i = 0; i < pos.count; i += 3) {
    vA.fromBufferAttribute(pos, i);
    vB.fromBufferAttribute(pos, i + 1);
    vC.fromBufferAttribute(pos, i + 2);
    ab.subVectors(vB, vA);
    ac.subVectors(vC, vA);
    faceNormal.crossVectors(ab, ac).normalize();
    const facingUp = upSign * upComponent(faceNormal) >= topThreshold;

    for (let j = 0; j < 3; j++) {
      const idx = i + j;
      if (facingUp) {
        const coords = { x: pos.getX(idx), y: pos.getY(idx), z: pos.getZ(idx) };
        uvs[idx * 2] = (coords[uAxis] - uMin) / uSpan;
        uvs[idx * 2 + 1] = (coords[vAxis] - vMin) / vSpan;
      } else {
        uvs[idx * 2] = 0;
        uvs[idx * 2 + 1] = 0;
      }
    }
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
}

function createTerrainMaterial(config, texture) {
  return new THREE.MeshStandardMaterial({
    map: texture,
    color: config.mesh.color,
    metalness: config.mesh.metalness,
    roughness: config.mesh.roughness,
    side: THREE.FrontSide,
    flatShading: true,
  });
}

/** Frozen defaults from maps.config.js (captured at startup). */
const MAP_DEFAULTS = {};

function snapshotMapSettings(map) {
  return {
    orientation: { ...map.orientation },
    upAxis: map.upAxis,
    uvAxes: { ...map.uvAxes },
    texture: normalizeTextureParams(map.texture),
  };
}

function initMapDefaults() {
  for (const [id, map] of Object.entries(MAPS)) {
    MAP_DEFAULTS[id] = snapshotMapSettings(map);
  }
}

function resetMapSettings(mapId) {
  const defaults = MAP_DEFAULTS[mapId];
  const config = MAPS[mapId];
  if (!defaults || !config) return;

  config.orientation = { ...defaults.orientation };
  config.upAxis = defaults.upAxis;
  config.uvAxes = { ...defaults.uvAxes };
  config.texture = { ...defaults.texture };
}

function normalizeTextureParams(raw = {}) {
  const params = {
    offsetStep: 0.0001,
    mirrorX: false,
    mirrorY: false,
    offsetX: 0,
    offsetY: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    centerX: 0.5,
    centerY: 0.5,
    ...raw,
  };

  if (raw.flipU) params.mirrorX = true;
  if (raw.flipV) params.mirrorY = true;
  delete params.flipU;
  delete params.flipV;

  if (params.scaleX < 0) {
    params.mirrorX = true;
    params.scaleX = Math.abs(params.scaleX);
  }
  if (params.scaleY < 0) {
    params.mirrorY = true;
    params.scaleY = Math.abs(params.scaleY);
  }

  params.scaleX = Math.abs(params.scaleX) || 1;
  params.scaleY = Math.abs(params.scaleY) || 1;
  return params;
}

function applyTextureTransform(texture, params) {
  const scaleX = params.scaleX ?? 1;
  const scaleY = params.scaleY ?? 1;
  const repeatX = params.mirrorX ? -scaleX : scaleX;
  const repeatY = params.mirrorY ? -scaleY : scaleY;

  texture.repeat.set(repeatX, repeatY);
  texture.offset.set(
    params.mirrorX ? 1 - params.offsetX : params.offsetX,
    params.mirrorY ? 1 - params.offsetY : params.offsetY,
  );
  texture.rotation = params.rotation ?? 0;
  texture.center.set(params.centerX ?? 0.5, params.centerY ?? 0.5);
  texture.needsUpdate = true;
}

function syncTextureConfig(config) {
  if (!textureParams) return;
  config.texture = { ...config.texture, ...textureParams };
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function applySavedCamera(config) {
  const view = config?.camera;
  if (!view?.position || view.position.length !== 3) return false;

  const wasDamping = controls.enableDamping;
  controls.enableDamping = false;
  camera.position.set(view.position[0], view.position[1], view.position[2]);
  if (view.target?.length === 3) {
    controls.target.set(view.target[0], view.target[1], view.target[2]);
  }
  controls.update();
  controls.enableDamping = wasDamping;
  return true;
}

function updateCameraClipping(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray());
  camera.near = Math.max(0.1, maxDim / 500);
  camera.far = maxDim * 20;
  camera.updateProjectionMatrix();
}

function autoFrameCamera(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray());
  const distance = maxDim * 1.4;

  updateCameraClipping(mesh);

  const wasDamping = controls.enableDamping;
  controls.enableDamping = false;
  controls.target.copy(center);
  camera.position.set(center.x, center.y + distance, center.z + distance * 0.35);
  controls.update();
  controls.enableDamping = wasDamping;
}

function frameCamera(mesh, config) {
  updateCameraClipping(mesh);
  if (applySavedCamera(config)) return;
  autoFrameCamera(mesh);
}

function getCameraConfig() {
  return {
    position: camera.position.toArray().map(round4),
    target: controls.target.toArray().map(round4),
  };
}

function setupGui(config) {
  gui = new GUI({ title: 'Texture alignment' });
  textureParams = normalizeTextureParams(config.texture);

  const folder = gui.addFolder('Texture (paste into maps.config.js)');
  const offsetUi = { step: textureParams.offsetStep };
  let offsetXCtrl;
  let offsetYCtrl;

  const offsetDecimals = (step) => {
    const text = String(step);
    const dot = text.indexOf('.');
    return dot === -1 ? 0 : text.length - dot - 1;
  };

  const addOffsetControl = (prop, label) => {
    const step = offsetUi.step;
    const ctrl = folder
      .add(textureParams, prop, -1, 1, step)
      .name(label)
      .onChange(updateTexture);
    ctrl.decimals(offsetDecimals(step));
    return ctrl;
  };

  const rebuildOffsetSliders = () => {
    textureParams.offsetStep = offsetUi.step;
    if (offsetXCtrl) offsetXCtrl.destroy();
    if (offsetYCtrl) offsetYCtrl.destroy();
    offsetXCtrl = addOffsetControl('offsetX', 'Offset X');
    offsetYCtrl = addOffsetControl('offsetY', 'Offset Y');
  };

  folder
    .add(offsetUi, 'step', {
      '0.01': 0.01,
      '0.001': 0.001,
      '0.0001': 0.0001,
      '0.00001': 0.00001,
    })
    .name('Offset step')
    .onChange(rebuildOffsetSliders);
  rebuildOffsetSliders();
  folder.add(textureParams, 'mirrorX').name('Mirror').onChange(updateTexture);
  folder
    .add(textureParams, 'scaleX', 0.1, 3, 0.001)
    .name('Scale X')
    .onChange(updateTexture);
  folder.add(textureParams, 'mirrorY').name('Mirror').onChange(updateTexture);
  folder
    .add(textureParams, 'scaleY', 0.1, 3, 0.001)
    .name('Scale Y')
    .onChange(updateTexture);
  folder
    .add(textureParams, 'rotation', -Math.PI, Math.PI, 0.001)
    .name('Rotation')
    .onChange(updateTexture);
  folder
    .add(textureParams, 'centerX', 0, 1, 0.001)
    .name('Center X')
    .onChange(updateTexture);
  folder
    .add(textureParams, 'centerY', 0, 1, 0.001)
    .name('Center Y')
    .onChange(updateTexture);
  folder.open();

  const orientFolder = gui.addFolder('Orientation');
  const orient = {
    x: config.orientation?.x ?? -Math.PI / 2,
    y: config.orientation?.y ?? 0,
    z: config.orientation?.z ?? 0,
  };
  const applyOrient = () => {
    config.orientation = { ...orient };
    if (terrainMesh) applyMeshOrientation(terrainMesh, orient);
  };
  const reloadOnUvSetting = () => loadMap(activeMapId);
  const presets = {
    layFlatNeg90() {
      orient.x = -Math.PI / 2;
      orient.y = 0;
      orient.z = 0;
      applyOrient();
    },
    layFlatPos90() {
      orient.x = Math.PI / 2;
      orient.y = 0;
      orient.z = 0;
      applyOrient();
    },
  };
  orientFolder.add(presets, 'layFlatNeg90').name('Lay flat (−90° X)');
  orientFolder.add(presets, 'layFlatPos90').name('Lay flat (+90° X)');
  orientFolder
    .add(orient, 'x', -Math.PI, Math.PI, 0.01)
    .name('Rotate X')
    .onChange(applyOrient);
  orientFolder.add(orient, 'y', -Math.PI, Math.PI, 0.01).name('Rotate Y').onChange(applyOrient);
  orientFolder.add(orient, 'z', -Math.PI, Math.PI, 0.01).name('Rotate Z').onChange(applyOrient);
  orientFolder.add(config, 'upAxis', { y: 'y', z: 'z' }).name('Up axis (reload)').onFinishChange(reloadOnUvSetting);

  const axesFolder = gui.addFolder('UV axes (reload map after change)');
  const axes = { ...config.uvAxes };
  axesFolder
    .add(axes, 'u', { x: 'x', y: 'y', z: 'z' })
    .name('U axis')
    .onFinishChange(() => {
      config.uvAxes = { ...axes };
      loadMap(activeMapId);
    });
  axesFolder
    .add(axes, 'v', { x: 'x', y: 'y', z: 'z' })
    .name('V axis')
    .onFinishChange(() => {
      config.uvAxes = { ...axes };
      loadMap(activeMapId);
    });

  gui
    .add(
      {
        resetSettings() {
          resetMapSettings(activeMapId);
          loadMap(activeMapId);
          setStatus('Texture & orientation reset to defaults');
        },
      },
      'resetSettings',
    )
    .name('Reset texture & orientation');

  const cameraFolder = gui.addFolder('Camera (paste into maps.config.js)');
  cameraFolder
    .add(
      {
        saveView() {
          const view = getCameraConfig();
          const mapConfig = MAPS[activeMapId];
          if (mapConfig) mapConfig.camera = view;
          const snippet = JSON.stringify(view, null, 2);
          navigator.clipboard.writeText(snippet);
          setStatus('Camera view saved (also copied to clipboard)');
        },
      },
      'saveView',
    )
    .name('Save current view');
  cameraFolder
    .add(
      {
        resetView() {
          if (!terrainMesh) return;
          const mapConfig = MAPS[activeMapId];
          if (mapConfig) mapConfig.camera = null;
          autoFrameCamera(terrainMesh);
          setStatus('Camera reset to auto-frame');
        },
      },
      'resetView',
    )
    .name('Reset to auto-frame');
  cameraFolder.open();

  gui.add(
    {
      wireframe: false,
      toggleWireframe() {
        if (!terrainMesh) return;
        terrainMesh.material.wireframe = !terrainMesh.material.wireframe;
      },
    },
    'toggleWireframe',
  ).name('Toggle wireframe');
}

function updateTexture() {
  if (!currentTexture || !textureParams) return;
  applyTextureTransform(currentTexture, textureParams);
  const config = MAPS[activeMapId];
  if (config) syncTextureConfig(config);
}

function disposeTerrain() {
  if (!terrainMesh) return;
  scene.remove(terrainMesh);
  terrainMesh.geometry.dispose();
  terrainMesh.material.map?.dispose();
  terrainMesh.material.dispose();
  terrainMesh = null;
  currentTexture = null;
}

initMapDefaults();
loadMap(activeMapId);
animate();
