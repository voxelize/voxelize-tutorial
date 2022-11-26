import './style.css';

import * as VOXELIZE from '@voxelize/client';
import * as THREE from 'three';
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
} from 'postprocessing';

/* -------------------------------------------------------------------------- */
/*                                HTML ELEMENTS                               */
/* -------------------------------------------------------------------------- */
const canvas = document.getElementById('main');

/* -------------------------------------------------------------------------- */
/*                       BASIC THREE.JS & VOXELIZE SETUP                      */
/* -------------------------------------------------------------------------- */
const world = new VOXELIZE.World();
world.renderRadius = 5;

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  3000,
);

const renderer = new THREE.WebGLRenderer({
  canvas,
});
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setSize(
  renderer.domElement.offsetWidth,
  renderer.domElement.offsetHeight,
);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(world, camera));
composer.addPass(new EffectPass(camera, new SMAAEffect({})));

const inputs = new VOXELIZE.Inputs();

const controls = new VOXELIZE.RigidControls(camera, renderer.domElement, world);
controls.connect(inputs);

/* -------------------------------------------------------------------------- */
/*                           BLOCK TEXTURE REGISTRY                           */
/* -------------------------------------------------------------------------- */
world.applyTexturesByNames([
  {
    name: 'white',
    sides: VOXELIZE.ALL_FACES,
    data: new THREE.Color('white'),
  },
]);

/* -------------------------------------------------------------------------- */
/*                                COOL FEATURES                               */
/* -------------------------------------------------------------------------- */
const perspective = new VOXELIZE.Perspective(controls, world);
perspective.connect(inputs);

const sky = new VOXELIZE.Sky();
world.add(sky);

const clouds = new VOXELIZE.Clouds();
world.add(clouds);

const voxelInteract = new VOXELIZE.VoxelInteract(controls.object, world, {
  inverseDirection: true,
});
world.add(voxelInteract);

/* -------------------------------------------------------------------------- */
/*                               EVENT LISTENERS                              */
/* -------------------------------------------------------------------------- */
// Resize the canvas when the window is resized
const onResize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
};

window.addEventListener('resize', onResize);

// Block breaking and placing
inputs.click('left', () => {
  if (!voxelInteract.target) return;

  const [vx, vy, vz] = voxelInteract.target;
  world.updateVoxel(vx, vy, vz, 0);
});

let hand = 1;

inputs.click('right', () => {
  if (!voxelInteract.potential) return;

  const { voxel, rotation, yRotation } = voxelInteract.potential;
  world.updateVoxel(voxel[0], voxel[1], voxel[2], hand, rotation, yRotation);
});

inputs.bind('g', controls.toggleGhostMode);

/* -------------------------------------------------------------------------- */
/*                              CONNECT TO SERVER                             */
/* -------------------------------------------------------------------------- */
const BACKEND_URL = (
  location.href.includes('localhost') ? 'http://localhost:4000' : location.href
).replace('http', 'ws');

const network = new VOXELIZE.Network();

network.register(world);

network.connect(BACKEND_URL).then(() => {
  let joined = false;

  const animate = () => {
    requestAnimationFrame(animate);

    if (joined) {
      controls.update();

      const center = controls.object.position;

      world.update(center);
      clouds.update(center);
      sky.update(center);

      perspective.update();
      voxelInteract.update();

      network.flush();
    }

    composer.render();
  };

  network.join('main').then(() => {
    joined = true;
  });

  animate();
});
