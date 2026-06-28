(function () {
  const pageId = document.body.dataset.page || location.pathname.split("/").pop().replace(".html", "");

  document.querySelectorAll("[data-reveal]").forEach((button) => {
    const target = document.getElementById(button.dataset.reveal);
    if (!target) return;
    button.addEventListener("click", () => {
      const open = target.classList.toggle("open");
      button.textContent = open ? "Hide answer" : "Reveal answer";
      button.setAttribute("aria-expanded", String(open));
    });
  });

  document.querySelectorAll("[data-progress]").forEach((input) => {
    const key = `ml-interview:${pageId}:${input.dataset.progress}`;
    input.checked = localStorage.getItem(key) === "1";
    input.addEventListener("change", () => {
      localStorage.setItem(key, input.checked ? "1" : "0");
    });
  });

  document.querySelectorAll("[data-quiz]").forEach((card) => {
    const feedback = card.querySelector(".quiz-feedback");
    card.querySelectorAll("button[data-answer]").forEach((button) => {
      button.addEventListener("click", () => {
        card.querySelectorAll("button[data-answer]").forEach((candidate) => {
          candidate.classList.remove("correct", "wrong");
        });
        const correct = button.dataset.answer === "true";
        button.classList.add(correct ? "correct" : "wrong");
        if (feedback) {
          feedback.textContent = correct
            ? card.dataset.correct
            : card.dataset.wrong;
        }
      });
    });
  });

  const comparison = document.querySelector("[data-comparison]");
  if (comparison) {
    const rows = Array.from(comparison.querySelectorAll("[data-topic]"));
    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.filter;
        document.querySelectorAll("[data-filter]").forEach((candidate) => {
          candidate.classList.toggle("active", candidate === button);
        });
        rows.forEach((row) => {
          row.hidden = filter !== "all" && row.dataset.topic !== filter;
        });
      });
    });
  }
})();
