import * as THREE from 'three';

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 50;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// ── Neural Network Particles ──
const PARTICLE_COUNT = 180;
const CONNECT_DISTANCE = 18;
const particles = [];
const positions = new Float32Array(PARTICLE_COUNT * 3);

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const x = (Math.random() - 0.5) * 120;
  const y = (Math.random() - 0.5) * 80;
  const z = (Math.random() - 0.5) * 60;
  positions[i * 3] = x;
  positions[i * 3 + 1] = y;
  positions[i * 3 + 2] = z;
  particles.push({
    x, y, z,
    vx: (Math.random() - 0.5) * 0.04,
    vy: (Math.random() - 0.5) * 0.04,
    vz: (Math.random() - 0.5) * 0.04,
  });
}

const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const particleMat = new THREE.PointsMaterial({
  color: 0x64ffda,
  size: 0.6,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  sizeAttenuation: true,
});

const particleSystem = new THREE.Points(particleGeo, particleMat);
scene.add(particleSystem);

// ── Connection Lines ──
const maxConnections = PARTICLE_COUNT * PARTICLE_COUNT;
const linePositions = new Float32Array(maxConnections * 6);
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

const lineMat = new THREE.LineBasicMaterial({
  color: 0x7c4dff,
  transparent: true,
  opacity: 0.12,
  blending: THREE.AdditiveBlending,
});

const lines = new THREE.LineSegments(lineGeo, lineMat);
scene.add(lines);

function updateConnections() {
  let idx = 0;
  const pos = particleGeo.attributes.position.array;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    for (let j = i + 1; j < PARTICLE_COUNT; j++) {
      const dx = pos[i * 3] - pos[j * 3];
      const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
      const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < CONNECT_DISTANCE) {
        linePositions[idx++] = pos[i * 3];
        linePositions[idx++] = pos[i * 3 + 1];
        linePositions[idx++] = pos[i * 3 + 2];
        linePositions[idx++] = pos[j * 3];
        linePositions[idx++] = pos[j * 3 + 1];
        linePositions[idx++] = pos[j * 3 + 2];
      }
    }
  }

  lineGeo.setDrawRange(0, idx / 3);
  lineGeo.attributes.position.needsUpdate = true;
}

// ── Floating 3D Shapes ──
function createShape(geometry, color, position, scale = 1) {
  const mat = new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
  });
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(...position);
  mesh.scale.setScalar(scale);
  scene.add(mesh);
  return mesh;
}

const torus = createShape(
  new THREE.TorusGeometry(8, 2.5, 16, 48),
  0x64ffda,
  [-35, 15, -20],
  1.2
);

const icosa = createShape(
  new THREE.IcosahedronGeometry(6, 0),
  0x7c4dff,
  [40, -10, -15],
  1
);

const octa = createShape(
  new THREE.OctahedronGeometry(5, 0),
  0x38bdf8,
  [10, 25, -25],
  0.8
);

// ── Mouse Parallax ──
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// ── Scroll-driven camera drift ──
let scrollY = 0;
window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
});

// ── Animation Loop ──
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  targetX += (mouseX - targetX) * 0.03;
  targetY += (mouseY - targetY) * 0.03;

  const pos = particleGeo.attributes.position.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.z += p.vz;

    if (Math.abs(p.x) > 60) p.vx *= -1;
    if (Math.abs(p.y) > 40) p.vy *= -1;
    if (Math.abs(p.z) > 30) p.vz *= -1;

    pos[i * 3] = p.x;
    pos[i * 3 + 1] = p.y;
    pos[i * 3 + 2] = p.z;
  }
  particleGeo.attributes.position.needsUpdate = true;
  updateConnections();

  torus.rotation.x = t * 0.15;
  torus.rotation.y = t * 0.2;
  icosa.rotation.x = t * 0.1;
  icosa.rotation.y = t * 0.25;
  octa.rotation.x = t * 0.2;
  octa.rotation.z = t * 0.15;

  camera.position.x = targetX * 8;
  camera.position.y = -targetY * 5 - scrollY * 0.005;
  camera.lookAt(0, -scrollY * 0.003, 0);

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
