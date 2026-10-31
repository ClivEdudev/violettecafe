// "Build your own": burger stacker with physics-style drops, and a coffee lab that pours as you choose.
import { BUNS, FILLINGS, MAX_FILLINGS, LAB, SIZES } from './data.js';
import { LAYERS, bunTop, bunBottom, latteArt, steam, plateSVG } from './art.js';
import { $, $$, clamp, ease, reduced, esc, state, t, tf, money, on, addLine, toast, tween } from './shared.js';
import { DEFAULT_BURGER, DEFAULT_COFFEE, burgerPrice, burgerKcal, burgerPrep, burgerName, coffeePrice, coffeeName, coffeeStats, coffeeLayers, coffeeColor, } from './recipes.js';
const INK = '#2A1440';
const anim = (el, kf, o) => (el && !reduced ? el.animate(kf, o) : null);
/* =================== BURGER =================== */
const B = { bun: DEFAULT_BURGER.bun, fill: [...DEFAULT_BURGER.fill] };
const CX = 200, BASE = 412, W = 236, PX_PER_CM = 15;
const layerOf = (id) => LAYERS[id];
function stackHeight(b) { return [bunBottom(b.bun), ...b.fill.map(layerOf), bunTop(b.bun)].reduce((a, l) => a + l.h - 4, 0); }
let bScale = 1;
function renderBurger() {
    const all = [bunBottom(B.bun), ...B.fill.map(layerOf), bunTop(B.bun)];
    const H = stackHeight(B);
    bScale = Math.min(1, 360 / H);
    let y = BASE;
    const ys = [];
    const groups = all.map((l, i) => { y -= l.h - 4; ys.push(y); return `<g class="lyr" data-i="${i}"><g class="lyr-in" style="transform-origin:${CX}px ${y + l.h}px">${l.svg(y, CX, W)}</g></g>`; });
    $('#burgerSvg').innerHTML = `
    ${plateSVG(CX, BASE + 6, 172)}
    <g id="bStack" style="transform-origin:${CX}px ${BASE}px; transform: scale(${bScale})">${groups.join('')}</g>
    <g id="bCrumbs"></g>`;
    return { ys };
}
function burgerInfo() {
    const h = (stackHeight(B) / PX_PER_CM).toFixed(1).replace('.', state.lang === 'en' ? '.' : ',');
    $('#bHeight').textContent = tf('lab.height', { h });
    $('.ruler i', $('#lab')).style.height = `${Math.min(100, (stackHeight(B) * bScale) / 4.2)}%`;
    $('#bName').textContent = burgerName(B, state.lang);
    $('#bStats').textContent = `${burgerKcal(B)} ${t('card.kcal')} · ~${burgerPrep(B)} ${t('card.min')}`;
    $('#bPrice').textContent = money(burgerPrice(B));
    $('#bCount').textContent = `${B.fill.length}/${MAX_FILLINGS}`;
    $$('#fillGrid button').forEach(b => {
        const n = B.fill.filter(f => f === b.dataset.fill).length;
        const badge = $('em', b);
        badge.textContent = n ? `×${n}` : '';
        b.classList.toggle('has', n > 0);
        b.disabled = B.fill.length >= MAX_FILLINGS;
    });
    $$('#bunSeg button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.bun === B.bun)));
    $('#bUndo').disabled = !B.fill.length;
    $('#bClear').disabled = !B.fill.length;
}
function crumbs() {
    if (reduced)
        return;
    const g = $('#bCrumbs');
    const top = BASE - stackHeight(B) * bScale;
    g.innerHTML = Array.from({ length: 8 }, (_, i) => `<circle cx="${CX}" cy="${top + 30}" r="${3 + (i % 3)}" fill="${['#F4B731', '#7CB342', '#E2452F', '#E3A04C'][i % 4]}"/>`).join('');
    $$('circle', g).forEach((c, i) => {
        const a = (i / 8) * Math.PI * 2, dx = Math.cos(a) * (60 + i * 6), dy = Math.sin(a) * 30 - 30;
        c.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${dx}px, ${dy + 60}px)`, opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
    });
}
let bBusy = 0;
function addFilling(id, quiet = false) {
    if (B.fill.length >= MAX_FILLINGS) {
        toast(tf('lab.max', { n: MAX_FILLINGS }));
        return;
    }
    const h = layerOf(id).h - 4;
    B.fill.push(id);
    renderBurger();
    burgerInfo();
    const groups = $$('#bStack .lyr');
    const newG = groups[groups.length - 2], topG = groups[groups.length - 1];
    const s = 1 / bScale;
    anim(topG, [
        { transform: `translateY(${h}px)` }, { transform: `translateY(${-90 * s}px)`, offset: .3, easing: 'ease-in-out' },
        { transform: `translateY(${-90 * s}px)`, offset: .6, easing: 'cubic-bezier(.5,0,.75,0)' }, { transform: 'translateY(0)', offset: .85 },
        { transform: `translateY(${-6 * s}px)`, offset: .93 }, { transform: 'translateY(0)' },
    ], { duration: 820 });
    anim(newG, [
        { transform: `translateY(${-480 * s}px)`, opacity: 0 }, { transform: `translateY(${-480 * s}px)`, opacity: 1, offset: .25 },
        { transform: 'translateY(0)', offset: .62, easing: 'cubic-bezier(.55,0,1,.45)' }, { transform: `translateY(${-14 * s}px)`, offset: .75 },
        { transform: 'translateY(0)', offset: .85 }, { transform: 'translateY(0)' },
    ], { duration: 820 });
    anim($('.lyr-in', newG), [{ transform: 'scale(1,1)' }, { transform: 'scale(1,1)', offset: .6 }, { transform: 'scale(1.08,.8)', offset: .66 }, { transform: 'scale(.97,1.05)', offset: .78 }, { transform: 'scale(1,1)' }], { duration: 820 });
    if (!quiet)
        setTimeout(crumbs, 500);
    const btn = $(`#fillGrid [data-fill="${id}"]`);
    anim(btn, [{ transform: 'scale(1)' }, { transform: 'scale(.92)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 300 });
}
function removeLast() {
    if (!B.fill.length)
        return;
    const groups = $$('#bStack .lyr');
    const g = groups[groups.length - 2];
    const done = () => { B.fill.pop(); renderBurger(); burgerInfo(); };
    if (reduced || !g)
        return done();
    bBusy++;
    const a = g.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${260}px, -140px) rotate(28deg)`, opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.4,0,.8,.4)', fill: 'forwards' });
    a.onfinish = () => { bBusy--; done(); };
}
function clearAll() {
    if (!B.fill.length)
        return;
    const groups = $$('#bStack .lyr').slice(1, -1);
    const done = () => { B.fill = []; renderBurger(); burgerInfo(); };
    if (reduced)
        return done();
    groups.forEach((g, i) => g.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${(i % 2 ? -1 : 1) * (200 + i * 20)}px, ${-120 - i * 20}px) rotate(${(i % 2 ? -1 : 1) * 40}deg)`, opacity: 0 }], { duration: 480, delay: i * 30, easing: 'cubic-bezier(.4,0,.8,.4)', fill: 'forwards' }));
    setTimeout(done, 480 + groups.length * 30);
}
let randTimers = [];
function randomBurger() {
    randTimers.forEach(clearTimeout);
    randTimers = [];
    const proteins = ['beef', 'chicken'];
    const pool = FILLINGS.map(f => f.id).filter(f => !proteins.includes(f));
    const pick = [proteins[Math.floor(Math.random() * 2)]];
    if (Math.random() < .35)
        pick.push(Math.random() < .5 ? 'beef' : 'chicken');
    const extra = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < extra; i++)
        pick.push(pool[Math.floor(Math.random() * pool.length)]);
    pick.sort((a, b) => (a === 'sauce' || a === 'ketchup' ? -1 : 0) - (b === 'sauce' || b === 'ketchup' ? -1 : 0));
    B.bun = BUNS[Math.floor(Math.random() * BUNS.length)].id;
    B.fill = [];
    renderBurger();
    burgerInfo();
    pick.slice(0, MAX_FILLINGS).forEach((f, i) => randTimers.push(window.setTimeout(() => addFilling(f, i < pick.length - 1), reduced ? 0 : i * 340)));
}
function miniLayer(id) {
    const l = layerOf(id);
    return `<svg viewBox="62 ${-8} 276 ${l.h + 16}" aria-hidden="true">${l.svg(0, 200, 240)}</svg>`;
}
function renderBurgerControls() {
    $('#bunSeg').innerHTML = BUNS.map(b => `<button type="button" role="radio" data-bun="${b.id}" aria-checked="${B.bun === b.id}"><i class="bun-dot bun-${b.id}"></i>${esc(b.name[state.lang])}</button>`).join('');
    $('#fillGrid').innerHTML = FILLINGS.map(f => `<button type="button" data-fill="${f.id}">${miniLayer(f.id)}<span>${esc(f.name[state.lang])}</span><small>+${money(f.price)}</small><em></em></button>`).join('');
    burgerInfo();
}
function initBurger() {
    renderBurger();
    renderBurgerControls();
    $('#fillGrid').addEventListener('click', e => { const b = e.target.closest('[data-fill]'); if (b && !b.disabled)
        addFilling(b.dataset.fill); });
    $('#bunSeg').addEventListener('click', e => {
        const b = e.target.closest('[data-bun]');
        if (!b || b.dataset.bun === B.bun)
            return;
        B.bun = b.dataset.bun;
        renderBurger();
        burgerInfo();
        const g = $$('#bStack .lyr');
        [g[0], g[g.length - 1]].forEach(x => anim($('.lyr-in', x), [{ transform: 'scale(1,1)' }, { transform: 'scale(1.1,.86)' }, { transform: 'scale(.97,1.04)' }, { transform: 'scale(1,1)' }], { duration: 420 }));
    });
    $('#bUndo').addEventListener('click', () => { if (!bBusy)
        removeLast(); });
    $('#bClear').addEventListener('click', clearAll);
    $('#bRandom').addEventListener('click', randomBurger);
    $('#bAdd').addEventListener('click', () => {
        if (!B.fill.length) {
            toast(t('lab.empty'));
            return;
        }
        addLine({ kind: 'burger', burger: { bun: B.bun, fill: [...B.fill] } }, 1, $('#burgerSvg'));
        toast(t('lab.added'));
    });
}
/* =================== COFFEE =================== */
const C = { ...DEFAULT_COFFEE };
const G = { cx: 200, top: 128, bot: 412, wt: 210, wb: 168 };
const cur = { syrup: 0, milk: 0, coffee: 0, foam: 0 };
let stopPour = null;
const sizeK = () => ({ S: .8, M: .9, L: 1 }[C.size]);
function vessel() {
    const k = sizeK();
    const top = G.bot - (G.bot - G.top) * k, wt = G.wt * (.85 + .15 * k), wb = G.wb * (.85 + .15 * k);
    return { top, wt, wb, path: `M${G.cx - wt / 2} ${top} L${G.cx - wb / 2} ${G.bot - 6} Q${G.cx} ${G.bot + 8} ${G.cx + wb / 2} ${G.bot - 6} L${G.cx + wt / 2} ${top}z` };
}
function buildCup() {
    const v = vessel(), iced = C.temp === 'iced';
    const L = G.cx - v.wt / 2, R = G.cx + v.wt / 2, bl = G.cx - v.wb / 2, br = G.cx + v.wb / 2;
    const hp = `M${R - 8} ${v.top + 46} c 74 -8, 78 126, -6 ${136}`;
    const handle = iced ? '' : `<path d="${hp}" fill="none" stroke="rgba(42,20,64,.22)" stroke-width="24" stroke-linecap="round"/><path d="${hp}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="20" stroke-linecap="round"/><path d="${hp}" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="4" stroke-linecap="round" transform="translate(-3 -3)"/>`;
    const drops = iced ? Array.from({ length: 26 }, (_, i) => { const f = ((i * 37) % 100) / 100, yy = v.top + 40 + ((i * 53) % 100) / 100 * (G.bot - v.top - 70); const x = bl + (L - bl) * (1 - (yy - v.top) / (G.bot - v.top)) + 8 + f * (v.wb + (v.wt - v.wb) * (1 - (yy - v.top) / (G.bot - v.top)) - 16); const r = 1.6 + (i % 4) * .9; return `<circle cx="${x}" cy="${yy}" r="${r}" fill="rgba(255,255,255,.55)"/><circle cx="${x - r * .3}" cy="${yy - r * .3}" r="${r * .35}" fill="#fff"/>`; }).join('') : '';
    const lid = iced ? `<path d="M${L - 10} ${v.top} Q${L} ${v.top - 66} ${G.cx} ${v.top - 70} Q${R} ${v.top - 66} ${R + 10} ${v.top}z" fill="rgba(255,255,255,.22)" stroke="rgba(255,255,255,.75)" stroke-width="2.5"/>
     <path d="M${L + 18} ${v.top - 18} Q${L + 30} ${v.top - 52} ${G.cx - 20} ${v.top - 58}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>
     <rect x="${L - 12}" y="${v.top - 6}" width="${v.wt + 24}" height="12" rx="6" fill="rgba(255,255,255,.55)" stroke="rgba(42,20,64,.25)"/>
     <path d="M${G.cx + 26} ${G.bot - 70} L${G.cx + 64} ${v.top - 140}" stroke="url(#g-straw)" stroke-width="15" stroke-linecap="round"/>
     <path d="M${G.cx + 26} ${G.bot - 70} L${G.cx + 64} ${v.top - 140}" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-dasharray="10 14" opacity=".55"/>` : '';
    $('#cupSvg').innerHTML = `
    <defs><clipPath id="cupClip"><path d="${v.path}"/></clipPath></defs>
    ${iced ? `<ellipse cx="${G.cx}" cy="${G.bot + 14}" rx="${v.wb * .75}" ry="12" fill="#1a0a24" opacity=".25" filter="url(#fx-steam)"/>` : plateSVG(G.cx, G.bot + 10, v.wb * .95 + 48)}
    ${handle}
    <rect id="cStream" x="${G.cx - 7}" y="-10" width="14" height="0" rx="7"/>
    <path d="${v.path}" fill="rgba(255,255,255,.18)"/>
    <g clip-path="url(#cupClip)">
      <g filter="url(#fx-mix)"><rect id="cSyrupR" x="0" width="400"/><rect id="cMilkR" x="0" width="400"/><rect id="cCoffeeR" x="0" width="400"/></g>
      <rect id="cFoamR" x="0" width="400" fill="url(#g-foam)" filter="url(#fx-foam)"/>
      <rect id="cShade" x="${bl - 30}" width="${v.wt + 60}" fill="url(#g-shade)"/>
      <g id="cIce"></g>
    </g>
    <g id="cSurface"></g>
    <path d="${v.path}" fill="url(#g-glass)"/>
    <path d="${v.path}" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="3" stroke-linejoin="round"/>
    <path d="${v.path}" fill="none" stroke="rgba(42,20,64,.28)" stroke-width="1.4" stroke-linejoin="round" transform="translate(0 1.5)"/>
    <path d="M${L + 16} ${v.top + 30} L${bl + 12} ${G.bot - 46}" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".45"/>
    <path d="M${L + 34} ${v.top + 40} L${bl + 26} ${G.bot - 120}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>
    <path d="M${R - 18} ${v.top + 50} L${br - 12} ${G.bot - 60}" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".28"/>
    <ellipse cx="${G.cx}" cy="${G.bot - 6}" rx="${v.wb / 2 - 4}" ry="9" fill="rgba(255,255,255,.35)"/>
    <g id="cTopping"></g>
    ${drops}
    <ellipse cx="${G.cx}" cy="${v.top}" rx="${v.wt / 2}" ry="10" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="3"/>
    <ellipse cx="${G.cx}" cy="${v.top}" rx="${v.wt / 2}" ry="10" fill="none" stroke="rgba(42,20,64,.2)" stroke-width="1.2" transform="translate(0 2)"/>
    ${lid}
    <g id="cSteam" opacity="${iced ? 0 : .85}" filter="url(#fx-steam)">${steam(G.cx, v.top - 30, 1.5).replace(/stroke="#9D7BD1"/, 'stroke="#FFFFFF"')}</g>`;
    if (iced)
        dropIce(false);
}
function dropIce(animate) {
    const v = vessel();
    const g = $('#cIce');
    if (!g)
        return;
    const cubes = [[-48, .2], [24, .28], [-10, .46], [42, .56], [-40, .68]];
    g.innerHTML = cubes.map(([x, f], i) => {
        const y = v.top + (G.bot - v.top) * f, cx = G.cx + x;
        return `<g class="ice" transform="rotate(${i * 21 - 30} ${cx} ${y + 22})">
      <rect x="${cx - 25}" y="${y}" width="50" height="46" rx="11" fill="rgba(255,255,255,.28)" stroke="rgba(255,255,255,.8)" stroke-width="2"/>
      <rect x="${cx - 17}" y="${y + 7}" width="22" height="14" rx="5" fill="rgba(255,255,255,.55)"/>
      <path d="M${cx + 14} ${y + 10} v24" stroke="rgba(255,255,255,.7)" stroke-width="2.5" stroke-linecap="round"/></g>`;
    }).join('');
    if (animate)
        $$('.ice', g).forEach((r, i) => anim(r, [{ translate: '0 -420px' }, { translate: '0 0', offset: .7, easing: 'cubic-bezier(.55,0,1,.45)' }, { translate: '0 -14px', offset: .85 }, { translate: '0 0' }], { duration: 640, delay: i * 70, fill: 'backwards' }));
}
function paintLiquid() {
    const v = vessel(), H = G.bot - v.top - 12;
    const floor = G.bot + 6;
    let y = floor;
    const set = (id, frac, fill) => { const h = H * frac; y -= h; const r = $('#' + id); r.setAttribute('y', String(y)); r.setAttribute('height', String(Math.max(0, h + (h > .5 ? 2 : 0)))); r.setAttribute('fill', fill); return y; };
    const milkC = LAB.milkC[C.milk] ?? '#F6EFE6';
    set('cSyrupR', cur.syrup, LAB.syrupC[C.syrup] ?? '#B79AD8');
    set('cMilkR', cur.milk, milkC);
    const yC = set('cCoffeeR', cur.coffee, C.milk === 'none' ? coffeeColor(C) : '#8A5A38');
    const yF = set('cFoamR', cur.foam, 'url(#g-foam)');
    const shade = $('#cShade');
    shade.setAttribute('y', String(yF));
    shade.setAttribute('height', String(Math.max(0, floor - yF)));
    const surf = yF;
    const s = $('#cSurface');
    const iced = C.temp === 'iced';
    const showTop = !iced && surf < floor - 6;
    const rx = (v.wb + (v.wt - v.wb) * ((G.bot - surf) / (G.bot - v.top))) / 2 - 5;
    const ry = Math.max(4, rx * .14);
    const foamy = cur.foam > .005;
    const topCol = foamy ? '#F7EBDD' : C.milk === 'none' ? '#5A321D' : '#B07A50';
    s.innerHTML = showTop ? `<ellipse cx="${G.cx}" cy="${surf}" rx="${rx}" ry="${ry}" fill="${topCol}"${foamy ? ' filter="url(#fx-foam)"' : ''}/>
    ${!foamy && C.milk === 'none' ? `<ellipse cx="${G.cx}" cy="${surf}" rx="${rx * .92}" ry="${ry * .8}" fill="#B9773F" opacity=".55"/>` : ''}
    <ellipse cx="${G.cx}" cy="${surf}" rx="${rx}" ry="${ry}" fill="none" stroke="#7A4B30" stroke-opacity=".35" stroke-width="2.5"/>
    ${cur.foam > .02 ? `<g transform="translate(0 ${surf}) scale(1 .3) translate(0 ${-surf})" opacity=".9">${latteArt(C.foam === 'thick' ? 'heart' : 'rosetta', G.cx, surf, 2.2, '#C08A5C')}</g>` : ''}
    <ellipse cx="${G.cx - rx * .4}" cy="${surf - ry * .3}" rx="${rx * .3}" ry="${ry * .25}" fill="#fff" opacity=".35"/>` : '';
    void yC;
    const tp = $('#cTopping');
    const ty = iced ? v.top - 8 : surf;
    if (C.topping === 'cream')
        tp.innerHTML = `<g filter="url(#fx-soft)"><path d="M${G.cx - 74} ${ty + 4} q-10 -30 24 -38 q2 -34 40 -30 q20 -24 40 0 q38 -4 40 30 q34 8 24 38z" fill="url(#g-cream)"/></g>
      <path d="M${G.cx - 50} ${ty - 14} q30 -14 60 -4 M${G.cx - 30} ${ty - 36} q22 -10 44 0 M${G.cx - 4} ${ty - 54} q8 -8 16 0" fill="none" stroke="#E2CDB0" stroke-width="2.4" stroke-linecap="round"/>
      <ellipse cx="${G.cx - 24}" cy="${ty - 40}" rx="12" ry="5" fill="#fff" opacity=".9"/>`;
    else if (C.topping === 'cocoa' || C.topping === 'cinnamon')
        tp.innerHTML = Array.from({ length: 46 }, (_, i) => `<circle cx="${G.cx - rx * .85 + ((i * 37) % 100) / 100 * rx * 1.7}" cy="${ty - 4 + ((i * 13) % 9)}" r="${1 + (i % 3) * .7}" fill="${C.topping === 'cocoa' ? '#3A1F14' : '#8A4B1F'}" opacity=".85"/>`).join('');
    else
        tp.innerHTML = '';
    return surf;
}
function pourTo(target) {
    stopPour?.();
    const from = { ...cur };
    const changed = Object.keys(target).filter(k => Math.abs(target[k] - from[k]) > .004);
    const streamColor = changed.includes('coffee') ? '#5A3220' : changed.includes('milk') ? (LAB.milkC[C.milk] ?? '#fff') : changed.includes('syrup') ? (LAB.syrupC[C.syrup] ?? '#B79AD8') : '#F4E9DC';
    const rising = changed.some(k => target[k] > from[k]);
    const stream = $('#cStream');
    stream.setAttribute('fill', streamColor);
    stopPour = tween(rising ? 700 : 420, k => {
        const e = ease(k);
        Object.keys(cur).forEach(key => { cur[key] = from[key] + (target[key] - from[key]) * e; });
        const surf = paintLiquid();
        const on = rising && k < .92;
        stream.setAttribute('height', on ? String(Math.max(0, surf + 2)) : '0');
        stream.setAttribute('width', on ? String(12 + Math.sin(k * 40) * 2) : '0');
    }, () => { stream.setAttribute('height', '0'); stopPour = null; });
}
function segHTML(name, opts, cur, label) {
    return opts.map(o => `<button type="button" role="radio" data-${name}="${o}" aria-checked="${o === cur}">${label(o)}</button>`).join('');
}
function renderCoffeeControls() {
    $('#cTemp').innerHTML = segHTML('temp', ['hot', 'iced'], C.temp, o => t('lab.temp.' + o));
    $('#cSize').innerHTML = segHTML('size', SIZES.map(s => s.id), C.size, o => `${o}<small>${SIZES.find(s => s.id === o).ml}</small>`);
    $('#cMilk').innerHTML = segHTML('milk', LAB.milks, C.milk, o => t('milk.' + o));
    $('#cFoam').innerHTML = segHTML('foam', ['none', 'thin', 'thick'], C.foam, o => t('foam.' + o));
    $('#cSyrup').innerHTML = segHTML('syrup', LAB.syrups, C.syrup, o => `${o !== 'none' ? `<i class="sw" style="--c:${LAB.syrupC[o]}"></i>` : ''}${t('syrup.' + o)}`);
    $('#cTop').innerHTML = segHTML('top', LAB.toppings, C.topping, o => t('top.' + o));
    $('output', $('#cShots')).textContent = String(C.shots);
    const amt = $('#cMilkAmt');
    amt.value = String(C.milkAmt);
    $('#cMilkAmtOut').textContent = `${C.milkAmt}%`;
    $('#cMilkAmtWrap').classList.toggle('off', C.milk === 'none');
    amt.disabled = C.milk === 'none';
    const foamOff = C.temp === 'iced' || C.milk === 'none';
    $('#cFoam').classList.toggle('off', foamOff);
    $$('#cFoam button').forEach(b => (b.disabled = foamOff));
    $('#cFoamH').classList.toggle('off', foamOff);
    coffeeInfo();
}
function coffeeInfo() {
    const st = coffeeStats(C);
    $('#cName').textContent = coffeeName(C, state.lang);
    $('#cStats').textContent = `${SIZES.find(s => s.id === C.size).ml} ml · ${st.kcal} ${t('card.kcal')}`;
    $('#cPrice').textContent = money(coffeePrice(C));
    $('#mStrength').style.width = st.strength + '%';
    $('#mSweet').style.width = st.sweet + '%';
}
function initCoffee() {
    buildCup();
    renderCoffeeControls();
    Object.assign(cur, { syrup: 0, milk: 0, coffee: 0, foam: 0 });
    paintLiquid();
    let poured = false;
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting && !poured) {
        poured = true;
        pourTo(coffeeLayers(C));
    } }, { threshold: .3 });
    io.observe($('#cupSvg'));
    const ctl = $('#coffeeLab .lab-controls');
    ctl.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b || b.disabled)
            return;
        const d = b.dataset;
        let rebuild = false, ice = false;
        if (d.temp) {
            if (C.temp === d.temp)
                return;
            C.temp = d.temp;
            rebuild = true;
            ice = C.temp === 'iced';
        }
        else if (d.size) {
            if (C.size === d.size)
                return;
            C.size = d.size;
            rebuild = true;
        }
        else if (d.milk)
            C.milk = d.milk;
        else if (d.foam)
            C.foam = d.foam;
        else if (d.syrup)
            C.syrup = d.syrup;
        else if (d.top)
            C.topping = d.top;
        else if (d.d && b.closest('#cShots'))
            C.shots = clamp(C.shots + Number(d.d), 1, 3);
        else if (b.id === 'cAdd') {
            addLine({ kind: 'coffee', coffee: { ...C } }, 1, $('#cupSvg'));
            toast(t('lab.added'));
            return;
        }
        else
            return;
        const sel = Object.keys(d)[0], val = d[sel];
        if (rebuild) {
            stopPour?.();
            buildCup();
            if (ice)
                dropIce(true);
            paintLiquid();
        }
        renderCoffeeControls();
        if (sel && val && !b.closest('#cShots'))
            $(`#coffeeLab [data-${sel}="${val}"]`)?.focus();
        pourTo(coffeeLayers(C));
        if (d.top === 'cream')
            anim($('#cTopping path'), [{ transform: 'translateY(-60px) scale(.6)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.3,1.4,.6,1)' });
    });
    $('#cMilkAmt').addEventListener('input', e => { C.milkAmt = Number(e.target.value); $('#cMilkAmtOut').textContent = `${C.milkAmt}%`; coffeeInfo(); pourTo(coffeeLayers(C)); });
}
/* =================== tabs =================== */
function initTabs() {
    const tabs = [$('#tabBurger'), $('#tabCoffee')];
    const select = (i) => {
        tabs.forEach((tb, k) => { tb.setAttribute('aria-selected', String(k === i)); tb.tabIndex = k === i ? 0 : -1; $('#' + tb.getAttribute('aria-controls')).hidden = k !== i; });
        if (i === 1) {
            cur.syrup = cur.milk = cur.coffee = cur.foam = 0;
            paintLiquid();
            setTimeout(() => pourTo(coffeeLayers(C)), 120);
        }
    };
    tabs.forEach((tb, i) => {
        tb.addEventListener('click', () => select(i));
        tb.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const n = (i + 1) % 2;
            select(n);
            tabs[n].focus();
        } });
    });
    select(0);
}
export function initLab() {
    initBurger();
    initCoffee();
    initTabs();
    on('lang', () => { renderBurgerControls(); renderCoffeeControls(); });
}
