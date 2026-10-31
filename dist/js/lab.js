// "Build your own": burger stacker with physics-style drops, and a coffee lab that pours as you choose.
import { BUNS, FILLINGS, MAX_FILLINGS, LAB, SIZES } from './data.js';
import { LAYERS, bunTop, bunBottom, latteArt, steam } from './art.js';
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
    <ellipse cx="${CX}" cy="${BASE + 14}" rx="170" ry="22" fill="${INK}" opacity=".12"/>
    <ellipse class="plate" cx="${CX}" cy="${BASE + 4}" rx="166" ry="24"/>
    <ellipse cx="${CX}" cy="${BASE}" rx="120" ry="12" fill="var(--plate-in)"/>
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
    const handle = iced ? '' : `<path d="M${G.cx + v.wt / 2 - 10} ${v.top + 50} c 70 -6, 74 120, -8 ${130}" fill="none" stroke="${INK}" stroke-width="22" stroke-linecap="round"/><path d="M${G.cx + v.wt / 2 - 10} ${v.top + 50} c 70 -6, 74 120, -8 ${130}" fill="none" stroke="var(--glass-handle)" stroke-width="12" stroke-linecap="round"/>`;
    const lid = iced ? `<path id="cLid" d="M${G.cx - v.wt / 2 - 10} ${v.top} Q${G.cx - v.wt / 2} ${v.top - 70} ${G.cx} ${v.top - 72} Q${G.cx + v.wt / 2} ${v.top - 70} ${G.cx + v.wt / 2 + 10} ${v.top}z" fill="#fff" fill-opacity=".35" stroke="${INK}" stroke-width="4"/>
     <path d="M${G.cx + 26} ${G.bot - 70} L${G.cx + 64} ${v.top - 140}" stroke="${INK}" stroke-width="20" stroke-linecap="round"/><path d="M${G.cx + 26} ${G.bot - 70} L${G.cx + 64} ${v.top - 140}" stroke="#F4B731" stroke-width="12" stroke-linecap="round"/>` : '';
    $('#cupSvg').innerHTML = `
    <defs><clipPath id="cupClip"><path d="${v.path}"/></clipPath></defs>
    <ellipse cx="${G.cx}" cy="${G.bot + 18}" rx="${v.wb * .9}" ry="16" fill="${INK}" opacity=".12"/>
    ${iced ? '' : `<ellipse class="plate" cx="${G.cx}" cy="${G.bot + 8}" rx="${v.wb * .95 + 40}" ry="24"/>`}
    ${handle}
    <rect id="cStream" x="${G.cx - 7}" y="-10" width="14" height="0" rx="7"/>
    <path d="${v.path}" fill="var(--glass)"/>
    <g clip-path="url(#cupClip)">
      <rect id="cSyrupR" x="0" width="400"/><rect id="cMilkR" x="0" width="400"/><rect id="cCoffeeR" x="0" width="400"/><rect id="cFoamR" x="0" width="400" fill="#F4E9DC"/>
      <path id="cBlend1" fill="none" stroke-width="10" opacity=".55"/><path id="cBlend2" fill="none" stroke-width="10" opacity=".55"/>
      <g id="cIce"></g>
    </g>
    <g id="cSurface"></g>
    <g id="cTopping"></g>
    <path d="${v.path}" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M${G.cx - v.wt / 2 + 20} ${v.top + 34} L${G.cx - v.wb / 2 + 14} ${G.bot - 50}" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".5"/>
    <ellipse cx="${G.cx}" cy="${v.top}" rx="${v.wt / 2}" ry="10" fill="none" stroke="${INK}" stroke-width="4"/>
    ${lid}
    <g id="cSteam" opacity="${iced ? 0 : .9}">${steam(G.cx, v.top - (iced ? 80 : 30), 1.2)}</g>`;
    if (iced)
        dropIce(false);
}
function dropIce(animate) {
    const v = vessel();
    const g = $('#cIce');
    if (!g)
        return;
    const cubes = [[-48, .22], [22, .3], [-12, .5], [40, .58], [-40, .7]];
    g.innerHTML = cubes.map(([x, f], i) => { const y = v.top + (G.bot - v.top) * f; return `<rect class="ice" x="${G.cx + x - 24}" y="${y}" width="48" height="44" rx="10" fill="#fff" fill-opacity=".5" stroke="#fff" stroke-width="3" transform="rotate(${i * 21 - 30} ${G.cx + x} ${y + 22})"/>`; }).join('');
    if (animate)
        $$('rect', g).forEach((r, i) => anim(r, [{ transform: 'translateY(-420px)' }, { transform: 'translateY(0)', offset: .7, easing: 'cubic-bezier(.55,0,1,.45)' }, { transform: 'translateY(-14px)', offset: .85 }, { transform: 'translateY(0)' }], { duration: 640, delay: i * 70, fill: 'backwards' }));
}
function paintLiquid() {
    const v = vessel(), H = G.bot - v.top - 12;
    const floor = G.bot + 6;
    let y = floor;
    const set = (id, frac, fill) => { const h = H * frac; y -= h; const r = $('#' + id); r.setAttribute('y', String(y)); r.setAttribute('height', String(Math.max(0, h + (h > .5 ? 2 : 0)))); r.setAttribute('fill', fill); return y; };
    const milkC = LAB.milkC[C.milk] ?? '#F6EFE6';
    const yS = set('cSyrupR', cur.syrup, LAB.syrupC[C.syrup] ?? '#B79AD8');
    const yM = set('cMilkR', cur.milk, milkC);
    const yC = set('cCoffeeR', cur.coffee, C.milk === 'none' ? coffeeColor(C) : '#9A6A45');
    const yF = set('cFoamR', cur.foam, '#F4E9DC');
    const wave = (yy) => `M0 ${yy} ${Array.from({ length: 14 }, (_, i) => `q15 ${i % 2 ? -6 : 6} 30 0`).join(' ')}`;
    const b1 = $('#cBlend1'), b2 = $('#cBlend2');
    b1.setAttribute('d', cur.syrup > .01 && cur.milk > .01 ? wave(yS) : '');
    b1.setAttribute('stroke', LAB.syrupC[C.syrup] ?? '#B79AD8');
    b2.setAttribute('d', cur.milk > .01 && cur.coffee > .01 ? wave(yM) : '');
    b2.setAttribute('stroke', '#C69C72');
    const surf = yF;
    const s = $('#cSurface');
    const iced = C.temp === 'iced';
    const showTop = !iced && surf < floor - 6;
    const rx = (v.wb + (v.wt - v.wb) * ((G.bot - surf) / (G.bot - v.top))) / 2 - 6;
    const topCol = cur.foam > .005 ? '#F4E9DC' : C.milk === 'none' ? '#7A4B30' : '#C69C72';
    s.innerHTML = showTop ? `<ellipse cx="${G.cx}" cy="${surf}" rx="${rx}" ry="${Math.max(4, rx * .14)}" fill="${topCol}" stroke="${cur.coffee > .01 ? '#9A6A45' : 'none'}" stroke-width="3"/>${cur.foam > .02 ? `<g transform="translate(0 ${surf}) scale(1 .3) translate(0 ${-surf})">${latteArt(C.foam === 'thick' ? 'heart' : 'rosetta', G.cx, surf, 2.2, '#C69C72')}</g>` : ''}` : '';
    const tp = $('#cTopping');
    const ty = iced ? v.top - 8 : surf;
    if (C.topping === 'cream')
        tp.innerHTML = `<path d="M${G.cx - 70} ${ty + 4} q-8 -34 28 -40 q6 -34 42 -28 q36 -8 40 28 q36 6 28 40z" fill="#FFF9F2" stroke="${INK}" stroke-width="4"/>`;
    else if (C.topping === 'cocoa' || C.topping === 'cinnamon')
        tp.innerHTML = Array.from({ length: 22 }, (_, i) => `<circle cx="${G.cx - rx * .8 + ((i * 37) % 100) / 100 * rx * 1.6}" cy="${ty - 3 + ((i * 13) % 8)}" r="2.6" fill="${C.topping === 'cocoa' ? '#3A1F14' : '#9A5A2A'}"/>`).join('');
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
