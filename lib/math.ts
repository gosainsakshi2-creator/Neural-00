export type Vec3 = [number, number, number];

export const TAU = Math.PI * 2;

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/** Matches easeIO() in the particle vertex shader — keep them in sync. */
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export const dist3 = (a: Vec3, b: Vec3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const scale3 = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];

export const normalize3 = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Evenly distributed point on a unit sphere. */
export function fibPoint(i: number, n: number): Vec3 {
  const y = 1 - ((i + 0.5) / n) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const t = i * Math.PI * (3 - Math.sqrt(5));
  return [Math.cos(t) * r, y, Math.sin(t) * r];
}

/** Control point for a gentle arc between two points, lifted away from the origin. */
export function arcControl(a: Vec3, b: Vec3, lift: number): Vec3 {
  const mid = lerp3(a, b, 0.5);
  const out = normalize3(mid[0] === 0 && mid[2] === 0 ? [0, 1, 0] : mid);
  return [mid[0] + out[0] * lift * 0.6, mid[1] + lift, mid[2] + out[2] * lift * 0.6];
}

export function quadBezier(a: Vec3, c: Vec3, b: Vec3, t: number): Vec3 {
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
    u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
    u * u * a[2] + 2 * u * t * c[2] + t * t * b[2],
  ];
}

export function arcPoints(a: Vec3, b: Vec3, lift: number, segments = 24): Vec3[] {
  const c = arcControl(a, b, lift);
  const pts: Vec3[] = [];
  for (let i = 0; i <= segments; i++) pts.push(quadBezier(a, c, b, i / segments));
  return pts;
}

/** Rotation about Y, identical to THREE's rotation.y convention. */
export function rotateY(x: number, z: number, angle: number): [number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [c * x + s * z, -s * x + c * z];
}
