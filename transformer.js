(function () {
  const canvas = document.getElementById("boardCanvas");
  const buttons = Array.from(document.querySelectorAll("[data-step]"));
  const ideaTitle = document.getElementById("ideaTitle");
  const ideaText = document.getElementById("ideaText");
  const intuitionTitle = document.getElementById("intuitionTitle");
  const intuitionText = document.getElementById("intuitionText");

  let step = 0;

  const steps = [
    {
      ideaTitle: "State is the main object.",
      ideaText: "Every token position carries a vector. The table of these vectors is the residual stream.",
      intuitionTitle: "The stream is a shared notebook.",
      intuitionText: "Each layer reads the notebook and writes a small correction into it."
    },
    {
      ideaTitle: "A block has two writes.",
      ideaText: "Attention writes a communication update. The MLP writes a local computation update.",
      intuitionTitle: "The block edits, it does not replace.",
      intuitionText: "The old state stays available because each update is added back."
    },
    {
      ideaTitle: "Attention moves information sideways.",
      ideaText: "One position can copy vector features from other positions into its own stream.",
      intuitionTitle: "Attention is routing.",
      intuitionText: "It decides where to read from, not the final meaning by itself."
    },
    {
      ideaTitle: "The MLP transforms what arrived.",
      ideaText: "After context is gathered, the MLP performs nonlinear computation at that position.",
      intuitionTitle: "Attention gathers; MLP processes.",
      intuitionText: "The MLP can sharpen, combine, or convert features into useful directions."
    },
    {
      ideaTitle: "Depth compounds the edits.",
      ideaText: "Later layers read states already modified by earlier layers.",
      intuitionTitle: "Same operation, richer input.",
      intuitionText: "Early layers may write local syntax; later layers can write relation or task features."
    },
    {
      ideaTitle: "The output head reads the final state.",
      ideaText: "For a decoder, the final position is projected into vocabulary scores.",
      intuitionTitle: "Prediction is a readout.",
      intuitionText: "The answer is not one attention head. It is read from the final residual stream."
    }
  ];

  function fitCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.round(rect.width));
    const height = Math.max(360, Math.min(560, Math.round(width * 0.45)));
    canvas.style.height = `${height}px`;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function arrow(ctx, x1, y1, x2, y2, color, width) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(angle - 0.55) * 9, y2 - Math.sin(angle - 0.55) * 9);
    ctx.lineTo(x2 - Math.cos(angle + 0.55) * 9, y2 - Math.sin(angle + 0.55) * 9);
    ctx.closePath();
    ctx.fill();
  }

  function label(ctx, text, x, y, color) {
    ctx.fillStyle = color;
    ctx.font = "900 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
  }

  function drawRows(ctx, width, height, focus = 3) {
    const tokens = ["The", "animal", "because", "it", "was", "tired"];
    const top = 76;
    const gap = (height - 152) / (tokens.length - 1);
    tokens.forEach((token, i) => {
      const y = top + i * gap;
      const active = i === focus;
      ctx.strokeStyle = active ? "#ffc857" : "rgba(255,244,223,0.3)";
      ctx.lineWidth = active ? 4 : 1.4;
      ctx.beginPath();
      ctx.moveTo(78, y);
      ctx.lineTo(width - 36, y);
      ctx.stroke();
      ctx.fillStyle = active ? "#ffc857" : "#b8c9d8";
      ctx.font = active ? "900 13px Inter, sans-serif" : "800 12px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(token, 14, y + 4);
    });
    return { top, gap };
  }

  function drawWorkspace(ctx, width, height) {
    const rows = drawRows(ctx, width, height);
    label(ctx, "residual stream = vector table", width / 2, 36, "#ffc857");
    for (let i = 0; i < 6; i += 1) {
      const y = rows.top + i * rows.gap;
      ctx.fillStyle = i === 3 ? "#ffc857" : "rgba(255,244,223,0.5)";
      ctx.beginPath();
      ctx.arc(width / 2, y, i === 3 ? 8 : 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBlock(ctx, width, height) {
    const y = height / 2;
    const xs = [0.1, 0.26, 0.42, 0.58, 0.74, 0.9].map((x) => x * width);
    ["x", "attention", "add", "MLP", "add", "next x"].forEach((name, i) => {
      label(ctx, name, xs[i], 42, i === 1 ? "#58a6ff" : i === 3 ? "#c6864a" : "#ffc857");
    });
    for (let i = 0; i < xs.length - 1; i += 1) {
      arrow(ctx, xs[i], y, xs[i + 1] - 18, y, i < 2 ? "#58a6ff" : i < 4 ? "#c6864a" : "#ffc857", 4);
    }
    [1, 3].forEach((i) => {
      roundRect(ctx, xs[i] - 54, y - 34, 108, 68, 12);
      ctx.fillStyle = i === 1 ? "rgba(88,166,255,0.16)" : "rgba(198,134,74,0.18)";
      ctx.fill();
      ctx.strokeStyle = i === 1 ? "#58a6ff" : "#c6864a";
      ctx.lineWidth = 3;
      ctx.stroke();
    });
  }

  function drawAttention(ctx, width, height) {
    const rows = drawRows(ctx, width, height);
    const targetY = rows.top + 3 * rows.gap;
    [1, 2, 4].forEach((source, i) => {
      const y = rows.top + source * rows.gap;
      ctx.strokeStyle = `rgba(88,166,255,${0.55 + i * 0.12})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width * 0.25, y);
      ctx.bezierCurveTo(width * 0.38, y - 44, width * 0.54, targetY - 48 + i * 18, width * 0.72, targetY);
      ctx.stroke();
    });
    label(ctx, "attention routes features between positions", width / 2, 36, "#58a6ff");
  }

  function drawMlp(ctx, width, height) {
    const rows = drawRows(ctx, width, height);
    const y = rows.top + 3 * rows.gap;
    const x = width / 2;
    roundRect(ctx, x - 78, y - 42, 156, 84, 14);
    ctx.fillStyle = "rgba(198,134,74,0.18)";
    ctx.fill();
    ctx.strokeStyle = "#c6864a";
    ctx.lineWidth = 3;
    ctx.stroke();
    label(ctx, "MLP", x, y + 5, "#fff4df");
    arrow(ctx, x - 190, y, x - 88, y, "#ffc857", 4);
    arrow(ctx, x + 88, y, x + 190, y, "#c6864a", 4);
    label(ctx, "local nonlinear edit", x, 36, "#c6864a");
  }

  function drawDepth(ctx, width, height) {
    const y = height / 2;
    const labels = ["raw", "local", "links", "relations", "features", "task"];
    const left = 70;
    const gap = (width - 140) / (labels.length - 1);
    label(ctx, "each layer edits the result of earlier layers", width / 2, 36, "#ffc857");
    ctx.strokeStyle = "rgba(255,244,223,0.26)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - 70, y);
    ctx.stroke();
    labels.forEach((name, i) => {
      const x = left + i * gap;
      ctx.fillStyle = i <= 3 ? "#58a6ff" : "rgba(255,244,223,0.28)";
      ctx.beginPath();
      ctx.arc(x, y, i === 3 ? 15 : 10, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, name, x, y + 40, i === 3 ? "#ffc857" : "#b8c9d8");
    });
  }

  function drawReadout(ctx, width, height) {
    const x = width * 0.26;
    const y = height / 2;
    label(ctx, "final residual state becomes vocabulary scores", width / 2, 36, "#ffc857");
    roundRect(ctx, x - 72, y - 58, 144, 116, 14);
    ctx.fillStyle = "rgba(255,200,87,0.14)";
    ctx.fill();
    ctx.strokeStyle = "#ffc857";
    ctx.lineWidth = 3;
    ctx.stroke();
    label(ctx, "final state", x, y + 5, "#fff4df");
    arrow(ctx, x + 92, y, width * 0.52, y, "#ffc857", 4);
    [["was", 0.76], ["is", 0.52], ["tired", 0.31], ["road", 0.14]].forEach(([word, score], i) => {
      const yy = y - 58 + i * 34;
      ctx.fillStyle = "#b8c9d8";
      ctx.font = "900 13px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(word, width * 0.6, yy + 10);
      ctx.fillStyle = "rgba(255,244,223,0.12)";
      ctx.fillRect(width * 0.62, yy, width * 0.26, 12);
      ctx.fillStyle = i === 0 ? "#ffc857" : "#58a6ff";
      ctx.fillRect(width * 0.62, yy, width * 0.26 * score, 12);
    });
  }

  function render() {
    const { ctx, width, height } = fitCanvas();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#081522";
    ctx.fillRect(0, 0, width, height);

    if (step === 0) drawWorkspace(ctx, width, height);
    if (step === 1) drawBlock(ctx, width, height);
    if (step === 2) drawAttention(ctx, width, height);
    if (step === 3) drawMlp(ctx, width, height);
    if (step === 4) drawDepth(ctx, width, height);
    if (step === 5) drawReadout(ctx, width, height);

    ideaTitle.textContent = steps[step].ideaTitle;
    ideaText.textContent = steps[step].ideaText;
    intuitionTitle.textContent = steps[step].intuitionTitle;
    intuitionText.textContent = steps[step].intuitionText;
    buttons.forEach((button) => button.classList.toggle("active", Number(button.dataset.step) === step));
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      step = Number(button.dataset.step);
      render();
    });
  });
  window.addEventListener("resize", render);
  render();
})();
