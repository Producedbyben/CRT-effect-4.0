# CRT Effect Renderer — Final UX Refinement Audit (Desktop Landscape)

This document evaluates the current desktop UX and proposes practical, incremental improvements that fit the existing three-column structure and dark UI.

## STEP 1 — UX Audit

### 1) Vertical layout efficiency
- The control architecture is heavily stacked (multiple panel groups + per-effect controls), which creates long scroll sessions in both side columns.
- Even with collapsible groups, users must repeatedly open/close sections to reach a subset of parameters, increasing interaction cost.
- On 13–16" laptop screens, vertical viewport height becomes the limiting dimension, so panel depth hurts workflow speed more than panel width.

### 2) Panel stacking and scroll fatigue
- Left panel likely becomes the longest due to source + presets + core effects; right panel adds additional depth for artifacts/OSD.
- Important controls can be pushed below the fold by rarely used advanced settings.
- Scroll position memory across groups is mentally expensive when users are tuning multiple effects in sequence.

### 3) Hierarchy and grouping of controls
- Current grouping appears feature-based, but not always task-sequenced.
- Parameter-heavy groups often place primary and advanced controls in one list, flattening hierarchy.
- If all sliders share similar visual weight, users cannot quickly identify “high-impact” controls.

### 4) Discoverability of important settings
- New users can miss key “first-pass” controls if they are buried among long slider stacks.
- Presets help, but discoverability suffers when there is no obvious quick-adjust layer for intensity/character controls.
- OSD/artifact controls on the right can feel disconnected from the core look workflow unless surfaced contextually.

### 5) Balance between left / preview / right columns
- Center preview remains dominant (good), but side columns may compete for attention if both are simultaneously expanded with deep stacks.
- A symmetric two-sidebar structure can lead to asymmetric value: left side likely used more frequently than right side.
- When sidebars grow too tall, users spend more time navigating UI than evaluating preview.

### 6) Density of controls
- Sliders + numeric fields provide precision but consume substantial vertical space when each row uses full width.
- Single-column sliders are readable but inefficient for large parameter sets.
- Repeated label-slider-input patterns can produce visual monotony and scanning slowdown.

### 7) Readability and spacing
- If spacing is generous everywhere, readability is strong but throughput is lower for expert workflows.
- If spacing is too tight globally, novice usability drops.
- Current UI likely needs adaptive density modes rather than one spacing scale.

### 8) Workflow efficiency for heavy tuning
- Common workflow (adjust effect A, compare, tweak effect B, return to A) is slowed by panel jumping and scroll repositioning.
- Lack of quick-access surface for recently changed parameters can increase iteration time.
- Export settings/status below preview is functionally correct but can become visually distant from tuning operations.

---

## STEP 2 — Vertical Layout Optimisation

### A. Introduce **in-panel two-column parameter grids** for compatible controls
- Use two-column layout for short-range scalar sliders where labels are concise (e.g., intensity, jitter, bloom amount).
- Keep full-width rows for controls requiring long labels, curves, or dependent descriptions.
- Implementation pattern: `panel--dense-grid` class with CSS grid + breakpoint fallback to single column on narrow widths.

### B. Add **Basic / Advanced subsections** inside large effect panels
- Keep 4–6 high-impact controls visible in Basic.
- Move low-frequency parameters into collapsed Advanced block within the same panel.
- This preserves existing panel taxonomy while reducing default vertical depth.

### C. Add **sticky mini-header** per long panel section
- Sticky subheader shows effect name + enable toggle + reset + collapse state while scrolling inside panel.
- Reduces context loss when users scroll deeply.

### D. Introduce **progressive density modes** (Comfortable / Compact)
- Comfortable: current spacing for onboarding.
- Compact: reduced row height, tighter label spacing, smaller knob/input controls.
- User setting persisted in local storage.

### E. Add **quick-jump index** at top of each sidebar
- A compact list of effect anchors (“Signal”, “Geometry”, “Artifacts”, “OSD”).
- Click scrolls to panel and expands if collapsed.
- Solves long-scroll navigation without changing architecture.

### F. Constrain long panel growth with **internal sectional tabs** where logical
- For very long groups (e.g., artifacts), split into small tabs: Noise / Distortion / Color / Overlay.
- Tabs should live *inside* existing panel, not as global app navigation.

---

## STEP 3 — Panel Architecture Improvements

### Keep the existing 3-zone layout, but rebalance behavior

#### LEFT (Source + Presets + Core Effects)
- Keep persistent and primary.
- Add a “Core Look” quick section pinned near top with globally impactful controls (master intensity, scanline strength, bloom, chroma shift).
- Auto-collapse low-use effect groups by default after preset load.

#### CENTER (Preview)
- Keep dominant visual priority.
- Add top “compare strip” controls (A/B, hold-to-bypass, split-view orientation) near existing preview controls.
- Keep export status near preview bottom, but add a compact inline status badge near preview controls for visibility.

#### RIGHT (Artifacts + OSD)
- Make semi-contextual:
  - Persist OSD quick toggle and artifact master amount.
  - Auto-collapse detailed subsections unless user has interacted with them in session.
- Consider merging rarely used OSD details into collapsible nested blocks while keeping critical toggles always visible.

### Distribution improvements
- Move cross-cutting “master” controls from deep panel positions into top-level quick-access rows (left/right).
- Keep advanced controls in their original domain panel to avoid conceptual fragmentation.

---

## STEP 4 — Control Density Improvements

### 1) Dual-column slider layout rules
- Use for homogeneous numeric controls with similar ranges.
- Avoid for controls that need helper text or highly variable label lengths.
- Ensure keyboard focus order still follows logical reading order.

### 2) Compact slider variant
- 24–28px control row height vs current larger rows.
- Numeric input shown inline on focus/hover, otherwise collapsed to value chip.
- Optional scrub-by-drag on value chip for fast expert adjustments.

### 3) Slider clustering with shared intensity
- Group related micro-parameters under one cluster header with a master intensity.
- Example: artifact cluster (amount / variance / frequency) plus one master on/off and amount.
- Lets users do rough shaping fast, then fine-tune selectively.

### 4) Advanced disclosure pattern
- Add “Show advanced (N)” summary row, where N is hidden control count.
- Keeps users aware of hidden depth while avoiding panel bloat.

### 5) Numeric precision ergonomics
- Modifier key steps:
  - Drag: default medium sensitivity
  - `Shift`: fine adjustment (x0.1)
  - `Alt/Option`: ultra-fine (x0.01)
  - `Ctrl/Cmd`: coarse (x10)
- Direct numeric entry still available for exact values.

---

## STEP 5 — Professional Creative Tool UX Enhancements

### A. Parameter-level affordances
- Per-control reset icon (appears on hover when value deviates from default).
- Panel-level reset and effect-level enable/disable toggles.
- Visual “modified” marker for controls changed from default/preset baseline.

### B. Tooltips and learning layer
- Short tooltip for each effect with practical language (“Adds horizontal jitter akin to VHS tracking drift”).
- Optional extended help popover for unfamiliar controls.

### C. Power-user accelerators
- Keyboard shortcuts:
  - Toggle current effect enable
  - Jump between effect groups
  - Bypass all effects (hold key)
- Recent-controls tray (last 6–10 changed parameters) for rapid backtracking.

### D. Comparison workflows
- A/B snapshots with one-click swap.
- Hold-to-bypass interaction on preview.
- Split preview mode with draggable divider for before/after inspection.

### E. Preset workflow refinement
- “Preset applied” toast listing modified groups.
- Optional “lock parameter” mode to preserve chosen controls while trying presets.

---

## STEP 6 — Interaction Polish

### Slider responsiveness
- Debounce heavy renders while preserving immediate visual feedback (preview at reduced internal resolution during drag, full quality on release).
- Avoid perceptible lag >50ms during interaction loops.

### Hover/focus states
- Stronger focus rings for keyboard accessibility.
- Subtle hover elevation for interactive rows and toggles.
- Consistent tooltip delay to prevent flicker.

### Collapse behavior
- Animate panel collapse/expand quickly (120–180ms) with preserved scroll anchor.
- Remember collapse states per user session.

### Preview interactions
- Double-click preview to fit/fill toggle.
- Mousewheel zoom with modifier key, panning when zoomed.
- Maintain center alignment and predictable zoom origin.

### Export feedback polish
- Persistent progress bar + ETA + current stage text (“Encoding pass 1/2”).
- Non-blocking completion toast with quick “Reveal file / Download” action.

---

## STEP 7 — Prioritised Iterative Implementation Roadmap

## 1) Highest impact (implement first)
1. **Basic/Advanced subsections** in large panels (major vertical reduction).
2. **Two-column control grids** for eligible slider sets.
3. **Quick-access Core Look section** pinned in left panel.
4. **Quick-jump sidebar index** to eliminate long scroll hunting.
5. **Effect-level enable/reset + modified indicators**.

Expected outcome: faster scanning, lower scroll fatigue, stronger discoverability for key controls.

## 2) Medium priority
1. **Compact density mode** with persisted preference.
2. **Right panel contextual auto-collapse behavior**.
3. **Recent-controls tray** for iterative tuning.
4. **A/B compare + hold-to-bypass** near preview controls.
5. **Tooltip pass** for all effects and major parameters.

Expected outcome: improved expert throughput and clearer beginner onboarding.

## 3) Small polish improvements
1. Refined hover/focus visual language.
2. Collapse/expand animation and state memory improvements.
3. Modifier-key slider sensitivity model.
4. Export status microcopy + inline stage badge.
5. Minor spacing normalization and label alignment cleanup.

Expected outcome: higher perceived quality and production-tool feel.

---

## Implementation Notes (Web UI practicalities)
- These changes can be delivered incrementally with mostly CSS/DOM composition updates and light state management additions.
- No full re-architecture required: preserve current three-zone shell and panel taxonomy.
- Optimize for 1366×768 and 1440×900 as baseline laptop landscape targets while maintaining central preview dominance.
