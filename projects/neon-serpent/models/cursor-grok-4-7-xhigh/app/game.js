(function () {
  "use strict";

  var THREE = window.THREE;
  var blurb = document.getElementById("blurb");
  var startBtn = document.getElementById("start");
  var veil = document.getElementById("veil");
  var scoreEl = document.getElementById("score");
  var lengthEl = document.getElementById("length");
  var canvas = document.getElementById("game");

  if (!THREE) {
    blurb.textContent = "The street could not load.";
    startBtn.hidden = true;
    return;
  }

  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var titleEl = document.getElementById("title");
  var tallyEl = document.getElementById("tally");
  var RADIUS = 0.55;
  var SPACING = 0.46;
  var CAP = 480;
  var SPEED = 7.2;
  var TURN = 2.05;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  if (renderer.outputColorSpace !== undefined && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  renderer.setClearColor(0x12081c, 1);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x12081c);
  scene.fog = new THREE.Fog(0x12081c, 24, 96);

  var camera = new THREE.PerspectiveCamera(60, 1, 0.12, 180);
  scene.add(camera);

  scene.add(new THREE.AmbientLight(0xc0a0d0, 1.05));
  scene.add(new THREE.HemisphereLight(0xff88c4, 0x1a0a16, 0.55));
  var sun = new THREE.DirectionalLight(0xffe2c4, 1.15);
  sun.position.set(-30, 48, 12);
  scene.add(sun);

  var spot = new THREE.SpotLight(0xffd2a0, 28, 36, 0.62, 0.5, 1.1);
  spot.position.set(0, 2, 0);
  scene.add(spot);
  scene.add(spot.target);

  var windows = makeWindows();
  var wallMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: windows,
  });
  var trimPink = new THREE.MeshBasicMaterial({ color: 0xff2d87 });
  var trimAmber = new THREE.MeshBasicMaterial({ color: 0xffb020 });

  var buildings = [];

  function addBlock(x, z, w, d, height, pink, decor) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), wallMat);
    mesh.position.set(x + w / 2, height / 2, z + d / 2);
    scene.add(mesh);
    var trim = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.15, 0.28, d + 0.15),
      pink ? trimPink : trimAmber,
    );
    trim.position.set(x + w / 2, height + 0.08, z + d / 2);
    scene.add(trim);
    if (decor && height > 14) {
      var capH = height * 0.28;
      var cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, capH, d * 0.62), wallMat);
      cap.position.set(x + w / 2, height + capH / 2, z + d / 2);
      scene.add(cap);
    }
    if (decor) addSign(x, z, w, d, height, pink);
    buildings.push({ x: x, z: z, w: w, d: d });
  }

  function addSign(x, z, w, d, height, pink) {
    var tex = signTexture(pink, x, z);
    var sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 4.6),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
    );
    var cx = x + w / 2;
    var cz = z + d / 2;
    if (Math.abs(cx) >= Math.abs(cz)) {
      var face = cx > 0 ? -1 : 1;
      sign.position.set(cx + face * (w / 2 + 0.08), Math.max(3.2, height * 0.45), cz);
      sign.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      var faceZ = cz > 0 ? -1 : 1;
      sign.position.set(cx, Math.max(3.2, height * 0.45), cz + faceZ * (d / 2 + 0.08));
      sign.rotation.y = faceZ > 0 ? 0 : Math.PI;
    }
    scene.add(sign);
  }

  var bands = [
    [-46, 11],
    [-22, 12],
    [10, 12],
    [35, 11],
  ];
  var index = 0;
  var ix;
  var iz;
  for (iz = 0; iz < bands.length; iz += 1) {
    for (ix = 0; ix < bands.length; ix += 1) {
      addBlock(
        bands[ix][0],
        bands[iz][0],
        bands[ix][1],
        bands[iz][1],
        10 + ((index * 17) % 28),
        index % 2 === 0,
        true,
      );
      index += 1;
    }
  }

  addBlock(-48, -48, 96, 2.2, 8, true);
  addBlock(-48, 45.8, 96, 2.2, 8, false);
  addBlock(-48, -48, 2.2, 96, 8, true);
  addBlock(45.8, -48, 2.2, 96, 8, false);

  function addLantern(x, z) {
    var pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 3.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2430, roughness: 0.6 }),
    );
    pole.position.set(x, 1.6, z);
    var glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffb020 }),
    );
    glow.position.set(x, 3.35, z);
    scene.add(pole, glow);
  }

  function addTorii(x, z, acrossX) {
    var postMat = new THREE.MeshStandardMaterial({
      color: 0x6e1430,
      emissive: 0xff2d55,
      emissiveIntensity: 0.45,
      roughness: 0.45,
    });
    var postGeo = new THREE.BoxGeometry(1.15, 7.2, 1.15);
    var left = new THREE.Mesh(postGeo, postMat);
    var right = new THREE.Mesh(postGeo, postMat);
    var beam;
    var beam2;
    if (acrossX) {
      left.position.set(x - 5.4, 3.7, z);
      right.position.set(x + 5.4, 3.7, z);
      beam = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.7, 1.25), trimPink);
      beam2 = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.32, 0.85), trimAmber);
      buildings.push({ x: x - 6, z: z - 0.65, w: 1.3, d: 1.3 });
      buildings.push({ x: x + 4.8, z: z - 0.65, w: 1.3, d: 1.3 });
    } else {
      left.position.set(x, 3.7, z - 5.4);
      right.position.set(x, 3.7, z + 5.4);
      beam = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.7, 13.2), trimPink);
      beam2 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.32, 11.2), trimAmber);
      buildings.push({ x: x - 0.65, z: z - 6, w: 1.3, d: 1.3 });
      buildings.push({ x: x - 0.65, z: z + 4.8, w: 1.3, d: 1.3 });
    }
    beam.position.set(x, 7.35, z);
    beam2.position.set(x, 6.55, z);
    scene.add(left, right, beam, beam2);
  }

  addTorii(28, 0, false);
  addTorii(0, 26, true);
  addLantern(-28, 8);
  addLantern(16, -8);
  addLantern(-8, -28);
  addLantern(8, 18);

  var ground = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({ color: 0x140816, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  var grid = new THREE.GridHelper(100, 25, 0xff2d87, 0x3a1848);
  grid.position.y = 0.03;
  var gridMats = Array.isArray(grid.material) ? grid.material : [grid.material];
  for (ix = 0; ix < gridMats.length; ix += 1) {
    gridMats[ix].transparent = true;
    gridMats[ix].opacity = 0.28;
  }
  scene.add(grid);

  var laneMat = new THREE.MeshBasicMaterial({ color: 0xff2d87, transparent: true, opacity: 0.28 });
  var laneX = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 92), laneMat);
  laneX.rotation.x = -Math.PI / 2;
  laneX.position.y = 0.045;
  var laneZ = new THREE.Mesh(new THREE.PlaneGeometry(92, 0.18), laneMat);
  laneZ.rotation.x = -Math.PI / 2;
  laneZ.position.y = 0.045;
  scene.add(laneX, laneZ);

  var snakeGeo = new THREE.SphereGeometry(0.32, 10, 8);
  var snakeMat = new THREE.MeshStandardMaterial({
    color: 0xffb020,
    emissive: 0xff6a00,
    emissiveIntensity: 0.85,
    roughness: 0.32,
  });
  var snake = new THREE.InstancedMesh(snakeGeo, snakeMat, CAP);
  snake.frustumCulled = false;
  snake.count = 0;
  scene.add(snake);
  var dummy = new THREE.Object3D();
  var headMesh = new THREE.Group();
  var skull = new THREE.Mesh(new THREE.SphereGeometry(0.58, 14, 12), snakeMat);
  var visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.16, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x7ef0ff }),
  );
  visor.position.set(0.42, 0.08, 0);
  headMesh.add(skull, visor);
  scene.add(headMesh);

  var orbGeo = new THREE.SphereGeometry(0.42, 14, 10);
  var orbMat = new THREE.MeshBasicMaterial({ color: 0x3dffe8 });
  var orbs = [];
  for (ix = 0; ix < 7; ix += 1) {
    var orb = new THREE.Mesh(orbGeo, orbMat);
    scene.add(orb);
    orbs.push({ mesh: orb, phase: ix * 0.8 });
  }

  var hx = new Float32Array(CAP);
  var hz = new Float32Array(CAP);
  var head = 0;
  var filled = 0;
  var kept = 16;
  var pos = { x: 0, z: 0 };
  var yaw = 0;
  var travel = 0;
  var score = 0;
  var state = "ready";
  var keys = new Set();

  function pushPoint(x, z) {
    head = (head + 1) % CAP;
    hx[head] = x;
    hz[head] = z;
    if (filled < CAP) filled += 1;
  }

  function hitsBuilding(x, z, r) {
    var r2 = r * r;
    for (var i = 0; i < buildings.length; i += 1) {
      var b = buildings[i];
      var cx = x < b.x ? b.x : x > b.x + b.w ? b.x + b.w : x;
      var cz = z < b.z ? b.z : z > b.z + b.d ? b.z + b.d : z;
      var dx = x - cx;
      var dz = z - cz;
      if (dx * dx + dz * dz < r2) return true;
    }
    return false;
  }

  function hitsSelf(x, z) {
    var n = kept < filled ? kept : filled;
    for (var i = 8; i < n; i += 1) {
      var idx = (head - i + CAP) % CAP;
      var dx = x - hx[idx];
      var dz = z - hz[idx];
      if (dx * dx + dz * dz < 0.8) return true;
    }
    return false;
  }

  function placeOrb(orb, away) {
    var n;
    var x;
    var z;
    var dx;
    var dz;
    for (n = 0; n < 80; n += 1) {
      x = Math.random() * 78 - 39;
      z = Math.random() * 78 - 39;
      dx = x - pos.x;
      dz = z - pos.z;
      if (away && dx * dx + dz * dz < 49) continue;
      if (!hitsBuilding(x, z, 1.15)) {
        orb.mesh.position.set(x, 0.9, z);
        return;
      }
    }
    orb.mesh.position.set(0, 0.9, -8);
  }

  function seed() {
    head = 0;
    filled = 0;
    kept = 10;
    score = 0;
    pos.x = 0;
    pos.z = 0;
    yaw = 0;
    travel = 0;
    var i;
    for (i = kept - 1; i >= 0; i -= 1) pushPoint(-i * SPACING, 0);
    orbs[0].mesh.position.set(8, 0.9, 0);
    for (i = 1; i < orbs.length; i += 1) placeOrb(orbs[i], true);
    paintHud();
  }

  function paintHud() {
    scoreEl.textContent = "Score " + score;
    lengthEl.textContent = "Length " + kept;
  }

  var audio = null;

  function setupAudio() {
    if (audio) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    var ctx = new Ctx();
    var master = ctx.createGain();
    master.gain.value = 0.45;
    master.connect(ctx.destination);

    var bed = ctx.createOscillator();
    bed.type = "sine";
    bed.frequency.value = 55;
    var bedGain = ctx.createGain();
    bedGain.gain.value = 0.04;
    bed.connect(bedGain).connect(master);
    bed.start();

    var fifth = ctx.createOscillator();
    fifth.type = "triangle";
    fifth.frequency.value = 82;
    var fifthGain = ctx.createGain();
    fifthGain.gain.value = 0.018;
    fifth.connect(fifthGain).connect(master);
    fifth.start();

    var count = ctx.sampleRate * 2;
    var buffer = ctx.createBuffer(1, count, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < count; i += 1) data[i] = Math.random() * 2 - 1;
    var noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    var filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 900;
    var noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.015;
    noise.connect(filter).connect(noiseGain).connect(master);
    noise.start();

    audio = { ctx: ctx, master: master };
  }

  function tone(freq, dur, type, gain) {
    if (!audio) return;
    var ctx = audio.ctx;
    var osc = ctx.createOscillator();
    var amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 1.8), ctx.currentTime + dur);
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(amp).connect(audio.master);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  function crash() {
    if (!audio) return;
    var ctx = audio.ctx;
    var count = Math.floor(ctx.sampleRate * 0.28);
    var buffer = ctx.createBuffer(1, count, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < count; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / count);
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    var amp = ctx.createGain();
    amp.gain.value = 0.22;
    src.connect(amp).connect(audio.master);
    src.start();
  }

  function begin() {
    setupAudio();
    if (audio && audio.ctx.state === "suspended") audio.ctx.resume();
    if (state === "dead") seed();
    state = "run";
    veil.hidden = true;
    if (canvas.requestPointerLock) canvas.requestPointerLock();
  }

  function die(reason) {
    if (state !== "run") return;
    state = "dead";
    crash();
    if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock();
    titleEl.textContent = "Run over";
    blurb.textContent = reason;
    tallyEl.textContent = "Score " + score + ". Length " + kept + ".";
    startBtn.textContent = "Run again";
    veil.hidden = false;
  }

  function advance(dt) {
    if (keys.has("a") || keys.has("arrowleft") || keys.has("left")) yaw -= TURN * dt;
    if (keys.has("d") || keys.has("arrowright") || keys.has("right")) yaw += TURN * dt;
    var cos = Math.cos(yaw);
    var sin = Math.sin(yaw);
    var nx = pos.x + cos * SPEED * dt;
    var nz = pos.z + sin * SPEED * dt;
    if (hitsBuilding(nx, nz, RADIUS)) {
      die("You hit a building.");
      return;
    }
    if (hitsSelf(nx, nz)) {
      die("You ran into your own trail.");
      return;
    }
    pos.x = nx;
    pos.z = nz;
    travel += SPEED * dt;
    while (travel >= SPACING) {
      travel -= SPACING;
      pushPoint(pos.x, pos.z);
    }
    var reach = 1.25 * 1.25;
    for (var i = 0; i < orbs.length; i += 1) {
      var orb = orbs[i];
      var dx = orb.mesh.position.x - pos.x;
      var dz = orb.mesh.position.z - pos.z;
      if (dx * dx + dz * dz < reach) {
        score += 1;
        if (kept < CAP - 1) kept += 6;
        paintHud();
        tone(520, 0.16, "square", 0.05);
        placeOrb(orb, true);
      }
    }
  }

  function renderSnake() {
    var n = kept < filled ? kept : filled;
    var draw = 0;
    var i;
    headMesh.position.set(pos.x, 0.62, pos.z);
    headMesh.rotation.y = -yaw;
    for (i = 1; i < n; i += 1) {
      var idx = (head - i + CAP) % CAP;
      dummy.position.set(hx[idx], 0.5, hz[idx]);
      var scale = 0.95 - (i / n) * 0.4;
      if (scale < 0.5) scale = 0.5;
      dummy.scale.setScalar(scale);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      snake.setMatrixAt(draw, dummy.matrix);
      draw += 1;
    }
    snake.count = draw;
    snake.instanceMatrix.needsUpdate = true;
  }

  var map = document.getElementById("map");
  var mapCtx = map.getContext("2d");
  var mapDpr = Math.min(window.devicePixelRatio || 1, 2);
  map.width = Math.floor(148 * mapDpr);
  map.height = Math.floor(148 * mapDpr);
  mapCtx.scale(mapDpr, mapDpr);

  function drawMap() {
    mapCtx.clearRect(0, 0, 148, 148);
    mapCtx.fillStyle = "rgba(10, 6, 16, 0.2)";
    mapCtx.fillRect(0, 0, 148, 148);
    mapCtx.fillStyle = "#4a2458";
    var i;
    for (i = 0; i < buildings.length; i += 1) {
      var b = buildings[i];
      mapCtx.fillRect(worldToMap(b.x), worldToMap(b.z), b.w * 1.48, b.d * 1.48);
    }
    mapCtx.fillStyle = "#3dffe8";
    for (i = 0; i < orbs.length; i += 1) {
      mapCtx.fillRect(
        worldToMap(orbs[i].mesh.position.x) - 1.5,
        worldToMap(orbs[i].mesh.position.z) - 1.5,
        3,
        3,
      );
    }
    var n = kept < filled ? kept : filled;
    mapCtx.beginPath();
    mapCtx.strokeStyle = "#ffb020";
    mapCtx.lineWidth = 2;
    for (i = n - 1; i >= 0; i -= 1) {
      var idx = (head - i + CAP) % CAP;
      var mx = worldToMap(hx[idx]);
      var mz = worldToMap(hz[idx]);
      if (i === n - 1) mapCtx.moveTo(mx, mz);
      else mapCtx.lineTo(mx, mz);
    }
    mapCtx.stroke();
    mapCtx.fillStyle = "#fff6ea";
    mapCtx.beginPath();
    mapCtx.arc(worldToMap(pos.x), worldToMap(pos.z), 2.4, 0, Math.PI * 2);
    mapCtx.fill();
  }

  function worldToMap(v) {
    return ((v + 50) / 100) * 148;
  }

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (h < 1) h = 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);
  resize();
  seed();

  startBtn.addEventListener("click", begin);
  canvas.addEventListener("click", function () {
    if (state !== "run") begin();
    else if (canvas.requestPointerLock) canvas.requestPointerLock();
  });

  window.addEventListener("keydown", function (event) {
    var key = event.key.toLowerCase();
    if (key === "arrowleft" || key === "arrowright" || key === " ") event.preventDefault();
    keys.add(key);
    if ((key === "a" || key === "d" || key === "arrowleft" || key === "arrowright") && state === "ready") {
      begin();
    }
    if (key === "r" && state === "dead") begin();
  });
  window.addEventListener("keyup", function (event) {
    keys.delete(event.key.toLowerCase());
  });
  window.addEventListener("blur", function () {
    keys.clear();
  });
  window.addEventListener("mousemove", function (event) {
    if (document.pointerLockElement !== canvas || state !== "run") return;
    yaw -= event.movementX * 0.0022;
  });

  function hold(id, name) {
    var el = document.getElementById(id);
    el.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      keys.add(name);
      if (state !== "run") begin();
    });
    function release() {
      keys.delete(name);
    }
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("pointerleave", release);
  }
  hold("left", "left");
  hold("right", "right");

  var last = performance.now();

  function frame(now) {
    var dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    if (state === "run") {
      var steps = Math.ceil(dt / 0.016);
      if (steps < 1) steps = 1;
      if (steps > 5) steps = 5;
      var h = dt / steps;
      for (var s = 0; s < steps; s += 1) {
        if (state !== "run") break;
        advance(h);
      }
    }

    var cos = Math.cos(yaw);
    var sin = Math.sin(yaw);
    var bob = !REDUCE && state === "run" ? Math.sin(now * 0.012) * 0.04 : 0;
    var bodyCount = kept < filled ? kept : filled;
    var back = bodyCount * SPACING + 6.5;
    if (back > 16) back = 16;
    camera.position.set(pos.x - cos * back, 5.6 + bob, pos.z - sin * back);
    camera.lookAt(pos.x + cos * 3.5, 0.7, pos.z + sin * 3.5);
    spot.position.set(pos.x + cos * 0.2, 1.45, pos.z + sin * 0.2);
    spot.target.position.set(pos.x + cos * 14, 0.35, pos.z + sin * 14);

    var t = now * 0.002;
    for (var i = 0; i < orbs.length; i += 1) {
      var orb = orbs[i];
      orb.mesh.position.y = 0.9 + Math.sin(t + orb.phase) * (REDUCE ? 0 : 0.16);
    }

    renderSnake();
    drawMap();
    renderer.render(scene, camera);
    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);

  function signTexture(pink, x, z) {
    var c = document.createElement("canvas");
    c.width = 64;
    c.height = 128;
    var g = c.getContext("2d");
    var ink = pink ? "#ff2d87" : "#ffb020";
    g.fillStyle = "#140810";
    g.fillRect(0, 0, 64, 128);
    g.strokeStyle = ink;
    g.lineWidth = 4;
    g.strokeRect(5, 5, 54, 118);
    g.beginPath();
    g.arc(32, 36, 14, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = ink;
    var shift = Math.abs(Math.round(x + z)) % 3;
    g.fillRect(16, 64 + shift * 4, 32, 5);
    g.fillRect(20, 78 + shift * 3, 24, 5);
    g.fillRect(24, 92, 16, 5);
    var tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeWindows() {
    var c = document.createElement("canvas");
    c.width = 64;
    c.height = 96;
    var g = c.getContext("2d");
    g.fillStyle = "#2a1438";
    g.fillRect(0, 0, 64, 96);
    var colors = ["#ff2d87", "#ffb020", "#3dffe8", "#ff5d92"];
    var y;
    var x;
    for (y = 6; y < 96; y += 14) {
      for (x = 5; x < 64; x += 12) {
        if ((x + y) % 5 === 0) continue;
        g.globalAlpha = 0.85;
        g.fillStyle = colors[(x + y) % colors.length];
        g.fillRect(x, y, 7, 9);
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
})();
