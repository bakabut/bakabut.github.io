const HIDDEN_UNITS = 4;

const DATASETS = {
  xor: { label: "XOR corners" },
  moons: { label: "Two moons" },
  circles: { label: "Inside versus outside" },
  line: { label: "Linear split" }
};

const INIT_NOTES = {
  he: {
    tag: "healthy",
    title: "Healthy random initialization",
    points: [
      "Hidden units start different, so they can specialize.",
      "ReLU units are usually active on some samples, so gradients reach the first layer.",
      "Weight traces separate instead of moving as one copied bundle."
    ]
  },
  xavier: {
    tag: "balanced",
    title: "Xavier random initialization",
    points: [
      "Good general-purpose scale, especially for tanh.",
      "Signals are not too tiny and not immediately saturated.",
      "Different hidden units receive different gradients."
    ]
  },
  tiny: {
    tag: "weak signal",
    title: "Too-small weights",
    points: [
      "Neurons start almost identical around zero.",
      "Early outputs are close to 0.5, so the decision surface changes slowly.",
      "The model can learn, but the first useful differences take longer to appear."
    ]
  },
  wide: {
    tag: "unstable",
    title: "Too-large weights",
    points: [
      "Large weights create sharp boundaries before the model knows the data.",
      "For tanh, many units saturate and their derivatives shrink.",
      "Some traces dominate while others barely receive useful updates."
    ]
  },
  zeros: {
    tag: "symmetry trap",
    title: "All-zero initialization",
    points: [
      "Every hidden unit computes the same thing at the start.",
      "The first-layer gradient is also identical or zero, so hidden units do not diversify.",
      "The network behaves like a much smaller model."
    ]
  },
  symmetric: {
    tag: "copied units",
    title: "Copied hidden units",
    points: [
      "All hidden units begin with the same incoming and outgoing weights.",
      "Backprop gives them the same update, so they keep doing the same job.",
      "Capacity is wasted even though the graph appears to have several neurons."
    ]
  },
  deadRelu: {
    tag: "dead ReLU",
    title: "Dead ReLU bias",
    points: [
      "Large negative biases put ReLU pre-activations below zero.",
      "ReLU derivative is zero there, so dL/dz is zero and first-layer weights do not move.",
      "Only the output bias still has a gradient path; on balanced data even that may barely move."
    ]
  },
  saturatedTanh: {
    tag: "saturation",
    title: "Saturated tanh",
    points: [
      "Large pre-activations push tanh close to -1 or 1.",
      "The tanh derivative becomes tiny, so backprop is multiplied down.",
      "Loss may improve slowly even when output weights keep changing."
    ]
  }
};

const elements = {
  datasetSelect: document.getElementById("datasetSelect"),
  sampleCount: document.getElementById("sampleCount"),
  activationSelect: document.getElementById("activationSelect"),
  initSelect: document.getElementById("initSelect"),
  seedInput: document.getElementById("seedInput"),
  learningRate: document.getElementById("learningRate"),
  epochCount: document.getElementById("epochCount"),
  retrainButton: document.getElementById("retrainButton"),
  epochSlider: document.getElementById("epochSlider"),
  epochLabel: document.getElementById("epochLabel"),
  stepBack: document.getElementById("stepBack"),
  playPause: document.getElementById("playPause"),
  stepForward: document.getElementById("stepForward"),
  lossValue: document.getElementById("lossValue"),
  accuracyValue: document.getElementById("accuracyValue"),
  aliveValue: document.getElementById("aliveValue"),
  gradientValue: document.getElementById("gradientValue"),
  probeSample: document.getElementById("probeSample"),
  probeLabel: document.getElementById("probeLabel"),
  probeCard: document.getElementById("probeCard"),
  datasetLabel: document.getElementById("datasetLabel"),
  modelShapeLabel: document.getElementById("modelShapeLabel"),
  modelFormula: document.getElementById("modelFormula"),
  healthSummary: document.getElementById("healthSummary"),
  healthGrid: document.getElementById("healthGrid"),
  backpropSummary: document.getElementById("backpropSummary"),
  backpropTable: document.getElementById("backpropTable"),
  weightRange: document.getElementById("weightRange"),
  caseTag: document.getElementById("caseTag"),
  caseGrid: document.getElementById("caseGrid"),
  summaryPill: document.getElementById("summaryPill"),
  surfaceCanvas: document.getElementById("surfaceCanvas"),
  networkCanvas: document.getElementById("networkCanvas"),
  historyCanvas: document.getElementById("historyCanvas")
};

const state = {
  data: [],
  snapshots: [],
  selectedEpoch: 0,
  playing: false,
  timer: null
};

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randn(random) {
  const u = Math.max(1e-9, random());
  const v = Math.max(1e-9, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function makeDataset(type, count, seed) {
  const random = mulberry32(seed * 1009 + type.length * 37);
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    if (type === "xor") {
      const corner = i % 4;
      const sx = corner === 0 || corner === 3 ? -1 : 1;
      const sy = corner < 2 ? -1 : 1;
      rows.push({
        x: sx * (0.72 + random() * 0.34) + randn(random) * 0.1,
        y: sy * (0.72 + random() * 0.34) + randn(random) * 0.1,
        t: sx === sy ? 0 : 1
      });
    } else if (type === "moons") {
      const upper = i % 2 === 0;
      const angle = random() * Math.PI;
      const noise = 0.09;
      const x = Math.cos(angle) + randn(random) * noise;
      const y = Math.sin(angle) + randn(random) * noise;
      rows.push(
        upper
          ? { x: x - 0.5, y: y * 0.72 - 0.2, t: 0 }
          : { x: 0.5 - x, y: -y * 0.72 + 0.35, t: 1 }
      );
    } else if (type === "circles") {
      const inner = i % 2 === 0;
      const angle = random() * Math.PI * 2;
      const radius = inner ? 0.34 + random() * 0.18 : 0.88 + random() * 0.24;
      rows.push({
        x: Math.cos(angle) * radius + randn(random) * 0.04,
        y: Math.sin(angle) * radius + randn(random) * 0.04,
        t: inner ? 0 : 1
      });
    } else {
      const x = random() * 2.5 - 1.25;
      const y = random() * 2.5 - 1.25;
      rows.push({ x, y, t: y > 0.55 * x - 0.05 ? 1 : 0 });
    }
  }
  return rows;
}

function initializeNetwork(mode, activation, seed) {
  const random = mulberry32(seed * 9176 + mode.length * 101);
  const net = {
    w1: Array.from({ length: HIDDEN_UNITS }, () => [0, 0]),
    b1: Array.from({ length: HIDDEN_UNITS }, () => 0),
    w2: Array.from({ length: HIDDEN_UNITS }, () => 0),
    b2: 0
  };

  if (mode === "zeros") return net;

  if (mode === "symmetric") {
    for (let h = 0; h < HIDDEN_UNITS; h += 1) {
      net.w1[h] = [0.55, -0.45];
      net.b1[h] = 0.02;
      net.w2[h] = 0.32;
    }
    return net;
  }

  if (mode === "deadRelu") {
    for (let h = 0; h < HIDDEN_UNITS; h += 1) {
      net.w1[h][0] = randn(random) * 0.12;
      net.w1[h][1] = randn(random) * 0.12;
      net.b1[h] = -2.8 - random() * 0.8;
      net.w2[h] = randn(random) * 0.55;
    }
    return net;
  }

  if (mode === "saturatedTanh") {
    for (let h = 0; h < HIDDEN_UNITS; h += 1) {
      const sign = h % 2 === 0 ? 1 : -1;
      net.w1[h][0] = sign * (2.8 + random() * 1.5);
      net.w1[h][1] = -sign * (2.8 + random() * 1.5);
      net.b1[h] = sign * (3.2 + random() * 1.2);
      net.w2[h] = randn(random) * 0.55;
    }
    return net;
  }

  const scaleByMode = {
    he: activation === "relu" ? Math.sqrt(2 / 2) : Math.sqrt(1 / 2),
    xavier: Math.sqrt(1 / 2),
    tiny: 0.025,
    wide: 2.25
  };
  const scale = scaleByMode[mode] || scaleByMode.he;

  for (let h = 0; h < HIDDEN_UNITS; h += 1) {
    net.w1[h][0] = randn(random) * scale;
    net.w1[h][1] = randn(random) * scale;
    net.b1[h] = randn(random) * scale * 0.12;
    net.w2[h] = randn(random) * scale;
  }
  net.b2 = randn(random) * scale * 0.12;
  return net;
}

function sigmoid(z) {
  return 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, z))));
}

function activate(z, activation) {
  return activation === "relu" ? Math.max(0, z) : Math.tanh(z);
}

function activationDerivative(z, activated, activation) {
  return activation === "relu" ? (z > 0 ? 1 : 0) : 1 - activated * activated;
}

function forward(net, point, activation) {
  const hiddenRaw = [];
  const hidden = [];
  const derivative = [];
  for (let h = 0; h < HIDDEN_UNITS; h += 1) {
    const z = net.w1[h][0] * point.x + net.w1[h][1] * point.y + net.b1[h];
    const a = activate(z, activation);
    hiddenRaw.push(z);
    hidden.push(a);
    derivative.push(activationDerivative(z, a, activation));
  }
  const logit = hidden.reduce((sum, value, h) => sum + value * net.w2[h], net.b2);
  return { hiddenRaw, hidden, derivative, logit, output: sigmoid(logit) };
}

function cloneNet(net) {
  return {
    w1: net.w1.map((row) => [...row]),
    b1: [...net.b1],
    w2: [...net.w2],
    b2: net.b2
  };
}

function flattenWeights(net) {
  const weights = [];
  for (let h = 0; h < HIDDEN_UNITS; h += 1) {
    weights.push(net.w1[h][0], net.w1[h][1], net.b1[h], net.w2[h]);
  }
  weights.push(net.b2);
  return weights;
}

function emptyGradient() {
  return {
    w1: Array.from({ length: HIDDEN_UNITS }, () => [0, 0]),
    b1: Array.from({ length: HIDDEN_UNITS }, () => 0),
    w2: Array.from({ length: HIDDEN_UNITS }, () => 0),
    b2: 0
  };
}

function accumulateGradient(net, data, activation) {
  const grad = emptyGradient();
  const diagnostics = Array.from({ length: HIDDEN_UNITS }, () => ({
    activeRate: 0,
    avgDerivative: 0,
    avgAbsHiddenGrad: 0,
    avgAbsW1Grad: 0
  }));
  let loss = 0;
  let correct = 0;

  for (const point of data) {
    const out = forward(net, point, activation);
    const dLogit = out.output - point.t;
    loss += -(point.t * Math.log(out.output + 1e-9) + (1 - point.t) * Math.log(1 - out.output + 1e-9));
    correct += (out.output >= 0.5 ? 1 : 0) === point.t ? 1 : 0;

    for (let h = 0; h < HIDDEN_UNITS; h += 1) {
      const dHiddenRaw = dLogit * net.w2[h] * out.derivative[h];
      grad.w2[h] += dLogit * out.hidden[h];
      grad.w1[h][0] += dHiddenRaw * point.x;
      grad.w1[h][1] += dHiddenRaw * point.y;
      grad.b1[h] += dHiddenRaw;

      diagnostics[h].activeRate += activation === "relu" ? (out.hidden[h] > 0 ? 1 : 0) : (Math.abs(out.hidden[h]) > 0.05 ? 1 : 0);
      diagnostics[h].avgDerivative += out.derivative[h];
      diagnostics[h].avgAbsHiddenGrad += Math.abs(dHiddenRaw);
      diagnostics[h].avgAbsW1Grad += (Math.abs(dHiddenRaw * point.x) + Math.abs(dHiddenRaw * point.y)) / 2;
    }
    grad.b2 += dLogit;
  }

  const invN = 1 / data.length;
  for (let h = 0; h < HIDDEN_UNITS; h += 1) {
    diagnostics[h].activeRate *= invN;
    diagnostics[h].avgDerivative *= invN;
    diagnostics[h].avgAbsHiddenGrad *= invN;
    diagnostics[h].avgAbsW1Grad *= invN;
  }

  return {
    grad,
    loss: loss * invN,
    accuracy: correct * invN,
    diagnostics
  };
}

function trainNetwork() {
  const dataset = elements.datasetSelect.value;
  const count = Number(elements.sampleCount.value);
  const seed = Number(elements.seedInput.value) || 1;
  const lr = Number(elements.learningRate.value);
  const epochs = Number(elements.epochCount.value);
  const init = elements.initSelect.value;
  const activation = elements.activationSelect.value;

  state.data = makeDataset(dataset, count, seed);
  elements.probeSample.max = String(state.data.length - 1);
  elements.probeSample.value = String(Math.min(Number(elements.probeSample.value), state.data.length - 1));

  const net = initializeNetwork(init, activation, seed);
  state.snapshots = [];

  for (let epoch = 0; epoch <= epochs; epoch += 1) {
    const current = accumulateGradient(net, state.data, activation);
    state.snapshots.push({
      epoch,
      activation,
      init,
      net: cloneNet(net),
      weights: flattenWeights(net),
      loss: current.loss,
      accuracy: current.accuracy,
      diagnostics: current.diagnostics
    });

    if (epoch === epochs) break;

    const invN = 1 / state.data.length;
    for (let h = 0; h < HIDDEN_UNITS; h += 1) {
      net.w1[h][0] -= lr * current.grad.w1[h][0] * invN;
      net.w1[h][1] -= lr * current.grad.w1[h][1] * invN;
      net.b1[h] -= lr * current.grad.b1[h] * invN;
      net.w2[h] -= lr * current.grad.w2[h] * invN;
    }
    net.b2 -= lr * current.grad.b2 * invN;
  }

  elements.epochSlider.max = String(epochs);
  elements.datasetLabel.textContent = DATASETS[dataset].label;
  elements.modelShapeLabel.textContent = `2-${HIDDEN_UNITS}-1 ${activation} net`;
  elements.modelFormula.textContent = `y = sigmoid(W2 ${activation}(W1 x + b1) + b2)`;
  elements.summaryPill.textContent = `lr ${lr.toFixed(2)} - ${count} samples - ${activation}`;
  setEpoch(Math.min(state.selectedEpoch, epochs));
}

function setEpoch(epoch) {
  const max = state.snapshots.length - 1;
  state.selectedEpoch = Math.max(0, Math.min(max, epoch));
  elements.epochSlider.value = String(state.selectedEpoch);
  draw();
}

function bindEvents() {
  [
    elements.datasetSelect,
    elements.sampleCount,
    elements.activationSelect,
    elements.seedInput,
    elements.learningRate,
    elements.epochCount
  ].forEach((element) => {
    element.addEventListener("change", () => {
      stopPlayback();
      trainNetwork();
    });
    element.addEventListener("input", () => {
      if (element.type === "range") {
        stopPlayback();
        trainNetwork();
      }
    });
  });

  elements.initSelect.addEventListener("change", () => {
    stopPlayback();
    if (elements.initSelect.value === "deadRelu") elements.activationSelect.value = "relu";
    if (elements.initSelect.value === "saturatedTanh") elements.activationSelect.value = "tanh";
    trainNetwork();
  });

  elements.retrainButton.addEventListener("click", () => {
    stopPlayback();
    trainNetwork();
  });

  elements.epochSlider.addEventListener("input", () => {
    stopPlayback();
    setEpoch(Number(elements.epochSlider.value));
  });

  elements.probeSample.addEventListener("input", draw);

  elements.stepBack.addEventListener("click", () => {
    stopPlayback();
    setEpoch(state.selectedEpoch - 1);
  });

  elements.stepForward.addEventListener("click", () => {
    stopPlayback();
    setEpoch(state.selectedEpoch + 1);
  });

  elements.playPause.addEventListener("click", () => {
    if (state.playing) stopPlayback();
    else startPlayback();
  });

  window.addEventListener("resize", draw);
}

function startPlayback() {
  state.playing = true;
  elements.playPause.innerHTML = "&#10074;&#10074;";
  state.timer = window.setInterval(() => {
    if (state.selectedEpoch >= state.snapshots.length - 1) {
      setEpoch(0);
      return;
    }
    setEpoch(state.selectedEpoch + 2);
  }, 70);
}

function stopPlayback() {
  state.playing = false;
  elements.playPause.innerHTML = "&#9654;";
  if (state.timer) {
    window.clearInterval(state.timer);
    state.timer = null;
  }
}

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const cssWidth = Math.max(320, rect.width);
  const cssHeight = Math.max(220, rect.height);
  const width = Math.round(cssWidth * ratio);
  const height = Math.round(cssHeight * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width: cssWidth, height: cssHeight };
}

function formatSmall(value) {
  if (Math.abs(value) < 0.0005) return "0";
  if (Math.abs(value) < 0.01) return value.toExponential(1);
  return value.toFixed(3);
}

function draw() {
  if (!state.snapshots.length) return;
  const snapshot = state.snapshots[state.selectedEpoch];
  const aliveCount = snapshot.diagnostics.filter((item) => item.activeRate > 0.05 && item.avgAbsHiddenGrad > 0.0005).length;
  const meanHiddenGrad = snapshot.diagnostics.reduce((sum, item) => sum + item.avgAbsHiddenGrad, 0) / HIDDEN_UNITS;

  elements.epochLabel.textContent = `${snapshot.epoch} / ${state.snapshots.length - 1}`;
  elements.lossValue.textContent = snapshot.loss.toFixed(3);
  elements.accuracyValue.textContent = `${Math.round(snapshot.accuracy * 100)}%`;
  elements.aliveValue.textContent = `${aliveCount} / ${HIDDEN_UNITS}`;
  elements.gradientValue.textContent = formatSmall(meanHiddenGrad);

  drawSurface(snapshot.net, snapshot.activation);
  drawNetwork(snapshot.net);
  drawHealth(snapshot);
  drawBackprop(snapshot);
  drawHistory();
  drawCase(snapshot.init);
}

function drawSurface(net, activation) {
  const { ctx, width, height } = fitCanvas(elements.surfaceCanvas);
  ctx.clearRect(0, 0, width, height);
  const pad = 26;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;
  const cell = Math.max(8, Math.floor(plotW / 42));

  for (let py = pad; py < pad + plotH; py += cell) {
    for (let px = pad; px < pad + plotW; px += cell) {
      const x = ((px - pad) / plotW) * 2.8 - 1.4;
      const y = -(((py - pad) / plotH) * 2.8 - 1.4);
      const output = forward(net, { x, y }, activation).output;
      const r = Math.round(248 - output * 55);
      const g = Math.round(234 - output * 34);
      const b = Math.round(214 + output * 32);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(px, py, cell + 1, cell + 1);
    }
  }

  ctx.strokeStyle = "#d7ded8";
  ctx.lineWidth = 1;
  ctx.strokeRect(pad, pad, plotW, plotH);
  ctx.strokeStyle = "rgba(23, 32, 28, 0.28)";
  ctx.beginPath();
  ctx.moveTo(pad, pad + plotH / 2);
  ctx.lineTo(pad + plotW, pad + plotH / 2);
  ctx.moveTo(pad + plotW / 2, pad);
  ctx.lineTo(pad + plotW / 2, pad + plotH);
  ctx.stroke();

  for (const point of state.data) {
    const px = pad + ((point.x + 1.4) / 2.8) * plotW;
    const py = pad + ((1.4 - point.y) / 2.8) * plotH;
    ctx.beginPath();
    ctx.arc(px, py, 5.2, 0, Math.PI * 2);
    ctx.fillStyle = point.t ? "#3159a7" : "#b94f2f";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
  }
}

function drawNetwork(net) {
  const { ctx, width, height } = fitCanvas(elements.networkCanvas);
  ctx.clearRect(0, 0, width, height);
  const nodes = [
    [{ x: width * 0.15, y: height * 0.36, label: "x1" }, { x: width * 0.15, y: height * 0.64, label: "x2" }],
    Array.from({ length: HIDDEN_UNITS }, (_, h) => ({
      x: width * 0.5,
      y: height * (0.18 + h * (0.64 / (HIDDEN_UNITS - 1))),
      label: `h${h + 1}`
    })),
    [{ x: width * 0.84, y: height * 0.5, label: "y" }]
  ];
  const maxAbs = Math.max(0.2, ...flattenWeights(net).map(Math.abs));

  function edge(from, to, value) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = value >= 0 ? "rgba(49, 89, 167, 0.78)" : "rgba(185, 79, 47, 0.78)";
    ctx.lineWidth = 0.8 + (Math.abs(value) / maxAbs) * 7.5;
    ctx.stroke();
  }

  for (let h = 0; h < HIDDEN_UNITS; h += 1) {
    edge(nodes[0][0], nodes[1][h], net.w1[h][0]);
    edge(nodes[0][1], nodes[1][h], net.w1[h][1]);
    edge(nodes[1][h], nodes[2][0], net.w2[h]);
  }

  for (const layer of nodes) {
    for (const node of layer) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#087f73";
      ctx.stroke();
      ctx.fillStyle = "#17201c";
      ctx.font = "800 13px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label, node.x, node.y);
    }
  }

  ctx.fillStyle = "#65716a";
  ctx.font = "700 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("blue = positive weight, rust = negative weight, width = magnitude", width / 2, height - 18);
}

function drawHealth(snapshot) {
  const aliveCount = snapshot.diagnostics.filter((item) => item.activeRate > 0.05 && item.avgAbsHiddenGrad > 0.0005).length;
  const maxHiddenGrad = Math.max(0.0005, ...snapshot.diagnostics.map((item) => item.avgAbsHiddenGrad));
  elements.healthSummary.textContent = `${aliveCount} gradient-connected`;
  elements.healthGrid.innerHTML = snapshot.diagnostics
    .map((item, index) => {
      const gradWidth = Math.round((item.avgAbsHiddenGrad / maxHiddenGrad) * 100);
      const status =
        item.activeRate <= 0.02
          ? "dead"
          : item.avgDerivative < 0.05
            ? "saturated"
            : item.avgAbsHiddenGrad < 0.0005
              ? "no gradient"
              : "learning";
      return `
        <div class="health-card ${status.replace(" ", "-")}">
          <div class="health-title">
            <strong>h${index + 1}</strong>
            <span>${status}</span>
          </div>
          <div class="bar-line"><span>active</span><b style="width:${Math.round(item.activeRate * 100)}%"></b><em>${Math.round(item.activeRate * 100)}%</em></div>
          <div class="bar-line"><span>deriv</span><b style="width:${Math.min(100, Math.round(item.avgDerivative * 100))}%"></b><em>${formatSmall(item.avgDerivative)}</em></div>
          <div class="bar-line"><span>|grad|</span><b style="width:${gradWidth}%"></b><em>${formatSmall(item.avgAbsHiddenGrad)}</em></div>
        </div>
      `;
    })
    .join("");
}

function probeBackprop(snapshot) {
  const sampleIndex = Math.min(Number(elements.probeSample.value), state.data.length - 1);
  const point = state.data[sampleIndex];
  const out = forward(snapshot.net, point, snapshot.activation);
  const dLogit = out.output - point.t;
  const rows = [];
  for (let h = 0; h < HIDDEN_UNITS; h += 1) {
    const dHiddenRaw = dLogit * snapshot.net.w2[h] * out.derivative[h];
    rows.push({
      h,
      z: out.hiddenRaw[h],
      a: out.hidden[h],
      derivative: out.derivative[h],
      w2: snapshot.net.w2[h],
      dHiddenRaw,
      dw1x: dHiddenRaw * point.x,
      dw1y: dHiddenRaw * point.y
    });
  }
  return { sampleIndex, point, out, dLogit, rows };
}

function drawBackprop(snapshot) {
  const probe = probeBackprop(snapshot);
  elements.probeLabel.textContent = `sample ${probe.sampleIndex + 1}`;
  elements.backpropSummary.textContent = `target ${probe.point.t}, prediction ${probe.out.output.toFixed(3)}`;
  elements.probeCard.innerHTML = `
    <strong>sample ${probe.sampleIndex + 1}: (${probe.point.x.toFixed(2)}, ${probe.point.y.toFixed(2)})</strong>
    <p>target ${probe.point.t}, prediction ${probe.out.output.toFixed(3)}, output error dL/dlogit = ${formatSmall(probe.dLogit)}</p>
  `;
  elements.backpropTable.innerHTML = `
    <div class="backprop-row backprop-head">
      <span>unit</span><span>z</span><span>a</span><span>a'</span><span>w2</span><span>dL/dz</span>
    </div>
    ${probe.rows
      .map(
        (row) => `
          <div class="backprop-row ${Math.abs(row.dHiddenRaw) < 0.0005 ? "muted-row" : ""}">
            <span>h${row.h + 1}</span>
            <span>${formatSmall(row.z)}</span>
            <span>${formatSmall(row.a)}</span>
            <span>${formatSmall(row.derivative)}</span>
            <span>${formatSmall(row.w2)}</span>
            <span>${formatSmall(row.dHiddenRaw)}</span>
          </div>
        `
      )
      .join("")}
  `;
}

function drawCase(init) {
  const note = INIT_NOTES[init] || INIT_NOTES.he;
  elements.caseTag.textContent = note.tag;
  elements.caseGrid.innerHTML = `
    <div class="case-main">
      <strong>${note.title}</strong>
      <p>${note.points[0]}</p>
    </div>
    ${note.points
      .slice(1)
      .map((point) => `<div class="case-point">${point}</div>`)
      .join("")}
  `;
}

function drawHistory() {
  const { ctx, width, height } = fitCanvas(elements.historyCanvas);
  ctx.clearRect(0, 0, width, height);
  const padL = 58;
  const padR = 22;
  const padT = 20;
  const padB = 46;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const all = state.snapshots.flatMap((snap) => snap.weights);
  const maxAbs = Math.max(0.25, ...all.map(Math.abs));
  elements.weightRange.textContent = `range ${(-maxAbs).toFixed(2)} to ${maxAbs.toFixed(2)}`;

  ctx.strokeStyle = "#d7ded8";
  ctx.lineWidth = 1;
  ctx.strokeRect(padL, padT, plotW, plotH);

  const colors = ["#3159a7", "#b94f2f", "#087f73", "#bd8614", "#5951b5", "#7a6a53", "#7d3f98", "#49716b"];
  const totalEpochs = state.snapshots.length - 1;
  const toX = (epoch) => padL + (epoch / totalEpochs) * plotW;
  const toY = (value) => padT + (0.5 - value / (maxAbs * 2)) * plotH;
  const weightCount = state.snapshots[0].weights.length;

  ctx.font = "700 11px Inter, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#65716a";
  ctx.strokeStyle = "rgba(23, 32, 28, 0.14)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i += 1) {
    const value = maxAbs - (i / 4) * maxAbs * 2;
    const y = toY(value);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(value.toFixed(2), padL - 8, y);
  }

  const xTickCount = totalEpochs <= 80 ? 4 : 5;
  ctx.textBaseline = "top";
  for (let i = 0; i <= xTickCount; i += 1) {
    const epoch = Math.round((i / xTickCount) * totalEpochs);
    const x = toX(epoch);
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillText(String(epoch), x, padT + plotH + 10);
  }

  for (let i = 0; i < weightCount; i += 1) {
    ctx.beginPath();
    state.snapshots.forEach((snap, index) => {
      const x = toX(snap.epoch);
      const y = toY(snap.weights[i]);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = colors[i % colors.length];
    ctx.globalAlpha = i % 4 === 3 ? 0.9 : 0.5;
    ctx.lineWidth = i % 4 === 3 ? 2.2 : 1.4;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const xNow = toX(state.selectedEpoch);
  ctx.beginPath();
  ctx.moveTo(xNow, padT);
  ctx.lineTo(xNow, padT + plotH);
  ctx.strokeStyle = "#17201c";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#65716a";
  ctx.font = "700 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("epoch", padL, height - 8);
  ctx.textAlign = "right";
  ctx.fillText("weight", padL - 8, padT - 5);
}

bindEvents();
trainNetwork();
