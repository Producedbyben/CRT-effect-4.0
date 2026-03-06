# CRT Effect Renderer — Hierarchical Parameter System Redesign

## 1) Proposed Macro Control Systems (Level 1)

These are the **always-visible** controls intended for rapid exploration. Each macro is a weighted controller that drives multiple lower-level parameters in coordinated ways.

### A. CRT Character
- **Purpose:** Defines the baseline feel of the display itself.
- **Primary macro:** `CRT Character` (0–100)
- **Shaping controls:**
  - `Era` (Arcade / Consumer TV / Studio Monitor)
  - `Display Size` (Small tube → Large tube)
- **Internally drives:** scanline profile, phosphor behavior, mask strength, bloom response, edge softness.

### B. Signal Quality
- **Purpose:** Controls how clean or degraded the source signal appears.
- **Primary macro:** `Signal Quality` (Clean ↔ Damaged)
- **Shaping controls:**
  - `Noise Type` (RF / Luma-Chroma / Snow)
  - `Dropout Bias` (Horizontal / Random)
- **Internally drives:** noise amount, line jitter, color bleed, sync instability, ghosting.

### C. Analog Motion
- **Purpose:** Controls temporal/instability character associated with tape and camera systems.
- **Primary macro:** `Analog Motion` (Stable ↔ Unstable)
- **Shaping controls:**
  - `Movement Style` (Tripod / Handheld / Worn Tape)
  - `Temporal Persistence` (Short / Smear)
- **Internally drives:** frame weave, vertical bounce, motion smear, temporal noise variation.

### D. Broadcast Artifacts
- **Purpose:** Simulates transmission-era defects.
- **Primary macro:** `Broadcast Artifacts` (Off → Heavy)
- **Shaping controls:**
  - `Interference Flavor` (Multipath / RF noise / Tracking)
  - `Event Frequency` (Rare / Frequent)
- **Internally drives:** tearing, horizontal hold errors, field issues, intermittent glitches.

### E. Compression / Digital Damage
- **Purpose:** Adds digital-era corruption layered onto analog output.
- **Primary macro:** `Compression Damage` (Off → Harsh)
- **Shaping controls:**
  - `Codec Character` (Soft blockiness / Ringing / Mosquito)
  - `Bitrate Pressure` (Mild / Severe)
- **Internally drives:** macroblocking, chroma quantization, edge ringing, banding.

### F. Cinematic Finish
- **Purpose:** Final stylization pass for mood and polish.
- **Primary macro:** `Finish` (Neutral → Stylized)
- **Shaping controls:**
  - `Film Presence` (None / Subtle / Heavy)
  - `OSD Presence` (Off / Utility / Broadcast)
- **Internally drives:** grain, halation, vignette, color cast, OSD opacity and wear.

---

## 2) Parameter Clusters for Each System (Level 2)

Each macro opens into 2–4 **effect clusters** with concise, meaningful controls.

## A. CRT Character
1. **Phosphor & Mask**
   - Strength
   - Dot/slot style
   - Subpixel visibility
2. **Scan Structure**
   - Scanline depth
   - Line sharpness
   - Beam width
3. **Tube Optics**
   - Bloom
   - Edge softness
   - Curvature coupling

## B. Signal Quality
1. **Noise Floor**
   - Global noise amount
   - Color noise balance
2. **Color Integrity**
   - Bleed
   - Chroma delay
   - Chroma/luma separation error
3. **Sync Stability**
   - Horizontal jitter
   - Vertical jitter
   - Micro-warp

## C. Analog Motion
1. **Camera Instability**
   - Frame weave
   - Drift
2. **Tape Transport**
   - Tracking wander
   - Timebase wobble
3. **Temporal Echo**
   - Motion smear
   - Field persistence

## D. Broadcast Artifacts
1. **Transmission Interference**
   - RF streaks
   - Multipath ghosts
2. **Field/Frame Errors**
   - Interlace mismatch
   - Tearing probability
3. **Dropout Events**
   - Line loss amount
   - Event duration

## E. Compression / Digital Damage
1. **Macroblocking**
   - Block size tendency
   - Block contrast
2. **Quantization Artifacts**
   - Banding
   - Chroma crush
3. **Edge Failures**
   - Ringing
   - Mosquito noise

## F. Cinematic Finish
1. **Film Texture**
   - Grain amount
   - Grain size
2. **Optical Finish**
   - Halation
   - Vignette
3. **Overlay System (OSD)**
   - OSD opacity
   - OSD aging/wear
   - OSD flicker

---

## 3) Advanced Parameters Within Each Cluster (Level 3)

These remain fully available, but hidden by default behind an **Advanced** expander per cluster.

### Examples of Level 3 controls
- **Phosphor & Mask:** mask phase offset, subpixel anisotropy, triad irregularity.
- **Scan Structure:** per-line modulation curve, odd/even line asymmetry, beam falloff exponent.
- **Noise Floor:** luma/chroma spectral slope, temporal seed mode, per-channel bias.
- **Color Integrity:** Y/C crosstalk matrix coefficients, delay in subpixel units.
- **Sync Stability:** jitter waveform shape, frequency band limits, burst timing randomness.
- **Tape Transport:** wow/flutter split, capstan pulse simulation, head-switching timing.
- **Dropout Events:** dropout envelope attack/release, cluster spacing randomness.
- **Macroblocking:** adaptive block map threshold, intra/inter error ratio.
- **Quantization:** chroma subsampling model, dither strategy.
- **OSD:** glyph bleed, scanline coupling, alpha noise texture.

### Advanced UX behavior
- `Advanced` state persists per user.
- Expert users can enable **"Always show advanced"** globally.
- Any touched advanced parameter displays a "customized" dot on its parent cluster.

---

## 4) UI Layering: Reveal/Hide Strategy Without Changing Layout

This redesign keeps the existing page structure but changes parameter exposure.

1. **Default view (Beginner)**
   - Show only Level 1 macros + 1–2 shaping controls each.
   - Hide all raw parameters.
   - Provide concise helper text: "Controls signal breakup, color bleed, and sync drift together."

2. **Cluster view (Intermediate)**
   - Clicking a macro expands Level 2 clusters inline.
   - Each cluster shows 2–3 curated controls max.
   - "Auto" toggle allows macro to continue driving untouched cluster controls.

3. **Advanced view (Expert)**
   - Per-cluster `Advanced` disclosure reveals full individual parameters.
   - Macro influence becomes additive/scaled unless `Detach` is selected.
   - `Detach parameter` allows locking any parameter from macro automation.

4. **Dependency clarity**
   - When macro moves a parameter, show subtle linked icon.
   - Hover reveals mapping: e.g., "Signal Quality contributes +35% to Chroma Bleed".

5. **Safe experimentation controls**
   - `A/B Snapshot` at macro-system level.
   - `Randomize within range` per macro (musical "macro variation" style).
   - `Reset cluster` and `Reset only advanced` actions.

---

## 5) Preset Behavior with the New Hierarchy

Presets should be layered rather than monolithic.

1. **Preset structure**
   - **Base preset:** sets Level 1 macro ranges and cluster defaults.
   - **Style modifier:** optional overlay (e.g., "Worn VHS", "Broadcast Sports", "Late-night Anime Capture").
   - **Advanced deltas:** only stores changed Level 3 parameters.

2. **Preset loading modes**
   - `Replace All`
   - `Apply Macro Only`
   - `Apply Artifact Families` (selected systems only)

3. **Preset transparency**
   - Show a "What this preset changes" diff grouped by system.
   - Mark overridden advanced values explicitly.

4. **Preset authoring flow**
   - Creators can publish with only macro + cluster values for portability.
   - Optional "include expert tweaks" checkbox appends Level 3 deltas.

---

## 6) Faster Experimentation Workflows

### Workflow A — Beginner: "Get a convincing CRT look in 30 seconds"
1. Pick preset: `Consumer TV 90s`.
2. Increase `CRT Character` to 65.
3. Raise `Signal Quality` damage slightly.
4. Add `Finish` for grain/OSD taste.
5. Done — no deep panel usage required.

### Workflow B — Intermediate: "Build a damaged broadcast capture"
1. Start from neutral preset.
2. Set `Broadcast Artifacts` to medium.
3. Open clusters:
   - Increase transmission interference.
   - Add brief dropout events.
4. Tune `Signal Quality` color integrity for bleed.
5. Save as custom style preset.

### Workflow C — Advanced: "Recreate a specific deck/capture chain"
1. Dial macros to approximate global character.
2. Open Level 3 in Tape Transport and Color Integrity.
3. Detach key parameters (e.g., head-switch timing, Y/C delay).
4. Perform shot-matching with A/B snapshots.
5. Export preset with advanced deltas included.

---

## Practical Implementation Notes

- Maintain backward compatibility by mapping existing raw parameters into the new hierarchy via a **parameter graph**.
- Macro value should be a normalized scalar feeding weighted parameter curves (linear/log/S-curve per target).
- Use non-destructive composition:
  - `Final parameter = base preset + macro contribution + manual offset`
- This ensures advanced control is never lost while dramatically reducing default UI complexity.
