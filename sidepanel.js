const SIDE_MESSAGE_TYPES = {
  ANALYZE_TEXT: "ANALYZE_TEXT",
  IMPORT_SELECTION: "IMPORT_SELECTION",
  GET_HISTORY: "GET_HISTORY"
};

const sideElements = {
  input: document.getElementById("side-input-text"),
  importSelectionButton: document.getElementById("side-import-selection-button"),
  checkButton: document.getElementById("side-check-button"),
  scoreSummary: document.getElementById("side-score-summary"),
  sentenceResults: document.getElementById("sentence-results"),
  templateList: document.getElementById("side-template-list"),
  rewriteList: document.getElementById("side-rewrite-list"),
  warningList: document.getElementById("side-warning-list"),
  historyList: document.getElementById("history-list"),
  tabButtons: Array.from(document.querySelectorAll(".tab-button")),
  tabPanels: Array.from(document.querySelectorAll(".tab-panel"))
};

let sideDebounceTimer = null;

document.addEventListener("DOMContentLoaded", () => {
  bindSidepanelEvents();
  renderSidepanelEmpty();
  void loadHistory();
});

function bindSidepanelEvents() {
  sideElements.input.addEventListener("input", () => {
    window.clearTimeout(sideDebounceTimer);
    sideDebounceTimer = window.setTimeout(() => {
      void analyzeSidepanel();
    }, 200);
  });

  sideElements.checkButton.addEventListener("click", () => {
    void analyzeSidepanel();
  });

  sideElements.importSelectionButton.addEventListener("click", async () => {
    const response = await chrome.runtime.sendMessage({
      type: SIDE_MESSAGE_TYPES.IMPORT_SELECTION
    });
    if (response?.ok) {
      sideElements.input.value = response.text || "";
      void analyzeSidepanel();
    }
  });

  sideElements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.tab);
    });
  });
}

async function analyzeSidepanel() {
  const response = await chrome.runtime.sendMessage({
    type: SIDE_MESSAGE_TYPES.ANALYZE_TEXT,
    payload: {
      text: sideElements.input.value
    }
  });

  if (!response?.ok) {
    sideElements.warningList.innerHTML = `<li class="warning-item strong">${escapeHtml(response?.error || "解析に失敗しました。")}</li>`;
    return;
  }

  renderSidepanelResult(response.result);
  void loadHistory();
}

async function loadHistory() {
  const response = await chrome.runtime.sendMessage({
    type: SIDE_MESSAGE_TYPES.GET_HISTORY,
    payload: {
      limit: 8
    }
  });

  if (!response?.ok || !response.history?.length) {
    sideElements.historyList.innerHTML = "<li class=\"empty-state\">履歴はありません。</li>";
    return;
  }

  sideElements.historyList.innerHTML = response.history.map((item, index) => {
    const createdAt = new Date(item.createdAt).toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
    return `<li class="history-item"><div><strong>${createdAt}</strong><br>${escapeHtml(item.excerpt)}<br><span class="muted-inline">総合 ${item.scores.total} / トーン ${escapeHtml(item.baseTone || "-")}</span></div><button type="button" class="secondary-button history-load-button" data-index="${index}">再読込</button></li>`;
  }).join("");

  Array.from(sideElements.historyList.querySelectorAll(".history-load-button")).forEach((button) => {
    button.addEventListener("click", () => {
      const item = response.history[Number(button.dataset.index)];
      if (!item) {
        return;
      }
      sideElements.input.value = item.rawText || item.normalizedText || item.excerpt || "";
      void analyzeSidepanel();
    });
  });
}

function renderSidepanelEmpty() {
  sideElements.scoreSummary.innerHTML = "";
  sideElements.sentenceResults.innerHTML = "<div class=\"empty-state\">入力待ちです。</div>";
  sideElements.templateList.innerHTML = "<div class=\"empty-state\">候補はここに表示されます。</div>";
  sideElements.rewriteList.innerHTML = "<div class=\"empty-state\">言い換え候補はここに表示されます。</div>";
  sideElements.warningList.innerHTML = "<li class=\"empty-state\">警告はここに表示されます。</li>";
}

function renderSidepanelResult(result) {
  renderSideScores(result.scores);
  renderSentences(result);
  renderSideTemplates(result.suggestions.templates);
  renderSideRewrites(result.suggestions.rewrites);
  renderSideWarnings(result.warnings);
}

function renderSideScores(scores) {
  const entries = [
    ["総合", scores.total],
    ["丁寧語", scores.teineigo],
    ["尊敬語", scores.sonkeigo],
    ["謙譲語", scores.kenjougo],
    ["定型句", scores.template],
    ["警告", scores.warning]
  ];
  sideElements.scoreSummary.innerHTML = entries.map(([label, value]) => {
    return `<div class="metric-card"><span class="metric-label">${escapeHtml(label)}</span><strong class="metric-value">${value}</strong></div>`;
  }).join("");
}

function renderSentences(result) {
  const sentences = splitByDisplay(result.input.normalizedText);
  sideElements.sentenceResults.innerHTML = sentences.map((sentence) => {
    const badges = result.highlights.filter((item) => {
      return item.start < sentence.end && item.end > sentence.start;
    }).map((item) => `<span class="badge badge-${item.type.toLowerCase()}">${escapeHtml(item.type)}</span>`).join("");
    const warningCount = result.warnings.filter((item) => item.range.start < sentence.end && item.range.end > sentence.start).length;
    return `
      <article class="sentence-item">
        <div class="sentence-meta">
          <div class="badge-row">${badges || "<span class=\"badge\">OK</span>"}</div>
          <span class="muted-inline">警告 ${warningCount}</span>
        </div>
        <p>${escapeHtml(sentence.text)}</p>
      </article>
    `;
  }).join("");
}

function renderSideTemplates(templates) {
  if (!templates.length) {
    sideElements.templateList.innerHTML = "<div class=\"empty-state\">候補は見つかりませんでした。</div>";
    return;
  }

  sideElements.templateList.innerHTML = "";
  templates.forEach((template) => {
    const card = document.createElement("div");
    card.className = "suggestion-card";

    const text = document.createElement("p");
    text.className = "suggestion-text";
    text.textContent = template;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip-button";
    button.textContent = "本文へ挿入";
    button.addEventListener("click", () => {
      insertAtCursor(sideElements.input, template);
      void analyzeSidepanel();
    });

    card.append(text, button);
    sideElements.templateList.appendChild(card);
  });
}

function renderSideRewrites(rewrites) {
  if (!rewrites.length) {
    sideElements.rewriteList.innerHTML = "<div class=\"empty-state\">言い換え候補は見つかりませんでした。</div>";
    return;
  }

  sideElements.rewriteList.innerHTML = "";
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
        insertAtCursor(sideElements.input, candidate);
        void analyzeSidepanel();
      });
      candidates.appendChild(button);
    });

    card.append(source, candidates);
    sideElements.rewriteList.appendChild(card);
  });
}

function renderSideWarnings(warnings) {
  if (!warnings.length) {
    sideElements.warningList.innerHTML = "<li class=\"empty-state\">大きな警告は見つかりませんでした。</li>";
    return;
  }

  sideElements.warningList.innerHTML = warnings.map((warning) => {
    return `<li class="warning-item ${escapeHtml(warning.severity)}">${escapeHtml(warning.message)}</li>`;
  }).join("");
}

function activateTab(tabName) {
  sideElements.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  sideElements.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
}

function splitByDisplay(text) {
  const result = [];
  const parts = text.split(/(?<=[。！？\n])/);
  let cursor = 0;

  parts.forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) {
      cursor += part.length;
      return;
    }
    result.push({
      text: trimmed,
      start: cursor,
      end: cursor + part.length
    });
    cursor += part.length;
  });

  return result;
}

function insertAtCursor(textarea, value) {
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  textarea.value = `${textarea.value.slice(0, start)}${value}${textarea.value.slice(end)}`;
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
