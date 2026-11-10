// Joins MP3 files frame by frame, for a dialogue read one turn at a time. Every part must share
// the MPEG version, sample rate and channel mode; tags are dropped (an ID3 tag or a Xing/Info
// frame in the middle of a file would confuse players about its length). The text-to-speech
// output already starts and ends with silence, which becomes the pause between two turns.

const ID3_HEADER_BYTES = 10;
const BITRATES_KBPS: Record<"v1" | "v2", readonly number[]> = {
  v1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  v2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const SAMPLE_RATES: Record<number, readonly number[]> = {
  3: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  0: [11025, 12000, 8000],
};
const MONO = 3;
// Bytes of side information after the 4-byte header, which a Xing or Info tag follows.
const SIDE_INFO_BYTES = { v1: { mono: 17, stereo: 32 }, v2: { mono: 9, stereo: 17 } };

export interface Mp3Frame {
  offset: number;
  length: number;
  version: number;
  sampleRate: number;
  channelMode: number;
}

function skipId3(bytes: Uint8Array) {
  const isId3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  if (!isId3 || bytes.length < ID3_HEADER_BYTES) {
    return 0;
  }
  // The tag size is stored in four 7-bit bytes.
  const size = (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9];
  return ID3_HEADER_BYTES + size;
}

/** The MPEG-1/2/2.5 Layer III frames of a file, after any ID3v2 tag. Throws on anything else. */
export function readMp3Frames(bytes: Uint8Array): Mp3Frame[] {
  const frames: Mp3Frame[] = [];
  let offset = skipId3(bytes);
  while (offset < bytes.length) {
    // A trailing ID3v1 tag is 128 bytes starting with TAG.
    const isId3v1 =
      bytes.length - offset === 128 &&
      bytes[offset] === 0x54 &&
      bytes[offset + 1] === 0x41 &&
      bytes[offset + 2] === 0x47;
    if (isId3v1) {
      break;
    }
    if (
      offset + 4 > bytes.length ||
      bytes[offset] !== 0xff ||
      (bytes[offset + 1] & 0xe0) !== 0xe0
    ) {
      throw new Error(`Not an MP3 frame at byte ${offset}.`);
    }
    const version = (bytes[offset + 1] >> 3) & 3;
    const layer = (bytes[offset + 1] >> 1) & 3;
    const bitrateIndex = bytes[offset + 2] >> 4;
    const rateIndex = (bytes[offset + 2] >> 2) & 3;
    const padding = (bytes[offset + 2] >> 1) & 1;
    const channelMode = bytes[offset + 3] >> 6;
    const sampleRate = SAMPLE_RATES[version]?.[rateIndex];
    const bitrate = BITRATES_KBPS[version === 3 ? "v1" : "v2"][bitrateIndex] * 1000;
    if (layer !== 1 || !sampleRate || !bitrate) {
      throw new Error(`Unsupported MP3 frame at byte ${offset}: only Layer III with a bitrate.`);
    }
    const length = Math.floor(((version === 3 ? 144 : 72) * bitrate) / sampleRate) + padding;
    if (offset + length > bytes.length) {
      throw new Error(`The MP3 frame at byte ${offset} is cut off.`);
    }
    frames.push({ offset, length, version, sampleRate, channelMode });
    offset += length;
  }
  return frames;
}

// A Xing or Info frame describes the whole file (frame count, seek table) and holds no audio.
function isInfoFrame(bytes: Uint8Array, frame: Mp3Frame) {
  const sizes = SIDE_INFO_BYTES[frame.version === 3 ? "v1" : "v2"];
  const start = frame.offset + 4 + (frame.channelMode === MONO ? sizes.mono : sizes.stereo);
  const tag = String.fromCharCode(...bytes.slice(start, start + 4));
  const vbri = String.fromCharCode(...bytes.slice(frame.offset + 36, frame.offset + 40));
  return tag === "Xing" || tag === "Info" || vbri === "VBRI";
}

/** Playing time of an MP3 file: 1,152 samples per MPEG-1 frame, 576 per MPEG-2/2.5 frame. */
export function mp3DurationMs(bytes: Uint8Array) {
  return readMp3Frames(bytes).reduce(
    (total, frame) => total + ((frame.version === 3 ? 1152 : 576) / frame.sampleRate) * 1000,
    0,
  );
}

export function joinMp3(parts: readonly Uint8Array[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  let format: string | null = null;
  for (const part of parts) {
    const frames = readMp3Frames(part).filter(
      (frame, index) => index > 0 || !isInfoFrame(part, frame),
    );
    if (!frames.length) {
      throw new Error("An MP3 part has no audio frames.");
    }
    for (const frame of frames) {
      const frameFormat = `${frame.version}/${frame.sampleRate}/${frame.channelMode}`;
      if (format && frameFormat !== format) {
        throw new Error(
          "MP3 parts differ in version, sample rate or channels; they cannot be joined.",
        );
      }
      format = frameFormat;
      chunks.push(part.subarray(frame.offset, frame.offset + frame.length));
    }
  }
  const joined = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  return joined;
}
