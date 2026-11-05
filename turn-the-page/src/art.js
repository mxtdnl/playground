// Turn the Page — illustration (SPEC.md section 12).
//
// All art is inline SVG built from code: no image files. The office is made
// of rectangles and circles; Maya is a seated figure of primitives (circle
// head, cut-circle hair, trapezoid torso, jointed bar arms, block legs) in her
// own colours, plum and ochre. Hard edges and flat fills only: no gradients,
// no blur, no rounded rectangles.
//
// Three steps, so the interface can interpolate between poses:
//   poseFor(sceneState)    the six pose parameters (SPEC.md 12) as words
//   sceneVector(sceneState) every coordinate the drawing needs, as numbers
//   drawScene(vec)         the SVG string for one vector
// lerpScene(a, b, t) blends two vectors; ui.js runs it for 0.4s between
// poses (instantly under reduced motion). renderScene(sceneState) does all
// of it at once and also returns the generated alt text.
//
// No scoring numbers live here. The posture bands only choose which picture
// to show; they never change the meters.

// ---------------------------------------------------------------------------
// Posture states (SPEC.md 12), from most closed to most open.

export const POSTURES = ['closed', 'guarded', 'neutral', 'open', 'animated'];

// The mean of Trust and Confidence picks a band. Presentation only.
const POSTURE_FLOORS = { closed: 0, guarded: 20, neutral: 40, open: 50, animated: 60 };

// The profile's pose bias pulls the posture towards it: a band on the far
// side of the bias needs this much more (or less) before it shows. With
// Maya's 'guarded' bias, neutral needs a mean of 44 rather than 40, and
// closed needs a mean below 16 rather than 20.
const POSE_BIAS_MARGIN = 4;

export function postureFor(meters, poseBias) {
  const score = (meters.trust + meters.confidence) / 2;
  const b = POSTURES.indexOf(poseBias);
  let i = 0;
  POSTURES.forEach(function (p, k) {
    let floor = POSTURE_FLOORS[p];
    if (b >= 0 && k > b) floor += POSE_BIAS_MARGIN; // further above the bias: harder to reach
    if (b >= 0 && k <= b && k > 0) floor -= POSE_BIAS_MARGIN; // at or below it: easier to stay in
    if (score >= floor) i = k;
  });
  return POSTURES[i];
}

// The pose each posture state shows unless a page overrides a parameter.
// Values: shoulders raised|neutral|relaxed; arms crossed|bag|lap|open|gesturing;
// head down|level|up; gaze floor|door|phone|counsellor|window;
// mouth flat|tight|slightSmile|smile; chair edge|back|leaningIn.
export const POSTURE_POSES = {
  closed: { shoulders: 'raised', arms: 'crossed', head: 'down', gaze: 'floor', mouth: 'tight', chair: 'back' },
  guarded: { shoulders: 'raised', arms: 'bag', head: 'level', gaze: 'door', mouth: 'flat', chair: 'edge' },
  neutral: { shoulders: 'neutral', arms: 'lap', head: 'level', gaze: 'counsellor', mouth: 'flat', chair: 'back' },
  open: { shoulders: 'relaxed', arms: 'open', head: 'level', gaze: 'counsellor', mouth: 'slightSmile', chair: 'back' },
  animated: { shoulders: 'relaxed', arms: 'gesturing', head: 'up', gaze: 'counsellor', mouth: 'smile', chair: 'leaningIn' }
};

export const POSE_PARAMS = {
  shoulders: ['raised', 'neutral', 'relaxed'],
  arms: ['crossed', 'bag', 'lap', 'open', 'gesturing'],
  head: ['down', 'level', 'up'],
  gaze: ['floor', 'door', 'phone', 'counsellor', 'window'],
  mouth: ['flat', 'tight', 'slightSmile', 'smile'],
  chair: ['edge', 'back', 'leaningIn']
};

// sceneState: { meters, poseBias, pose (page overrides), props, round, step }
// Returns the posture and the full set of parameters after overrides.
export function poseFor(sceneState) {
  const posture = postureFor(sceneState.meters, sceneState.poseBias);
  const pose = Object.assign({}, POSTURE_POSES[posture]);
  const over = sceneState.pose || {};
  Object.keys(POSE_PARAMS).forEach(function (k) {
    if (POSE_PARAMS[k].indexOf(over[k]) >= 0) pose[k] = over[k];
  });
  const props = (sceneState.props || over.props || []).slice();
  if (pose.gaze === 'phone' && props.indexOf('phone') < 0) props.push('phone');
  return { posture: posture, pose: pose, props: props };
}

// ---------------------------------------------------------------------------
// Colours. The office uses the page tokens (SPEC.md 11.1); Maya has her own
// plum and ochre, plus a skin tone and darker shades for the far limbs.

const C = {
  paper: '#F3ECDC', card: '#FFFBF2', deep: '#E6DCC6', ink: '#1C1F33', muted: '#565868', rule: '#D9CFBA',
  cobalt: '#2747B8', green: '#1A7050', ochre: '#D9A21B', vermilion: '#D2401E', plum: '#6B2E7A',
  plumDark: '#4E1F5A', trousers: '#2B2F4A', trousersFar: '#1F2236', skin: '#B07A52', skinFar: '#97663F', hair: '#1C1F33',
  wood: '#8C6A48'
};

// Time of day per round: the window's sky and sun, the light on the wall.
const TIME = {
  r1: { sky: '#C9D3EA', sun: C.ochre, sunY: 48, sunStep: 3, clockMin: 10, clockHour: 2, light: 0 },
  r2: { sky: '#EDC59A', sun: C.vermilion, sunY: 86, sunStep: 3, clockMin: 10, clockHour: 4, light: 0.16 }
};
const CLOCK_STEP_MIN = 5; // minutes the clock advances per decision (presentation only)

// ---------------------------------------------------------------------------
// Geometry. Coordinates are in the 400 x 300 viewBox. Maya sits facing left,
// towards the counsellor, whose silhouette fills the bottom-left corner.

const FLOOR_Y = 262;
// Maya and her chair are drawn at this scale about a point on the floor, so
// her face reads at phone width (SPEC.md 12; checked in tests/art-gallery.mjs).
const FIG_SCALE = 1.45;
const FIG_PIVOT = { x: 262, y: 262 };
const SEAT = { x: 226, y: 222, w: 74 };
const HIP_Y = 213;
const TORSO = 60;
const HIP_X = { edge: 242, back: 266, leaningIn: 252 };
const LEAN = { edge: 3, back: -7, leaningIn: 17 }; // degrees towards the counsellor
const SHOULDER = {
  raised: { lift: 7, spread: 14, neck: 4 },
  neutral: { lift: 0, spread: 18, neck: 7 },
  relaxed: { lift: -3, spread: 20, neck: 9 }
};
const GAZE = {
  counsellor: { fx: -0.75, fy: 0.15 },
  floor: { fx: -0.45, fy: 0.95 },
  phone: { fx: -0.6, fy: 0.85 },
  door: { fx: 0.85, fy: 0.05 },
  window: { fx: -0.8, fy: -0.7 }
};
const HEAD = { down: { fwd: 6, drop: 2, fy: 0.45 }, level: { fwd: 0, drop: 0, fy: 0 }, up: { fwd: -2, drop: -2, fy: -0.35 } };
// Mouth: width, upper and lower curve depth (a filled shape between them).
const MOUTH = {
  flat: { w: 10, up: 0, low: 2.2, brow: 0 },
  tight: { w: 8, up: -2.6, low: 2.4, brow: 2.6 },
  slightSmile: { w: 11, up: 2.4, low: 2.8, brow: -0.8 },
  smile: { w: 13, up: 1.8, low: 8, brow: -1.6 }
};

function pt(x, y) { return { x: x, y: y }; }
function add(a, b, k) { return pt(a.x + b.x * (k === undefined ? 1 : k), a.y + b.y * (k === undefined ? 1 : k)); }

// Arm targets per arms value: elbow and hand for the near arm (1, towards the
// counsellor) and the far arm (2). L and R are the shoulder joints, H the hip.
function armTargets(arms, L, R, H, bag) {
  // Elbows that hang by the side sit halfway between shoulder and hip height,
  // so the arm keeps its length whether the shoulders are raised or dropped.
  const e1y = (L.y + H.y) / 2 + 4;
  const e2y = (R.y + H.y) / 2 + 4;
  switch (arms) {
    case 'crossed':
      return { e1: pt(L.x - 5, L.y + 25), h1: pt(R.x + 7, R.y + 17), e2: pt(R.x + 7, R.y + 27), h2: pt(L.x - 7, L.y + 15) };
    case 'bag':
      return { e1: pt(L.x - 2, e1y), h1: pt(bag.x - 16, bag.y - 1), e2: pt(R.x - 2, e2y), h2: pt(bag.x + 8, bag.y - 10) };
    case 'open':
      return { e1: pt(L.x - 12, e1y - 4), h1: pt(L.x - 36, e1y - 12), e2: pt(R.x + 10, e2y - 4), h2: pt(R.x + 32, e2y - 14) };
    case 'gesturing':
      return { e1: pt(L.x - 22, L.y + 20), h1: pt(L.x - 34, L.y - 6), e2: pt(R.x - 2, e2y), h2: pt(H.x - 20, H.y - 7) };
    default: // lap
      return { e1: pt(L.x - 6, e1y), h1: pt(H.x - 30, H.y - 6), e2: pt(R.x - 2, e2y), h2: pt(H.x - 20, H.y - 8) };
  }
}

// Every number the drawing needs. Flags (strings, booleans) are not blended.
export function sceneVector(sceneState) {
  const r = poseFor(sceneState);
  const pose = r.pose;
  const round = sceneState.round === 'r2' ? 'r2' : 'r1';
  const time = TIME[round];
  const step = sceneState.step || 0;
  const sh = SHOULDER[pose.shoulders];
  const head = HEAD[pose.head];
  const gaze = GAZE[pose.gaze];
  const mouth = MOUTH[pose.mouth];

  const H = pt(HIP_X[pose.chair], HIP_Y);
  const th = LEAN[pose.chair] * Math.PI / 180;
  const u = pt(-Math.sin(th), -Math.cos(th)); // up the spine
  const p = pt(Math.cos(th), -Math.sin(th)); // across the body, towards the chair back
  const S = add(add(H, u, TORSO), pt(0, -sh.lift));
  const L = add(S, p, -sh.spread * 0.75);
  const R = add(S, p, sh.spread * 0.75);
  const hc = add(add(S, u, sh.neck + 19), pt(-head.fwd, head.drop));
  const fx = gaze.fx;
  const fy = Math.max(-1, Math.min(1.2, gaze.fy + head.fy));
  const bagHeld = pose.arms === 'bag';
  const bag = bagHeld ? pt(H.x - 26, H.y - 14) : pt(312, 250);
  const a = armTargets(pose.arms, L, R, H, bag);
  const K = pt(H.x - 44, H.y - 1);
  const minutes = time.clockMin + step * CLOCK_STEP_MIN;

  return {
    round: round,
    phone: r.props.indexOf('phone') >= 0,
    brochure: round === 'r2' || r.props.indexOf('brochure') >= 0,
    bagHeld: bagHeld ? 1 : 0,
    // Office.
    sunY: time.sunY + step * time.sunStep,
    minAngle: minutes * 6,
    hourAngle: (time.clockHour + minutes / 60) * 30,
    light: time.light,
    // Maya.
    hx: H.x, hy: H.y, lean: th,
    sx: S.x, sy: S.y, lx: L.x, ly: L.y, rx: R.x, ry: R.y, spread: sh.spread,
    cx: hc.x, cy: hc.y, fx: fx, fy: fy,
    e1x: a.e1.x, e1y: a.e1.y, h1x: a.h1.x, h1y: a.h1.y, e2x: a.e2.x, e2y: a.e2.y, h2x: a.h2.x, h2y: a.h2.y,
    kx: K.x, ky: K.y, bagX: bag.x, bagY: bag.y,
    mw: mouth.w, mup: mouth.up, mlow: mouth.low, brow: mouth.brow,
    eyeH: fy > 0.6 ? 1.8 : 4.2
  };
}

export function lerpScene(a, b, t) {
  const out = {};
  Object.keys(b).forEach(function (k) {
    out[k] = typeof b[k] === 'number' && typeof a[k] === 'number' ? a[k] + (b[k] - a[k]) * t : b[k];
  });
  return out;
}

// ---------------------------------------------------------------------------
// Drawing.

function n(v) { return Math.round(v * 10) / 10; }
function rect(x, y, w, h, fill, extra) { return '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '" fill="' + fill + '"' + (extra || '') + '/>'; }
function circ(x, y, r, fill, extra) { return '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(r) + '" fill="' + fill + '"' + (extra || '') + '/>'; }
function poly(pts, fill) { return '<polygon points="' + pts.map(function (q) { return n(q[0]) + ',' + n(q[1]); }).join(' ') + '" fill="' + fill + '"/>'; }
function bar(x1, y1, x2, y2, w, colour, cap) {
  return '<line x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) + '" stroke="' + colour + '" stroke-width="' + w + '" stroke-linecap="' + (cap || 'butt') + '"/>';
}
function hand(x, y, angleFrom, colour) {
  return circ(x, y, 5, colour);
}

function office(v) {
  const t = TIME[v.round];
  let s = '';
  s += rect(0, 0, 400, FLOOR_Y, C.card);
  s += rect(0, FLOOR_Y - 6, 400, 6, C.rule); // skirting
  s += rect(0, FLOOR_Y, 400, 300 - FLOOR_Y, C.deep);
  // Window, top left: the sky shows the time of day; the sun sinks a little per decision.
  s += '<svg x="24" y="26" width="88" height="84" overflow="hidden">' + rect(0, 0, 88, 84, t.sky) + circ(62, v.sunY - 26, 13, t.sun) + rect(0, 66, 88, 18, C.muted, ' opacity="0.35"') + '</svg>';
  s += rect(22, 24, 92, 88, 'none', ' stroke="' + C.ink + '" stroke-width="4"');
  s += rect(66, 26, 4, 84, C.ink) + rect(24, 66, 88, 4, C.ink);
  s += rect(16, 112, 104, 6, C.ink); // sill
  // Later light: a patch of low sun across the wall and floor (Round 2).
  if (v.light > 0) s += poly([[112, 112], [150, 112], [262, FLOOR_Y], [196, FLOOR_Y]], C.ochre).replace('/>', ' opacity="' + v.light + '"/>');
  // Clock: the hands advance one step per decision.
  const ccx = 150, ccy = 36;
  s += circ(ccx, ccy, 17, C.card, ' stroke="' + C.ink + '" stroke-width="4"');
  for (let i = 0; i < 12; i += 3) s += rect(ccx - 1.5 + 12 * Math.sin(i * Math.PI / 6), ccy - 1.5 - 12 * Math.cos(i * Math.PI / 6), 3, 3, C.ink);
  s += bar(ccx, ccy, ccx + 8 * Math.sin(v.hourAngle * Math.PI / 180), ccy - 8 * Math.cos(v.hourAngle * Math.PI / 180), 3.5, C.ink);
  s += bar(ccx, ccy, ccx + 13 * Math.sin(v.minAngle * Math.PI / 180), ccy - 13 * Math.cos(v.minAngle * Math.PI / 180), 2, C.vermilion);
  s += circ(ccx, ccy, 2.2, C.ink);
  // Pinboard with notes.
  const bx = 124, byy = 64;
  s += rect(bx, byy, 54, 48, C.wood) + rect(bx, byy, 54, 48, 'none', ' stroke="' + C.ink + '" stroke-width="3"');
  s += rect(bx + 6, byy + 6, 16, 13, C.card) + rect(bx + 27, byy + 5, 12, 16, C.plum) + rect(bx + 6, byy + 26, 22, 15, C.paper) + rect(bx + 33, byy + 26, 14, 14, C.card);
  s += circ(bx + 14, byy + 7, 2, C.vermilion) + circ(bx + 33, byy + 6, 2, C.ink) + circ(bx + 17, byy + 27, 2, C.cobalt) + circ(bx + 40, byy + 27, 2, C.vermilion);
  // Door, right: Maya's way out.
  s += rect(332, 48, 56, FLOOR_Y - 48, C.deep) + rect(332, 48, 56, FLOOR_Y - 48, 'none', ' stroke="' + C.ink + '" stroke-width="4"');
  s += rect(342, 60, 36, 44, C.card) + rect(342, 116, 36, 120, 'none', ' stroke="' + C.muted + '" stroke-width="2"');
  s += circ(342, 160, 3.5, C.ink) + rect(342, 158.5, 9, 3, C.ink);
  // Desk, between you and Maya; the course brochure lies on it in Round 2.
  const dx = 58; // desk left edge
  s += rect(dx, 196, 76, 7, C.ink) + rect(dx + 6, 203, 5, FLOOR_Y - 203, C.ink) + rect(dx + 66, 203, 5, FLOOR_Y - 203, C.ink);
  s += rect(dx + 40, 203, 24, 22, C.muted);
  s += rect(dx + 30, 188, 24, 8, C.paper) + rect(dx + 33, 184, 20, 4, C.card); // papers
  if (v.brochure) s += poly([[dx + 44, 196], [dx + 72, 196], [dx + 76, 188], [dx + 48, 188]], C.cobalt) + poly([[dx + 48, 188], [dx + 76, 188], [dx + 75, 190.5], [dx + 47, 190.5]], C.ochre) + rect(dx + 56, 192, 8, 2, C.card);
  return s;
}

function chair() {
  let s = '';
  // Maya's chair: seat, back and legs.
  s += rect(SEAT.x + SEAT.w - 9, 136, 9, SEAT.y - 136, C.muted);
  s += rect(SEAT.x, SEAT.y, SEAT.w, 8, C.muted);
  s += rect(SEAT.x + 4, SEAT.y + 8, 6, FLOOR_Y - SEAT.y - 8, C.muted) + rect(SEAT.x + SEAT.w - 10, SEAT.y + 8, 6, FLOOR_Y - SEAT.y - 8, C.muted);
  return s;
}

function maya(v) {
  let s = '';
  const H = pt(v.hx, v.hy), K = pt(v.kx, v.ky);
  // Legs: blocks, far leg first and darker. Ankles drop to the floor.
  const legs = function (dx, dy, cTrouser, cShoe) {
    let o = '';
    o += bar(H.x + dx, H.y + dy, K.x + dx, K.y + dy, 17, cTrouser, 'square');
    o += bar(K.x + dx, K.y + dy, K.x + dx + 3, FLOOR_Y - 7, 13, cTrouser, 'square');
    o += rect(K.x + dx - 13, FLOOR_Y - 8, 20, 8, cShoe);
    return o;
  };
  s += legs(7, -2, C.trousersFar, C.ink) + legs(0, 0, C.trousers, C.ink);
  // Bag: on the floor by the chair, or held on her lap.
  s += rect(v.bagX - 17, v.bagY - 12, 34, 24, C.ochre) + rect(v.bagX - 17, v.bagY - 12, 34, 5, '#B5850F');
  s += rect(v.bagX - 9, v.bagY - 20, 18, 3, C.ink) + rect(v.bagX - 9, v.bagY - 20, 3, 9, C.ink) + rect(v.bagX + 6, v.bagY - 20, 3, 9, C.ink);
  // Far arm (drawn over the torso in a darker plum, so crossed arms read).
  const far = function () {
    return bar(v.rx, v.ry, v.e2x, v.e2y, 9, C.plumDark) + circ(v.e2x, v.e2y, 4.5, C.plumDark) + bar(v.e2x, v.e2y, v.h2x, v.h2y, 8, C.plumDark) + circ(v.h2x, v.h2y, 4.5, C.skinFar);
  };
  // Neck and torso (a trapezoid, wider at the shoulders), with an ochre collar.
  const c = Math.cos(v.lean), sn = Math.sin(v.lean);
  const px = c, py = -sn; // across the body
  s += bar(v.sx, v.sy + 2, v.cx + 2, v.cy + 10, 9, C.skin);
  const hipW = 16;
  s += poly([
    [v.sx - px * v.spread, v.sy - py * v.spread], [v.sx + px * v.spread, v.sy + py * v.spread],
    [v.hx + px * hipW, v.hy + py * hipW + 4], [v.hx - px * hipW, v.hy - py * hipW + 4]
  ], C.plum);
  s += poly([
    [v.sx - px * 8, v.sy - py * 8 - 0.5], [v.sx + px * 8, v.sy + py * 8 - 0.5],
    [v.sx + px * 4 - sn * 7, v.sy + py * 4 + c * 7], [v.sx - px * 4 - sn * 7, v.sy - py * 4 + c * 7]
  ], C.ochre);
  s += far();
  // Near arm: jointed bars with a visible elbow joint.
  s += bar(v.lx, v.ly, v.e1x, v.e1y, 10, C.plum) + circ(v.lx, v.ly, 5, C.plum) + circ(v.e1x, v.e1y, 5, C.plum) + bar(v.e1x, v.e1y, v.h1x, v.h1y, 9, C.plum);
  if (v.phone) s += rect(v.h1x - 4, v.h1y - 11, 8, 13, C.ink) + rect(v.h1x - 2.5, v.h1y - 9.5, 5, 8, C.cobalt);
  s += hand(v.h1x, v.h1y, 0, C.skin);
  // Head: hair disc, a bob behind the face, the face disc turned towards the gaze.
  const fcx = v.cx + v.fx * 6.5, fcy = v.cy + v.fy * 4.5 + 2.5;
  s += rect(v.cx - v.fx * 9 - 12, v.cy - 4, 24, 26, C.hair);
  s += circ(v.cx, v.cy, 21, C.hair);
  s += circ(fcx, fcy, 15.5, C.skin);
  // Fringe: the top of the hair disc cut by a chord.
  const yc = fcy - 6.5;
  const dy = yc - v.cy;
  const half = Math.sqrt(Math.max(0, 21 * 21 - dy * dy));
  s += '<path d="M ' + n(v.cx - half) + ' ' + n(yc) + ' A 21 21 0 0 1 ' + n(v.cx + half) + ' ' + n(yc) + ' Z" fill="' + C.hair + '"/>';
  // Eyes (squares; lowered lids become bars), brows, a triangle nose and the mouth.
  const ex = fcx + v.fx * 4, ey = fcy + v.fy * 3 + 0.5;
  const gap = 4.6 * (1 - 0.4 * Math.abs(v.fx));
  const eh = v.eyeH;
  s += rect(ex - gap - 2.2, ey - eh / 2, 4.4, eh, C.ink) + rect(ex + gap - 2.2, ey - eh / 2, 4.4, eh, C.ink);
  const by = ey - 5 + Math.max(0, v.brow) * 0.3;
  s += poly([[ex - gap - 3, by - v.brow * -0.0 - 1], [ex - gap + 3, by + v.brow * 0.6 - 1], [ex - gap + 3, by + v.brow * 0.6 + 0.8], [ex - gap - 3, by + 0.8]], C.hair);
  s += poly([[ex + gap - 3, by + v.brow * 0.6 - 1], [ex + gap + 3, by - 1], [ex + gap + 3, by + 0.8], [ex + gap - 3, by + v.brow * 0.6 + 0.8]], C.hair);
  const nx = fcx + v.fx * 9, ny = fcy + v.fy * 3 + 4;
  s += poly([[nx, ny - 4], [nx + v.fx * 5, ny + 1.5], [nx, ny + 1.5]], C.skinFar);
  const mx = fcx + v.fx * 4.5, my = fcy + v.fy * 3 + 8.5;
  const hw = v.mw / 2 * (1 - 0.25 * Math.abs(v.fx));
  s += '<path d="M ' + n(mx - hw) + ' ' + n(my) + ' Q ' + n(mx) + ' ' + n(my + v.mup) + ' ' + n(mx + hw) + ' ' + n(my) + ' Q ' + n(mx) + ' ' + n(my + v.mlow + v.mup) + ' ' + n(mx - hw) + ' ' + n(my) + ' Z" fill="' + C.ink + '"/>';
  return s;
}

// You: a dark over-the-shoulder silhouette at the frame edge, and your chair.
function counsellor() {
  return rect(96, 236, 10, 64, C.muted) + rect(80, 232, 28, 7, C.muted) +
    poly([[-40, 300], [-12, 262], [56, 250], [112, 270], [134, 300]], C.ink) +
    rect(18, 230, 30, 26, C.ink) + circ(30, 208, 38, C.ink);
}

export function drawScene(v) {
  return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" shape-rendering="geometricPrecision">' +
    office(v) + '<g transform="translate(' + FIG_PIVOT.x + ' ' + FIG_PIVOT.y + ') scale(' + FIG_SCALE + ') translate(' + (-FIG_PIVOT.x) + ' ' + (-FIG_PIVOT.y) + ')">' + chair() + maya(v) + '</g>' + counsellor() + '</svg>';
}

// ---------------------------------------------------------------------------
// Alt text, generated from the pose (SPEC.md 12).

const ALT_WORDS = {
  chair: { edge: 'on the edge of the chair', back: 'back in the chair', leaningIn: 'leaning in towards you' },
  arms: { crossed: 'arms crossed', bag: 'holding her bag on her lap', lap: 'hands in her lap', open: 'hands open', gesturing: 'gesturing as she talks' },
  shoulders: { raised: 'shoulders raised', neutral: '', relaxed: 'shoulders relaxed' },
  gaze: { floor: 'looking at the floor', door: 'looking at the door', phone: 'looking at her phone', counsellor: 'looking at you', window: 'looking out of the window' },
  head: { down: 'head down', level: '', up: 'chin up' },
  mouth: { flat: '', tight: 'lips pressed together', slightSmile: 'with a slight smile', smile: 'smiling' }
};

export function altFor(r) {
  const p = r.pose;
  const parts = [ALT_WORDS.arms[p.arms], ALT_WORDS.shoulders[p.shoulders]];
  if (r.props.indexOf('phone') >= 0 && p.gaze !== 'phone') parts.push('phone in her hand');
  parts.push(ALT_WORDS.gaze[p.gaze]);
  if (!(p.head === 'down' && (p.gaze === 'floor' || p.gaze === 'phone'))) parts.push(ALT_WORDS.head[p.head]);
  parts.push(ALT_WORDS.mouth[p.mouth]);
  return 'Maya sits ' + ALT_WORDS.chair[p.chair] + ', ' + parts.filter(Boolean).join(', ') + '.';
}

// sceneState: { meters, poseBias, pose (page overrides), props, round, step }
// Returns { svg, alt, posture, pose, vec }.
export function renderScene(sceneState) {
  const r = poseFor(sceneState);
  const vec = sceneVector(sceneState);
  return { svg: drawScene(vec), alt: altFor(r), posture: r.posture, pose: r.pose, vec: vec };
}
