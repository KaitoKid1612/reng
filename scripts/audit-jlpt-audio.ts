import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

import { format, resolveConfig } from "prettier";
import { z } from "zod";

// Checks that each official JLPT listening MP3 listed in the manifest still downloads as audio:
// HTTP status, content type, size and SHA-256. Each file is streamed through the hash and
// dropped, never saved or republished, because the tracks are third-party material until their
// rights are cleared (content/jlpt/source-registry.json). Only a person listening can confirm
// playback, so the report keeps playbackVerified false.
const USER_AGENT = "Reng-JLPT-source-audit/1.0";
// A real track is far larger; a smaller body is an error page served with an audio type.
const MIN_AUDIO_BYTES = 1000;

const manifestSchema = z.object({
  audio: z.array(
    z.looseObject({
      year: z.number().int(),
      level: z.string(),
      section: z.string(),
      url: z.url({ protocol: /^https?$/ }),
    }),
  ),
});

type ManifestEntry = z.infer<typeof manifestSchema>["audio"][number];
type AuditResult = Awaited<ReturnType<typeof auditEntry>>;

async function auditEntry(entry: ManifestEntry, timeoutMs: number) {
  try {
    const response = await fetch(entry.url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const contentType = response.headers.get("content-type");
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      return {
        ...entry,
        httpStatus: response.status,
        contentType,
        downloadVerified: false,
        error: `HTTP ${response.status}`,
      };
    }
    const digest = createHash("sha256");
    let bytes = 0;
    const reader = response.body.getReader();
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      digest.update(chunk.value);
      bytes += chunk.value.byteLength;
    }
    return {
      ...entry,
      httpStatus: response.status,
      contentType,
      bytes,
      sha256: digest.digest("hex"),
      downloadVerified:
        bytes > MIN_AUDIO_BYTES && (contentType ?? "").toLowerCase().includes("audio"),
      playbackVerified: false,
    };
  } catch (error: unknown) {
    return {
      ...entry,
      downloadVerified: false,
      error: error instanceof Error ? error.message : "Request failed.",
    };
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      manifest: { type: "string", default: "content/jlpt/official-audio-manifest.json" },
      out: { type: "string", default: "content/jlpt/audio-audit-results.json" },
      timeout: { type: "string", default: "15" },
    },
  });
  const timeoutSeconds = Number(values.timeout);
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1) {
    throw new Error("--timeout must be a whole number of seconds.");
  }
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(resolve(values.manifest), "utf8")),
  );
  const results: AuditResult[] = [];
  // One request at a time, as a person browsing the official page would.
  for (const entry of manifest.audio) {
    const result = await auditEntry(entry, timeoutSeconds * 1000);
    results.push(result);
    console.log(
      `${entry.year} ${entry.level} ${entry.section}: ${result.downloadVerified ? "OK" : "FAILED"}`,
    );
  }
  const outputPath = resolve(values.out);
  // The repository formats JSON with Prettier, so a report worth committing already passes.
  const formatted = await format(JSON.stringify({ audio: results }, null, 2), {
    ...(await resolveConfig(outputPath)),
    filepath: outputPath,
  });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, formatted);
  const verified = results.filter((result) => result.downloadVerified).length;
  console.log(
    `Checked ${results.length} links, ${verified} downloaded as audio; report: ${values.out}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to audit the JLPT audio links.");
  process.exitCode = 1;
});
