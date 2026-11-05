// WCAG 2.x contrast measurement, run inside the page by Playwright
// (page.evaluate(pageAudit, opts)). The function is self-contained because
// Playwright sends only its source to the browser.
//
// For each visible text node it finds the text colour (CSS `color`, or `fill`
// for SVG text) and the colour actually behind it: the stack of ancestor
// backgrounds down to the first opaque one, with any decorative shape that
// overlaps the text composited in where the shape shows through (each shape
// alone and all of them together; the worst case counts). SVG text adds the
// shapes drawn before it in the same SVG, or its halo stroke when it has one.
// Opacity on ancestors is multiplied in.
//
// Thresholds (WCAG 1.4.3 AA): 4.5:1, or 3:1 for large text (24px, or 18.66px
// bold). Graphics that carry meaning on their own (opts.graphics selectors)
// need 3:1 (WCAG 1.4.11) at their edge: the stroke or border if they have one,
// otherwise the fill.
//
// With opts.focus set, measures only the focus indicator of the element that
// has focus: the outline colour against what is behind the outline.

export function pageAudit(opts) {
  opts = opts || {};
  const parse = (c) => {
    if (!c || c === 'none' || c === 'transparent') return null;
    const m = /rgba?\(([^)]+)\)/.exec(c);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (top, a, base) => ({ r: top.r * a + base.r * (1 - a), g: top.g * a + base.g * (1 - a), b: top.b * a + base.b * (1 - a), a: 1 });
  const lum = (c) => {
    const ch = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const pageEl = document.querySelector('#app .page');
  const shapes = Array.from(document.querySelectorAll('#app .page .deco .shape')).map((s) => {
    const cs = getComputedStyle(s);
    const ring = s.classList.contains('ring');
    return { rect: s.getBoundingClientRect(), colour: parse(ring ? cs.borderTopColor : cs.backgroundColor), alpha: Number(cs.opacity) };
  });
  const opacityChain = (el) => {
    let a = 1;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) a *= Number(getComputedStyle(e).opacity);
    return a;
  };
  const path = (el) => {
    const out = [];
    for (let e = el; e && e !== pageEl && out.length < 4; e = e.parentElement) {
      out.unshift(e.tagName.toLowerCase() + (e.classList.length ? '.' + Array.from(e.classList).join('.') : ''));
    }
    return out.join(' > ');
  };
  // Background stacks behind an element: a list of candidate opaque colours
  // (the base with no shape, with each overlapping shape, with all of them).
  const backgrounds = (el, rect) => {
    const layers = [];
    let base = null;
    let baseEl = null;
    for (let e = el; e; e = e.parentElement) {
      if (e instanceof SVGElement) continue;
      const cs = getComputedStyle(e);
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) {
        const a = c.a * Number(cs.opacity);
        if (a >= 0.999) { base = c; baseEl = e; break; }
        layers.push({ c, a });
      }
    }
    if (!base) { base = { r: 255, g: 255, b: 255, a: 1 }; baseEl = document.documentElement; }
    const finish = (b) => layers.slice().reverse().reduce((acc, l) => over(l.c, l.a, acc), b);
    const out = [finish(base)];
    // Decorative shapes sit just above the page background and below the content.
    const showsThrough = baseEl === pageEl || !pageEl.contains(baseEl);
    if (showsThrough) {
      const hits = shapes.filter((s) => s.colour && intersects(s.rect, rect));
      hits.forEach((s) => out.push(finish(over(s.colour, s.alpha, base))));
      if (hits.length > 1) out.push(finish(hits.reduce((acc, s) => over(s.colour, s.alpha, acc), base)));
    }
    return out;
  };
  // SVG: shapes painted before `el` in the same SVG that overlap it.
  const svgUnder = (el, rect, htmlBgs) => {
    const svg = el.ownerSVGElement;
    const cs = getComputedStyle(el);
    const halo = parse(cs.stroke);
    // A halo stroke painted under the fill (paint-order: stroke) is the
    // background the glyphs are read against.
    if (halo && halo.a === 1 && parseFloat(cs.strokeWidth) >= 2 && /^stroke/.test(cs.paintOrder || '')) return [halo];
    const before = [];
    for (const n of svg.querySelectorAll('rect, circle, polygon, path, ellipse')) {
      if (n === el || (n.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) === 0) continue;
      const ncs = getComputedStyle(n);
      const f = parse(ncs.fill);
      if (!f || f.a === 0 || !intersects(n.getBoundingClientRect(), rect)) continue;
      before.push({ c: f, a: f.a * Number(ncs.fillOpacity) * Number(ncs.opacity) });
    }
    return htmlBgs.map((b) => before.reduce((acc, l) => over(l.c, l.a, acc), b));
  };

  const results = { checked: 0, failures: [], pairs: {} };
  const record = (kind, el, text, fg, bgs, need, large) => {
    results.checked++;
    let worst = null;
    bgs.forEach((b) => { const r = ratio(fg, b); if (!worst || r < worst.r) worst = { r, b }; });
    const key = hex(fg) + ' on ' + hex(worst.b);
    const p = results.pairs[key] || (results.pairs[key] = { min: Infinity, n: 0, large: true });
    p.n++; p.min = Math.min(p.min, worst.r); p.large = p.large && large;
    if (worst.r + 1e-9 < need) {
      results.failures.push({ kind, text: text.slice(0, 60), where: path(el), fg: hex(fg), bg: hex(worst.b), ratio: Math.round(worst.r * 100) / 100, need });
    }
  };

  if (opts.focus) {
    const el = document.activeElement;
    if (!el || el === document.body) return { none: true };
    const cs = getComputedStyle(el);
    const width = parseFloat(cs.outlineWidth);
    const colour = parse(cs.outlineColor);
    if (cs.outlineStyle === 'none' || !(width >= 2) || !colour) return { el: path(el), visible: false, style: cs.outlineStyle, width };
    const r = el.getBoundingClientRect();
    const off = parseFloat(cs.outlineOffset) || 0;
    // The outline sits outside the element when the offset is positive.
    const ring = { left: r.left - off - width, right: r.right + off + width, top: r.top - off - width, bottom: r.bottom + off + width };
    const behind = off > 0 ? backgrounds(el.parentElement, ring) : backgrounds(el, ring);
    const worst = Math.min.apply(null, behind.map((b) => ratio(colour, b)));
    return { el: path(el), visible: true, width, colour: hex(colour), ratio: Math.round(worst * 100) / 100 };
  }

  const root = document.querySelector('#app');
  const notice = document.getElementById('storage-notice');
  const scopes = [root].concat(notice ? [notice] : []);
  for (const scope of scopes) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest('.deco, .sr-only, noscript, title, style, script')) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const rect = range.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility !== 'visible' || opacityChain(el) === 0) continue;
      const isSvg = el instanceof SVGElement;
      const fg = parse(isSvg ? cs.fill : cs.color);
      if (!fg) continue;
      const alpha = fg.a * opacityChain(el);
      let size = parseFloat(cs.fontSize);
      if (isSvg) {
        const svg = el.ownerSVGElement;
        const vb = svg.viewBox && svg.viewBox.baseVal;
        if (vb && vb.width) size *= svg.getBoundingClientRect().width / vb.width;
      }
      const weight = Number(cs.fontWeight) || (cs.fontWeight === 'bold' ? 700 : 400);
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      let bgs = backgrounds(el, rect);
      if (isSvg) bgs = svgUnder(el, rect, bgs);
      const fgs = bgs.map((b) => over(fg, alpha, b));
      // Record against each background (the text colour composited on it).
      let worst = null;
      bgs.forEach((b, i) => { const r = ratio(fgs[i], b); if (!worst || r < worst.r) worst = { r, i }; });
      record('text', el, n.nodeValue.trim(), fgs[worst.i], [bgs[worst.i]], large ? 3 : 4.5, large);
    }
  }
  // Form fields: the value is not a text node.
  root.querySelectorAll('textarea, input').forEach((el) => {
    if (!el.value) return;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    record('text', el, el.value, parse(cs.color), backgrounds(el, rect), parseFloat(cs.fontSize) >= 24 ? 3 : 4.5, false);
  });
  // Graphics that carry meaning on their own.
  (opts.graphics || []).forEach((sel) => {
    root.querySelectorAll(sel).forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 1) return;
      const cs = getComputedStyle(el);
      const isSvg = el instanceof SVGElement;
      let edge;
      if (isSvg) edge = parseFloat(cs.strokeWidth) >= 1 ? parse(cs.stroke) : null;
      else edge = parseFloat(cs.borderTopWidth) >= 1 ? parse(cs.borderTopColor) : null;
      const fill = parse(isSvg ? cs.fill : cs.backgroundColor);
      const colour = edge && edge.a > 0 ? edge : fill;
      if (!colour) return;
      const host = isSvg ? el.ownerSVGElement.parentElement : el.parentElement;
      record('graphic', el, sel, colour, backgrounds(host, rect), 3, true);
    });
  });
  return results;
}
