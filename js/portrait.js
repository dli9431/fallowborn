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
  function pickArt(item, keys, fallback, salt) {
    const art = item && item.art || {};
    let list = null;
    for (let i = 0; i < keys.length; i++) {
      if (art[keys[i]]) { list = art[keys[i]]; break; }
    }
    if (!Array.isArray(list)) list = list ? [list] : [fallback];
    return list[byte(item ? item.visualSeed : 0, salt || 0) % list.length];
  }

  function itemFromLoadout(state, loadout, slot) {
    const value = loadout && loadout[slot];
    if (!value) return null;
    if (typeof value === 'object' && value.defId && FB.resolveItemSnapshot) {
      return FB.resolveItemSnapshot(value);
    }
    return state && FB.resolveItemReadOnly
      ? FB.resolveItemReadOnly(state, value)
      : (state && FB.resolveItem ? FB.resolveItem(state, value) : null);
  }

  /* Every item picture goes through this saved-seed renderer. Its local
     design space is roughly -50..50 and it never consumes gameplay RNG. */
  function drawItemArt(ctx, item, x, y, scale, angle, mirror) {
    if (!ctx || !item) return;
    const kind = item.art && item.art.kind || 'generic';
    const metal = pickArt(item, ['metals'], '#afb5b3', 1);
    const base = pickArt(item,
      ['cloths', 'leathers', 'woods', 'covers', 'grips', 'cords', 'wraps'],
      '#5b402b', 2);
    const accent = pickArt(item,
      ['gems', 'threads', 'trims', 'pages'], '#c5a454', 3);
    const polish = item.quality === 'masterwork' ? '#f5e4a4' :
      (item.quality === 'well' ? '#ddd8bd' : '#928878');
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.scale((mirror ? -1 : 1) * scale, scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#241d18';
    ctx.lineWidth = 2.2;

    if (kind === 'sword' || kind === 'seax') {
      const short = kind === 'seax';
      const top = short ? -31 : -45;
      ctx.fillStyle = metal;
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.lineTo(short ? 6 : 7, 14);
      ctx.lineTo(0, 19);
      ctx.lineTo(short ? -3 : -7, 14);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = polish; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, top + 5); ctx.lineTo(1, 12); ctx.stroke();
      ctx.strokeStyle = '#241d18'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-11, 18); ctx.lineTo(11, 18); ctx.stroke();
      ctx.strokeStyle = base; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, 37); ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(0, 40, item.art && item.art.gems ? 4 : 3, 0, Math.PI * 2); ctx.fill();
      if (item.art && (item.art.runes || item.art.pattern)) {
        ctx.strokeStyle = accent; ctx.lineWidth = 1.2;
        for (let r = -20; r < 9; r += 8) {
          ctx.beginPath(); ctx.moveTo(-2, r); ctx.lineTo(3, r + 4); ctx.stroke();
        }
      }
    } else if (kind === 'spear') {
      ctx.strokeStyle = base; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, 49); ctx.stroke();
      ctx.fillStyle = metal; ctx.strokeStyle = '#292521'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -55); ctx.lineTo(8, -35); ctx.lineTo(0, -30);
      ctx.lineTo(-8, -35); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = polish; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -51); ctx.lineTo(1, -36); ctx.stroke();
    } else if (kind === 'shield') {
      ctx.fillStyle = base; ctx.strokeStyle = metal; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 31, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-27, 0); ctx.lineTo(27, 0);
      ctx.moveTo(0, -27); ctx.lineTo(0, 27); ctx.stroke();
      ctx.fillStyle = metal; ctx.strokeStyle = '#2b2925'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (kind === 'book') {
      ctx.fillStyle = base;
      ctx.fillRect(-26, -32, 52, 64); ctx.strokeRect(-26, -32, 52, 64);
      ctx.fillStyle = accent; ctx.fillRect(-20, -27, 40, 54);
      ctx.fillStyle = base; ctx.fillRect(-17, -26, 3, 52);
      ctx.strokeStyle = polish; ctx.lineWidth = 1.5;
      ctx.strokeRect(-20, -27, 40, 54);
    } else if (kind === 'jack') {
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.moveTo(-31, -25); ctx.lineTo(-18, -38); ctx.lineTo(-8, -31);
      ctx.lineTo(8, -31); ctx.lineTo(18, -38); ctx.lineTo(31, -25);
      ctx.lineTo(23, 35); ctx.lineTo(-23, 35); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 1.4;
      for (let q = -14; q <= 28; q += 10) {
        ctx.beginPath(); ctx.moveTo(-21, q); ctx.lineTo(21, q); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 34); ctx.stroke();
    } else if (kind === 'helm') {
      ctx.fillStyle = metal;
      ctx.beginPath(); ctx.arc(0, 0, 25, Math.PI, 0); ctx.lineTo(23, 12);
      ctx.lineTo(-23, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillRect(-4, -1, 8, 29);
      ctx.strokeStyle = polish; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, 20, Math.PI, 0); ctx.stroke();
    } else if (kind === 'crown') {
      ctx.fillStyle = metal;
      ctx.beginPath();
      ctx.moveTo(-28, 12); ctx.lineTo(-28, -8); ctx.lineTo(-16, 2);
      ctx.lineTo(-8, -17); ctx.lineTo(0, 0); ctx.lineTo(9, -19);
      ctx.lineTo(17, 2); ctx.lineTo(28, -10); ctx.lineTo(28, 12);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = accent;
      for (let g = -16; g <= 16; g += 16) {
        ctx.beginPath(); ctx.arc(g, 7, 3, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === 'ring') {
      ctx.strokeStyle = metal; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(0, 4, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = accent; ctx.strokeStyle = '#30271f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-7, -14); ctx.lineTo(0, -23);
      ctx.lineTo(8, -14); ctx.lineTo(5, -6); ctx.lineTo(-5, -6);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (kind === 'pendant' || kind === 'relic') {
      ctx.strokeStyle = base; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, -9, 25, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
      ctx.fillStyle = metal; ctx.strokeStyle = '#30271f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 16, kind === 'relic' ? 12 : 9, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 24);
      ctx.moveTo(-6, 15); ctx.lineTo(6, 15); ctx.stroke();
    } else if (kind === 'belt') {
      ctx.fillStyle = base; ctx.strokeStyle = '#2d211a'; ctx.lineWidth = 2;
      ctx.fillRect(-43, -8, 86, 16); ctx.strokeRect(-43, -8, 86, 16);
      ctx.strokeStyle = metal; ctx.lineWidth = 4; ctx.strokeRect(-10, -11, 20, 22);
      if (item.art && item.art.gems) {
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.arc(-28, 0, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(28, 0, 3, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === 'boots') {
      ctx.fillStyle = base;
      for (let b = -1; b <= 1; b += 2) {
        ctx.beginPath();
        ctx.moveTo(b * 14, -31); ctx.lineTo(b * 35, -31);
        ctx.quadraticCurveTo(b * 36, -3, b * 33, 17);
        ctx.quadraticCurveTo(b * 34, 21, b * 40, 25);
        ctx.quadraticCurveTo(b * 39, 32, b * 31, 34);
        ctx.lineTo(b * 14, 33);
        ctx.quadraticCurveTo(b * 11, 29, b * 14, 22);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(205,163,119,0.42)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(b * 16, -25); ctx.lineTo(b * 33, -25);
        ctx.moveTo(b * 15, 18); ctx.quadraticCurveTo(b * 24, 14, b * 33, 18);
        ctx.stroke();
        ctx.strokeStyle = '#241d18';
        ctx.lineWidth = 2.2;
      }
    } else if (kind === 'chest') {
      ctx.fillStyle = base; ctx.fillRect(-30, -24, 60, 48); ctx.strokeRect(-30, -24, 60, 48);
      ctx.strokeStyle = metal; ctx.lineWidth = 4; ctx.strokeRect(-25, -19, 50, 38);
      ctx.fillStyle = metal; ctx.fillRect(-5, -3, 10, 13);
      if (item.art && item.art.mark) {
        ctx.strokeStyle = accent; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, 12);
        ctx.moveTo(-9, -4); ctx.lineTo(9, -4); ctx.stroke();
      }
    } else if (kind === 'picks') {
      ctx.strokeStyle = metal; ctx.lineWidth = 3;
      for (let p = -9; p <= 9; p += 9) {
        ctx.beginPath(); ctx.moveTo(p, 35); ctx.lineTo(p, -30); ctx.lineTo(p + 10, -36); ctx.stroke();
      }
      ctx.strokeStyle = base; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(-16, 25); ctx.lineTo(17, 25); ctx.stroke();
    } else {
      ctx.fillStyle = base; ctx.strokeStyle = metal; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = accent; ctx.font = 'bold 28px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✦', 0, 1);
    }
    ctx.restore();
  }

  FB.characterLook = function (c, year, state, opts) {
    opts = opts || {};
    const age = Math.max(0, year - c.born);
    /* Rendering is pure: an established career may color the outfit, but
       looking at a stranger never creates career state. */
    const career = c.career || null;
    const profession = opts.profession || (career && career.profession) || c.role || '';
    const tier = opts.tier !== undefined ? opts.tier :
      (state && c.id === state.player.charId ? state.player.tier :
        (FB.stationOf ? FB.stationOf(c) : (c.station || 0)));
    const seed = hashOf(c.id + '|' + c.name);
    const hue = hashOf(c.dyn || c.name) % 360;
    const cultureHue = hashOf(c.culture || 'fallow') % 360;
    let cloth = tier >= 6 ? '#783f87' : tier >= 4 ? '#873d42' :
      tier >= 3 ? '#3b5d82' : tier === 2 ? '#506443' : '#5b4935';
    if (profession === 'monk' || profession === 'priest') cloth = '#493e31';
    else if (profession === 'soldier') cloth = '#59605d';
    else if (profession === 'merchant') cloth = '#4b665d';
    return {
      seed:seed, age:age, child:age < 13, female:c.sex === 'f',
      profession:profession, tier:tier, hue:hue, cloth:cloth,
      cultureAccent:'hsl(' + cultureHue + ',30%,55%)',
      faith:FB.religionOf(c.religion).group
    };
  };

  FB.paintPortrait = function (canvas, c, year, opts) {
    if (!canvas || !c) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const u = W / 64, v = H / 72; // design space 64x72
    const h = hashOf(c.id + '|' + c.name);
    const look = FB.characterLook(c, year, opts && opts.state, opts);
    const age = look.age;
    const child = age < 13;
    const female = c.sex === 'f';
    const relGroup = FB.religionOf(c.religion).group;
    const prof = look.profession;
    const tier = look.tier;
    const loadout = opts && opts.loadout ||
      (opts && opts.state && FB.loadoutReadOnly
        ? FB.loadoutReadOnly(opts.state, c.id)
        : null);
    const headItem = itemFromLoadout(opts && opts.state, loadout, 'head');

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
    const turban = !headItem && !female && !child && relGroup === 'muslim' && prof !== 'monk';
    const veil = !headItem && female && !child && (relGroup === 'muslim' || byte(h, 3) > 150);

    ctx.clearRect(0, 0, W, H);
    // backdrop tinted by dynasty
    const bgHue = hashOf(c.dyn || c.name) % 360;
    if (!(opts && opts.transparent)) {
      ctx.fillStyle = 'hsl(' + bgHue + ',22%,20%)';
      ctx.fillRect(0, 0, W, H);
    }

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
    if (!headItem && (tonsure || (prof === 'monk' && relGroup !== 'christian'))) {
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
    if (!headItem && tier >= 6) {
      ctx.fillStyle = '#e8c455';
      const ty = (cy - headR - 1) * v;
      ctx.fillRect((32 - headR + 3) * u, ty, (2 * headR - 6) * u, 3.5 * v);
      for (let i = 0; i < 3; i++) {
        const px = (32 - 8 + i * 8) * u;
        ctx.beginPath();
        ctx.moveTo(px - 2.5 * u, ty); ctx.lineTo(px, ty - 5 * v); ctx.lineTo(px + 2.5 * u, ty);
        ctx.fill();
      }
    } else if (!headItem && tier >= 4 && !turban) {
      ctx.strokeStyle = '#e8c455'; ctx.lineWidth = 2 * v;
      ctx.beginPath();
      ctx.moveTo((32 - headR + 3) * u, (cy - headR + 3) * v);
      ctx.lineTo((32 + headR - 3) * u, (cy - headR + 3) * v);
      ctx.stroke();
    }

    if (opts && opts.state && !opts.suppressEquipment) {
      const bodyItem = itemFromLoadout(opts.state, loadout, 'body');
      const neckItem = itemFromLoadout(opts.state, loadout, 'neck');
      if (bodyItem) {
        ctx.strokeStyle = pickArt(bodyItem, ['cloths', 'leathers'], '#687069', 2);
        ctx.lineWidth = 4 * u;
        ctx.beginPath(); ctx.moveTo(12 * u, 68 * v); ctx.lineTo(52 * u, 68 * v); ctx.stroke();
      }
      if (neckItem) drawItemArt(ctx, neckItem, 32 * u, 58 * v, 0.22 * u, 0, false);
      if (headItem) drawItemArt(ctx, headItem, 32 * u, 21 * v, 0.52 * u, 0, false);
    }

    // frame
    if (!(opts && opts.transparent)) {
      ctx.strokeStyle = 'rgba(200,170,90,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    }
  };

  FB.paintItem = function (canvas, state, value) {
    if (!canvas || !value) return;
    const item = typeof value === 'object' && value.defId
      ? (FB.resolveItemSnapshot ? FB.resolveItemSnapshot(value) : null)
      : (state && FB.resolveItemReadOnly
        ? FB.resolveItemReadOnly(state, value)
        : null);
    if (!item) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const hue = byte(item.visualSeed, 8) % 360;
    const grad = ctx.createRadialGradient(W * 0.5, H * 0.42, 2, W * 0.5, H * 0.5, W * 0.7);
    grad.addColorStop(0, 'hsl(' + hue + ',18%,27%)');
    grad.addColorStop(1, '#171612');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    let artScale = Math.min(W, H) / 125;
    if (item.art && (item.art.kind === 'shield' || item.art.kind === 'book' ||
      item.art.kind === 'chest' || item.art.kind === 'jack')) artScale *= 0.9;
    drawItemArt(ctx, item, W / 2, H / 2, artScale, 0, false);
    ctx.strokeStyle = item.quality === 'masterwork' ? 'rgba(235,201,102,0.85)' :
      'rgba(200,170,90,0.35)';
    ctx.lineWidth = Math.max(1, W / 90);
    ctx.strokeRect(1, 1, W - 2, H - 2);
  };

  /* A household-only full figure. Base dress is cosmetic; exact armory
     objects are layered over it from the saved loadout or a frozen snapshot. */
  FB.paintPaperDoll = function (canvas, c, state, opts) {
    if (!canvas || !c || !state) return;
    opts = opts || {};
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const look = FB.characterLook(c, state.date.year, state, opts);
    const loadout = opts.loadout ||
      (FB.loadoutReadOnly ? FB.loadoutReadOnly(state, c.id) : {});
    const head = itemFromLoadout(state, loadout, 'head');
    const neck = itemFromLoadout(state, loadout, 'neck');
    const body = itemFromLoadout(state, loadout, 'body');
    const waist = itemFromLoadout(state, loadout, 'waist');
    const feet = itemFromLoadout(state, loadout, 'feet');
    const ring = itemFromLoadout(state, loadout, 'ring');
    const left = itemFromLoadout(state, loadout, 'leftHand');
    const right = itemFromLoadout(state, loadout, 'rightHand');
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.scale(W / 160, H / 300);

    const bg = ctx.createLinearGradient(0, 0, 0, 300);
    bg.addColorStop(0, 'hsl(' + look.hue + ',20%,22%)');
    bg.addColorStop(1, '#171612');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 160, 300);
    ctx.fillStyle = 'rgba(217,188,116,0.08)';
    ctx.beginPath(); ctx.arc(80, 87, 69, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.ellipse(80, 273, 51, 10, 0, 0, Math.PI * 2); ctx.fill();

    const bodyScale = look.child ? 0.78 : (look.age < 16 ? 0.9 : 1);
    ctx.save();
    ctx.translate(80, 276);
    ctx.scale(bodyScale, bodyScale);
    ctx.translate(-80, -276);

    // legs and simple hose
    const hose = look.tier >= 3 ? '#363b43' : '#40382f';
    ctx.strokeStyle = hose; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(68, 190); ctx.lineTo(64, 250);
    ctx.moveTo(92, 190); ctx.lineTo(96, 250); ctx.stroke();
    if (feet) {
      drawItemArt(ctx, feet, 80, 248, 0.66, 0, false);
    } else {
      ctx.strokeStyle = '#2b211b'; ctx.lineWidth = 13;
      ctx.beginPath(); ctx.moveTo(59, 257); ctx.lineTo(70, 257);
      ctx.moveTo(90, 257); ctx.lineTo(101, 257); ctx.stroke();
    }

    // rank/profession/culture clothing, independent of equipment
    const robe = look.faith === 'muslim' || look.profession === 'monk' ||
      look.profession === 'priest';
    ctx.fillStyle = look.cloth; ctx.strokeStyle = '#29221c'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(55, 113); ctx.quadraticCurveTo(80, 99, 105, 113);
    ctx.lineTo(robe ? 112 : 103, robe ? 222 : 194);
    ctx.lineTo(57, robe ? 222 : 194); ctx.lineTo(48, robe ? 222 : 194);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (look.tier >= 4) {
      ctx.strokeStyle = '#caa34b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(58, 120); ctx.quadraticCurveTo(80, 135, 102, 120); ctx.stroke();
    } else if (look.profession === 'merchant') {
      ctx.strokeStyle = '#9c875b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(62, 133); ctx.lineTo(98, 133); ctx.stroke();
    } else {
      /* A narrow culture-colored facing differentiates otherwise humble
         base dress without turning cosmetic clothing into an item slot. */
      ctx.strokeStyle = look.cultureAccent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(61, 132); ctx.lineTo(99, 132); ctx.stroke();
    }

    const skinPair = SKIN[PALE.indexOf(c.culture) >= 0 ? 0 :
      (BROWN.indexOf(c.culture) >= 0 ? 2 : (c.culture === 'nubian' ? 3 : 1))];
    const twoHanded = right && left && right.ref === left.ref && right.grip === 2;

    // One-handed poses keep the arms at the sides. A two-handed pose is
    // painted over the torso below so both sleeves can meet the shared grip.
    if (!twoHanded) {
      ctx.strokeStyle = look.cloth; ctx.lineWidth = 15; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(55, 121); ctx.lineTo(38, 198);
      ctx.moveTo(105, 121); ctx.lineTo(122, 198); ctx.stroke();
      ctx.fillStyle = skinPair[0];
      ctx.beginPath(); ctx.arc(37, 204, 8, 0, Math.PI * 2);
      ctx.arc(123, 204, 8, 0, Math.PI * 2); ctx.fill();
      ctx.lineCap = 'butt';
    }

    if (body) drawItemArt(ctx, body, 80, 151, 1.04, 0, false);
    if (waist) drawItemArt(ctx, waist, 80, 187, 0.63, 0, false);

    if (twoHanded) {
      ctx.strokeStyle = look.cloth; ctx.lineWidth = 15; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(55, 121); ctx.lineTo(67, 207);
      ctx.moveTo(105, 121); ctx.lineTo(80, 177); ctx.stroke();
      ctx.fillStyle = skinPair[0];
      ctx.beginPath(); ctx.arc(67, 207, 8, 0, Math.PI * 2);
      ctx.arc(80, 177, 8, 0, Math.PI * 2); ctx.fill();
      ctx.lineCap = 'butt';
    }

    // Reuse the compact face layer without its backdrop or item overlays.
    const face = document.createElement('canvas');
    face.width = 128; face.height = 144;
    FB.paintPortrait(face, c, state.date.year, {
      state:state,
      loadout:loadout,
      profession:look.profession,
      tier:look.tier,
      ill:c.id === state.player.charId && !!state.player.flags.ill,
      transparent:true,
      suppressEquipment:true
    });
    ctx.save();
    ctx.beginPath(); ctx.ellipse(80, 65, 34, 43, 0, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(face, 22, 8, 84, 118, 47, 20, 66, 93);
    ctx.restore();

    if (neck) drawItemArt(ctx, neck, 80, 111, 0.45, 0, false);
    if (head) drawItemArt(ctx, head, 80, 48, 1.02, 0, false);

    // The character's right hand is viewer-left; art is mirrored there.
    if (twoHanded) {
      drawItemArt(ctx, right, 86, 164, 1.34, 0.42, false);
      ctx.fillStyle = skinPair[0]; ctx.strokeStyle = skinPair[1]; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(67, 207, 6, 7, 0.42, 0, Math.PI * 2);
      ctx.ellipse(80, 177, 6, 7, 0.42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      if (right) {
        const rk = right.art && right.art.kind;
        const rs = rk === 'shield' ? 0.92 : 0.72;
        drawItemArt(ctx, right, rk === 'sword' || rk === 'seax' ? 35 : 36,
          rk === 'sword' || rk === 'seax' ? 184 : 174, rs, -0.12, true);
        if (rk === 'sword' || rk === 'seax') {
          ctx.fillStyle = skinPair[0]; ctx.strokeStyle = skinPair[1]; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(37, 204, 6, 7, -0.12, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }
      }
      if (left) {
        const lk = left.art && left.art.kind;
        const ls = lk === 'shield' ? 0.92 : 0.72;
        drawItemArt(ctx, left, lk === 'sword' || lk === 'seax' ? 125 : 124,
          lk === 'sword' || lk === 'seax' ? 184 : 174, ls, 0.12, false);
        if (lk === 'sword' || lk === 'seax') {
          ctx.fillStyle = skinPair[0]; ctx.strokeStyle = skinPair[1]; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(123, 204, 6, 7, 0.12, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }
      }
    }
    if (ring) drawItemArt(ctx, ring, 124, 205, 0.17, 0, false);

    ctx.restore();
    ctx.strokeStyle = 'rgba(200,170,90,0.45)';
    ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, 159, 299);
    ctx.restore();
  };

  /* Paint procedural canvases after a DOM render. Compact faces stay cheap;
     full figures and isolated object art appear only where explicitly asked. */
  FB.paintFaces = function (root, state) {
    if (!root || !state) return;
    const list = root.querySelectorAll('canvas.pface[data-cid]');
    for (let i = 0; i < list.length; i++) {
      const c = state.chars[list[i].getAttribute('data-cid')];
      if (!c) continue;
      const opts = {
        state:state,
        profession:c.id === state.player.charId ? state.player.profession : null,
        tier:c.id === state.player.charId ? state.player.tier : (c.station || 0),
        ill:c.id === state.player.charId && !!state.player.flags.ill
      };
      FB.paintPortrait(list[i], c, state.date.year, opts);
    }
    const dolls = root.querySelectorAll('canvas.paperdoll[data-cid]');
    for (let d = 0; d < dolls.length; d++) {
      const dc = state.chars[dolls[d].getAttribute('data-cid')];
      if (dc) FB.paintPaperDoll(dolls[d], dc, state);
    }
    const items = root.querySelectorAll('canvas.itemart[data-item]');
    for (let a = 0; a < items.length; a++) {
      FB.paintItem(items[a], state, items[a].getAttribute('data-item'));
    }
    FB.paintCrests(root); // util.js loads first; crests ride along with faces
  };

  FB.faceTag = function (c, w, h) {
    return '<canvas class="pface" data-cid="' + c.id + '" width="' + w + '" height="' + h + '"></canvas>';
  };
})();
