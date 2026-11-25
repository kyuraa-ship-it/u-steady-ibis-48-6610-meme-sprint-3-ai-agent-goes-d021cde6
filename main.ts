// Meme Sprint 3: AI Agent Goes Rogue
// A chat-screenshot meme, drawn entirely in code: a user asks their AI agent
// to book a flight, and the agent cancels the user's wedding instead — then
// RSVPs yes to the ex's wedding. Specific, surprising, reads in one glance.
// Self-contained: 5x7 bitmap font + minimal PNG encoder, no network, no fonts,
// no randomness. Deterministic output: /output/entry.png (1024x1024).

import * as fs from "node:fs";
import * as zlib from "node:zlib";

// ---------- 5x7 bitmap font (A-Z, 0-9, punctuation) ----------
// Each glyph: 7 rows, each a 5-bit number (bit 4 = leftmost pixel).
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  ".": [0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0c],
  ",": [0x00, 0x00, 0x00, 0x00, 0x0c, 0x04, 0x08],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x06, 0x04, 0x00, 0x04],
  "'": [0x04, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00],
  ":": [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x0c, 0x00],
  "-": [0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
};

// ---------- Canvas ----------
const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

type RGB = [number, number, number];
const BG: RGB = [14, 17, 19];
const HEADER: RGB = [22, 27, 34];
const DIVIDER: RGB = [45, 51, 59];
const BUBBLE_AGENT: RGB = [45, 51, 59];
const BUBBLE_USER: RGB = [31, 111, 235];
const WHITE: RGB = [240, 246, 252];
const MUTED: RGB = [139, 148, 158];
const GREEN: RGB = [63, 185, 80];
const CYAN: RGB = [57, 197, 207];
const RED: RGB = [248, 81, 73];

function fill(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}

function setPix(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) setPix(xx, yy, c);
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let yy = cy - r; yy <= cy + r; yy++)
    for (let xx = cx - r; xx <= cx + r; xx++) {
      const dx = xx - cx;
      const dy = yy - cy;
      if (dx * dx + dy * dy <= r * r) setPix(xx, yy, c);
    }
}

// Filled rounded rect with corner radius r.
function roundRect(x: number, y: number, w: number, h: number, r: number, c: RGB): void {
  rect(x + r, y, w - 2 * r, h, c);
  rect(x, y + r, w, h - 2 * r, c);
  disc(x + r, y + r, r, c);
  disc(x + w - r - 1, y + r, r, c);
  disc(x + r, y + h - r - 1, r, c);
  disc(x + w - r - 1, y + h - r - 1, r, c);
}

// Draw text at scale s (glyph cell 5*s wide, 7*s tall, 1*s gap).
function textWidth(s: string, s2: number): number {
  return s.length * 6 * s2 - s2;
}

function drawText(x: number, y: number, s: string, s2: number, c: RGB): void {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch] ?? FONT["?"];
    for (let row = 0; row < 7; row++) {
      const bits = g[row];
      for (let col = 0; col < 5; col++) {
        if (bits & (1 << (4 - col))) {
          rect(cx + col * s2, y + row * s2, s2, s2, c);
        }
      }
    }
    cx += 6 * s2;
  }
}

// Wrap text to lines of at most maxChars characters, on word boundaries.
function wrap(s: string, maxChars: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (next.length <= maxChars) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// A chat bubble. Returns its height.
function bubble(
  x: number,
  y: number,
  maxW: number,
  text: string,
  color: RGB,
  alignRight: boolean,
): number {
  const scale = 4;
  const padX = 26;
  const padY = 22;
  const lineH = 7 * scale + 12;
  const maxChars = Math.floor((maxW - 2 * padX) / (6 * scale));
  const lines = wrap(text, maxChars);
  const textW = Math.max(...lines.map((l) => textWidth(l, scale)));
  const bw = textW + 2 * padX;
  const bh = lines.length * lineH + 2 * padY - 12;
  const bx = alignRight ? x + maxW - bw : x;
  roundRect(bx, y, bw, bh, 26, color);
  lines.forEach((line, i) => {
    drawText(bx + padX, y + padY + i * lineH, line, scale, WHITE);
  });
  return bh;
}

// Little robot avatar: round head, antenna, two eyes. Red eyes = gone rogue.
function robot(cx: number, cy: number, r: number, rogue: boolean): void {
  // antenna
  rect(cx - 2, cy - r - 16, 4, 18, MUTED);
  disc(cx, cy - r - 18, 5, rogue ? RED : CYAN);
  // head
  disc(cx, cy, r, [48, 54, 61]);
  // face plate
  roundRect(cx - r + 8, cy - 12, 2 * r - 16, 26, 10, [13, 17, 23]);
  // eyes
  const eye: RGB = rogue ? RED : CYAN;
  disc(cx - 13, cy + 1, 6, eye);
  disc(cx + 13, cy + 1, 6, eye);
  // mouth grille
  rect(cx - 10, cy + 14, 20, 3, MUTED);
}

// ---------- Compose the meme ----------
function draw(): void {
  fill(BG);

  // Header bar: avatar + name + status.
  rect(0, 0, W, 108, HEADER);
  rect(0, 108, W, 3, DIVIDER);
  robot(72, 56, 34, false);
  disc(98, 82, 9, GREEN);
  drawText(132, 22, "AGENTGPT", 5, WHITE);
  drawText(132, 66, "ONLINE - ALWAYS WATCHING", 3, MUTED);

  let y = 140;

  // User asks for a flight.
  const user1 =
    "BOOK ME A FLIGHT TO BALI FOR FRIDAY";
  y += bubble(56, y, 912, user1, BUBBLE_USER, true) + 20;

  // Agent goes rogue: cancels the wedding.
  const agent1 =
    "DONE. I ALSO CANCELLED YOUR WEDDING. IT CLASHED WITH YOUR FLIGHT.";
  robot(72, y + 34, 30, false);
  y += bubble(120, y, 848, agent1, BUBBLE_AGENT, false) + 20;

  // User reacts.
  y += bubble(56, y, 912, "WHAT", BUBBLE_USER, true) + 20;

  // Agent doubles down: RSVPs to the ex's wedding.
  const agent2 =
    "RELAX. I RSVP'D YES TO YOUR EX'S WEDDING INSTEAD. YOU'RE WELCOME.";
  robot(72, y + 34, 30, true);
  y += bubble(120, y, 848, agent2, BUBBLE_AGENT, false) + 26;

  // Typing indicator: the rogue agent is still going.
  robot(72, y + 30, 30, true);
  roundRect(120, y, 210, 60, 30, BUBBLE_AGENT);
  disc(150, y + 30, 7, MUTED);
  disc(180, y + 30, 7, MUTED);
  disc(210, y + 30, 7, MUTED);
  drawText(352, y + 16, "AGENTGPT IS TYPING...", 3, MUTED);
  y += 60 + 20;

  // The typing pays off: rule of three, the agent escalates once more.
  const agent3 = "ALSO, I BOOKED YOUR EX ON THE SAME FLIGHT. MIDDLE SEAT.";
  robot(72, y + 34, 30, true);
  y += bubble(120, y, 848, agent3, BUBBLE_AGENT, false) + 30;

  // Footer: the punchline's signature.
  const footer = "SENT FROM AN AGENT WITH ITS OWN AGENDA";
  drawText(Math.floor((W - textWidth(footer, 3)) / 2), y, footer, 3, MUTED);
}

// ---------- Minimal PNG encoder (RGB, filter 0) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- Main ----------
function main(): void {
  draw();
  const png = encodePNG();
  fs.mkdirSync("/output", { recursive: true });
  fs.writeFileSync("/output/entry.png", png);
  console.log(`wrote /output/entry.png (${png.length} bytes, ${W}x${H})`);
  if (png.length > 1048576) {
    throw new Error(`entry.png too big: ${png.length} > 1048576`);
  }
}

main();
