# Lost Media Emulator — Hierarchical Parameter System Redesign

This proposal reframes the product from a pure CRT simulator into a **Lost Media Emulator**: a creative pipeline for reconstructing archived, damaged, transcoded, and rebroadcast footage while still preserving a strong CRT endpoint.

## 1. Proposed macro control systems (Level 1)

These macros are always visible and intended to get users to a compelling look quickly.

### 1) Source Provenance
**What it controls:** where the footage feels like it came from.

- **Macro:** `Source Provenance` (Pristine master → nth-generation copy)
- **Shaping controls:**
  - `Origin Type` (Broadcast / Consumer camcorder / Screen capture / Archive transfer)
  - `Generation Depth` (1st copy → many dubs)
- **Drives:** base noise floor, dynamic range collapse, edge softness, color fidelity loss.

### 2) Display Emulation
**What it controls:** display endpoint character (CRT-first, but not only one flavor of CRT).

- **Macro:** `Display Emulation`
- **Shaping controls:**
  - `Display Family` (Consumer CRT / PVM/BVM / Arcade / Early LCD viewed through camera)
  - `Tube Age` (Fresh → worn phosphor)
- **Drives:** scanline behavior, mask structure, bloom, curvature, convergence drift.

### 3) Signal Path Damage
**What it controls:** analog chain degradation between source and display.

- **Macro:** `Signal Path Damage`
- **Shaping controls:**
  - `Path Type` (Composite / RF / S-Video-ish / Mixed chain)
  - `Instability` (Stable → unstable)
- **Drives:** chroma bleed, Y/C crosstalk, jitter, ghosting, sync errors.

### 4) Distribution Artifacts
**What it controls:** delivery defects from broadcast and transfer pipelines.

- **Macro:** `Distribution Artifacts`
- **Shaping controls:**
  - `Carrier` (OTA broadcast / Cable / Tape transfer / Optical rip)
  - `Event Rate` (Rare → frequent)
- **Drives:** dropouts, tracking errors, tearing, multipath interference, field mismatches.

### 5) Digital Decay
**What it controls:** modern transcode and upload damage layered onto older media.

- **Macro:** `Digital Decay`
- **Shaping controls:**
  - `Codec Flavor` (Blocky / Ringy / Smearing)
  - `Bitrate Stress` (Light → extreme)
- **Drives:** macroblocking, mosquito noise, banding, ringing, chroma quantization.

### 6) Recovery vs Ruin
**What it controls:** restoration intent versus archival collapse.

- **Macro:** `Recovery ↔ Ruin`
- **Shaping controls:**
  - `Restoration Bias` (Preserve defects / gentle cleanup / heavy cleanup)
  - `Texture Keep` (Keep grain/noise details)
- **Drives:** denoise interplay, sharpen/soften blend, artifact masking/unmasking.

### 7) Era Styling & OSD
**What it controls:** period cues and contextual overlays.

- **Macro:** `Era Styling`
- **Shaping controls:**
  - `Era` (80s / 90s / 00s / mixed)
  - `Overlay Context` (Camcorder HUD / Broadcast bug / Security cam stamp)
- **Drives:** film grain style, tint drift, timestamp/OSD wear, vignette and halation profile.

---

## 2. Parameter clusters for each system (Level 2)

Each macro expands into compact clusters with 2–3 controls each.

## 1) Source Provenance
- **Capture Quality** (clarity loss, dynamic compression)
- **Generation Wear** (copy noise, edge erosion)
- **Color Survivability** (saturation collapse, channel imbalance)

## 2) Display Emulation
- **Phosphor & Mask** (mask strength, triad visibility)
- **Scan Behavior** (scanline depth, beam width)
- **Tube Optics** (bloom, curvature, corner falloff)

## 3) Signal Path Damage
- **Luma/Chroma Separation** (bleed, delay)
- **Sync Integrity** (horizontal/vertical jitter)
- **Line Stability** (micro-warp, wobble)

## 4) Distribution Artifacts
- **Transmission Interference** (RF streaks, multipath ghosts)
- **Temporal Faults** (field mismatch, tearing)
- **Dropout Events** (line loss amount, duration)

## 5) Digital Decay
- **Block Errors** (macroblock size/visibility)
- **Quantization Damage** (banding, chroma crush)
- **Edge Corruption** (ringing, mosquito noise)

## 6) Recovery vs Ruin
- **Detail Policy** (texture retention, sharpen bias)
- **Noise Policy** (denoise amount, temporal smoothing)
- **Artifact Policy** (keep/remove chain defects)

## 7) Era Styling & OSD
- **Film/Optical Finish** (grain, halation, vignette)
- **Color Mood Drift** (era tint, white-point shift)
- **Overlay Storytelling** (OSD opacity, flicker, wear)

---

## 3. Advanced parameters within each cluster (Level 3)

Advanced controls are fully preserved; they are simply hidden behind an `Advanced` disclosure inside each cluster.

- **Generation Wear:** per-generation gain curve, nonlinear copy accumulation.
- **Phosphor & Mask:** mask phase offset, subpixel anisotropy, triad irregularity.
- **Scan Behavior:** odd/even field asymmetry, beam falloff exponent, line modulation curve.
- **Luma/Chroma Separation:** full Y/C matrix coefficients, subpixel delay granularity.
- **Sync Integrity:** jitter waveform source, jitter frequency range, burst randomness.
- **Dropout Events:** attack/release envelope, cluster spacing randomness, edge feather.
- **Block Errors:** adaptive threshold map, I/P-frame corruption split.
- **Noise Policy:** temporal denoise radius, luma/chroma independent thresholds.
- **Overlay Storytelling:** glyph bleed, alpha noise texture, scanline-coupled opacity.

**Power-user safeguards**
- `Detach from macro` per parameter.
- `Pin value` to prevent preset overwrite.
- `Show all advanced` global preference for experts.

---

## 4. How the UI could reveal/hide these layers

No layout overhaul required—this is a control strategy change.

1. **Beginner (default)**
   - Show only Level 1 macros + one shaping control each.
   - System cards include one-sentence intent text.
   - Optional quick presets row: `Found Tape`, `Late-night Broadcast`, `Overcompressed Reupload`.

2. **Intermediate (cluster mode)**
   - Expanding a macro reveals Level 2 clusters inline.
   - Each cluster surfaces 2–3 high-value controls only.
   - `Auto` indicator shows cluster values still being macro-driven.

3. **Advanced (parameter mode)**
   - `Advanced` expander per cluster reveals all raw parameters.
   - Macro contributions become additive unless parameter is detached.
   - Edited advanced values show a customization dot on parent cluster + macro.

4. **Explainability & confidence**
   - Hovering a parameter shows what macro(s) affect it and by how much.
   - Add `Why this changed` tooltip after preset load.

5. **Low-risk experimentation tools**
   - `A/B` compare at macro-system granularity.
   - `Randomize subtle / medium / wild` per macro.
   - `Reset cluster`, `Reset advanced only`, `Reset all detached links`.

---

## 5. Example workflows using the improved system

### Workflow A — Fast concepting (beginner)
1. Choose preset `Recovered TV Broadcast`.
2. Push `Source Provenance` toward deeper generation loss.
3. Raise `Display Emulation` until CRT character feels right.
4. Add a little `Digital Decay` for reupload realism.
5. Export iteration.

### Workflow B — Directed art pass (intermediate)
1. Start from neutral preset.
2. Increase `Distribution Artifacts` for occasional transmission faults.
3. In clusters, tune dropout duration + sync jitter balance.
4. Add subtle `Era Styling` OSD to imply provenance.
5. Save as project style preset.

### Workflow C — Forensic recreation (advanced)
1. Dial top-level macros for broad match.
2. Open advanced in `Luma/Chroma Separation`, `Sync Integrity`, and `Block Errors`.
3. Detach key parameters to emulate specific deck/capture quirks.
4. A/B against reference stills and lock final parameter pins.
5. Export preset with macro base + advanced deltas.

---

## Preset behavior in the new hierarchy

- **Base preset:** writes Level 1 + Level 2 defaults.
- **Modifier preset:** applies selected systems only (e.g., only `Digital Decay` + `Era Styling`).
- **Expert delta:** stores only modified advanced params.

**Load modes**
- `Replace everything`
- `Apply macro skeleton only`
- `Apply selected systems`
- `Respect pinned/ detached advanced values`

This keeps presets flexible for creative exploration without wiping expert refinements.
