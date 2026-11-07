import type { ArtSpec, DrinkSpec } from './art.js';

export type Lang = 'uz' | 'ru' | 'en';
export type L10n = Record<Lang, string>;
export type World = 'coffee' | 'food';
export type CatId = 'coffee' | 'cold' | 'tea' | 'sweet' | 'chicken' | 'burger' | 'lavash' | 'hotdog' | 'sides' | 'combo';
export type Tag = 'hit' | 'new' | 'spicy' | 'signature';
export type ExtraId = 'shot' | 'oat' | 'syrup' | 'cream' | 'cheese' | 'jalapeno' | 'sauce' | 'patty';

export interface Item {
  id: string; cat: CatId; art: ArtSpec; name: L10n; desc: L10n; price: number;
  kcal: number; prep: number; tags?: Tag[]; sized?: boolean; extras?: ExtraId[]; pop: number; photo?: string;
  role: 'main' | 'side' | 'drink' | 'sweet';
}

const n = (uz: string, ru: string, en: string): L10n => ({ uz, ru, en });
const D = (d: DrinkSpec): ArtSpec => ({ k: 'drink', d });

export const CAFE = {
  name: 'Frans Burger',
  // placeholders until the owner gives the real contacts: while the phone holds XX the site shows the Telegram link instead
  phone: '+998 XX XXX XX XX', phone2: '',
  telegram: 'fransburger',
  instagram: 'fransburger',
  plus: 'Q944+3J5', plusFull: '8JGJQ944+3J5', lat: 40.75514, lng: 72.35661, // Andijan (street address to be confirmed)
  open: 10, close: 23, lastOrder: 22 + 40 / 60, // placeholder hours: every day 10:00–23:00, last order 22:40 (Tashkent time)
};

export const CATS: { id: CatId; world: World; name: L10n }[] = [
  { id: 'burger', world: 'food', name: n('Burgerlar', 'Бургеры', 'Burgers') },
  { id: 'chicken', world: 'food', name: n('Tovuq', 'Курица', 'Chicken') },
  { id: 'lavash', world: 'food', name: n('Lavash va donar', 'Лаваш и донер', 'Lavash & doner') },
  { id: 'hotdog', world: 'food', name: n('Hot-doglar', 'Хот-доги', 'Hot dogs') },
  { id: 'sides', world: 'food', name: n('Fri', 'Фри', 'Fries') },
  { id: 'combo', world: 'food', name: n('Kombo', 'Комбо', 'Combos') },
  { id: 'tea', world: 'coffee', name: n('Choylar', 'Чай', 'Tea') },
  { id: 'coffee', world: 'coffee', name: n('Kofe', 'Кофе', 'Coffee') },
  { id: 'cold', world: 'coffee', name: n('Gazli ichimliklar', 'Газированные напитки', 'Soft drinks') },
];

const C = { esp: '#3A1F14', amer: '#4A2A1A', latte: '#C69C72', foam: '#F1E3CF', milk: '#F6EFE6', raf: '#E8D2B0', matcha: '#8DB255', lav: '#F08A8D', mocha: '#5C3524', cocoa: '#6B3E2A' };
const COFFEE_X: ExtraId[] = ['shot', 'oat', 'syrup'];
const FOOD_X: ExtraId[] = ['cheese', 'sauce'];

// SAMPLE MENU: names, prices, calories and prep times are placeholders until the Frans Burger owner sends the real menu.
export const ITEMS: Item[] = [
  // ---- burgers
  { id: 'frans-burger', cat: 'burger', role: 'main', art: { k: 'burger', layers: ['bun:brioche', 'sauce', 'beef', 'cheese', 'bacon', 'onion', 'lettuce'] }, name: n('Frans burger', 'Frans burger', 'Frans burger'), desc: n('Imzo burgerimiz: brioch non, mol goʻshti, cheddar, bekon, piyoz va maxsus Frans sousi', 'Наш фирменный: бриошь, говядина, чеддер, бекон, лук и соус Frans', 'Our signature: brioche, beef, cheddar, beef bacon, onion and Frans sauce'), price: 42000, kcal: 760, prep: 10, tags: ['signature', 'hit'], extras: [...FOOD_X, 'patty'], pop: 100 },
  { id: 'double-frans', cat: 'burger', role: 'main', art: { k: 'burger', layers: ['bun:brioche', 'sauce', 'beef', 'cheese', 'beef', 'cheese', 'pickles', 'onion'] }, name: n('Dabl Frans', 'Дабл Frans', 'Double Frans'), desc: n('Ikki kotlet, ikki cheddar — chinakam ochlar uchun', 'Две котлеты, два чеддера — для голодных всерьёз', 'Two patties, two cheddars — for the seriously hungry'), price: 52000, kcal: 1050, prep: 11, tags: ['signature'], extras: FOOD_X, pop: 92 },
  { id: 'triple-cheese', cat: 'burger', role: 'main', art: { k: 'burger', layers: ['bun:classic', 'sauce', 'beef', 'cheese', 'cheese', 'cheese', 'pickles'] }, name: n('Uch pishloqli', 'Три сыра', 'Triple cheese'), desc: n('Mol goʻshti va uch qavat erigan pishloq', 'Говядина и три слоя тающего сыра', 'Beef with three layers of melting cheese'), price: 39000, kcal: 690, prep: 9, extras: FOOD_X, pop: 88 },
  { id: 'classic-burger', photo: 'photo-1568901346375-23c9450c58cd', cat: 'burger', role: 'main', art: { k: 'burger', layers: ['bun:classic', 'ketchup', 'beef', 'tomato', 'lettuce'] }, name: n('Klassik burger', 'Классический бургер', 'Classic burger'), desc: n('Mol goʻshti kotleti, pomidor, salat', 'Говяжья котлета, томат, салат', 'Beef patty, tomato, lettuce'), price: 32000, kcal: 520, prep: 10, extras: [...FOOD_X, 'patty'], pop: 88 },
  { id: 'cheeseburger', photo: 'photo-1667329829058-ac191ba4a905', cat: 'burger', role: 'main', art: { k: 'burger', layers: ['bun:classic', 'beef', 'cheese', 'pickles', 'ketchup'] }, name: n('Chizburger', 'Чизбургер', 'Cheeseburger'), desc: n('Erigan cheddar va tuzlangan bodring', 'Плавленый чеддер и огурчики', 'Melted cheddar and pickles'), price: 35000, kcal: 580, prep: 10, extras: [...FOOD_X, 'patty'], pop: 90 },
  { id: 'chicken-burger', photo: 'photo-1637710847214-f91d99669e18', cat: 'burger', role: 'main', art: { k: 'burger', layers: ['bun:classic', 'sauce', 'chicken', 'lettuce', 'tomato'] }, name: n('Krispi tovuq burger', 'Бургер с хрустящей курицей', 'Crispy chicken burger'), desc: n('Qarsildoq tovuq filesi va oq sous', 'Хрустящее куриное филе и белый соус', 'Crispy chicken fillet and white sauce'), price: 34000, kcal: 560, prep: 11, extras: FOOD_X, pop: 86 },
  { id: 'egg-burger', cat: 'burger', role: 'main', art: { k: 'burger', layers: ['bun:brioche', 'ketchup', 'beef', 'egg', 'cheese', 'lettuce'] }, name: n('Nonushta burger', 'Бургер-завтрак', 'Breakfast burger'), desc: n('Kotlet, qovurilgan tuxum, cheddar — kun boshi uchun', 'Котлета, глазунья и чеддер — для начала дня', 'Patty, fried egg and cheddar — to start the day'), price: 38000, kcal: 650, prep: 10, tags: ['new'], extras: FOOD_X, pop: 80 },
  // ---- chicken
  { id: 'chicken-box', cat: 'chicken', role: 'main', art: { k: 'bucket' }, name: n('Frans tovuq boks', 'Frans куриный бокс', 'Frans chicken box'), desc: n('Bir kilogramm qarsildoq tovuq — butun kompaniyaga', 'Килограмм хрустящей курицы — на всю компанию', 'A kilo of crispy chicken — for the whole group'), price: 89000, kcal: 2400, prep: 12, tags: ['hit'], extras: ['sauce'], pop: 94 },
  { id: 'frans-mix', cat: 'chicken', role: 'main', art: { k: 'combo', parts: [{ k: 'drumsticks' }, { k: 'fries' }] }, name: n('Frans miks', 'Frans микс', 'Frans mix'), desc: n('Qarsildoq tovuq boʻlaklari va fri', 'Хрустящие куриные кусочки и фри', 'Crispy chicken pieces and fries'), price: 36000, kcal: 900, prep: 10, extras: ['sauce'], pop: 87 },
  { id: 'spicy-wings', cat: 'chicken', role: 'main', art: { k: 'drumsticks', variant: 'spicy' }, name: n('Achchiq qanotlar', 'Острые крылышки', 'Spicy wings'), desc: n('Achchiq va qarsildoq', 'Острые и хрустящие', 'Spicy and crunchy'), price: 26000, kcal: 520, prep: 9, tags: ['spicy'], extras: ['sauce'], pop: 84 },
  // ---- lavash & doner
  { id: 'lavash-chicken', photo: 'photo-1762284513008-08f897ff5041', cat: 'lavash', role: 'main', art: { k: 'wrap', variant: 'chicken' }, name: n('Tovuqli lavash', 'Лаваш с курицей', 'Chicken lavash'), desc: n('Tovuq, fri, pomidor, bodring va sous', 'Курица, фри, томат, огурец и соус', 'Chicken, fries, tomato, cucumber and sauce'), price: 30000, kcal: 610, prep: 8, tags: ['hit'], extras: FOOD_X, pop: 96 },
  { id: 'lavash-beef', photo: 'photo-1529006557810-274b9b2fc783', cat: 'lavash', role: 'main', art: { k: 'wrap', variant: 'beef' }, name: n('Goʻshtli lavash', 'Лаваш с говядиной', 'Beef lavash'), desc: n('Mol goʻshti, fri va sarimsoqli sous', 'Говядина, фри и чесночный соус', 'Beef, fries and garlic sauce'), price: 34000, kcal: 660, prep: 9, extras: FOOD_X, pop: 91 },
  { id: 'shaurma-pita', photo: 'photo-1676300187347-6f60002fd83e', cat: 'lavash', role: 'main', art: { k: 'pita' }, name: n('Donar', 'Донер', 'Doner'), desc: n('Yangi non, goʻsht va sabzavotlar', 'Свежий хлеб, мясо и овощи', 'Fresh bread, meat and vegetables'), price: 32000, kcal: 580, prep: 8, extras: FOOD_X, pop: 80 },
  // ---- hot dogs
  { id: 'french-hotdog', photo: 'photo-1619538189873-3f511db5fec6', cat: 'hotdog', role: 'main', art: { k: 'hotdog', variant: 'french' }, name: n('Fransuzcha hot-dog', 'Французский хот-дог', 'French hot dog'), desc: n('Ichi kovak bagetda, sous bilan — nomimizga munosib', 'В багете с соусом внутри — как и положено у Frans', 'Inside a baguette with sauce — as a Frans should be'), price: 20000, kcal: 400, prep: 5, tags: ['signature'], pop: 85 },
  { id: 'hotdog', photo: 'photo-1638368593249-7cadb261e8b3', cat: 'hotdog', role: 'main', art: { k: 'hotdog' }, name: n('Klassik hot-dog', 'Классический хот-дог', 'Classic hot dog'), desc: n('Mol goʻshti sosiskasi, ketchup va xantal', 'Говяжья сосиска, кетчуп и горчица', 'Beef sausage, ketchup and mustard'), price: 18000, kcal: 380, prep: 5, extras: FOOD_X, pop: 82 },
  // ---- sides
  { id: 'fries', photo: 'photo-1630384060421-cb20d0e0649d', cat: 'sides', role: 'side', art: { k: 'fries' }, name: n('Kartoshka fri', 'Картофель фри', 'French fries'), desc: n('Qarsildoq, tuzli — fransuzcha, albatta', 'Хрустящий и подсоленный — французский, конечно', 'Crispy and salted — French, of course'), price: 14000, kcal: 340, prep: 5, tags: ['hit'], sized: true, extras: ['sauce', 'cheese'], pop: 95 },
  // ---- combos (sample contents and prices)
  { id: 'frans-combo', cat: 'combo', role: 'main', art: { k: 'combo', parts: [{ k: 'burger', layers: ['bun:brioche', 'sauce', 'beef', 'cheese', 'bacon', 'lettuce'] }, { k: 'fries' }, { k: 'soda' }] }, name: n('Frans kombo', 'Комбо Frans', 'Frans combo'), desc: n('Frans burger, fri va gazli ichimlik', 'Frans burger, фри и газировка', 'Frans burger, fries and a soda'), price: 58000, kcal: 1310, prep: 10, tags: ['signature'], pop: 93 },
  { id: 'duo-combo', cat: 'combo', role: 'main', art: { k: 'combo', parts: [{ k: 'burger', layers: ['bun:classic', 'beef', 'cheese', 'lettuce'] }, { k: 'fries' }, { k: 'burger', layers: ['bun:classic', 'beef', 'cheese', 'lettuce'] }] }, name: n('Duet kombo', 'Комбо «Дуэт»', 'Duo combo'), desc: n('Ikki kishilik: ikki chizburger, ikki fri va ikki gazli ichimlik', 'На двоих: два чизбургера, две фри и две газировки', 'For two: two cheeseburgers, two fries and two sodas'), price: 105000, kcal: 2260, prep: 12, pop: 90 },
  { id: 'lavash-combo', cat: 'combo', role: 'main', art: { k: 'combo', parts: [{ k: 'wrap', variant: 'chicken' }, { k: 'fries' }, { k: 'soda' }] }, name: n('Lavash kombo', 'Комбо с лавашом', 'Lavash combo'), desc: n('Tovuqli lavash, fri va gazli ichimlik', 'Лаваш с курицей, фри и газировка', 'Chicken lavash, fries and a soda'), price: 46000, kcal: 1100, prep: 10, pop: 87 },
  // ---- tea
  { id: 'glass-tea', cat: 'tea', role: 'drink', art: D({ v: 'glass', liquid: '#A8481C', layers: ['#A8481C'] }), name: n('Bardak choy', 'Чай в стакане', 'Tea in a glass'), desc: n('Qora yoki koʻk', 'Чёрный или зелёный', 'Black or green'), price: 5000, kcal: 2, prep: 2, pop: 70 },
  { id: 'turkish-tea', cat: 'tea', role: 'drink', art: D({ v: 'glass', liquid: '#8E2F12', layers: ['#8E2F12'] }), name: n('Turkcha choy', 'Турецкий чай', 'Turkish tea'), desc: n('Kuchli, tiniq, qand bilan', 'Крепкий и прозрачный, с сахаром', 'Strong and clear, with sugar'), price: 7000, kcal: 2, prep: 3, pop: 68 },
  { id: 'green-tea', photo: 'photo-1783915817252-1d81ed28ed9d', cat: 'tea', role: 'drink', art: D({ v: 'pot', liquid: '#C9B44C' }), name: n('Koʻk choy, choynak', 'Зелёный чай, чайник', 'Green tea, pot'), desc: n('Piyolada, doʻstlar bilan ulashish uchun', 'С пиалами — на всю компанию', 'With piyolas — for the whole table'), price: 10000, kcal: 0, prep: 3, pop: 82 },
  { id: 'black-tea', photo: 'photo-1637216789852-d2c6d5de6f68', cat: 'tea', role: 'drink', art: D({ v: 'pot', liquid: '#9A4A1C', lemon: true }), name: n('Qora choy, limon bilan', 'Чёрный чай с лимоном', 'Black tea with lemon'), desc: n('Choynakda, limon boʻlakchalari bilan', 'В чайнике, с дольками лимона', 'A pot with lemon slices'), price: 12000, kcal: 5, prep: 3, pop: 66 },
  // ---- coffee
  { id: 'espresso', photo: 'photo-1761210784123-800f8e8a9b63', cat: 'coffee', role: 'drink', art: D({ v: 'small', liquid: C.esp, foam: '#B07A4C' }), name: n('Espresso', 'Эспрессо', 'Espresso'), desc: n('Qisqa, quyuq, kremali', 'Короткий, плотный, с крема', 'Short, dense, with crema'), price: 15000, kcal: 5, prep: 2, extras: ['shot'], pop: 70 },
  { id: 'americano', photo: 'photo-1514432324607-a09d9b4aefdd', cat: 'coffee', role: 'drink', art: D({ v: 'cup', liquid: C.amer, foam: '#7A4B30' }), name: n('Amerikano', 'Американо', 'Americano'), desc: n('Espresso va issiq suv', 'Эспрессо и горячая вода', 'Espresso topped with hot water'), price: 18000, kcal: 10, prep: 3, sized: true, extras: COFFEE_X, pop: 80 },
  { id: 'cappuccino', photo: 'photo-1534778101976-62847782c213', cat: 'coffee', role: 'drink', art: D({ v: 'cup', liquid: C.latte, foam: C.foam, art: 'heart' }), name: n('Kapuchino', 'Капучино', 'Cappuccino'), desc: n('Qalin sut koʻpigi va yurakcha', 'Плотная молочная пена и сердечко', 'Thick milk foam with a heart'), price: 25000, kcal: 120, prep: 4, sized: true, extras: COFFEE_X, tags: ['hit'], pop: 95 },
  { id: 'latte', photo: 'photo-1509042239860-f550ce710b93', cat: 'coffee', role: 'drink', art: D({ v: 'glass', liquid: C.latte, layers: [C.milk, C.latte], foam: C.foam }), name: n('Latte', 'Латте', 'Latte'), desc: n('Koʻp sut, yumshoq taʼm', 'Больше молока, мягкий вкус', 'More milk, softer taste'), price: 27000, kcal: 150, prep: 4, sized: true, extras: COFFEE_X, pop: 90 },
  { id: 'coffee-3in1', cat: 'coffee', role: 'drink', art: D({ v: 'cup', liquid: '#B08060', foam: '#D9B994' }), name: n('Kofe 3 in 1', 'Кофе 3 в 1', 'Coffee 3-in-1'), desc: n('Qora yoki sutli', 'Чёрный или с молоком', 'Black or with milk'), price: 6000, kcal: 70, prep: 2, pop: 66 },
  // ---- soft drinks
  { id: 'soda', photo: 'photo-1629654613528-5d0a2e4166de', cat: 'cold', role: 'drink', art: { k: 'soda' }, name: n('Gazli ichimlik 0,5 L', 'Газированный напиток 0,5 л', 'Soda 0.5 L'), desc: n('Turli xil, muzdek', 'На выбор, холодный', 'Choice of flavours, chilled'), price: 10000, kcal: 210, prep: 1, pop: 60 },
  { id: 'soda-1l', photo: 'photo-1629654613528-5d0a2e4166de', cat: 'cold', role: 'drink', art: { k: 'soda' }, name: n('Gazli ichimlik 1 L', 'Газированный напиток 1 л', 'Soda 1 L'), desc: n('Turli xil, muzdek', 'На выбор, холодный', 'Choice of flavours, chilled'), price: 16000, kcal: 210, prep: 1, pop: 55 },
];

export const ITEM = (id: string) => ITEMS.find(i => i.id === id);
// Stock photos from Unsplash (free licence) until the cafe's own photos are ready.
export const photoURL = (id: string, w: number) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=72`;

export const SIZES = [
  { id: 'S', ml: 250, add: 0 }, { id: 'M', ml: 350, add: 4000 }, { id: 'L', ml: 450, add: 8000 },
];
export const EXTRAS: Record<ExtraId, { name: L10n; price: number }> = {
  shot: { name: n('Qoʻshimcha shot', 'Доп. шот', 'Extra shot'), price: 6000 },
  oat: { name: n('Suli suti', 'Овсяное молоко', 'Oat milk'), price: 5000 },
  syrup: { name: n('Sirop', 'Сироп', 'Syrup'), price: 4000 },
  cream: { name: n('Qaymoq', 'Сливки', 'Whipped cream'), price: 4000 },
  cheese: { name: n('Qoʻshimcha pishloq', 'Доп. сыр', 'Extra cheese'), price: 5000 },
  jalapeno: { name: n('Halapeño', 'Халапеньо', 'Jalapeño'), price: 3000 },
  sauce: { name: n('Sous: sarimsoqli yoki tomatli chili', 'Соус: чесночный или томатный чили', 'Sauce: garlic or tomato chilli'), price: 3000 },
  patty: { name: n('Ikkinchi kotlet', 'Вторая котлета', 'Second patty'), price: 15000 },
};

/* ---------- burger builder ---------- */
export const BUNS = [
  { id: 'classic', name: n('Kunjutli', 'С кунжутом', 'Sesame'), price: 6000, kcal: 150 },
  { id: 'brioche', name: n('Brioch', 'Бриошь', 'Brioche'), price: 8000, kcal: 190 },
];
export const FILLINGS = [
  { id: 'beef', name: n('Mol goʻshti kotleti', 'Говяжья котлета', 'Beef patty'), price: 15000, kcal: 250, prep: 6 },
  { id: 'chicken', name: n('Krispi tovuq', 'Хрустящая курица', 'Crispy chicken'), price: 12000, kcal: 230, prep: 6 },
  { id: 'cheese', name: n('Cheddar', 'Чеддер', 'Cheddar'), price: 4000, kcal: 80, prep: 0 },
  { id: 'bacon', name: n('Mol goʻshti bekoni', 'Говяжий бекон', 'Beef bacon'), price: 6000, kcal: 90, prep: 1 },
  { id: 'egg', name: n('Tuxum', 'Яйцо', 'Fried egg'), price: 4000, kcal: 90, prep: 2 },
  { id: 'lettuce', name: n('Salat bargi', 'Салат', 'Lettuce'), price: 2000, kcal: 5, prep: 0 },
  { id: 'tomato', name: n('Pomidor', 'Томат', 'Tomato'), price: 2000, kcal: 10, prep: 0 },
  { id: 'onion', name: n('Qizil piyoz', 'Красный лук', 'Red onion'), price: 2000, kcal: 15, prep: 0 },
  { id: 'pickles', name: n('Tuzlangan bodring', 'Огурчики', 'Pickles'), price: 2000, kcal: 5, prep: 0 },
  { id: 'sauce', name: n('Frans sousi', 'Соус Frans', 'Frans sauce'), price: 2000, kcal: 60, prep: 0 },
  { id: 'ketchup', name: n('Ketchup', 'Кетчуп', 'Ketchup'), price: 1000, kcal: 20, prep: 0 },
];
export const MAX_FILLINGS = 9;

/* ---------- coffee lab ---------- */
export const LAB = {
  base: 12000, shot: 6000, milk: { none: 0, cow: 4000, oat: 9000, coconut: 9000 } as Record<string, number>,
  syrup: 4000, topping: 3000, iced: 2000,
  milkC: { cow: '#F6EFE6', oat: '#EFE2CC', coconut: '#FAF7F2' } as Record<string, string>,
  syrupC: { lavender: '#F08A8D', caramel: '#C98A3C', vanilla: '#F1DFAE', hazelnut: '#A06A3E', coconut: '#F3EEE6' } as Record<string, string>,
  syrups: ['none', 'caramel', 'vanilla', 'hazelnut'],
  milks: ['none', 'cow', 'oat'],
  toppings: ['none', 'cinnamon', 'cocoa', 'cream'],
};

/* ---------- shawarma & hot dog builders ---------- */
export interface Part { id: string; name: L10n; price: number; kcal: number; c: string }
export const WRAP_BASES: Part[] = [
  { id: 'lavash', name: n('Lavash', 'Лаваш', 'Lavash'), price: 6000, kcal: 180, c: '#F1D39A' },
  { id: 'red', name: n('Qizil lavash', 'Красный лаваш', 'Tomato lavash'), price: 7000, kcal: 185, c: '#E9A27A' },
  { id: 'pita', name: n('Pita non', 'Пита', 'Pita'), price: 7000, kcal: 210, c: '#F4DDAE' },
];
export const WRAP_MEATS: (Part & { dbl: number })[] = [
  { id: 'chicken', name: n('Tovuq', 'Курица', 'Chicken'), price: 15000, kcal: 230, c: '#D9A05A', dbl: 9000 },
  { id: 'beef', name: n('Mol goʻshti', 'Говядина', 'Beef'), price: 20000, kcal: 280, c: '#7A3E1E', dbl: 12000 },
  { id: 'mix', name: n('Aralash', 'Микс', 'Mixed'), price: 18000, kcal: 255, c: '#A8642F', dbl: 11000 },
];
export const WRAP_ADDS: Part[] = [
  { id: 'fries', name: n('Kartoshka fri', 'Картофель фри', 'Fries'), price: 4000, kcal: 120, c: '#F4C542' },
  { id: 'tomato', name: n('Pomidor', 'Помидор', 'Tomato'), price: 2000, kcal: 8, c: '#E5432C' },
  { id: 'cucumber', name: n('Bodring', 'Огурец', 'Cucumber'), price: 2000, kcal: 6, c: '#7DBA3E' },
  { id: 'pickles', name: n('Tuzlangan bodring', 'Солёные огурцы', 'Pickles'), price: 2000, kcal: 6, c: '#8DAF44' },
  { id: 'cabbage', name: n('Karam', 'Капуста', 'Cabbage'), price: 2000, kcal: 10, c: '#D6EDB0' },
  { id: 'carrot', name: n('Koreyscha sabzi', 'Морковь по-корейски', 'Korean carrot'), price: 3000, kcal: 30, c: '#F08A24' },
  { id: 'onion', name: n('Piyoz', 'Лук', 'Onion'), price: 1000, kcal: 8, c: '#DCA0A3' },
  { id: 'cheese', name: n('Pishloq', 'Сыр', 'Cheese'), price: 4000, kcal: 90, c: '#F7B92E' },
];
export const WRAP_SAUCES: Part[] = [
  { id: 'garlic', name: n('Sarimsoqli', 'Чесночный', 'Garlic'), price: 3000, kcal: 60, c: '#FBF4E4' },
  { id: 'spicy', name: n('Tomatli chili', 'Томатный чили', 'Tomato chilli'), price: 3000, kcal: 25, c: '#D8431C' },
  { id: 'ketchup', name: n('Ketchup', 'Кетчуп', 'Ketchup'), price: 1000, kcal: 20, c: '#B71C1C' },
  { id: 'cheese', name: n('Pishloq sousi', 'Сырный', 'Cheese sauce'), price: 2000, kcal: 70, c: '#F4B731' },
];
export const MAX_WRAP_ADDS = 7, MAX_SAUCES = 3, MAX_HD_TOPS = 5;
export const HD_SAUSAGES: Part[] = [
  { id: 'beef', name: n('Mol goʻshti', 'Говяжья', 'Beef'), price: 10000, kcal: 230, c: '#A9452C' },
  { id: 'chicken', name: n('Tovuq', 'Куриная', 'Chicken'), price: 8000, kcal: 190, c: '#D99A6C' },
  { id: 'smoked', name: n('Dudlangan', 'Копчёная', 'Smoked'), price: 11000, kcal: 260, c: '#6E2E18' },
  { id: 'spicy', name: n('Achchiq', 'Острая', 'Spicy'), price: 10000, kcal: 240, c: '#C2381E' },
];
export const HD_XL = 6000;
export const HD_TOPS: Part[] = [
  { id: 'onion', name: n('Qovurilgan piyoz', 'Жареный лук', 'Crispy onion'), price: 2000, kcal: 45, c: '#B9782E' },
  { id: 'pickles', name: n('Tuzlangan bodring', 'Солёные огурцы', 'Pickles'), price: 2000, kcal: 6, c: '#8DAF44' },
  { id: 'cheese', name: n('Cheddar', 'Чеддер', 'Cheddar'), price: 4000, kcal: 80, c: '#F7B92E' },
  { id: 'carrot', name: n('Koreyscha sabzi', 'Морковь по-корейски', 'Korean carrot'), price: 3000, kcal: 30, c: '#F08A24' },
  { id: 'tomato', name: n('Pomidor', 'Помидор', 'Tomato'), price: 2000, kcal: 8, c: '#E5432C' },
  { id: 'bacon', name: n('Mol goʻshti bekoni', 'Говяжий бекон', 'Beef bacon'), price: 6000, kcal: 90, c: '#C0503A' },
];
export const HD_SAUCES: Part[] = [
  { id: 'ketchup', name: n('Ketchup', 'Кетчуп', 'Ketchup'), price: 1000, kcal: 20, c: '#B71C1C' },
  { id: 'mustard', name: n('Xantal', 'Горчица', 'Mustard'), price: 1000, kcal: 10, c: '#E2B11E' },
  { id: 'garlic', name: n('Sarimsoqli', 'Чесночный', 'Garlic mayo'), price: 3000, kcal: 60, c: '#FBF4E4' },
  { id: 'cheese', name: n('Pishloq sousi', 'Сырный', 'Cheese sauce'), price: 2000, kcal: 70, c: '#F4B731' },
  { id: 'bbq', name: n('Barbekyu', 'Барбекю', 'BBQ'), price: 1000, kcal: 30, c: '#5A1E10' },
];

/* ---------- ordering ---------- */
export const ZONES = [
  // free in the city from 100 000; the fees below it and for the districts are placeholders until the shop confirms them
  { id: 'near', name: n('Andijon shahri', 'Город Андижан', 'Andijan city'), fee: 10000, freeFrom: 100000, mins: 12 },
  { id: 'city', name: n('Tumanlar', 'Районы области', 'Districts'), fee: 25000, freeFrom: Infinity, mins: 35 },
];
export const STAMPS_FOR_GIFT = 6;
/** Delivery orders start from this subtotal. */
export const MIN_DELIVERY = 50000;
/** Fridays: every 4 dishes ordered get 1 more on the house. Off until the Frans Burger owner agrees to run it. */
export const FRIDAY_EVERY = 4;
export const FRIDAY_DEAL = false;

/* ---------- hero pair (a random drink + burger set with a discount, new on every visit) ---------- */
export const SET_DISCOUNTS = [10, 12, 15];
export const SET_DRINKS = ['latte', 'cappuccino', 'americano'];
export const SET_BURGERS = ['frans-burger', 'classic-burger', 'cheeseburger', 'chicken-burger'];
export function setFull(d: string, b: string) { const di = ITEM(d)!, bi = ITEM(b)!; return di.price + (di.sized ? SIZES[1].add : 0) + bi.price; }
export function setPrice(d: string, b: string, pct: number) { return Math.round((setFull(d, b) * (100 - pct)) / 100 / 500) * 500; }

/* ---------- dietary labels (sample data — the cafe must confirm every dish before launch) ---------- */
export type Allergen = 'nuts' | 'gluten' | 'lactose';
const VEG_EXTRA = ['fries', 'cheese-fries'];
const NUTS = ['almond-croissant'];
const GLUTEN_CATS: CatId[] = ['sweet', 'chicken', 'burger', 'lavash', 'hotdog'];
const GLUTEN = ['duo-combo', 'lavash-combo', 'frans-combo'];
const LACTOSE = ['violette-latte', 'cappuccino', 'latte', 'flat-white', 'raf', 'mocha', 'iced-violette', 'iced-latte', 'frappe', 'matcha', 'cocoa',
  'croissant', 'almond-croissant', 'cheesecake', 'tiramisu', 'medovik', 'violette-burger', 'cheeseburger', 'double-beef', 'lavash-cheese', 'club', 'pizza-slice', 'cheese-fries', 'triple-cheese', 'frans-burger', 'double-frans', 'egg-burger', 'duo-combo', 'frans-combo'];
export const isVeg = (i: Item) => ['coffee', 'cold', 'tea', 'sweet'].includes(i.cat) || VEG_EXTRA.includes(i.id);
export const isSpicy = (i: Item) => (i.tags ?? []).includes('spicy');
export function allergens(i: Item): Allergen[] {
  const out: Allergen[] = [];
  if (NUTS.includes(i.id)) out.push('nuts');
  if (GLUTEN_CATS.includes(i.cat) || GLUTEN.includes(i.id)) out.push('gluten');
  if (LACTOSE.includes(i.id)) out.push('lactose');
  return out;
}
