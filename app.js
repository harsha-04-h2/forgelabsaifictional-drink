/* FOREGA LABS AI — cinematic 3D stage */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeLabelTexture } from './labels.js';

gsap.registerPlugin(ScrollTrigger);
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ================= CONFIG ================= */
const FLAVORS = [
  { name: 'NEON SYNAPSE', code: 'NS-01', accent: '#00E5FF', tagline: 'Clarity at machine speed.',
    labelLines: ['NEON', 'SYNAPSE'],
    labelSpecs: [['CAFFEINE', '200MG'], ['L-THEANINE', '200MG'], ['ALPHA-GPC', '150MG'], ['SUGAR', '0G']],
    seed: 1103 },
  { name: 'CIRCUIT RUSH', code: 'CR-02', accent: '#B4FF00', tagline: 'Raw voltage. Zero crash.',
    labelLines: ['CIRCUIT', 'RUSH'],
    labelSpecs: [['CAFFEINE', '200MG'], ['TAURINE', '1000MG'], ['ELECTROLYTES', '350MG'], ['SUGAR', '0G']],
    seed: 2207 },
  { name: 'QUANTUM BERRY', code: 'QB-03', accent: '#A855F7', tagline: 'Taste the superposition.',
    labelLines: ['QUANTUM', 'BERRY'],
    labelSpecs: [['CAFFEINE', '200MG'], ["LION'S MANE", '500MG'], ['L-THEANINE', '150MG'], ['SUGAR', '0G']],
    seed: 3311 },
  { name: 'OVERCLOCK', code: 'OC-04', accent: '#FF6B1A', tagline: 'Push past your clock speed.',
    labelLines: ['OVER', 'CLOCK'],
    labelSpecs: [['CAFFEINE', '200MG'], ['BETA-ALANINE', '1600MG'], ['CITRULLINE', '3000MG'], ['SUGAR', '0G']],
    seed: 4419 },
];

/* camera keyframes: hero, 4 flavors, lab */
const POSES = [
  { p: [0, 0.7, 11.6],    t: [0, 0.1, 0],  canX: 0   },
  { p: [4.6, 1.4, 10.6],  t: [0, 0, 0],    canX: 0   },
  { p: [-5.6, -0.6, 10.2],t: [0, -0.2, 0],  canX: 0   },
  { p: [0.8, 2.6, 9.4],   t: [0, 0.3, 0],  canX: 0   },
  { p: [3.6, -1.2, 10.8], t: [0, 0, 0],    canX: 0   },
  { p: [0, 0.9, 13.4],    t: [0, 0.2, 0],  canX: 2.8 },
];

const smooth = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const isMobile = () => window.innerWidth < 860;

/* ================= LOADER ================= */
const loaderEl = document.getElementById('loader');
const loaderFill = document.getElementById('loaderFill');
const loaderPct = document.getElementById('loaderPct');
const loaderLog = document.getElementById('loaderLog');
const LOG_LINES = [
  '> mounting neural stack ............ OK',
  '> calibrating nootropic matrix ...... OK',
  '> rendering can geometry ........... OK',
  '> syncing flavor colorways ......... OK',
  '> FOREGA.OS online',
];
const progress = { v: 0 };
let logIdx = 0;
const logTimer = setInterval(() => {
  if (logIdx < LOG_LINES.length) loaderLog.innerHTML += LOG_LINES[logIdx++] + '<br>';
}, 620);
gsap.to(progress, {
  v: 92, duration: 3.2, ease: 'power2.inOut',
  onUpdate: () => {
    loaderFill.style.width = progress.v + '%';
    loaderPct.textContent = String(Math.floor(progress.v)).padStart(3, '0') + '%';
  },
});

function finishLoading() {
  clearInterval(logTimer);
  gsap.killTweensOf(progress);
  gsap.to(progress, {
    v: 100, duration: 0.6, ease: 'power2.out',
    onUpdate: () => {
      loaderFill.style.width = progress.v + '%';
      loaderPct.textContent = '100%';
    },
    onComplete: () => {
      loaderEl.classList.add('done');
      ScrollTrigger.refresh();
    },
  });
}
// safety: never trap the user behind the loader
setTimeout(() => { if (!loaderEl.classList.contains('done')) finishLoading(); }, 14000);

/* ================= THREE — lazy init after loader paints ================= */
let renderer, scene, camera, canGroup, bodyA, bodyB, rimLight, particleMat, glowMat, bgColor;
let textures = [];
let frontBody = 0; // 0 = bodyA showing
let currentFlavor = -1;
let lastScrollY = 0;
const clock = new THREE.Clock();

function radialSprite(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildCan() {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color: 0xd9dbe0, metalness: 1.0, roughness: 0.26, envMapIntensity: 1.1,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x2a2b30, metalness: 0.9, roughness: 0.45, envMapIntensity: 0.6,
  });

  const bodyGeo = new THREE.CylinderGeometry(0.94, 1.0, 5.2, 72, 1, true);
  const mkBody = tex => new THREE.Mesh(bodyGeo, new THREE.MeshPhysicalMaterial({
    map: tex, metalness: 0.42, roughness: 0.36,
    clearcoat: 0.6, clearcoatRoughness: 0.25,
    envMapIntensity: 0.7, transparent: true,
  }));
  bodyA = mkBody(textures[0]); bodyB = mkBody(textures[0]);
  bodyB.material.opacity = 0; bodyB.scale.setScalar(0.998);
  group.add(bodyA, bodyB);

  // neck taper
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.94, 0.35, 72, 1, true), darkMetal);
  neck.position.y = 2.775; group.add(neck);

  // lid
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.07, 72), metal);
  lid.position.y = 2.985; group.add(lid);
  const lidRim = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.055, 24, 72), metal);
  lidRim.rotation.x = Math.PI / 2; lidRim.position.y = 3.0; group.add(lidRim);
  // pull tab + rivet
  const tab = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 0.52), metal);
  tab.position.set(0, 3.04, 0.18); tab.rotation.y = 0.25; group.add(tab);
  const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 24), metal);
  rivet.position.set(0, 3.04, -0.12); group.add(rivet);

  // bottom rim + base
  const botRim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.06, 24, 72), metal);
  botRim.rotation.x = Math.PI / 2; botRim.position.y = -2.6; group.add(botRim);
  const base = new THREE.Mesh(new THREE.CircleGeometry(1.0, 72), darkMetal);
  base.rotation.x = Math.PI / 2; base.position.y = -2.6; group.add(base);

  group.position.y = -0.1;
  return group;
}

function initThree() {
  const canvas = document.getElementById('gl');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  scene = new THREE.Scene();
  bgColor = new THREE.Color('#050507');
  scene.background = bgColor;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.7, 11.6);

  // studio lighting
  scene.add(new THREE.HemisphereLight(0x8a8fa0, 0x050507, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 6, 6); scene.add(key);
  rimLight = new THREE.DirectionalLight(new THREE.Color(FLAVORS[0].accent), 3.2);
  rimLight.position.set(-6, 3, -6); scene.add(rimLight);
  const fill = new THREE.PointLight(0xffffff, 12, 30);
  fill.position.set(-3, -2, 5); scene.add(fill);

  // label textures (fonts must be ready for crisp type)
  textures = FLAVORS.map(f => makeLabelTexture(THREE, f));

  canGroup = buildCan();
  canGroup.rotation.y = Math.PI; // label front (u=0.5) faces the camera at +z
  scene.add(canGroup);

  // accent glow behind can (tight falloff so the stage stays near-black)
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 256;
  const gx = glowCanvas.getContext('2d');
  const gg = gx.createRadialGradient(128, 128, 4, 128, 128, 128);
  gg.addColorStop(0, 'rgba(255,255,255,0.85)');
  gg.addColorStop(0.32, 'rgba(255,255,255,0.26)');
  gg.addColorStop(1, 'rgba(255,255,255,0)');
  gx.fillStyle = gg; gx.fillRect(0, 0, 256, 256);
  const glowTex = new THREE.CanvasTexture(glowCanvas); glowTex.colorSpace = THREE.SRGBColorSpace;
  glowMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: new THREE.Color(FLAVORS[0].accent),
    transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(6, 6, 1); glow.position.z = -2.5;
  scene.add(glow);

  // floor shadow
  const shadow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialSprite('rgba(0,0,0,0.85)', 'rgba(0,0,0,0)'),
    transparent: true, opacity: 0.55, depthWrite: false,
  }));
  shadow.scale.set(7.5, 2.4, 1); shadow.position.y = -3.5;
  scene.add(shadow);

  // particle field
  const N = 450, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 6 + Math.random() * 10, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph) * 0.7;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  particleMat = new THREE.PointsMaterial({
    size: 0.045, transparent: true, opacity: 0.65,
    color: new THREE.Color(FLAVORS[0].accent),
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  scene.add(new THREE.Points(pg, particleMat));

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    driveCamera(window.scrollY);
  });

  renderer.setAnimationLoop(tick);
}

function tick() {
  if (document.hidden) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  // idle spin + scroll-velocity spin
  const v = Math.min(Math.abs(window.scrollY - lastScrollY) / 16, 6);
  lastScrollY = window.scrollY;
  canGroup.rotation.y += dt * (0.35 + v * 0.6);
  canGroup.position.y = -0.1 + Math.sin(clock.elapsedTime * 0.9) * 0.08;
  renderer.render(scene, camera);
}

/* ================= CAMERA CHOREOGRAPHY ================= */
const heroEl = document.getElementById('hero');
const flavorsEl = document.getElementById('flavors');
const labEl = document.getElementById('lab');
const footerEl = document.getElementById('footer');

const _pos = new THREE.Vector3(), _tgt = new THREE.Vector3();

function driveCamera(scrollY) {
  if (!camera) return;
  const y1 = flavorsEl.offsetTop;
  const y2 = flavorsEl.offsetTop + flavorsEl.offsetHeight;
  const y3 = labEl.offsetTop + labEl.offsetHeight;
  let a, b, t;
  if (scrollY <= y1) { a = POSES[0]; b = POSES[1]; t = smooth(Math.min(1, scrollY / Math.max(1, y1))); }
  else if (scrollY <= y2) {
    const ft = ((scrollY - y1) / (y2 - y1)) * 4;
    const i = Math.min(3, Math.floor(ft));
    a = POSES[1 + i]; b = POSES[2 + i]; t = smooth(ft - i);
  } else {
    const lt = Math.min(1, (scrollY - y2) / Math.max(1, y3 - y2));
    a = POSES[4]; b = POSES[5]; t = smooth(lt);
  }
  const mob = isMobile();
  const zMul = mob ? 1.45 : 1;
  _pos.set(lerp(a.p[0], b.p[0], t), lerp(a.p[1], b.p[1], t), lerp(a.p[2], b.p[2], t) * zMul);
  _tgt.set(lerp(a.t[0], b.t[0], t), lerp(a.t[1], b.t[1], t), lerp(a.t[2], b.t[2], t));
  camera.position.copy(_pos);
  camera.lookAt(_tgt);
  canGroup.position.x = mob ? 0 : lerp(a.canX, b.canX, t);
}

/* ================= FLAVOR / THEME SYSTEM ================= */
const dots = [...document.querySelectorAll('.dot')];
const dotsNav = document.getElementById('dots');
const hudFormula = document.getElementById('hudFormula');
dots.forEach((d, i) => d.style.setProperty('--c', FLAVORS[i].accent));

function setFlavor(i, instant = false) {
  if (i === currentFlavor) return;
  const prev = currentFlavor;
  currentFlavor = i;
  const f = FLAVORS[i];
  const dur = instant ? 0 : 0.9;

  // CSS accent
  gsap.to('html', { '--accent': f.accent, duration: dur, ease: 'power2.inOut' });

  if (renderer) {
    const target = new THREE.Color(f.accent);
    gsap.to(rimLight.color, { r: target.r, g: target.g, b: target.b, duration: dur });
    gsap.to(particleMat.color, { r: target.r, g: target.g, b: target.b, duration: dur });
    gsap.to(glowMat.color, { r: target.r, g: target.g, b: target.b, duration: dur });
    const bgTarget = new THREE.Color(f.accent).multiplyScalar(0.055);
    bgTarget.r += 0.008; bgTarget.g += 0.008; bgTarget.b += 0.008;
    gsap.to(bgColor, { r: bgTarget.r, g: bgTarget.g, b: bgTarget.b, duration: dur });
  }

  // label cross-fade
  if (renderer && prev !== -1) crossfadeLabel(i);

  // HUD + dots
  hudFormula.textContent = `FORMULA ${f.code} — ${f.name}`;
  dots.forEach((d, k) => d.classList.toggle('active', k === i));
}

function crossfadeLabel(i) {
  const showing = frontBody === 0 ? bodyA : bodyB;
  const incoming = frontBody === 0 ? bodyB : bodyA;
  incoming.material.map = textures[i];
  incoming.material.needsUpdate = true;
  incoming.scale.setScalar(0.998);
  gsap.to(incoming.material, { opacity: 1, duration: 0.7, ease: 'power2.inOut' });
  gsap.to(showing.material, {
    opacity: 0, duration: 0.7, ease: 'power2.inOut',
    onComplete: () => { incoming.scale.setScalar(1); },
  });
  frontBody = 1 - frontBody;
}

/* per-panel activation */
document.querySelectorAll('.flavor-panel').forEach(panel => {
  const i = +panel.dataset.flavor;
  const inner = panel.querySelector('.panel-inner');
  ScrollTrigger.create({
    trigger: panel, start: 'top top', end: 'bottom top',
    onToggle: self => {
      if (self.isActive) setFlavor(i);
      gsap.to(inner, {
        autoAlpha: self.isActive ? 1 : 0,
        y: self.isActive ? 0 : 46,
        duration: 0.7, ease: 'power3.out', overwrite: true,
      });
    },
  });
});

/* hero in view -> flavor 0 is the ambient theme (also fixes instant jumps back to top) */
ScrollTrigger.create({
  trigger: '#hero', start: 'top top', end: 'bottom top',
  onToggle: self => { if (self.isActive) setFlavor(0); },
});

/* hero content drifts away */
gsap.to('#hero .hero-eyebrow, #hero .hero-title, #hero .hero-tag, #hero .hero-sub', {
  y: -70, opacity: 0, ease: 'none',
  scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom 45%', scrub: true },
});
gsap.to('.scroll-cue', {
  opacity: 0, ease: 'none',
  scrollTrigger: { trigger: '#hero', start: 'top top', end: 'top 40%', scrub: true },
});

/* master camera driver */
ScrollTrigger.create({
  trigger: '#scrollSpace', start: 'top top', end: 'bottom bottom',
  onUpdate: self => driveCamera(self.scroll()),
});

/* dots visibility: flavors through lab */
ScrollTrigger.create({
  trigger: '#flavors', start: 'top 70%',
  endTrigger: '#footer', end: 'top 55%',
  onToggle: self => dotsNav.classList.toggle('show', self.isActive),
});

/* footer: can recedes */
ScrollTrigger.create({
  trigger: '#footer', start: 'top 70%', end: 'bottom bottom',
  onToggle: self => {
    if (!canGroup) return;
    gsap.to(canGroup.scale, { x: self.isActive ? 0.82 : 1, y: self.isActive ? 0.82 : 1, z: self.isActive ? 0.82 : 1, duration: 1, ease: 'power2.inOut' });
    gsap.to(canGroup.position, { y: self.isActive ? -1.2 : -0.1, duration: 1, ease: 'power2.inOut' });
  },
});

// debug hook (used by automated verification; harmless in production)
window.__stDebug = () => ScrollTrigger.getAll().map(t => ({
  trig: (t.trigger && (t.trigger.id || t.trigger.className || t.trigger.tagName)) || 'window',
  start: Math.round(t.start), end: Math.round(t.end),
  active: t.isActive, prog: +t.progress.toFixed(2),
}));

// GSAP-driven smooth scroll (consistent easing; works where native smooth-scroll is unavailable)
const scrollProxy = { y: 0 };
function smoothTo(target) {
  scrollProxy.y = window.scrollY;
  gsap.to(scrollProxy, {
    y: target, duration: 1.4, ease: 'power3.inOut', overwrite: 'auto',
    onUpdate: () => window.scrollTo(0, scrollProxy.y),
  });
}
// user takes over: cancel any in-flight dot scroll
window.addEventListener('wheel', () => gsap.killTweensOf(scrollProxy), { passive: true });
window.addEventListener('touchstart', () => gsap.killTweensOf(scrollProxy), { passive: true });
window.addEventListener('keydown', e => {
  if ([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
    gsap.killTweensOf(scrollProxy);
  }
});
// debug/verification hook
window.__forega = { killScroll: () => gsap.killTweensOf(scrollProxy) };

dots.forEach(d => d.addEventListener('click', () => {
  const i = +d.dataset.flavor;
  // +12px lands inside the panel so its ScrollTrigger activates unambiguously
  smoothTo(flavorsEl.offsetTop + i * window.innerHeight + 12);
}));

/* ================= NOTIFY FORM ================= */
document.getElementById('notifyForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('notifyEmail');
  const msg = document.getElementById('notifyMsg');
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
  if (!ok) {
    msg.textContent = 'INVALID SIGNAL — CHECK THE ADDRESS.';
    gsap.fromTo('#notifyForm', { x: -7 }, { x: 0, duration: 0.4, ease: 'elastic.out(1,0.35)' });
    return;
  }
  msg.textContent = 'SIGNAL RECEIVED — YOU\u2019RE ON THE LIST.';
  input.value = '';
});

/* ================= BOOT ================= */
(async function boot() {
  try {
    await document.fonts.ready;
    // let the loader paint first, then build the heavy scene
    await new Promise(r => setTimeout(r, 350));
    initThree();
    driveCamera(0);
    setFlavor(0, true);
    finishLoading();
  } catch (err) {
    console.error('[forega] boot failed:', err);
    loaderLog.innerHTML += '<br>> RENDER FAULT — CHECK CONNECTION';
    setTimeout(finishLoading, 2500);
  }
})();
