// "Build your own", part two: a shawarma station (open lavash or pita seen from above; it rolls itself up when it goes
// to the cart) and a hot-dog station (side view: bun, sausage, toppings, sauces). Same rules as the burger: every choice
// redraws the food, the name, price, calories and prep time at once.
import { BUNS, WRAP_BASES, WRAP_MEATS, WRAP_ADDS, WRAP_SAUCES, HD_SAUSAGES, HD_TOPS, HD_SAUCES, HD_XL, MAX_WRAP_ADDS, MAX_SAUCES, MAX_HD_TOPS } from './data.js';
import { wrapTopSVG, wrapRolledSVG, hotdogSVG, plateSVG } from './art.js';
import { $, $$, reduced, esc, state, t, tf, money, on, addLine, toast } from './shared.js';
import { DEFAULT_WRAP, DEFAULT_HOTDOG, wrapPrice, wrapKcal, wrapPrep, wrapName, hotdogPrice, hotdogKcal, hotdogPrep, hotdogName } from './recipes.js';
const anim = (el, kf, o) => (el && !reduced ? el.animate(kf, o) : null);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
const toggle = (arr, id) => (arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
/** Pieces of a part fall onto the food one after another. */
function drop(g, from = -260) {
    if (!g || reduced)
        return;
    Array.from(g.children).forEach((c, i) => {
        const pathLen = c instanceof SVGPathElement ? c.getTotalLength() : 0;
        if (c.tagName === 'path' && pathLen > 60) { // sauce lines draw themselves
            c.style.strokeDasharray = `${pathLen}`;
            c.animate([{ strokeDashoffset: pathLen }, { strokeDashoffset: 0 }], { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)' }).onfinish = () => { c.style.strokeDasharray = ''; };
            return;
        }
        c.animate([{ transform: `translate(0, ${from}px)`, opacity: 0 }, { transform: `translate(0, ${from}px)`, opacity: 1, offset: .15 }, { transform: 'translate(0, 0)', offset: .72, easing: 'cubic-bezier(.5,0,1,.5)' }, { transform: 'translate(0, -8px)', offset: .84 }, { transform: 'translate(0, 0)' }], { duration: 620, delay: i * 28, easing: 'linear', fill: 'backwards' });
    });
}
/** Pieces of a part are flicked off before it's removed. */
function flick(g, done) {
    if (!g || reduced) {
        done();
        return;
    }
    const kids = Array.from(g.children);
    kids.forEach((c, i) => c.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${(i % 2 ? -1 : 1) * (180 + i * 6)}px, -120px) rotate(${(i % 2 ? -1 : 1) * 70}deg)`, opacity: 0 }], { duration: 360, delay: i * 8, easing: 'cubic-bezier(.4,0,.8,.4)', fill: 'forwards' }));
    setTimeout(done, 360 + kids.length * 8);
}
const groupOf = (svg, part) => $(svg).querySelector(`[data-part="${part}"]`);
/* chips: mini drawing + name + price; the art comes from the same piece drawings as the food */
function chipArt(kind, id, c) {
    if (kind === 'sauce')
        return `<svg viewBox="-32 -14 64 28" aria-hidden="true"><path d="M-26 0 l6 -7 l6 7 l6 -7 l6 7 l6 -7 l6 7 l6 -7 l6 7" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M-26 0 l6 -7 l6 7 l6 -7 l6 7" stroke="#fff" stroke-width="1.4" fill="none" opacity=".5"/></svg>`;
    const w = { base: 'lavash', meat: 'chicken', double: false, add: [id], sauces: [] };
    const h = { bun: 'classic', sausage: 'beef', xl: false, tops: [id], sauces: [] };
    const src = kind === 'wrap' ? wrapTopSVG(w) : hotdogSVG(h);
    const m = src.match(new RegExp(`<g data-part="${kind === 'wrap' ? 'add' : 'top'}:${id}"[^>]*>([\\s\\S]*?)</g>(?=<g data-part|$)`));
    const vb = kind === 'wrap' ? '96 240 208 100' : '60 166 280 40';
    return `<svg viewBox="${vb}" aria-hidden="true" preserveAspectRatio="xMidYMid meet">${m ? m[0] : ''}</svg>`;
}
const chips = (list, kind, attr) => list.map(p => `<button type="button" data-${attr}="${p.id}" aria-pressed="false">${chipArt(kind, p.id, p.c)}<span>${esc(p.name[state.lang])}</span><small>+${money(p.price)}</small><em></em></button>`).join('');
const radios = (list, attr, cur, extra = () => '') => list.map(p => `<button type="button" role="radio" data-${attr}="${p.id}" aria-checked="${p.id === cur}">${extra(p.id)}${esc(p.name[state.lang])}</button>`).join('');
function syncPressed(grid, attr, sel, max) {
    $$(`${grid} [data-${attr}]`).forEach(b => { const on = sel.includes(b.dataset[attr]); b.setAttribute('aria-pressed', String(on)); b.classList.toggle('has', on); $('em', b).textContent = on ? '✓' : ''; b.disabled = !on && sel.length >= max; });
}
/* =================== SHAWARMA =================== */
const W = { ...DEFAULT_WRAP, add: [...DEFAULT_WRAP.add], sauces: [...DEFAULT_WRAP.sauces] };
let rolling = false;
function renderWrap() {
    $('#wrapSvg').innerHTML = `<g id="wTop"><g transform="translate(200 262) scale(.88) translate(-200 -262)">${wrapTopSVG(W, 200, 262)}</g></g><g id="wRoll" opacity="0">${wrapRolledSVG(W, 200, 270, 300)}</g>`;
}
function wrapInfo() {
    $('#wName').textContent = wrapName(W, state.lang);
    $('#wStats').textContent = `${wrapKcal(W)} ${t('card.kcal')} · ~${wrapPrep(W)} ${t('card.min')}`;
    $('#wPrice').textContent = money(wrapPrice(W));
    $('#wCount').textContent = `${W.add.length}/${MAX_WRAP_ADDS}`;
    $('#wSCount').textContent = `${W.sauces.length}/${MAX_SAUCES}`;
    $$('#wBase [data-wbase]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.wbase === W.base)));
    $$('#wMeat [data-wmeat]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.wmeat === W.meat)));
    $$('#wDouble [data-wdbl]').forEach(b => b.setAttribute('aria-checked', String((b.dataset.wdbl === '1') === W.double)));
    const m = WRAP_MEATS.find(x => x.id === W.meat);
    $('#wDouble [data-wdbl="1"] small').textContent = `+${money(m.dbl)}`;
    syncPressed('#wAdds', 'wadd', W.add, MAX_WRAP_ADDS);
    syncPressed('#wSauces', 'wsauce', W.sauces, MAX_SAUCES);
}
function renderWrapControls() {
    $('#wBase').innerHTML = radios(WRAP_BASES, 'wbase', W.base, id => `<i class="sw" style="--c:${WRAP_BASES.find(b => b.id === id).c}"></i>`);
    $('#wMeat').innerHTML = radios(WRAP_MEATS, 'wmeat', W.meat, id => `<i class="sw" style="--c:${WRAP_MEATS.find(b => b.id === id).c}"></i>`);
    $('#wDouble').innerHTML = `<button type="button" role="radio" data-wdbl="0">${t('lab.single')}</button><button type="button" role="radio" data-wdbl="1">${t('lab.double')} <small></small></button>`;
    $('#wAdds').innerHTML = chips(WRAP_ADDS, 'wrap', 'wadd');
    $('#wSauces').innerHTML = chips(WRAP_SAUCES, 'sauce', 'wsauce');
    wrapInfo();
}
function setWrap(change, animatePart, from) {
    change();
    renderWrap();
    wrapInfo();
    if (animatePart)
        drop(groupOf('#wrapSvg', animatePart), from);
}
function rollUp(then) {
    if (reduced) {
        then();
        return;
    }
    rolling = true;
    const top = $('#wTop'), roll = $('#wRoll');
    top.style.transformOrigin = '200px 300px';
    roll.style.transformOrigin = '200px 270px';
    top.animate([{ transform: 'scale(1,1)', opacity: 1 }, { transform: 'scale(.92,.16) translateY(-260px)', opacity: 1, offset: .7 }, { transform: 'scale(.6,.1) translateY(-260px)', opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' });
    const r = roll.animate([{ opacity: 0, transform: 'scale(.55) rotate(-8deg)' }, { opacity: 0, transform: 'scale(.55) rotate(-8deg)', offset: .3 }, { opacity: 1, transform: 'scale(1.06) rotate(2deg)', offset: .55 }, { opacity: 1, transform: 'scale(1) rotate(0)', offset: .65 }, { opacity: 1, transform: 'scale(1)', offset: .9 }, { opacity: 1, transform: 'scale(.9) translateY(-30px)' }], { duration: 1900, easing: 'ease-out', fill: 'forwards' });
    setTimeout(then, 1300);
    r.onfinish = () => { renderWrap(); rolling = false; anim($('#wTop'), [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }], { duration: 400 }); };
}
function randomWrap() {
    setWrap(() => {
        W.base = pick(WRAP_BASES).id;
        W.meat = pick(WRAP_MEATS).id;
        W.double = Math.random() < .3;
        W.add = shuffle(WRAP_ADDS.map(a => a.id)).slice(0, 3 + Math.floor(Math.random() * 3));
        W.sauces = shuffle(WRAP_SAUCES.map(a => a.id)).slice(0, 1 + Math.floor(Math.random() * 2));
    });
    if (!reduced)
        $$('#wrapSvg [data-part]').forEach((g, i) => { if (g.getAttribute('data-part') !== 'base')
            setTimeout(() => drop(g), i * 90); });
}
function initWrap() {
    renderWrap();
    renderWrapControls();
    const panel = $('#wrapLab');
    panel.addEventListener('click', e => {
        if (rolling)
            return;
        const tg = e.target;
        const b = tg.closest('[data-wbase]');
        if (b && b.dataset.wbase !== W.base) {
            setWrap(() => { W.base = b.dataset.wbase; });
            anim($('#wTop'), [{ transform: 'scale(1)' }, { transform: 'scale(1.04,.94)' }, { transform: 'scale(.99,1.02)' }, { transform: 'scale(1)' }], { duration: 420 });
            return;
        }
        const m = tg.closest('[data-wmeat]');
        if (m && m.dataset.wmeat !== W.meat) {
            setWrap(() => { W.meat = m.dataset.wmeat; }, 'meat');
            return;
        }
        const d = tg.closest('[data-wdbl]');
        if (d && (d.dataset.wdbl === '1') !== W.double) {
            setWrap(() => { W.double = d.dataset.wdbl === '1'; }, W.double ? undefined : 'meat', -120);
            return;
        }
        const a = tg.closest('[data-wadd]');
        if (a && !a.disabled) {
            const id = a.dataset.wadd;
            if (W.add.includes(id))
                flick(groupOf('#wrapSvg', 'add:' + id), () => setWrap(() => { W.add = W.add.filter(x => x !== id); }));
            else if (W.add.length >= MAX_WRAP_ADDS)
                toast(tf('lab.maxW', { n: MAX_WRAP_ADDS }));
            else
                setWrap(() => { W.add = toggle(W.add, id); }, 'add:' + id);
            return;
        }
        const s = tg.closest('[data-wsauce]');
        if (s && !s.disabled) {
            const id = s.dataset.wsauce;
            if (W.sauces.includes(id))
                flick(groupOf('#wrapSvg', 'sauce:' + id), () => setWrap(() => { W.sauces = W.sauces.filter(x => x !== id); }));
            else
                setWrap(() => { W.sauces = toggle(W.sauces, id); }, 'sauce:' + id);
        }
    });
    $('#wClear').addEventListener('click', () => { if (rolling)
        return; const gs = $$('#wrapSvg [data-part^="add:"], #wrapSvg [data-part^="sauce:"], #wrapSvg [data-part="smear"]'); let n = gs.length; if (!n)
        return; gs.forEach(g => flick(g, () => { if (--n === 0)
        setWrap(() => { W.add = []; W.sauces = []; }); })); });
    $('#wRandom').addEventListener('click', () => { if (!rolling)
        randomWrap(); });
    $('#wAdd').addEventListener('click', () => {
        if (rolling)
            return;
        const spec = { ...W, add: [...W.add], sauces: [...W.sauces] };
        rollUp(() => { addLine({ kind: 'wrap', wrap: spec }, 1, $('#wrapSvg')); toast(t('lab.addedW')); });
    });
}
/* =================== HOT DOG =================== */
const H = { ...DEFAULT_HOTDOG, tops: [...DEFAULT_HOTDOG.tops], sauces: [...DEFAULT_HOTDOG.sauces] };
function renderHotdog() {
    $('#hotdogSvg').innerHTML = `${plateSVG(200, 362, 186)}<g id="hDog">${hotdogSVG(H, 200, 352, 300)}</g>`;
}
function hotdogInfo() {
    $('#hName').textContent = hotdogName(H, state.lang);
    $('#hStats').textContent = `${hotdogKcal(H)} ${t('card.kcal')} · ~${hotdogPrep(H)} ${t('card.min')}`;
    $('#hPrice').textContent = money(hotdogPrice(H));
    $('#hCount').textContent = `${H.tops.length}/${MAX_HD_TOPS}`;
    $('#hSCount').textContent = `${H.sauces.length}/${MAX_SAUCES}`;
    $$('#hBun [data-hbun]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.hbun === H.bun)));
    $$('#hSaus [data-hsaus]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.hsaus === H.sausage)));
    $$('#hLen [data-hxl]').forEach(b => b.setAttribute('aria-checked', String((b.dataset.hxl === '1') === H.xl)));
    syncPressed('#hTops', 'htop', H.tops, MAX_HD_TOPS);
    syncPressed('#hSauces', 'hsauce', H.sauces, MAX_SAUCES);
}
function renderHotdogControls() {
    $('#hBun').innerHTML = radios(BUNS, 'hbun', H.bun, id => `<i class="bun-dot bun-${id}"></i>`);
    $('#hSaus').innerHTML = radios(HD_SAUSAGES, 'hsaus', H.sausage, id => `<i class="sw" style="--c:${HD_SAUSAGES.find(b => b.id === id).c}"></i>`);
    $('#hLen').innerHTML = `<button type="button" role="radio" data-hxl="0">${t('lab.regular')}</button><button type="button" role="radio" data-hxl="1">XL <small>+${money(HD_XL)}</small></button>`;
    $('#hTops').innerHTML = chips(HD_TOPS, 'hotdog', 'htop');
    $('#hSauces').innerHTML = chips(HD_SAUCES, 'sauce', 'hsauce');
    hotdogInfo();
}
function setHotdog(change, animatePart, from) {
    change();
    renderHotdog();
    hotdogInfo();
    if (animatePart)
        drop(groupOf('#hotdogSvg', animatePart), from);
}
function randomHotdog() {
    setHotdog(() => {
        H.bun = pick(BUNS).id;
        H.sausage = pick(HD_SAUSAGES).id;
        H.xl = Math.random() < .3;
        H.tops = shuffle(HD_TOPS.map(a => a.id)).slice(0, 1 + Math.floor(Math.random() * 3));
        H.sauces = shuffle(HD_SAUCES.map(a => a.id)).slice(0, 1 + Math.floor(Math.random() * 2));
    });
    if (!reduced)
        $$('#hotdogSvg [data-part^="top:"], #hotdogSvg [data-part^="sauce:"]').forEach((g, i) => setTimeout(() => drop(g, -200), i * 120));
}
function initHotdog() {
    renderHotdog();
    renderHotdogControls();
    $('#hotdogLab').addEventListener('click', e => {
        const tg = e.target;
        const b = tg.closest('[data-hbun]');
        if (b && b.dataset.hbun !== H.bun) {
            setHotdog(() => { H.bun = b.dataset.hbun; });
            ['bunback', 'bunfront'].forEach(p => { const g = groupOf('#hotdogSvg', p); if (g) {
                g.style.transformOrigin = '200px 330px';
                anim(g, [{ transform: 'scale(1,1)' }, { transform: 'scale(1.05,.86)' }, { transform: 'scale(.98,1.04)' }, { transform: 'scale(1,1)' }], { duration: 420 });
            } });
            return;
        }
        const s = tg.closest('[data-hsaus]');
        if (s && s.dataset.hsaus !== H.sausage) {
            setHotdog(() => { H.sausage = s.dataset.hsaus; });
            anim(groupOf('#hotdogSvg', 'sausage'), [{ transform: 'translateX(320px)' }, { transform: 'translateX(-10px)', offset: .8 }, { transform: 'translateX(0)' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1)' });
            return;
        }
        const x = tg.closest('[data-hxl]');
        if (x && (x.dataset.hxl === '1') !== H.xl) {
            setHotdog(() => { H.xl = x.dataset.hxl === '1'; });
            const g = groupOf('#hotdogSvg', 'sausage');
            if (g) {
                g.style.transformOrigin = '200px 306px';
                anim(g, [{ transform: `scaleX(${H.xl ? .83 : 1.2})` }, { transform: `scaleX(${H.xl ? 1.04 : .97})`, offset: .7 }, { transform: 'scaleX(1)' }], { duration: 480, easing: 'cubic-bezier(.3,1.3,.5,1)' });
            }
            return;
        }
        const tp = tg.closest('[data-htop]');
        if (tp && !tp.disabled) {
            const id = tp.dataset.htop;
            if (H.tops.includes(id))
                flick(groupOf('#hotdogSvg', 'top:' + id), () => setHotdog(() => { H.tops = H.tops.filter(v => v !== id); }));
            else if (H.tops.length >= MAX_HD_TOPS)
                toast(tf('lab.maxW', { n: MAX_HD_TOPS }));
            else
                setHotdog(() => { H.tops = toggle(H.tops, id); }, 'top:' + id, -200);
            return;
        }
        const sc = tg.closest('[data-hsauce]');
        if (sc && !sc.disabled) {
            const id = sc.dataset.hsauce;
            if (H.sauces.includes(id))
                flick(groupOf('#hotdogSvg', 'sauce:' + id), () => setHotdog(() => { H.sauces = H.sauces.filter(v => v !== id); }));
            else
                setHotdog(() => { H.sauces = toggle(H.sauces, id); }, 'sauce:' + id);
        }
    });
    $('#hClear').addEventListener('click', () => { const gs = $$('#hotdogSvg [data-part^="top:"], #hotdogSvg [data-part^="sauce:"]'); let n = gs.length; if (!n)
        return; gs.forEach(g => flick(g, () => { if (--n === 0)
        setHotdog(() => { H.tops = []; H.sauces = []; }); })); });
    $('#hRandom').addEventListener('click', randomHotdog);
    $('#hAdd').addEventListener('click', () => {
        addLine({ kind: 'hotdog', hotdog: { ...H, tops: [...H.tops], sauces: [...H.sauces] } }, 1, $('#hotdogSvg'));
        const g = $('#hDog');
        g.style.transformOrigin = '200px 360px';
        anim(g, [{ transform: 'translateY(0)' }, { transform: 'translateY(-26px) rotate(-3deg)', offset: .4 }, { transform: 'translateY(0)' }], { duration: 480, easing: 'cubic-bezier(.3,1.3,.5,1)' });
        toast(t('lab.addedH'));
    });
}
export function initLab2() {
    initWrap();
    initHotdog();
    on('lang', () => { renderWrapControls(); renderHotdogControls(); });
}
