import * as THREE from "three";
import {
  AGENT_ARCS,
  AGENTS,
  agentPoint,
  CORE_RADIUS,
  MEMORY_CLUSTERS,
  MEMORY_LINKS,
  REASONING_EDGES,
  REASONING_NODES,
  systemAngle,
  systemPosition,
  VISION_FLOOR_Y,
  VISION_OBJECTS,
} from "./layouts";
import { arcControl, fibPoint, lerp3, normalize3, quadBezier, rotateY, TAU, type Vec3 } from "./math";
import { gauss, mulberry32, type Rand, unitVector } from "./random";

export type ShapeKey =
  | "dormant"
  | "core"
  | "memory"
  | "vision"
  | "reasoning"
  | "voice"
  | "agents"
  | "chaos"
  | "gen-knot"
  | "gen-text"
  | "gen-neural"
  | "gen-geo"
  | "singularity"
  | "finale";

type Builder = (n: number, out: Float32Array) => void;

const put = (out: Float32Array, i: number, x: number, y: number, z: number) => {
  const o = i * 3;
  out[o] = x;
  out[o + 1] = y;
  out[o + 2] = z;
};

/** Split n into integer counts by fractions; remainder goes to the last group. */
function split(n: number, fractions: number[]): number[] {
  const counts = fractions.map((f) => Math.floor(n * f));
  counts[counts.length - 1] += n - counts.reduce((a, b) => a + b, 0);
  return counts;
}

/** Length-weighted sampler over a set of segments. */
function segmentSampler(segments: [Vec3, Vec3][]) {
  const cumulative: number[] = [];
  let total = 0;
  for (const [a, b] of segments) {
    total += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    cumulative.push(total);
  }
  return (r: Rand): { p: Vec3; t: number } => {
    const target = r() * total;
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const t = r();
    const [a, b] = segments[lo];
    return { p: lerp3(a, b, t), t };
  };
}

function polylineSegments(points: Vec3[]): [Vec3, Vec3][] {
  const segs: [Vec3, Vec3][] = [];
  for (let i = 0; i < points.length - 1; i++) segs.push([points[i], points[i + 1]]);
  return segs;
}

function arcSegments(a: Vec3, b: Vec3, lift: number, steps = 20): [Vec3, Vec3][] {
  const c = arcControl(a, b, lift);
  const pts: Vec3[] = [];
  for (let i = 0; i <= steps; i++) pts.push(quadBezier(a, c, b, i / steps));
  return polylineSegments(pts);
}

/* ------------------------------------------------------------------ */

const dormant: Builder = (n, out) => {
  const r = mulberry32(3);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = unitVector(r);
    const rad = 3 + Math.sqrt(r()) * 12;
    put(out, i, x * rad, y * rad * 0.7, z * rad);
  }
};

const RING_TILTS = [
  new THREE.Euler(1.15, 0, 0.35),
  new THREE.Euler(0.35, 0.2, 1.2),
  new THREE.Euler(-0.6, 0.9, -0.3),
];

const core: Builder = (n, out) => {
  const r = mulberry32(11);
  const [shell, nucleus, rings, halo] = split(n, [0.42, 0.2, 0.25, 0.13]);
  const v = new THREE.Vector3();
  let i = 0;
  for (let k = 0; k < shell; k++, i++) {
    const [x, y, z] = fibPoint(k, shell);
    const rad = CORE_RADIUS + gauss(r) * 0.05;
    put(out, i, x * rad, y * rad, z * rad);
  }
  for (let k = 0; k < nucleus; k++, i++) {
    const [x, y, z] = unitVector(r);
    const rad = Math.pow(r(), 1.7) * 1.05;
    put(out, i, x * rad, y * rad, z * rad);
  }
  for (let k = 0; k < rings; k++, i++) {
    const ring = k % 3;
    const a = r() * TAU;
    const rad = 3.05 + ring * 0.42 + gauss(r) * 0.025;
    v.set(Math.cos(a) * rad, gauss(r) * 0.02, Math.sin(a) * rad).applyEuler(RING_TILTS[ring]);
    put(out, i, v.x, v.y, v.z);
  }
  for (let k = 0; k < halo; k++, i++) {
    const [x, y, z] = unitVector(r);
    const rad = 4.2 + Math.pow(r(), 0.6) * 4.5;
    put(out, i, x * rad, y * rad * 0.8, z * rad);
  }
};

const memory: Builder = (n, out) => {
  const r = mulberry32(23);
  const [clustered, filaments, dust] = split(n, [0.7, 0.25, 0.05]);
  const sample = segmentSampler(
    MEMORY_LINKS.map(([a, b]) => [MEMORY_CLUSTERS[a].center, MEMORY_CLUSTERS[b].center]),
  );
  let i = 0;
  for (let k = 0; k < clustered; k++, i++) {
    const c = MEMORY_CLUSTERS[k % MEMORY_CLUSTERS.length];
    const s = c.spread * (0.22 + Math.pow(r(), 3) * 0.9);
    put(out, i, c.center[0] + gauss(r) * s, c.center[1] + gauss(r) * s, c.center[2] + gauss(r) * s);
  }
  for (let k = 0; k < filaments; k++, i++) {
    const { p, t } = sample(r);
    const thick = 0.02 + Math.sin(t * Math.PI) * 0.05;
    put(out, i, p[0] + gauss(r) * thick, p[1] + gauss(r) * thick, p[2] + gauss(r) * thick);
  }
  for (let k = 0; k < dust; k++, i++) {
    const [x, y, z] = unitVector(r);
    const rad = 2 + r() * 7;
    put(out, i, x * rad, y * rad, z * rad);
  }
};

/** Surface sample for a vision object, quantised into horizontal scan rows (LiDAR look). */
function visionSurface(kind: (typeof VISION_OBJECTS)[number], r: Rand): Vec3 {
  const [cx, cy, cz] = kind.center;
  let p: Vec3;
  switch (kind.kind) {
    case "cube": {
      const h = kind.size[0] / 2;
      const face = Math.floor(r() * 6);
      const u = (r() * 2 - 1) * h;
      const w = (r() * 2 - 1) * h;
      const axis = face >> 1;
      const sign = face % 2 ? 1 : -1;
      p = axis === 0 ? [sign * h, u, w] : axis === 1 ? [u, sign * h, w] : [u, w, sign * h];
      break;
    }
    case "sphere": {
      const [x, y, z] = unitVector(r);
      const rad = kind.size[0] / 2;
      p = [x * rad, y * rad, z * rad];
      break;
    }
    case "torus": {
      const u = r() * TAU;
      const v = r() * TAU;
      const R = 1.0;
      const tube = 0.38;
      p = [(R + tube * Math.cos(v)) * Math.cos(u), (R + tube * Math.cos(v)) * Math.sin(u), tube * Math.sin(v)];
      break;
    }
    case "pillar": {
      const a = r() * TAU;
      p = [Math.cos(a) * 0.5, (r() - 0.5) * kind.size[1], Math.sin(a) * 0.5];
      break;
    }
  }
  const row = 0.12;
  const y = Math.round((p[1] + cy) / row) * row;
  return [p[0] + cx, y, p[2] + cz];
}

const vision: Builder = (n, out) => {
  const r = mulberry32(31);
  const [floor, objects, depth] = split(n, [0.3, 0.62, 0.08]);
  const lines = 25;
  const extent = 7;
  let i = 0;
  for (let k = 0; k < floor; k++, i++) {
    const line = k % lines;
    const along = (r() * 2 - 1) * extent;
    const across = -extent + (line / (lines - 1)) * extent * 2;
    if (k % 2) put(out, i, along, VISION_FLOOR_Y, across);
    else put(out, i, across, VISION_FLOOR_Y, along);
  }
  for (let k = 0; k < objects; k++, i++) {
    const obj = VISION_OBJECTS[k % VISION_OBJECTS.length];
    const [x, y, z] = visionSurface(obj, r);
    put(out, i, x + gauss(r) * 0.012, y, z + gauss(r) * 0.012);
  }
  for (let k = 0; k < depth; k++, i++) {
    const zz = -2 - r() * 9;
    const spread = 2 + (-zz) * 0.6;
    put(out, i, (r() * 2 - 1) * spread, VISION_FLOOR_Y + r() * 6, zz);
  }
};

const reasoning: Builder = (n, out) => {
  const r = mulberry32(41);
  const [nodes, edges, ambient] = split(n, [0.22, 0.7, 0.08]);
  const sample = segmentSampler(
    REASONING_EDGES.map(([a, b]) => [REASONING_NODES[a].pos, REASONING_NODES[b].pos]),
  );
  let i = 0;
  for (let k = 0; k < nodes; k++, i++) {
    const node = REASONING_NODES[k % REASONING_NODES.length];
    const s = 0.08 + Math.pow(r(), 3) * 0.25;
    put(out, i, node.pos[0] + gauss(r) * s, node.pos[1] + gauss(r) * s, node.pos[2] + gauss(r) * s);
  }
  for (let k = 0; k < edges; k++, i++) {
    const { p } = sample(r);
    put(out, i, p[0] + gauss(r) * 0.035, p[1] + gauss(r) * 0.035, p[2] + gauss(r) * 0.035);
  }
  for (let k = 0; k < ambient; k++, i++) {
    put(out, i, (r() * 2 - 1) * 7, (r() * 2 - 1) * 5.5, (r() * 2 - 1) * 4);
  }
};

const voice: Builder = (n, out) => {
  const lines = 36;
  const perLine = Math.ceil(n / lines);
  const r = mulberry32(51);
  for (let i = 0; i < n; i++) {
    const line = i % lines;
    const k = Math.floor(i / lines);
    const z = -3 + (line / (lines - 1)) * 6;
    const x = -7.5 + ((k + 0.5) / perLine) * 15;
    put(out, i, x, gauss(r) * 0.012, z);
  }
};

const agents: Builder = (n, out) => {
  const r = mulberry32(61);
  const [agentShells, hub, arcs, dust] = split(n, [0.48, 0.08, 0.36, 0.08]);
  const sample = segmentSampler(
    AGENT_ARCS.flatMap((arc) => arcSegments(agentPoint(arc.from), agentPoint(arc.to), arc.lift)),
  );
  let i = 0;
  for (let k = 0; k < agentShells; k++, i++) {
    const a = AGENTS[k % AGENTS.length].pos;
    const inner = r() < 0.35;
    const [x, y, z] = unitVector(r);
    const rad = inner ? Math.pow(r(), 2) * 0.35 : 0.72 + gauss(r) * 0.03;
    put(out, i, a[0] + x * rad, a[1] + y * rad, a[2] + z * rad);
  }
  for (let k = 0; k < hub; k++, i++) {
    const [x, y, z] = unitVector(r);
    const rad = r() < 0.5 ? 1.0 + gauss(r) * 0.03 : Math.pow(r(), 2) * 0.5;
    put(out, i, x * rad, y * rad, z * rad);
  }
  for (let k = 0; k < arcs; k++, i++) {
    const { p } = sample(r);
    put(out, i, p[0] + gauss(r) * 0.03, p[1] + gauss(r) * 0.03, p[2] + gauss(r) * 0.03);
  }
  for (let k = 0; k < dust; k++, i++) {
    const [x, y, z] = unitVector(r);
    const rad = 3 + r() * 6;
    put(out, i, x * rad, y * rad * 0.7, z * rad);
  }
};

const chaos: Builder = (n, out) => {
  const r = mulberry32(71);
  for (let i = 0; i < n; i++) put(out, i, (r() - 0.5) * 13, (r() - 0.5) * 8, (r() - 0.5) * 8);
};

const genKnot: Builder = (n, out) => {
  const r = mulberry32(73);
  for (let i = 0; i < n; i++) {
    const t = r() * TAU;
    const R = 2.4;
    const rr = 1.15;
    const x = (R + rr * Math.cos(3 * t)) * Math.cos(2 * t);
    const y = (R + rr * Math.cos(3 * t)) * Math.sin(2 * t);
    const z = rr * Math.sin(3 * t) * 1.4;
    const [ux, uy, uz] = unitVector(r);
    const s = 0.3 * Math.sqrt(r());
    put(out, i, x + ux * s, y + uy * s, z + uz * s);
  }
};

function textPoints(word: string): [number, number][] {
  if (typeof document === "undefined") return [[0, 0]];
  const canvas = document.createElement("canvas");
  const w = 1024;
  const h = 320;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [[0, 0]];
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '500 230px "Archivo Variable", "Helvetica Neue", Arial, sans-serif';
  if ("fontStretch" in ctx) (ctx as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = "expanded";
  ctx.fillText(word, w / 2, h / 2 + 8);
  const data = ctx.getImageData(0, 0, w, h).data;
  const pts: [number, number][] = [];
  for (let y = 0; y < h; y += 3) {
    for (let x = 0; x < w; x += 3) {
      if (data[(y * w + x) * 4 + 3] > 128) pts.push([((x - w / 2) / w) * 12.5, (-(y - h / 2) / w) * 12.5]);
    }
  }
  return pts.length ? pts : [[0, 0]];
}

const genText: Builder = (n, out) => {
  const r = mulberry32(79);
  const pts = textPoints("FORM");
  const [glyph, dust] = split(n, [0.86, 0.14]);
  let i = 0;
  for (let k = 0; k < glyph; k++, i++) {
    const [x, y] = pts[Math.floor(r() * pts.length)];
    put(out, i, x + gauss(r) * 0.02, y + gauss(r) * 0.02, gauss(r) * 0.12);
  }
  for (let k = 0; k < dust; k++, i++) put(out, i, (r() - 0.5) * 14, (r() - 0.5) * 5, (r() - 0.5) * 3);
};

const genNeural: Builder = (n, out) => {
  const r = mulberry32(83);
  const segs: [Vec3, Vec3][] = [];
  const tips: Vec3[] = [];
  const grow = (p: Vec3, dir: Vec3, len: number, depth: number) => {
    const end: Vec3 = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len];
    segs.push([p, end]);
    if (depth === 0) {
      tips.push(end);
      return;
    }
    const branches = depth > 2 ? 2 : 3;
    for (let j = 0; j < branches; j++) {
      const [ux, uy, uz] = unitVector(r);
      grow(end, normalize3([dir[0] + ux * 0.75, dir[1] + uy * 0.75, dir[2] + uz * 0.75]), len * 0.7, depth - 1);
    }
  };
  for (let k = 0; k < 9; k++) {
    const d = fibPoint(k, 9);
    grow([d[0] * 0.5, d[1] * 0.5, d[2] * 0.5], d, 1.55, 4);
  }
  const sample = segmentSampler(segs);
  const [along, nucleus, synapses] = split(n, [0.62, 0.14, 0.24]);
  let i = 0;
  for (let k = 0; k < along; k++, i++) {
    const { p } = sample(r);
    put(out, i, p[0] + gauss(r) * 0.035, p[1] + gauss(r) * 0.035, p[2] + gauss(r) * 0.035);
  }
  for (let k = 0; k < nucleus; k++, i++) {
    const [x, y, z] = unitVector(r);
    const rad = Math.pow(r(), 1.5) * 0.6;
    put(out, i, x * rad, y * rad, z * rad);
  }
  for (let k = 0; k < synapses; k++, i++) {
    const t = tips[Math.floor(r() * tips.length)];
    put(out, i, t[0] + gauss(r) * 0.07, t[1] + gauss(r) * 0.07, t[2] + gauss(r) * 0.07);
  }
};

const genGeo: Builder = (n, out) => {
  const r = mulberry32(89);
  const solids = [
    new THREE.IcosahedronGeometry(3.3, 0),
    new THREE.DodecahedronGeometry(2.15, 0).rotateY(0.5).rotateX(0.3),
    new THREE.OctahedronGeometry(1.15, 0).rotateZ(0.4),
  ];
  const segs: [Vec3, Vec3][] = [];
  const verts: Vec3[] = [];
  for (const g of solids) {
    const edges = new THREE.EdgesGeometry(g);
    const a = edges.attributes.position.array as Float32Array;
    for (let k = 0; k < a.length; k += 6) {
      const p: Vec3 = [a[k], a[k + 1], a[k + 2]];
      const q: Vec3 = [a[k + 3], a[k + 4], a[k + 5]];
      segs.push([p, q]);
      verts.push(p);
    }
    edges.dispose();
    g.dispose();
  }
  const sample = segmentSampler(segs);
  const [edgePts, vertPts] = split(n, [0.85, 0.15]);
  let i = 0;
  for (let k = 0; k < edgePts; k++, i++) {
    const { p } = sample(r);
    put(out, i, p[0] + gauss(r) * 0.02, p[1] + gauss(r) * 0.02, p[2] + gauss(r) * 0.02);
  }
  for (let k = 0; k < vertPts; k++, i++) {
    const v = verts[Math.floor(r() * verts.length)];
    put(out, i, v[0] + gauss(r) * 0.06, v[1] + gauss(r) * 0.06, v[2] + gauss(r) * 0.06);
  }
};

const singularity: Builder = (n, out) => {
  const r = mulberry32(97);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = unitVector(r);
    const rad = Math.pow(r(), 2) * 0.35;
    put(out, i, x * rad, y * rad, z * rad);
  }
};

const finale: Builder = (n, out) => {
  const r = mulberry32(101);
  const [shell, arms, disc, nucleus, halo] = split(n, [0.34, 0.24, 0.18, 0.14, 0.1]);
  const tilt = new THREE.Euler(0.28, 0, 0.12);
  const v = new THREE.Vector3();
  let i = 0;
  for (let k = 0; k < shell; k++, i++) {
    const [x, y, z] = fibPoint(k, shell);
    const rad = 5 + gauss(r) * 0.05;
    put(out, i, x * rad, y * rad, z * rad);
  }
  for (let k = 0; k < arms; k++, i++) {
    const arm = k % 6;
    const start = systemPosition(arm);
    const t = Math.pow(r(), 0.7);
    const a = systemAngle(arm) + t * 2.2;
    const rad = 8.2 * (1 - t) + 0.4;
    put(
      out,
      i,
      Math.sin(a) * rad + gauss(r) * 0.06,
      start[1] * (1 - t) * 1.3 + gauss(r) * 0.06,
      Math.cos(a) * rad + gauss(r) * 0.06,
    );
  }
  for (let k = 0; k < disc; k++, i++) {
    const a = r() * TAU;
    const rad = 6.2 + Math.pow(r(), 1.6) * 1.9;
    v.set(Math.cos(a) * rad, gauss(r) * 0.04, Math.sin(a) * rad).applyEuler(tilt);
    put(out, i, v.x, v.y, v.z);
  }
  for (let k = 0; k < nucleus; k++, i++) {
    const [x, y, z] = unitVector(r);
    const rad = Math.pow(r(), 2) * 0.95;
    put(out, i, x * rad, y * rad, z * rad);
  }
  for (let k = 0; k < halo; k++, i++) {
    const [x, y, z] = unitVector(r);
    const rad = 9 + r() * 5;
    put(out, i, x * rad, y * rad * 0.8, z * rad);
  }
};

const BUILDERS: Record<ShapeKey, Builder> = {
  dormant,
  core,
  memory,
  vision,
  reasoning,
  voice,
  agents,
  chaos,
  "gen-knot": genKnot,
  "gen-text": genText,
  "gen-neural": genNeural,
  "gen-geo": genGeo,
  singularity,
  finale,
};

const cache = new Map<string, Float32Array>();

/** Target positions for a shape, rotated so its front faces `facing` (radians about Y). */
export function getShape(key: ShapeKey, count: number, facing = 0): Float32Array {
  const id = `${key}:${count}:${facing.toFixed(4)}`;
  const hit = cache.get(id);
  if (hit) return hit;

  const baseId = `${key}:${count}:0.0000`;
  let base = cache.get(baseId);
  if (!base) {
    base = new Float32Array(count * 3);
    BUILDERS[key](count, base);
    cache.set(baseId, base);
  }
  if (facing === 0) return base;

  const out = new Float32Array(base.length);
  for (let i = 0; i < base.length; i += 3) {
    const [x, z] = rotateY(base[i], base[i + 2], facing);
    out[i] = x;
    out[i + 1] = base[i + 1];
    out[i + 2] = z;
  }
  cache.set(id, out);
  return out;
}
