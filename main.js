import './style.css';

import * as VOXELIZE from '@voxelize/core';
import * as THREE from 'three';

const canvas = document.getElementById('canvas');

/* -------------------------------------------------------------------------- */
/*                               VOXELIZE WORLD                               */
/* -------------------------------------------------------------------------- */
const world = new VOXELIZE.World({
  textureUnitDimension: 16,
});

function applyBlockTextures() {
  const allFaces = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

  world.applyBlockTexture('Dirt', allFaces, '/blocks/dirt.png');
  world.applyBlockTexture('Stone', allFaces, '/blocks/stone.png');
  world.applyBlockTexture(
    'Grass Block',
    ['px', 'pz', 'nx', 'nz'],
    '/blocks/grass_side.png',
  );
  world.applyBlockTexture('Grass Block', ['py'], '/blocks/grass_top.png');
  world.applyBlockTexture('Grass Block', ['ny'], '/blocks/dirt.png');
}

/* -------------------------------------------------------------------------- */
/*                         THREE-JS UTILITIES/CLASSES                         */
/* -------------------------------------------------------------------------- */
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  canvas,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;

/* -------------------------------------------------------------------------- */
/*                               PLAYER CONTROLS                              */
/* -------------------------------------------------------------------------- */
const inputs = new VOXELIZE.Inputs();

// To run around the world
const rigidControls = new VOXELIZE.RigidControls(
  camera,
  renderer.domElement,
  world,
  {
    initialPosition: [0, 40, 0],
  },
);

rigidControls.connect(inputs);

// To add/remove blocks
const voxelInteract = new VOXELIZE.VoxelInteract(camera, world, {
  highlightType: 'outline',
});
world.add(voxelInteract);

inputs.click('left', () => {
  if (!voxelInteract.target) return;

  const [x, y, z] = voxelInteract.target;
  world.updateVoxel(x, y, z, 0);
});

let holdingBlockType = 1;

inputs.click('middle', () => {
  if (!voxelInteract.target) return;

  const [x, y, z] = voxelInteract.target;
  holdingBlockType = world.getVoxelAt(x, y, z);
});

inputs.click('right', () => {
  if (!voxelInteract.potential) return;
  const { voxel } = voxelInteract.potential;
  world.updateVoxel(...voxel, holdingBlockType);
});

/* -------------------------------------------------------------------------- */
/*                               NETWORK MANAGER                              */
/* -------------------------------------------------------------------------- */
const network = new VOXELIZE.Network();

network.register(world);

const empty = new THREE.Vector3();

/* -------------------------------------------------------------------------- */
/*                               MAIN GAME LOOPS                              */
/* -------------------------------------------------------------------------- */
function animate() {
  requestAnimationFrame(animate);

  // Process incoming network messages
  network.sync();

  if (world.isInitialized) {
    voxelInteract.update();
    rigidControls.update();

    world.update(
      rigidControls.object.position,
      camera.getWorldDirection(empty),
    );
  }

  renderer.render(world, camera);

  // Send outgoing network messages
  network.flush();
}

async function start() {
  animate();

  await network.connect('http://localhost:4000');
  await network.join('tutorial');

  await world.initialize();
  applyBlockTextures();
}

start();
