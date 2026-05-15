/**
 * LAMBORGHINI HURACÁN — CINEMATIC 3D EXPERIENCE
 * main.js — Real GLTF model + Three.js scroll cinematics
 */

'use strict';

/* ═══════════════════════════════════════════
   CURSOR TRACKING
═══════════════════════════════════════════ */
document.addEventListener('mousemove', (e) => {
  document.documentElement.style.setProperty('--cx', e.clientX + 'px');
  document.documentElement.style.setProperty('--cy', e.clientY + 'px');
});

/* ═══════════════════════════════════════════
   LOADER
═══════════════════════════════════════════ */
const loaderBar    = document.getElementById('loaderBar');
const loaderPct    = document.getElementById('loaderPercent');
const loaderEl     = document.getElementById('loader');

// We start loading; the actual 100% fires when the GLB is ready.
let fakeProgress   = 0;
const fakeTimer    = setInterval(() => {
  fakeProgress += Math.random() * 6;
  if (fakeProgress > 85) { fakeProgress = 85; clearInterval(fakeTimer); }
  setLoaderProgress(fakeProgress);
}, 100);

function setLoaderProgress(p) {
  loaderBar.style.width   = p + '%';
  loaderPct.textContent   = Math.round(p) + '%';
}
function finishLoader() {
  setLoaderProgress(100);
  setTimeout(() => { loaderEl.classList.add('hidden'); startAnimate(); }, 500);
}

/* ═══════════════════════════════════════════
   THREE.JS CORE
═══════════════════════════════════════════ */
let scene, camera, renderer, clock;
let carGroup = null;
let particles, speedLines;
let mouseX = 0, mouseY = 0;
let currentSpeed = 0, targetSpeed = 0;
let currentSection = 'hero';
let gaugeCtx;

/* Camera state */
const camCurrent = { pos: [8, 3, 12], look: [0, 1, 0], fov: 45, rotY: -0.4 };
let   camTarget  = { pos: [8, 3, 12], look: [0, 1, 0], fov: 45, rotY: -0.4 };

/* ── Camera presets per section ── */
const CAM = {
  hero:     { pos: [6,  2.5, 10],  look: [0, 1,   0], fov: 45, rotY: -0.3 },
  engine:   { pos: [-5, 2,   9],   look: [0, 1,   0], fov: 50, rotY:  0.55 },
  aero:     { pos: [0,  7,   10],  look: [0, 1,   0], fov: 50, rotY:  0.0  },
  wheels:   { pos: [-4, 0.8, 6],   look: [-1, 0.3, 0], fov: 42, rotY:  0.4 },
  interior: { pos: [1,  4,   7],   look: [0, 1.5, 0], fov: 48, rotY:  0.0  },
  exhaust:  { pos: [7,  1.8, 6],   look: [2, 0.5, 0], fov: 42, rotY: -0.7  },
  finale:   { pos: [0,  4,   14],  look: [0, 1,   0], fov: 55, rotY:  0.0  },
};

/* ═══════════════════════════════════════════
   INIT THREE.JS
═══════════════════════════════════════════ */
function initThree() {
  scene    = new THREE.Scene();
  const canvas = document.getElementById('mainCanvas');

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.outputEncoding    = THREE.sRGBEncoding;

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 500);
  camera.position.set(...CAM.hero.pos);
  camera.lookAt(0, 1, 0);

  clock = new THREE.Clock();

  /* ── Lighting ── */
  scene.add(new THREE.AmbientLight(0x202040, 1.2));

  const sun = new THREE.DirectionalLight(0xfff4e0, 4);
  sun.position.set(8, 20, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far  = 100;
  sun.shadow.camera.left  = -15;
  sun.shadow.camera.right =  15;
  sun.shadow.camera.top   =  15;
  sun.shadow.camera.bottom= -15;
  scene.add(sun);

  const rimL = new THREE.PointLight(0xff6600, 5, 25);
  rimL.position.set(-10, 4, 2);
  scene.add(rimL);

  const rimR = new THREE.PointLight(0x3366ff, 2, 20);
  rimR.position.set(8, 3, -8);
  scene.add(rimR);

  const underGlow = new THREE.PointLight(0xc9a227, 3, 8);
  underGlow.position.set(0, -0.5, 0);
  scene.add(underGlow);

  const fill = new THREE.DirectionalLight(0x88aaff, 0.6);
  fill.position.set(-5, 2, -10);
  scene.add(fill);

  /* ── Ground ── */
  const gnd = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: 0x040408, roughness: 0.08, metalness: 0.95 })
  );
  gnd.rotation.x = -Math.PI / 2;
  gnd.position.y = -0.01;
  gnd.receiveShadow = true;
  scene.add(gnd);

  /* Track lines */
  for (let i = -5; i <= 5; i += 2) {
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, 120),
      new THREE.MeshBasicMaterial({ color: 0xffd000, transparent: true, opacity: 0.05 })
    );
    line.rotation.x = -Math.PI / 2;
    line.position.set(i, 0.001, 0);
    scene.add(line);
  }

  scene.fog = new THREE.FogExp2(0x000008, 0.016);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });
}

/* ═══════════════════════════════════════════
   LOAD REAL GLB MODEL
═══════════════════════════════════════════ */
function loadCarModel() {
  // THREE.GLTFLoader is included via CDN script tag
  const dracoLoader = new THREE.DRACOLoader();
  dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/');

  const loader = new THREE.GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  loader.load(
    './assets/lamborghini_huracan_twin_turbo_lost.glb',

    // ── onLoad ──────────────────────────────────
    (gltf) => {
      carGroup = gltf.scene;

      /* Auto-centre & scale the model */
      const box    = new THREE.Box3().setFromObject(carGroup);
      const size   = new THREE.Vector3();
      const centre = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(centre);

      // Normalise: longest axis → ~5 units
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale  = 5 / maxDim;
      carGroup.scale.setScalar(scale);

      // Centre horizontally, sit on ground
      carGroup.position.set(
        -centre.x * scale,
        -box.min.y * scale,
        -centre.z * scale
      );

      /* Enhance materials for cinematic look */
      carGroup.traverse((child) => {
        if (child.isMesh) {
          child.castShadow    = true;
          child.receiveShadow = true;

          if (child.material) {
            // Boost metalness + slight env map response
            child.material.envMapIntensity = 1.2;

            // Body panels — make them shinier
            const name = (child.material.name || child.name || '').toLowerCase();
            if (name.includes('body') || name.includes('paint') || name.includes('car')) {
              child.material.metalness = 0.9;
              child.material.roughness = 0.1;
            }
            // Glass
            if (name.includes('glass') || name.includes('window') || name.includes('wind')) {
              child.material.transparent = true;
              child.material.opacity     = 0.45;
              child.material.roughness   = 0.0;
              child.material.metalness   = 0.5;
            }
            child.material.needsUpdate = true;
          }
        }
      });

      scene.add(carGroup);

      // Trigger animations & hide loader
      finishLoader();
    },

    // ── onProgress ──────────────────────────────
    (xhr) => {
      if (xhr.lengthComputable) {
        const p = 85 + (xhr.loaded / xhr.total) * 15;
        setLoaderProgress(p);
      }
    },

    // ── onError ─────────────────────────────────
    (err) => {
      console.error('GLB load error:', err);
      // Fallback: finish anyway so UI still works
      finishLoader();
    }
  );
}

/* ═══════════════════════════════════════════
   PARTICLES
═══════════════════════════════════════════ */
function buildParticles() {
  const count = 900;
  const geo   = new THREE.BufferGeometry();
  const pos   = new Float32Array(count * 3);
  const vel   = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 8;
    pos[i*3+1] = Math.random() * 3;
    pos[i*3+2] = (Math.random() - 0.5) * 5;
    vel[i*3]   = -(Math.random() * 0.07 + 0.02);
    vel[i*3+1] = (Math.random() - 0.5) * 0.008;
    vel[i*3+2] = (Math.random() - 0.5) * 0.008;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aVelocity', new THREE.BufferAttribute(vel, 3));

  particles = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffd000, size: 0.035, sizeAttenuation: true,
    transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  particles.position.set(4, 0, 0);
  particles.visible = false;
  scene.add(particles);
}

/* ═══════════════════════════════════════════
   SPEED LINES
═══════════════════════════════════════════ */
function buildSpeedLines() {
  const count = 150;
  const geo   = new THREE.BufferGeometry();
  const pos   = new Float32Array(count * 6);

  for (let i = 0; i < count; i++) {
    const x   = (Math.random() - 0.3) * 16;
    const y   = (Math.random() - 0.3) * 5;
    const z   = (Math.random() - 0.5) * 10;
    const len = Math.random() * 2.5 + 0.5;
    pos[i*6]=x; pos[i*6+1]=y; pos[i*6+2]=z;
    pos[i*6+3]=x+len; pos[i*6+4]=y; pos[i*6+5]=z;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  speedLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.06,
    blending: THREE.AdditiveBlending,
  }));
  speedLines.visible = false;
  scene.add(speedLines);
}

/* ═══════════════════════════════════════════
   SPEED GAUGE
═══════════════════════════════════════════ */
function initGauge() {
  gaugeCtx = document.getElementById('gaugeCanvas').getContext('2d');
}

function drawGauge(speed) {
  if (!gaugeCtx) return;
  const w=200,h=200,cx=100,cy=110,r=82;
  gaugeCtx.clearRect(0,0,w,h);

  // Track
  gaugeCtx.beginPath();
  gaugeCtx.arc(cx,cy,r, Math.PI*0.75, Math.PI*2.25);
  gaugeCtx.strokeStyle='rgba(255,255,255,0.07)';
  gaugeCtx.lineWidth=7; gaugeCtx.stroke();

  // Fill arc
  const pct   = speed / 320;
  const start = Math.PI*0.75;
  const end   = start + pct * Math.PI * 1.5;
  const g     = gaugeCtx.createLinearGradient(0,0,w,h);
  g.addColorStop(0,   '#c9a227');
  g.addColorStop(0.5, '#ff6600');
  g.addColorStop(1,   '#ff2200');

  gaugeCtx.beginPath();
  gaugeCtx.arc(cx,cy,r,start,end);
  gaugeCtx.strokeStyle   = g;
  gaugeCtx.lineWidth     = 7;
  gaugeCtx.lineCap       = 'round';
  gaugeCtx.shadowColor   = '#ff6600';
  gaugeCtx.shadowBlur    = 18;
  gaugeCtx.stroke();
  gaugeCtx.shadowBlur    = 0;

  // Ticks
  for (let i=0;i<=8;i++){
    const a = Math.PI*0.75 + (i/8)*Math.PI*1.5;
    gaugeCtx.beginPath();
    gaugeCtx.moveTo(cx+Math.cos(a)*(r-8), cy+Math.sin(a)*(r-8));
    gaugeCtx.lineTo(cx+Math.cos(a)*(r-20),cy+Math.sin(a)*(r-20));
    gaugeCtx.strokeStyle='rgba(255,255,255,0.25)';
    gaugeCtx.lineWidth=1.5; gaugeCtx.stroke();
  }
}

/* ═══════════════════════════════════════════
   SCROLL LOGIC
═══════════════════════════════════════════ */
const SECTION_SPEEDS = {
  hero: 0, engine: 280, aero: 310, wheels: 180,
  interior: 60, exhaust: 260, finale: 0
};

const scrollBarEl  = document.getElementById('scrollBar');
const navSpeedEl   = document.getElementById('navSpeed');
const speedOverlay = document.getElementById('speedOverlay');
const speedNumEl   = document.getElementById('speedNum');

function initScroll() {
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function onScroll() {
  const scrollTop  = window.scrollY;
  const docH       = document.body.scrollHeight - window.innerHeight;
  scrollBarEl.style.width = Math.min(scrollTop / docH * 100, 100) + '%';

  let active = 'hero';
  document.querySelectorAll('.section').forEach(sec => {
    const r = sec.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.55 && r.bottom > 0) active = sec.id;
  });

  if (active !== currentSection) {
    currentSection = active;
    camTarget   = { ...CAM[active] || CAM.hero };
    targetSpeed = SECTION_SPEEDS[active] || 0;

    // Speed lines visible when fast
    if (speedLines) speedLines.visible = targetSpeed > 100;
    // Gauge overlay
    if (targetSpeed > 0) speedOverlay.classList.add('visible');
    else                 speedOverlay.classList.remove('visible');

    // Nav active
    document.querySelectorAll('.nav-link').forEach(l =>
      l.classList.toggle('active', l.getAttribute('href') === '#' + active)
    );
  }
}

/* ═══════════════════════════════════════════
   INTERSECTION OBSERVER (content reveals)
═══════════════════════════════════════════ */
function initObserver() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('visible');
      e.target.querySelectorAll('.section-glow, .finale-sub, .finale-title, .finale-desc, .cta-btn')
        .forEach(el => el.classList.add('visible'));
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.component-content, .component-section, .finale-section')
    .forEach(el => obs.observe(el));
}

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
const lerp = (a, b, t) => a + (b - a) * t;
const lv3  = (a, b, t) => [lerp(a[0],b[0],t), lerp(a[1],b[1],t), lerp(a[2],b[2],t)];

/* ═══════════════════════════════════════════
   MAIN RENDER LOOP
═══════════════════════════════════════════ */
function startAnimate() {
  (function loop() {
    requestAnimationFrame(loop);
    const delta   = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    /* Speed */
    currentSpeed = lerp(currentSpeed, targetSpeed, 0.018);
    const spd    = Math.round(currentSpeed);
    speedNumEl.textContent = spd;
    navSpeedEl.textContent = spd + ' km/h';
    drawGauge(currentSpeed);
    const sf = currentSpeed / 310; // speed factor 0-1

    /* Camera */
    const T = 0.028;
    camCurrent.pos  = lv3(camCurrent.pos,  camTarget.pos,  T);
    camCurrent.look = lv3(camCurrent.look, camTarget.look, T);
    camCurrent.fov  = lerp(camCurrent.fov,  camTarget.fov,  T);
    camCurrent.rotY = lerp(camCurrent.rotY, camTarget.rotY, T);

    camera.position.set(
      camCurrent.pos[0] + mouseX * 0.6,
      camCurrent.pos[1] - mouseY * 0.3,
      camCurrent.pos[2]
    );
    camera.lookAt(camCurrent.look[0], camCurrent.look[1], camCurrent.look[2]);
    camera.fov = camCurrent.fov;
    camera.updateProjectionMatrix();

    /* Car idle float + rotation */
    if (carGroup) {
      carGroup.position.y  = Math.sin(elapsed * 1.0) * 0.04;
      carGroup.rotation.y  = camCurrent.rotY + mouseX * 0.07 + Math.sin(elapsed * 0.35) * 0.01;
    }

    /* Particles */
    if (particles) {
      if (sf > 0.1) {
        particles.visible = true;
        const pa = particles.geometry.attributes.position;
        const va = particles.geometry.attributes.aVelocity;
        for (let i = 0; i < pa.count; i++) {
          pa.array[i*3]   += va.array[i*3]   * sf * 3;
          pa.array[i*3+1] += va.array[i*3+1];
          pa.array[i*3+2] += va.array[i*3+2];
          if (pa.array[i*3] < -6) {
            pa.array[i*3]   = 6;
            pa.array[i*3+1] = Math.random() * 3;
            pa.array[i*3+2] = (Math.random()-0.5)*5;
          }
        }
        pa.needsUpdate = true;
        particles.material.opacity = sf * 0.6;
      } else {
        particles.visible = false;
      }
    }

    /* Speed lines */
    if (speedLines && speedLines.visible) {
      speedLines.position.x -= delta * sf * 18;
      if (speedLines.position.x < -25) speedLines.position.x = 0;
      speedLines.material.opacity = sf * 0.18;
    }

    renderer.render(scene, camera);
  })();
}

/* ═══════════════════════════════════════════
   NAVBAR SCROLL STYLE
═══════════════════════════════════════════ */
function initNavbar() {
  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 80);
  });
}

/* ═══════════════════════════════════════════
   CTA BUTTON
═══════════════════════════════════════════ */
document.getElementById('ctaBtn').addEventListener('click', () => {
  document.body.style.transition = 'filter 0.12s';
  document.body.style.filter = 'brightness(1.5)';
  setTimeout(() => { document.body.style.filter = 'brightness(1)'; }, 180);
  window.open('https://www.lamborghini.com/configurator', '_blank');
});

/* ═══════════════════════════════════════════
   BOOTSTRAP
═══════════════════════════════════════════ */
initThree();
buildParticles();
buildSpeedLines();
initGauge();
initScroll();
initNavbar();
initObserver();
loadCarModel();   // ← Loads the real GLB
