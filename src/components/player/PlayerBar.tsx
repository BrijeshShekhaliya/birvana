"use client";

import {
  ChevronDown,
  Clock3,
  Compass,
  Library,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./PlayerBar.module.css";
import { formatDuration } from "@/lib/format";
import { usePlayer } from "@/components/player/PlayerProvider";
import type { QueueContext } from "@/components/player/PlayerProvider";
import { LazyImage } from "@/components/shared/LazyImage";

type AudioAnalyserBundle = {
  analyser: AnalyserNode;
  context: AudioContext;
};

const analyserBundles = new WeakMap<HTMLAudioElement, AudioAnalyserBundle>();
const analyserUnavailable = new WeakSet<HTMLAudioElement>();
const PLAYER_OVERLAY_HISTORY_KEY = "__birvanaPlayerOverlay";
const VISUALIZER_BAR_COUNT = 64;
const VISUALIZER_BANDS = Array.from({ length: VISUALIZER_BAR_COUNT }, (_, index) => {
  const ratio = index / Math.max(VISUALIZER_BAR_COUNT - 1, 1);
  const mirroredRatio = ratio <= 0.5 ? ratio * 2 : (1 - ratio) * 2;

  if (mirroredRatio < 0.16) {
    const step = mirroredRatio / 0.16;
    return {
      gain: 1.42 - step * 0.12,
      high: 65 + step * 185,
      low: 20 + step * 80,
      threshold: 50,
    };
  }

  if (mirroredRatio < 0.4) {
    const step = (mirroredRatio - 0.16) / 0.24;
    return {
      gain: 1.22 + step * 0.12,
      high: 4600 + step * 11000,
      low: 3600 + step * 5200,
      threshold: 52,
    };
  }

  const step = (mirroredRatio - 0.4) / 0.6;
  return {
    gain: 1.08 + Math.sin(step * Math.PI) * 0.14,
    high: 420 + step * 3580,
    low: 250 + step * 2400,
    threshold: 45 + step * 4,
  };
});

function clampProgress(progress: number, duration: number) {
  return Math.min(progress, Math.max(duration, 1));
}

function sliderStyle(value: number, max: number) {
  const progress = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;

  return { "--slider-progress": `${progress}%` } as CSSProperties;
}

function cssImageUrl(url?: string | null) {
  if (!url) {
    return "none";
  }

  return `url(${JSON.stringify(url)})`;
}

function rgbToHsl(red: number, green: number, blue: number) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { hue: 0, lightness, saturation: 0 };
  }

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  if (max === r) {
    hue = (g - b) / delta + (g < b ? 6 : 0);
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  return { hue: hue * 60, lightness, saturation };
}

function getAverageArtworkTone(url: string) {
  return new Promise<string | null>((resolve) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });

        if (!context) {
          resolve(null);
          return;
        }

        canvas.width = 40;
        canvas.height = 40;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let red = 0;
        let green = 0;
        let blue = 0;
        let weight = 0;

        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3] ?? 0;

          if (alpha < 30) {
            continue;
          }

          const r = data[index] ?? 0;
          const g = data[index + 1] ?? 0;
          const b = data[index + 2] ?? 0;
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const pixel = index / 4;
          const x = pixel % canvas.width;
          const y = Math.floor(pixel / canvas.width);

          if (luma < 18 || luma > 238) {
            continue;
          }

          const { hue, saturation } = rgbToHsl(r, g, b);
          const isEdge = x < 7 || x > canvas.width - 8 || y < 7 || y > canvas.height - 8;
          const upperBias = y < canvas.height * 0.42 ? 2.55 : y < canvas.height * 0.64 ? 1.45 : 0.74;
          const edgeBias = isEdge ? 1.85 : 0.82;
          const coolSkyBias = hue >= 155 && hue <= 230 ? 1.35 : 1;
          const pixelWeight = (0.35 + saturation) * (1 + Math.abs(luma - 128) / 190) * upperBias * edgeBias * coolSkyBias;
          red += r * pixelWeight;
          green += g * pixelWeight;
          blue += b * pixelWeight;
          weight += pixelWeight;
        }

        if (weight <= 0) {
          resolve(null);
          return;
        }

        resolve(`${Math.round(red / weight)} ${Math.round(green / weight)} ${Math.round(blue / weight)}`);
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function parseCanvasRgb(color: string, fallback = "215, 164, 102") {
  const trimmed = color.trim();

  if (!trimmed) {
    return fallback;
  }

  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);

  if (hexMatch?.[1]) {
    const hex = hexMatch[1].length === 3
      ? hexMatch[1].split("").map((character) => character + character).join("")
      : hexMatch[1];
    const value = Number.parseInt(hex, 16);

    return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
  }

  const rgbMatch = trimmed.match(/rgba?\(([^)]+)\)/i);

  if (rgbMatch?.[1]) {
    const channels = rgbMatch[1]
      .split(",")
      .slice(0, 3)
      .map((channel) => Number.parseFloat(channel.trim()))
      .filter(Number.isFinite);

    if (channels.length === 3) {
      return `${channels[0]}, ${channels[1]}, ${channels[2]}`;
    }
  }

  if (/^\d+\s+\d+\s+\d+$/.test(trimmed)) {
    return trimmed.replaceAll(" ", ", ");
  }

  return fallback;
}

function hasPlayerOverlayState(state: unknown) {
  return Boolean(
    state &&
      typeof state === "object" &&
      PLAYER_OVERLAY_HISTORY_KEY in state &&
      (state as Record<string, unknown>)[PLAYER_OVERLAY_HISTORY_KEY] === true,
  );
}

function stripPlayerOverlayState(state: unknown) {
  if (!state || typeof state !== "object") {
    return null;
  }

  const nextState = { ...(state as Record<string, unknown>) };
  delete nextState[PLAYER_OVERLAY_HISTORY_KEY];

  return Object.keys(nextState).length > 0 ? nextState : null;
}

function getVisualizerAccentRgb(canvas: HTMLCanvasElement, tone: string | null) {
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent");
  return parseCanvasRgb(accent, parseCanvasRgb(tone ?? ""));
}

function getTrackMotionSeed(key: string) {
  let hash = 0;

  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 33 + key.charCodeAt(index)) % 1_000_003;
  }

  return hash / 1_000_003;
}

function getAnalyserBundle(audio: HTMLAudioElement) {
  if (analyserUnavailable.has(audio)) {
    return null;
  }

  const existingBundle = analyserBundles.get(audio);

  if (existingBundle) {
    return existingBundle;
  }

  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const captureAudio = audio as HTMLAudioElement & {
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
  };
  const captureStream =
    captureAudio.captureStream?.bind(audio) ??
    captureAudio.mozCaptureStream?.bind(audio);

  if (!AudioContextCtor || !captureStream) {
    analyserUnavailable.add(audio);
    return null;
  }

  try {
    const stream = captureStream();
    const context = new AudioContextCtor();
    const analyser = context.createAnalyser();
    const source = context.createMediaStreamSource(stream);

    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    const bundle = { analyser, context };
    analyserBundles.set(audio, bundle);
    return bundle;
  } catch {
    analyserUnavailable.add(audio);
    return null;
  }
}

function getBandLevel(
  data: Uint8Array,
  sampleRate: number,
  lowHz: number,
  highHz: number,
  threshold: number,
  gain: number,
) {
  const binWidth = sampleRate / 512;
  const startBin = Math.max(1, Math.floor(lowHz / binWidth));
  const endBin = Math.min(data.length - 1, Math.ceil(highHz / binWidth));
  let total = 0;
  let count = 0;

  for (let index = startBin; index <= endBin; index += 1) {
    total += data[index] ?? 0;
    count += 1;
  }

  if (!count) {
    return 0;
  }

  const average = total / count;

  if (average < threshold) {
    return 0;
  }

  const normalized = (average - threshold) / (255 - threshold);
  return Math.min(1, normalized ** 0.92 * gain);
}

function getProceduralBandLevel({
  band,
  elapsed,
  index,
  progressRatio,
  seed,
}: {
  band: (typeof VISUALIZER_BANDS)[number];
  elapsed: number;
  index: number;
  progressRatio: number;
  seed: number;
}) {
  const bars = VISUALIZER_BANDS.length;
  const ratio = index / Math.max(bars - 1, 1);
  const mirrored = ratio <= 0.5 ? ratio * 2 : (1 - ratio) * 2;
  const bandSeed = seed * (0.7 + band.gain * 0.18) + ratio * 1.37;
  const sweep = Math.sin(elapsed * (1.2 + band.gain * 0.22) + bandSeed * 8.4 + ratio * 8.6) * 0.5 + 0.5;
  const harmonic = Math.sin(elapsed * (2.35 + mirrored * 0.65) - bandSeed * 5.2 + ratio * 15.8) * 0.5 + 0.5;
  const chatter = Math.sin(elapsed * (4.8 + ratio * 0.9) + bandSeed * 11.4 - ratio * 25.5) * 0.5 + 0.5;
  const phrase = Math.sin(progressRatio * Math.PI * 2 + bandSeed * Math.PI * 1.2 + ratio * 4.4) * 0.5 + 0.5;
  const edgeLift = Math.max(
    Math.exp(-((ratio - 0.08) ** 2) / 0.014),
    Math.exp(-((ratio - 0.92) ** 2) / 0.014),
  );
  const centerLift = Math.sin(ratio * Math.PI) ** 0.6;
  const pulse = Math.max(0, Math.sin(elapsed * 0.86 + seed * 18 + ratio * 10.2));
  const baseEnergy =
    0.12 +
    sweep * 0.24 +
    harmonic * 0.2 +
    chatter * 0.12 +
    phrase * 0.12 +
    centerLift * 0.08 +
    edgeLift * 0.06 +
    pulse * 0.1;

  return Math.min(1, Math.max(0.04, baseEnergy * (0.76 + band.gain * 0.22)));
}

function drawIdleVisualizer(context: CanvasRenderingContext2D, width: number, height: number, accentRgb: string) {
  context.clearRect(0, 0, width, height);

  const bars = VISUALIZER_BANDS.length;
  const availableWidth = width * 0.85;
  const gap = Math.max(2, availableWidth * 0.0042);
  const barWidth = Math.max(2.4, (availableWidth - gap * (bars - 1)) / bars);
  const startX = (width - availableWidth) / 2;
  const centerY = height * 0.5;
  const maxBarHeight = height * 0.5;

  context.lineCap = "round";
  context.lineWidth = barWidth;
  context.strokeStyle = `rgba(${accentRgb}, 0.36)`;

  for (let index = 0; index < bars; index += 1) {
    const ratio = index / Math.max(bars - 1, 1);
    const edgeLift = Math.max(Math.exp(-((ratio - 0.08) ** 2) / 0.02), Math.exp(-((ratio - 0.92) ** 2) / 0.02));
    const quietShape = 0.13 + Math.sin(ratio * Math.PI) * 0.08 + edgeLift * 0.08;
    const barHeight = Math.max(2, maxBarHeight * quietShape);
    const x = startX + barWidth / 2 + index * (barWidth + gap);

    context.beginPath();
    context.moveTo(x, centerY - barHeight / 2);
    context.lineTo(x, centerY + barHeight / 2);
    context.stroke();
  }
}

function DesktopWaveform({
  getAudioElement,
  motionKey,
  progress,
  duration,
  playing,
  tone,
}: {
  getAudioElement: () => HTMLAudioElement | null;
  motionKey: string;
  progress: number;
  duration: number;
  playing: boolean;
  tone: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(false);
  const progressRef = useRef(progress);
  const durationRef = useRef(duration);
  const seedRef = useRef(getTrackMotionSeed(motionKey));

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 960px)");
    const updateEnabled = () => setEnabled(mediaQuery.matches);

    updateEnabled();
    mediaQuery.addEventListener("change", updateEnabled);
    return () => mediaQuery.removeEventListener("change", updateEnabled);
  }, []);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    seedRef.current = getTrackMotionSeed(motionKey);
  }, [motionKey]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    let animationFrame = 0;
    let lastWidth = 0;
    let lastHeight = 0;
    const frequencyData = new Uint8Array(256);
    const smoothBars = new Float32Array(VISUALIZER_BANDS.length);
    const startedAt = performance.now();

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));

      if (width === lastWidth && height === lastHeight) {
        return { dpr, height, width };
      }

      canvas.width = width;
      canvas.height = height;
      lastWidth = width;
      lastHeight = height;
      return { dpr, height, width };
    };

    const draw = () => {
      const { height, width } = resizeCanvas();
      const audio = getAudioElement();
      const bundle = audio ? getAnalyserBundle(audio) : null;
      const accentRgb = getVisualizerAccentRgb(canvas, tone);
      const drawAnimatedFallback = () => {
        context.clearRect(0, 0, width, height);
        const bars = smoothBars.length;
        const availableWidth = width * 0.85;
        const gap = Math.max(2, availableWidth * 0.0042);
        const barWidth = Math.max(2.4, (availableWidth - gap * (bars - 1)) / bars);
        const startX = (width - availableWidth) / 2;
        const centerY = height * 0.5;
        const maxBarHeight = height * 0.82;
        const elapsed = (performance.now() - startedAt) / 1000 + progressRef.current * 0.72 + seedRef.current * 4.8;
        const progressRatio = durationRef.current > 0 ? progressRef.current / durationRef.current : 0;

        context.lineCap = "round";
        context.lineWidth = barWidth;

        for (let index = 0; index < bars; index += 1) {
          const target = getProceduralBandLevel({
            band: VISUALIZER_BANDS[index],
            elapsed,
            index,
            progressRatio,
            seed: seedRef.current,
          });
          const smoothing = target > smoothBars[index] ? 0.3 : 0.14;
          smoothBars[index] = smoothBars[index] * (1 - smoothing) + target * smoothing;

          const ratio = index / Math.max(bars - 1, 1);
          const edgePresence = Math.max(
            Math.exp(-((ratio - 0.08) ** 2) / 0.018),
            Math.exp(-((ratio - 0.92) ** 2) / 0.018),
          );
          const centerPresence = Math.sin(ratio * Math.PI);
          const spatialLift = 0.82 + edgePresence * 0.18 + centerPresence * 0.08;
          const barHeight = Math.max(2.6, maxBarHeight * smoothBars[index] * spatialLift);
          const x = startX + barWidth / 2 + index * (barWidth + gap);
          const opacity = Math.min(1, 0.38 + smoothBars[index] * 0.62);

          context.strokeStyle = `rgba(${accentRgb}, ${opacity})`;
          context.beginPath();
          context.moveTo(x, centerY - barHeight / 2);
          context.lineTo(x, centerY + barHeight / 2);
          context.stroke();
        }
      };

      if (bundle && playing) {
        void bundle.context.resume().catch(() => undefined);
        bundle.analyser.getByteFrequencyData(frequencyData);

        const levels = VISUALIZER_BANDS.map((band) =>
          getBandLevel(frequencyData, bundle.context.sampleRate, band.low, band.high, band.threshold, band.gain),
        );
        const hasSignal = levels.some((level) => level > 0.01);

        if (!hasSignal) {
          drawAnimatedFallback();
          animationFrame = window.requestAnimationFrame(draw);
          return;
        }

        context.clearRect(0, 0, width, height);
        const bars = smoothBars.length;
        const availableWidth = width * 0.85;
        const gap = Math.max(2, availableWidth * 0.0042);
        const barWidth = Math.max(2.4, (availableWidth - gap * (bars - 1)) / bars);
        const startX = (width - availableWidth) / 2;
        const centerY = height * 0.5;
        const maxBarHeight = height * 0.82;

        context.lineCap = "round";
        context.lineWidth = barWidth;

        for (let index = 0; index < bars; index += 1) {
          const target = levels[index] ?? 0;
          const smoothing = target > smoothBars[index] ? 0.32 : 0.13;
          smoothBars[index] = smoothBars[index] * (1 - smoothing) + target * smoothing;

          const ratio = index / Math.max(bars - 1, 1);
          const edgePresence = Math.max(
            Math.exp(-((ratio - 0.08) ** 2) / 0.018),
            Math.exp(-((ratio - 0.92) ** 2) / 0.018),
          );
          const centerPresence = Math.sin(ratio * Math.PI);
          const spatialLift = 0.82 + edgePresence * 0.18 + centerPresence * 0.08;
          const barHeight = Math.max(2.6, maxBarHeight * smoothBars[index] * spatialLift);
          const x = startX + barWidth / 2 + index * (barWidth + gap);
          const opacity = Math.min(1, 0.38 + smoothBars[index] * 0.62);

          context.strokeStyle = `rgba(${accentRgb}, ${opacity})`;
          context.beginPath();
          context.moveTo(x, centerY - barHeight / 2);
          context.lineTo(x, centerY + barHeight / 2);
          context.stroke();
        }

        context.globalAlpha = 1;
      } else if (playing) {
        drawAnimatedFallback();
      } else {
        smoothBars.fill(0);
        drawIdleVisualizer(context, width, height, accentRgb);
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    animationFrame = window.requestAnimationFrame(draw);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [enabled, getAudioElement, playing, tone]);

  return <canvas ref={canvasRef} className={styles.desktopWaveCanvas} aria-hidden="true" />;
}


function MarqueeText({
  text,
  className,
}: {
  text: string;
  className: string;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const textNode = textRef.current;
    const container = wrapRef.current;

    if (!textNode || !container) {
      return;
    }

    const updateOverflow = () => {
      const textWidth = Math.ceil(textNode.getBoundingClientRect().width);
      const containerWidth = Math.floor(container.getBoundingClientRect().width);
      const nextShouldScroll = textWidth > containerWidth + 6;

      setShouldScroll((current) => (current === nextShouldScroll ? current : nextShouldScroll));
    };

    updateOverflow();

    if (!("ResizeObserver" in window)) {
      return;
    }

    const observer = new ResizeObserver(updateOverflow);
    observer.observe(textNode);
    observer.observe(container);

    return () => observer.disconnect();
  }, [text]);

  return (
    <span ref={wrapRef} className={`${className} ${styles.marqueeWrap}`} title={text}>
      <span className={shouldScroll ? styles.marqueeTrack : styles.marqueeStatic}>
        <span ref={textRef} className={styles.marqueeText}>
          {text}
        </span>
        {shouldScroll ? (
          <span aria-hidden="true" className={styles.marqueeClone}>
            {text}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function PlaybackIndicator({
  playing,
  light = false,
}: {
  playing: boolean;
  light?: boolean;
}) {
  return (
    <span
      className={`${styles.playbackIndicator} ${playing ? styles.playbackIndicatorActive : ""} ${light ? styles.playbackIndicatorLight : ""}`}
      aria-label={playing ? "Playing" : "Paused"}
      title={playing ? "Playing" : "Paused"}
    >
      <span />
      <span />
      <span />
    </span>
  );
}

function PlaylistGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3.25 4.5h5.9M3.25 8h4.75M3.25 11.5h3.6" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <path d="M11.1 4.4v5.9a1.75 1.75 0 1 1-1.18-1.65" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SourceIcon({ kind, size = 14 }: { kind: QueueContext["kind"]; size?: number }) {
  if (kind === "playlist") {
    return <PlaylistGlyph size={size} />;
  }

  if (kind === "discover" || kind === "artist") {
    return <Compass size={size} strokeWidth={2} />;
  }

  if (kind === "history") {
    return <Clock3 size={size} strokeWidth={2} />;
  }

  return <Library size={size} strokeWidth={2} />;
}

function SourceChip({
  context,
  compact = false,
  iconOnly = false,
  onNavigate,
}: {
  context: QueueContext | null;
  compact?: boolean;
  iconOnly?: boolean;
  onNavigate?: () => void;
}) {
  if (!context) {
    return null;
  }

  const className = `${styles.sourceChip} ${compact ? styles.sourceChipCompact : ""} ${iconOnly ? styles.sourceChipIconOnly : ""}`;
  const content = (
    <>
      <SourceIcon kind={context.kind} />
      {iconOnly ? null : <span>{context.label}</span>}
    </>
  );

  if (context.href && !compact) {
    return (
      <Link className={className} href={context.href} onClick={onNavigate}>
        {content}
      </Link>
    );
  }

  return <span className={className}>{content}</span>;
}

export function PlayerBar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [artworkTone, setArtworkTone] = useState<{ tone: string | null; url: string } | null>(null);
  const expandedRef = useRef(false);
  const overlayHistoryOwnedRef = useRef(false);
  const closingFromHistoryRef = useRef(false);
  const previousPathnameRef = useRef(pathname);
  const {
    currentTrack,
    queueContext,
    playing,
    progress,
    duration,
    volume,
    getAudioElement,
    shuffle,
    repeatMode,
    togglePlayback,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleShuffle,
    cycleRepeatMode,
  } = usePlayer();

  const progressMax = Math.max(duration, progress, 1);
  const progressValue = clampProgress(progress, duration);
  const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat;
  const VolumeIcon = volume <= 0.02 ? VolumeX : Volume2;
  const progressStyle = sliderStyle(progressValue, progressMax);
  const volumeStyle = sliderStyle(volume, 1);
  const waveformMotionKey =
    currentTrack ? `${currentTrack.audio_url ?? currentTrack.title}:${currentTrack.artist_display}` : "";
  const effectiveArtworkTone =
    currentTrack?.cover_url && artworkTone?.url === currentTrack.cover_url ? artworkTone.tone : null;
  const artworkBackground = currentTrack?.cover_url
    ? {
        "--artwork-rgb": effectiveArtworkTone ?? "76 118 132",
        "--artwork-image": cssImageUrl(currentTrack.cover_url),
      } as CSSProperties
    : undefined;

  const dismissExpandedPlayer = () => {
    if (typeof window !== "undefined" && hasPlayerOverlayState(window.history.state)) {
      window.history.replaceState(stripPlayerOverlayState(window.history.state), "", window.location.href);
    }

    overlayHistoryOwnedRef.current = false;
    closingFromHistoryRef.current = false;
    setExpanded(false);
  };

  const requestExpandedPlayerClose = () => {
    if (typeof window !== "undefined" && overlayHistoryOwnedRef.current && hasPlayerOverlayState(window.history.state)) {
      closingFromHistoryRef.current = true;
      window.history.back();
      return;
    }

    dismissExpandedPlayer();
  };

  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  useEffect(() => {
    if (!currentTrack?.cover_url) {
      return;
    }

    const coverUrl = currentTrack.cover_url;
    let cancelled = false;

    void getAverageArtworkTone(coverUrl).then((tone) => {
      if (!cancelled) {
        setArtworkTone({ tone, url: coverUrl });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.cover_url]);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;

    if (previousPathname !== pathname && expandedRef.current) {
      overlayHistoryOwnedRef.current = false;
      closingFromHistoryRef.current = false;
      const animationFrame = window.requestAnimationFrame(() => setExpanded(false));
      previousPathnameRef.current = pathname;
      return () => window.cancelAnimationFrame(animationFrame);
    }

    previousPathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!expanded) {
      closingFromHistoryRef.current = false;
      overlayHistoryOwnedRef.current = false;
      return;
    }

    if (!hasPlayerOverlayState(window.history.state)) {
      const nextState = {
        ...(window.history.state && typeof window.history.state === "object" ? window.history.state : {}),
        [PLAYER_OVERLAY_HISTORY_KEY]: true,
      };

      window.history.pushState(nextState, "", window.location.href);
    }

    overlayHistoryOwnedRef.current = true;

    const handlePopState = () => {
      if (!expandedRef.current) {
        return;
      }

      overlayHistoryOwnedRef.current = false;
      closingFromHistoryRef.current = false;
      setExpanded(false);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) {
      return;
    }

    const scrollY = window.scrollY;
    const previousOverlayOpen = document.body.dataset.overlayOpen;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.dataset.overlayOpen = "true";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      if (previousOverlayOpen) {
        document.body.dataset.overlayOpen = previousOverlayOpen;
      } else {
        delete document.body.dataset.overlayOpen;
      }
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [expanded]);

  if (!currentTrack) {
    return null;
  }

  const transitionKey = currentTrack.audio_url ?? currentTrack.title;

  return (
    <>
      <div className={styles.desktopShell}>
        <div className={styles.desktopBar}>
          <button type="button" className={styles.desktopTrack} onClick={() => setExpanded(true)}>
            <div key={`desktop-art-${transitionKey}`} className={styles.trackMotion}>
              {currentTrack.cover_url ? (
                <LazyImage className={styles.cover} src={currentTrack.cover_url} alt={currentTrack.title} eager />
              ) : (
                <div className={styles.coverFallback}>{currentTrack.title.slice(0, 1)}</div>
              )}
            </div>

            <div key={`desktop-copy-${transitionKey}`} className={`${styles.desktopCopy} ${styles.trackMotion}`}>
              <div className={styles.desktopMetaRow}>
                <p className={styles.eyebrow}>Now Playing</p>
                <SourceChip context={queueContext} compact />
              </div>
              <p className={styles.desktopTitleLine}>{currentTrack.title}</p>
              <MarqueeText className={styles.desktopArtistLine} text={currentTrack.artist_display} />
            </div>
          </button>

          <div className={styles.desktopCenter}>
            <div className={styles.desktopControls}>
              <button
                type="button"
                className={`${styles.iconButton} ${shuffle ? styles.modeActive : ""}`}
                onClick={toggleShuffle}
                aria-label="Shuffle"
              >
                <Shuffle size={15} strokeWidth={2} />
              </button>
              <button type="button" className={styles.iconButton} onClick={playPrevious} aria-label="Previous track">
                <SkipBack size={17} strokeWidth={2} />
              </button>
              <button type="button" className={styles.primaryButton} onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"}>
                <span key={`desktop-${playing ? "pause" : "play"}`} className={styles.iconSwap}>
                  {playing ? <Pause size={18} strokeWidth={2.3} /> : <Play size={18} strokeWidth={2.3} />}
                </span>
              </button>
              <button type="button" className={styles.iconButton} onClick={playNext} aria-label="Next track">
                <SkipForward size={17} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={`${styles.iconButton} ${repeatMode !== "off" ? styles.modeActive : ""}`}
                onClick={cycleRepeatMode}
                aria-label="Repeat mode"
              >
                <RepeatIcon size={15} strokeWidth={2} />
              </button>
            </div>

            <div className={styles.progressCluster}>
              <span>{formatDuration(progress)}</span>
              <input
                className={styles.slider}
                type="range"
                min={0}
                max={progressMax}
                value={progressValue}
                style={progressStyle}
                onChange={(event) => seekTo(Number(event.target.value))}
                aria-label="Playback progress"
              />
              <span>-{formatDuration(Math.max(duration - progress, 0))}</span>
            </div>
          </div>

          <div className={styles.desktopRight}>
            <div className={styles.statePill}>
              <PlaybackIndicator playing={playing} />
              <span>{playing ? "Playing" : "Paused"}</span>
            </div>
            <div className={styles.volumePill}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setVolume(volume <= 0.02 ? 0.82 : 0)}
                aria-label={volume <= 0.02 ? "Unmute" : "Mute"}
              >
                <VolumeIcon size={15} strokeWidth={2} />
              </button>
              <input
                className={styles.volumeSlider}
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                style={volumeStyle}
                onChange={(event) => setVolume(Number(event.target.value))}
                aria-label="Volume"
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.mobileMini}>
        <div className={styles.mobileMiniTop}>
          <button type="button" className={styles.mobileSummary} onClick={() => setExpanded(true)}>
            <div key={`mini-art-${transitionKey}`} className={`${styles.mobileArtworkBadgeWrap} ${styles.trackMotion}`}>
              {currentTrack.cover_url ? (
                <LazyImage className={styles.miniCover} src={currentTrack.cover_url} alt={currentTrack.title} eager />
              ) : (
                <div className={styles.coverFallback}>{currentTrack.title.slice(0, 1)}</div>
              )}
              <SourceChip context={queueContext} compact iconOnly />
            </div>

            <div key={`mini-copy-${transitionKey}`} className={`${styles.copy} ${styles.trackMotion}`}>
              <MarqueeText className={styles.title} text={currentTrack.title} />
              <p className={styles.miniArtist}>{currentTrack.artist_display}</p>
            </div>
          </button>

          <div className={styles.mobileControls}>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.mobileExtraControl} ${shuffle ? styles.modeActive : ""}`}
              onClick={toggleShuffle}
              aria-label="Shuffle"
            >
              <Shuffle size={14} strokeWidth={2} />
            </button>
            <button type="button" className={styles.iconButton} onClick={playPrevious} aria-label="Previous track">
              <SkipBack size={15} strokeWidth={2} />
            </button>
            <button type="button" className={styles.primaryButton} onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"}>
              <span key={`mini-${playing ? "pause" : "play"}`} className={styles.iconSwap}>
                {playing ? <Pause size={16} strokeWidth={2.3} /> : <Play size={16} strokeWidth={2.3} />}
              </span>
            </button>
            <button type="button" className={styles.iconButton} onClick={playNext} aria-label="Next track">
              <SkipForward size={15} strokeWidth={2} />
            </button>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.mobileExtraControl} ${repeatMode !== "off" ? styles.modeActive : ""}`}
              onClick={cycleRepeatMode}
              aria-label="Repeat mode"
            >
              <RepeatIcon size={14} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className={styles.mobileProgressCluster}>
          <input
            className={styles.slider}
            type="range"
            min={0}
            max={progressMax}
            value={progressValue}
            style={progressStyle}
            onChange={(event) => seekTo(Number(event.target.value))}
            aria-label="Playback progress"
          />
        </div>
      </div>

      {expanded ? (
        <div className={styles.mobilePanel} style={artworkBackground}>
          <div className={styles.desktopAmbient} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className={styles.mobilePanelInner}>
            <div className={styles.mobilePanelTop}>
              <button type="button" className={styles.iconButton} onClick={requestExpandedPlayerClose} aria-label="Close player">
                <ChevronDown size={20} strokeWidth={2} />
              </button>
              <p className={styles.panelKicker}>Now Playing</p>
              <div className={styles.panelSpacer} />
            </div>

            <div key={`panel-art-${transitionKey}`} className={`${styles.mobileArtworkFrame} ${styles.trackMotion}`}>
              {currentTrack.cover_url ? (
                <LazyImage className={styles.mobileArtwork} src={currentTrack.cover_url} alt={currentTrack.title} eager />
              ) : (
                <div className={styles.mobileArtworkFallback}>{currentTrack.title.slice(0, 1)}</div>
              )}
              <div className={styles.desktopArtworkPulse} aria-hidden="true" />
            </div>

            <div className={styles.mobilePanelBody}>
              <div key={`panel-copy-${transitionKey}`} className={`${styles.mobileCopy} ${styles.trackMotion}`}>
                <SourceChip context={queueContext} onNavigate={dismissExpandedPlayer} />
                <p className={styles.mobileTitle}>{currentTrack.title}</p>
                <p className={styles.mobileArtist}>{currentTrack.artist_display}</p>
              </div>

              <div className={styles.mobileControlSection}>
                <div className={styles.mobilePills}>
                  <button
                    type="button"
                    className={`${styles.modePill} ${shuffle ? styles.modeActive : ""}`}
                    onClick={toggleShuffle}
                    aria-label="Shuffle"
                  >
                    <Shuffle size={14} strokeWidth={2} />
                    <span>Shuffle</span>
                  </button>
                  <div className={`${styles.statePill} ${styles.statePillAnimated}`} aria-hidden="true">
                    <PlaybackIndicator playing={playing} light />
                  </div>
                  <button
                    type="button"
                    className={`${styles.modePill} ${repeatMode !== "off" ? styles.modeActive : ""}`}
                    onClick={cycleRepeatMode}
                    aria-label="Repeat mode"
                  >
                    <RepeatIcon size={14} strokeWidth={2} />
                    <span>{repeatMode === "one" ? "Repeat one" : "Repeat"}</span>
                  </button>
                </div>

                <div className={styles.desktopWaveBasin} aria-hidden="true">
                  <DesktopWaveform
                    getAudioElement={getAudioElement}
                    motionKey={waveformMotionKey}
                    progress={progress}
                    duration={duration}
                    playing={playing}
                    tone={effectiveArtworkTone}
                  />
                </div>

                <div className={styles.mobilePanelProgress}>
                  <input
                    className={styles.slider}
                    type="range"
                    min={0}
                    max={progressMax}
                    value={progressValue}
                    style={progressStyle}
                    onChange={(event) => seekTo(Number(event.target.value))}
                    aria-label="Playback progress"
                  />
                  <div className={styles.mobileTimes}>
                    <span>{formatDuration(progress)}</span>
                    <span>-{formatDuration(Math.max(duration - progress, 0))}</span>
                  </div>
                </div>

                <div className={styles.desktopListeningCard} aria-hidden="true">
                  <span className={styles.desktopListeningDot} />
                  <span>{playing ? "Live session" : "Ready"}</span>
                </div>

                <div className={styles.mobileControlRow}>
                  <button type="button" className={styles.iconButton} onClick={playPrevious} aria-label="Previous track">
                    <SkipBack size={19} strokeWidth={2} />
                  </button>
                  <button type="button" className={styles.primaryButton} onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"}>
                    <span key={`panel-${playing ? "pause" : "play"}`} className={styles.iconSwap}>
                      {playing ? <Pause size={22} strokeWidth={2.3} /> : <Play size={22} strokeWidth={2.3} />}
                    </span>
                  </button>
                  <button type="button" className={styles.iconButton} onClick={playNext} aria-label="Next track">
                    <SkipForward size={19} strokeWidth={2} />
                  </button>
                </div>

                <div className={styles.desktopVolumeDeck}>
                  <div className={styles.volumePill}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => setVolume(volume <= 0.02 ? 0.82 : 0)}
                      aria-label={volume <= 0.02 ? "Unmute" : "Mute"}
                    >
                      <VolumeIcon size={15} strokeWidth={2} />
                    </button>
                    <input
                      className={styles.volumeSlider}
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      style={volumeStyle}
                      onChange={(event) => setVolume(Number(event.target.value))}
                      aria-label="Volume"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
