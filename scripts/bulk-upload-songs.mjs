#!/usr/bin/env node

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const execFileAsync = promisify(execFile);
const FFMPEG_BIN = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE_BIN = process.env.FFPROBE_PATH || "ffprobe";

function parseArgs(argv) {
  const options = {
    folder: "D:\\CHROME DOWNLOADS\\song upload",
    userEmail: "",
    visibility: "public",
    limit: null,
    skipExisting: true,
    minDurationSeconds: 30,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--folder") {
      options.folder = argv[index + 1] || options.folder;
      index += 1;
      continue;
    }

    if (arg === "--user-email") {
      options.userEmail = argv[index + 1] || "";
      index += 1;
      continue;
    }

    if (arg === "--visibility") {
      options.visibility = argv[index + 1] || options.visibility;
      index += 1;
      continue;
    }

    if (arg === "--limit") {
      const parsed = Number(argv[index + 1]);
      options.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      index += 1;
      continue;
    }

    if (arg === "--min-duration-seconds") {
      const parsed = Number(argv[index + 1]);
      options.minDurationSeconds = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      index += 1;
      continue;
    }

    if (arg === "--allow-duplicates") {
      options.skipExisting = false;
    }
  }

  return options;
}

function loadEnvFile(filePath) {
  const source = fs.readFile(filePath, "utf8");

  return source.then((content) => {
    for (const rawLine of content.split(/\r?\n/u)) {
      const line = rawLine.trim();

      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");

      if (separatorIndex <= 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  });
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function getSupabase() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

function getBucket() {
  return requireEnv("R2_BUCKET");
}

function getPublicR2BaseUrl() {
  return requireEnv("R2_PUBLIC_BASE_URL").replace(/\/$/u, "");
}

async function revalidateCatalog(paths = []) {
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  try {
    const response = await fetch("http://localhost:3000/api/internal/revalidate-catalog", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-birvana-revalidate-token": serviceRoleKey,
      },
      body: JSON.stringify({ paths }),
    });

    if (!response.ok) {
      process.stdout.write(`Catalog revalidation failed with status ${response.status}.\n`);
    }
  } catch (error) {
    process.stdout.write(
      `Catalog revalidation failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  }
}

async function putObjectToR2(client, options) {
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType,
      ContentDisposition: options.contentType.startsWith("audio/") ? "inline" : undefined,
    }),
  );

  return `${getPublicR2BaseUrl()}/${encodeURIComponent(options.key)}`;
}

async function deleteObjectFromR2(client, key) {
  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  );
}

function parseNumber(value) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getContainerNames(format) {
  return (format.format_name || "")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
}

function getSourceBitrate(audioStream, format) {
  return parseNumber(audioStream.bit_rate) ?? parseNumber(format.bit_rate);
}

function getDurationSeconds(format) {
  const duration = parseNumber(format.duration);

  if (duration === null || duration <= 0) {
    return null;
  }

  return Math.round(duration);
}

function deriveAacBitrate(sourceBitrate) {
  if (!sourceBitrate) {
    return "256k";
  }

  const kbps = Math.round(sourceBitrate / 1000);
  const normalized = Math.round(kbps / 16) * 16;
  const clamped = Math.min(320, Math.max(128, normalized));
  return `${clamped}k`;
}

function getAudioStream(payload) {
  return payload.streams?.find((stream) => stream.codec_type === "audio") ?? null;
}

function getCoverStream(payload) {
  return payload.streams?.find((stream) => stream.codec_type === "video") ?? null;
}

function getOutputPlan(payload) {
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
      mode: "copy-mp3",
      extension: ".mp3",
      contentType: "audio/mpeg",
      ffmpegArgs: ["-c:a", "copy"],
    };
  }

  if (codec === "aac") {
    return {
      codec,
      containerNames,
      durationSeconds: getDurationSeconds(format),
      mode: "remux-aac",
      extension: ".m4a",
      contentType: "audio/mp4",
      ffmpegArgs: ["-c:a", "copy", "-movflags", "+faststart"],
    };
  }

  return {
    codec,
    containerNames,
    durationSeconds: getDurationSeconds(format),
    mode: "transcode-aac",
    extension: ".m4a",
    contentType: "audio/mp4",
    ffmpegArgs: ["-c:a", "aac", "-b:a", deriveAacBitrate(sourceBitrate), "-movflags", "+faststart"],
  };
}

function getCoverPlan(payload) {
  const coverStream = getCoverStream(payload);

  if (!coverStream?.codec_name) {
    return null;
  }

  const codec = coverStream.codec_name.toLowerCase();

  if (codec === "mjpeg" || codec === "jpeg") {
    return {
      extension: ".jpg",
      contentType: "image/jpeg",
      ffmpegArgs: ["-map", "0:v:0", "-frames:v", "1", "-c:v", "copy"],
    };
  }

  if (codec === "png") {
    return {
      extension: ".png",
      contentType: "image/png",
      ffmpegArgs: ["-map", "0:v:0", "-frames:v", "1", "-c:v", "copy"],
    };
  }

  if (codec === "webp") {
    return {
      extension: ".webp",
      contentType: "image/webp",
      ffmpegArgs: ["-map", "0:v:0", "-frames:v", "1", "-c:v", "copy"],
    };
  }

  return {
    extension: ".jpg",
    contentType: "image/jpeg",
    ffmpegArgs: ["-map", "0:v:0", "-frames:v", "1", "-c:v", "mjpeg"],
  };
}

async function probeMedia(inputPath) {
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

    return JSON.parse(stdout);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error("ffprobe is not available on the server.");
    }

    throw error instanceof Error ? error : new Error("Unable to inspect uploaded audio.");
  }
}

async function runFfmpeg(inputPath, outputPath, ffmpegArgs) {
  try {
    await execFileAsync(FFMPEG_BIN, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      inputPath,
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

function getTagValue(tags, name) {
  if (!tags || typeof tags !== "object") {
    return "";
  }

  const match = Object.entries(tags).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return typeof match?.[1] === "string" ? match[1].trim() : "";
}

function sanitizeFileStem(fileName) {
  return path
    .basename(fileName, path.extname(fileName))
    .replace(/_spotdown\.org$/iu, "")
    .replace(/[_]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

async function prepareUploadAssets(filePath) {
  const inputBuffer = await fs.readFile(filePath);
  const workingDir = await fs.mkdtemp(path.join(tmpdir(), "birvana-bulk-upload-"));
  const sourceExtension = path.extname(filePath).toLowerCase() || ".upload";
  const inputPath = path.join(workingDir, `source${sourceExtension}`);

  try {
    await fs.writeFile(inputPath, inputBuffer);

    const probePayload = await probeMedia(inputPath);
    const format = probePayload.format ?? {};
    const audioPlan = getOutputPlan(probePayload);
    const coverPlan = getCoverPlan(probePayload);

    if (!coverPlan) {
      throw new Error("No embedded cover art was found in the song file.");
    }

    const outputAudioPath = path.join(workingDir, `streamable${audioPlan.extension}`);
    const outputCoverPath = path.join(workingDir, `cover${coverPlan.extension}`);

    await runFfmpeg(inputPath, outputAudioPath, [
      "-map",
      "0:a:0",
      "-map_metadata",
      "0",
      "-vn",
      ...audioPlan.ffmpegArgs,
    ]);

    await runFfmpeg(inputPath, outputCoverPath, coverPlan.ffmpegArgs);

    return {
      title: getTagValue(format.tags, "title") || sanitizeFileStem(filePath),
      artist: getTagValue(format.tags, "artist"),
      processedAudio: {
        buffer: await fs.readFile(outputAudioPath),
        extension: audioPlan.extension,
        contentType: audioPlan.contentType,
        durationSeconds: audioPlan.durationSeconds,
        sourceCodec: audioPlan.codec,
        sourceContainer: audioPlan.containerNames,
        processingMode: audioPlan.mode,
      },
      cover: {
        buffer: await fs.readFile(outputCoverPath),
        extension: coverPlan.extension,
        contentType: coverPlan.contentType,
      },
    };
  } finally {
    await fs.rm(workingDir, { recursive: true, force: true });
  }
}

async function findUserByEmail(supabase, email) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,is_artist")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(`No profile found for ${email}.`);
  }

  return data;
}

function normalizeKey(title, artist) {
  return `${title}`.trim().toLowerCase() + "||" + `${artist}`.trim().toLowerCase();
}

async function getExistingTrackKeys(supabase) {
  const existingKeys = new Set();
  let from = 0;
  const pageSize = 1000;

  for (;;) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("songs")
      .select("title,artist_display")
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const rows = data ?? [];

    for (const row of rows) {
      existingKeys.add(normalizeKey(row.title, row.artist_display));
    }

    if (rows.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return existingKeys;
}

async function uploadSong(options) {
  const id = randomUUID();
  const coverKey = `covers/${options.artistId}/${id}${options.cover.extension}`;
  const audioKey = `songs/${options.artistId}/${id}${options.processedAudio.extension}`;
  const r2 = options.r2Client;
  const supabase = options.supabase;

  const [audioUrl, coverUrl] = await Promise.all([
    putObjectToR2(r2, {
      key: audioKey,
      body: options.processedAudio.buffer,
      contentType: options.processedAudio.contentType,
    }),
    putObjectToR2(r2, {
      key: coverKey,
      body: options.cover.buffer,
      contentType: options.cover.contentType,
    }),
  ]);

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: options.artistId,
      email: options.userEmail,
      display_name: options.profileDisplayName,
      is_artist: true,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    await Promise.allSettled([deleteObjectFromR2(r2, audioKey), deleteObjectFromR2(r2, coverKey)]);
    throw new Error(profileError.message);
  }

  const { error: insertError } = await supabase.from("songs").insert({
    artist_id: options.artistId,
    title: options.title,
    artist_display: options.artistDisplay,
    visibility: options.visibility,
    status: "ready",
    audio_url: audioUrl,
    audio_path: audioKey,
    cover_url: coverUrl,
    cover_path: coverKey,
    mime_type: options.processedAudio.contentType,
    duration_seconds: options.processedAudio.durationSeconds,
    size_bytes: options.processedAudio.buffer.byteLength,
  });

  if (insertError) {
    await Promise.allSettled([deleteObjectFromR2(r2, audioKey), deleteObjectFromR2(r2, coverKey)]);
    throw new Error(insertError.message);
  }

  return {
    audioKey,
    coverKey,
    audioUrl,
    coverUrl,
    processingMode: options.processedAudio.processingMode,
    sourceCodec: options.processedAudio.sourceCodec,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.userEmail) {
    throw new Error("Missing required flag: --user-email <email>");
  }

  await loadEnvFile(path.join(process.cwd(), ".env.local"));

  const supabase = getSupabase();
  const r2Client = getR2Client();
  const profile = await findUserByEmail(supabase, options.userEmail);
  const existingKeys = options.skipExisting ? await getExistingTrackKeys(supabase) : new Set();
  const files = (await fs.readdir(options.folder, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".mp3")
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => path.join(options.folder, entry.name));

  const selectedFiles = options.limit ? files.slice(0, options.limit) : files;

  if (!selectedFiles.length) {
    throw new Error(`No .mp3 files found in ${options.folder}`);
  }

  const report = {
    userEmail: options.userEmail,
    artistId: profile.id,
    folder: options.folder,
    visibility: options.visibility,
    totalDiscovered: files.length,
    queued: selectedFiles.length,
    uploaded: [],
    skipped: [],
    failed: [],
  };

  for (const filePath of selectedFiles) {
    const fileName = path.basename(filePath);
    process.stdout.write(`Processing ${fileName}...\n`);

    try {
      const prepared = await prepareUploadAssets(filePath);
      const artistDisplay = prepared.artist || profile.display_name || "Unknown artist";
      const existingKey = normalizeKey(prepared.title, artistDisplay);
      const durationSeconds = prepared.processedAudio.durationSeconds;

      if (options.skipExisting && existingKeys.has(existingKey)) {
        report.skipped.push({
          file: fileName,
          title: prepared.title,
          artistDisplay,
          reason: "Track with matching title and artist already exists on the site.",
        });
        process.stdout.write(`Skipped ${fileName}: already exists on the site.\n`);
        continue;
      }

      if (durationSeconds !== null && durationSeconds < options.minDurationSeconds) {
        report.skipped.push({
          file: fileName,
          title: prepared.title,
          artistDisplay,
          reason: `Duration ${durationSeconds}s is below the ${options.minDurationSeconds}s minimum.`,
        });
        process.stdout.write(`Skipped ${fileName}: duration is only ${durationSeconds}s.\n`);
        continue;
      }

      const uploaded = await uploadSong({
        supabase,
        r2Client,
        artistId: profile.id,
        userEmail: profile.email,
        profileDisplayName: profile.display_name,
        title: prepared.title,
        artistDisplay,
        visibility: options.visibility,
        processedAudio: prepared.processedAudio,
        cover: prepared.cover,
      });

      existingKeys.add(existingKey);
      report.uploaded.push({
        file: fileName,
        title: prepared.title,
        artistDisplay,
        audioKey: uploaded.audioKey,
        coverKey: uploaded.coverKey,
        processingMode: uploaded.processingMode,
        sourceCodec: uploaded.sourceCodec,
      });
      process.stdout.write(`Uploaded ${fileName}.\n`);
    } catch (error) {
      report.failed.push({
        file: fileName,
        error: error instanceof Error ? error.message : String(error),
      });
      process.stdout.write(`Failed ${fileName}: ${report.failed.at(-1).error}\n`);
    }
  }

  const reportPath = path.join(process.cwd(), "bulk-upload-report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  process.stdout.write(
    `Done. Uploaded ${report.uploaded.length}, skipped ${report.skipped.length}, failed ${report.failed.length}.\n`,
  );
  process.stdout.write(`Report saved to ${reportPath}\n`);

  if (report.uploaded.length > 0) {
    await revalidateCatalog();
  }

  if (report.failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
