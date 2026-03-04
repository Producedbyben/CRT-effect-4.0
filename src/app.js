const FALLBACK_PRESETS = {
  "Consumer TV": {
    scanlineStrength: 0.5,
    phosphorMask: 0.5,
    barrelDistortion: 0,
    bloom: 0.5,
    flicker: 0.22,
    chromaticAberration: 0.5,
    noise: 0.5,
    pixelSize: 1,
  },
  "PVM/BVM": {
    scanlineStrength: 0.25,
    phosphorMask: 0.6,
    barrelDistortion: 0.08,
    bloom: 0.2,
    flicker: 0.12,
    chromaticAberration: 0.08,
    noise: 0.16,
    pixelSize: 1,
  },
  Arcade: {
    scanlineStrength: 0.4,
    phosphorMask: 0.45,
    barrelDistortion: 0.12,
    bloom: 0.55,
    flicker: 0.2,
    chromaticAberration: 0.2,
    noise: 0.3,
    pixelSize: 1,
  },
  "Trinitron RGB Monitor": {
    scanlineStrength: 0.2,
    phosphorMask: 0.72,
    barrelDistortion: 0.04,
    bloom: 0.16,
    flicker: 0.03,
    chromaticAberration: 0.06,
    noise: 0.05,
    pixelSize: 1,
  },
  "VHS Composite": {
    scanlineStrength: 0.48,
    phosphorMask: 0.28,
    barrelDistortion: 0.26,
    bloom: 0.68,
    flicker: 0.16,
    chromaticAberration: 0.54,
    noise: 0.34,
    pixelSize: 2,
  },
  "Portable CRT": {
    scanlineStrength: 0.56,
    phosphorMask: 0.34,
    barrelDistortion: 0.32,
    bloom: 0.34,
    flicker: 0.18,
    chromaticAberration: 0.26,
    noise: 0.24,
    pixelSize: 2,
  },
  "Late-Night Broadcast": {
    scanlineStrength: 0.35,
    phosphorMask: 0.42,
    barrelDistortion: 0.16,
    bloom: 0.5,
    flicker: 0.12,
    chromaticAberration: 0.22,
    noise: 0.2,
    pixelSize: 1,
  },
};

const MP4_MUXER_CDN = "https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.2/build/mp4-muxer.mjs";
const USER_PRESETS_STORAGE_KEY = "crt.userPresets.v1";
const USER_PRESETS_SCHEMA_VERSION = 1;
const BATCH_SETTINGS_STORAGE_KEY = "crt.batchSettings.v1";

function seededNoise(x, y, frame) {
  const v = Math.sin(x * 12.9898 + y * 78.233 + frame * 19.17) * 43758.5453;
  return v - Math.floor(v);
}

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

class CRTRenderer {
  constructor() {
    this.sourceCanvas = document.createElement("canvas");
    this.fitCanvas = document.createElement("canvas");
    this.workCanvas = document.createElement("canvas");
    this.hasImage = false;
  }

  setImage(img, sourceScale = 1) {
    const inputWidth = img.naturalWidth || img.videoWidth || img.width;
    const inputHeight = img.naturalHeight || img.videoHeight || img.height;
    const scale = Math.max(0.1, Math.min(1, sourceScale || 1));
    this.sourceCanvas.width = Math.max(1, Math.round(inputWidth * scale));
    this.sourceCanvas.height = Math.max(1, Math.round(inputHeight * scale));
    const ctx = this.sourceCanvas.getContext("2d");
    ctx.clearRect(0, 0, this.sourceCanvas.width, this.sourceCanvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, inputWidth, inputHeight, 0, 0, this.sourceCanvas.width, this.sourceCanvas.height);
    this.hasImage = true;
  }

  sampleBilinear(data, width, height, u, v, channel) {
    const x = Math.max(0, Math.min(width - 1, u * (width - 1)));
    const y = Math.max(0, Math.min(height - 1, v * (height - 1)));
    const x0 = Math.floor(x);
    const x1 = Math.min(width - 1, x0 + 1);
    const y0 = Math.floor(y);
    const y1 = Math.min(height - 1, y0 + 1);
    const tx = x - x0;
    const ty = y - y0;

    const i00 = (y0 * width + x0) * 4 + channel;
    const i10 = (y0 * width + x1) * 4 + channel;
    const i01 = (y1 * width + x0) * 4 + channel;
    const i11 = (y1 * width + x1) * 4 + channel;

    const a = data[i00] * (1 - tx) + data[i10] * tx;
    const b = data[i01] * (1 - tx) + data[i11] * tx;
    return a * (1 - ty) + b * ty;
  }

  render(outCtx, width, height, seconds, params, frameIndex, fps) {
    outCtx.clearRect(0, 0, width, height);
    outCtx.fillStyle = "black";
    outCtx.fillRect(0, 0, width, height);
    if (!this.hasImage) return;

    this.fitCanvas.width = width;
    this.fitCanvas.height = height;
    const fitCtx = this.fitCanvas.getContext("2d", { willReadFrequently: true });
    fitCtx.clearRect(0, 0, width, height);
    fitCtx.imageSmoothingEnabled = true;
    fitCtx.imageSmoothingQuality = "high";

    const src = this.sourceCanvas;
    const srcAspect = src.width / src.height;
    const dstAspect = width / height;
    let sw = src.width;
    let sh = src.height;
    let sx = 0;
    let sy = 0;

    if (srcAspect > dstAspect) {
      sw = src.height * dstAspect;
      sx = (src.width - sw) / 2;
    } else {
      sh = src.width / dstAspect;
      sy = (src.height - sh) / 2;
    }

    fitCtx.drawImage(src, sx, sy, sw, sh, 0, 0, width, height);

    this.workCanvas.width = width;
    this.workCanvas.height = height;
    const wctx = this.workCanvas.getContext("2d", { willReadFrequently: true });
    const srcPixels = fitCtx.getImageData(0, 0, width, height);
    const outPixels = wctx.createImageData(width, height);
    const srcData = srcPixels.data;
    const dstData = outPixels.data;

    const barrel = Math.max(-0.8, Math.min(0.8, params.barrelDistortion));
    const ca = params.chromaticAberration;
    const scan = params.scanlineStrength;
    const mask = params.phosphorMask;
    const pixelSize = Math.max(1, Number(params.pixelSize) || 1);
    const pixelInfluence = 1 + (pixelSize - 1) * 0.22;
    const pixelStepX = width > 1 ? 1 / (width - 1) : 0;
    const pixelStepY = height > 1 ? 1 / (height - 1) : 0;

    for (let y = 0; y < height; y++) {
      const ny = (y / (height - 1)) * 2 - 1;
      const scanPhase = Math.sin((y + 0.5) * Math.PI);
      const scanlineGain = 1 - scan * (0.35 + 0.65 * (0.5 + 0.5 * scanPhase));

      for (let x = 0; x < width; x++) {
        const nx = (x / (width - 1)) * 2 - 1;
        const r2 = nx * nx + ny * ny;
        const warpCurve = 0.22 + 0.78 * r2;
        const warp = Math.max(0.35, 1 + barrel * warpCurve);
        const srcNx = nx / warp;
        const srcNy = ny / warp;
        const u = srcNx * 0.5 + 0.5;
        const v = srcNy * 0.5 + 0.5;

        const outIndex = (y * width + x) * 4;
        if (u < 0 || u > 1 || v < 0 || v > 1) {
          dstData[outIndex] = 0;
          dstData[outIndex + 1] = 0;
          dstData[outIndex + 2] = 0;
          dstData[outIndex + 3] = 255;
          continue;
        }

        const edgeShift = ca * (0.0012 + r2 * 0.0045) * (0.8 + (pixelSize - 1) * 0.22);
        const qx = Math.floor((u * width) / pixelSize) * pixelSize + pixelSize * 0.5;
        const qy = Math.floor((v * height) / pixelSize) * pixelSize + pixelSize * 0.5;
        const qu = Math.max(0, Math.min(1, qx / width));
        const qv = Math.max(0, Math.min(1, qy / height));

        const ru = qu + edgeShift * (0.7 + Math.abs(nx));
        const gu = qu;
        const bu = qu - edgeShift * (0.7 + Math.abs(nx));

        const red = this.sampleBilinear(srcData, width, height, ru, qv, 0)
        const green = this.sampleBilinear(srcData, width, height, gu, qv, 1)
        const blue = this.sampleBilinear(srcData, width, height, bu, qv, 2)

        const redHoriz =
          this.sampleBilinear(srcData, width, height, ru - pixelStepX, qv, 0) * 0.5 +
          this.sampleBilinear(srcData, width, height, ru + pixelStepX, qv, 0) * 0.5;
        const greenHoriz =
          this.sampleBilinear(srcData, width, height, gu - pixelStepX, qv, 1) * 0.5 +
          this.sampleBilinear(srcData, width, height, gu + pixelStepX, qv, 1) * 0.5;
        const blueHoriz =
          this.sampleBilinear(srcData, width, height, bu - pixelStepX, qv, 2) * 0.5 +
          this.sampleBilinear(srcData, width, height, bu + pixelStepX, qv, 2) * 0.5;

        const redVert =
          this.sampleBilinear(srcData, width, height, ru, qv - pixelStepY, 0) * 0.5 +
          this.sampleBilinear(srcData, width, height, ru, qv + pixelStepY, 0) * 0.5;
        const greenVert =
          this.sampleBilinear(srcData, width, height, gu, qv - pixelStepY, 1) * 0.5 +
          this.sampleBilinear(srcData, width, height, gu, qv + pixelStepY, 1) * 0.5;
        const blueVert =
          this.sampleBilinear(srcData, width, height, bu, qv - pixelStepY, 2) * 0.5 +
          this.sampleBilinear(srcData, width, height, bu, qv + pixelStepY, 2) * 0.5;

        const luminance = Math.max(red, green, blue) / 255;
        const bleed = (0.08 + params.bloom * 0.26 + mask * 0.08) * pixelInfluence * Math.pow(luminance, 0.75);
        const blend = Math.min(0.45, bleed);

        const triad = x % 3;
        const boost = 1 + mask * 0.52;
        const dim = 1 - mask * 0.32;
        const rMask = triad === 0 ? boost : dim;
        const gMask = triad === 1 ? boost : dim;
        const bMask = triad === 2 ? boost : dim;

        const dither = (BAYER_4X4[y & 3][x & 3] / 15 - 0.5) * (1.4 + params.noise * 2.2);

        const redSoft = red * (1 - blend) + (redHoriz * 0.62 + redVert * 0.38) * blend;
        const greenSoft = green * (1 - blend) + (greenHoriz * 0.62 + greenVert * 0.38) * blend;
        const blueSoft = blue * (1 - blend) + (blueHoriz * 0.62 + blueVert * 0.38) * blend;

        dstData[outIndex] = Math.min(255, Math.max(0, redSoft * scanlineGain * rMask + dither));
        dstData[outIndex + 1] = Math.min(255, Math.max(0, greenSoft * scanlineGain * gMask + dither));
        dstData[outIndex + 2] = Math.min(255, Math.max(0, blueSoft * scanlineGain * bMask + dither));
        dstData[outIndex + 3] = 255;
      }
    }

    wctx.putImageData(outPixels, 0, 0);
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";
    outCtx.drawImage(this.workCanvas, 0, 0);

    const bloom = params.bloom;
    if (bloom > 0) {
      outCtx.save();
      outCtx.globalCompositeOperation = "screen";
      outCtx.globalAlpha = Math.min(0.8, (0.16 + bloom * 0.34) * pixelInfluence);
      outCtx.filter = `blur(${(0.8 + bloom * 5.6) * (1 + (pixelSize - 1) * 0.12)}px) brightness(${1 + bloom * 0.55})`;
      outCtx.drawImage(this.workCanvas, 0, 0);
      outCtx.restore();

      outCtx.save();
      outCtx.globalCompositeOperation = "lighter";
      outCtx.globalAlpha = Math.min(0.7, (0.08 + bloom * 0.24) * pixelInfluence);
      outCtx.filter = `blur(${(0.4 + bloom * 2.4) * (1 + (pixelSize - 1) * 0.1)}px)`;
      outCtx.drawImage(this.workCanvas, 1, 0);
      outCtx.drawImage(this.workCanvas, -1, 0);
      outCtx.restore();
    }

    const vignette = Math.min(0.35, 0.08 + Math.abs(barrel) * 0.22);
    const grad = outCtx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      Math.min(width, height) * 0.22,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.6,
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(0,0,0,${vignette.toFixed(3)})`);
    outCtx.fillStyle = grad;
    outCtx.fillRect(0, 0, width, height);

    const frameSeconds = frameIndex / fps;
    const flickerWaveA = Math.sin(frameSeconds * Math.PI * 2 * 1.94) * 0.5 + 0.5;
    const flickerWaveB = Math.sin(frameSeconds * Math.PI * 2 * 0.61 + 1.7) * 0.5 + 0.5;
    const flicker = params.flicker * (0.4 + 0.6 * (0.65 * flickerWaveA + 0.35 * flickerWaveB));
    outCtx.fillStyle = `rgba(255,255,255,${(flicker * 0.2).toFixed(3)})`;
    outCtx.fillRect(0, 0, width, height);

    const retraceY = ((frameSeconds * 1.45) % 1) * height;
    const retraceBand = Math.max(6, Math.floor(height * 0.02));
    const retraceGrad = outCtx.createLinearGradient(0, retraceY - retraceBand, 0, retraceY + retraceBand);
    retraceGrad.addColorStop(0, "rgba(255,255,255,0)");
    retraceGrad.addColorStop(0.5, `rgba(255,255,255,${(params.flicker * 0.12).toFixed(3)})`);
    retraceGrad.addColorStop(1, "rgba(255,255,255,0)");
    outCtx.fillStyle = retraceGrad;
    outCtx.fillRect(0, retraceY - retraceBand, width, retraceBand * 2);

    const jitterPx = params.flicker * (seededNoise(frameIndex, frameSeconds, 17) - 0.5) * 2.6;
    if (Math.abs(jitterPx) > 0.01) {
      outCtx.save();
      outCtx.globalAlpha = Math.min(0.14, 0.05 + params.flicker * 0.12);
      outCtx.drawImage(outCtx.canvas, jitterPx, 0);
      outCtx.restore();
    }

    if (params.noise > 0) {
      const count = Math.floor(width * height * 0.008 * params.noise);
      for (let i = 0; i < count; i++) {
        const x = Math.floor(seededNoise(i, seconds, frameIndex) * width);
        const y = Math.floor(seededNoise(i * 2, seconds + 3.1, frameIndex) * height);
        const grain = seededNoise(x + frameIndex * 0.3, y, frameIndex);
        const a = (0.02 + grain * 0.28) * params.noise;
        outCtx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        outCtx.fillRect(x, y, 1, 1);
      }

      const burst = seededNoise(frameIndex, frameSeconds * 10, 91);
      if (burst > 0.91) {
        const bandY = Math.floor(seededNoise(frameIndex, burst, 37) * height);
        const bandH = Math.max(3, Math.floor(height * 0.012));
        outCtx.fillStyle = `rgba(255,255,255,${(params.noise * 0.22).toFixed(3)})`;
        outCtx.fillRect(0, bandY, width, bandH);
      }
    }
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}


function getAvcCodecForResolution(width, height) {
  const macroblocksPerFrame = Math.ceil(width / 16) * Math.ceil(height / 16);

  // AVC level limits (max frame size in macroblocks).
  const levelByMaxFs = [
    { maxFs: 99, levelHex: "0a" },
    { maxFs: 396, levelHex: "15" },
    { maxFs: 1620, levelHex: "1e" },
    { maxFs: 3600, levelHex: "1f" },
    { maxFs: 8192, levelHex: "28" },
    { maxFs: 8704, levelHex: "29" },
    { maxFs: 22080, levelHex: "32" },
    { maxFs: 36864, levelHex: "33" },
    { maxFs: 139264, levelHex: "34" },
  ];

  const match = levelByMaxFs.find((entry) => macroblocksPerFrame <= entry.maxFs);
  const levelHex = match ? match.levelHex : "34";

  // Baseline profile (42 00) + computed level to avoid level-3.1 limits on larger videos.
  return `avc1.4200${levelHex}`;
}

function getTargetBitrate(width, height, fps) {
  const pixelsPerSecond = width * height * Math.max(1, fps);
  const estimated = Math.round(pixelsPerSecond * 0.11);
  return Math.max(5_000_000, Math.min(35_000_000, estimated));
}

async function exportMp4({ canvas, renderer, params, fps, duration, beforeRenderFrame, onProgress, signal, bitrateScale = 1, autoDownload = true, outputName }) {
  if (!("VideoEncoder" in window)) {
    throw new Error("WebCodecs VideoEncoder is unavailable in this browser/context.");
  }

  const { Muxer, ArrayBufferTarget } = await import(MP4_MUXER_CDN);
  const throwIfAborted = () => {
    if (signal?.aborted) {
      throw new DOMException("Export cancelled by user.", "AbortError");
    }
  };
  throwIfAborted();
  const width = canvas.width;
  const height = canvas.height;
  const totalFrames = Math.max(1, Math.floor(duration * fps));
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width, height },
    fastStart: "in-memory",
  });

  let encoderFailure = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      encoderFailure = err;
    },
  });

  const codec = getAvcCodecForResolution(width, height);
  const bitrate = Math.max(250_000, Math.round(getTargetBitrate(width, height, fps) * Math.max(0.5, bitrateScale)));

  try {
    encoder.configure({
      codec,
      width,
      height,
      framerate: fps,
      bitrate,
      latencyMode: "quality",
      hardwareAcceleration: "prefer-hardware",
    });
  } catch (error) {
    console.warn("Hardware-accelerated encoder config unavailable; falling back.", error);
    encoder.configure({
      codec,
      width,
      height,
      framerate: fps,
      bitrate,
      latencyMode: "quality",
    });
  }

  for (let frame = 0; frame < totalFrames; frame++) {
    throwIfAborted();
    if (encoderFailure) {
      throw encoderFailure;
    }

    const t = frame / fps;
    if (beforeRenderFrame) await beforeRenderFrame(t, frame, fps);
    renderer.render(ctx, width, height, t, params, frame, fps);

    const videoFrame = new VideoFrame(canvas, {
      timestamp: Math.round((frame * 1_000_000) / fps),
      duration: Math.round(1_000_000 / fps),
    });

    try {
      encoder.encode(videoFrame);
    } finally {
      videoFrame.close();
    }

    onProgress?.((frame + 1) / totalFrames, frame + 1, totalFrames);

    if (frame % 30 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  await encoder.flush();
  throwIfAborted();
  if (encoderFailure) {
    throw encoderFailure;
  }
  encoder.close();
  muxer.finalize();

  const blob = new Blob([target.buffer], { type: "video/mp4" });
  if (autoDownload) {
    const defaultName = `crt-export-${Date.now()}.mp4`;
    downloadBlob(blob, outputName ? `${outputName}.mp4` : defaultName);
  }
  return blob;
}

function getSupportedWebmMimeType(withAudio) {
  const candidates = withAudio
    ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
    : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "video/webm";
}

async function exportWebmRealtime({ canvas, renderer, params, fps, duration, loadedSourceType, loadedVideo, loadedImage, sourceScale, onProgress, signal, includeAudio, autoDownload = true, outputName }) {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  const totalFrames = Math.max(1, Math.floor(duration * fps));

  const stream = canvas.captureStream(fps);
  const sourceVideo = loadedSourceType === "video" ? loadedVideo?.video : null;
  const wantsAudio = includeAudio && !!sourceVideo;

  if (wantsAudio) {
    try {
      const mediaStream = sourceVideo.captureStream?.() || sourceVideo.mozCaptureStream?.();
      const audioTrack = mediaStream?.getAudioTracks?.()[0];
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }
    } catch (error) {
      console.warn("Couldn't capture original audio track; exporting without audio.", error);
    }
  }

  const mimeType = getSupportedWebmMimeType(wantsAudio);
  const chunks = [];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: getTargetBitrate(width, height, fps),
  });

  recorder.addEventListener("dataavailable", (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  });

  const stopPromise = new Promise((resolve) => {
    recorder.addEventListener("stop", resolve, { once: true });
  });

  recorder.start(250);

  if (sourceVideo) {
    await seekVideo(sourceVideo, 0);
    sourceVideo.pause();
  }

  const start = performance.now();
  for (let frame = 0; frame < totalFrames; frame++) {
    if (signal?.aborted) {
      recorder.stop();
      throw new DOMException("The operation was aborted.", "AbortError");
    }

    const t = frame / fps;
    if (sourceVideo) {
      await seekVideo(sourceVideo, t);
      renderer.setImage(sourceVideo, sourceScale());
    } else if (loadedImage) {
      renderer.setImage(loadedImage, sourceScale());
    }

    renderer.render(ctx, width, height, t, params, frame, fps);
    onProgress?.((frame + 1) / totalFrames, frame + 1, totalFrames);

    const nextFrameAt = start + ((frame + 1) * 1000) / fps;
    const delay = Math.max(0, nextFrameAt - performance.now());
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  recorder.stop();
  await stopPromise;

  for (const track of stream.getTracks()) {
    track.stop();
  }

  const blob = new Blob(chunks, { type: mimeType });
  if (autoDownload) {
    const defaultName = `crt-export-${Date.now()}.webm`;
    downloadBlob(blob, outputName ? `${outputName}.webm` : defaultName);
  }
  return blob;
}

(function boot() {
  const renderer = new CRTRenderer();
  const canvas = document.getElementById("previewCanvas");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  const statusEl = document.getElementById("status");
  const progressEl = document.getElementById("progress");
  const previewBuffer = document.createElement("canvas");
  const exportBtn = document.getElementById("exportBtn");
  const downloadStillBtn = document.getElementById("downloadStillBtn");
  const saveProjectBtn = document.getElementById("saveProjectBtn");
  const loadProjectBtn = document.getElementById("loadProjectBtn");
  const copyShareLinkBtn = document.getElementById("copyShareLinkBtn");
  const projectFileInput = document.getElementById("projectFileInput");
  const savePresetBtn = document.getElementById("savePresetBtn");
  const renamePresetBtn = document.getElementById("renamePresetBtn");
  const deletePresetBtn = document.getElementById("deletePresetBtn");
  const exportPresetsBtn = document.getElementById("exportPresetsBtn");
  const importPresetsBtn = document.getElementById("importPresetsBtn");
  const importPresetsInput = document.getElementById("importPresetsInput");
  const cancelExportBtn = document.getElementById("cancelExportBtn");
  const resetParamsBtn = document.getElementById("resetParamsBtn");
  const resetSourceBtn = document.getElementById("resetSourceBtn");
  const imageInput = document.getElementById("imageInput");
  const presetSelect = document.getElementById("presetSelect");
  const batchInput = document.getElementById("batchInput");
  const addBatchBtn = document.getElementById("addBatchBtn");
  const clearBatchBtn = document.getElementById("clearBatchBtn");
  const runBatchBtn = document.getElementById("runBatchBtn");
  const cancelBatchBtn = document.getElementById("cancelBatchBtn");
  const batchQueueList = document.getElementById("batchQueueList");
  const batchSkipOnErrorEl = document.getElementById("batchSkipOnError");
  const batchOverallProgressEl = document.getElementById("batchOverallProgress");

  const controlIds = [
    "scanlineStrength",
    "phosphorMask",
    "barrelDistortion",
    "bloom",
    "flicker",
    "chromaticAberration",
    "noise",
    "pixelSize",
  ];

  let hasLoadedSource = false;
  let loadedSourceType = "image";
  let loadedVideo = null;
  let loadedImage = null;
  const builtInPresets = { ...FALLBACK_PRESETS };
  let userPresets = {};
  let presets = { ...builtInPresets };
  let start = performance.now();
  let previewFrameSeconds = 0;
  let previewTargetSeconds = 0;
  let previewNeedsSeek = false;
  let lastPreviewTick = 0;
  let defaultParamValues = null;
  let activeExportController = null;
  let isExporting = false;
  let previewDirty = true;
  let batchDefaultModeControl;
  let batchQueue = [];
  let batchJob = null;

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

    const syncToNumber = () => {
      numericInput.value = slider.value;
      numericInput.disabled = slider.disabled;
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

  function setStatus(message, mode = "info") {
    statusEl.textContent = message;
    statusEl.dataset.mode = mode;
  }

  function setExportAvailability() {
    const hasBatchItems = batchQueue.length > 0;
    const isBatchRunning = !!batchJob;
    exportBtn.disabled = !hasLoadedSource || isExporting || isBatchRunning;
    downloadStillBtn.disabled = !hasLoadedSource || isExporting || isBatchRunning;
    saveProjectBtn.disabled = isExporting || isBatchRunning;
    loadProjectBtn.disabled = isExporting || isBatchRunning;
    copyShareLinkBtn.disabled = isExporting || isBatchRunning;
    cancelExportBtn.disabled = !isExporting;
    resetSourceBtn.disabled = isExporting || isBatchRunning;
    resetParamsBtn.disabled = isExporting || isBatchRunning;
    imageInput.disabled = isExporting || isBatchRunning;
    document.getElementById("fps").disabled = isExporting || isBatchRunning;
    document.getElementById("duration").disabled = isExporting || isBatchRunning;
    document.getElementById("exportQuality").disabled = isExporting || isBatchRunning;
    document.getElementById("stillFormat").disabled = isExporting || isBatchRunning;
    document.getElementById("stillJpegQuality").disabled = isExporting || isBatchRunning || document.getElementById("stillFormat").value !== "jpeg";
    batchInput.disabled = isBatchRunning;
    addBatchBtn.disabled = isBatchRunning;
    clearBatchBtn.disabled = isBatchRunning || !hasBatchItems;
    runBatchBtn.disabled = isBatchRunning || hasBatchItems === false;
    cancelBatchBtn.disabled = !isBatchRunning;
    batchSkipOnErrorEl.disabled = isBatchRunning;
    exportFormatControl?.setDisabled(isExporting || isBatchRunning);
    batchDefaultModeControl?.setDisabled(isBatchRunning);
    updateExportControlsState();
  }

  function getBatchSettings() {
    return {
      defaultMode: batchDefaultModeControl?.getValue() === "still" ? "still" : "video",
      skipOnError: !!batchSkipOnErrorEl.checked,
    };
  }

  function saveBatchSettings() {
    try {
      localStorage.setItem(BATCH_SETTINGS_STORAGE_KEY, JSON.stringify(getBatchSettings()));
    } catch (error) {
      console.warn("Couldn't save batch settings", error);
    }
  }

  function loadBatchSettings() {
    try {
      const raw = localStorage.getItem(BATCH_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.defaultMode === "still" || parsed?.defaultMode === "video") {
        batchDefaultModeControl?.setValue(parsed.defaultMode, { silent: true });
      }
      if (typeof parsed?.skipOnError === "boolean") {
        batchSkipOnErrorEl.checked = parsed.skipOnError;
      }
    } catch (error) {
      console.warn("Couldn't load batch settings", error);
    }
  }

  function sanitizeFilename(value) {
    return String(value || "export").trim().replace(/[\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "") || "export";
  }

  function getBatchItemMode(item) {
    return item?.overrides?.mode || getBatchSettings().defaultMode;
  }

  function updateBatchOverallProgress() {
    if (!batchQueue.length) {
      batchOverallProgressEl.value = 0;
      return;
    }
    const sum = batchQueue.reduce((acc, item) => acc + (Number(item.progress) || 0), 0);
    batchOverallProgressEl.value = Math.max(0, Math.min(1, sum / batchQueue.length));
  }

  function renderBatchQueue() {
    if (!batchQueue.length) {
      batchQueueList.innerHTML = '<div class="batch-empty">No queued files yet.</div>';
      updateBatchOverallProgress();
      setExportAvailability();
      return;
    }

    const isBatchRunning = !!batchJob;
    batchQueueList.innerHTML = "";

    batchQueue.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "batch-item";
      const modeValue = getBatchItemMode(item);
      const modeLabel = modeValue === "still" ? "Single frame" : "Loop video";
      card.innerHTML = `
        <div class="batch-item-header">
          <div class="batch-item-title" title="${item.file.name}">${index + 1}. ${item.file.name}</div>
          <div class="batch-item-status">${item.status}${item.error ? ` · ${item.error}` : ""}</div>
        </div>
        <div class="batch-item-row">
          <input data-action="name" value="${item.targetName}" ${isBatchRunning ? "disabled" : ""} />
          <select data-action="mode" ${isBatchRunning ? "disabled" : ""}>
            <option value="video" ${modeValue === "video" ? "selected" : ""}>${modeLabel === "Loop video" ? "Loop video" : "Loop video (override)"}</option>
            <option value="still" ${modeValue === "still" ? "selected" : ""}>Single frame</option>
          </select>
          <button data-action="up" ${isBatchRunning || index === 0 ? "disabled" : ""}>↑</button>
          <button data-action="down" ${isBatchRunning || index === batchQueue.length - 1 ? "disabled" : ""}>↓</button>
        </div>
        <div class="batch-item-row">
          <progress max="1" value="${Math.max(0, Math.min(1, item.progress || 0))}"></progress>
          <button data-action="remove" ${isBatchRunning ? "disabled" : ""}>Remove</button>
        </div>
      `;

      card.querySelector('[data-action="name"]').addEventListener("input", (event) => {
        item.targetName = sanitizeFilename(event.target.value);
      });
      card.querySelector('[data-action="mode"]').addEventListener("change", (event) => {
        const next = event.target.value === "still" ? "still" : "video";
        item.overrides = { ...(item.overrides || {}), mode: next };
        saveBatchSettings();
      });
      card.querySelector('[data-action="up"]').addEventListener("click", () => {
        if (index <= 0) return;
        const [moved] = batchQueue.splice(index, 1);
        batchQueue.splice(index - 1, 0, moved);
        renderBatchQueue();
      });
      card.querySelector('[data-action="down"]').addEventListener("click", () => {
        if (index >= batchQueue.length - 1) return;
        const [moved] = batchQueue.splice(index, 1);
        batchQueue.splice(index + 1, 0, moved);
        renderBatchQueue();
      });
      card.querySelector('[data-action="remove"]').addEventListener("click", () => {
        batchQueue.splice(index, 1);
        renderBatchQueue();
      });
      batchQueueList.appendChild(card);
    });

    updateBatchOverallProgress();
    setExportAvailability();
  }

  let previewModeControl;
  let previewScaleControl;
  let sourceScaleControl;
  let previewMaxPixelsControl;
  let presetControl;
  let exportFormatControl;

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



  function resetParameters() {
    const targetValues = defaultParamValues || readParams();
    for (const id of controlIds) {
      if (typeof targetValues[id] === "number") {
        const slider = document.getElementById(id);
        slider.value = targetValues[id];
        slider.__syncRangeNumber?.();
      }
    }
    sourceScaleControl?.setValue("1", { silent: true });
    refreshRendererSource();
    if (loadedSourceType === "video" && isStillPreviewMode()) {
      previewNeedsSeek = true;
    }
    markPreviewDirty();
    progressEl.value = 0;
    setStatus("Parameters reset to defaults.", "success");
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

    if (!silent) {
      setStatus("Source reset. Load a new image or video.", "info");
    }
  }

  function readParams() {
    return Object.fromEntries(controlIds.map((id) => [id, Number(document.getElementById(id).value)]));
  }

  function getNumericInputBounds(id, fallbackMin = -Infinity, fallbackMax = Infinity) {
    const input = document.getElementById(id);
    if (!input) return { min: fallbackMin, max: fallbackMax };
    const min = Number(input.min);
    const max = Number(input.max);
    return {
      min: Number.isFinite(min) ? min : fallbackMin,
      max: Number.isFinite(max) ? max : fallbackMax,
    };
  }

  function clampNumber(value, min, max) {
    if (!Number.isFinite(value)) return null;
    return Math.min(max, Math.max(min, value));
  }

  function encodeStateForUrl(state) {
    return btoa(encodeURIComponent(JSON.stringify(state)));
  }

  function decodeStateFromUrl(encoded) {
    return JSON.parse(decodeURIComponent(atob(encoded)));
  }

  function createProjectModel({ compact = false } = {}) {
    const exportFormat = exportFormatControl?.getValue() || "mp4";
    return {
      version: 1,
      activePresetName: presetControl?.getValue() || "custom",
      sliders: readParams(),
      preview: {
        mode: previewModeControl?.getValue() || "still",
        scale: getPreviewScale(),
        sourceScale: getSourceScale(),
        quality: getPreviewMaxPixels(),
        timestamp: Number(previewTargetSeconds || previewFrameSeconds || 0),
      },
      export: {
        fps: Number(document.getElementById("fps").value),
        duration: Number(document.getElementById("duration").value),
        format: exportFormat,
        quality: Number(document.getElementById("exportQuality").value),
        includeAudio: exportFormat === "webm" ? document.getElementById("includeOriginalAudio").checked : false,
      },
      ...(compact ? {} : { savedAt: new Date().toISOString() }),
    };
  }

  function applyProjectState(model, { fromUrl = false } = {}) {
    const warnings = [];
    if (!model || typeof model !== "object" || Array.isArray(model)) {
      throw new Error("Project data must be a JSON object.");
    }

    const allowedTopLevel = new Set(["version", "activePresetName", "sliders", "preview", "export", "savedAt"]);
    for (const key of Object.keys(model)) {
      if (!allowedTopLevel.has(key)) {
        warnings.push(`Unknown top-level field "${key}" was ignored.`);
      }
    }

    const sliderSource = model.sliders && typeof model.sliders === "object" ? model.sliders : null;
    if (!sliderSource) {
      warnings.push("Missing sliders object; current slider values were kept.");
    }

    if (sliderSource) {
      for (const id of controlIds) {
        if (!(id in sliderSource)) {
          warnings.push(`Missing slider field "${id}"; kept current value.`);
          continue;
        }
        const slider = document.getElementById(id);
        const rawValue = Number(sliderSource[id]);
        const { min, max } = getNumericInputBounds(id, -Infinity, Infinity);
        const clamped = clampNumber(rawValue, min, max);
        if (clamped === null) {
          warnings.push(`Invalid slider value for "${id}"; kept current value.`);
          continue;
        }
        if (clamped !== rawValue) {
          warnings.push(`Slider "${id}" was out of range and was clamped.`);
        }
        slider.value = String(clamped);
        slider.__syncRangeNumber?.();
      }
    }

    const presetName = typeof model.activePresetName === "string" ? model.activePresetName : null;
    if (!presetName) {
      warnings.push("Missing activePresetName; preset selection unchanged.");
    } else if (presets[presetName]) {
      presetControl?.setValue(presetName, { silent: true });
    } else {
      warnings.push(`Unknown preset "${presetName}"; using current preset selection.`);
    }

    const preview = model.preview && typeof model.preview === "object" ? model.preview : null;
    if (!preview) {
      warnings.push("Missing preview object; preview controls unchanged.");
    } else {
      const mode = typeof preview.mode === "string" ? preview.mode : null;
      if (mode === "still" || mode === "playback") {
        previewModeControl?.setValue(mode, { silent: true });
      } else {
        warnings.push("Invalid or missing preview.mode; expected still or playback.");
      }

      const previewScaleOptions = [1, 0.75, 0.5, 0.33];
      const previewScaleValue = clampNumber(Number(preview.scale), 0.1, 1);
      if (previewScaleValue !== null) {
        const nearest = previewScaleOptions.reduce((best, option) =>
          Math.abs(option - previewScaleValue) < Math.abs(best - previewScaleValue) ? option : best,
        previewScaleOptions[0]);
        if (nearest !== previewScaleValue) warnings.push("preview.scale was mapped to nearest supported option.");
        previewScaleControl?.setValue(String(nearest), { silent: true });
      } else {
        warnings.push("Invalid or missing preview.scale; preview scale unchanged.");
      }

      const sourceScaleOptions = [1, 0.75, 0.5, 0.33, 0.25];
      const sourceScaleValue = clampNumber(Number(preview.sourceScale), 0.1, 1);
      if (sourceScaleValue !== null) {
        const nearest = sourceScaleOptions.reduce((best, option) =>
          Math.abs(option - sourceScaleValue) < Math.abs(best - sourceScaleValue) ? option : best,
        sourceScaleOptions[0]);
        if (nearest !== sourceScaleValue) warnings.push("preview.sourceScale was mapped to nearest supported option.");
        sourceScaleControl?.setValue(String(nearest), { silent: true });
      } else {
        warnings.push("Invalid or missing preview.sourceScale; source scale unchanged.");
      }

      const qualityOptions = [307200, 921600, 2073600, 0];
      const qualityValue = clampNumber(Number(preview.quality), 0, 10_000_000);
      if (qualityValue !== null) {
        const nearest = qualityOptions.reduce((best, option) =>
          Math.abs(option - qualityValue) < Math.abs(best - qualityValue) ? option : best,
        qualityOptions[0]);
        if (nearest !== qualityValue) warnings.push("preview.quality was mapped to nearest supported option.");
        previewMaxPixelsControl?.setValue(String(nearest), { silent: true });
      } else {
        warnings.push("Invalid or missing preview.quality; preview quality unchanged.");
      }

      const previewTime = document.getElementById("previewTime");
      const maxPreviewTime = Number(previewTime.max) || 0;
      const timestampValue = clampNumber(Number(preview.timestamp), 0, maxPreviewTime);
      if (timestampValue !== null) {
        previewTargetSeconds = timestampValue;
        previewFrameSeconds = timestampValue;
        previewTime.value = timestampValue.toFixed(3);
        previewTime.__syncRangeNumber?.();
        previewNeedsSeek = loadedSourceType === "video";
      } else {
        warnings.push("Invalid or missing preview.timestamp; preview time unchanged.");
      }
    }

    const exportState = model.export && typeof model.export === "object" ? model.export : null;
    if (!exportState) {
      warnings.push("Missing export object; export controls unchanged.");
    } else {
      const fpsBounds = getNumericInputBounds("fps", 1, 120);
      const fpsValue = clampNumber(Number(exportState.fps), fpsBounds.min, fpsBounds.max);
      if (fpsValue !== null) {
        document.getElementById("fps").value = String(fpsValue);
      } else {
        warnings.push("Invalid or missing export.fps; FPS unchanged.");
      }

      const durationBounds = getNumericInputBounds("duration", 0.1, 60);
      const durationValue = clampNumber(Number(exportState.duration), durationBounds.min, durationBounds.max);
      if (durationValue !== null) {
        document.getElementById("duration").value = String(durationValue);
      } else {
        warnings.push("Invalid or missing export.duration; duration unchanged.");
      }

      const exportQualityBounds = getNumericInputBounds("exportQuality", 0.5, 2.5);
      const exportQualityValue = clampNumber(Number(exportState.quality), exportQualityBounds.min, exportQualityBounds.max);
      if (exportQualityValue !== null) {
        document.getElementById("exportQuality").value = String(exportQualityValue);
      } else {
        warnings.push("Invalid or missing export.quality; quality unchanged.");
      }

      const exportFormat = typeof exportState.format === "string" ? exportState.format : null;
      if (exportFormat === "mp4" || exportFormat === "webm") {
        exportFormatControl?.setValue(exportFormat, { silent: true });
      } else {
        warnings.push("Invalid or missing export.format; format unchanged.");
      }

      if (typeof exportState.includeAudio === "boolean") {
        document.getElementById("includeOriginalAudio").checked = exportState.includeAudio;
      } else {
        warnings.push("Missing export.includeAudio; include-audio toggle unchanged.");
      }
    }

    refreshRendererSource();
    updatePreviewControlsState();
    updateExportControlsState();
    syncVideoPlaybackState();
    markPreviewDirty();
    progressEl.value = 0;

    if (warnings.length > 0) {
      setStatus(`${fromUrl ? "Link" : "Project"} loaded with warnings: ${warnings[0]}`, "warn");
      console.warn("State load warnings:", warnings);
    } else {
      setStatus(`${fromUrl ? "Link" : "Project"} loaded successfully.`, "success");
    }
  }

  function tryHydrateFromUrl() {
    const url = new URL(window.location.href);
    const encoded = url.searchParams.get("state") || (url.hash.startsWith("#state=") ? url.hash.slice(7) : "");
    if (!encoded) return false;
    try {
      const parsed = decodeStateFromUrl(encoded);
      applyProjectState(parsed, { fromUrl: true });
      return true;
    } catch (error) {
      setStatus(`Couldn't load state from URL: ${error.message}`, "warn");
      console.warn("URL state decode failed", error);
      return true;
    }
  }

  function getSafePresetName() {
    const presetName = presetControl?.getValue() || "custom";
    return String(presetName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "custom";
  }

  async function renderCurrentPreviewFrameToCanvas(targetCtx, width, height, { secondsOverride } = {}) {
    const fps = Math.max(1, Number(document.getElementById("fps").value) || 30);
    const params = readParams();
    const stillMode = isStillPreviewMode();

    let frameSeconds = Number.isFinite(secondsOverride) ? Math.max(0, secondsOverride) : 0;
    if (loadedSourceType === "video" && loadedVideo?.video) {
      const video = loadedVideo.video;
      frameSeconds = stillMode ? previewTargetSeconds : video.currentTime;
      await seekVideo(video, frameSeconds);
      renderer.setImage(video, getSourceScale());
    } else if (loadedImage) {
      renderer.setImage(loadedImage, getSourceScale());
    }

    const frameIndex = Math.max(0, Math.floor(frameSeconds * fps));
    renderer.render(targetCtx, width, height, frameSeconds, params, frameIndex, fps);

    if (targetCtx === ctx) {
      previewFrameSeconds = frameSeconds;
      if (loadedSourceType === "video" && stillMode) {
        previewTargetSeconds = frameSeconds;
        const previewTime = document.getElementById("previewTime");
        previewTime.value = frameSeconds.toFixed(3);
        previewTime.__syncRangeNumber?.();
      }
      previewDirty = false;
    }

    return frameSeconds;
  }

  function isBuiltInPreset(name) {
    return Object.prototype.hasOwnProperty.call(builtInPresets, name);
  }

  function normalizePresetValues(rawValues) {
    const normalized = {};
    for (const id of controlIds) {
      const { min, max } = getNumericInputBounds(id, -Infinity, Infinity);
      const value = clampNumber(Number(rawValues?.[id]), min, max);
      if (value !== null) {
        normalized[id] = value;
      }
    }
    return normalized;
  }

  function rebuildPresetMap() {
    presets = { ...builtInPresets, ...userPresets };
  }

  function getUserPresetsDocument() {
    return {
      schemaVersion: USER_PRESETS_SCHEMA_VERSION,
      presets: { ...userPresets },
    };
  }

  function migrateUserPresetsDocument(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { schemaVersion: USER_PRESETS_SCHEMA_VERSION, presets: {} };
    }

    const version = Number(raw.schemaVersion);
    if (!Number.isFinite(version)) {
      return { schemaVersion: USER_PRESETS_SCHEMA_VERSION, presets: raw };
    }

    if (version > USER_PRESETS_SCHEMA_VERSION) {
      throw new Error(`Unsupported presets schema version ${version}.`);
    }

    if (version === 1) {
      const sourcePresets = raw.presets && typeof raw.presets === "object" && !Array.isArray(raw.presets) ? raw.presets : {};
      return { schemaVersion: USER_PRESETS_SCHEMA_VERSION, presets: sourcePresets };
    }

    return { schemaVersion: USER_PRESETS_SCHEMA_VERSION, presets: {} };
  }

  function sanitizeUserPresetsMap(rawPresets) {
    const next = {};
    if (!rawPresets || typeof rawPresets !== "object" || Array.isArray(rawPresets)) {
      return next;
    }

    for (const [name, value] of Object.entries(rawPresets)) {
      const cleanName = String(name || "").trim();
      if (!cleanName || isBuiltInPreset(cleanName)) continue;
      const normalized = normalizePresetValues(value);
      if (Object.keys(normalized).length > 0) {
        next[cleanName] = normalized;
      }
    }
    return next;
  }

  function saveUserPresetsToStorage() {
    try {
      localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(getUserPresetsDocument()));
    } catch (error) {
      console.warn("Failed to persist user presets", error);
    }
  }

  function loadUserPresetsFromStorage() {
    const raw = localStorage.getItem(USER_PRESETS_STORAGE_KEY);
    if (!raw) {
      userPresets = {};
      rebuildPresetMap();
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const migrated = migrateUserPresetsDocument(parsed);
      userPresets = sanitizeUserPresetsMap(migrated.presets);
      rebuildPresetMap();
      if (migrated.schemaVersion !== USER_PRESETS_SCHEMA_VERSION || JSON.stringify(migrated.presets) !== JSON.stringify(userPresets)) {
        saveUserPresetsToStorage();
      }
    } catch (error) {
      console.warn("Failed to load user presets from storage", error);
      userPresets = {};
      rebuildPresetMap();
    }
  }

  function updatePresetActionButtons() {
    const activeName = presetControl?.getValue();
    const editable = !!activeName && !isBuiltInPreset(activeName);
    if (renamePresetBtn) renamePresetBtn.disabled = !editable;
    if (deletePresetBtn) deletePresetBtn.disabled = !editable;
  }

  function applyPreset(name) {
    const values = presets[name];
    if (!values) return;
    for (const id of controlIds) {
      if (typeof values[id] === "number") {
        const slider = document.getElementById(id);
        slider.value = values[id];
        slider.__syncRangeNumber?.();
      }
    }
  }

  function createPresetGroup(title, names, selectedName) {
    const group = document.createElement("div");
    group.className = "preset-group";

    const heading = document.createElement("div");
    heading.className = "preset-group-title";
    heading.textContent = title;
    group.appendChild(heading);

    if (names.length === 0) {
      const empty = document.createElement("div");
      empty.className = "selection-empty";
      empty.textContent = "None";
      group.appendChild(empty);
      return group;
    }

    const options = document.createElement("div");
    options.className = "selection-box selection-box-wrap";
    for (const name of names) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.value = name;
      button.textContent = name;
      button.dataset.presetOrigin = isBuiltInPreset(name) ? "builtin" : "user";
      if (selectedName === name) button.dataset.selected = "true";
      options.appendChild(button);
    }
    group.appendChild(options);
    return group;
  }

  function initializePresets({ preferredName, silentApply = false } = {}) {
    const builtInNames = Object.keys(builtInPresets);
    const userNames = Object.keys(userPresets);
    const allNames = [...builtInNames, ...userNames];
    presetSelect.innerHTML = "";

    if (allNames.length === 0) {
      const message = document.createElement("div");
      message.className = "selection-empty";
      message.textContent = "No presets available";
      presetSelect.appendChild(message);
      updatePresetActionButtons();
      return;
    }

    const currentSelection = preferredName || presetControl?.getValue();
    const defaultPreset = builtInPresets["Consumer TV"] ? "Consumer TV" : allNames[0];
    const selectedName = allNames.includes(currentSelection) ? currentSelection : defaultPreset;

    presetSelect.appendChild(createPresetGroup("Built-in presets (read-only)", builtInNames, selectedName));
    presetSelect.appendChild(createPresetGroup("Your presets", userNames, selectedName));

    presetControl = setupSelectionBox("presetSelect", {
      onChange: (name) => {
        applyPreset(name);
        markPreviewDirty();
        progressEl.value = 0;
        updatePresetActionButtons();
        setStatus(`Preset applied: ${name}`, "success");
      },
    });

    presetControl.setValue(selectedName, { silent: true });
    applyPreset(selectedName);
    updatePresetActionButtons();
    if (!silentApply) {
      markPreviewDirty();
    }
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

  async function exportStillBlob({ outputName, frameSeconds = 0, signal }) {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }
    renderer.render(ctx, canvas.width, canvas.height, frameSeconds, readParams(), Math.max(0, Math.floor(frameSeconds * (Number(document.getElementById("fps").value) || 30))), Number(document.getElementById("fps").value) || 30);
    const stillFormat = document.getElementById("stillFormat").value === "jpeg" ? "jpeg" : "png";
    const mimeType = stillFormat === "jpeg" ? "image/jpeg" : "image/png";
    const jpegQualityRaw = Number(document.getElementById("stillJpegQuality").value);
    const jpegQuality = Math.max(0.1, Math.min(1, Number.isFinite(jpegQualityRaw) ? jpegQualityRaw : 0.92));
    const extension = stillFormat === "jpeg" ? "jpg" : "png";

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((nextBlob) => {
        if (!nextBlob) {
          reject(new Error("Canvas export returned an empty blob."));
          return;
        }
        resolve(nextBlob);
      }, mimeType, stillFormat === "jpeg" ? jpegQuality : undefined);
    });

    downloadBlob(blob, `${sanitizeFilename(outputName)}.${extension}`);
    return blob;
  }

  function cleanupBatchSource(source) {
    if (!source) return;
    if (source.type === "video" && source.videoRef?.video) {
      source.videoRef.video.pause();
      source.videoRef.video.removeAttribute("src");
      source.videoRef.video.load();
    }
    if (source.videoRef?.objectUrl) {
      URL.revokeObjectURL(source.videoRef.objectUrl);
    }
    if (source.type === "image" && source.imageRef && typeof source.imageRef.close === "function") {
      source.imageRef.close();
    }
  }

  async function runBatchQueue() {
    if (!batchQueue.length || batchJob) return;

    const previousSource = { loadedVideo, loadedImage, loadedSourceType, hasLoadedSource, canvasWidth: canvas.width, canvasHeight: canvas.height };
    const controller = new AbortController();
    batchJob = { controller };
    for (const item of batchQueue) {
      item.status = "Queued";
      item.progress = 0;
      item.error = "";
    }
    renderBatchQueue();
    setStatus(`Starting batch export (${batchQueue.length} items)...`, "info");

    const skipOnError = !!batchSkipOnErrorEl.checked;
    const fps = Math.max(1, Number(document.getElementById("fps").value) || 30);
    const duration = Math.max(0.5, Number(document.getElementById("duration").value) || 4);
    const qualityMultiplier = Math.max(0.5, Math.min(2.5, Number(document.getElementById("exportQuality").value) || 1));
    const includeOriginalAudio = document.getElementById("includeOriginalAudio").checked;
    const selectedFormat = exportFormatControl?.getValue() || "mp4";

    try {
      for (let index = 0; index < batchQueue.length; index++) {
        const item = batchQueue[index];
        if (controller.signal.aborted) {
          throw new DOMException("Batch cancelled", "AbortError");
        }
        item.status = "Processing";
        item.progress = 0;
        renderBatchQueue();

        let source = null;
        try {
          const isVideoFile = item.file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(item.file.name);
          if (isVideoFile) {
            const videoRef = await loadVideoFromFile(item.file);
            source = { type: "video", videoRef };
            loadedVideo = videoRef;
            loadedImage = null;
            loadedSourceType = "video";
            hasLoadedSource = true;
            canvas.width = videoRef.video.videoWidth;
            canvas.height = videoRef.video.videoHeight;
            await seekVideo(videoRef.video, 0);
            renderer.setImage(videoRef.video, getSourceScale());
          } else {
            const imageRef = await loadImageFromFile(item.file);
            source = { type: "image", imageRef };
            loadedImage = imageRef;
            loadedVideo = null;
            loadedSourceType = "image";
            hasLoadedSource = true;
            canvas.width = imageRef.naturalWidth || imageRef.width;
            canvas.height = imageRef.naturalHeight || imageRef.height;
            renderer.setImage(imageRef, getSourceScale());
          }

          const mode = getBatchItemMode(item);
          const safeOutputName = sanitizeFilename(item.targetName || item.file.name.replace(/\.[^.]+$/, ""));
          const isStillMode = mode === "still" && source.type === "image";

          if (isStillMode) {
            await exportStillBlob({ outputName: safeOutputName, frameSeconds: 0, signal: controller.signal });
            item.progress = 1;
          } else if (selectedFormat === "webm" || (includeOriginalAudio && source.type === "video")) {
            await exportWebmRealtime({
              canvas,
              renderer,
              params: readParams(),
              fps,
              duration,
              loadedSourceType,
              loadedVideo,
              loadedImage,
              sourceScale: getSourceScale,
              includeAudio: includeOriginalAudio && source.type === "video",
              onProgress: (value) => {
                item.progress = value;
                updateBatchOverallProgress();
              },
              signal: controller.signal,
              outputName: safeOutputName,
            });
          } else {
            await exportMp4({
              canvas,
              renderer,
              params: readParams(),
              fps,
              duration,
              beforeRenderFrame: source.type === "video"
                ? async (t) => {
                    await seekVideo(source.videoRef.video, t);
                    renderer.setImage(source.videoRef.video, getSourceScale());
                  }
                : null,
              onProgress: (value) => {
                item.progress = value;
                updateBatchOverallProgress();
              },
              signal: controller.signal,
              bitrateScale: qualityMultiplier,
              outputName: safeOutputName,
            });
          }

          item.status = "Done";
          item.progress = 1;
        } catch (error) {
          item.status = error?.name === "AbortError" ? "Cancelled" : "Failed";
          item.error = error?.message || "Unknown error";
          if (!skipOnError && error?.name !== "AbortError") {
            throw error;
          }
          if (error?.name === "AbortError") {
            throw error;
          }
        } finally {
          cleanupBatchSource(source);
          renderBatchQueue();
        }
      }
      setStatus("Batch export finished.", "success");
    } catch (error) {
      if (error?.name === "AbortError") {
        setStatus("Batch export cancelled.", "warn");
      } else {
        setStatus(`Batch export failed: ${error.message}`, "error");
      }
    } finally {
      loadedVideo = previousSource.loadedVideo;
      loadedImage = previousSource.loadedImage;
      loadedSourceType = previousSource.loadedSourceType;
      hasLoadedSource = previousSource.hasLoadedSource;
      canvas.width = previousSource.canvasWidth;
      canvas.height = previousSource.canvasHeight;
      refreshRendererSource();
      markPreviewDirty();
      batchJob = null;
      renderBatchQueue();
      setExportAvailability();
    }
  }

  function animate(now) {
    const fps = Math.max(1, Number(document.getElementById("fps").value) || 30);
    const elapsed = (now - start) / 1000;
    const frame = Math.floor(elapsed * fps);
    const stillMode = isStillPreviewMode();

    if (loadedSourceType === "video" && loadedVideo?.video) {
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
      const { width: previewWidth, height: previewHeight } = getPreviewRenderSize();
      if (previewWidth === canvas.width && previewHeight === canvas.height) {
        renderCurrentPreviewFrameToCanvas(ctx, canvas.width, canvas.height, { secondsOverride: frame / fps }).catch((error) => {
          console.warn("Preview render failed", error);
        });
      } else {
        previewBuffer.width = previewWidth;
        previewBuffer.height = previewHeight;
        const previewCtx = previewBuffer.getContext("2d", { alpha: false, desynchronized: true });
        renderCurrentPreviewFrameToCanvas(previewCtx, previewBuffer.width, previewBuffer.height, { secondsOverride: frame / fps })
          .then(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(previewBuffer, 0, 0, canvas.width, canvas.height);
            previewDirty = false;
          })
          .catch((error) => {
            console.warn("Preview render failed", error);
          });
      }
      if (previewWidth === canvas.width && previewHeight === canvas.height) {
        previewDirty = false;
      }
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
        previewTargetSeconds = 0;
        previewFrameSeconds = 0;
        syncPreviewTimeControl();
        updatePreviewControlsState();
        updateExportControlsState();
        markPreviewDirty();
        setStatus(`Loaded image ${file.name}. Ready to export.`, "success");
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


  addBatchBtn?.addEventListener("click", () => {
    const files = Array.from(batchInput.files || []);
    if (!files.length) {
      setStatus("Select one or more files for the batch queue.", "warn");
      return;
    }

    for (const file of files) {
      const baseName = sanitizeFilename(file.name.replace(/\.[^.]+$/, ""));
      batchQueue.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        metadata: {
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          lastModified: file.lastModified,
        },
        targetName: baseName,
        overrides: {},
        status: "Queued",
        progress: 0,
        error: "",
      });
    }
    batchInput.value = "";
    renderBatchQueue();
    setStatus(`Added ${files.length} file(s) to batch queue.`, "success");
  });

  clearBatchBtn?.addEventListener("click", () => {
    batchQueue = [];
    renderBatchQueue();
    setStatus("Batch queue cleared.", "info");
  });

  runBatchBtn?.addEventListener("click", () => {
    runBatchQueue();
  });

  cancelBatchBtn?.addEventListener("click", () => {
    if (!batchJob?.controller) return;
    batchJob.controller.abort();
    setStatus("Cancelling batch export...", "warn");
  });

  batchSkipOnErrorEl?.addEventListener("change", saveBatchSettings);

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

  document.getElementById("stillFormat").addEventListener("change", () => {
    setExportAvailability();
  });

  downloadStillBtn.addEventListener("click", async () => {
    if (!hasLoadedSource) {
      setStatus("Load an image or video before exporting a still.", "warn");
      return;
    }

    try {
      isExporting = true;
      setExportAvailability();
      progressEl.value = 0;
      setStatus("Rendering still frame...", "info");

      const frameSeconds = await renderCurrentPreviewFrameToCanvas(ctx, canvas.width, canvas.height);
      const stillFormat = document.getElementById("stillFormat").value === "jpeg" ? "jpeg" : "png";
      const mimeType = stillFormat === "jpeg" ? "image/jpeg" : "image/png";
      const jpegQualityRaw = Number(document.getElementById("stillJpegQuality").value);
      const jpegQuality = Math.max(0.1, Math.min(1, Number.isFinite(jpegQualityRaw) ? jpegQualityRaw : 0.92));
      const extension = stillFormat === "jpeg" ? "jpg" : "png";

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((nextBlob) => {
          if (!nextBlob) {
            reject(new Error("Canvas export returned an empty blob."));
            return;
          }
          resolve(nextBlob);
        }, mimeType, stillFormat === "jpeg" ? jpegQuality : undefined);
      });

      const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
      const filename = `crt-still-${getSafePresetName()}-${timestamp}.${extension}`;
      downloadBlob(blob, filename);
      progressEl.value = 1;
      setStatus(`Still saved (${extension.toUpperCase()}) at ${frameSeconds.toFixed(3)}s.`, "success");
    } catch (error) {
      setStatus(`Still export failed: ${error.message}`, "error");
      console.error(error);
    } finally {
      isExporting = false;
      setExportAvailability();
    }
  });

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

      if (selectedFormat === "mp4" && mustUseRealtimeAudio) {
        setStatus("Audio passthrough requires WebM realtime export. Switching format for this render.", "warn");
      }

      if (selectedFormat === "webm" || mustUseRealtimeAudio) {
        await exportWebmRealtime({
          canvas,
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
        });
      } else {
        await exportMp4({
          canvas,
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

  cancelExportBtn.addEventListener("click", () => {
    if (!isExporting || !activeExportController) return;
    activeExportController.abort();
    setStatus("Cancelling export...", "warn");
  });

  savePresetBtn?.addEventListener("click", () => {
    const rawName = prompt("Preset name:");
    if (rawName === null) return;
    const name = rawName.trim();
    if (!name) {
      setStatus("Preset name cannot be empty.", "warn");
      return;
    }
    if (isBuiltInPreset(name)) {
      setStatus("Built-in preset names are reserved and read-only.", "warn");
      return;
    }
    if (userPresets[name] && !confirm(`Overwrite user preset "${name}"?`)) {
      return;
    }

    userPresets[name] = normalizePresetValues(readParams());
    rebuildPresetMap();
    saveUserPresetsToStorage();
    initializePresets({ preferredName: name, silentApply: true });
    setStatus(`Saved user preset: ${name}`, "success");
  });

  renamePresetBtn?.addEventListener("click", () => {
    const current = presetControl?.getValue();
    if (!current || isBuiltInPreset(current) || !userPresets[current]) {
      setStatus("Only user presets can be renamed.", "warn");
      return;
    }

    const rawName = prompt("New preset name:", current);
    if (rawName === null) return;
    const name = rawName.trim();
    if (!name) {
      setStatus("Preset name cannot be empty.", "warn");
      return;
    }
    if (name === current) return;
    if (isBuiltInPreset(name)) {
      setStatus("Built-in preset names are reserved and read-only.", "warn");
      return;
    }
    if (userPresets[name] && !confirm(`Overwrite existing user preset "${name}"?`)) {
      return;
    }

    userPresets[name] = userPresets[current];
    delete userPresets[current];
    rebuildPresetMap();
    saveUserPresetsToStorage();
    initializePresets({ preferredName: name, silentApply: true });
    setStatus(`Renamed preset to: ${name}`, "success");
  });

  deletePresetBtn?.addEventListener("click", () => {
    const current = presetControl?.getValue();
    if (!current || isBuiltInPreset(current) || !userPresets[current]) {
      setStatus("Only user presets can be deleted.", "warn");
      return;
    }
    if (!confirm(`Delete user preset "${current}"?`)) return;

    delete userPresets[current];
    rebuildPresetMap();
    saveUserPresetsToStorage();
    initializePresets({ preferredName: "Consumer TV", silentApply: true });
    setStatus(`Deleted preset: ${current}`, "success");
  });

  exportPresetsBtn?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(getUserPresetsDocument(), null, 2)], { type: "application/json" });
    downloadBlob(blob, `crt-user-presets-${Date.now()}.json`);
    setStatus("Exported user presets JSON.", "success");
  });

  importPresetsBtn?.addEventListener("click", () => {
    importPresetsInput?.click();
  });

  importPresetsInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const migrated = migrateUserPresetsDocument(parsed);
      const imported = sanitizeUserPresetsMap(migrated.presets);
      userPresets = imported;
      rebuildPresetMap();
      saveUserPresetsToStorage();
      initializePresets({ preferredName: Object.keys(imported)[0] || "Consumer TV", silentApply: true });
      setStatus(`Imported ${Object.keys(imported).length} user presets.`, "success");
    } catch (error) {
      setStatus(`Failed to import presets: ${error.message}`, "error");
    } finally {
      importPresetsInput.value = "";
    }
  });

  resetParamsBtn.addEventListener("click", () => {
    resetParameters();
  });

  resetSourceBtn.addEventListener("click", () => {
    clearLoadedSource();
  });

  saveProjectBtn.addEventListener("click", () => {
    const model = createProjectModel();
    const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
    downloadBlob(blob, `crt-project-${Date.now()}.json`);
    setStatus("Project saved to JSON.", "success");
  });

  loadProjectBtn.addEventListener("click", () => {
    projectFileInput.click();
  });

  projectFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      applyProjectState(parsed);
    } catch (error) {
      setStatus(`Couldn't load project file: ${error.message}`, "error");
    } finally {
      projectFileInput.value = "";
    }
  });

  copyShareLinkBtn.addEventListener("click", async () => {
    try {
      const compactState = createProjectModel({ compact: true });
      const encoded = encodeStateForUrl(compactState);
      const url = new URL(window.location.href);
      url.searchParams.set("state", encoded);
      url.hash = "";
      const shareLink = url.toString();
      await navigator.clipboard.writeText(shareLink);
      setStatus("Share link copied to clipboard.", "success");
    } catch (error) {
      setStatus(`Couldn't copy share link: ${error.message}`, "error");
    }
  });

  for (const id of [...controlIds, "fps", "duration"]) {
    document.getElementById(id).addEventListener("input", () => {
      markPreviewDirty();
      progressEl.value = 0;
    });
  }

  for (const id of [...controlIds, "previewTime"]) {
    setupRangeWithNumber(id);
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

  exportFormatControl = setupSelectionBox("exportFormat", {
    onChange: () => {
      progressEl.value = 0;
    },
  });

  batchDefaultModeControl = setupSelectionBox("batchDefaultMode", {
    onChange: () => {
      saveBatchSettings();
      renderBatchQueue();
    },
  });

  loadBatchSettings();
  renderBatchQueue();
  setExportAvailability();
  loadUserPresetsFromStorage();
  initializePresets();
  defaultParamValues = readParams();
  updatePreviewControlsState();
  updateExportControlsState();
  syncPreviewTimeControl();
  const hasUrlState = tryHydrateFromUrl();
  window.addEventListener("beforeunload", () => {
    if (loadedVideo?.objectUrl) {
      URL.revokeObjectURL(loadedVideo.objectUrl);
    }
    if (loadedImage && typeof loadedImage.close === "function") {
      loadedImage.close();
    }
  });


  if (!hasUrlState) {
    setStatus("Load an image or video (MP4/WebM/MOV/etc.) to begin.", "info");
  }
  requestAnimationFrame(animate);
})();
