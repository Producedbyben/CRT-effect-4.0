(() => {
const FALLBACK_PRESETS = {
  "Consumer CRT Living Room (1987)": {
    scanlineStrength: 0.46,
    phosphorMask: 0.42,
    barrelDistortion: -0.03,
    bloom: 0.44,
    flicker: 0.12,
    chromaticAberration: 0.22,
    noise: 0.16,
    maskScale: 1,
    maskType: "phosphor",
  },
};

function normalizePresetRecord(entry, index = 0) {
  const values = entry?.values && typeof entry.values === "object" ? entry.values : entry;
  const id = String(entry?.id || entry?.name || `preset-${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return {
    id,
    name: entry?.name || id,
    description: entry?.description || "",
    type: entry?.type || "Experimental",
    era: entry?.era || "2000s",
    signalFamily: entry?.signalFamily || "hybrid",
    damageLevel: entry?.damageLevel || "medium",
    tags: Array.isArray(entry?.tags) ? entry.tags : [],
    signalChain: entry?.signalChain || "",
    historicalContext: entry?.historicalContext || "",
    sortOrder: Number.isFinite(entry?.sortOrder) ? entry.sortOrder : index,
    realismScore: Number.isFinite(entry?.realismScore) ? entry.realismScore : 8,
    values,
  };
}

function buildPresetSystem(rawLibrary) {
  const records = (Array.isArray(rawLibrary) ? rawLibrary : []).map(normalizePresetRecord)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const presets = Object.fromEntries(records.map((record) => [record.id, record.values]));
  const byId = Object.fromEntries(records.map((record) => [record.id, record]));
  return { records, presets, byId };
}
  const renderer = new CRTRenderer();
  const canvas = document.getElementById("previewCanvas");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  const statusEl = document.getElementById("status");
  const progressEl = document.getElementById("progress");
  const previewBuffer = document.createElement("canvas");
  const exportBtn = document.getElementById("exportBtn");
  const cancelExportBtn = document.getElementById("cancelExportBtn");
  const resetParamsBtn = document.getElementById("resetParamsBtn");
  const resetSourceBtn = document.getElementById("resetSourceBtn");
  const downloadStillBtn = document.getElementById("downloadStillBtn");
  const imageInput = document.getElementById("imageInput");
  const presetSelect = document.getElementById("presetSelect");
  const presetFilterType = document.getElementById("presetFilterType");
  const presetFilterEra = document.getElementById("presetFilterEra");
  const presetFilterDamage = document.getElementById("presetFilterDamage");
  const presetMeta = document.getElementById("presetMeta");
  const resetPresetBtn = document.getElementById("resetPresetBtn");
  const osdStartDateTimeInput = document.getElementById("osdStartDateTime");
  const osdCountWithExportInput = document.getElementById("osdCountWithExport");
  const osdPrimaryColorInput = document.getElementById("osdPrimaryColor");
  const osdAccentColorInput = document.getElementById("osdAccentColor");
  const osdStyleInput = document.getElementById("advancedOSDStyle");
  const compareHoldBtn = document.getElementById("compareHoldBtn");
  const compareLockBtn = document.getElementById("compareLockBtn");
  const presetDirtyTag = document.getElementById("presetDirtyTag");
  const presetIntensityInput = document.getElementById("presetIntensity");
  const exportEstimateEl = document.getElementById("exportEstimate");
  const densityModeRoot = document.getElementById("densityMode");

  const controlIds = [
    "scanlineStrength",
    "phosphorMask",
    "barrelDistortion",
    "bloom",
    "flicker",
    "chromaticAberration",
    "noise",
    "pixelSize",
    "maskScale",
    "advancedLineJitter",
    "advancedTimebaseWobble",
    "advancedHeadSwitching",
    "advancedChromaDelay",
    "advancedCrossColor",
    "advancedDropouts",
    "advancedGhosting",
    "advancedInterlacing",
    "advancedFrameStutter",
    "advancedRfInterference",
    "advancedExposurePump",
    "advancedWhiteBalanceDrift",
    "advancedFocusBreathing",
    "advancedTapeCrease",
    "advancedTimestampOSD",
    "advancedOSDStyle",
    "advancedCctvMonochrome",
    "advancedQuantization",
    "advancedGenerationLoss",
    "advancedMacroBlocking",
    "advancedFilmGrain",
    "advancedFilmDust",
    "advancedFilmScratches",
    "advancedFilmGateWeave",
    "advancedFilmHalation",
  ];

  const macroControlIds = [
    "macroSourceProvenance",
    "shapeGenerationDepth",
    "macroDisplayEmulation",
    "shapeTubeAge",
    "macroSignalPathDamage",
    "shapePathInstability",
    "macroDistributionArtifacts",
    "shapeEventRate",
    "macroDigitalDecay",
    "shapeBitrateStress",
    "macroRecoveryRuin",
    "shapeTextureKeep",
    "macroEraStyling",
    "shapeOverlayContext",
  ];

  const macroTargetIds = [
    "scanlineStrength", "phosphorMask", "bloom", "flicker", "noise",
    "advancedLineJitter", "advancedTimebaseWobble", "advancedChromaDelay", "advancedCrossColor",
    "advancedDropouts", "advancedTapeCrease", "advancedRfInterference", "advancedInterlacing",
    "advancedQuantization", "advancedMacroBlocking", "advancedFrameStutter", "advancedGenerationLoss",
    "advancedGhosting", "advancedFilmDust", "advancedFilmScratches", "advancedFilmGrain",
    "advancedFilmHalation", "advancedWhiteBalanceDrift", "advancedTimestampOSD",
  ];

  const PARAM_LIMITS = Object.fromEntries(controlIds.map((id) => {
    const input = document.getElementById(id);
    return [id, { min: Number(input?.min), max: Number(input?.max) }];
  }));


  let hasLoadedSource = false;
  let loadedSourceType = "image";
  let loadedVideo = null;
  let loadedImage = null;
  const presetSystem = buildPresetSystem(window.CRT_PRESET_LIBRARY || Object.entries(FALLBACK_PRESETS).map(([name, values], index) => ({ id: `fallback-${index + 1}`, name, values, type: "CRT", era: "1980s", damageLevel: "mild", signalFamily: "analog", tags: ["fallback"], sortOrder: index })));
  const presets = { ...presetSystem.presets };
  const presetRecords = presetSystem.records;
  const presetMetadataById = presetSystem.byId;
  let presetFilters = { type: "all", era: "all", damageLevel: "all" };
  let start = performance.now();
  let previewFrameSeconds = 0;
  let previewTargetSeconds = 0;
  let previewNeedsSeek = false;
  let lastPreviewTick = 0;
  let defaultParamValues = null;
  let activeExportController = null;
  let isExporting = false;
  let previewDirty = true;
  let showOriginalPreview = false;
  let compareLocked = false;
  let activePresetName = null;
  const detachedMacroIds = new Set();
  const presetPinnedIds = new Set();
  const PARAM_POLICY_STORAGE_KEY = "lme:param-policy:v1";
  const EFFECT_PANEL_CONFIGS = {
    crt: {
      toggleId: "crtEffectsEnabled",
      controlIds: ["scanlineStrength", "phosphorMask", "barrelDistortion", "chromaticAberration", "bloom", "flicker", "maskScale"],
    },
    digital: {
      toggleId: "digitalEffectsEnabled",
      controlIds: ["noise", "advancedFrameStutter", "advancedRfInterference", "advancedCctvMonochrome", "advancedQuantization", "advancedGenerationLoss", "advancedMacroBlocking"],
    },
    film: {
      toggleId: "filmEffectsEnabled",
      controlIds: ["advancedFilmGrain", "advancedFilmDust", "advancedFilmScratches", "advancedFilmGateWeave", "advancedFilmHalation", "advancedExposurePump", "advancedWhiteBalanceDrift", "advancedFocusBreathing"],
    },
  };

  const panelEffectState = Object.fromEntries(Object.keys(EFFECT_PANEL_CONFIGS).map((name) => [name, { enabled: true, savedValues: null }]));

  const RANGE_CONTROL_LABELS = {
    scanlineStrength: "Scanline strength",
    phosphorMask: "Mask strength",
    barrelDistortion: "Barrel distortion",
    bloom: "Bloom",
    flicker: "Flicker",
    chromaticAberration: "Chromatic aberration",
    noise: "Noise",
    previewTime: "Preview frame",
    advancedLineJitter: "Line jitter",
    advancedTimebaseWobble: "Timebase wobble",
    advancedHeadSwitching: "Head-switching noise",
    advancedChromaDelay: "Luma/chroma delay",
    advancedCrossColor: "Cross-color artifacts",
    advancedDropouts: "Dropouts/tracking",
    advancedGhosting: "Ghosting/trailing",
    advancedInterlacing: "Interlacing",
    advancedFrameStutter: "Frame stutter/drop",
    advancedRfInterference: "RF interference bands",
    advancedExposurePump: "Exposure pumping",
    advancedWhiteBalanceDrift: "White balance drift",
    advancedFocusBreathing: "Focus breathing",
    advancedTapeCrease: "Tape crease events",
    advancedTimestampOSD: "Timestamp intensity",
    advancedCctvMonochrome: "CCTV monochrome",
    advancedQuantization: "Quantization/crush",
    advancedGenerationLoss: "Generation loss",
    advancedMacroBlocking: "Macroblocking",
    advancedFilmGrain: "Film grain",
    advancedFilmDust: "Film dust/specks",
    advancedFilmScratches: "Film scratches",
    advancedFilmGateWeave: "Gate weave",
    advancedFilmHalation: "Halation glow",
    macroSourceProvenance: "Source Provenance",
    shapeGenerationDepth: "Generation Depth",
    macroDisplayEmulation: "Display Emulation",
    shapeTubeAge: "Tube Age",
    macroSignalPathDamage: "Signal Path Damage",
    shapePathInstability: "Path Instability",
    macroDistributionArtifacts: "Distribution Artifacts",
    shapeEventRate: "Event Rate",
    macroDigitalDecay: "Digital Decay",
    shapeBitrateStress: "Bitrate Stress",
    macroRecoveryRuin: "Recovery ↔ Ruin",
    shapeTextureKeep: "Texture Keep",
    macroEraStyling: "Era Styling",
    shapeOverlayContext: "Overlay Context",
  };

  function setupRangeWithNumber(id) {
    const slider = document.getElementById(id);
    if (!slider) return;
    const wrapper = slider.closest(".range-control");
    if (!wrapper) return;

    const numericInput = document.createElement("input");
    numericInput.type = "number";
    numericInput.className = "range-number";
    numericInput.min = slider.min;
    numericInput.max = slider.max;
    numericInput.step = slider.step || "any";
    numericInput.value = slider.value;
    numericInput.setAttribute("aria-label", `${id} numeric value`);
    wrapper.appendChild(numericInput);

    const supportsInlineReset = id !== "previewTime";
    let resetBtn = null;
    if (supportsInlineReset) {
      resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "range-reset";
      resetBtn.textContent = "↺";
      resetBtn.title = "Reset to default";
      resetBtn.setAttribute("aria-label", `Reset ${RANGE_CONTROL_LABELS[id] || id} to default`);
      wrapper.appendChild(resetBtn);
    }

    const syncToNumber = () => {
      numericInput.value = slider.value;
      numericInput.disabled = slider.disabled;
      if (resetBtn) resetBtn.disabled = slider.disabled;
    };

    const clampToRange = (value) => {
      const min = Number(slider.min);
      const max = Number(slider.max);
      let next = Number(value);
      if (!Number.isFinite(next)) return Number(slider.value);
      if (Number.isFinite(min)) next = Math.max(min, next);
      if (Number.isFinite(max)) next = Math.min(max, next);
      return next;
    };

    numericInput.addEventListener("input", () => {
      const next = clampToRange(numericInput.value);
      slider.value = String(next);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    });

    numericInput.addEventListener("change", () => {
      const next = clampToRange(numericInput.value);
      slider.value = String(next);
      numericInput.value = slider.value;
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    });

    numericInput.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      const baseStep = Number(slider.step) || 1;
      const multiplier = event.shiftKey ? 0.1 : (event.altKey ? 10 : 1);
      const direction = event.key === "ArrowUp" ? 1 : -1;
      const current = Number(slider.value) || 0;
      const next = clampToRange(current + (baseStep * multiplier * direction));
      slider.value = String(next);
      numericInput.value = slider.value;
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    });

    slider.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      if (!event.shiftKey && !event.altKey) return;
      event.preventDefault();
      const direction = (event.key === "ArrowRight" || event.key === "ArrowUp") ? 1 : -1;
      const baseStep = Number(slider.step) || 1;
      const multiplier = event.shiftKey ? 0.1 : 10;
      const current = Number(slider.value) || 0;
      const next = clampToRange(current + (baseStep * multiplier * direction));
      slider.value = String(next);
      numericInput.value = slider.value;
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        resetSingleControlToDefault(id);
        progressEl.value = 0;
        markPreviewDirty();
      });
    }

    slider.addEventListener("input", syncToNumber);
    slider.addEventListener("change", syncToNumber);
    slider.__syncRangeNumber = syncToNumber;
    syncToNumber();
  }

  function setupSelectionBox(id, { onChange, valueParser = (value) => value, disabledWhen } = {}) {
    const root = document.getElementById(id);
    if (!root) return { getValue: () => undefined, setValue: () => {}, setDisabled: () => {} };

    const buttons = Array.from(root.querySelectorAll("button[data-value]"));
    let current = buttons.find((btn) => btn.dataset.selected === "true")?.dataset.value ?? buttons[0]?.dataset.value;

    const setSelectedVisual = () => {
      for (const btn of buttons) {
        const active = btn.dataset.value === current;
        btn.dataset.selected = active ? "true" : "false";
        btn.setAttribute("aria-checked", active ? "true" : "false");
      }
    };

    const setDisabled = (disabled) => {
      root.dataset.disabled = disabled ? "true" : "false";
      for (const btn of buttons) {
        btn.disabled = !!disabled;
      }
    };

    const setValue = (value, { silent = false } = {}) => {
      const next = String(value);
      if (!buttons.some((btn) => btn.dataset.value === next)) return;
      current = next;
      setSelectedVisual();
      if (!silent) onChange?.(valueParser(current));
    };

    for (const btn of buttons) {
      btn.type = "button";
      btn.setAttribute("role", "radio");
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        setValue(btn.dataset.value);
      });
    }

    setSelectedVisual();
    if (typeof disabledWhen === "boolean") setDisabled(disabledWhen);

    return {
      getValue: () => valueParser(current),
      setValue: (value, options) => setValue(value, options),
      setDisabled,
    };
  }

  function setupCollapsiblePanels() {
    const panels = Array.from(document.querySelectorAll(".panel-collapsible"));
    for (const panel of panels) {
      const header = panel.querySelector(":scope > .panel-header");
      const body = panel.querySelector(":scope > .panel-body");
      if (!header || !body) continue;

      let collapseBtn = header.querySelector(".panel-collapse-btn");
      if (!collapseBtn) {
        collapseBtn = document.createElement("button");
        collapseBtn.type = "button";
        collapseBtn.className = "panel-collapse-btn";
        header.appendChild(collapseBtn);
      }

      const isInteractiveTarget = (target) => {
        if (!(target instanceof Element)) return false;
        return Boolean(target.closest("button, input, label, select, textarea, a"));
      };

      const setCollapsed = (collapsed) => {
        panel.dataset.collapsed = collapsed ? "true" : "false";
        panel.classList.toggle("panel-collapsed", collapsed);
        body.setAttribute("aria-hidden", collapsed ? "true" : "false");
        collapseBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
        collapseBtn.setAttribute("aria-label", collapsed ? "Expand panel" : "Collapse panel");
        collapseBtn.textContent = collapsed ? "▸" : "▾";
      };

      setCollapsed(panel.dataset.collapsed === "true");
      collapseBtn.addEventListener("click", () => {
        setCollapsed(!(panel.dataset.collapsed === "true"));
      });

      header.addEventListener("click", (event) => {
        if (event.target === collapseBtn || isInteractiveTarget(event.target)) return;
        setCollapsed(!(panel.dataset.collapsed === "true"));
      });
    }
  }

  function setupTabs() {
    const tabButtons = Array.from(document.querySelectorAll(".tab-btn[data-tab]"));
    const panels = Array.from(document.querySelectorAll(".inspector-tab[data-panel]"));
    if (!tabButtons.length || !panels.length) return;

    const setTab = (name) => {
      for (const button of tabButtons) {
        const isActive = button.dataset.tab === name;
        button.dataset.selected = isActive ? "true" : "false";
      }
      for (const panel of panels) {
        panel.hidden = panel.dataset.panel !== name;
      }
    };

    for (const button of tabButtons) {
      button.addEventListener("click", () => setTab(button.dataset.tab));
    }

    const initial = tabButtons.find((button) => button.dataset.selected === "true")?.dataset.tab || tabButtons[0].dataset.tab;
    setTab(initial);
  }

  function setupQuickJumps() {
    const collapsiblePanels = Array.from(document.querySelectorAll(".panel-collapsible"));
    const collapsePanel = (panel, collapsed) => {
      const body = panel.querySelector(":scope > .panel-body");
      const collapseBtn = panel.querySelector(":scope > .panel-header .panel-collapse-btn");
      if (!body || !collapseBtn) return;
      panel.dataset.collapsed = collapsed ? "true" : "false";
      panel.classList.toggle("panel-collapsed", collapsed);
      body.setAttribute("aria-hidden", collapsed ? "true" : "false");
      collapseBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      collapseBtn.setAttribute("aria-label", collapsed ? "Expand panel" : "Collapse panel");
      collapseBtn.textContent = collapsed ? "▸" : "▾";
    };

    const jumpButtons = Array.from(document.querySelectorAll("[data-jump-target]"));
    for (const button of jumpButtons) {
      button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.jumpTarget || "");
        if (!target) return;

        const tabPanel = target.closest(".inspector-tab[data-panel]");
        if (tabPanel) {
          const tabName = tabPanel.dataset.panel;
          const tabButton = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
          tabButton?.click();
        }

        for (const panel of collapsiblePanels) {
          if (panel.id === "workspacePanel") continue;
          collapsePanel(panel, panel !== target);
        }

        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function setupDensityMode() {
    const storageKey = "crt-ui-density";
    const setDensity = (value) => {
      document.body.dataset.density = value;
      try {
        localStorage.setItem(storageKey, value);
      } catch {
        // No-op if storage is not available.
      }
    };

    const densityControl = setupSelectionBox("densityMode", {
      onChange: (value) => setDensity(value),
    });

    if (!densityModeRoot) return;

    let stored = "comfortable";
    try {
      stored = localStorage.getItem(storageKey) || "comfortable";
    } catch {
      stored = "comfortable";
    }

    const normalized = stored === "compact" ? "compact" : "comfortable";
    densityControl.setValue(normalized, { silent: true });
    setDensity(normalized);
  }

  function setStatus(message, mode = "info") {
    statusEl.textContent = message;
    statusEl.dataset.mode = mode;
  }

  function setExportAvailability() {
    exportBtn.disabled = !hasLoadedSource || isExporting;
    if (downloadStillBtn) downloadStillBtn.disabled = !hasLoadedSource || isExporting;
    cancelExportBtn.disabled = !isExporting;
    resetSourceBtn.disabled = isExporting;
    resetParamsBtn.disabled = isExporting;
    imageInput.disabled = isExporting;
    document.getElementById("fps").disabled = isExporting;
    document.getElementById("duration").disabled = isExporting;
    document.getElementById("exportQuality").disabled = isExporting;
    exportFormatControl?.setDisabled(isExporting);
    exportResolutionControl?.setDisabled(isExporting);
    updateExportControlsState();
  }

  function updateExportEstimate() {
    if (!exportEstimateEl) return;
    const fps = Math.max(1, Number(document.getElementById("fps").value) || 30);
    const duration = Math.max(0.1, Number(document.getElementById("duration").value) || 4);
    const quality = Math.max(0.1, Number(document.getElementById("exportQuality").value) || 1);
    const totalFrames = Math.max(1, Math.round(fps * duration));
    const workloadScore = totalFrames * quality;
    const speedHint = workloadScore > 900 ? "Render load: heavy" : (workloadScore > 420 ? "Render load: medium" : "Render load: light");
    const maxEdge = getExportMaxEdge();
    const limited = fitExportSize(canvas.width, canvas.height, { maxEdge });
    exportEstimateEl.textContent = `Export summary: ${totalFrames} frames at ${fps} FPS (${duration.toFixed(1)}s) • ${limited.width}x${limited.height} • ${speedHint}.`;
  }

  let previewModeControl;
  let previewScaleControl;
  let sourceScaleControl;
  let previewMaxPixelsControl;
  let presetControl;
  let maskTypeControl;
  let exportFormatControl;
  let exportResolutionControl;
  let osdFontPresetControl;
  let osdStyleControl;

  function isStillPreviewMode() {
    return previewModeControl?.getValue() === "still";
  }

  function getPreviewScale() {
    return Math.max(0.1, Number(previewScaleControl?.getValue()) || 1);
  }

  function getSourceScale() {
    return Math.max(0.1, Number(sourceScaleControl?.getValue()) || 1);
  }

  function getPreviewMaxPixels() {
    return Math.max(0, Number(previewMaxPixelsControl?.getValue()) || 0);
  }

  function getExportMaxEdge() {
    return Math.max(0, Number(exportResolutionControl?.getValue()) || 0);
  }

  function markPreviewDirty() {
    previewDirty = true;
  }

  function getPreviewRenderSize() {
    const scale = getPreviewScale();
    let width = Math.max(1, Math.round(canvas.width * scale));
    let height = Math.max(1, Math.round(canvas.height * scale));
    const maxPixels = getPreviewMaxPixels();
    if (maxPixels > 0) {
      const pixels = width * height;
      if (pixels > maxPixels) {
        const factor = Math.sqrt(maxPixels / pixels);
        width = Math.max(1, Math.round(width * factor));
        height = Math.max(1, Math.round(height * factor));
      }
    }
    return { width, height };
  }

  function refreshRendererSource() {
    if (loadedSourceType === "video" && loadedVideo?.video) {
      renderer.setImage(loadedVideo.video, getSourceScale());
      markPreviewDirty();
      return;
    }
    if (loadedSourceType === "image" && loadedImage) {
      renderer.setImage(loadedImage, getSourceScale());
      markPreviewDirty();
    }
  }

  function updatePreviewControlsState() {
    const isVideo = loadedSourceType === "video" && loadedVideo?.video;
    const stillMode = isStillPreviewMode();
    const previewTime = document.getElementById("previewTime");
    const previewFps = document.getElementById("previewFps");

    previewTime.disabled = !isVideo;
    previewFps.disabled = !isVideo || stillMode;
    previewModeControl?.setDisabled(!isVideo);
  }

  function syncPreviewTimeControl() {
    const previewTime = document.getElementById("previewTime");
    const max = loadedVideo?.video?.duration ? Math.max(0, loadedVideo.video.duration - 0.001) : 0;
    previewTime.max = max.toFixed(3);
    previewTargetSeconds = Math.max(0, Math.min(previewTargetSeconds, max));
    previewFrameSeconds = previewTargetSeconds;
    previewTime.value = previewTargetSeconds.toFixed(3);
    previewTime.__syncRangeNumber?.();
    previewNeedsSeek = loadedSourceType === "video";
  }


  function updateExportControlsState() {
    const includeAudio = document.getElementById("includeOriginalAudio");
    const isVideo = loadedSourceType === "video" && loadedVideo?.video;
    includeAudio.disabled = isExporting || !isVideo;
    if (!isVideo) includeAudio.checked = false;
  }

  function syncVideoPlaybackState() {
    const video = loadedVideo?.video;
    if (!video) return;

    if (isStillPreviewMode()) {
      if (!video.paused) {
        video.pause();
      }
      return;
    }

    if (video.paused) {
      video.play().catch(() => {});
    }
  }



  function saveParameterPolicyState() {
    try {
      localStorage.setItem(PARAM_POLICY_STORAGE_KEY, JSON.stringify({
        detached: Array.from(detachedMacroIds),
        pinned: Array.from(presetPinnedIds),
      }));
    } catch {
      // ignore storage failures
    }
  }

  function loadParameterPolicyState() {
    try {
      const raw = localStorage.getItem(PARAM_POLICY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      for (const id of parsed?.detached || []) {
        if (macroTargetIds.includes(id)) detachedMacroIds.add(id);
      }
      for (const id of parsed?.pinned || []) {
        if (macroTargetIds.includes(id)) presetPinnedIds.add(id);
      }
    } catch {
      // ignore malformed state
    }
  }

  function buildMacroPolicyControls() {
    const container = document.getElementById("macroPolicyControls");
    if (!container) return;
    container.innerHTML = "";

    for (const id of macroTargetIds) {
      const row = document.createElement("label");
      row.className = "checkbox-row";
      const pretty = RANGE_CONTROL_LABELS[id] || id;
      row.innerHTML = `<span>${pretty}</span>`;

      const controls = document.createElement("span");
      controls.style.display = "inline-flex";
      controls.style.gap = "0.5rem";

      const detach = document.createElement("input");
      detach.type = "checkbox";
      detach.checked = detachedMacroIds.has(id);
      detach.title = `Detach ${pretty} from macro automation`;
      detach.addEventListener("input", () => {
        if (detach.checked) detachedMacroIds.add(id);
        else detachedMacroIds.delete(id);
        saveParameterPolicyState();
        markPreviewDirty();
      });

      const pin = document.createElement("input");
      pin.type = "checkbox";
      pin.checked = presetPinnedIds.has(id);
      pin.title = `Pin ${pretty} so presets do not overwrite it`;
      pin.addEventListener("input", () => {
        if (pin.checked) presetPinnedIds.add(id);
        else presetPinnedIds.delete(id);
        saveParameterPolicyState();
      });

      const detachWrap = document.createElement("label");
      detachWrap.className = "checkbox-row";
      detachWrap.append(detach, document.createTextNode("Detach"));

      const pinWrap = document.createElement("label");
      pinWrap.className = "checkbox-row";
      pinWrap.append(pin, document.createTextNode("Pin"));

      controls.append(detachWrap, pinWrap);
      row.appendChild(controls);
      container.appendChild(row);
    }
  }

  function randomizeMacroControls(amount = 0.35) {
    for (const id of macroControlIds) {
      const slider = document.getElementById(id);
      if (!slider) continue;
      const min = Number(slider.min);
      const max = Number(slider.max);
      const center = (min + max) * 0.5;
      const span = (max - min) * amount;
      const next = Math.max(min, Math.min(max, center + (Math.random() * 2 - 1) * span));
      slider.value = String(next);
      slider.__syncRangeNumber?.();
    }
    markPreviewDirty();
    progressEl.value = 0;
  }

  function resetMacroControls() {
    for (const id of macroControlIds) {
      const slider = document.getElementById(id);
      if (!slider) continue;
      slider.value = slider.defaultValue;
      slider.__syncRangeNumber?.();
    }
    markPreviewDirty();
    progressEl.value = 0;
  }


  function resetParameters() {
    const targetValues = defaultParamValues || readParams();
    for (const id of [...controlIds, ...macroControlIds]) {
      if (typeof targetValues[id] === "number") {
        const slider = document.getElementById(id);
        slider.value = targetValues[id];
        slider.__syncRangeNumber?.();
      }
    }
    enforceDisabledEffectPanels();
    sourceScaleControl?.setValue("1", { silent: true });
    if (presetIntensityInput) {
      presetIntensityInput.value = "1";
      presetIntensityInput.__syncRangeNumber?.();
    }
    maskTypeControl?.setValue("phosphor", { silent: true });
    refreshRendererSource();
    if (loadedSourceType === "video" && isStillPreviewMode()) {
      previewNeedsSeek = true;
    }
    markPreviewDirty();
    progressEl.value = 0;
    setStatus("Parameters reset to defaults.", "success");
    updatePresetDirtyState();
  }

  function resetSingleControlToDefault(id) {
    const slider = document.getElementById(id);
    if (!slider) return;
    const fallback = Number(slider.defaultValue);
    const defaultValue = defaultParamValues && typeof defaultParamValues[id] === "number"
      ? defaultParamValues[id]
      : (Number.isFinite(fallback) ? fallback : Number(slider.value) || 0);
    slider.value = defaultValue;
    slider.__syncRangeNumber?.();
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    setStatus(`Reset ${id} to default.`, "info");
    updatePresetDirtyState();
  }

  function clearLoadedSource({ silent = false } = {}) {
    if (loadedVideo?.video) {
      loadedVideo.video.pause();
      loadedVideo.video.removeAttribute("src");
      loadedVideo.video.load();
    }
    if (loadedVideo?.objectUrl) {
      URL.revokeObjectURL(loadedVideo.objectUrl);
    }
    if (loadedImage && typeof loadedImage.close === "function") {
      loadedImage.close();
    }

    loadedVideo = null;
    loadedImage = null;
    loadedSourceType = "image";
    hasLoadedSource = false;
    renderer.hasImage = false;

    canvas.width = 960;
    canvas.height = 540;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    imageInput.value = "";
    document.getElementById("duration").value = "4";
    previewTargetSeconds = 0;
    previewFrameSeconds = 0;
    previewNeedsSeek = false;
    syncPreviewTimeControl();
    updatePreviewControlsState();
    updateExportControlsState();
    progressEl.value = 0;
    markPreviewDirty();
    setExportAvailability();
    setCompareState(false, { lock: false });

    if (!silent) {
      setStatus("Source reset. Load a new image or video.", "info");
    }
  }

  function clampControlValue(id, value) {
    const limits = PARAM_LIMITS[id] || {};
    let next = Number.isFinite(value) ? value : 0;
    if (Number.isFinite(limits.min)) next = Math.max(limits.min, next);
    if (Number.isFinite(limits.max)) next = Math.min(limits.max, next);
    return next;
  }

  function addMacroValue(values, id, delta) {
    if (detachedMacroIds.has(id)) return;
    values[id] = clampControlValue(id, Number(values[id] || 0) + delta);
  }

  function applyMacroSystems(values) {
    const macrosEnabled = document.getElementById("macroSystemsEnabled")?.checked !== false;
    if (!macrosEnabled) return values;

    const macro = (id) => Number(document.getElementById(id)?.value || 0);

    const source = macro("macroSourceProvenance");
    const generation = macro("shapeGenerationDepth");
    addMacroValue(values, "advancedGenerationLoss", source * (0.25 + generation * 0.75));
    addMacroValue(values, "noise", source * 0.35);
    addMacroValue(values, "advancedGhosting", source * 0.25 * generation);

    const display = macro("macroDisplayEmulation");
    const tubeAge = macro("shapeTubeAge");
    addMacroValue(values, "scanlineStrength", display * 0.32);
    addMacroValue(values, "phosphorMask", display * 0.28);
    addMacroValue(values, "bloom", display * (0.15 + tubeAge * 0.35));
    addMacroValue(values, "flicker", display * tubeAge * 0.25);

    const signal = macro("macroSignalPathDamage");
    const instability = macro("shapePathInstability");
    addMacroValue(values, "advancedChromaDelay", signal * 0.5);
    addMacroValue(values, "advancedCrossColor", signal * 0.45);
    addMacroValue(values, "advancedLineJitter", signal * (0.2 + instability * 0.45));
    addMacroValue(values, "advancedTimebaseWobble", signal * (0.15 + instability * 0.45));

    const distribution = macro("macroDistributionArtifacts");
    const eventRate = macro("shapeEventRate");
    addMacroValue(values, "advancedDropouts", distribution * (0.25 + eventRate * 0.6));
    addMacroValue(values, "advancedTapeCrease", distribution * eventRate * 0.55);
    addMacroValue(values, "advancedRfInterference", distribution * 0.5);
    addMacroValue(values, "advancedInterlacing", distribution * 0.35);

    const digital = macro("macroDigitalDecay");
    const bitrateStress = macro("shapeBitrateStress");
    addMacroValue(values, "advancedQuantization", digital * (0.2 + bitrateStress * 0.7));
    addMacroValue(values, "advancedMacroBlocking", digital * (0.1 + bitrateStress * 0.85));
    addMacroValue(values, "advancedFrameStutter", digital * bitrateStress * 0.35);

    const recover = macro("macroRecoveryRuin");
    const textureKeep = macro("shapeTextureKeep");
    if (recover >= 0) {
      addMacroValue(values, "noise", recover * (0.25 + (1 - textureKeep) * 0.4));
      addMacroValue(values, "advancedFilmDust", recover * 0.4);
      addMacroValue(values, "advancedFilmScratches", recover * 0.25);
    } else {
      addMacroValue(values, "noise", recover * (0.18 + textureKeep * 0.2));
      addMacroValue(values, "advancedMacroBlocking", recover * 0.15);
      addMacroValue(values, "advancedQuantization", recover * 0.12);
    }

    const era = macro("macroEraStyling");
    const overlay = macro("shapeOverlayContext");
    addMacroValue(values, "advancedFilmGrain", era * 0.45);
    addMacroValue(values, "advancedFilmHalation", era * 0.35);
    addMacroValue(values, "advancedWhiteBalanceDrift", era * 0.3);
    addMacroValue(values, "advancedTimestampOSD", era * (0.15 + overlay * 0.65));

    return values;
  }

  function readParams() {
    const values = Object.fromEntries(controlIds.map((id) => [id, Number(document.getElementById(id).value)]));
    applyMacroSystems(values);
    for (const [panelName, config] of Object.entries(EFFECT_PANEL_CONFIGS)) {
      if (panelEffectState[panelName]?.enabled) continue;
      for (const id of config.controlIds) values[id] = 0;
    }
    values.maskType = maskTypeControl?.getValue() || "phosphor";
    return values;
  }

  function interpolatePresetValues(presetId, intensity = 1) {
    const preset = presets[presetId] || {};
    const expected = {};
    for (const id of controlIds) {
      const slider = document.getElementById(id);
      const neutral = defaultParamValues && typeof defaultParamValues[id] === "number"
        ? defaultParamValues[id]
        : (Number(slider?.defaultValue) || Number(slider?.value) || 0);
      if (typeof preset[id] === "number") {
        const min = Number(slider?.min);
        const max = Number(slider?.max);
        let value = neutral + (preset[id] - neutral) * intensity;
        if (Number.isFinite(min)) value = Math.max(min, value);
        if (Number.isFinite(max)) value = Math.min(max, value);
        expected[id] = value;
      } else {
        expected[id] = neutral;
      }
    }
    return {
      values: expected,
      maskType: typeof preset.maskType === "string" ? preset.maskType : "phosphor",
      keys: controlIds.filter((id) => typeof preset[id] === "number"),
    };
  }

  function readOSDOptions(elapsedSeconds = 0) {
    return {
      osdStartDateTime: osdStartDateTimeInput?.value,
      osdPrimaryColor: osdPrimaryColorInput?.value,
      osdAccentColor: osdAccentColorInput?.value,
      osdFontPreset: osdFontPresetControl?.getValue() || "vhs",
      osdCountWithExport: osdCountWithExportInput?.checked !== false,
      osdElapsedSeconds: elapsedSeconds,
    };
  }

  function applyPreset(presetId, intensity = Number(presetIntensityInput?.value || 1)) {
    const preset = presets[presetId];
    if (!preset) return;
    const mapped = interpolatePresetValues(presetId, intensity);
    for (const id of controlIds) {
      if (presetPinnedIds.has(id)) continue;
      const slider = document.getElementById(id);
      slider.value = mapped.values[id];
      slider.__syncRangeNumber?.();
    }
    maskTypeControl?.setValue(mapped.maskType, { silent: true });
    enforceDisabledEffectPanels();
    activePresetName = presetId;
    updatePresetDirtyState();
  }

  function updatePresetDirtyState() {
    if (!presetDirtyTag) return;
    if (!activePresetName) {
      presetDirtyTag.hidden = true;
      return;
    }

    const intensity = Number(presetIntensityInput?.value || 1);
    const expected = interpolatePresetValues(activePresetName, intensity);
    const current = readParams();
    const changedSliders = controlIds.some((id) => Math.abs(Number(current[id] ?? 0) - Number(expected.values[id] ?? 0)) > 0.0001);
    const changedMask = (current.maskType || "phosphor") !== expected.maskType;
    presetDirtyTag.hidden = !(changedSliders || changedMask);
  }

  function getFilteredPresetRecords() {
    return presetRecords.filter((record) => {
      if (presetFilters.type !== "all" && record.type !== presetFilters.type) return false;
      if (presetFilters.era !== "all" && record.era !== presetFilters.era) return false;
      if (presetFilters.damageLevel !== "all" && record.damageLevel !== presetFilters.damageLevel) return false;
      return true;
    });
  }

  function renderPresetMeta(presetId) {
    if (!presetMeta) return;
    const meta = presetMetadataById[presetId];
    if (!meta) {
      presetMeta.innerHTML = "";
      return;
    }
    presetMeta.innerHTML = `<strong>${meta.name}</strong><div>${meta.description}</div><div class="preset-meta-tags">${meta.type} · ${meta.era} · ${meta.signalFamily} · ${meta.damageLevel}</div><div>${meta.signalChain}</div><div class="preset-meta-context">${meta.historicalContext}</div><div>Realism score: ${meta.realismScore.toFixed(1)}/10</div>`;
  }

  function initializePresetFilters() {
    const unique = (key) => ["all", ...Array.from(new Set(presetRecords.map((r) => r[key])) )];
    const populate = (el, values) => {
      if (!el) return;
      el.innerHTML = "";
      for (const value of values) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.value = value;
        button.textContent = value === "all" ? "All" : value;
        if (value === "all") button.dataset.selected = "true";
        el.appendChild(button);
      }
    };
    populate(presetFilterType, unique("type"));
    populate(presetFilterEra, unique("era"));
    populate(presetFilterDamage, unique("damageLevel"));

    setupSelectionBox("presetFilterType", { onChange: (value) => { presetFilters.type = value; initializePresets(); } });
    setupSelectionBox("presetFilterEra", { onChange: (value) => { presetFilters.era = value; initializePresets(); } });
    setupSelectionBox("presetFilterDamage", { onChange: (value) => { presetFilters.damageLevel = value; initializePresets(); } });
  }

  function initializePresets(preferredId = activePresetName) {
    const visibleRecords = getFilteredPresetRecords();
    presetSelect.innerHTML = "";

    if (visibleRecords.length === 0) {
      const message = document.createElement("div");
      message.className = "selection-empty";
      message.textContent = "No presets match current filters";
      presetSelect.appendChild(message);
      return;
    }

    for (const record of visibleRecords) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.value = record.id;
      button.textContent = record.name;
      if (record.id === preferredId) button.dataset.selected = "true";
      presetSelect.appendChild(button);
    }

    presetControl = setupSelectionBox("presetSelect", {
      onChange: (presetId) => {
        if (presetIntensityInput) {
          presetIntensityInput.value = "1";
          presetIntensityInput.__syncRangeNumber?.();
        }
        applyPreset(presetId, 1);
        renderPresetMeta(presetId);
        markPreviewDirty();
        progressEl.value = 0;
        setStatus(`Preset applied: ${presetMetadataById[presetId]?.name || presetId}`, "success");
      },
    });

    const defaultPresetId = visibleRecords.find((r) => r.id === preferredId)?.id || visibleRecords[0].id;
    presetControl.setValue(defaultPresetId, { silent: true });
    applyPreset(defaultPresetId, Number(presetIntensityInput?.value || 1));
    renderPresetMeta(defaultPresetId);
    updatePresetDirtyState();
  }

  async function loadImageFromFile(file) {
    if ("createImageBitmap" in window) {
      try {
        return await createImageBitmap(file);
      } catch (error) {
        console.warn("createImageBitmap failed; falling back to Image.decode", error);
      }
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    try {
      await img.decode();
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
    return img;
  }

  function waitForVideoEvent(video, eventName) {
    return new Promise((resolve) => {
      const handler = () => {
        video.removeEventListener(eventName, handler);
        resolve();
      };
      video.addEventListener(eventName, handler, { once: true });
    });
  }

  function waitForVideoReady(video, { timeoutMs = 1500 } = {}) {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      let timeoutId = null;
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        video.removeEventListener("loadeddata", handleReady);
        video.removeEventListener("canplay", handleReady);
        video.removeEventListener("error", handleError);
      };

      const handleReady = () => {
        cleanup();
        resolve(true);
      };

      const handleError = () => {
        cleanup();
        resolve(false);
      };

      timeoutId = setTimeout(() => {
        cleanup();
        resolve(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
      }, Math.max(0, timeoutMs));

      video.addEventListener("loadeddata", handleReady, { once: true });
      video.addEventListener("canplay", handleReady, { once: true });
      video.addEventListener("error", handleError, { once: true });
    });
  }

  async function ensureVideoFrameReady(video) {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return true;

    let ready = await waitForVideoReady(video, { timeoutMs: 1200 });
    if (ready) return true;

    try {
      await video.play();
    } catch {
      // ignore autoplay failures; we'll still wait briefly for decode readiness
    }

    ready = await waitForVideoReady(video, { timeoutMs: 1200 });
    if (!video.paused) {
      video.pause();
    }
    return ready;
  }

  async function loadVideoFromFile(file) {
    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.load();
    await waitForVideoEvent(video, "loadedmetadata");
    await ensureVideoFrameReady(video);
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error("Video metadata is invalid or duration is unavailable.");
    }
    return { video, objectUrl };
  }

  async function seekVideo(video, timeSeconds) {
    const clamped = Math.max(0, Math.min(timeSeconds, Math.max(0, video.duration - 0.000001)));
    if (Math.abs(video.currentTime - clamped) < 0.0005) return;
    video.currentTime = clamped;
    await waitForVideoEvent(video, "seeked");
  }

  function animate(now) {
    const fps = Math.max(1, Number(document.getElementById("fps").value) || 30);
    const elapsed = (now - start) / 1000;
    const frame = Math.floor(elapsed * fps);
    const stillMode = isStillPreviewMode();

    if (!isExporting && loadedSourceType === "video" && loadedVideo?.video) {
      const video = loadedVideo.video;
      syncVideoPlaybackState();
      if (isStillPreviewMode()) {
        if (previewNeedsSeek || Math.abs(video.currentTime - previewTargetSeconds) > 0.0005) {
          previewNeedsSeek = false;
          seekVideo(video, previewTargetSeconds)
            .then(() => {
              previewFrameSeconds = previewTargetSeconds;
              renderer.setImage(video, getSourceScale());
              markPreviewDirty();
            })
            .catch((error) => {
              previewNeedsSeek = true;
              console.warn("Preview seek failed", error);
            });
        }
      } else {
        const previewFps = Math.max(1, Number(document.getElementById("previewFps").value) || 15);
        const minInterval = 1000 / previewFps;
        if (now - lastPreviewTick >= minInterval) {
          lastPreviewTick = now;
          renderer.setImage(video, getSourceScale());
          previewFrameSeconds = video.currentTime;
          markPreviewDirty();
          previewTargetSeconds = previewFrameSeconds;
          document.getElementById("previewTime").value = previewFrameSeconds.toFixed(3);
          document.getElementById("previewTime").__syncRangeNumber?.();
        }
      }
    }

    const shouldRender = previewDirty;
    if (shouldRender) {
      if (showOriginalPreview && renderer.hasImage) {
        const source = loadedSourceType === "video" ? loadedVideo?.video : loadedImage;
        if (source) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "black";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const srcW = source.videoWidth || source.naturalWidth || canvas.width;
          const srcH = source.videoHeight || source.naturalHeight || canvas.height;
          const scale = Math.min(canvas.width / srcW, canvas.height / srcH);
          const drawW = Math.max(1, Math.round(srcW * scale));
          const drawH = Math.max(1, Math.round(srcH * scale));
          ctx.drawImage(source, (canvas.width - drawW) / 2, (canvas.height - drawH) / 2, drawW, drawH);
          previewDirty = false;
          requestAnimationFrame(animate);
          return;
        }
      }
      const { width: previewWidth, height: previewHeight } = getPreviewRenderSize();
      if (previewWidth === canvas.width && previewHeight === canvas.height) {
        renderer.render(ctx, canvas.width, canvas.height, frame / fps, readParams(), frame, fps, readOSDOptions(loadedSourceType === "video" ? previewFrameSeconds : frame / fps));
      } else {
        previewBuffer.width = previewWidth;
        previewBuffer.height = previewHeight;
        const previewCtx = previewBuffer.getContext("2d", { alpha: false, desynchronized: true });
        renderer.render(previewCtx, previewBuffer.width, previewBuffer.height, frame / fps, readParams(), frame, fps, readOSDOptions(loadedSourceType === "video" ? previewFrameSeconds : frame / fps));
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(previewBuffer, 0, 0, canvas.width, canvas.height);
      }
      previewDirty = false;
    }
    requestAnimationFrame(animate);
  }

  imageInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isExporting) return;
    clearLoadedSource({ silent: true });

    progressEl.value = 0.05;
    setStatus(`Processing ${file.name} (${Math.round(file.size / 1024)} KB)...`, "info");

    try {
      if (file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name)) {
        const videoSource = await loadVideoFromFile(file);
        progressEl.value = 0.4;
        renderer.setImage(videoSource.video, getSourceScale());
        loadedVideo = videoSource;
        loadedSourceType = "video";

        canvas.width = videoSource.video.videoWidth;
        canvas.height = videoSource.video.videoHeight;
        document.getElementById("duration").value = Math.max(0.5, videoSource.video.duration).toFixed(2);
        previewTargetSeconds = 0;
        previewFrameSeconds = 0;
        syncPreviewTimeControl();
        updatePreviewControlsState();
        updateExportControlsState();
        syncVideoPlaybackState();
        markPreviewDirty();

        setStatus(`Loaded video ${file.name} (${videoSource.video.videoWidth}x${videoSource.video.videoHeight}, ${videoSource.video.duration.toFixed(2)}s). Ready to export.`, "success");
      } else {
        const imageSource = await loadImageFromFile(file);
        progressEl.value = 0.4;
        loadedImage = imageSource;
        renderer.setImage(imageSource, getSourceScale());
        loadedSourceType = "image";
        canvas.width = imageSource.naturalWidth || imageSource.width || canvas.width;
        canvas.height = imageSource.naturalHeight || imageSource.height || canvas.height;
        previewTargetSeconds = 0;
        previewFrameSeconds = 0;
        syncPreviewTimeControl();
        updatePreviewControlsState();
        updateExportControlsState();
        markPreviewDirty();
        setStatus(`Loaded image ${file.name} (${canvas.width}x${canvas.height}). Ready to export.`, "success");
      }

      progressEl.value = 1;
      hasLoadedSource = true;
      setExportAvailability();
      start = performance.now();
    } catch (error) {
      hasLoadedSource = false;
      progressEl.value = 0;
      setExportAvailability();
      setStatus(`Couldn't load media: ${error.message}`, "error");
      console.error(error);
    }
  });

  document.getElementById("previewFps").addEventListener("input", () => {
    markPreviewDirty();
    progressEl.value = 0;
  });

  document.getElementById("previewTime").addEventListener("input", (event) => {
    previewTargetSeconds = Number(event.target.value) || 0;
    previewNeedsSeek = true;
    markPreviewDirty();
    progressEl.value = 0;
  });


  async function downloadPreviewStill() {
    if (!hasLoadedSource) {
      setStatus("Load an image or video before downloading a still.", "warn");
      return;
    }

    const filename = `crt-still-${Date.now()}.png`;
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((nextBlob) => {
        if (!nextBlob) {
          reject(new Error("Canvas still export returned an empty blob."));
          return;
        }
        resolve(nextBlob);
      }, "image/png");
    });
    downloadBlob(blob, filename);
    setStatus(`Still image downloaded: ${filename}`, "success");
  }

  exportBtn.addEventListener("click", async () => {
    if (!hasLoadedSource) {
      setStatus("Load an image or video before exporting.", "warn");
      return;
    }

    try {
      isExporting = true;
      activeExportController = new AbortController();
      setExportAvailability();
      progressEl.value = 0;
      setStatus("Preparing export...", "info");
      const fps = Math.max(1, Number(document.getElementById("fps").value) || 30);
      const duration = Math.max(0.5, Number(document.getElementById("duration").value) || 4);
      const qualityMultiplier = Math.max(0.5, Math.min(2.5, Number(document.getElementById("exportQuality").value) || 1));
      const includeOriginalAudio = document.getElementById("includeOriginalAudio").checked;
      const selectedFormat = exportFormatControl?.getValue() || "mp4";
      const mustUseRealtimeAudio = includeOriginalAudio && loadedSourceType === "video";
      const maxExportEdge = getExportMaxEdge();
      const baseExportSize = fitExportSize(canvas.width, canvas.height, { maxEdge: maxExportEdge });
      const mp4ExportSize = fitExportSize(baseExportSize.width, baseExportSize.height, { maxPixels: MAX_AVC_CODED_PIXELS, forceEven: true });
      const exportSize = selectedFormat === "webm" || mustUseRealtimeAudio ? baseExportSize : mp4ExportSize;
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = exportSize.width;
      exportCanvas.height = exportSize.height;

      if ((selectedFormat !== "webm" && !mustUseRealtimeAudio) && (baseExportSize.width !== mp4ExportSize.width || baseExportSize.height !== mp4ExportSize.height)) {
        setStatus(`AVC size limit hit. Exporting at ${mp4ExportSize.width}x${mp4ExportSize.height} instead.`, "warn");
      }

      if (selectedFormat === "mp4" && mustUseRealtimeAudio) {
        setStatus("Audio passthrough requires WebM realtime export. Switching format for this render.", "warn");
      }

      if (selectedFormat === "webm" || mustUseRealtimeAudio) {
        await exportWebmRealtime({
          canvas: exportCanvas,
          renderer,
          params: readParams(),
          fps,
          duration,
          loadedSourceType,
          loadedVideo,
          loadedImage,
          sourceScale: getSourceScale,
          includeAudio: includeOriginalAudio,
          onProgress: (value, current, total) => {
            progressEl.value = value;
            setStatus(`Realtime export frame ${current}/${total}`, "info");
          },
          signal: activeExportController.signal,
          getRenderOptions: (t) => readOSDOptions(t),
        });
      } else {
        await exportMp4({
          canvas: exportCanvas,
          renderer,
          params: readParams(),
          fps,
          duration,
          beforeRenderFrame: loadedSourceType === "video" && loadedVideo
            ? async (t) => {
                await seekVideo(loadedVideo.video, t);
                renderer.setImage(loadedVideo.video, getSourceScale());
              }
            : null,
          onProgress: (value, current, total) => {
            progressEl.value = value;
            setStatus(`Encoding frame ${current}/${total}`, "info");
          },
          signal: activeExportController.signal,
          bitrateScale: qualityMultiplier,
          getRenderOptions: (t) => readOSDOptions(t),
        });
      }
      setStatus("Export finished. Download should begin automatically.", "success");
    } catch (error) {
      if (error?.name === "AbortError") {
        setStatus("Export cancelled.", "warn");
      } else {
        setStatus(`Export failed: ${error.message}`, "error");
        console.error(error);
      }
    } finally {
      isExporting = false;
      activeExportController = null;
      setExportAvailability();
    }
  });


  downloadStillBtn?.addEventListener("click", async () => {
    try {
      await downloadPreviewStill();
    } catch (error) {
      setStatus(`Still download failed: ${error.message}`, "error");
      console.error(error);
    }
  });

  cancelExportBtn.addEventListener("click", () => {
    if (!isExporting || !activeExportController) return;
    activeExportController.abort();
    setStatus("Cancelling export...", "warn");
  });

  resetParamsBtn.addEventListener("click", () => {
    resetParameters();
  });

  resetPresetBtn?.addEventListener("click", () => {
    if (!activePresetName) return;
    applyPreset(activePresetName, Number(presetIntensityInput?.value || 1));
    renderPresetMeta(activePresetName);
    markPreviewDirty();
    setStatus("Preset baseline restored.", "success");
  });

  resetSourceBtn.addEventListener("click", () => {
    clearLoadedSource();
  });

  for (const id of [...controlIds, ...macroControlIds, "fps", "duration", "presetIntensity"]) {
    document.getElementById(id).addEventListener("input", () => {
      markPreviewDirty();
      progressEl.value = 0;
      updatePresetDirtyState();
      if (id === "fps" || id === "duration") updateExportEstimate();
    });
  }

  document.getElementById("exportQuality")?.addEventListener("input", () => {
    updateExportEstimate();
  });

  document.getElementById("macroSystemsEnabled")?.addEventListener("input", () => {
    markPreviewDirty();
    progressEl.value = 0;
  });

  document.getElementById("macroRandomizeSubtle")?.addEventListener("click", () => randomizeMacroControls(0.18));
  document.getElementById("macroRandomizeMedium")?.addEventListener("click", () => randomizeMacroControls(0.35));
  document.getElementById("macroRandomizeWild")?.addEventListener("click", () => randomizeMacroControls(0.5));
  document.getElementById("macroResetBtn")?.addEventListener("click", () => resetMacroControls());

  presetIntensityInput?.addEventListener("input", () => {
    if (!activePresetName) return;
    applyPreset(activePresetName, Number(presetIntensityInput.value || 1));
    markPreviewDirty();
    progressEl.value = 0;
  });

  for (const id of ["osdStartDateTime", "osdPrimaryColor", "osdAccentColor", "osdCountWithExport"]) {
    document.getElementById(id)?.addEventListener("input", () => {
      markPreviewDirty();
      progressEl.value = 0;
    });
  }

  for (const id of [...controlIds, ...macroControlIds, "previewTime", "presetIntensity", "quickPresetIntensity", "quickScanlineStrength", "quickBloom", "quickChroma"]) {
    setupRangeWithNumber(id);
  }

  for (const id of controlIds) {
    const slider = document.getElementById(id);
    if (!slider || slider.type !== "range") continue;
    slider.addEventListener("dblclick", () => {
      resetSingleControlToDefault(id);
      progressEl.value = 0;
      markPreviewDirty();
    });
  }

  previewModeControl = setupSelectionBox("previewMode", {
    onChange: () => {
      if (isStillPreviewMode()) {
        previewNeedsSeek = true;
      }
      updatePreviewControlsState();
      syncVideoPlaybackState();
      markPreviewDirty();
      progressEl.value = 0;
    },
  });

  previewScaleControl = setupSelectionBox("previewScale", {
    valueParser: Number,
    onChange: () => {
      markPreviewDirty();
      progressEl.value = 0;
    },
  });

  sourceScaleControl = setupSelectionBox("sourceScale", {
    valueParser: Number,
    onChange: () => {
      refreshRendererSource();
      if (loadedSourceType === "video" && isStillPreviewMode()) {
        previewNeedsSeek = true;
      }
      progressEl.value = 0;
    },
  });

  previewMaxPixelsControl = setupSelectionBox("previewMaxPixels", {
    valueParser: Number,
    onChange: () => {
      markPreviewDirty();
      progressEl.value = 0;
    },
  });

  maskTypeControl = setupSelectionBox("maskType", {
    onChange: () => {
      markPreviewDirty();
      progressEl.value = 0;
      updatePresetDirtyState();
    },
  });

  exportFormatControl = setupSelectionBox("exportFormat", {
    onChange: () => {
      progressEl.value = 0;
    },
  });

  exportResolutionControl = setupSelectionBox("exportResolution", {
    valueParser: Number,
    onChange: () => {
      progressEl.value = 0;
      updateExportEstimate();
    },
  });

  osdFontPresetControl = setupSelectionBox("osdFontPreset", {
    onChange: () => {
      markPreviewDirty();
      progressEl.value = 0;
    },
  });

  osdStyleControl = setupSelectionBox("advancedOSDStyleSelect", {
    valueParser: Number,
    onChange: (value) => {
      if (osdStyleInput) {
        osdStyleInput.value = String(value);
        osdStyleInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    },
  });

  if (osdStyleInput) {
    osdStyleControl?.setValue(String(Math.round(Number(osdStyleInput.value) || 0)), { silent: true });
    osdStyleInput.addEventListener("input", () => {
      osdStyleControl?.setValue(String(Math.round(Number(osdStyleInput.value) || 0)), { silent: true });
    });
  }

  function enforceDisabledEffectPanels() {
    for (const [panelName, config] of Object.entries(EFFECT_PANEL_CONFIGS)) {
      const state = panelEffectState[panelName];
      if (!state || state.enabled) continue;
      for (const id of config.controlIds) {
        setControlValue(id, 0, { dispatch: false });
      }
    }
  }

  function setControlValue(id, value, { dispatch = true } = {}) {
    const slider = document.getElementById(id);
    if (!slider) return;
    slider.value = String(value);
    slider.__syncRangeNumber?.();
    if (dispatch) {
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function updateEffectPanelVisual(panelName, enabled) {
    const config = EFFECT_PANEL_CONFIGS[panelName];
    if (!config) return;
    const toggle = document.getElementById(config.toggleId);
    const panel = toggle?.closest(".panel");
    if (!panel) return;
    panel.classList.toggle("panel-effects-disabled", !enabled);
    const labels = panel.querySelectorAll("label");
    for (const label of labels) {
      if (label.classList.contains("panel-toggle")) continue;
      const input = label.querySelector("input");
      if (!input) continue;
      input.disabled = !enabled;
    }
  }

  function setEffectPanelEnabled(panelName, enabled) {
    const config = EFFECT_PANEL_CONFIGS[panelName];
    const state = panelEffectState[panelName];
    if (!config || !state) return;

    state.enabled = !!enabled;
    if (!state.enabled) {
      state.savedValues = Object.fromEntries(config.controlIds.map((id) => [id, Number(document.getElementById(id)?.value || 0)]));
      for (const id of config.controlIds) {
        setControlValue(id, 0);
      }
      setStatus(`${panelName.toUpperCase()} effects disabled.`, "info");
    } else {
      if (state.savedValues) {
        for (const id of config.controlIds) {
          if (typeof state.savedValues[id] === "number") {
            setControlValue(id, state.savedValues[id]);
          }
        }
      }
      state.savedValues = null;
      setStatus(`${panelName.toUpperCase()} effects enabled.`, "success");
    }

    updateEffectPanelVisual(panelName, state.enabled);
    updatePresetDirtyState();
    markPreviewDirty();
    progressEl.value = 0;
  }

  function setupEffectPanelToggles() {
    for (const [panelName, config] of Object.entries(EFFECT_PANEL_CONFIGS)) {
      const toggle = document.getElementById(config.toggleId);
      if (!toggle) continue;
      toggle.checked = panelEffectState[panelName].enabled;
      updateEffectPanelVisual(panelName, panelEffectState[panelName].enabled);
      toggle.addEventListener("change", () => {
        setEffectPanelEnabled(panelName, toggle.checked);
      });
    }
  }

  function setCompareState(enabled, { lock = compareLocked } = {}) {
    compareLocked = !!lock;
    showOriginalPreview = enabled;
    if (compareHoldBtn) {
      compareHoldBtn.dataset.selected = enabled ? "true" : "false";
      compareHoldBtn.classList.toggle("compare-active", enabled);
      compareHoldBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
    }
    if (compareLockBtn) {
      compareLockBtn.dataset.selected = compareLocked ? "true" : "false";
      compareLockBtn.classList.toggle("compare-active", compareLocked);
      compareLockBtn.textContent = compareLocked ? "Unlock compare" : "Lock compare";
      compareLockBtn.setAttribute("aria-pressed", compareLocked ? "true" : "false");
    }
    markPreviewDirty();
  }

  compareHoldBtn?.addEventListener("pointerdown", () => setCompareState(true, { lock: false }));
  compareHoldBtn?.addEventListener("pointerup", () => {
    if (!compareLocked) setCompareState(false, { lock: false });
  });
  compareHoldBtn?.addEventListener("pointerleave", () => {
    if (!compareLocked) setCompareState(false, { lock: false });
  });
  compareLockBtn?.addEventListener("click", () => {
    compareLocked = !compareLocked;
    setCompareState(compareLocked, { lock: compareLocked });
    setStatus(compareLocked ? "Compare locked: showing original." : "Compare unlocked.", "info");
  });
  compareHoldBtn?.addEventListener("keydown", (event) => {
    if (event.code === "Space") setCompareState(true, { lock: compareLocked });
  });
  compareHoldBtn?.addEventListener("keyup", (event) => {
    if (event.code === "Space" && !compareLocked) setCompareState(false, { lock: false });
  });
  compareHoldBtn?.addEventListener("blur", () => {
    if (!compareLocked) setCompareState(false, { lock: false });
  });

  setupEffectPanelToggles();
  setupCollapsiblePanels();
  setupTabs();
  setupQuickJumps();
  setupDensityMode();

  setExportAvailability();
  loadParameterPolicyState();
  buildMacroPolicyControls();
  initializePresetFilters();
  initializePresets();
  defaultParamValues = readParams();
  updatePreviewControlsState();
  updateExportControlsState();
  syncPreviewTimeControl();
  updateExportEstimate();
  window.addEventListener("beforeunload", () => {
    if (loadedVideo?.objectUrl) {
      URL.revokeObjectURL(loadedVideo.objectUrl);
    }
    if (loadedImage && typeof loadedImage.close === "function") {
      loadedImage.close();
    }
  });


  setStatus("Load an image or video (MP4/WebM/MOV/etc.) to begin.", "info");
  requestAnimationFrame(animate);
})();
