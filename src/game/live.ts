// Live pictures: a character picture is stretched over a grid (mesh) and the grid bends like a
// skeleton — the tail wags, the body breathes, the head tilts, ears twitch, a waving paw waves,
// eyelids blink. One small WebGL canvas per picture, one shared frame loop that sleeps while
// nothing live is on screen. Bones come from src/content/fox-rig.ts.
import type { Limb, Pt, Rig } from "../content/fox-rig";

const GX = 22;
const GY = 28;
const DEG = Math.PI / 180;

const VERT = `
attribute vec2 a_pos;
attribute vec2 a_uv;
uniform vec2 u_size;
varying vec2 v_uv;
void main() {
  vec2 p = a_pos / u_size * 2.0 - 1.0;
  gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
  v_uv = a_uv;
}`;
const FRAG = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec4 u_eye0;
uniform vec4 u_eye1;
uniform float u_blink;
uniform vec3 u_lid;
varying vec2 v_uv;
vec4 lid(vec4 c, vec4 eye) {
  if (eye.z <= 0.0 || u_blink <= 0.0) return c;
  vec2 e = (v_uv - eye.xy) / eye.zw;
  float d = length(e);
  if (d > 1.45) return c;
  // the lid's edge is an arc that comes down from the top of the eye to a little below its
  // middle (a shut eye is a soft curve, not a line)
  float edge = mix(-1.2, 0.55, u_blink) + 0.3 * u_blink * (1.0 - e.x * e.x);
  float inside = 1.0 - smoothstep(1.2, 1.4, d);
  // the lower lid rises a little to meet it, so the eye's dark rim is hidden too
  float low = mix(1.5, 0.62, u_blink * u_blink) - 0.15 * u_blink * (1.0 - e.x * e.x);
  float covered =
    max(1.0 - smoothstep(edge - 0.05, edge + 0.05, e.y), smoothstep(low - 0.06, low + 0.06, e.y)) *
    inside;
  // fur from beside the eye (outer side), so the lid has the picture's own texture
  float side = eye.x < 0.5 ? -1.0 : 1.0;
  // (the lower part: fur from under the eye — often the light cheek)
  vec4 up = texture2D(u_tex, v_uv + vec2(side * eye.z * 2.3, -eye.w * 0.4));
  vec4 lo = texture2D(u_tex, v_uv + vec2(side * eye.z * 0.6, eye.w * 1.7));
  vec3 upc = mix(up.rgb / max(up.a, 0.001), u_lid, 0.3);
  vec3 loc = mix(upc, lo.rgb / max(lo.a, 0.001), step(0.9, lo.a));
  vec3 lidc = mix(upc, loc, smoothstep(0.35, 0.95, e.y));
  // a little rounder: slightly darker just above the lash
  lidc *= 0.9 + 0.1 * smoothstep(edge, edge - 0.8, e.y);
  vec3 col = mix(c.rgb, lidc * c.a, covered);
  float lash = (1.0 - smoothstep(0.05, 0.14, abs(e.y - edge))) * inside * smoothstep(0.1, 0.3, u_blink);
  col = mix(col, vec3(0.24, 0.14, 0.08) * c.a, lash * 0.92);
  return vec4(col, c.a);
}
void main() {
  vec4 c = texture2D(u_tex, v_uv);
  c = lid(c, u_eye0);
  c = lid(c, u_eye1);
  gl_FragColor = c;
}`;

type V2 = [number, number];
const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** where `p` is along a limb (0 at the base, 1 at the tip) and how far from it */
function along(p: V2, a: V2, b: V2) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  const c = Math.min(1, Math.max(0, t));
  const ex = p[0] - (a[0] + dx * c);
  const ey = p[1] - (a[1] + dy * c);
  return { t, dist: Math.hypot(ex, ey) };
}
const rot = (p: V2, o: V2, ang: number, w: number): V2 => {
  if (w <= 0 || ang === 0) return p;
  const a = ang * w;
  const s = Math.sin(a);
  const c = Math.cos(a);
  const x = p[0] - o[0];
  const y = p[1] - o[1];
  return [o[0] + x * c - y * s, o[1] + x * s + y * c];
};

/** per-vertex weights for every bone, worked out once per picture */
type Weights = {
  head: Float32Array;
  ears: Float32Array[];
  earT: Float32Array[];
  tail: Float32Array;
  tailT: Float32Array;
  arms: Float32Array[];
  armT: Float32Array[];
};

function limbWeights(rest: V2[], l: Limb, px: (p: Pt) => V2, H: number, bendFrom = 0.15) {
  const a = px(l.base);
  const b = px(l.tip);
  const r = (l.r / 100) * H;
  const w = new Float32Array(rest.length);
  const tt = new Float32Array(rest.length);
  rest.forEach((p, i) => {
    const { t, dist } = along(p, a, b);
    // nothing behind the base; full weight inside the limb, soft edge around it
    w[i] = sstep(-bendFrom, bendFrom, t) * (1 - sstep(r * 0.9, r * 1.6, dist));
    tt[i] = Math.min(1.2, Math.max(0, t));
  });
  return { w, t: tt };
}

export class LiveSprite {
  private gl: WebGLRenderingContext;
  private prog: WebGLProgram;
  private pos: Float32Array;
  private rest: V2[] = [];
  private uv: Float32Array;
  private idx: Uint16Array;
  private posBuf: WebGLBuffer;
  private tex: WebGLTexture | null = null;
  private disposed = false;
  private wts!: Weights;
  private W = 1;
  private H = 1;
  private px!: (p: Pt) => V2;
  /** where the picture sits in the canvas (css px): x, y, scale */
  private fit = { x: 0, y: 0, s: 1, cw: 1, ch: 1 };
  private phase = Math.random() * 10;
  private nextBlink = 1 + Math.random() * 2;
  private blinkAt = -1;
  private twitch = { at: -10, ear: 0, next: 2 + Math.random() * 3 };
  private ready = false;
  /** for checking the look: a fixed blink (0 open … 1 shut) instead of the random one */
  debugBlink: number | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private rig: Rig,
    private onReady: () => void,
  ) {
    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: true,
      alpha: true,
      antialias: true,
    });
    if (!gl) throw new Error("no webgl");
    this.gl = gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s) ?? "");
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
    this.prog = prog;

    const n = (GX + 1) * (GY + 1);
    this.pos = new Float32Array(n * 2);
    this.uv = new Float32Array(n * 2);
    for (let j = 0; j <= GY; j++)
      for (let i = 0; i <= GX; i++) {
        const k = j * (GX + 1) + i;
        this.uv[k * 2] = i / GX;
        this.uv[k * 2 + 1] = j / GY;
      }
    this.idx = new Uint16Array(GX * GY * 6);
    let q = 0;
    for (let j = 0; j < GY; j++)
      for (let i = 0; i < GX; i++) {
        const k = j * (GX + 1) + i;
        this.idx.set([k, k + 1, k + GX + 1, k + 1, k + GX + 2, k + GX + 1], q);
        q += 6;
      }
    this.posBuf = gl.createBuffer()!;
    const uvBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.uv, gl.STATIC_DRAW);
    gl.useProgram(prog);
    const aUv = gl.getAttribLocation(prog, "a_uv");
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.idx, gl.STATIC_DRAW);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  load(src: string) {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const gl = this.gl;
      this.W = img.naturalWidth;
      this.H = img.naturalHeight;
      this.px = (p: Pt) => [(p[0] / 100) * this.W, (p[1] / 100) * this.H];
      if (this.disposed) return;
      const tex = gl.createTexture();
      this.tex = tex;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.rig_();
      this.ready = true;
      this.refit();
      this.onReady();
    };
    img.src = src;
  }

  private rig_() {
    const { rig, W, H, px } = this;
    this.rest = [];
    for (let j = 0; j <= GY; j++)
      for (let i = 0; i <= GX; i++) this.rest.push([(i / GX) * W, (j / GY) * H]);
    const c = px(rig.head.c);
    const r = (rig.head.r / 100) * H;
    const head = new Float32Array(this.rest.length);
    this.rest.forEach((p, i) => {
      head[i] = 1 - sstep(r * 0.85, r * 1.35, Math.hypot(p[0] - c[0], p[1] - c[1]));
    });
    const ears = rig.ears.map((e) => limbWeights(this.rest, e, px, H, 0.1));
    const tail = rig.tail
      ? limbWeights(this.rest, rig.tail, px, H, 0.25)
      : { w: new Float32Array(this.rest.length), t: new Float32Array(this.rest.length) };
    const arms = (rig.arms ?? []).map((a) => limbWeights(this.rest, a, px, H, 0.2));
    this.wts = {
      head,
      ears: ears.map((e) => e.w),
      earT: ears.map((e) => e.t),
      tail: tail.w,
      tailT: tail.t,
      arms: arms.map((a) => a.w),
      armT: arms.map((a) => a.t),
    };
  }

  private box = { cw: 1, ch: 1, x: 0, y: 0, w: 1, h: 1 };
  /** the canvas box (css px) and where the picture's own box is inside it */
  resize(cw: number, ch: number, box: { x: number; y: number; w: number; h: number }) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(cw * dpr));
    this.canvas.height = Math.max(1, Math.round(ch * dpr));
    this.box = { cw, ch, ...box };
    this.refit();
  }
  /** object-fit: contain, object-position: bottom — like the <img> it replaces */
  private refit() {
    const { cw, ch, x, y, w, h } = this.box;
    const s = Math.min(w / this.W, h / this.H) || 1;
    this.fit = { x: x + (w - this.W * s) / 2, y: y + h - this.H * s, s, cw, ch };
    if (this.ready) this.frame(performance.now() / 1000);
  }

  frame(now: number) {
    if (!this.ready) return;
    const t = now + this.phase;
    const { rig, wts, rest, px } = this;
    const lively = rig.lively ? 1.6 : 1;

    // timings: blink every 2–5.5 s (now and then twice), an ear twitch every 3–7 s
    if (t > this.nextBlink) {
      this.blinkAt = t;
      this.nextBlink = t + (Math.random() < 0.2 ? 0.35 : 2 + Math.random() * 3.5);
    }
    const bt = t - this.blinkAt;
    const blink = bt < 0.07 ? bt / 0.07 : bt < 0.11 ? 1 : bt < 0.22 ? 1 - (bt - 0.11) / 0.11 : 0;
    if (t > this.twitch.next) {
      this.twitch = {
        at: t,
        ear: Math.floor(Math.random() * Math.max(1, rig.ears.length)),
        next: t + 3 + Math.random() * 4,
      };
    }
    const tw = t - this.twitch.at;
    const twitch = tw < 0.6 ? Math.sin(tw * 34) * Math.exp(-tw * 7) * 11 * DEG : 0;

    const breathe = Math.sin(t * ((2 * Math.PI) / 3.2));
    const headAng = (Math.sin(t * 1.4) * 2.2 + Math.sin(t * 0.53) * 1.2) * DEG;
    const feet = px(rig.feet);
    const neck = px(rig.head.neck);
    const tailBase = rig.tail ? px(rig.tail.base) : neck;
    const tailW = (2 * Math.PI) / (1.5 / lively);
    const ears = rig.ears.map((e) => px(e.base));
    const arms = (rig.arms ?? []).map((a) => px(a.base));
    const { x: ox, y: oy, s } = this.fit;

    for (let i = 0; i < rest.length; i++) {
      let p: V2 = rest[i];
      // ears (they then turn with the head)
      for (let e = 0; e < ears.length; e++) {
        const ang = (e === this.twitch.ear ? twitch : 0) + Math.sin(t * 1.1 + e) * 1.5 * DEG;
        p = rot(p, ears[e], ang * (e % 2 ? 1 : -1), wts.ears[e][i] * wts.earT[e][i]);
      }
      // the head tilts around the neck and bobs with the breath
      const hw = wts.head[i];
      if (hw > 0) {
        p = rot(p, neck, headAng, hw);
        p = [p[0], p[1] + breathe * 0.006 * this.H * hw];
      }
      // arms
      (rig.arms ?? []).forEach((a, k) => {
        const w = wts.arms[k][i];
        if (w <= 0) return;
        const side = a.tip[0] < a.base[0] ? 1 : -1;
        const ang =
          a.move === "wave"
            ? (Math.sin(t * ((2 * Math.PI) / 0.9)) * 16 - 4) * DEG
            : a.move === "cheer"
              ? Math.sin(t * ((2 * Math.PI) / 0.7) + k * Math.PI) * 7 * DEG
              : Math.sin(t * 2.1) * 3 * DEG;
        p = rot(p, arms[k], ang * side, w * Math.min(1, wts.armT[k][i] * 1.4));
      });
      // the tail wags: a wave that runs from the base to the tip, bigger at the tip
      const tw2 = wts.tail[i];
      if (tw2 > 0) {
        const u = wts.tailT[i];
        const ang = Math.sin(t * tailW - u * 1.8) * 9 * DEG * Math.pow(u, 1.2);
        p = rot(p, tailBase, ang, tw2);
      }
      // breathing: the body stretches a little up from the feet
      const up = Math.max(0, feet[1] - p[1]) / this.H;
      p = [
        feet[0] + (p[0] - feet[0]) * (1 + breathe * 0.008 * (1 - up)),
        p[1] - breathe * 0.012 * up * this.H,
      ];
      this.pos[i * 2] = ox + p[0] * s;
      this.pos[i * 2 + 1] = oy + p[1] * s;
    }

    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.pos, gl.DYNAMIC_DRAW);
    const aPos = gl.getAttribLocation(this.prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(gl.getUniformLocation(this.prog, "u_size"), this.fit.cw, this.fit.ch);
    const eyes = rig.eyes ?? [];
    ["u_eye0", "u_eye1"].forEach((name, k) => {
      const e = eyes[k];
      gl.uniform4f(
        gl.getUniformLocation(this.prog, name),
        e ? e.c[0] / 100 : 0,
        e ? e.c[1] / 100 : 0,
        e ? e.rx / 100 : 0,
        e ? e.ry / 100 : 0,
      );
    });
    gl.uniform1f(
      gl.getUniformLocation(this.prog, "u_blink"),
      eyes.length ? (this.debugBlink ?? blink) : 0,
    );
    const lid = rig.lid ?? [245, 140, 36];
    gl.uniform3f(
      gl.getUniformLocation(this.prog, "u_lid"),
      lid[0] / 255,
      lid[1] / 255,
      lid[2] / 255,
    );
    gl.drawElements(gl.TRIANGLES, this.idx.length, gl.UNSIGNED_SHORT, 0);
  }

  /** frees the GPU memory; the context itself stays (React may mount the same canvas again) */
  dispose() {
    this.disposed = true;
    const gl = this.gl;
    if (this.tex) gl.deleteTexture(this.tex);
    gl.deleteBuffer(this.posBuf);
    this.ready = false;
  }
}

// ---------- one frame loop for every live picture on screen ----------
const live = new Set<LiveSprite>();
// dev only: the live sprites, so a check can shut their eyes (window.__live)
if (import.meta.env.DEV && typeof window !== "undefined")
  (window as unknown as { __live: Set<LiveSprite> }).__live = live;
let raf = 0;
const tick = (ms: number) => {
  raf = 0;
  if (document.hidden || !live.size) return;
  live.forEach((s) => s.frame(ms / 1000));
  raf = requestAnimationFrame(tick);
};
const wake = () => {
  if (!raf && live.size && !document.hidden) raf = requestAnimationFrame(tick);
};
if (typeof document !== "undefined") document.addEventListener("visibilitychange", wake);

/** start/stop drawing a sprite every frame (it stays on its last frame while stopped) */
export function setRunning(s: LiveSprite, on: boolean) {
  if (on) live.add(s);
  else live.delete(s);
  wake();
}

export const canLive = () =>
  typeof window !== "undefined" &&
  !matchMedia("(prefers-reduced-motion: reduce)").matches &&
  typeof WebGLRenderingContext !== "undefined";
