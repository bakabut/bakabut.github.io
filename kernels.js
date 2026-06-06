const SIZE = 96;

const elements = {
  imagePreset: document.getElementById("imagePreset"),
  responseMode: document.getElementById("responseMode"),
  kernelButtons: document.getElementById("kernelButtons"),
  xSlider: document.getElementById("xSlider"),
  ySlider: document.getElementById("ySlider"),
  pixelLabel: document.getElementById("pixelLabel"),
  selectedResponse: document.getElementById("selectedResponse"),
  scanToggle: document.getElementById("scanToggle"),
  sourceCanvas: document.getElementById("sourceCanvas"),
  responseCanvas: document.getElementById("responseCanvas"),
  verticalCompareCanvas: document.getElementById("verticalCompareCanvas"),
  horizontalCompareCanvas: document.getElementById("horizontalCompareCanvas"),
  kernelSummary: document.getElementById("kernelSummary"),
  kernelName: document.getElementById("kernelName"),
  kernelFormula: document.getElementById("kernelFormula"),
  responseLegend: document.getElementById("responseLegend"),
  patchMatrix: document.getElementById("patchMatrix"),
  kernelMatrix: document.getElementById("kernelMatrix"),
  productMatrix: document.getElementById("productMatrix"),
  sumValue: document.getElementById("sumValue"),
  kernelExplanation: document.getElementById("kernelExplanation")
};

const kernels = {
  verticalLine: {
    name: "Vertical line detector",
    short: "vertical line",
    matrix: [
      [-1, 2, -1],
      [-1, 2, -1],
      [-1, 2, -1]
    ],
    explanation: "Large positive response means the center column is brighter than the columns on both sides."
  },
  horizontalLine: {
    name: "Horizontal line detector",
    short: "horizontal line",
    matrix: [
      [-1, -1, -1],
      [2, 2, 2],
      [-1, -1, -1]
    ],
    explanation: "Large positive response means the center row is brighter than the rows above and below."
  },
  verticalEdge: {
    name: "Vertical edge detector",
    short: "vertical edge",
    matrix: [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ],
    explanation: "This Sobel kernel responds to left-to-right brightness changes, which are vertical edges."
  },
  horizontalEdge: {
    name: "Horizontal edge detector",
    short: "horizontal edge",
    matrix: [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ],
    explanation: "This Sobel kernel responds to top-to-bottom brightness changes, which are horizontal edges."
  }
};

const state = {
  imagePreset: "mixed",
  kernel: "verticalLine",
  responseMode: "signed",
  x: 28,
  y: 48,
  image: new Float32Array(SIZE * SIZE),
  response: null,
  playing: false,
  scanTimer: null,
  pointerDown: false
};

function init() {
  bindEvents();
  rebuildImage();
  render();
}

function bindEvents() {
  elements.imagePreset.addEventListener("change", () => {
    state.imagePreset = elements.imagePreset.value;
    rebuildImage();
    render();
  });

  elements.responseMode.addEventListener("change", () => {
    state.responseMode = elements.responseMode.value;
    render();
  });

  elements.kernelButtons.querySelectorAll("[data-kernel]").forEach((button) => {
    button.addEventListener("click", () => {
      state.kernel = button.dataset.kernel;
      render();
    });
  });

  elements.xSlider.addEventListener("input", () => {
    state.x = Number(elements.xSlider.value);
    render();
  });

  elements.ySlider.addEventListener("input", () => {
    state.y = Number(elements.ySlider.value);
    render();
  });

  elements.scanToggle.addEventListener("click", toggleScan);

  [elements.sourceCanvas, elements.responseCanvas].forEach((canvas) => {
    canvas.addEventListener("pointerdown", (event) => {
      state.pointerDown = true;
      setSelectedPixelFromEvent(event, canvas);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (state.pointerDown) {
        setSelectedPixelFromEvent(event, canvas);
      }
    });
    canvas.addEventListener("pointerup", () => {
      state.pointerDown = false;
    });
    canvas.addEventListener("pointerleave", () => {
      state.pointerDown = false;
    });
  });
}

function toggleScan() {
  state.playing = !state.playing;
  elements.scanToggle.classList.toggle("active", state.playing);
  elements.scanToggle.textContent = state.playing ? "Pause scan" : "Play scan";

  if (state.playing) {
    state.scanTimer = window.setInterval(() => {
      state.x += 1;
      if (state.x >= SIZE - 1) {
        state.x = 1;
        state.y += 1;
      }
      if (state.y >= SIZE - 1) {
        state.y = 1;
      }
      render();
    }, 70);
  } else {
    window.clearInterval(state.scanTimer);
  }
}

function rebuildImage() {
  state.image = makeImagePreset(state.imagePreset);
}

function render() {
  const kernel = kernels[state.kernel];
  state.response = computeResponse(state.image, kernel.matrix);
  syncControls();
  renderKernelButtons();
  renderMatrices(kernel);
  drawSourceCanvas();
  drawResponseCanvas(elements.responseCanvas, state.response, true);
  drawResponseCanvas(elements.verticalCompareCanvas, computeResponse(state.image, kernels.verticalLine.matrix), false);
  drawResponseCanvas(elements.horizontalCompareCanvas, computeResponse(state.image, kernels.horizontalLine.matrix), false);
}

function syncControls() {
  state.x = Math.round(clamp(state.x, 1, SIZE - 2));
  state.y = Math.round(clamp(state.y, 1, SIZE - 2));
  elements.xSlider.value = String(state.x);
  elements.ySlider.value = String(state.y);
  elements.pixelLabel.textContent = `x=${state.x}, y=${state.y}`;
  elements.responseMode.value = state.responseMode;

  const kernel = kernels[state.kernel];
  const selected = state.response.values[index(state.x, state.y)];
  elements.selectedResponse.textContent = formatValue(selected);
  elements.kernelSummary.textContent = `${kernel.short}: patch * weights`;
  elements.kernelName.textContent = kernel.name;
  elements.kernelFormula.textContent = `response[${state.x},${state.y}] = sum patch[i,j] * kernel[i,j]`;
  elements.responseLegend.textContent = state.responseMode === "signed"
    ? "orange positive, blue negative"
    : state.responseMode === "absolute"
      ? "absolute strength"
      : "positive only";
}

function renderKernelButtons() {
  elements.kernelButtons.querySelectorAll("[data-kernel]").forEach((button) => {
    button.classList.toggle("active", button.dataset.kernel === state.kernel);
  });
}

function renderMatrices(kernel) {
  const patch = [];
  const weights = [];
  const products = [];
  let sum = 0;

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const value = state.image[index(state.x + dx, state.y + dy)];
      const weight = kernel.matrix[dy + 1][dx + 1];
      const product = value * weight;
      patch.push(value);
      weights.push(weight);
      products.push(product);
      sum += product;
    }
  }

  elements.patchMatrix.innerHTML = patch.map(renderPatchCell).join("");
  elements.kernelMatrix.innerHTML = weights.map((value) => renderSignedCell(value, maxAbs(weights))).join("");
  elements.productMatrix.innerHTML = products.map((value) => renderSignedCell(value, maxAbs(products))).join("");
  elements.sumValue.textContent = formatValue(sum);
  elements.kernelExplanation.textContent = kernel.explanation;
}

function renderPatchCell(value) {
  const gray = Math.round(value * 255);
  const text = gray < 118 ? "#ffffff" : "#17201c";
  return `<div class="matrix-cell patch" style="--gray: ${gray}; --patch-text: ${text}">${value.toFixed(2)}</div>`;
}

function renderSignedCell(value, maxValue) {
  const strength = maxValue > 0 ? Math.min(1, Math.abs(value) / maxValue) : 0;
  const className = value > 0 ? "pos" : value < 0 ? "neg" : "zero";
  return `<div class="matrix-cell ${className}" style="--strength: ${strength.toFixed(3)}">${formatValue(value)}</div>`;
}

function drawSourceCanvas() {
  const canvas = setupCanvas(elements.sourceCanvas);
  const { ctx, width, height } = canvas;
  const view = makeSquareView(width, height);
  clearCanvas(ctx, width, height, "#fbfcf9");
  drawGrayImage(ctx, state.image, view);
  drawSelection(ctx, view, "#bd8614");
}

function drawResponseCanvas(canvasElement, response, showSelection) {
  const canvas = setupCanvas(canvasElement);
  const { ctx, width, height } = canvas;
  const view = makeSquareView(width, height);
  clearCanvas(ctx, width, height, "#fbfcf9");
  drawResponseImage(ctx, response, view);
  if (showSelection) {
    drawSelection(ctx, view, "#17201c");
  }
}

function drawGrayImage(ctx, data, view) {
  const cell = view.size / SIZE;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const gray = Math.round(data[index(x, y)] * 255);
      ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      ctx.fillRect(view.left + x * cell, view.top + y * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }
}

function drawResponseImage(ctx, response, view) {
  const cell = view.size / SIZE;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const value = response.values[index(x, y)];
      ctx.fillStyle = responseColor(value, response.maxAbs, response.maxPositive);
      ctx.fillRect(view.left + x * cell, view.top + y * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }
}

function drawSelection(ctx, view, color) {
  const cell = view.size / SIZE;
  const left = view.left + (state.x - 1) * cell;
  const top = view.top + (state.y - 1) * cell;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(left, top, cell * 3, cell * 3);

  ctx.strokeStyle = "rgba(23, 32, 28, 0.38)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(view.left + state.x * cell + cell / 2, view.top);
  ctx.lineTo(view.left + state.x * cell + cell / 2, view.top + view.size);
  ctx.moveTo(view.left, view.top + state.y * cell + cell / 2);
  ctx.lineTo(view.left + view.size, view.top + state.y * cell + cell / 2);
  ctx.stroke();
}

function responseColor(value, maxAbsValue, maxPositive) {
  if (state.responseMode === "absolute") {
    const t = maxAbsValue > 0 ? Math.min(1, Math.abs(value) / maxAbsValue) : 0;
    return mixRgb([251, 252, 249], [185, 79, 47], t);
  }

  if (state.responseMode === "positive") {
    const t = maxPositive > 0 ? Math.min(1, Math.max(0, value) / maxPositive) : 0;
    return mixRgb([251, 252, 249], [189, 134, 20], t);
  }

  const t = maxAbsValue > 0 ? Math.min(1, Math.abs(value) / maxAbsValue) : 0;
  if (value >= 0) {
    return mixRgb([251, 252, 249], [189, 134, 20], t);
  }
  return mixRgb([251, 252, 249], [53, 89, 168], t);
}

function setSelectedPixelFromEvent(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const view = makeSquareView(rect.width, rect.height);
  const x = Math.floor(((event.clientX - rect.left - view.left) / view.size) * SIZE);
  const y = Math.floor(((event.clientY - rect.top - view.top) / view.size) * SIZE);
  state.x = Math.round(clamp(x, 1, SIZE - 2));
  state.y = Math.round(clamp(y, 1, SIZE - 2));
  render();
}

function computeResponse(image, matrix) {
  const values = new Float32Array(SIZE * SIZE);
  let maxAbsValue = 0;
  let maxPositive = 0;

  for (let y = 1; y < SIZE - 1; y += 1) {
    for (let x = 1; x < SIZE - 1; x += 1) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          sum += image[index(x + kx, y + ky)] * matrix[ky + 1][kx + 1];
        }
      }
      values[index(x, y)] = sum;
      maxAbsValue = Math.max(maxAbsValue, Math.abs(sum));
      maxPositive = Math.max(maxPositive, sum);
    }
  }

  return { values, maxAbs: maxAbsValue, maxPositive };
}

function makeImagePreset(name) {
  const data = new Float32Array(SIZE * SIZE);
  fillBackground(data);

  if (name === "vertical") {
    addRect(data, 15, 8, 4, 80, 0.92);
    addRect(data, 34, 16, 5, 68, 0.88);
    addRect(data, 56, 10, 3, 72, 0.96);
    addRect(data, 74, 22, 6, 58, 0.82);
    addRect(data, 8, 38, 80, 2, 0.34);
  } else if (name === "horizontal") {
    addRect(data, 9, 15, 78, 4, 0.92);
    addRect(data, 18, 35, 64, 5, 0.88);
    addRect(data, 12, 57, 76, 3, 0.96);
    addRect(data, 22, 75, 56, 6, 0.82);
    addRect(data, 45, 6, 2, 84, 0.34);
  } else if (name === "scene") {
    addRect(data, 14, 12, 68, 72, 0.22);
    addRect(data, 18, 18, 60, 4, 0.86);
    addRect(data, 18, 30, 42, 3, 0.78);
    addRect(data, 18, 42, 52, 3, 0.78);
    addRect(data, 18, 54, 34, 3, 0.78);
    addRect(data, 66, 30, 5, 42, 0.90);
    addRect(data, 54, 67, 25, 4, 0.84);
  } else {
    addRect(data, 24, 10, 5, 76, 0.95);
    addRect(data, 12, 58, 76, 5, 0.92);
    addRect(data, 62, 18, 15, 15, 0.72);
    addRect(data, 62, 22, 15, 4, 0.94);
    addDiagonal(data, 8, 86, 50, 44, 2, 0.72);
    addRect(data, 44, 12, 2, 76, 0.28);
  }

  return data;
}

function fillBackground(data) {
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const wave = 0.025 * Math.sin(x * 0.23) + 0.02 * Math.cos(y * 0.19);
      const vignette = 0.035 * Math.hypot(x - SIZE / 2, y - SIZE / 2) / SIZE;
      data[index(x, y)] = clamp(0.16 + wave - vignette, 0, 1);
    }
  }
}

function addRect(data, x, y, width, height, value) {
  const left = Math.max(0, x);
  const top = Math.max(0, y);
  const right = Math.min(SIZE, x + width);
  const bottom = Math.min(SIZE, y + height);
  for (let yy = top; yy < bottom; yy += 1) {
    for (let xx = left; xx < right; xx += 1) {
      data[index(xx, yy)] = value;
    }
  }
}

function addDiagonal(data, x0, y0, x1, y1, radius, value) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i += 1) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    addRect(data, x - radius, y - radius, radius * 2 + 1, radius * 2 + 1, value);
  }
}

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(260, Math.floor(rect.width || canvas.clientWidth || 520));
  const height = Number(canvas.getAttribute("height")) || 360;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

function makeSquareView(width, height) {
  const size = Math.min(width - 24, height - 24);
  return {
    left: (width - size) / 2,
    top: (height - size) / 2,
    size
  };
}

function clearCanvas(ctx, width, height, color) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
}

function index(x, y) {
  return y * SIZE + x;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function maxAbs(values) {
  return values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
}

function formatValue(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.0005) {
    return "0";
  }
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function mixRgb(a, b, t) {
  const amount = clamp(t, 0, 1);
  const rgb = a.map((value, indexValue) => Math.round(value + (b[indexValue] - value) * amount));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

window.addEventListener("resize", render);
init();
