import { BUNS, FILLINGS, LAB, SIZES } from './data.js';
export const DEFAULT_COFFEE = { temp: 'hot', size: 'M', shots: 1, milk: 'cow', milkAmt: 70, foam: 'thin', syrup: 'lavender', topping: 'none' };
export const DEFAULT_BURGER = { bun: 'classic', fill: ['sauce', 'beef', 'cheese', 'lettuce', 'tomato'] };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fillOf = (id) => FILLINGS.find(f => f.id === id);
export function burgerPrice(b) {
    return (BUNS.find(x => x.id === b.bun)?.price ?? 6000) + b.fill.reduce((a, f) => a + (fillOf(f)?.price ?? 0), 0);
}
export function burgerKcal(b) {
    return (BUNS.find(x => x.id === b.bun)?.kcal ?? 150) + b.fill.reduce((a, f) => a + (fillOf(f)?.kcal ?? 0), 0);
}
export function burgerPrep(b) { return 6 + Math.max(0, ...b.fill.map(f => fillOf(f)?.prep ?? 0)); }
const BN = {
    base: { uz: 'Burger', ru: 'Бургер', en: 'burger' },
    beef: { uz: 'Goʻshtli', ru: 'Мясной', en: 'Beef' }, double: { uz: 'Dabl', ru: 'Дабл', en: 'Double' }, triple: { uz: 'Tripl', ru: 'Трипл', en: 'Triple' },
    chicken: { uz: 'Tovuqli', ru: 'Куриный', en: 'Chicken' }, mixed: { uz: 'Aralash', ru: 'Микс', en: 'Surf & turf' }, veg: { uz: 'Sabzavotli', ru: 'Овощной', en: 'Veggie' },
    spicy: { uz: 'achchiq', ru: 'острый', en: 'spicy' }, cheesy: { uz: 'pishloqli', ru: 'сырный', en: 'cheesy' },
    mine: { uz: 'Mening', ru: 'Мой', en: 'My' },
};
export function burgerName(b, lang) {
    const beef = b.fill.filter(f => f === 'beef').length, ch = b.fill.filter(f => f === 'chicken').length;
    const cheese = b.fill.filter(f => f === 'cheese').length;
    const parts = [];
    if (beef && ch)
        parts.push(BN.mixed[lang]);
    else if (beef === 2 || ch === 2)
        parts.push(BN.double[lang]);
    else if (beef >= 3 || ch >= 3)
        parts.push(BN.triple[lang]);
    else if (beef)
        parts.push(BN.beef[lang]);
    else if (ch)
        parts.push(BN.chicken[lang]);
    else
        parts.push(BN.veg[lang]);
    if (b.fill.includes('jalapeno'))
        parts.push(BN.spicy[lang]);
    if (cheese >= 2)
        parts.push(BN.cheesy[lang]);
    parts.push(BN.base[lang]);
    let s = parts.join(' ');
    if (lang === 'en')
        s = s.charAt(0).toUpperCase() + s.slice(1);
    return s;
}
export const burgerArt = (b) => ({ k: 'burger', layers: ['bun:' + b.bun, ...b.fill] });
/* ---------- coffee ---------- */
const sizeAdd = (s) => SIZES.find(x => x.id === s)?.add ?? 0;
const sizeMl = (s) => SIZES.find(x => x.id === s)?.ml ?? 350;
export function coffeePrice(c) {
    return LAB.base + (c.shots - 1) * LAB.shot + (c.milk !== 'none' ? LAB.milk[c.milk] ?? 0 : 0) + (c.syrup !== 'none' ? LAB.syrup : 0)
        + (c.topping !== 'none' ? LAB.topping : 0) + (c.temp === 'iced' ? LAB.iced : 0) + sizeAdd(c.size);
}
export function coffeeStats(c) {
    const ml = sizeMl(c.size), milk = c.milk === 'none' ? 0 : c.milkAmt / 100;
    const kpm = { cow: .6, oat: .48, coconut: .32 };
    const kcal = Math.round(c.shots * 3 + milk * ml * .8 * (kpm[c.milk] ?? 0) + (c.syrup !== 'none' ? 45 : 0) + ({ cream: 80, cocoa: 12, cinnamon: 3 }[c.topping] ?? 0));
    const strength = clamp(Math.round(c.shots * 36 - milk * 34 + (c.milk === 'none' && c.size !== 'S' ? -18 : 0) + (c.size === 'L' ? -8 : c.size === 'S' ? 8 : 0)), 6, 100);
    const sweet = clamp(Math.round((c.syrup !== 'none' ? 55 : 0) + milk * 18 + ({ cream: 22, cocoa: 10, cinnamon: 6 }[c.topping] ?? 0)), 0, 100);
    return { kcal, strength, sweet };
}
const CN = {
    espresso: { uz: 'Espresso', ru: 'Эспрессо', en: 'Espresso' }, doppio: { uz: 'Doppio', ru: 'Доппио', en: 'Doppio' }, triple: { uz: 'Tripl espresso', ru: 'Тройной эспрессо', en: 'Triple espresso' },
    americano: { uz: 'Amerikano', ru: 'Американо', en: 'Americano' }, macchiato: { uz: 'Makiato', ru: 'Макиато', en: 'Macchiato' },
    cappuccino: { uz: 'kapuchino', ru: 'капучино', en: 'cappuccino' }, flat: { uz: 'flet uayt', ru: 'флэт уайт', en: 'flat white' }, latte: { uz: 'latte', ru: 'латте', en: 'latte' },
    iced: { uz: 'Muzdek', ru: 'Айс', en: 'Iced' },
    lavender: { uz: 'lavandali', ru: 'лавандовый', en: 'lavender' }, caramel: { uz: 'karamelli', ru: 'карамельный', en: 'caramel' },
    vanilla: { uz: 'vanilli', ru: 'ванильный', en: 'vanilla' }, hazelnut: { uz: 'findiqli', ru: 'ореховый', en: 'hazelnut' },
    oat: { uz: 'suli sutida', ru: 'на овсяном', en: 'with oat milk' }, coconut: { uz: 'kokos sutida', ru: 'на кокосовом', en: 'with coconut milk' },
};
export function coffeeKind(c) {
    if (c.milk === 'none')
        return c.size === 'S' ? (c.shots === 1 ? 'espresso' : c.shots === 2 ? 'doppio' : 'triple') : 'americano';
    if (c.milkAmt < 30)
        return 'macchiato';
    if (c.temp === 'hot' && c.foam === 'thick')
        return 'cappuccino';
    if (c.shots >= 2 && c.milkAmt < 70 && c.foam !== 'thick')
        return 'flat';
    return 'latte';
}
export function coffeeName(c, lang) {
    const kind = coffeeKind(c);
    const words = [];
    if (c.temp === 'iced')
        words.push(CN.iced[lang]);
    if (c.syrup !== 'none' && CN[c.syrup])
        words.push(CN[c.syrup][lang]);
    words.push(CN[kind][lang]);
    if (c.milk === 'oat' || c.milk === 'coconut')
        words.push(CN[c.milk][lang]);
    let s = words.join(' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
}
export function coffeeLayers(c) {
    // fractions of the vessel from the bottom: syrup, milk, coffee, foam
    const ml = sizeMl(c.size), fullness = ml / 450;
    const syrup = c.syrup !== 'none' ? .07 : 0;
    const milk = c.milk === 'none' ? 0 : (c.milkAmt / 100) * .62;
    const coffee = c.milk === 'none' ? (c.size === 'S' ? .12 + c.shots * .07 : .8) : .1 + c.shots * .06;
    const foam = c.temp === 'iced' || c.milk === 'none' ? 0 : c.foam === 'thick' ? .16 : c.foam === 'thin' ? .06 : 0;
    const total = syrup + milk + coffee + foam;
    const k = Math.min(1, (.92 * fullness) / total);
    return { syrup: syrup * k, milk: milk * k, coffee: coffee * k, foam: foam * k };
}
export function coffeeColor(c) {
    return c.milk === 'none' ? (c.size === 'S' ? '#3A1F14' : '#4A2A1A') : '#5A3220';
}
export function coffeeArt(c) {
    const layers = [];
    if (c.syrup !== 'none')
        layers.push(LAB.syrupC[c.syrup]);
    if (c.milk !== 'none')
        layers.push(LAB.milkC[c.milk], '#C69C72');
    layers.push(coffeeColor(c));
    const d = c.temp === 'iced'
        ? { v: 'iced', liquid: layers[0], layers, cream: c.topping === 'cream', dust: c.topping === 'cocoa' ? '#3A1F14' : c.topping === 'cinnamon' ? '#8A4B1F' : undefined }
        : { v: 'glass', liquid: layers[0], layers, foam: c.foam !== 'none' && c.milk !== 'none' ? '#F1E3CF' : undefined, cream: c.topping === 'cream', dust: c.topping === 'cocoa' ? '#3A1F14' : c.topping === 'cinnamon' ? '#8A4B1F' : undefined };
    return { k: 'drink', d };
}
export const coffeePrep = (c) => 3 + c.shots;
export function sanitizeCoffee(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const r = raw;
    const pick = (v, opts, d) => (opts.includes(v) ? v : d);
    return {
        temp: pick(r.temp, ['hot', 'iced'], 'hot'), size: pick(r.size, ['S', 'M', 'L'], 'M'),
        shots: clamp(Math.round(Number(r.shots) || 1), 1, 3), milk: pick(r.milk, LAB.milks, 'cow'),
        milkAmt: clamp(Math.round(Number(r.milkAmt) || 0), 0, 100), foam: pick(r.foam, ['none', 'thin', 'thick'], 'thin'),
        syrup: pick(r.syrup, LAB.syrups, 'none'), topping: pick(r.topping, LAB.toppings, 'none'),
    };
}
export function sanitizeBurger(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const r = raw;
    const bun = BUNS.some(b => b.id === r.bun) ? String(r.bun) : 'classic';
    const fill = Array.isArray(r.fill) ? r.fill.filter(f => FILLINGS.some(x => x.id === f)).slice(0, 9).map(String) : [];
    return { bun, fill };
}
