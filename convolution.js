const elements = {
  discretePreset: document.getElementById("discretePreset"),
  discreteZ: document.getElementById("discreteZ"),
  discreteZLabel: document.getElementById("discreteZLabel"),
  discreteValue: document.getElementById("discreteValue"),
  discreteHint: document.getElementById("discreteHint"),
  discreteSupportLabel: document.getElementById("discreteSupportLabel"),
  pairCount: document.getElementById("pairCount"),
  pairGrid: document.getElementById("pairGrid"),
  discreteFormula: document.getElementById("discreteFormula"),
  discreteStory: document.getElementById("discreteStory"),
  discreteCanvas: document.getElementById("discreteCanvas"),
  functionCanvas: document.getElementById("functionCanvas"),
  kStepLabel: document.getElementById("kStepLabel"),
  kSlider: document.getElementById("kSlider"),
  kPrev: document.getElementById("kPrev"),
  kNext: document.getElementById("kNext"),
  kTermFormula: document.getElementById("kTermFormula"),
  kAccumulator: document.getElementById("kAccumulator"),
  kIterationList: document.getElementById("kIterationList"),
  sequencePreset: document.getElementById("sequencePreset"),
  sequenceStepLabel: document.getElementById("sequenceStepLabel"),
  sequenceOutputLabel: document.getElementById("sequenceOutputLabel"),
  sequenceOutputValue: document.getElementById("sequenceOutputValue"),
  sequenceCanvas: document.getElementById("sequenceCanvas"),
  outputSlider: document.getElementById("outputSlider"),
  outputPrev: document.getElementById("outputPrev"),
  outputNext: document.getElementById("outputNext"),
  sequenceKSlider: document.getElementById("sequenceKSlider"),
  sequenceKPrev: document.getElementById("sequenceKPrev"),
  sequenceKNext: document.getElementById("sequenceKNext"),
  sequenceTermFormula: document.getElementById("sequenceTermFormula"),
  sequenceAccumulator: document.getElementById("sequenceAccumulator"),
  sequenceOutputs: document.getElementById("sequenceOutputs"),
  sequenceTerms: document.getElementById("sequenceTerms"),
  continuousPreset: document.getElementById("continuousPreset"),
  continuousZ: document.getElementById("continuousZ"),
  continuousZLabel: document.getElementById("continuousZLabel"),
  continuousValue: document.getElementById("continuousValue"),
  continuousHint: document.getElementById("continuousHint"),
  overlapLabel: document.getElementById("overlapLabel"),
  continuousSupportLabel: document.getElementById("continuousSupportLabel"),
  overlapCanvas: document.getElementById("overlapCanvas"),
  continuousCanvas: document.getElementById("continuousCanvas"),
  processStrip: document.getElementById("processStrip")
};

const hasDiscrete = Boolean(elements.discretePreset);
const hasSequence = Boolean(elements.sequencePreset);
const hasContinuous = Boolean(elements.continuousPreset);

const colors = {
  ink: "#17201c",
  muted: "#65716a",
  line: "#d7ded8",
  teal: "#087f73",
  rust: "#b94f2f",
  blue: "#3559a8",
  amber: "#bd8614",
  tealSoft: "#d8f0eb",
  rustSoft: "#f5ded6",
  blueSoft: "#e2e9fb",
  amberSoft: "#faedc7"
};

const discretePresets = {
  dice: {
    xName: "Die X",
    yName: "Die Y",
    hint: "Middle sums have more pair splits. Seven has six routes; two and twelve have one route.",
    x: uniformPmf(1, 6),
    y: uniformPmf(1, 6)
  },
  bernoulliBinomial: {
    xName: "Bernoulli(0.35)",
    yName: "Binomial(4, 0.55)",
    hint: "A Bernoulli variable shifts part of the binomial mass by one step.",
    x: new Map([[0, 0.65], [1, 0.35]]),
    y: binomialPmf(4, 0.55)
  },
  poisson: {
    xName: "Poisson(2)",
    yName: "Poisson(3)",
    hint: "Poisson plus Poisson is Poisson with added rates. The chart truncates tiny tails and renormalizes.",
    x: poissonPmf(2, 11),
    y: poissonPmf(3, 13)
  },
  coinDice: {
    xName: "Coin bonus",
    yName: "Die",
    hint: "Adding a coin bonus mixes the die distribution with a one-step shifted copy.",
    x: new Map([[0, 0.5], [1, 0.5]]),
    y: uniformPmf(1, 6)
  }
};

const sequencePresets = {
  smallPmf: {
    label: "Small PMFs",
    note: "A compact example where both functions are probability masses.",
    f: [0.15, 0.35, 0.30, 0.20],
    g: [0.50, 0.30, 0.20]
  },
  impulseShift: {
    label: "Impulse shifts a function",
    note: "An impulse at k=1 copies g into the output, shifted by one index.",
    f: [0, 1, 0, 0],
    g: [0.10, 0.20, 0.45, 0.25]
  },
  movingAverage: {
    label: "Moving average kernel",
    note: "A flat g averages neighboring values of f.",
    f: [0, 0.10, 0.60, 0.30, 0],
    g: [0.25, 0.25, 0.25, 0.25]
  },
  skewed: {
    label: "Skewed PMFs",
    note: "Mass on the left of f meets mass on the right of g.",
    f: [0.60, 0.25, 0.10, 0.05],
    g: [0.05, 0.15, 0.30, 0.50]
  }
};

const continuousPresets = {
  normalNormal: {
    xName: "X ~ Normal(0, 1)",
    yName: "Y ~ Normal(0, 1)",
    hint: "Normal plus normal stays normal. Variances add, so the result is wider.",
    xRange: [-5, 5],
    zRange: [-5, 5],
    xPdf: (x) => normalPdf(x, 0, 1),
    yPdf: (y) => normalPdf(y, 0, 1)
  },
  uniformUniform: {
    xName: "X ~ Uniform(-1, 1)",
    yName: "Y ~ Uniform(-1, 1)",
    hint: "Uniform plus uniform is triangular because middle sums have the most overlap.",
    xRange: [-2.4, 2.4],
    zRange: [-2.2, 2.2],
    xPdf: (x) => uniformPdf(x, -1, 1),
    yPdf: (y) => uniformPdf(y, -1, 1)
  },
  exponentialExponential: {
    xName: "X ~ Exponential(1)",
    yName: "Y ~ Exponential(1)",
    hint: "Two exponential waiting times add into an Erlang/Gamma-shaped waiting time.",
    xRange: [0, 9],
    zRange: [0, 9],
    xPdf: (x) => exponentialPdf(x, 1),
    yPdf: (y) => exponentialPdf(y, 1)
  },
  normalUniform: {
    xName: "X ~ Normal(0, 1)",
    yName: "Y ~ Uniform(-1.5, 1.5)",
    hint: "Normal plus uniform averages shifted copies of the normal curve.",
    xRange: [-5, 5],
    zRange: [-5.5, 5.5],
    xPdf: (x) => normalPdf(x, 0, 1),
    yPdf: (y) => uniformPdf(y, -1.5, 1.5)
  }
};

const state = {
  discrete: {
    preset: "dice",
    z: 7,
    conv: null,
    kIndex: 0
  },
  sequence: {
    preset: "smallPmf",
    n: 0,
    kIndex: 0,
    conv: []
  },
  continuous: {
    preset: "normalNormal",
    z: 0,
    curve: []
  }
};

function init() {
  bindEvents();
  if (hasDiscrete) {
    setDiscretePreset("dice");
  }
  if (hasSequence) {
    setSequencePreset("smallPmf");
  }
  if (hasContinuous) {
    setContinuousPreset("normalNormal");
  }
  window.addEventListener("resize", renderAll);
}

function bindEvents() {
  if (hasDiscrete) {
    elements.discretePreset.addEventListener("change", () => {
      setDiscretePreset(elements.discretePreset.value);
    });

    elements.discreteZ.addEventListener("input", () => {
      state.discrete.z = Number(elements.discreteZ.value);
      renderDiscrete();
    });

    if (elements.kSlider) {
      elements.kSlider.addEventListener("input", () => {
        state.discrete.kIndex = Number(elements.kSlider.value);
        renderDiscrete();
      });
    }

    if (elements.kPrev) {
      elements.kPrev.addEventListener("click", () => {
        state.discrete.kIndex = Math.max(0, state.discrete.kIndex - 1);
        renderDiscrete();
      });
    }

    if (elements.kNext) {
      elements.kNext.addEventListener("click", () => {
        const preset = discretePresets[state.discrete.preset];
        state.discrete.kIndex = Math.min(sortedKeys(preset.x).length - 1, state.discrete.kIndex + 1);
        renderDiscrete();
      });
    }
  }

  if (hasSequence) {
    elements.sequencePreset.addEventListener("change", () => {
      setSequencePreset(elements.sequencePreset.value);
    });

    elements.outputSlider.addEventListener("input", () => {
      state.sequence.n = Number(elements.outputSlider.value);
      state.sequence.kIndex = 0;
      renderSequence();
    });

    elements.outputPrev.addEventListener("click", () => {
      state.sequence.n = Math.max(0, state.sequence.n - 1);
      state.sequence.kIndex = 0;
      renderSequence();
    });

    elements.outputNext.addEventListener("click", () => {
      state.sequence.n = Math.min(state.sequence.conv.length - 1, state.sequence.n + 1);
      state.sequence.kIndex = 0;
      renderSequence();
    });

    elements.sequenceKSlider.addEventListener("input", () => {
      state.sequence.kIndex = Number(elements.sequenceKSlider.value);
      renderSequence();
    });

    elements.sequenceKPrev.addEventListener("click", () => {
      state.sequence.kIndex = Math.max(0, state.sequence.kIndex - 1);
      renderSequence();
    });

    elements.sequenceKNext.addEventListener("click", () => {
      const preset = sequencePresets[state.sequence.preset];
      state.sequence.kIndex = Math.min(preset.f.length - 1, state.sequence.kIndex + 1);
      renderSequence();
    });
  }

  if (hasContinuous) {
    elements.continuousPreset.addEventListener("change", () => {
      setContinuousPreset(elements.continuousPreset.value);
    });

    elements.continuousZ.addEventListener("input", () => {
      state.continuous.z = Number(elements.continuousZ.value);
      renderContinuous();
    });
  }
}

function setDiscretePreset(name) {
  state.discrete.preset = name;
  const preset = discretePresets[name];
  const conv = convolvePmf(preset.x, preset.y);
  const support = [...conv.keys()].sort((a, b) => a - b);
  const min = support[0];
  const max = support[support.length - 1];
  const current = clamp(Number(elements.discreteZ.value), min, max);

  state.discrete.conv = conv;
  state.discrete.z = Number.isInteger(current) ? current : Math.round((min + max) / 2);
  state.discrete.kIndex = 0;
  elements.discreteZ.min = String(min);
  elements.discreteZ.max = String(max);
  elements.discreteZ.step = "1";
  elements.discreteZ.value = String(state.discrete.z);
  renderDiscrete();
}

function setContinuousPreset(name) {
  state.continuous.preset = name;
  const preset = continuousPresets[name];
  const [min, max] = preset.zRange;

  state.continuous.z = clamp(Number(elements.continuousZ.value), min, max);
  elements.continuousZ.min = String(min);
  elements.continuousZ.max = String(max);
  elements.continuousZ.step = "0.05";
  elements.continuousZ.value = String(state.continuous.z);
  state.continuous.curve = buildContinuousCurve(preset);
  renderContinuous();
}

function setSequencePreset(name) {
  const preset = sequencePresets[name];
  state.sequence.preset = name;
  state.sequence.n = 0;
  state.sequence.kIndex = 0;
  state.sequence.conv = convolveArrays(preset.f, preset.g);
  elements.sequencePreset.value = name;
  renderSequence();
}

function renderAll() {
  if (hasDiscrete) {
    renderDiscrete();
  }
  if (hasSequence) {
    renderSequence();
  }
  if (hasContinuous) {
    renderContinuous();
  }
}

function renderDiscrete() {
  const preset = discretePresets[state.discrete.preset];
  const z = state.discrete.z;
  const conv = state.discrete.conv;
  const probability = conv.get(z) || 0;
  const contributions = getDiscreteContributions(preset.x, preset.y, z);
  const xSupport = sortedKeys(preset.x);
  const ySupport = sortedKeys(preset.y);
  const zSupport = sortedKeys(conv);

  elements.discreteZLabel.textContent = `P(X + Y = ${z})`;
  elements.discreteValue.textContent = formatProb(probability);
  elements.discreteHint.textContent = preset.hint;
  elements.discreteSupportLabel.textContent = `${preset.xName} + ${preset.yName}`;
  elements.pairCount.textContent = `${contributions.length} matching pairs`;

  drawDiscreteCanvas(preset, conv, z);
  renderPairGrid(preset, z, xSupport, ySupport);
  renderDiscreteFormula(contributions, probability, z);
  renderDiscreteStory(contributions, probability, z);
  renderFunctionView(preset, z, probability);
}

function renderContinuous() {
  const preset = continuousPresets[state.continuous.preset];
  const z = state.continuous.z;
  const density = convolutionDensity(preset, z);

  elements.continuousZLabel.textContent = `f_X+Y(${formatNumber(z)})`;
  elements.continuousValue.textContent = formatProb(density);
  elements.continuousHint.textContent = preset.hint;
  elements.overlapLabel.textContent = `${preset.xName}; ${preset.yName}`;
  elements.continuousSupportLabel.textContent = `z in [${preset.zRange.map(formatNumber).join(", ")}]`;

  drawOverlapCanvas(preset, z, density);
  drawContinuousCanvas(preset, state.continuous.curve, z, density);
  renderProcessStrip(preset, z, density);
}

function renderDiscreteStory(contributions, probability, z) {
  if (!elements.discreteStory) {
    return;
  }

  const productBars = contributions.map((item) => {
    const width = probability > 0 ? Math.max(8, (item.value / probability) * 100) : 0;
    return `
      <div class="product-bar" title="${item.x} + ${item.y}">
        <span>${item.x}+${item.y}</span>
        <i style="width: ${width}%"></i>
      </div>
    `;
  }).join("");

  elements.discreteStory.innerHTML = `
    <div class="story-step">
      <span class="step-index">1</span>
      <strong>Choose the output</strong>
      <p>We freeze the sum at z=${z}. Only pairs landing on this diagonal matter.</p>
    </div>
    <div class="story-step">
      <span class="step-index">2</span>
      <strong>Read matching splits</strong>
      <p>${contributions.length} split${contributions.length === 1 ? "" : "s"} survive because each one satisfies x+y=${z}.</p>
    </div>
    <div class="story-step wide">
      <span class="step-index">3</span>
      <strong>Multiply each pair</strong>
      <div class="product-bars">${productBars}</div>
    </div>
    <div class="story-step">
      <span class="step-index">4</span>
      <strong>Add the products</strong>
      <p>The diagonal's total probability is ${formatProb(probability)}.</p>
    </div>
  `;
}

function renderSequence() {
  if (!hasSequence) {
    return;
  }

  const preset = sequencePresets[state.sequence.preset];
  const outputs = state.sequence.conv;
  state.sequence.n = Math.round(clamp(state.sequence.n, 0, outputs.length - 1));
  state.sequence.kIndex = Math.round(clamp(state.sequence.kIndex, 0, preset.f.length - 1));

  const n = state.sequence.n;
  const terms = getSequenceTerms(preset.f, preset.g, n);
  const active = terms[state.sequence.kIndex];
  const partial = terms
    .slice(0, state.sequence.kIndex + 1)
    .reduce((sum, item) => sum + item.product, 0);
  const total = outputs[n] || 0;

  elements.outputSlider.min = "0";
  elements.outputSlider.max = String(outputs.length - 1);
  elements.outputSlider.step = "1";
  elements.outputSlider.value = String(n);
  elements.sequenceKSlider.min = "0";
  elements.sequenceKSlider.max = String(preset.f.length - 1);
  elements.sequenceKSlider.step = "1";
  elements.sequenceKSlider.value = String(state.sequence.kIndex);
  elements.outputPrev.disabled = n === 0;
  elements.outputNext.disabled = n === outputs.length - 1;
  elements.sequenceKPrev.disabled = state.sequence.kIndex === 0;
  elements.sequenceKNext.disabled = state.sequence.kIndex === preset.f.length - 1;
  elements.sequenceStepLabel.textContent = `n=${n}; k step ${state.sequence.kIndex + 1} of ${preset.f.length}`;
  elements.sequenceOutputLabel.textContent = `(f*g)[${n}]`;
  elements.sequenceOutputValue.textContent = formatProb(total);

  elements.sequenceTermFormula.innerHTML = `
    <span>Current k term</span>
    <strong>k = ${active.k}, n-k = ${active.complement}</strong>
    <code>f[${active.k}] * g[${active.complement}] = ${formatProb(active.fk)} * ${formatProb(active.gComplement)}</code>
    <b>${formatProb(active.product)}</b>
  `;

  elements.sequenceAccumulator.innerHTML = `
    <span>Partial sum for (f*g)[${n}]</span>
    <strong>${formatProb(partial)}</strong>
    <code>sum after k=${active.k}</code>
    <p>Full value: ${formatProb(total)}</p>
  `;

  renderSequenceOutputs(outputs);
  renderSequenceTerms(terms, total);
  drawSequenceCanvas(preset, outputs, terms, active, partial, total, n);
}

function renderSequenceOutputs(outputs) {
  const maxOutput = Math.max(...outputs, 0.001);
  const items = outputs.map((value, n) => {
    const active = n === state.sequence.n;
    const width = value > 0 ? Math.max(4, (value / maxOutput) * 100) : 0;
    return `
      <button class="output-pill ${active ? "active" : ""}" type="button" data-output-index="${n}">
        <span>(f*g)[${n}]</span>
        <strong>${formatProb(value)}</strong>
        <i><b style="width: ${width}%"></b></i>
      </button>
    `;
  });

  elements.sequenceOutputs.innerHTML = items.join("");
  elements.sequenceOutputs.querySelectorAll(".output-pill").forEach((button) => {
    button.addEventListener("click", () => {
      state.sequence.n = Number(button.dataset.outputIndex);
      state.sequence.kIndex = 0;
      renderSequence();
    });
  });
}

function renderSequenceTerms(terms, total) {
  const rows = terms.map((item, index) => {
    const active = index === state.sequence.kIndex;
    const width = total > 0 && item.product > 0 ? Math.max(4, (item.product / total) * 100) : 0;
    return `
      <button class="iteration-row ${active ? "active" : ""}" type="button" data-sequence-k-index="${index}">
        <span>k=${item.k}</span>
        <span>g[n-k]=g[${item.complement}]</span>
        <span>${formatProb(item.fk)} * ${formatProb(item.gComplement)}</span>
        <strong>${formatProb(item.product)}</strong>
        <i><b style="width: ${width}%"></b></i>
      </button>
    `;
  });

  elements.sequenceTerms.innerHTML = rows.join("");
  elements.sequenceTerms.querySelectorAll(".iteration-row").forEach((row) => {
    row.addEventListener("click", () => {
      state.sequence.kIndex = Number(row.dataset.sequenceKIndex);
      renderSequence();
    });
  });
}

function renderPairGrid(preset, z, xSupport, ySupport) {
  const columns = ySupport.length + 1;
  const rows = xSupport.length + 1;
  const cells = [];

  cells.push(`<div class="pair-cell header corner">x/y</div>`);
  ySupport.forEach((y) => {
    cells.push(`<div class="pair-cell header col-header">${y}</div>`);
  });

  xSupport.forEach((x) => {
    cells.push(`<div class="pair-cell header row-header">${x}</div>`);
    ySupport.forEach((y) => {
      const value = (preset.x.get(x) || 0) * (preset.y.get(y) || 0);
      const active = x + y === z;
      cells.push(`
        <div class="pair-cell ${active ? "active" : "faint"}" title="${x} + ${y} = ${x + y}">
          ${formatPercent(value)}
        </div>
      `);
    });
  });

  elements.pairGrid.style.gridTemplateColumns = `repeat(${columns}, minmax(42px, 1fr))`;
  elements.pairGrid.style.gridTemplateRows = `repeat(${rows}, 34px)`;
  elements.pairGrid.innerHTML = cells.join("");
}

function renderDiscreteFormula(contributions, probability, z) {
  const rows = contributions.map((item) => `
    <div class="formula-line">
      <strong>${item.x} + ${item.y} = ${z}</strong>
      <span>${formatProb(item.px)} x ${formatProb(item.py)}</span>
      <span>${formatProb(item.value)}</span>
    </div>
  `);

  elements.discreteFormula.innerHTML = `
    ${rows.join("")}
    <div class="formula-line">
      <strong>Total</strong>
      <span>sum of highlighted products</span>
      <span>${formatProb(probability)}</span>
    </div>
  `;
}

function drawSequenceCanvas(preset, outputs, terms, active, partial, total, n) {
  const canvas = setupCanvas(elements.sequenceCanvas);
  const { ctx, width, height } = canvas;
  const kValues = preset.f.map((_, index) => index);
  const maxLaneValue = Math.max(
    ...preset.f,
    ...terms.map((item) => item.gComplement),
    ...terms.map((item) => item.product),
    0.001
  );
  const maxOutput = Math.max(...outputs, 0.001);
  const padding = { left: 58, right: 22, top: 52, bottom: 32 };
  const plotWidth = width - padding.left - padding.right;
  const laneHeight = 72;
  const outputTop = padding.top + laneHeight * 3 + 24;
  const outputHeight = Math.max(72, height - outputTop - padding.bottom);
  const kScale = (k) => {
    if (kValues.length === 1) {
      return padding.left + plotWidth / 2;
    }
    return padding.left + (k / (kValues.length - 1)) * plotWidth;
  };
  const outputScale = (index) => {
    if (outputs.length === 1) {
      return padding.left + plotWidth / 2;
    }
    return padding.left + (index / (outputs.length - 1)) * plotWidth;
  };
  const kBarWidth = Math.max(8, Math.min(24, plotWidth / Math.max(1, kValues.length) * 0.42));
  const outputBarWidth = Math.max(7, Math.min(22, plotWidth / Math.max(1, outputs.length) * 0.48));

  clear(ctx, width, height);
  drawLegend(ctx, [
    { label: "f[k]", color: colors.teal },
    { label: "g[n-k]", color: colors.blue },
    { label: "product", color: colors.amber },
    { label: "output h[n]", color: colors.rust }
  ], padding.left, 24);

  const activeX = kScale(active.k);
  ctx.fillStyle = "rgba(189, 134, 20, 0.14)";
  roundRect(ctx, activeX - kBarWidth * 1.55, padding.top - 10, kBarWidth * 3.1, laneHeight * 3 + 4, 8);
  ctx.fill();

  drawSequenceLane(ctx, "f[k]", kValues, preset.f, maxLaneValue, kScale, padding.top, laneHeight, colors.teal, active.k, kBarWidth);
  drawSequenceLane(ctx, "g[n-k]", kValues, terms.map((item) => item.gComplement), maxLaneValue, kScale, padding.top + laneHeight, laneHeight, colors.blue, active.k, kBarWidth);
  drawSequenceLane(ctx, "product", kValues, terms.map((item) => item.product), maxLaneValue, kScale, padding.top + laneHeight * 2, laneHeight, colors.amber, active.k, kBarWidth);

  drawOutputLane(ctx, outputs, maxOutput, outputScale, outputTop, outputHeight, n, outputBarWidth);

  ctx.fillStyle = colors.ink;
  ctx.font = "800 12px system-ui, sans-serif";
  ctx.fillText(`h[${n}] = sum_k f[k]g[${n}-k]`, padding.left, height - 14);
  drawTextBox(ctx, `partial=${formatProb(partial)} / h[${n}]=${formatProb(total)}`, width - 224, height - 14);
}

function drawSequenceLane(ctx, label, xs, values, maxValue, xScale, top, laneHeight, color, activeIndex, barWidth) {
  const base = top + laneHeight - 16;
  const chartHeight = laneHeight - 30;

  ctx.strokeStyle = colors.line;
  ctx.beginPath();
  ctx.moveTo(58, base);
  ctx.lineTo(xScale(xs[xs.length - 1]) + barWidth / 2, base);
  ctx.stroke();

  ctx.fillStyle = colors.ink;
  ctx.font = "800 12px system-ui, sans-serif";
  ctx.fillText(label, 8, base - chartHeight / 2 + 4);

  xs.forEach((x, index) => {
    const value = values[index] || 0;
    const px = xScale(x);
    const barHeight = value > 0 ? (value / maxValue) * chartHeight : 1;
    const isActive = x === activeIndex;

    ctx.fillStyle = value > 0 ? color : "#dfe6e1";
    roundRect(ctx, px - barWidth / 2, base - barHeight, barWidth, barHeight, 4);
    ctx.fill();

    if (isActive) {
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 2;
      roundRect(ctx, px - barWidth / 2, base - barHeight, barWidth, barHeight, 4);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    if (label === "product") {
      ctx.fillStyle = colors.muted;
      ctx.font = "10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(x), px, base + 16);
      ctx.textAlign = "left";
    }
  });
}

function drawOutputLane(ctx, outputs, maxOutput, outputScale, top, height, activeN, barWidth) {
  const base = top + height - 22;
  const chartHeight = height - 42;

  ctx.strokeStyle = colors.line;
  ctx.beginPath();
  ctx.moveTo(58, base);
  ctx.lineTo(outputScale(outputs.length - 1) + barWidth / 2, base);
  ctx.stroke();

  ctx.fillStyle = colors.ink;
  ctx.font = "800 12px system-ui, sans-serif";
  ctx.fillText("h[n]", 8, base - chartHeight / 2 + 4);

  outputs.forEach((value, n) => {
    const px = outputScale(n);
    const barHeight = value > 0 ? (value / maxOutput) * chartHeight : 1;
    const active = n === activeN;

    ctx.fillStyle = active ? colors.amber : colors.rust;
    roundRect(ctx, px - barWidth / 2, base - barHeight, barWidth, barHeight, 4);
    ctx.fill();

    if (active) {
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 2;
      roundRect(ctx, px - barWidth / 2, base - barHeight, barWidth, barHeight, 4);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    ctx.fillStyle = colors.muted;
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(n), px, base + 16);
    ctx.textAlign = "left";
  });
}

function renderFunctionView(preset, z, probability) {
  if (!elements.functionCanvas) {
    return;
  }

  const terms = getFunctionTerms(preset.x, preset.y, z);
  const lastIndex = terms.length - 1;
  state.discrete.kIndex = Math.round(clamp(state.discrete.kIndex, 0, lastIndex));

  const active = terms[state.discrete.kIndex];
  const partial = terms
    .slice(0, state.discrete.kIndex + 1)
    .reduce((sum, item) => sum + item.product, 0);

  elements.kSlider.min = "0";
  elements.kSlider.max = String(lastIndex);
  elements.kSlider.step = "1";
  elements.kSlider.value = String(state.discrete.kIndex);
  elements.kPrev.disabled = state.discrete.kIndex === 0;
  elements.kNext.disabled = state.discrete.kIndex === lastIndex;
  elements.kStepLabel.textContent = `step ${state.discrete.kIndex + 1} of ${terms.length}`;

  elements.kTermFormula.innerHTML = `
    <span>Current term</span>
    <strong>k = ${active.k}, z-k = ${active.complement}</strong>
    <code>f[${active.k}] x g[${active.complement}] = ${formatProb(active.fk)} x ${formatProb(active.gComplement)}</code>
    <b>${formatProb(active.product)}</b>
  `;

  elements.kAccumulator.innerHTML = `
    <span>Running sum</span>
    <strong>${formatProb(partial)}</strong>
    <code>after ${state.discrete.kIndex + 1} of ${terms.length} k values</code>
    <p>Final h[${z}] = ${formatProb(probability)}</p>
  `;

  renderIterationList(terms, probability);
  drawFunctionCanvas(preset, z, terms, active, partial, probability);
}

function renderIterationList(terms, probability) {
  if (!elements.kIterationList) {
    return;
  }

  let running = 0;
  const rows = terms.map((item, index) => {
    running += item.product;
    const active = index === state.discrete.kIndex;
    const width = probability > 0 ? Math.max(2, (item.product / probability) * 100) : 2;
    return `
      <button class="iteration-row ${active ? "active" : ""}" type="button" data-k-index="${index}">
        <span>k=${item.k}</span>
        <span>g[z-k]=g[${item.complement}]</span>
        <span>${formatProb(item.fk)} x ${formatProb(item.gComplement)}</span>
        <strong>${formatProb(item.product)}</strong>
        <i><b style="width: ${width}%"></b></i>
      </button>
    `;
  });

  elements.kIterationList.innerHTML = rows.join("");
  elements.kIterationList.querySelectorAll(".iteration-row").forEach((row) => {
    row.addEventListener("click", () => {
      state.discrete.kIndex = Number(row.dataset.kIndex);
      renderDiscrete();
    });
  });
}

function drawFunctionCanvas(preset, z, terms, active, partial, probability) {
  const canvas = setupCanvas(elements.functionCanvas);
  const { ctx, width, height } = canvas;
  const xSupport = sortedKeys(preset.x);
  const shiftedGSupport = sortedKeys(preset.y).map((y) => z - y);
  const support = [...new Set([...xSupport, ...shiftedGSupport])].sort((a, b) => a - b);
  const minK = support[0];
  const maxK = support[support.length - 1];
  const maxValue = Math.max(
    ...support.map((k) => preset.x.get(k) || 0),
    ...support.map((k) => preset.y.get(z - k) || 0),
    ...terms.map((item) => item.product),
    0.001
  );
  const padding = { left: 48, right: 24, top: 54, bottom: 90 };
  const plotWidth = width - padding.left - padding.right;
  const laneHeight = (height - padding.top - padding.bottom) / 3;
  const xScale = (k) => {
    if (maxK === minK) {
      return padding.left + plotWidth / 2;
    }
    return padding.left + ((k - minK) / (maxK - minK)) * plotWidth;
  };
  const barWidth = Math.max(7, Math.min(22, plotWidth / Math.max(1, support.length) * 0.45));
  const lanes = [
    { label: "f[k]", color: colors.teal, value: (k) => preset.x.get(k) || 0 },
    { label: "g[z-k]", color: colors.blue, value: (k) => preset.y.get(z - k) || 0 },
    { label: "product", color: colors.amber, value: (k) => (preset.x.get(k) || 0) * (preset.y.get(z - k) || 0) }
  ];

  clear(ctx, width, height);
  drawLegend(ctx, [
    { label: "f[k]", color: colors.teal },
    { label: "g[z-k]", color: colors.blue },
    { label: "f[k]g[z-k]", color: colors.amber }
  ], padding.left, 24);

  const activeX = xScale(active.k);
  ctx.fillStyle = "rgba(189, 134, 20, 0.13)";
  roundRect(ctx, activeX - barWidth * 1.55, padding.top - 12, barWidth * 3.1, height - padding.top - 34, 8);
  ctx.fill();

  lanes.forEach((lane, laneIndex) => {
    const top = padding.top + laneIndex * laneHeight;
    const base = top + laneHeight - 18;
    const chartHeight = laneHeight - 36;

    ctx.strokeStyle = colors.line;
    ctx.beginPath();
    ctx.moveTo(padding.left, base);
    ctx.lineTo(width - padding.right, base);
    ctx.stroke();

    ctx.fillStyle = colors.ink;
    ctx.font = "800 12px system-ui, sans-serif";
    ctx.fillText(lane.label, 10, base - chartHeight / 2 + 4);

    support.forEach((k) => {
      const value = lane.value(k);
      const px = xScale(k);
      const barHeight = value > 0 ? (value / maxValue) * chartHeight : 1;
      const isActive = k === active.k;

      ctx.fillStyle = value > 0 ? lane.color : "#dfe6e1";
      roundRect(ctx, px - barWidth / 2, base - barHeight, barWidth, barHeight, 4);
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = colors.ink;
        ctx.lineWidth = 2;
        roundRect(ctx, px - barWidth / 2, base - barHeight, barWidth, barHeight, 4);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    });
  });

  ctx.fillStyle = colors.muted;
  ctx.font = "10px system-ui, sans-serif";
  ctx.textAlign = "center";
  support.forEach((k) => {
    const px = xScale(k);
    ctx.fillText(String(k), px, height - 58);
  });
  ctx.textAlign = "left";
  ctx.fillStyle = colors.ink;
  ctx.font = "800 12px system-ui, sans-serif";
  ctx.fillText("k axis", padding.left, height - 34);

  drawTextBox(ctx, `z=${z}; current k=${active.k}; z-k=${active.complement}`, padding.left, height - 10);
  drawTextBox(ctx, `partial=${formatProb(partial)} / total=${formatProb(probability)}`, width - 224, height - 10);
}

function drawDiscreteCanvas(preset, conv, selectedZ) {
  const canvas = setupCanvas(elements.discreteCanvas);
  const { ctx, width, height } = canvas;
  const lanes = [
    { name: "P(X=x)", data: preset.x, color: colors.teal },
    { name: "P(Y=y)", data: preset.y, color: colors.blue },
    { name: "P(Z=z)", data: conv, color: colors.rust, selected: selectedZ }
  ];
  const padding = { left: 42, right: 18, top: 20, bottom: 28 };
  const laneHeight = (height - padding.top - padding.bottom) / lanes.length;

  clear(ctx, width, height);
  lanes.forEach((lane, index) => {
    const top = padding.top + index * laneHeight;
    drawBarLane(ctx, lane, padding.left, top, width - padding.left - padding.right, laneHeight - 14);
  });
}

function drawBarLane(ctx, lane, x, y, width, height) {
  const keys = sortedKeys(lane.data);
  const maxValue = Math.max(...keys.map((key) => lane.data.get(key)));
  const gap = Math.max(2, Math.min(8, width / keys.length * 0.16));
  const barWidth = Math.max(4, (width - gap * (keys.length - 1)) / keys.length);
  const chartTop = y + 20;
  const chartHeight = height - 38;
  const base = chartTop + chartHeight;

  ctx.fillStyle = colors.muted;
  ctx.font = "700 12px system-ui, sans-serif";
  ctx.fillText(lane.name, x, y + 10);

  ctx.strokeStyle = colors.line;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x + width, base);
  ctx.stroke();

  keys.forEach((key, index) => {
    const value = lane.data.get(key);
    const left = x + index * (barWidth + gap);
    const barHeight = maxValue > 0 ? (value / maxValue) * chartHeight : 0;
    const isSelected = lane.selected === key;

    ctx.fillStyle = isSelected ? colors.amber : lane.color;
    roundRect(ctx, left, base - barHeight, barWidth, barHeight, 4);
    ctx.fill();

    if (isSelected) {
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 2;
      roundRect(ctx, left, base - barHeight, barWidth, barHeight, 4);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    ctx.fillStyle = colors.muted;
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(key), left + barWidth / 2, base + 14);
    ctx.textAlign = "left";
  });
}

function drawOverlapCanvas(preset, z, density) {
  const canvas = setupCanvas(elements.overlapCanvas);
  const { ctx, width, height } = canvas;
  const [xmin, xmax] = preset.xRange;
  const samples = 260;
  const xs = linspace(xmin, xmax, samples);
  const xVals = xs.map((x) => preset.xPdf(x));
  const shiftedVals = xs.map((x) => preset.yPdf(z - x));
  const productVals = xs.map((x, index) => xVals[index] * shiftedVals[index]);
  const maxY = Math.max(...xVals, ...shiftedVals, ...productVals.map((v) => v * 3), 0.001);
  const plot = makePlot(width, height, xmin, xmax, 0, maxY * 1.15);

  clear(ctx, width, height);
  drawAxes(ctx, plot);
  drawFilledCurve(ctx, plot, xs, productVals.map((v) => v * 3), colors.amberSoft, colors.amber);
  drawCurve(ctx, plot, xs, xVals, colors.teal, 3);
  drawCurve(ctx, plot, xs, shiftedVals, colors.blue, 3);
  drawComplementGuides(ctx, plot, z, xs, xVals, shiftedVals, productVals);
  drawLegend(ctx, [
    { label: "f_X(x)", color: colors.teal },
    { label: "f_Y(z-x)", color: colors.blue },
    { label: "product, scaled", color: colors.amber }
  ], plot.left, 18);
  drawTextBox(ctx, `area = ${formatProb(density)}`, plot.right - 128, 18);
}

function renderProcessStrip(preset, z, density) {
  if (!elements.processStrip) {
    return;
  }

  const [xmin, xmax] = preset.xRange;
  const probeX = clamp(z / 2, xmin, xmax);
  const probeY = z - probeX;
  const fx = preset.xPdf(probeX);
  const fy = preset.yPdf(probeY);
  const product = fx * fy;

  elements.processStrip.innerHTML = `
    <div class="process-step">
      <span class="step-index">1</span>
      <strong>Fix x</strong>
      <p>Pick a possible contribution from X, here x=${formatNumber(probeX)}.</p>
    </div>
    <div class="process-step">
      <span class="step-index">2</span>
      <strong>Match y=z-x</strong>
      <p>For z=${formatNumber(z)}, Y must supply ${formatNumber(probeY)}.</p>
    </div>
    <div class="process-step">
      <span class="step-index">3</span>
      <strong>Multiply densities</strong>
      <p>${formatProb(fx)} x ${formatProb(fy)} = ${formatProb(product)} at this split.</p>
    </div>
    <div class="process-step">
      <span class="step-index">4</span>
      <strong>Average over all splits</strong>
      <p>Integrate every split's product: area = ${formatProb(density)}.</p>
    </div>
  `;
}

function drawComplementGuides(ctx, plot, z, xs, xVals, shiftedVals, productVals) {
  const best = productVals.reduce((bestIndex, value, index) => {
    return value > productVals[bestIndex] ? index : bestIndex;
  }, 0);
  const guideX = xs[best];
  const px = plot.xScale(guideX);
  const topY = Math.min(plot.yScale(xVals[best]), plot.yScale(shiftedVals[best]));

  ctx.strokeStyle = colors.ink;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(px, plot.bottom);
  ctx.lineTo(px, topY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = colors.ink;
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.fillText(`x=${formatNumber(guideX)}`, px + 7, plot.bottom - 9);
  ctx.fillText(`y=z-x=${formatNumber(z - guideX)}`, px + 7, topY - 8);
}

function drawContinuousCanvas(preset, curve, selectedZ, density) {
  const canvas = setupCanvas(elements.continuousCanvas);
  const { ctx, width, height } = canvas;
  const [xmin, xmax] = preset.zRange;
  const maxY = Math.max(...curve.map((point) => point.y), 0.001);
  const plot = makePlot(width, height, xmin, xmax, 0, maxY * 1.18);

  clear(ctx, width, height);
  drawAxes(ctx, plot);
  drawFilledCurve(ctx, plot, curve.map((p) => p.x), curve.map((p) => p.y), colors.rustSoft, colors.rust);

  const markerX = plot.xScale(selectedZ);
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(markerX, plot.top);
  ctx.lineTo(markerX, plot.bottom);
  ctx.stroke();

  ctx.fillStyle = colors.ink;
  ctx.font = "700 12px system-ui, sans-serif";
  ctx.fillText(`z=${formatNumber(selectedZ)}, density=${formatProb(density)}`, plot.left, 20);
}

function convolvePmf(xPmf, yPmf) {
  const result = new Map();
  xPmf.forEach((px, x) => {
    yPmf.forEach((py, y) => {
      result.set(x + y, (result.get(x + y) || 0) + px * py);
    });
  });
  return new Map([...result.entries()].sort((a, b) => a[0] - b[0]));
}

function convolveArrays(f, g) {
  const result = Array.from({ length: f.length + g.length - 1 }, () => 0);
  f.forEach((fv, k) => {
    g.forEach((gv, j) => {
      result[k + j] += fv * gv;
    });
  });
  return result;
}

function getSequenceTerms(f, g, n) {
  return f.map((fk, k) => {
    const complement = n - k;
    const gComplement = complement >= 0 && complement < g.length ? g[complement] : 0;
    return {
      k,
      complement,
      fk,
      gComplement,
      product: fk * gComplement
    };
  });
}

function getDiscreteContributions(xPmf, yPmf, z) {
  const rows = [];
  xPmf.forEach((px, x) => {
    const y = z - x;
    const py = yPmf.get(y) || 0;
    if (py > 0) {
      rows.push({ x, y, px, py, value: px * py });
    }
  });
  return rows.sort((a, b) => a.x - b.x);
}

function getFunctionTerms(fPmf, gPmf, z) {
  return sortedKeys(fPmf).map((k) => {
    const complement = z - k;
    const fk = fPmf.get(k) || 0;
    const gComplement = gPmf.get(complement) || 0;
    return {
      k,
      complement,
      fk,
      gComplement,
      product: fk * gComplement
    };
  });
}

function buildContinuousCurve(preset) {
  const [min, max] = preset.zRange;
  return linspace(min, max, 180).map((z) => ({
    x: z,
    y: convolutionDensity(preset, z)
  }));
}

function convolutionDensity(preset, z) {
  const [min, max] = preset.xRange;
  const steps = 700;
  const dx = (max - min) / steps;
  let area = 0;

  for (let i = 0; i <= steps; i += 1) {
    const x = min + i * dx;
    const weight = i === 0 || i === steps ? 0.5 : 1;
    area += weight * preset.xPdf(x) * preset.yPdf(z - x);
  }

  return area * dx;
}

function uniformPmf(min, max) {
  const result = new Map();
  const p = 1 / (max - min + 1);
  for (let value = min; value <= max; value += 1) {
    result.set(value, p);
  }
  return result;
}

function binomialPmf(n, p) {
  const result = new Map();
  for (let k = 0; k <= n; k += 1) {
    result.set(k, combination(n, k) * p ** k * (1 - p) ** (n - k));
  }
  return result;
}

function poissonPmf(lambda, max) {
  const result = new Map();
  let total = 0;
  for (let k = 0; k <= max; k += 1) {
    const value = Math.exp(-lambda) * lambda ** k / factorial(k);
    result.set(k, value);
    total += value;
  }
  result.forEach((value, key) => {
    result.set(key, value / total);
  });
  return result;
}

function normalPdf(x, mean, sigma) {
  const z = (x - mean) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

function uniformPdf(x, min, max) {
  return x >= min && x <= max ? 1 / (max - min) : 0;
}

function exponentialPdf(x, lambda) {
  return x >= 0 ? lambda * Math.exp(-lambda * x) : 0;
}

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width || canvas.clientWidth || 640));
  const height = Number(canvas.getAttribute("height")) || 320;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

function makePlot(width, height, xmin, xmax, ymin, ymax) {
  const left = 44;
  const right = width - 18;
  const top = 36;
  const bottom = height - 34;
  return {
    left,
    right,
    top,
    bottom,
    xScale: (x) => left + ((x - xmin) / (xmax - xmin)) * (right - left),
    yScale: (y) => bottom - ((y - ymin) / (ymax - ymin)) * (bottom - top)
  };
}

function clear(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcf9";
  ctx.fillRect(0, 0, width, height);
}

function drawAxes(ctx, plot) {
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plot.left, plot.top);
  ctx.lineTo(plot.left, plot.bottom);
  ctx.lineTo(plot.right, plot.bottom);
  ctx.stroke();
}

function drawCurve(ctx, plot, xs, ys, color, lineWidth) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  xs.forEach((x, index) => {
    const px = plot.xScale(x);
    const py = plot.yScale(ys[index]);
    if (index === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  });
  ctx.stroke();
  ctx.lineWidth = 1;
}

function drawFilledCurve(ctx, plot, xs, ys, fill, stroke) {
  ctx.beginPath();
  xs.forEach((x, index) => {
    const px = plot.xScale(x);
    const py = plot.yScale(ys[index]);
    if (index === 0) {
      ctx.moveTo(px, plot.bottom);
      ctx.lineTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  });
  ctx.lineTo(plot.xScale(xs[xs.length - 1]), plot.bottom);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  drawCurve(ctx, plot, xs, ys, stroke, 2);
}

function drawLegend(ctx, items, x, y) {
  ctx.font = "700 12px system-ui, sans-serif";
  let cursor = x;
  items.forEach((item) => {
    ctx.fillStyle = item.color;
    ctx.fillRect(cursor, y - 9, 14, 8);
    cursor += 20;
    ctx.fillStyle = colors.ink;
    ctx.fillText(item.label, cursor, y);
    cursor += ctx.measureText(item.label).width + 18;
  });
}

function drawTextBox(ctx, text, x, y) {
  ctx.font = "800 12px system-ui, sans-serif";
  const width = ctx.measureText(text).width + 18;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = colors.line;
  roundRect(ctx, x, y - 14, width, 24, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colors.ink;
  ctx.fillText(text, x + 9, y + 2);
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function sortedKeys(map) {
  return [...map.keys()].sort((a, b) => a - b);
}

function linspace(min, max, count) {
  if (count === 1) {
    return [min];
  }
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + index * step);
}

function factorial(n) {
  let result = 1;
  for (let i = 2; i <= n; i += 1) {
    result *= i;
  }
  return result;
}

function combination(n, k) {
  return factorial(n) / (factorial(k) * factorial(n - k));
}

function clamp(value, min, max) {
  const number = Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, number));
}

function formatProb(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  if (value === 0) {
    return "0";
  }
  if (value >= 0.001) {
    return value.toFixed(4);
  }
  return value.toExponential(2);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value) {
  return Number(value).toFixed(2).replace(/\.00$/, "");
}

init();
