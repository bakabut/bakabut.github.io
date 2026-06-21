(function () {
  const els = {
    preset: document.getElementById("presetSelect"),
    sampleCount: document.getElementById("sampleCount"),
    sampleCountLabel: document.getElementById("sampleCountLabel"),
    seed: document.getElementById("seedInput"),
    noiseSlider: document.getElementById("noiseSlider"),
    noiseLabel: document.getElementById("noiseLabel"),
    pointSlider: document.getElementById("pointSlider"),
    noiseBack: document.getElementById("noiseBack"),
    noisePlay: document.getElementById("noisePlay"),
    noiseForward: document.getElementById("noiseForward"),
    reverseSlider: document.getElementById("reverseSlider"),
    reverseLabel: document.getElementById("reverseLabel"),
    quality: document.getElementById("qualitySelect"),
    reverseBack: document.getElementById("reverseBack"),
    reversePlay: document.getElementById("reversePlay"),
    reverseForward: document.getElementById("reverseForward"),
    signalValue: document.getElementById("signalValue"),
    noiseValue: document.getElementById("noiseValue"),
    predictionValue: document.getElementById("predictionValue"),
    forwardCanvasLabel: document.getElementById("forwardCanvasLabel"),
    reverseCanvasLabel: document.getElementById("reverseCanvasLabel"),
    forwardCanvas: document.getElementById("forwardCanvas"),
    scheduleCanvas: document.getElementById("scheduleCanvas"),
    reverseCanvas: document.getElementById("reverseCanvas"),
    scoreCanvas: document.getElementById("scoreCanvas")
  };

  const state = {
    points: [],
    eps: [],
    particles: [],
    paths: [],
    noiseTimer: null,
    reverseTimer: null,
    reverseSteps: 40
  };

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function next() {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randn(rand) {
    const u = Math.max(rand(), 1e-9);
    const v = Math.max(rand(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function schedule(t) {
    const s = 0.008;
    const f0 = Math.cos((s / (1 + s)) * Math.PI * 0.5) ** 2;
    const f = Math.cos(((t + s) / (1 + s)) * Math.PI * 0.5) ** 2;
    const alpha = clamp(f / f0, 0.0001, 1);
    return {
      alpha,
      signal: Math.sqrt(alpha),
      sigma: Math.sqrt(1 - alpha)
    };
  }

  function modelPoint(preset, i, n, rand) {
    if (preset === "ring") {
      const a = (i / n) * Math.PI * 2 + randn(rand) * 0.035;
      const r = 0.58 + randn(rand) * 0.045;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    }

    if (preset === "moons") {
      const top = i % 2 === 0;
      const a = rand() * Math.PI;
      const jitter = 0.035;
      if (top) {
        return {
          x: Math.cos(a) * 0.48 - 0.18 + randn(rand) * jitter,
          y: Math.sin(a) * 0.38 + 0.03 + randn(rand) * jitter
        };
      }
      return {
        x: 0.36 - Math.cos(a) * 0.48 + randn(rand) * jitter,
        y: -Math.sin(a) * 0.38 - 0.12 + randn(rand) * jitter
      };
    }

    if (preset === "bars") {
      const bar = i % 3;
      const x = [-0.48, 0, 0.48][bar] + randn(rand) * 0.035;
      const y = (rand() - 0.5) * 1.15 + randn(rand) * 0.025;
      return { x, y };
    }

    const centers = [
      { x: -0.48, y: -0.28 },
      { x: 0.46, y: -0.2 },
      { x: 0.02, y: 0.48 }
    ];
    const c = centers[i % centers.length];
    return {
      x: c.x + randn(rand) * 0.105,
      y: c.y + randn(rand) * 0.105
    };
  }

  function noisyPoint(point, eps, t) {
    const s = schedule(t);
    return {
      x: s.signal * point.x + s.sigma * eps.x,
      y: s.signal * point.y + s.sigma * eps.y
    };
  }

  function posteriorMean(x, t, quality) {
    const s = schedule(t);
    const variance = Math.max(s.sigma * s.sigma, 0.018);
    let total = 0;
    let mx = 0;
    let my = 0;
    const stride = Math.max(1, Math.floor(state.points.length / 180));

    for (let i = 0; i < state.points.length; i += stride) {
      const p = state.points[i];
      const cx = s.signal * p.x;
      const cy = s.signal * p.y;
      const dx = x.x - cx;
      const dy = x.y - cy;
      let w = Math.exp(-(dx * dx + dy * dy) / (2 * variance));
      if (quality === "biased" && p.x < -0.1) {
        w *= 0.28;
      }
      total += w;
      mx += w * p.x;
      my += w * p.y;
    }

    if (total < 1e-12) {
      return { x: 0, y: 0, confidence: 0 };
    }

    const blur = quality === "blurry" ? 0.62 : 1;
    return {
      x: (mx / total) * blur,
      y: (my / total) * blur,
      confidence: clamp(total / 8, 0, 1)
    };
  }

  function scoreAt(x, t) {
    const s = schedule(t);
    const variance = Math.max(s.sigma * s.sigma, 0.025);
    let total = 0;
    let gx = 0;
    let gy = 0;
    const stride = Math.max(1, Math.floor(state.points.length / 150));

    for (let i = 0; i < state.points.length; i += stride) {
      const p = state.points[i];
      const cx = s.signal * p.x;
      const cy = s.signal * p.y;
      const dx = cx - x.x;
      const dy = cy - x.y;
      const w = Math.exp(-(dx * dx + dy * dy) / (2 * variance));
      total += w;
      gx += w * dx / variance;
      gy += w * dy / variance;
    }

    if (total < 1e-12) {
      return { x: -x.x * 0.25, y: -x.y * 0.25, magnitude: 0 };
    }

    gx /= total;
    gy /= total;
    const mag = Math.hypot(gx, gy);
    const cap = 4.5;
    if (mag > cap) {
      gx *= cap / mag;
      gy *= cap / mag;
    }
    return { x: gx, y: gy, magnitude: Math.min(mag, cap) };
  }

  function regenerate() {
    const n = Number(els.sampleCount.value);
    const seed = Number(els.seed.value) || 1;
    const rand = mulberry32(seed);
    const particleRand = mulberry32(seed * 17 + 11);
    state.points = [];
    state.eps = [];
    state.particles = [];

    for (let i = 0; i < n; i += 1) {
      state.points.push(modelPoint(els.preset.value, i, n, rand));
      state.eps.push({ x: randn(rand), y: randn(rand) });
    }

    const particleCount = Math.min(180, Math.max(90, Math.round(n * 0.65)));
    for (let i = 0; i < particleCount; i += 1) {
      state.particles.push({
        x: randn(particleRand) * 0.8,
        y: randn(particleRand) * 0.8
      });
    }

    els.pointSlider.max = String(n - 1);
    els.pointSlider.value = String(Math.min(Number(els.pointSlider.value), n - 1));
    els.sampleCountLabel.textContent = `${n} samples`;
    buildReversePaths();
    render();
  }

  function buildReversePaths() {
    state.paths = state.particles.map((start) => {
      const path = [{ x: start.x, y: start.y }];
      let current = { x: start.x, y: start.y };
      for (let step = 1; step <= state.reverseSteps; step += 1) {
        const t = clamp(1 - (step - 1) / state.reverseSteps, 0.02, 0.98);
        const tNext = clamp(1 - step / state.reverseSteps, 0.0, 0.98);
        const s = schedule(t);
        const next = schedule(tNext);
        const mean = posteriorMean(current, t, els.quality.value);
        const predictedNoise = {
          x: (current.x - s.signal * mean.x) / Math.max(s.sigma, 0.02),
          y: (current.y - s.signal * mean.y) / Math.max(s.sigma, 0.02)
        };
        const correction = els.quality.value === "blurry" ? 0.82 : 0.96;
        current = {
          x: next.signal * mean.x + next.sigma * predictedNoise.x * correction,
          y: next.signal * mean.y + next.sigma * predictedNoise.y * correction
        };
        current.x = clamp(current.x, -1.3, 1.3);
        current.y = clamp(current.y, -1.3, 1.3);
        path.push({ x: current.x, y: current.y });
      }
      return path;
    });
  }

  function fitCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.round(rect.width));
    const height = Math.max(300, Math.round(rect.width * 0.68));
    canvas.style.height = `${height}px`;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height };
  }

  function worldToScreen(p, width, height) {
    const scale = Math.min(width, height) * 0.39;
    return {
      x: width * 0.5 + p.x * scale,
      y: height * 0.5 - p.y * scale
    };
  }

  function clear(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fbfcf9";
    ctx.fillRect(0, 0, width, height);
  }

  function drawAxes(ctx, width, height) {
    ctx.strokeStyle = "#d7ded8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(18, height / 2);
    ctx.lineTo(width - 18, height / 2);
    ctx.moveTo(width / 2, 18);
    ctx.lineTo(width / 2, height - 18);
    ctx.stroke();
  }

  function drawPoint(ctx, x, y, radius, fill, stroke) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawForward() {
    const { ctx, width, height } = fitCanvas(els.forwardCanvas);
    const t = Number(els.noiseSlider.value) / 100;
    clear(ctx, width, height);
    drawAxes(ctx, width, height);

    for (let i = 0; i < state.points.length; i += 1) {
      const clean = worldToScreen(state.points[i], width, height);
      drawPoint(ctx, clean.x, clean.y, 2.2, "rgba(8, 127, 115, 0.20)");
    }

    for (let i = 0; i < state.points.length; i += 1) {
      const noisy = worldToScreen(noisyPoint(state.points[i], state.eps[i], t), width, height);
      drawPoint(ctx, noisy.x, noisy.y, 2.6, "rgba(185, 79, 47, 0.58)");
    }

    const idx = Number(els.pointSlider.value);
    const clean = worldToScreen(state.points[idx], width, height);
    const noisy = worldToScreen(noisyPoint(state.points[idx], state.eps[idx], t), width, height);
    ctx.strokeStyle = "rgba(53, 89, 168, 0.72)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(clean.x, clean.y);
    ctx.lineTo(noisy.x, noisy.y);
    ctx.stroke();
    ctx.setLineDash([]);
    drawPoint(ctx, clean.x, clean.y, 6, "#087f73", "#ffffff");
    drawPoint(ctx, noisy.x, noisy.y, 7, "#b94f2f", "#ffffff");

    ctx.fillStyle = "#17201c";
    ctx.font = "700 13px Inter, sans-serif";
    ctx.fillText("clean x0", clean.x + 10, clean.y - 10);
    ctx.fillText("noisy xt", noisy.x + 10, noisy.y + 18);
  }

  function drawSchedule() {
    const { ctx, width, height } = fitCanvas(els.scheduleCanvas);
    clear(ctx, width, height);
    const pad = { left: 46, right: 18, top: 28, bottom: 44 };
    const w = width - pad.left - pad.right;
    const h = height - pad.top - pad.bottom;

    ctx.strokeStyle = "#d7ded8";
    ctx.lineWidth = 1;
    ctx.strokeRect(pad.left, pad.top, w, h);

    function plot(getY, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 120; i += 1) {
        const t = i / 120;
        const x = pad.left + t * w;
        const y = pad.top + (1 - getY(t)) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    plot((t) => schedule(t).signal, "#087f73");
    plot((t) => schedule(t).sigma, "#b94f2f");

    const t = Number(els.noiseSlider.value) / 100;
    const x = pad.left + t * w;
    ctx.strokeStyle = "#3559a8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + h);
    ctx.stroke();

    ctx.fillStyle = "#17201c";
    ctx.font = "800 13px Inter, sans-serif";
    ctx.fillText("signal kept", pad.left + 12, pad.top + 22);
    ctx.fillText("noise added", pad.left + 12, pad.top + 44);
    ctx.fillStyle = "#087f73";
    ctx.fillRect(pad.left, pad.top + 14, 8, 8);
    ctx.fillStyle = "#b94f2f";
    ctx.fillRect(pad.left, pad.top + 36, 8, 8);

    ctx.fillStyle = "#65716a";
    ctx.font = "700 12px Inter, sans-serif";
    ctx.fillText("t = 0", pad.left, height - 16);
    ctx.fillText("t = 1", width - pad.right - 34, height - 16);
  }

  function drawReverse() {
    const { ctx, width, height } = fitCanvas(els.reverseCanvas);
    const step = Number(els.reverseSlider.value);
    clear(ctx, width, height);
    drawAxes(ctx, width, height);

    for (let i = 0; i < state.points.length; i += 1) {
      const p = worldToScreen(state.points[i], width, height);
      drawPoint(ctx, p.x, p.y, 2.1, "rgba(8, 127, 115, 0.16)");
    }

    const trailStride = Math.max(1, Math.floor(state.paths.length / 34));
    for (let i = 0; i < state.paths.length; i += trailStride) {
      const path = state.paths[i];
      ctx.strokeStyle = "rgba(53, 89, 168, 0.22)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let s = 0; s <= step; s += 1) {
        const p = worldToScreen(path[s], width, height);
        if (s === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    for (let i = 0; i < state.paths.length; i += 1) {
      const p = worldToScreen(state.paths[i][step], width, height);
      const color = step < state.reverseSteps * 0.45 ? "rgba(185, 79, 47, 0.62)" : "rgba(53, 89, 168, 0.68)";
      drawPoint(ctx, p.x, p.y, 2.9, color);
    }
  }

  function drawArrow(ctx, from, vec, width, height) {
    const a = worldToScreen(from, width, height);
    const scale = Math.min(width, height) * 0.028;
    const len = Math.hypot(vec.x, vec.y);
    if (len < 0.03) return;
    const vx = (vec.x / len) * Math.min(18, len * scale);
    const vy = -(vec.y / len) * Math.min(18, len * scale);
    const ex = a.x + vx;
    const ey = a.y + vy;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    const angle = Math.atan2(ey - a.y, ex - a.x);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - Math.cos(angle - 0.55) * 5, ey - Math.sin(angle - 0.55) * 5);
    ctx.lineTo(ex - Math.cos(angle + 0.55) * 5, ey - Math.sin(angle + 0.55) * 5);
    ctx.closePath();
    ctx.fill();
  }

  function drawScore() {
    const { ctx, width, height } = fitCanvas(els.scoreCanvas);
    const t = clamp(Number(els.noiseSlider.value) / 100, 0.05, 0.95);
    clear(ctx, width, height);
    drawAxes(ctx, width, height);

    for (let i = 0; i < state.points.length; i += 2) {
      const p = worldToScreen(noisyPoint(state.points[i], state.eps[i], t), width, height);
      drawPoint(ctx, p.x, p.y, 2.1, "rgba(185, 79, 47, 0.20)");
    }

    ctx.strokeStyle = "rgba(8, 127, 115, 0.68)";
    ctx.fillStyle = "rgba(8, 127, 115, 0.82)";
    ctx.lineWidth = 1.5;
    for (let gx = -0.95; gx <= 0.951; gx += 0.19) {
      for (let gy = -0.75; gy <= 0.751; gy += 0.19) {
        drawArrow(ctx, { x: gx, y: gy }, scoreAt({ x: gx, y: gy }, t), width, height);
      }
    }

    const idx = Number(els.pointSlider.value);
    const n = noisyPoint(state.points[idx], state.eps[idx], t);
    const mean = posteriorMean(n, t, els.quality.value);
    const nScreen = worldToScreen(n, width, height);
    const mScreen = worldToScreen(mean, width, height);
    ctx.strokeStyle = "rgba(53, 89, 168, 0.72)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(nScreen.x, nScreen.y);
    ctx.lineTo(mScreen.x, mScreen.y);
    ctx.stroke();
    drawPoint(ctx, nScreen.x, nScreen.y, 6, "#b94f2f", "#fff");
    drawPoint(ctx, mScreen.x, mScreen.y, 6, "#3559a8", "#fff");
  }

  function updateLabels() {
    const t = Number(els.noiseSlider.value) / 100;
    const s = schedule(t);
    const step = Number(els.reverseSlider.value);
    const idx = Number(els.pointSlider.value);
    const n = noisyPoint(state.points[idx], state.eps[idx], t);
    const mean = posteriorMean(n, t, els.quality.value);
    const clean = state.points[idx];
    const err = Math.hypot(mean.x - clean.x, mean.y - clean.y);

    els.noiseLabel.textContent = `t = ${t.toFixed(2)}`;
    els.forwardCanvasLabel.textContent = `t = ${t.toFixed(2)}`;
    els.signalValue.textContent = `${Math.round(s.signal * 100)}%`;
    els.noiseValue.textContent = `${Math.round(s.sigma * 100)}%`;
    els.predictionValue.textContent = err.toFixed(2);
    els.reverseLabel.textContent = `step ${step} / ${state.reverseSteps}`;
    els.reverseCanvasLabel.textContent = step === 0 ? "pure noise" : `${Math.round((step / state.reverseSteps) * 100)}% denoised`;
  }

  function render() {
    updateLabels();
    drawForward();
    drawSchedule();
    drawReverse();
    drawScore();
  }

  function stepSlider(slider, delta) {
    const min = Number(slider.min);
    const max = Number(slider.max);
    slider.value = String(clamp(Number(slider.value) + delta, min, max));
  }

  function toggleNoisePlay() {
    if (state.noiseTimer) {
      clearInterval(state.noiseTimer);
      state.noiseTimer = null;
      els.noisePlay.classList.remove("playing");
      els.noisePlay.textContent = "\u25b6";
      return;
    }
    els.noisePlay.classList.add("playing");
    els.noisePlay.textContent = "||";
    state.noiseTimer = setInterval(() => {
      const next = Number(els.noiseSlider.value) >= 100 ? 0 : Number(els.noiseSlider.value) + 1;
      els.noiseSlider.value = String(next);
      render();
    }, 34);
  }

  function toggleReversePlay() {
    if (state.reverseTimer) {
      clearInterval(state.reverseTimer);
      state.reverseTimer = null;
      els.reversePlay.classList.remove("playing");
      els.reversePlay.textContent = "\u25b6";
      return;
    }
    els.reversePlay.classList.add("playing");
    els.reversePlay.textContent = "||";
    state.reverseTimer = setInterval(() => {
      const next = Number(els.reverseSlider.value) >= state.reverseSteps ? 0 : Number(els.reverseSlider.value) + 1;
      els.reverseSlider.value = String(next);
      render();
    }, 90);
  }

  els.preset.addEventListener("change", regenerate);
  els.sampleCount.addEventListener("input", regenerate);
  els.seed.addEventListener("change", regenerate);
  els.quality.addEventListener("change", () => {
    buildReversePaths();
    render();
  });
  [els.noiseSlider, els.pointSlider].forEach((el) => el.addEventListener("input", render));
  els.reverseSlider.addEventListener("input", render);
  els.noiseBack.addEventListener("click", () => {
    stepSlider(els.noiseSlider, -1);
    render();
  });
  els.noiseForward.addEventListener("click", () => {
    stepSlider(els.noiseSlider, 1);
    render();
  });
  els.reverseBack.addEventListener("click", () => {
    stepSlider(els.reverseSlider, -1);
    render();
  });
  els.reverseForward.addEventListener("click", () => {
    stepSlider(els.reverseSlider, 1);
    render();
  });
  els.noisePlay.addEventListener("click", toggleNoisePlay);
  els.reversePlay.addEventListener("click", toggleReversePlay);
  window.addEventListener("resize", render);

  regenerate();
})();
