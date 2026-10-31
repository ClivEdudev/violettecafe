// Pricing, names and art for custom burgers and coffees, shared by the labs, the cart and checkout.
import type { DrinkSpec, ArtSpec } from './art.js';
import { BUNS, FILLINGS, LAB, SIZES, WRAP_BASES, WRAP_MEATS, WRAP_ADDS, WRAP_SAUCES, HD_SAUSAGES, HD_TOPS, HD_SAUCES, HD_XL, MAX_WRAP_ADDS, MAX_SAUCES, MAX_HD_TOPS, type Part, type L10n, type Lang } from './data.js';

export interface BurgerSpec { bun: string; fill: string[] }
export interface CoffeeSpec {
  temp: 'hot' | 'iced'; size: 'S' | 'M' | 'L'; shots: number; milk: string; milkAmt: number;
  foam: 'none' | 'thin' | 'thick'; syrup: string; topping: string;
}
export const DEFAULT_COFFEE: CoffeeSpec = { temp: 'hot', size: 'M', shots: 1, milk: 'cow', milkAmt: 70, foam: 'thin', syrup: 'lavender', topping: 'none' };
export const DEFAULT_BURGER: BurgerSpec = { bun: 'classic', fill: ['sauce', 'beef', 'cheese', 'lettuce', 'tomato'] };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const fillOf = (id: string) => FILLINGS.find(f => f.id === id);

export function burgerPrice(b: BurgerSpec) {
  return (BUNS.find(x => x.id === b.bun)?.price ?? 6000) + b.fill.reduce((a, f) => a + (fillOf(f)?.price ?? 0), 0);
}
export function burgerKcal(b: BurgerSpec) {
  return (BUNS.find(x => x.id === b.bun)?.kcal ?? 150) + b.fill.reduce((a, f) => a + (fillOf(f)?.kcal ?? 0), 0);
}
export function burgerPrep(b: BurgerSpec) { return 6 + Math.max(0, ...b.fill.map(f => fillOf(f)?.prep ?? 0)); }
const BN: Record<string, L10n> = {
  base: { uz: 'Burger', ru: 'Бургер', en: 'burger' },
  beef: { uz: 'Goʻshtli', ru: 'Мясной', en: 'Beef' }, double: { uz: 'Dabl', ru: 'Дабл', en: 'Double' }, triple: { uz: 'Tripl', ru: 'Трипл', en: 'Triple' },
  chicken: { uz: 'Tovuqli', ru: 'Куриный', en: 'Chicken' }, mixed: { uz: 'Aralash', ru: 'Микс', en: 'Surf & turf' }, veg: { uz: 'Sabzavotli', ru: 'Овощной', en: 'Veggie' },
  spicy: { uz: 'achchiq', ru: 'острый', en: 'spicy' }, cheesy: { uz: 'pishloqli', ru: 'сырный', en: 'cheesy' },
  mine: { uz: 'Mening', ru: 'Мой', en: 'My' },
};
export function burgerName(b: BurgerSpec, lang: Lang): string {
  const beef = b.fill.filter(f => f === 'beef').length, ch = b.fill.filter(f => f === 'chicken').length;
  const cheese = b.fill.filter(f => f === 'cheese').length;
  const parts: string[] = [];
  if (beef && ch) parts.push(BN.mixed[lang]);
  else if (beef === 2 || ch === 2) parts.push(BN.double[lang]);
  else if (beef >= 3 || ch >= 3) parts.push(BN.triple[lang]);
  else if (beef) parts.push(BN.beef[lang]);
  else if (ch) parts.push(BN.chicken[lang]);
  else parts.push(BN.veg[lang]);
  if (b.fill.includes('jalapeno')) parts.push(BN.spicy[lang]);
  if (cheese >= 2) parts.push(BN.cheesy[lang]);
  parts.push(BN.base[lang]);
  let s = parts.join(' ');
  if (lang === 'en') s = s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}
export const burgerArt = (b: BurgerSpec): ArtSpec => ({ k: 'burger', layers: ['bun:' + b.bun, ...b.fill] });

/* ---------- coffee ---------- */
const sizeAdd = (s: string) => SIZES.find(x => x.id === s)?.add ?? 0;
const sizeMl = (s: string) => SIZES.find(x => x.id === s)?.ml ?? 350;
export function coffeePrice(c: CoffeeSpec) {
  return LAB.base + (c.shots - 1) * LAB.shot + (c.milk !== 'none' ? LAB.milk[c.milk] ?? 0 : 0) + (c.syrup !== 'none' ? LAB.syrup : 0)
    + (c.topping !== 'none' ? LAB.topping : 0) + (c.temp === 'iced' ? LAB.iced : 0) + sizeAdd(c.size);
}
export function coffeeStats(c: CoffeeSpec) {
  const ml = sizeMl(c.size), milk = c.milk === 'none' ? 0 : c.milkAmt / 100;
  const kpm: Record<string, number> = { cow: .6, oat: .48, coconut: .32 };
  const kcal = Math.round(c.shots * 3 + milk * ml * .8 * (kpm[c.milk] ?? 0) + (c.syrup !== 'none' ? 45 : 0) + (({ cream: 80, cocoa: 12, cinnamon: 3 } as Record<string, number>)[c.topping] ?? 0));
  const strength = clamp(Math.round(c.shots * 36 - milk * 34 + (c.milk === 'none' && c.size !== 'S' ? -18 : 0) + (c.size === 'L' ? -8 : c.size === 'S' ? 8 : 0)), 6, 100);
  const sweet = clamp(Math.round((c.syrup !== 'none' ? 55 : 0) + milk * 18 + (({ cream: 22, cocoa: 10, cinnamon: 6 } as Record<string, number>)[c.topping] ?? 0)), 0, 100);
  return { kcal, strength, sweet };
}
const CN: Record<string, L10n> = {
  espresso: { uz: 'Espresso', ru: 'Эспрессо', en: 'Espresso' }, doppio: { uz: 'Doppio', ru: 'Доппио', en: 'Doppio' }, triple: { uz: 'Tripl espresso', ru: 'Тройной эспрессо', en: 'Triple espresso' },
  americano: { uz: 'Amerikano', ru: 'Американо', en: 'Americano' }, macchiato: { uz: 'Makiato', ru: 'Макиато', en: 'Macchiato' },
  cappuccino: { uz: 'kapuchino', ru: 'капучино', en: 'cappuccino' }, flat: { uz: 'flet uayt', ru: 'флэт уайт', en: 'flat white' }, latte: { uz: 'latte', ru: 'латте', en: 'latte' },
  iced: { uz: 'Muzdek', ru: 'Айс', en: 'Iced' },
  lavender: { uz: 'lavandali', ru: 'лавандовый', en: 'lavender' }, caramel: { uz: 'karamelli', ru: 'карамельный', en: 'caramel' },
  vanilla: { uz: 'vanilli', ru: 'ванильный', en: 'vanilla' }, hazelnut: { uz: 'findiqli', ru: 'ореховый', en: 'hazelnut' },
  oat: { uz: 'suli sutida', ru: 'на овсяном', en: 'with oat milk' }, coconut: { uz: 'kokos sutida', ru: 'на кокосовом', en: 'with coconut milk' },
};
export function coffeeKind(c: CoffeeSpec): string {
  if (c.milk === 'none') return c.size === 'S' ? (c.shots === 1 ? 'espresso' : c.shots === 2 ? 'doppio' : 'triple') : 'americano';
  if (c.milkAmt < 30) return 'macchiato';
  if (c.temp === 'hot' && c.foam === 'thick') return 'cappuccino';
  if (c.shots >= 2 && c.milkAmt < 70 && c.foam !== 'thick') return 'flat';
  return 'latte';
}
export function coffeeName(c: CoffeeSpec, lang: Lang): string {
  const kind = coffeeKind(c);
  const words: string[] = [];
  if (c.temp === 'iced') words.push(CN.iced[lang]);
  if (c.syrup !== 'none' && CN[c.syrup]) words.push(CN[c.syrup][lang]);
  words.push(CN[kind][lang]);
  if (c.milk === 'oat' || c.milk === 'coconut') words.push(CN[c.milk][lang]);
  let s = words.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function coffeeLayers(c: CoffeeSpec) {
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
export function coffeeColor(c: CoffeeSpec) {
  return c.milk === 'none' ? (c.size === 'S' ? '#3A1F14' : '#4A2A1A') : '#5A3220';
}
export function coffeeArt(c: CoffeeSpec): ArtSpec {
  const layers: string[] = [];
  if (c.syrup !== 'none') layers.push(LAB.syrupC[c.syrup]);
  if (c.milk !== 'none') layers.push(LAB.milkC[c.milk], '#C69C72');
  layers.push(coffeeColor(c));
  const d: DrinkSpec = c.temp === 'iced'
    ? { v: 'iced', liquid: layers[0], layers, cream: c.topping === 'cream', dust: c.topping === 'cocoa' ? '#3A1F14' : c.topping === 'cinnamon' ? '#8A4B1F' : undefined }
    : { v: 'glass', liquid: layers[0], layers, foam: c.foam !== 'none' && c.milk !== 'none' ? '#F1E3CF' : undefined, cream: c.topping === 'cream', dust: c.topping === 'cocoa' ? '#3A1F14' : c.topping === 'cinnamon' ? '#8A4B1F' : undefined };
  return { k: 'drink', d };
}
export const coffeePrep = (c: CoffeeSpec) => 3 + c.shots;
export function sanitizeCoffee(raw: unknown): CoffeeSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const pick = <T extends string>(v: unknown, opts: readonly T[], d: T): T => (opts.includes(v as T) ? (v as T) : d);
  return {
    temp: pick(r.temp, ['hot', 'iced'] as const, 'hot'), size: pick(r.size, ['S', 'M', 'L'] as const, 'M'),
    shots: clamp(Math.round(Number(r.shots) || 1), 1, 3), milk: pick(r.milk as string, LAB.milks, 'cow'),
    milkAmt: clamp(Math.round(Number(r.milkAmt) || 0), 0, 100), foam: pick(r.foam, ['none', 'thin', 'thick'] as const, 'thin'),
    syrup: pick(r.syrup as string, LAB.syrups, 'none'), topping: pick(r.topping as string, LAB.toppings, 'none'),
  };
}
export function sanitizeBurger(raw: unknown): BurgerSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const bun = BUNS.some(b => b.id === r.bun) ? String(r.bun) : 'classic';
  const fill = Array.isArray(r.fill) ? r.fill.filter(f => FILLINGS.some(x => x.id === f)).slice(0, 9).map(String) : [];
  return { bun, fill };
}

/* ---------- shawarma ---------- */
export interface WrapSpec { base: string; meat: string; double: boolean; add: string[]; sauces: string[] }
export interface HotdogSpec { bun: string; sausage: string; xl: boolean; tops: string[]; sauces: string[] }
export const DEFAULT_WRAP: WrapSpec = { base: 'lavash', meat: 'chicken', double: false, add: ['fries', 'tomato', 'cucumber', 'cabbage'], sauces: ['garlic'] };
export const DEFAULT_HOTDOG: HotdogSpec = { bun: 'brioche', sausage: 'beef', xl: false, tops: ['onion', 'pickles'], sauces: ['ketchup', 'mustard'] };
const of = (list: Part[], id: string) => list.find(p => p.id === id);
const sum = (list: Part[], ids: string[], k: 'price' | 'kcal') => ids.reduce((a, id) => a + (of(list, id)?.[k] ?? 0), 0);
export function wrapPrice(w: WrapSpec) {
  const m = WRAP_MEATS.find(x => x.id === w.meat) ?? WRAP_MEATS[0];
  return (of(WRAP_BASES, w.base)?.price ?? 6000) + m.price + (w.double ? m.dbl : 0) + sum(WRAP_ADDS, w.add, 'price') + sum(WRAP_SAUCES, w.sauces, 'price');
}
export function wrapKcal(w: WrapSpec) {
  const m = of(WRAP_MEATS, w.meat)?.kcal ?? 230;
  return Math.round((of(WRAP_BASES, w.base)?.kcal ?? 180) + m * (w.double ? 1.6 : 1) + sum(WRAP_ADDS, w.add, 'kcal') + sum(WRAP_SAUCES, w.sauces, 'kcal'));
}
export const wrapPrep = (w: WrapSpec) => 7 + (w.double ? 1 : 0) + (w.add.includes('fries') ? 1 : 0);
const WN: Record<string, L10n> = {
  chicken: { uz: 'Tovuqli', ru: 'с курицей', en: 'Chicken' }, beef: { uz: 'Goʻshtli', ru: 'с говядиной', en: 'Beef' }, mix: { uz: 'Aralash', ru: 'микс', en: 'Mixed' },
  lavash: { uz: 'lavash', ru: 'Лаваш', en: 'lavash' }, red: { uz: 'qizil lavash', ru: 'Красный лаваш', en: 'tomato lavash' }, pita: { uz: 'shaurma (pita)', ru: 'Шаурма в пите', en: 'pita shawarma' },
  double: { uz: 'Dabl', ru: 'двойной', en: 'Double' }, spicy: { uz: 'achchiq', ru: 'острый', en: 'spicy' }, cheesy: { uz: 'pishloqli', ru: 'сырный', en: 'cheesy' },
};
export function wrapName(w: WrapSpec, lang: Lang): string {
  const spicy = w.add.includes('jalapeno') || w.sauces.includes('spicy'), cheesy = w.add.includes('cheese') || w.sauces.includes('cheese');
  if (lang === 'ru') {
    // "Острый двойной лаваш с курицей"
    const adj = [spicy ? WN.spicy.ru : '', cheesy ? WN.cheesy.ru : '', w.double ? WN.double.ru : ''].filter(Boolean);
    const base = WN[w.base]?.ru ?? WN.lavash.ru;
    const head = adj.length ? adj.join(' ') + ' ' + base.charAt(0).toLowerCase() + base.slice(1) : base;
    return (head.charAt(0).toUpperCase() + head.slice(1)) + ' ' + (WN[w.meat]?.ru ?? '');
  }
  const words = [w.double ? WN.double[lang] : '', WN[w.meat]?.[lang] ?? '', spicy ? WN.spicy[lang] : '', cheesy ? WN.cheesy[lang] : '', WN[w.base]?.[lang] ?? WN.lavash[lang]].filter(Boolean);
  const s = words.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const wrapArt = (w: WrapSpec): ArtSpec => ({ k: 'cwrap', w });

/* ---------- hot dog ---------- */
export function hotdogPrice(h: HotdogSpec) {
  return (BUNS.find(b => b.id === h.bun)?.price ?? 6000) + (of(HD_SAUSAGES, h.sausage)?.price ?? 10000) + (h.xl ? HD_XL : 0) + sum(HD_TOPS, h.tops, 'price') + sum(HD_SAUCES, h.sauces, 'price');
}
export function hotdogKcal(h: HotdogSpec) {
  return Math.round(((BUNS.find(b => b.id === h.bun)?.kcal ?? 150) + (of(HD_SAUSAGES, h.sausage)?.kcal ?? 230) * (h.xl ? 1.5 : 1)) + sum(HD_TOPS, h.tops, 'kcal') + sum(HD_SAUCES, h.sauces, 'kcal'));
}
export const hotdogPrep = (h: HotdogSpec) => 5 + (h.tops.includes('bacon') ? 2 : 0) + (h.xl ? 1 : 0);
const HN: Record<string, L10n> = {
  beef: { uz: 'Klassik', ru: 'Классический', en: 'Classic' }, chicken: { uz: 'Tovuqli', ru: 'Куриный', en: 'Chicken' }, smoked: { uz: 'Dudlangan', ru: 'Копчёный', en: 'Smoked' }, spicy: { uz: 'Achchiq', ru: 'Острый', en: 'Spicy' },
  base: { uz: 'hot-dog', ru: 'хот-дог', en: 'hot dog' }, cheesy: { uz: 'pishloqli', ru: 'сырный', en: 'cheesy' }, bacon: { uz: 'bekonli', ru: 'с беконом', en: 'bacon' },
};
export function hotdogName(h: HotdogSpec, lang: Lang): string {
  const cheesy = h.tops.includes('cheese') || h.sauces.includes('cheese');
  const parts = [HN[h.sausage]?.[lang] ?? HN.beef[lang]];
  if (h.tops.includes('bacon') && lang !== 'ru') parts.push(HN.bacon[lang]);
  if (cheesy) parts.push(HN.cheesy[lang]);
  if (h.xl) parts.push('XL');
  parts.push(HN.base[lang]);
  if (h.tops.includes('bacon') && lang === 'ru') parts.push(HN.bacon.ru);
  return parts.join(' ');
}
export const hotdogArt = (h: HotdogSpec): ArtSpec => ({ k: 'chotdog', h });

const ids = (v: unknown, list: Part[], max: number) => (Array.isArray(v) ? [...new Set(v.filter(x => list.some(p => p.id === x)).map(String))].slice(0, max) : []);
export function sanitizeWrap(raw: unknown): WrapSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return { base: of(WRAP_BASES, String(r.base)) ? String(r.base) : 'lavash', meat: of(WRAP_MEATS, String(r.meat)) ? String(r.meat) : 'chicken', double: r.double === true,
    add: ids(r.add, WRAP_ADDS, MAX_WRAP_ADDS), sauces: ids(r.sauces, WRAP_SAUCES, MAX_SAUCES) };
}
export function sanitizeHotdog(raw: unknown): HotdogSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return { bun: BUNS.some(b => b.id === r.bun) ? String(r.bun) : 'classic', sausage: of(HD_SAUSAGES, String(r.sausage)) ? String(r.sausage) : 'beef', xl: r.xl === true,
    tops: ids(r.tops, HD_TOPS, MAX_HD_TOPS), sauces: ids(r.sauces, HD_SAUCES, MAX_SAUCES) };
}
