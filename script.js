const BLANK = "_";
const MAX_TARGET_LENGTH = 6;
const MAX_FRAMES = 10;
const MIN_FRAMES = 2;

const PRESETS = {
  CAT: {
    target: "CAT",
    frames: 6,
    rows: [
      { _: 64, C: 24, A: 6, T: 6 },
      { _: 18, C: 66, A: 10, T: 6 },
      { _: 38, C: 18, A: 34, T: 10 },
      { _: 12, C: 8, A: 70, T: 10 },
      { _: 30, C: 7, A: 20, T: 43 },
      { _: 12, C: 6, A: 10, T: 72 }
    ]
  },
  AA: {
    target: "AA",
    frames: 5,
    rows: [
      { _: 45, A: 55 },
      { _: 28, A: 72 },
      { _: 88, A: 12 },
      { _: 22, A: 78 },
      { _: 42, A: 58 }
    ]
  },
  ABA: {
    target: "ABA",
    frames: 6,
    rows: [
      { _: 52, A: 36, B: 12 },
      { _: 18, A: 70, B: 12 },
      { _: 34, A: 20, B: 46 },
      { _: 14, A: 14, B: 72 },
      { _: 30, A: 56, B: 14 },
      { _: 56, A: 36, B: 8 }
    ]
  },
  HELLO: {
    target: "HELLO",
    frames: 8,
    rows: [
      { _: 54, H: 34, E: 4, L: 4, O: 4 },
      { _: 20, H: 66, E: 6, L: 4, O: 4 },
      { _: 18, H: 8, E: 62, L: 8, O: 4 },
      { _: 36, H: 4, E: 14, L: 42, O: 4 },
      { _: 78, H: 3, E: 4, L: 12, O: 3 },
      { _: 16, H: 4, E: 5, L: 68, O: 7 },
      { _: 22, H: 4, E: 5, L: 18, O: 51 },
      { _: 58, H: 4, E: 4, L: 8, O: 26 }
    ]
  }
};

const elements = {
  presetSelect: document.getElementById("presetSelect"),
  targetInput: document.getElementById("targetInput"),
  frameInput: document.getElementById("frameInput"),
  resetScores: document.getElementById("resetScores"),
  emissionEditorPanel: document.querySelector(".emission-editor"),
  extendedCount: document.getElementById("extendedCount"),
  extendedSequence: document.getElementById("extendedSequence"),
  emissionEditor: document.getElementById("emissionEditor"),
  totalProbability: document.getElementById("totalProbability"),
  finalMass: document.getElementById("finalMass"),
  ctcLoss: document.getElementById("ctcLoss"),
  stepBack: document.getElementById("stepBack"),
  stepForward: document.getElementById("stepForward"),
  playPause: document.getElementById("playPause"),
  stepSlider: document.getElementById("stepSlider"),
  dpTable: document.getElementById("dpTable"),
  cellSummary: document.getElementById("cellSummary"),
  contributorList: document.getElementById("contributorList"),
  formulaBlock: document.getElementById("formulaBlock"),
  betaStepBack: document.getElementById("betaStepBack"),
  betaStepForward: document.getElementById("betaStepForward"),
  betaPlayPause: document.getElementById("betaPlayPause"),
  betaStepSlider: document.getElementById("betaStepSlider"),
  betaTable: document.getElementById("betaTable"),
  betaCellSummary: document.getElementById("betaCellSummary"),
  betaContributorList: document.getElementById("betaContributorList"),
  betaFormulaBlock: document.getElementById("betaFormulaBlock"),
  responsibilityFrame: document.getElementById("responsibilityFrame"),
  responsibilityList: document.getElementById("responsibilityList"),
  pathList: document.getElementById("pathList"),
  pathCount: document.getElementById("pathCount")
};

const state = {
  target: "CAT",
  frames: 6,
  labels: [],
  scores: [],
  selectedStep: 0,
  selectedBetaStep: 0,
  calc: null,
  playing: false,
  playTimer: null,
  betaPlaying: false,
  betaPlayTimer: null
};

function init() {
  if (window.matchMedia("(max-width: 720px)").matches) {
    elements.emissionEditorPanel.open = false;
  }
  loadPreset("CAT");
  bindEvents();
}

function bindEvents() {
  elements.presetSelect.addEventListener("change", () => {
    const value = elements.presetSelect.value;
    if (value === "CUSTOM") {
      loadCustomFromInputs(true);
      return;
    }
    loadPreset(value);
  });

  elements.targetInput.addEventListener("change", () => {
    elements.presetSelect.value = "CUSTOM";
    loadCustomFromInputs(true);
  });

  elements.targetInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      elements.targetInput.blur();
    }
  });

  elements.frameInput.addEventListener("change", () => {
    elements.presetSelect.value = "CUSTOM";
    loadCustomFromInputs(true);
  });

  elements.resetScores.addEventListener("click", () => {
    const preset = elements.presetSelect.value;
    if (PRESETS[preset]) {
      loadPreset(preset);
      return;
    }
    loadCustomFromInputs(true);
  });

  elements.stepBack.addEventListener("click", () => {
    stopPlayback();
    setSelectedStep(state.selectedStep - 1);
  });

  elements.stepForward.addEventListener("click", () => {
    stopPlayback();
    setSelectedStep(state.selectedStep + 1);
  });

  elements.playPause.addEventListener("click", () => {
    if (state.playing) {
      stopPlayback();
    } else {
      startPlayback();
    }
  });

  elements.stepSlider.addEventListener("input", () => {
    stopPlayback();
    setSelectedStep(Number(elements.stepSlider.value));
  });

  elements.betaStepBack.addEventListener("click", () => {
    stopBetaPlayback();
    setSelectedBetaStep(state.selectedBetaStep - 1);
  });

  elements.betaStepForward.addEventListener("click", () => {
    stopBetaPlayback();
    setSelectedBetaStep(state.selectedBetaStep + 1);
  });

  elements.betaPlayPause.addEventListener("click", () => {
    if (state.betaPlaying) {
      stopBetaPlayback();
    } else {
      startBetaPlayback();
    }
  });

  elements.betaStepSlider.addEventListener("input", () => {
    stopBetaPlayback();
    setSelectedBetaStep(Number(elements.betaStepSlider.value));
  });
}

function loadPreset(name) {
  const preset = PRESETS[name] || PRESETS.CAT;
  state.target = preset.target;
  state.frames = preset.frames;
  state.labels = getLabels(state.target);
  state.scores = scoresFromRows(preset.rows, state.labels, state.frames);
  state.selectedStep = 0;
  state.selectedBetaStep = 0;

  elements.presetSelect.value = name;
  elements.targetInput.value = state.target;
  elements.frameInput.value = String(state.frames);
  renderAll();
}

function loadCustomFromInputs(resetScores) {
  const target = sanitizeTarget(elements.targetInput.value);
  const frames = clamp(Number(elements.frameInput.value), MIN_FRAMES, MAX_FRAMES);
  const labels = getLabels(target);

  state.target = target;
  state.frames = frames;
  state.labels = labels;
  elements.targetInput.value = target;
  elements.frameInput.value = String(frames);

  if (resetScores || !scoresMatchLabels(state.scores, labels, frames)) {
    state.scores = generateScores(target, frames, labels);
  } else {
    state.scores = alignScoresToLabels(state.scores, state.labels, labels, frames);
  }

  state.selectedStep = 0;
  state.selectedBetaStep = 0;
  renderAll();
}

function renderAll() {
  stopPlayback();
  stopBetaPlayback();
  state.calc = computeCtc(state.target, state.frames, state.labels, state.scores);
  clampSelectedStep();
  clampSelectedBetaStep();
  renderExtendedTarget();
  renderEmissionEditor();
  renderDerived();
}

function renderDerived() {
  state.calc = computeCtc(state.target, state.frames, state.labels, state.scores);
  clampSelectedStep();
  clampSelectedBetaStep();
  renderMetrics();
  updateStepSlider();
  updateBetaStepSlider();
  updateEmissionProbLabels();
  renderDpTable();
  renderCellDetails();
  renderBetaTable();
  renderBetaCellDetails();
  renderResponsibility();
  renderPaths();
}

function renderExtendedTarget() {
  const ext = state.calc.extended;
  elements.extendedCount.textContent = `${ext.length} states`;
  elements.extendedSequence.innerHTML = ext
    .map((label, index) => {
      const blankClass = label === BLANK ? " blank" : "";
      return `<span class="token${blankClass}" title="state ${index}">${displayLabel(label)}</span>`;
    })
    .join("");
}

function renderEmissionEditor() {
  const html = state.scores
    .map((row, t) => {
      const lines = state.labels
        .map((label, labelIndex) => {
          const blankClass = label === BLANK ? " blank" : "";
          return `
            <label class="score-line">
              <span class="score-label${blankClass}">${displayLabel(label)}</span>
              <input class="score-slider" type="range" min="1" max="100" value="${row[labelIndex]}"
                data-score-slider data-time="${t}" data-label-index="${labelIndex}"
                aria-label="Frame ${t} ${displayLabel(label)} emission score">
              <span class="score-value" data-score-value data-time="${t}" data-label-index="${labelIndex}">0</span>
            </label>
          `;
        })
        .join("");

      return `
        <div class="emission-row">
          <div class="frame-title">
            <strong>Frame t=${t}</strong>
            <span data-row-best="${t}"></span>
          </div>
          <div class="score-list">${lines}</div>
        </div>
      `;
    })
    .join("");

  elements.emissionEditor.innerHTML = html;
  elements.emissionEditor.querySelectorAll("[data-score-slider]").forEach((slider) => {
    slider.addEventListener("input", (event) => {
      const target = event.currentTarget;
      const t = Number(target.dataset.time);
      const labelIndex = Number(target.dataset.labelIndex);
      state.scores[t][labelIndex] = Number(target.value);
      renderDerived();
    });
  });
}

function updateEmissionProbLabels() {
  const probs = state.calc.emissions;
  elements.emissionEditor.querySelectorAll("[data-score-value]").forEach((node) => {
    const t = Number(node.dataset.time);
    const labelIndex = Number(node.dataset.labelIndex);
    node.textContent = formatProb(probs[t][labelIndex]);
  });

  elements.emissionEditor.querySelectorAll("[data-row-best]").forEach((node) => {
    const t = Number(node.dataset.rowBest);
    const row = probs[t];
    const bestIndex = row.reduce((best, value, index) => (value > row[best] ? index : best), 0);
    node.textContent = `best: ${displayLabel(state.labels[bestIndex])}`;
  });
}

function renderMetrics() {
  const { dp, extended, frames } = state.calc;
  const lastFrame = frames - 1;
  const finalLabelMass = extended.length > 1 ? dp[lastFrame][extended.length - 2] : 0;
  const trailingBlankMass = dp[lastFrame][extended.length - 1] || 0;

  elements.totalProbability.textContent = formatProb(state.calc.totalProbability);
  elements.finalMass.textContent = `${formatProb(finalLabelMass)} + ${formatProb(trailingBlankMass)}`;
  elements.ctcLoss.textContent = Number.isFinite(state.calc.loss)
    ? state.calc.loss.toFixed(4)
    : "infinite";
}

function updateStepSlider() {
  const max = state.calc.frames * state.calc.extended.length - 1;
  elements.stepSlider.max = String(max);
  elements.stepSlider.value = String(state.selectedStep);
}

function updateBetaStepSlider() {
  const max = state.calc.frames * state.calc.extended.length - 1;
  elements.betaStepSlider.max = String(max);
  elements.betaStepSlider.value = String(state.selectedBetaStep);
}

function renderDpTable() {
  const { dp, emissions, extended, frames } = state.calc;
  const selected = stepToCell(state.selectedStep, extended.length);
  const sourceSet = getSourceSet(selected.t, selected.s);
  elements.dpTable.style.minWidth = `${72 + extended.length * 78}px`;

  const headerCells = extended
    .map((label, s) => {
      const blankClass = label === BLANK ? " blank" : "";
      return `<th scope="col"><span>s=${s}</span><span class="state-label${blankClass}">${displayLabel(label)}</span></th>`;
    })
    .join("");

  const bodyRows = Array.from({ length: frames }, (_, t) => {
    const cells = extended
      .map((label, s) => {
        const cellStep = cellToStep(t, s, extended.length);
        const isFuture = cellStep > state.selectedStep;
        const isCurrent = t === selected.t && s === selected.s;
        const isSource = sourceSet.has(`${t}:${s}`);
        const isFinal = t === frames - 1 && (s === extended.length - 1 || s === extended.length - 2);
        const classes = [
          "dp-cell",
          isFuture ? "future" : "",
          isCurrent ? "current" : "",
          isSource ? "source" : "",
          isFinal ? "final" : ""
        ]
          .filter(Boolean)
          .join(" ");

        const value = isFuture ? "..." : formatProb(dp[t][s]);
        const emission = emissions[t][labelIndex(label)];

        return `
          <td class="${classes}">
            <button type="button" data-dp-step="${cellStep}" aria-label="Select t ${t}, state ${s}">
              <span class="dp-value">${value}</span>
              <span class="dp-emission">p=${formatProb(emission)}</span>
            </button>
          </td>
        `;
      })
      .join("");

    return `<tr><th class="row-head" scope="row">t=${t}</th>${cells}</tr>`;
  }).join("");

  elements.dpTable.innerHTML = `
    <thead>
      <tr><th class="row-head" scope="col">frame</th>${headerCells}</tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  `;

  elements.dpTable.querySelectorAll("[data-dp-step]").forEach((button) => {
    button.addEventListener("click", (event) => {
      stopPlayback();
      setSelectedStep(Number(event.currentTarget.dataset.dpStep));
    });
  });
}

function renderCellDetails() {
  const selected = stepToCell(state.selectedStep, state.calc.extended.length);
  const detail = state.calc.details[selected.t][selected.s];
  const label = state.calc.extended[selected.s];
  const emission = state.calc.emissions[selected.t][labelIndex(label)];
  const prefix = prefixForState(state.calc.extended, selected.s);

  elements.cellSummary.innerHTML = `
    <div class="summary-item">
      <span>Cell</span>
      <strong>alpha[${selected.t},${selected.s}]</strong>
    </div>
    <div class="summary-item">
      <span>State label</span>
      <strong>${displayLabel(label)}</strong>
    </div>
    <div class="summary-item">
      <span>Prefix represented</span>
      <strong>${prefix || "empty"}</strong>
    </div>
    <div class="summary-item">
      <span>Emission gate</span>
      <strong>p=${formatProb(emission)}</strong>
    </div>
    <div class="summary-item">
      <span>Incoming sum</span>
      <strong>${formatProb(detail.incomingSum)}</strong>
    </div>
    <div class="summary-item">
      <span>Cell value</span>
      <strong>${formatProb(detail.value)}</strong>
    </div>
  `;

  elements.contributorList.innerHTML = detail.contributors
    .map((item) => {
      const allowedClass = item.allowed ? "allowed" : "blocked";
      const value = item.allowed ? formatProb(item.value) : "blocked";
      return `
        <div class="contributor ${allowedClass}">
          <div class="contributor-name">${item.name}</div>
          <div class="contributor-reason">${item.reason}</div>
          <div class="contributor-value">${value}</div>
        </div>
      `;
    })
    .join("");

  elements.formulaBlock.innerHTML = buildFormula(detail, selected.t, selected.s, label, emission);
}

function renderBetaTable() {
  const { beta, dp, extended, frames, totalProbability } = state.calc;
  const selected = betaStepToCell(state.selectedBetaStep, extended.length, frames);
  const sourceSet = getBetaSourceSet(selected.t, selected.s);
  elements.betaTable.style.minWidth = `${72 + extended.length * 78}px`;

  const headerCells = extended
    .map((label, s) => {
      const blankClass = label === BLANK ? " blank" : "";
      return `<th scope="col"><span>s=${s}</span><span class="state-label${blankClass}">${displayLabel(label)}</span></th>`;
    })
    .join("");

  const bodyRows = Array.from({ length: frames }, (_, t) => {
    const cells = extended
      .map((label, s) => {
        const cellStep = betaCellToStep(t, s, extended.length, frames);
        const isFuture = cellStep > state.selectedBetaStep;
        const isCurrent = t === selected.t && s === selected.s;
        const isSource = sourceSet.has(`${t}:${s}`);
        const isFinal = t === frames - 1 && (s === extended.length - 1 || s === extended.length - 2);
        const classes = [
          "dp-cell",
          "beta-cell",
          isFuture ? "future" : "",
          isCurrent ? "current" : "",
          isSource ? "source" : "",
          isFinal ? "final" : ""
        ]
          .filter(Boolean)
          .join(" ");

        const value = isFuture ? "..." : formatProb(beta[t][s]);
        const throughMass = dp[t][s] * beta[t][s];
        const share = totalProbability > 0 ? throughMass / totalProbability : 0;
        const secondLine = isFuture ? "..." : `share=${formatPercent(share)}`;

        return `
          <td class="${classes}">
            <button type="button" data-beta-step="${cellStep}" aria-label="Select beta t ${t}, state ${s}">
              <span class="dp-value">${value}</span>
              <span class="dp-emission">${secondLine}</span>
            </button>
          </td>
        `;
      })
      .join("");

    return `<tr><th class="row-head" scope="row">t=${t}</th>${cells}</tr>`;
  }).join("");

  elements.betaTable.innerHTML = `
    <thead>
      <tr><th class="row-head" scope="col">frame</th>${headerCells}</tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  `;

  elements.betaTable.querySelectorAll("[data-beta-step]").forEach((button) => {
    button.addEventListener("click", (event) => {
      stopBetaPlayback();
      setSelectedBetaStep(Number(event.currentTarget.dataset.betaStep));
    });
  });
}

function renderBetaCellDetails() {
  const selected = betaStepToCell(
    state.selectedBetaStep,
    state.calc.extended.length,
    state.calc.frames
  );
  const detail = state.calc.betaDetails[selected.t][selected.s];
  const label = state.calc.extended[selected.s];
  const prefix = prefixForState(state.calc.extended, selected.s);
  const alphaValue = state.calc.dp[selected.t][selected.s];
  const betaValue = state.calc.beta[selected.t][selected.s];
  const throughMass = alphaValue * betaValue;
  const share = state.calc.totalProbability > 0
    ? throughMass / state.calc.totalProbability
    : 0;

  elements.betaCellSummary.innerHTML = `
    <div class="summary-item">
      <span>Cell</span>
      <strong>beta[${selected.t},${selected.s}]</strong>
    </div>
    <div class="summary-item">
      <span>State label</span>
      <strong>${displayLabel(label)}</strong>
    </div>
    <div class="summary-item">
      <span>Prefix represented</span>
      <strong>${prefix || "empty"}</strong>
    </div>
    <div class="summary-item">
      <span>Future mass</span>
      <strong>${formatProb(betaValue)}</strong>
    </div>
    <div class="summary-item">
      <span>Alpha here</span>
      <strong>${formatProb(alphaValue)}</strong>
    </div>
    <div class="summary-item">
      <span>Target share</span>
      <strong>${formatPercent(share)}</strong>
    </div>
  `;

  elements.betaContributorList.innerHTML = detail.contributors
    .map((item) => {
      const allowedClass = item.allowed ? "allowed" : "blocked";
      const value = item.allowed ? formatProb(item.value) : "blocked";
      return `
        <div class="contributor ${allowedClass}">
          <div class="contributor-name">${item.name}</div>
          <div class="contributor-reason">${item.reason}</div>
          <div class="contributor-value">${value}</div>
        </div>
      `;
    })
    .join("");

  elements.betaFormulaBlock.innerHTML = buildBetaFormula(detail, selected.t, selected.s);
}

function buildBetaFormula(detail, t, s) {
  if (t === state.calc.frames - 1) {
    return `
      <code>beta[${t},${s}] = 1 if this final state already completed the target, else 0</code>
      <p>${detail.contributors[0].reason}</p>
    `;
  }

  const pieces = detail.contributors
    .filter((item) => item.allowed)
    .map((item) => `${formatProb(item.emission)}*${formatProb(item.beta)}`);
  const sumLine = pieces.length ? pieces.join(" + ") : "0";

  return `
    <code>beta[${t},${s}] = ${sumLine}</code>
    <p>Each term is next-frame emission probability times beta at that next state.</p>
  `;
}

function renderResponsibility() {
  const selected = betaStepToCell(
    state.selectedBetaStep,
    state.calc.extended.length,
    state.calc.frames
  );
  const totals = new Map();

  state.calc.extended.forEach((label, s) => {
    const mass = state.calc.dp[selected.t][s] * state.calc.beta[selected.t][s];
    totals.set(label, (totals.get(label) || 0) + mass);
  });

  const rows = state.calc.labels
    .map((label) => {
      const mass = totals.get(label) || 0;
      const share = state.calc.totalProbability > 0 ? mass / state.calc.totalProbability : 0;
      const width = `${Math.min(100, share * 100).toFixed(2)}%`;
      const blankClass = label === BLANK ? " blank" : "";
      return `
        <div class="responsibility-row">
          <span class="score-label${blankClass}">${displayLabel(label)}</span>
          <div class="responsibility-track">
            <span style="width: ${width}"></span>
          </div>
          <strong>${formatPercent(share)}</strong>
        </div>
      `;
    })
    .join("");

  elements.responsibilityFrame.textContent = `frame t=${selected.t}`;
  elements.responsibilityList.innerHTML = `
    <p class="responsibility-note">
      For this frame, sum alpha[t,s] * beta[t,s] over states with the same label,
      then divide by P(target).
    </p>
    ${rows}
  `;
}

function buildFormula(detail, t, s, label, emission) {
  if (t === 0) {
    const startText = detail.incomingSum > 0 ? "start mass = 1" : "start mass = 0";
    return `
      <code>alpha[${t},${s}] = p_${t}(${displayLabel(label)}) * ${startText}</code>
      <p>${formatProb(emission)} * ${formatProb(detail.incomingSum)} = ${formatProb(detail.value)}</p>
    `;
  }

  const pieces = detail.contributors
    .filter((item) => item.allowed)
    .map((item) => formatProb(item.value));
  const sumLine = pieces.length ? pieces.join(" + ") : "0";

  return `
    <code>alpha[${t},${s}] = p_${t}(${displayLabel(label)}) * (${sumLine})</code>
    <p>${formatProb(emission)} * ${formatProb(detail.incomingSum)} = ${formatProb(detail.value)}</p>
  `;
}

function renderPaths() {
  const { paths } = state.calc;
  elements.pathCount.textContent = `${paths.totalCount} total`;

  if (!paths.top.length) {
    elements.pathList.innerHTML = `
      <div class="path-row">
        <div class="path-main">
          <strong>No complete path reaches the final states.</strong>
          <span class="path-prob">P=0</span>
        </div>
      </div>
    `;
    return;
  }

  elements.pathList.innerHTML = paths.top
    .map((path, index) => {
      const raw = path.states
        .map((stateIndex) => {
          const label = state.calc.extended[stateIndex];
          const blankClass = label === BLANK ? " blank" : "";
          return `<span class="path-symbol${blankClass}">${displayLabel(label)}</span>`;
        })
        .join("");

      return `
        <div class="path-row">
          <div class="path-main">
            <strong>#${index + 1} collapses to ${path.collapsed}</strong>
            <span class="path-prob">P=${formatProb(path.probability)}</span>
          </div>
          <div class="path-symbols">${raw}</div>
        </div>
      `;
    })
    .join("");
}

function computeCtc(target, frames, labels, scores) {
  const extended = expandTarget(target);
  const emissions = normalizeScores(scores);
  const dp = Array.from({ length: frames }, () => Array(extended.length).fill(0));
  const details = Array.from({ length: frames }, () => Array(extended.length).fill(null));

  for (let t = 0; t < frames; t += 1) {
    for (let s = 0; s < extended.length; s += 1) {
      const label = extended[s];
      const emission = emissions[t][labels.indexOf(label)];

      if (t === 0) {
        const canStart = s === 0 || s === 1;
        const incomingSum = canStart ? 1 : 0;
        const value = emission * incomingSum;
        dp[t][s] = value;
        details[t][s] = {
          incomingSum,
          value,
          contributors: [
            {
              name: "Start",
              allowed: canStart,
              value: incomingSum,
              reason: canStart
                ? "The first frame may start at the leading blank or first label."
                : "The first frame cannot already be this far through the target."
            }
          ]
        };
        continue;
      }

      const contributors = getContributors(t, s, extended, dp);
      const incomingSum = contributors
        .filter((item) => item.allowed)
        .reduce((sum, item) => sum + item.value, 0);
      const value = emission * incomingSum;

      dp[t][s] = value;
      details[t][s] = {
        incomingSum,
        value,
        contributors
      };
    }
  }

  const last = frames - 1;
  const finalA = dp[last][extended.length - 1] || 0;
  const finalB = extended.length > 1 ? dp[last][extended.length - 2] : 0;
  const totalProbability = finalA + finalB;
  const loss = totalProbability > 0 ? -Math.log(totalProbability) : Infinity;
  const backward = computeBackward(extended, emissions, labels, frames);
  const paths = enumeratePaths(extended, emissions, labels, frames);

  return {
    target,
    frames,
    labels,
    extended,
    emissions,
    dp,
    details,
    beta: backward.beta,
    betaDetails: backward.details,
    totalProbability,
    loss,
    paths
  };
}

function computeBackward(extended, emissions, labels, frames) {
  const beta = Array.from({ length: frames }, () => Array(extended.length).fill(0));
  const details = Array.from({ length: frames }, () => Array(extended.length).fill(null));
  const lastFrame = frames - 1;
  const finalState = extended.length - 1;
  const finalLabelState = extended.length - 2;

  for (let t = lastFrame; t >= 0; t -= 1) {
    for (let s = extended.length - 1; s >= 0; s -= 1) {
      if (t === lastFrame) {
        const canFinish = s === finalState || s === finalLabelState;
        beta[t][s] = canFinish ? 1 : 0;
        details[t][s] = {
          value: beta[t][s],
          contributors: [
            {
              name: "Finish",
              allowed: canFinish,
              value: beta[t][s],
              reason: canFinish
                ? "At the final frame, this state already represents a completed target."
                : "At the final frame, this state has not reached the target ending."
            }
          ]
        };
        continue;
      }

      const contributors = getBackwardContributors(t, s, extended, beta, emissions, labels);
      const value = contributors
        .filter((item) => item.allowed)
        .reduce((sum, item) => sum + item.value, 0);

      beta[t][s] = value;
      details[t][s] = {
        value,
        contributors
      };
    }
  }

  return { beta, details };
}

function getBackwardContributors(t, s, extended, beta, emissions, labels) {
  const contributors = [];
  const nextTime = t + 1;

  const addContributor = (name, nextState, allowed, blockedReason, allowedReason) => {
    const label = allowed ? extended[nextState] : null;
    const emission = allowed ? emissions[nextTime][labels.indexOf(label)] : 0;
    const nextBeta = allowed ? beta[nextTime][nextState] : 0;
    contributors.push({
      name,
      allowed,
      t: nextTime,
      s: nextState,
      emission,
      beta: nextBeta,
      value: emission * nextBeta,
      reason: allowed ? allowedReason(label, nextState) : blockedReason
    });
  };

  addContributor(
    "Stay",
    s,
    true,
    "",
    (label, nextState) => `Use frame t=${nextTime} as ${displayLabel(label)} and remain at s=${nextState}.`
  );

  addContributor(
    "Advance",
    s + 1,
    s + 1 < extended.length,
    "There is no next state to advance into.",
    (label, nextState) => `Use frame t=${nextTime} as ${displayLabel(label)} and advance to s=${nextState}.`
  );

  const skipDestination = s + 2;
  const skipAllowed = skipDestination < extended.length && canSkipTo(skipDestination, extended);
  let skipReason = "There is no state two columns ahead.";
  if (skipDestination < extended.length && extended[skipDestination] === BLANK) {
    skipReason = "Skip is blocked when the destination is blank.";
  } else if (
    skipDestination < extended.length
    && extended[skipDestination] === extended[skipDestination - 2]
  ) {
    skipReason = "Skip is blocked for repeated labels; a blank must separate them.";
  }

  addContributor(
    "Skip",
    skipDestination,
    skipAllowed,
    skipReason,
    (label, nextState) => `Use frame t=${nextTime} as ${displayLabel(label)} and skip to s=${nextState}.`
  );

  return contributors;
}

function getContributors(t, s, extended, dp) {
  const contributors = [];

  contributors.push({
    name: "Stay",
    allowed: true,
    t: t - 1,
    s,
    value: dp[t - 1][s],
    reason: `Remain on state s=${s}.`
  });

  contributors.push({
    name: "Advance",
    allowed: s > 0,
    t: t - 1,
    s: s - 1,
    value: s > 0 ? dp[t - 1][s - 1] : 0,
    reason: s > 0
      ? `Move from state s=${s - 1} to s=${s}.`
      : "There is no previous state to advance from."
  });

  const skipAllowed = canSkipTo(s, extended);
  let skipReason = "Need two earlier states before a skip can exist.";
  if (s > 1 && extended[s] === BLANK) {
    skipReason = "Skip is blocked when the destination is blank.";
  } else if (s > 1 && extended[s] === extended[s - 2]) {
    skipReason = "Skip is blocked for repeated labels; a blank must separate them.";
  } else if (skipAllowed) {
    skipReason = `Jump over blank from state s=${s - 2}.`;
  }

  contributors.push({
    name: "Skip",
    allowed: skipAllowed,
    t: t - 1,
    s: s - 2,
    value: skipAllowed ? dp[t - 1][s - 2] : 0,
    reason: skipReason
  });

  return contributors;
}

function enumeratePaths(extended, emissions, labels, frames) {
  const totalCount = countCompletePaths(extended, frames);
  const topLimit = 8;
  const keepLimit = 5000;
  const initial = [];

  initial.push({
    states: [0],
    probability: emissions[0][labels.indexOf(extended[0])]
  });

  if (extended.length > 1) {
    initial.push({
      states: [1],
      probability: emissions[0][labels.indexOf(extended[1])]
    });
  }

  let active = initial;

  for (let t = 1; t < frames; t += 1) {
    const next = [];
    for (const path of active) {
      const current = path.states[path.states.length - 1];
      for (const nextState of nextStates(current, extended)) {
        const label = extended[nextState];
        const probability = path.probability * emissions[t][labels.indexOf(label)];
        next.push({
          states: [...path.states, nextState],
          probability
        });
      }
    }
    next.sort((a, b) => b.probability - a.probability);
    active = next.slice(0, keepLimit);
  }

  const finalOne = extended.length - 1;
  const finalTwo = extended.length - 2;
  const top = active
    .filter((path) => {
      const lastState = path.states[path.states.length - 1];
      return lastState === finalOne || lastState === finalTwo;
    })
    .map((path) => ({
      ...path,
      collapsed: collapsePath(path.states.map((stateIndex) => extended[stateIndex]))
    }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, topLimit);

  return { totalCount, top };
}

function countCompletePaths(extended, frames) {
  const counts = Array.from({ length: frames }, () => Array(extended.length).fill(0));
  counts[0][0] = 1;
  if (extended.length > 1) {
    counts[0][1] = 1;
  }

  for (let t = 1; t < frames; t += 1) {
    for (let s = 0; s < extended.length; s += 1) {
      for (const nextState of nextStates(s, extended)) {
        counts[t][nextState] += counts[t - 1][s];
      }
    }
  }

  const last = frames - 1;
  return (counts[last][extended.length - 1] || 0) + (counts[last][extended.length - 2] || 0);
}

function nextStates(s, extended) {
  const moves = [s];
  if (s + 1 < extended.length) {
    moves.push(s + 1);
  }
  if (s + 2 < extended.length && canSkipTo(s + 2, extended)) {
    moves.push(s + 2);
  }
  return moves;
}

function canSkipTo(s, extended) {
  return s > 1 && extended[s] !== BLANK && extended[s] !== extended[s - 2];
}

function collapsePath(labels) {
  const merged = [];
  let previous = null;
  for (const label of labels) {
    if (label !== previous) {
      merged.push(label);
    }
    previous = label;
  }
  return merged.filter((label) => label !== BLANK).join("");
}

function getSourceSet(t, s) {
  const detail = state.calc.details[t][s];
  const sourceSet = new Set();
  if (!detail || t === 0) {
    return sourceSet;
  }

  detail.contributors.forEach((item) => {
    if (item.allowed && item.t >= 0 && item.s >= 0) {
      sourceSet.add(`${item.t}:${item.s}`);
    }
  });

  return sourceSet;
}

function getBetaSourceSet(t, s) {
  const detail = state.calc.betaDetails[t][s];
  const sourceSet = new Set();
  if (!detail || t === state.calc.frames - 1) {
    return sourceSet;
  }

  detail.contributors.forEach((item) => {
    if (item.allowed && item.t >= 0 && item.s >= 0) {
      sourceSet.add(`${item.t}:${item.s}`);
    }
  });

  return sourceSet;
}

function setSelectedStep(step) {
  const max = state.calc.frames * state.calc.extended.length - 1;
  state.selectedStep = clamp(step, 0, max);
  renderDerived();
}

function setSelectedBetaStep(step) {
  const max = state.calc.frames * state.calc.extended.length - 1;
  state.selectedBetaStep = clamp(step, 0, max);
  renderDerived();
}

function clampSelectedStep() {
  const max = state.calc.frames * state.calc.extended.length - 1;
  state.selectedStep = clamp(state.selectedStep, 0, max);
}

function clampSelectedBetaStep() {
  const max = state.calc.frames * state.calc.extended.length - 1;
  state.selectedBetaStep = clamp(state.selectedBetaStep, 0, max);
}

function startPlayback() {
  if (state.playing) {
    return;
  }
  state.playing = true;
  elements.playPause.classList.add("playing");
  elements.playPause.textContent = "||";
  elements.playPause.setAttribute("aria-label", "Pause");
  elements.playPause.setAttribute("title", "Pause");

  state.playTimer = window.setInterval(() => {
    const max = state.calc.frames * state.calc.extended.length - 1;
    if (state.selectedStep >= max) {
      setSelectedStep(0);
    } else {
      setSelectedStep(state.selectedStep + 1);
    }
  }, 650);
}

function stopPlayback() {
  if (state.playTimer) {
    window.clearInterval(state.playTimer);
    state.playTimer = null;
  }
  state.playing = false;
  elements.playPause.classList.remove("playing");
  elements.playPause.innerHTML = "&#9654;";
  elements.playPause.setAttribute("aria-label", "Play");
  elements.playPause.setAttribute("title", "Play");
}

function startBetaPlayback() {
  if (state.betaPlaying) {
    return;
  }
  state.betaPlaying = true;
  elements.betaPlayPause.classList.add("playing");
  elements.betaPlayPause.textContent = "||";
  elements.betaPlayPause.setAttribute("aria-label", "Pause backward calculation");
  elements.betaPlayPause.setAttribute("title", "Pause backward calculation");

  state.betaPlayTimer = window.setInterval(() => {
    const max = state.calc.frames * state.calc.extended.length - 1;
    if (state.selectedBetaStep >= max) {
      setSelectedBetaStep(0);
    } else {
      setSelectedBetaStep(state.selectedBetaStep + 1);
    }
  }, 650);
}

function stopBetaPlayback() {
  if (state.betaPlayTimer) {
    window.clearInterval(state.betaPlayTimer);
    state.betaPlayTimer = null;
  }
  state.betaPlaying = false;
  elements.betaPlayPause.classList.remove("playing");
  elements.betaPlayPause.innerHTML = "&#9654;";
  elements.betaPlayPause.setAttribute("aria-label", "Play backward calculation");
  elements.betaPlayPause.setAttribute("title", "Play backward calculation");
}

function stepToCell(step, width) {
  return {
    t: Math.floor(step / width),
    s: step % width
  };
}

function betaStepToCell(step, width, frames) {
  return {
    t: frames - 1 - Math.floor(step / width),
    s: width - 1 - (step % width)
  };
}

function cellToStep(t, s, width) {
  return t * width + s;
}

function betaCellToStep(t, s, width, frames) {
  return (frames - 1 - t) * width + (width - 1 - s);
}

function labelIndex(label) {
  return state.labels.indexOf(label);
}

function sanitizeTarget(value) {
  const cleaned = String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, MAX_TARGET_LENGTH);
  return cleaned || "A";
}

function getLabels(target) {
  const unique = [];
  for (const char of target) {
    if (!unique.includes(char)) {
      unique.push(char);
    }
  }
  return [BLANK, ...unique];
}

function expandTarget(target) {
  const expanded = [BLANK];
  for (const char of target) {
    expanded.push(char, BLANK);
  }
  return expanded;
}

function scoresFromRows(rows, labels, frames) {
  return Array.from({ length: frames }, (_, t) => {
    const row = rows[t] || {};
    return labels.map((label) => Number(row[label] || 1));
  });
}

function generateScores(target, frames, labels) {
  const extended = expandTarget(target);
  return Array.from({ length: frames }, (_, t) => {
    const idealState = frames === 1
      ? 0
      : Math.round((t * (extended.length - 1)) / (frames - 1));
    const previousState = Math.max(0, idealState - 1);
    const nextState = Math.min(extended.length - 1, idealState + 1);

    return labels.map((label) => {
      let score = label === BLANK ? 8 : 4;
      if (label === extended[idealState]) {
        score += 72;
      }
      if (label === extended[previousState]) {
        score += 18;
      }
      if (label === extended[nextState]) {
        score += 18;
      }
      return score;
    });
  });
}

function normalizeScores(scores) {
  return scores.map((row) => {
    const sum = row.reduce((total, value) => total + Math.max(1, Number(value) || 1), 0);
    return row.map((value) => Math.max(1, Number(value) || 1) / sum);
  });
}

function scoresMatchLabels(scores, labels, frames) {
  return Array.isArray(scores)
    && scores.length === frames
    && scores.every((row) => Array.isArray(row) && row.length === labels.length);
}

function alignScoresToLabels(oldScores, oldLabels, newLabels, frames) {
  return Array.from({ length: frames }, (_, t) => {
    const oldRow = oldScores[t] || [];
    return newLabels.map((label) => {
      const oldIndex = oldLabels.indexOf(label);
      return oldIndex >= 0 ? oldRow[oldIndex] || 10 : 10;
    });
  });
}

function prefixForState(extended, s) {
  return extended
    .slice(0, s + 1)
    .filter((label) => label !== BLANK)
    .join("");
}

function displayLabel(label) {
  return label === BLANK ? "-" : label;
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
  if (!Number.isFinite(value)) {
    return "0.0%";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function clamp(value, min, max) {
  const number = Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, number));
}

init();
