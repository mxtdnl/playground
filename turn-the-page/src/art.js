// Turn the Page — illustration (SPEC.md section 12).
//
// Session 3 PLACEHOLDER: a framed panel with a geometric silhouette and the
// current posture state written as text. Session 4 replaces this file with
// the full scene and figure system; keep the renderScene(sceneState) entry
// point so ui.js does not need to change.
//
// No scoring numbers live here. The posture bands below only choose which
// picture to show; they never change the meters.

// Posture states in order from most closed to most open (SPEC.md 12).
export const POSTURES = ['closed', 'guarded', 'neutral', 'open', 'animated'];

// Placeholder rule: the mean of Trust and Confidence picks a band; the
// profile's pose bias then pulls a neutral-or-better posture one step towards
// it (a guarded profile skews guarded). Session 4 will refine this.
const POSTURE_FLOORS = { closed: 0, guarded: 25, neutral: 40, open: 55, animated: 70 };

export function postureFor(meters, poseBias) {
  const score = (meters.trust + meters.confidence) / 2;
  let i = 0;
  POSTURES.forEach(function (p, k) { if (score >= POSTURE_FLOORS[p]) i = k; });
  const b = POSTURES.indexOf(poseBias);
  if (b >= 0 && i > b && i < POSTURES.length - 1 && score < POSTURE_FLOORS[POSTURES[i]] + 5) i -= 1;
  return POSTURES[i];
}

// Words for the node's pose hints, used in the caption and the alt text.
const GAZE_WORDS = {
  floor: 'looking at the floor', door: 'looking at the door', phone: 'looking at her phone',
  counsellor: 'looking at you', window: 'looking out of the window'
};

// Silhouette geometry per posture: shoulder lift, head drop, lean and arm angle.
const POSTURE_SHAPES = {
  closed: { lift: -10, head: 10, lean: -14, arm: 'crossed' },
  guarded: { lift: -6, head: 6, lean: -8, arm: 'crossed' },
  neutral: { lift: 0, head: 0, lean: 0, arm: 'lap' },
  open: { lift: 3, head: -2, lean: 8, arm: 'lap' },
  animated: { lift: 4, head: -5, lean: 14, arm: 'open' }
};

// sceneState: { meters, poseBias, pose (node hints), round }
// Returns { svg, alt, posture, caption }.
export function renderScene(sceneState) {
  const posture = postureFor(sceneState.meters, sceneState.poseBias);
  const pose = sceneState.pose || {};
  const g = POSTURE_SHAPES[posture];
  const lean = g.lean;
  const window2 = sceneState.round === 'r2';
  const arms = g.arm === 'crossed'
    ? '<rect x="' + (172 + lean) + '" y="' + (170 - g.lift) + '" width="64" height="14" fill="#1C1F33"/>'
    : g.arm === 'open'
      ? '<polygon points="' + (160 + lean) + ',' + (150 - g.lift) + ' ' + (132 + lean) + ',' + (196) + ' ' + (144 + lean) + ',' + (200) + ' ' + (170 + lean) + ',' + (158 - g.lift) + '" fill="#1C1F33"/>' +
        '<polygon points="' + (248 + lean) + ',' + (150 - g.lift) + ' ' + (276 + lean) + ',' + (196) + ' ' + (264 + lean) + ',' + (200) + ' ' + (238 + lean) + ',' + (158 - g.lift) + '" fill="#1C1F33"/>'
      : '<rect x="' + (170 + lean) + '" y="206" width="70" height="12" fill="#1C1F33"/>';
  const props = (pose.props || []).map(function (p) {
    if (p === 'phone') return '<rect x="' + (226 + lean) + '" y="196" width="10" height="18" fill="#D9A21B"/>';
    if (p === 'brochure') return '<rect x="300" y="186" width="34" height="8" fill="#2747B8"/>';
    return '';
  }).join('');
  const svg =
    '<svg viewBox="0 0 400 300" role="img" aria-hidden="true" focusable="false">' +
    // Wall, window (later light in Round 2), door and desk.
    '<rect width="400" height="300" fill="#FFFBF2"/>' +
    '<rect x="24" y="28" width="92" height="74" fill="' + (window2 ? '#D9A21B' : '#2747B8') + '" opacity="0.18"/>' +
    '<rect x="24" y="28" width="92" height="74" fill="none" stroke="#1C1F33" stroke-width="4"/>' +
    '<rect x="68" y="28" width="4" height="74" fill="#1C1F33"/>' +
    '<rect x="340" y="40" width="44" height="200" fill="none" stroke="#1C1F33" stroke-width="4"/>' +
    '<circle cx="350" cy="146" r="4" fill="#1C1F33"/>' +
    '<rect x="270" y="194" width="110" height="12" fill="#1C1F33"/>' +
    '<rect x="276" y="206" width="8" height="70" fill="#1C1F33"/><rect x="366" y="206" width="8" height="70" fill="#1C1F33"/>' +
    '<rect x="0" y="276" width="400" height="24" fill="#E6DCC6"/>' +
    // Chair.
    '<rect x="150" y="222" width="110" height="12" fill="#565868"/>' +
    '<rect x="' + (pose.chair === 'edge' ? 150 : 146) + '" y="134" width="12" height="100" fill="#565868"/>' +
    '<rect x="156" y="234" width="8" height="42" fill="#565868"/><rect x="246" y="234" width="8" height="42" fill="#565868"/>' +
    // Silhouette: legs, torso (trapezoid), arms, head (circle) and hair (cut circle).
    '<rect x="' + (180 + lean / 2) + '" y="218" width="60" height="14" fill="#6B2E7A"/>' +
    '<rect x="' + (224 + lean / 2) + '" y="218" width="16" height="58" fill="#6B2E7A"/>' +
    '<rect x="' + (190 + lean / 2) + '" y="218" width="16" height="58" fill="#6B2E7A"/>' +
    '<polygon points="' + (176 + lean) + ',' + (146 - g.lift) + ' ' + (236 + lean) + ',' + (146 - g.lift) + ' ' + (244 + lean / 2) + ',222 ' + (172 + lean / 2) + ',222" fill="#6B2E7A"/>' +
    arms +
    '<circle cx="' + (206 + lean * 1.2) + '" cy="' + (116 + g.head - g.lift) + '" r="24" fill="#1C1F33"/>' +
    '<path d="M ' + (182 + lean * 1.2) + ' ' + (112 + g.head - g.lift) + ' A 24 24 0 0 1 ' + (230 + lean * 1.2) + ' ' + (112 + g.head - g.lift) + ' Z" fill="#D9A21B"/>' +
    props +
    '</svg>';
  const gaze = GAZE_WORDS[pose.gaze] || '';
  const alt = 'Placeholder figure: Maya, posture ' + posture + (gaze ? ', ' + gaze : '') + '.';
  return { svg: svg, alt: alt, posture: posture, caption: gaze };
}
