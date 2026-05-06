import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const FFMPEG_BIN = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE_BIN = process.env.FFPROBE_PATH || "ffprobe";

type ProbeStream = {
  codec_name?: string;
  codec_type?: string;
  bit_rate?: string;
  sample_rate?: string;
  channels?: number;
};

type ProbeFormat = {
  format_name?: string;
  duration?: string;
  bit_rate?: string;
};

type ProbePayload = {
  streams?: ProbeStream[];
  format?: ProbeFormat;
};

type ProcessingMode = "copy-mp3" | "remux-aac" | "transcode-aac";

export type ProcessedAudioAsset = {
  buffer: Buffer;
  extension: ".mp3" | ".m4a";
  contentType: "audio/mpeg" | "audio/mp4";
  durationSeconds: number | null;
  sourceCodec: string | null;
  sourceContainer: string[];
  processingMode: ProcessingMode;
};

function parseNumber(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getSourceBitrate(audioStream: ProbeStream, format: ProbeFormat) {
  return parseNumber(audioStream.bit_rate) ?? parseNumber(format.bit_rate);
}

function getDurationSeconds(format: ProbeFormat) {
  const duration = parseNumber(format.duration);

  if (duration === null || duration <= 0) {
    return null;
  }

  return Math.round(duration);
}

function getContainerNames(format: ProbeFormat) {
  return (format.format_name || "")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
}

function getAudioStream(payload: ProbePayload) {
  return payload.streams?.find((stream) => stream.codec_type === "audio") ?? null;
}

function deriveAacBitrate(sourceBitrate: number | null) {
  if (!sourceBitrate) {
    return "256k";
  }

  const kbps = Math.round(sourceBitrate / 1000);
  const normalized = Math.round(kbps / 16) * 16;
  const clamped = Math.min(320, Math.max(128, normalized));
  return `${clamped}k`;
}

function getOutputPlan(payload: ProbePayload) {
  const format = payload.format ?? {};
  const audioStream = getAudioStream(payload);

  if (!audioStream?.codec_name) {
    throw new Error("No readable audio stream was found in the uploaded file.");
  }

  const codec = audioStream.codec_name.toLowerCase();
  const containerNames = getContainerNames(format);
  const sourceBitrate = getSourceBitrate(audioStream, format);

  if (codec === "mp3") {
    return {
      codec,
      containerNames,
      durationSeconds: getDurationSeconds(format),
      mode: "copy-mp3" as const,
      extension: ".mp3" as const,
      contentType: "audio/mpeg" as const,
      ffmpegArgs: ["-c:a", "copy"],
    };
  }

  if (codec === "aac") {
    return {
      codec,
      containerNames,
      durationSeconds: getDurationSeconds(format),
      mode: "remux-aac" as const,
      extension: ".m4a" as const,
      contentType: "audio/mp4" as const,
      ffmpegArgs: ["-c:a", "copy", "-movflags", "+faststart"],
    };
  }

  return {
    codec,
    containerNames,
    durationSeconds: getDurationSeconds(format),
    mode: "transcode-aac" as const,
    extension: ".m4a" as const,
    contentType: "audio/mp4" as const,
    ffmpegArgs: ["-c:a", "aac", "-b:a", deriveAacBitrate(sourceBitrate), "-movflags", "+faststart"],
  };
}

async function probeAudio(inputPath: string) {
  try {
    const { stdout } = await execFileAsync(FFPROBE_BIN, [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      inputPath,
    ]);

    return JSON.parse(stdout) as ProbePayload;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error("ffprobe is not available on the server.");
    }

    throw error instanceof Error ? error : new Error("Unable to inspect uploaded audio.");
  }
}

async function runFfmpeg(inputPath: string, outputPath: string, ffmpegArgs: string[]) {
  try {
    await execFileAsync(FFMPEG_BIN, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      inputPath,
      "-map",
      "0:a:0",
      "-map_metadata",
      "0",
      "-vn",
      ...ffmpegArgs,
      outputPath,
    ]);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error("ffmpeg is not available on the server.");
    }

    const stderr =
      error && typeof error === "object" && "stderr" in error ? String(error.stderr).trim() : "";

    throw new Error(stderr || "Unable to prepare the uploaded song for streaming.");
  }
}

export async function processAudioUpload(input: { fileName: string; buffer: Buffer }) {
  const workingDir = await mkdtemp(join(tmpdir(), "birvana-upload-"));
  const sourceExtension = extname(input.fileName).toLowerCase() || ".upload";
  const inputPath = join(workingDir, `source${sourceExtension}`);

  try {
    await writeFile(inputPath, input.buffer);

    const probePayload = await probeAudio(inputPath);
    const plan = getOutputPlan(probePayload);
    const outputPath = join(workingDir, `streamable${plan.extension}`);

    await runFfmpeg(inputPath, outputPath, plan.ffmpegArgs);

    return {
      buffer: await readFile(outputPath),
      extension: plan.extension,
      contentType: plan.contentType,
      durationSeconds: plan.durationSeconds,
      sourceCodec: plan.codec,
      sourceContainer: plan.containerNames,
      processingMode: plan.mode,
    } satisfies ProcessedAudioAsset;
  } finally {
    await rm(workingDir, { recursive: true, force: true });
  }
}
