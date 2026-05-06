const POPUP_MESSAGE_TYPES = {
  ANALYZE_TEXT: "ANALYZE_TEXT",
  IMPORT_SELECTION: "IMPORT_SELECTION"
};

const popupElements = {
  input: document.getElementById("input-text"),
  checkButton: document.getElementById("check-button"),
  importSelectionButton: document.getElementById("import-selection-button"),
  openSidepanelButton: document.getElementById("open-sidepanel-button"),
  scoreSummary: document.getElementById("score-summary"),
  warningList: document.getElementById("warning-list"),
  templateList: document.getElementById("template-list"),
  rewriteList: document.getElementById("rewrite-list")
};

let debounceTimer = null;

document.addEventListener("DOMContentLoaded", () => {
  bindPopupEvents();
  renderEmptyPopup();
});

function bindPopupEvents() {
  popupElements.input.addEventListener("input", () => {
    scheduleAnalyze();
  });

  popupElements.checkButton.addEventListener("click", () => {
    void analyzeNow();
  });

  popupElements.importSelectionButton.addEventListener("click", async () => {
    const response = await chrome.runtime.sendMessage({
      type: POPUP_MESSAGE_TYPES.IMPORT_SELECTION
    });
    if (response?.ok) {
      popupElements.input.value = response.text || "";
      scheduleAnalyze(true);
    }
  });

  popupElements.openSidepanelButton.addEventListener("click", async () => {
    const currentWindow = await chrome.windows.getCurrent();
    await chrome.sidePanel.open({ windowId: currentWindow.id });
  });
}

function scheduleAnalyze(immediate) {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    void analyzeNow();
  }, immediate ? 0 : 200);
}

async function analyzeNow() {
  const response = await chrome.runtime.sendMessage({
    type: POPUP_MESSAGE_TYPES.ANALYZE_TEXT,
    payload: {
      text: popupElements.input.value
    }
  });

  if (!response?.ok) {
    renderPopupError(response?.error || "解析に失敗しました。");
    return;
  }

  renderPopupResult(response.result);
}

function renderEmptyPopup() {
  popupElements.scoreSummary.innerHTML = "";
  popupElements.warningList.innerHTML = "<li class=\"empty-state\">入力待ちです。</li>";
  popupElements.templateList.innerHTML = "<div class=\"empty-state\">候補はここに表示されます。</div>";
  popupElements.rewriteList.innerHTML = "<div class=\"empty-state\">言い換え候補はここに表示されます。</div>";
}

function renderPopupError(message) {
  popupElements.warningList.innerHTML = `<li class="warning-item strong">${escapeHtml(message)}</li>`;
}

function renderPopupResult(result) {
  renderScores(result.scores);
  renderWarnings(result.warnings);
  renderTemplates(result.suggestions.templates);
  renderRewrites(result.suggestions.rewrites);
}

function renderScores(scores) {
  const items = [
    ["総合", scores.total],
    ["丁寧語", scores.teineigo],
    ["尊敬語", scores.sonkeigo],
    ["謙譲語", scores.kenjougo]
  ];
  popupElements.scoreSummary.innerHTML = items.map(([label, value]) => {
    return `<div class="metric-card"><span class="metric-label">${escapeHtml(label)}</span><strong class="metric-value">${value}</strong></div>`;
  }).join("");
}

function renderWarnings(warnings) {
  if (!warnings.length) {
    popupElements.warningList.innerHTML = "<li class=\"empty-state\">大きな警告は見つかりませんでした。</li>";
    return;
  }

  popupElements.warningList.innerHTML = warnings.map((warning) => {
    return `<li class="warning-item ${escapeHtml(warning.severity)}">${escapeHtml(warning.message)}</li>`;
  }).join("");
}

function renderTemplates(templates) {
  if (!templates.length) {
    popupElements.templateList.innerHTML = "<div class=\"empty-state\">候補は見つかりませんでした。</div>";
    return;
  }

  popupElements.templateList.innerHTML = "";
  templates.forEach((template) => {
    const card = document.createElement("div");
    card.className = "suggestion-card";

    const text = document.createElement("p");
    text.className = "suggestion-text";
    text.textContent = template;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip-button";
    button.textContent = "挿入";
    button.addEventListener("click", () => {
      insertAtCursor(popupElements.input, template);
      scheduleAnalyze(true);
    });

    card.append(text, button);
    popupElements.templateList.appendChild(card);
  });
}

function renderRewrites(rewrites) {
  if (!rewrites.length) {
    popupElements.rewriteList.innerHTML = "<div class=\"empty-state\">言い換え候補は見つかりませんでした。</div>";
    return;
  }

  popupElements.rewriteList.innerHTML = "";
  rewrites.forEach((item) => {
    const card = document.createElement("div");
    card.className = "suggestion-card";

    const source = document.createElement("p");
    source.className = "suggestion-source";
    source.textContent = `対象: ${item.source}`;

    const candidates = document.createElement("div");
    candidates.className = "chip-list";

    item.candidates.forEach((candidate) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip-button";
      button.textContent = candidate;
      button.addEventListener("click", () => {
        insertAtCursor(popupElements.input, candidate);
        scheduleAnalyze(true);
      });
      candidates.appendChild(button);
    });

    card.append(source, candidates);
    popupElements.rewriteList.appendChild(card);
  });
}

function insertAtCursor(textarea, value) {
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  textarea.value = `${before}${value}${after}`;
  const next = start + value.length;
  textarea.setSelectionRange(next, next);
  textarea.focus();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
