/* Fallowborn — procedural character portraits (no assets, deterministic).
   Features derive from a hash of the character's id+name, so a face never
   changes between renders or saves. */
window.FB = window.FB || {};

(function () {
  'use strict';

  const PALE = ['norse', 'english', 'german', 'frankish', 'slavic', 'baltic', 'gaelic', 'brezhon', 'magyar'];
  const TAN = ['iberian', 'italian', 'greek', 'armenian', 'georgian', 'turkic'];
  const BROWN = ['andalusi', 'arabic', 'berber', 'persian'];
  const SKIN = [
    ['#f0d2b2', '#d8b590'], // pale (tone, shade)
    ['#e3b98c', '#c99c6c'], // tan
    ['#c08a58', '#a06f42'], // brown
    ['#7c4f30', '#603a22']  // dark
  ];
  const HAIR = ['#241a10', '#412c14', '#6b4a1e', '#a1762f', '#a4432a', '#635a4e'];

  function hashOf(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
    return h >>> 0;
  }
  function byte(h, n) { // nth pseudo-byte of the hash, 0..255
    let x = (h ^ (n * 0x9E3779B9)) >>> 0;
    x = Math.imul(x ^ (x >>> 15), 0x85EBCA6B) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 0xC2B2AE35) >>> 0;
    return (x ^ (x >>> 16)) & 255;
  }

  function hexLerp(a, b, t) { // blend two #rrggbb colors, t = 0..1
    const ar = parseInt(a.substr(1, 2), 16), ag = parseInt(a.substr(3, 2), 16), ab = parseInt(a.substr(5, 2), 16);
    const br = parseInt(b.substr(1, 2), 16), bg = parseInt(b.substr(3, 2), 16), bb = parseInt(b.substr(5, 2), 16);
    return 'rgb(' + Math.round(ar + (br - ar) * t) + ',' + Math.round(ag + (bg - ag) * t) + ',' +
      Math.round(ab + (bb - ab) * t) + ')';
  }

  /* opts: { profession, tier, ill } — only meaningful for the player character */
  FB.paintPortrait = function (canvas, c, year, opts) {
    if (!canvas || !c) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const u = W / 64, v = H / 72; // design space 64x72
    const h = hashOf(c.id + '|' + c.name);
    const age = Math.max(0, year - c.born);
    const child = age < 13;
    const female = c.sex === 'f';
    const relGroup = FB.religionOf(c.religion).group;
    const prof = opts && opts.profession;
    const tier = opts ? (opts.tier || 0) : 0;

    // condition: health and named ailments shape the face (NPCs default to hale)
    const hp = c.health === undefined ? 8 : c.health;
    const ails = FB.ailmentsOf ? FB.ailmentsOf(c) : [];
    let sick = !!(opts && opts.ill);
    for (let ai = 0; ai < ails.length; ai++) if (ails[ai].def.kind === 'sickness') sick = true;

    let toneIdx = 1;
    if (PALE.indexOf(c.culture) >= 0) toneIdx = 0;
    else if (TAN.indexOf(c.culture) >= 0) toneIdx = 1;
    else if (BROWN.indexOf(c.culture) >= 0) toneIdx = 2;
    else if (c.culture === 'nubian') toneIdx = 3;
    let skin = SKIN[toneIdx][0], skinShade = SKIN[toneIdx][1];
    if (sick || hp <= 4) { // waxen and grey with sickness or pain
      const t = sick ? 0.5 : 0.3;
      skin = hexLerp(skin, '#c9cdb4', t);
      skinShade = hexLerp(skinShade, '#a9ad96', t);
    }

    let hair = HAIR[byte(h, 1) % (toneIdx === 0 ? 5 : 3)]; // reds/blonds mostly northern
    if (age >= 72) hair = '#d9d6cf';
    else if (age >= 55) hair = '#98918a';
    const beard = !female && !child && (relGroup === 'muslim' ? byte(h, 2) > 40 : byte(h, 2) > 120);
    const tonsure = prof === 'monk' && relGroup === 'christian';
    const turban = !female && !child && relGroup === 'muslim' && prof !== 'monk';
    const veil = female && !child && (relGroup === 'muslim' || byte(h, 3) > 150);

    ctx.clearRect(0, 0, W, H);
    // backdrop tinted by dynasty
    const bgHue = hashOf(c.dyn || c.name) % 360;
    ctx.fillStyle = 'hsl(' + bgHue + ',22%,20%)';
    ctx.fillRect(0, 0, W, H);

    // shoulders / clothing by rank
    const cloth = tier >= 6 ? '#7c3f8f' : tier >= 4 ? '#8f3a3a' : tier >= 3 ? '#3d5f8a' :
      tier === 2 ? '#4f6540' : '#5d4a33';
    ctx.fillStyle = cloth;
    ctx.beginPath();
    ctx.ellipse(32 * u, 78 * v, 24 * u, 20 * v, 0, Math.PI, 0);
    ctx.fill();
    if (tier >= 4) { // gold trim for the mighty
      ctx.strokeStyle = '#d8b24a'; ctx.lineWidth = 1.6 * u;
      ctx.beginPath(); ctx.ellipse(32 * u, 78 * v, 20 * u, 16 * v, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    }
    // monk's robe hood
    if (tonsure || (prof === 'monk' && relGroup !== 'christian')) {
      ctx.fillStyle = '#4a3d2e';
      ctx.beginPath(); ctx.ellipse(32 * u, 76 * v, 26 * u, 24 * v, 0, Math.PI, 0); ctx.fill();
    }

    // neck
    ctx.fillStyle = skinShade;
    ctx.fillRect(27 * u, 52 * v, 10 * u, 10 * v);

    // head
    const headR = child ? 15 : 17;
    const cy = child ? 36 : 34;
    // long hair behind head
    if (!veil && (female || byte(h, 4) > 170) && !tonsure && !turban) {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.ellipse(32 * u, (cy + 6) * v, (headR + 4) * u, (headR + 10) * v, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(32 * u, cy * v, headR * u, (headR + 2) * v, 0, 0, Math.PI * 2);
    ctx.fill();

    // hair on top / veil / turban / tonsure
    if (veil) {
      ctx.fillStyle = 'hsl(' + ((bgHue + 160) % 360) + ',30%,42%)';
      ctx.beginPath();
      ctx.ellipse(32 * u, (cy - 2) * v, (headR + 3.5) * u, (headR + 5) * v, 0, Math.PI * 0.95, Math.PI * 2.05);
      ctx.fill();
      ctx.fillRect((32 - headR - 3.5) * u, (cy - 2) * v, 3.5 * u, (headR + 16) * v);
      ctx.fillRect((32 + headR) * u, (cy - 2) * v, 3.5 * u, (headR + 16) * v);
    } else if (turban) {
      ctx.fillStyle = byte(h, 5) > 128 ? '#e6ddc8' : 'hsl(' + ((bgHue + 200) % 360) + ',26%,55%)';
      ctx.beginPath();
      ctx.ellipse(32 * u, (cy - headR + 3) * v, (headR + 2.5) * u, 8.5 * v, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(32 * u, (cy - headR + 0.5) * v, (headR - 3) * u, 5.5 * v, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (tonsure) {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.ellipse(32 * u, (cy - headR + 6) * v, (headR + 0.5) * u, 6 * v, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = skin; // shaved crown
      ctx.beginPath();
      ctx.ellipse(32 * u, (cy - headR + 5) * v, (headR - 6) * u, 4 * v, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = hair;
      const fringe = 4 + (byte(h, 6) % 4);
      ctx.beginPath();
      ctx.ellipse(32 * u, (cy - headR + fringe) * v, (headR + 1) * u, (fringe + 3) * v, 0, Math.PI, 0);
      ctx.fill();
    }

    // women and girls wear their hair long in front, framing the face —
    // the strongest sex cue the thumbnail sizes can carry
    if (female && !veil) {
      ctx.strokeStyle = hair; ctx.lineWidth = 4.5 * u; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo((32 - headR + 0.5) * u, (cy - 4) * v); ctx.lineTo((32 - headR - 1) * u, (cy + headR + 8) * v);
      ctx.moveTo((32 + headR - 0.5) * u, (cy - 4) * v); ctx.lineTo((32 + headR + 1) * u, (cy + headR + 8) * v);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    // eyes & brows (men get heavier brows)
    const eyeY = cy - 2, eyeDx = 6.5;
    const woundSide = byte(h, 10) > 127 ? 1 : -1; // which side bears the marks
    const oneEye = c.traits && c.traits.indexOf('one_eyed') >= 0;
    const faint = hp <= 2; // at death’s door the eyes sink to slits
    ctx.fillStyle = '#241a10';
    for (const side of [-1, 1]) {
      const ex = (32 + side * eyeDx) * u;
      if (oneEye && side === woundSide) { // a closed, sunken socket
        ctx.strokeStyle = skinShade; ctx.lineWidth = 1.6 * v;
        ctx.beginPath(); ctx.moveTo(ex - 2.5 * u, eyeY * v); ctx.lineTo(ex + 2.5 * u, eyeY * v); ctx.stroke();
      } else if (faint) {
        ctx.strokeStyle = '#241a10'; ctx.lineWidth = 1.4 * v;
        ctx.beginPath(); ctx.moveTo(ex - 2 * u, eyeY * v); ctx.lineTo(ex + 2 * u, eyeY * v); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.ellipse(ex, eyeY * v, 1.8 * u, 2.2 * v, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (hp <= 4) { // hollow with pain: shadows beneath the eyes
      ctx.strokeStyle = 'rgba(90,60,60,0.55)'; ctx.lineWidth = 1 * v;
      ctx.beginPath();
      ctx.moveTo((32 - eyeDx - 2.5) * u, (eyeY + 3.5) * v);
      ctx.quadraticCurveTo((32 - eyeDx) * u, (eyeY + 5) * v, (32 - eyeDx + 2.5) * u, (eyeY + 3.5) * v);
      ctx.moveTo((32 + eyeDx - 2.5) * u, (eyeY + 3.5) * v);
      ctx.quadraticCurveTo((32 + eyeDx) * u, (eyeY + 5) * v, (32 + eyeDx + 2.5) * u, (eyeY + 3.5) * v);
      ctx.stroke();
    }
    ctx.strokeStyle = hair; ctx.lineWidth = (female ? 1.1 : 2) * v;
    const tilt = ((byte(h, 7) % 3) - 1) * 1.2;
    ctx.beginPath();
    ctx.moveTo((32 - eyeDx - 3) * u, (eyeY - 4 + tilt) * v); ctx.lineTo((32 - eyeDx + 3) * u, (eyeY - 4 - tilt) * v);
    ctx.moveTo((32 + eyeDx - 3) * u, (eyeY - 4 - tilt) * v); ctx.lineTo((32 + eyeDx + 3) * u, (eyeY - 4 + tilt) * v);
    ctx.stroke();

    // nose & mouth
    ctx.strokeStyle = skinShade; ctx.lineWidth = 1.5 * u;
    ctx.beginPath(); ctx.moveTo(32 * u, (eyeY + 1) * v); ctx.lineTo(32 * u, (eyeY + 6) * v); ctx.stroke();
    const grim = c.traits && (c.traits.indexOf('cruel') >= 0 || c.traits.indexOf('wrathful') >= 0);
    const kind = c.traits && (c.traits.indexOf('kind') >= 0 || c.traits.indexOf('generous') >= 0);
    ctx.strokeStyle = female && !child ? '#a03e4e' : '#7a4a3a'; // women's lips read redder
    ctx.lineWidth = (female && !child ? 1.9 : 1.4) * v;
    ctx.beginPath();
    if (grim) { ctx.moveTo(28 * u, (eyeY + 11) * v); ctx.quadraticCurveTo(32 * u, (eyeY + 9) * v, 36 * u, (eyeY + 11) * v); }
    else if (kind || child) { ctx.moveTo(28 * u, (eyeY + 9.5) * v); ctx.quadraticCurveTo(32 * u, (eyeY + 12) * v, 36 * u, (eyeY + 9.5) * v); }
    else { ctx.moveTo(28.5 * u, (eyeY + 10) * v); ctx.lineTo(35.5 * u, (eyeY + 10) * v); }
    ctx.stroke();

    // beard
    if (beard) {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.ellipse(32 * u, (cy + headR - 4) * v, (headR - 4) * u, (7 + (byte(h, 8) % 5)) * v, 0, 0, Math.PI);
      ctx.fill();
    }

    // a glint of earring marks many grown women
    if (female && !child && byte(h, 9) > 90) {
      ctx.fillStyle = '#e8c455';
      ctx.beginPath(); ctx.ellipse((32 - headR + 1) * u, (cy + 5) * v, 1.6 * u, 1.6 * v, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse((32 + headR - 1) * u, (cy + 5) * v, 1.6 * u, 1.6 * v, 0, 0, Math.PI * 2); ctx.fill();
    }

    // wounds & old scars ride on top of everything but the crown
    let markCut = false, markBruise = false, markBandage = false;
    for (let mi = 0; mi < ails.length; mi++) {
      const mk = ails[mi].def.mark;
      if (mk === 'cut') markCut = true;
      else if (mk === 'bruise') markBruise = true;
      else if (mk === 'bandage') markBandage = true;
    }
    if (markBandage) { // a linen strip around the brow, knotted at the side
      ctx.save();
      ctx.translate(32 * u, (eyeY - 6.5) * v);
      ctx.rotate(woundSide * 0.06);
      ctx.fillStyle = '#e8e0cc';
      ctx.fillRect(-(headR - 1) * u, -2 * v, 2 * (headR - 1) * u, 4 * v);
      ctx.fillStyle = '#cfc5ab';
      ctx.fillRect((woundSide * (headR - 5) - 1.5) * u, -1 * v, 3 * u, 2 * v);
      ctx.restore();
    }
    if (markBruise) { // a shiner, dark around one eye
      ctx.fillStyle = 'rgba(74,42,58,0.4)';
      ctx.beginPath();
      ctx.ellipse((32 + woundSide * eyeDx) * u, (eyeY + 0.5) * v, 4 * u, 4.5 * v, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (markCut) { // a stitched cut across the cheek
      const cx0 = (32 - woundSide * 11) * u;
      ctx.strokeStyle = '#8a3030'; ctx.lineWidth = 1.6 * v; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx0, (eyeY + 6) * v);
      ctx.lineTo(cx0 + woundSide * 3 * u, (eyeY + 11) * v);
      ctx.stroke();
      ctx.strokeStyle = '#d8cfc0'; ctx.lineWidth = 0.9 * v;
      ctx.beginPath();
      ctx.moveTo(cx0 - 0.9 * u, (eyeY + 8) * v); ctx.lineTo(cx0 + 0.9 * u, (eyeY + 8) * v);
      ctx.moveTo(cx0 + woundSide * 2 * u - 0.9 * u, (eyeY + 9.5) * v);
      ctx.lineTo(cx0 + woundSide * 2 * u + 0.9 * u, (eyeY + 9.5) * v);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    if (c.traits && c.traits.indexOf('scarred') >= 0) { // the pale seam of an old wound
      const sSide = markCut ? woundSide : -woundSide;
      const sx = (32 + sSide * 11) * u;
      ctx.strokeStyle = 'rgba(224,200,180,0.85)'; ctx.lineWidth = 1.2 * v; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx - 1.5 * u, (eyeY + 4) * v);
      ctx.lineTo(sx + 1.5 * u, (eyeY + 10) * v);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    // crown / circlet
    if (tier >= 6) {
      ctx.fillStyle = '#e8c455';
      const ty = (cy - headR - 1) * v;
      ctx.fillRect((32 - headR + 3) * u, ty, (2 * headR - 6) * u, 3.5 * v);
      for (let i = 0; i < 3; i++) {
        const px = (32 - 8 + i * 8) * u;
        ctx.beginPath();
        ctx.moveTo(px - 2.5 * u, ty); ctx.lineTo(px, ty - 5 * v); ctx.lineTo(px + 2.5 * u, ty);
        ctx.fill();
      }
    } else if (tier >= 4 && !turban) {
      ctx.strokeStyle = '#e8c455'; ctx.lineWidth = 2 * v;
      ctx.beginPath();
      ctx.moveTo((32 - headR + 3) * u, (cy - headR + 3) * v);
      ctx.lineTo((32 + headR - 3) * u, (cy - headR + 3) * v);
      ctx.stroke();
    }

    // frame
    ctx.strokeStyle = 'rgba(200,170,90,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
  };

  /* Paint every <canvas class="pface" data-cid="..."> inside root. The player's
     own face gets profession/tier context (headgear, crowns). */
  FB.paintFaces = function (root, state) {
    if (!root || !state) return;
    const list = root.querySelectorAll('canvas.pface[data-cid]');
    for (let i = 0; i < list.length; i++) {
      const c = state.chars[list[i].getAttribute('data-cid')];
      if (!c) continue;
      const opts = c.id === state.player.charId ?
        { profession: state.player.profession, tier: state.player.tier, ill: !!state.player.flags.ill } : null;
      FB.paintPortrait(list[i], c, state.date.year, opts);
    }
    FB.paintCrests(root); // util.js loads first; crests ride along with faces
  };

  FB.faceTag = function (c, w, h) {
    return '<canvas class="pface" data-cid="' + c.id + '" width="' + w + '" height="' + h + '"></canvas>';
  };
})();
