/* FOREGA LABS AI — procedural can-label texture generator.
   Each label is drawn on a 1024x1024 canvas that wraps the can body.
   x=512 is the front of the can, x=0/x=1024 is the back seam. */

function hexRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgba(hex, a) {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function circuitTraces(ctx, W, H, accent, seed) {
  const rnd = mulberry(seed);
  ctx.save();
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    ctx.strokeStyle = rgba(accent, 0.10 + rnd() * 0.14);
    let x = rnd() * W, y = rnd() * H;
    ctx.beginPath(); ctx.moveTo(x, y);
    const segs = 2 + Math.floor(rnd() * 4);
    for (let s = 0; s < segs; s++) {
      if (rnd() > 0.5) x += (rnd() - 0.5) * 320; else y += (rnd() - 0.5) * 320;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = rgba(accent, 0.35);
    ctx.beginPath(); ctx.arc(x, y, 3 + rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function mono(ctx, text, x, y, size, color, align = 'center', spacing = 0) {
  ctx.save();
  ctx.font = `500 ${size}px "JetBrains Mono", monospace`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (spacing > 0) {
    // manual letter-spacing
    const chars = [...text];
    const widths = chars.map(c => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let cx = align === 'center' ? x - total / 2 : (align === 'left' ? x : x - total);
    const prev = ctx.textAlign; ctx.textAlign = 'left';
    chars.forEach((c, i) => { ctx.fillText(c, cx, y); cx += widths[i] + spacing; });
    ctx.textAlign = prev;
  } else ctx.fillText(text, x, y);
  ctx.restore();
}

function display(ctx, text, x, y, size, color, align = 'center') {
  ctx.save();
  ctx.font = `${size}px "Archivo Black", sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function barcode(ctx, x, y, w, h, accent) {
  const rnd = mulberry(77);
  let cx = x;
  ctx.save();
  while (cx < x + w) {
    const bw = 2 + rnd() * 8;
    ctx.fillStyle = rnd() > 0.82 ? rgba(accent, 0.9) : 'rgba(240,240,240,0.85)';
    ctx.fillRect(cx, y, bw, h);
    cx += bw + 2 + rnd() * 6;
  }
  ctx.restore();
}

export function makeLabelTexture(THREE, flavor) {
  const W = 1024, H = 1024;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const A = flavor.accent;

  // ---- base: deep black, subtle vertical sheen ----
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b0b0e'); g.addColorStop(0.45, '#060608');
  g.addColorStop(0.55, '#0a0a0d'); g.addColorStop(1, '#050506');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // faint horizontal scanlines
  ctx.fillStyle = 'rgba(255,255,255,0.016)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);

  circuitTraces(ctx, W, H, A, flavor.seed);

  // accent edge bands (wrap seams feel like a sleeve)
  ctx.fillStyle = rgba(A, 0.85);
  ctx.fillRect(0, 0, 10, H); ctx.fillRect(W - 10, 0, 10, H);

  // ---- BACK (x=0 seam): vertical FOREGA watermark ----
  ctx.save();
  ctx.translate(0, H / 2); ctx.rotate(-Math.PI / 2);
  ctx.font = '150px "Archivo Black", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(A, 0.16);
  ctx.fillText('FOREGA', 0, 0);
  ctx.restore();
  mono(ctx, 'AI-FORMULATED // BATCH 001', 0, H / 2 + 130, 22, rgba(A, 0.5));

  // ---- FRONT (x=512) ----
  const cx = W / 2;

  // top micro header
  mono(ctx, 'FOREGA LABS AI', cx, 78, 30, '#f4f4f5', 'center', 14);
  mono(ctx, 'ENERGY, ENGINEERED.', cx, 116, 20, rgba(A, 0.9), 'center', 8);

  // thin accent rule
  ctx.fillStyle = rgba(A, 0.9); ctx.fillRect(cx - 190, 152, 380, 3);

  // giant flavor name — two lines
  const [l1, l2] = flavor.labelLines;
  ctx.save();
  ctx.shadowColor = rgba(A, 0.8); ctx.shadowBlur = 46;
  display(ctx, l1, cx, 300, 148, '#ffffff');
  display(ctx, l2, cx, 448, 148, '#ffffff');
  ctx.restore();
  // accent slash through the name
  ctx.save();
  ctx.translate(cx, 374); ctx.rotate(-0.06);
  ctx.fillStyle = rgba(A, 0.9); ctx.fillRect(-260, -8, 520, 16);
  ctx.restore();

  mono(ctx, flavor.tagline.toUpperCase(), cx, 560, 24, 'rgba(244,244,245,0.85)', 'center', 4);

  // spec block
  const specs = flavor.labelSpecs;
  let sy = 640;
  mono(ctx, `FORMULA ${flavor.code} // SPEC`, cx, sy, 22, rgba(A, 0.95), 'center', 6);
  sy += 46;
  specs.forEach(([k, v]) => {
    mono(ctx, k, cx - 190, sy, 24, 'rgba(244,244,245,0.55)', 'left');
    mono(ctx, v, cx + 190, sy, 24, '#ffffff', 'right');
    // dotted leader
    ctx.fillStyle = 'rgba(244,244,245,0.18)';
    for (let dx = cx - 120; dx < cx + 60; dx += 10) ctx.fillRect(dx, sy - 1, 4, 2);
    sy += 44;
  });

  // bottom: barcode + volume
  barcode(ctx, cx - 190, sy + 10, 220, 64, A);
  mono(ctx, '473 ML', cx + 190, sy + 42, 26, 'rgba(244,244,245,0.8)', 'right', 4);
  mono(ctx, 'SHAKE THE FUTURE', cx - 190, sy + 100, 20, rgba(A, 0.7), 'left', 6);

  // bottom band
  ctx.fillStyle = rgba(A, 0.9); ctx.fillRect(0, H - 26, W, 26);
  mono(ctx, `FOREGA.OS // ${flavor.code} // 0G SUGAR // `.repeat(3), W / 2, H - 13, 18, '#040405', 'center', 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}
