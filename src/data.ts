import type { ArtSpec, DrinkSpec } from './art.js';

export type Lang = 'uz' | 'ru' | 'en';
export type L10n = Record<Lang, string>;
export type World = 'coffee' | 'food';
export type CatId = 'coffee' | 'cold' | 'tea' | 'sweet' | 'burger' | 'lavash' | 'hotdog' | 'sides' | 'combo';
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
  name: 'Violette',
  phone: '+998 XX XXX XX XX', // TODO: real phone from the cafe
  telegram: 'violette_cafe',   // TODO: confirm handle
  instagram: 'violette.cafe',  // TODO: confirm handle
  plus: 'P8WQ+PW', plusFull: '8JGJP8WQ+PW', lat: 40.74681, lng: 72.33981,
  open: 8, close: 23, // hours placeholder, Tashkent time
};

export const CATS: { id: CatId; world: World; name: L10n }[] = [
  { id: 'coffee', world: 'coffee', name: n('Issiq kofe', 'Горячий кофе', 'Hot coffee') },
  { id: 'cold', world: 'coffee', name: n('Muzdek ichimliklar', 'Холодные напитки', 'Cold drinks') },
  { id: 'tea', world: 'coffee', name: n('Choy va kakao', 'Чай и какао', 'Tea & cocoa') },
  { id: 'sweet', world: 'coffee', name: n('Shirinlik va pishiriq', 'Десерты и выпечка', 'Desserts & bakery') },
  { id: 'burger', world: 'food', name: n('Burgerlar', 'Бургеры', 'Burgers') },
  { id: 'lavash', world: 'food', name: n('Lavash va shaurma', 'Лаваш и шаурма', 'Lavash & shawarma') },
  { id: 'hotdog', world: 'food', name: n('Hot-dog va sendvich', 'Хот-доги и сэндвичи', 'Hot dogs & sandwiches') },
  { id: 'sides', world: 'food', name: n('Gazaklar', 'Закуски', 'Sides') },
  { id: 'combo', world: 'food', name: n('Kombo', 'Комбо', 'Combos') },
];

const C = { esp: '#3A1F14', amer: '#4A2A1A', latte: '#C69C72', foam: '#F1E3CF', milk: '#F6EFE6', raf: '#E8D2B0', matcha: '#8DB255', lav: '#B79AD8', mocha: '#5C3524', cocoa: '#6B3E2A' };
const COFFEE_X: ExtraId[] = ['shot', 'oat', 'syrup'];
const FOOD_X: ExtraId[] = ['cheese', 'jalapeno', 'sauce'];

export const ITEMS: Item[] = [
  // ---- hot coffee
  { id: 'violette-latte', photo: 'photo-1485808191679-5f86510681a2', cat: 'coffee', role: 'drink', art: D({ v: 'glass', liquid: C.lav, layers: [C.lav, C.latte, C.lav], foam: '#EFE4F8', dust: '#7A4FB0' }), name: n('Violette latte', 'Violette латте', 'Violette latte'), desc: n('Lavanda siropi, espresso va baxmal sut — uyimizning imzo ichimligi', 'Лавандовый сироп, эспрессо и бархатное молоко — наш фирменный напиток', 'Lavender syrup, espresso and velvet milk — our signature drink'), price: 32000, kcal: 190, prep: 5, tags: ['signature', 'hit'], sized: true, extras: COFFEE_X, pop: 100 },
  { id: 'espresso', photo: 'photo-1761210784123-800f8e8a9b63', cat: 'coffee', role: 'drink', art: D({ v: 'small', liquid: C.esp, foam: '#B07A4C' }), name: n('Espresso', 'Эспрессо', 'Espresso'), desc: n('Qisqa, quyuq, kremali', 'Короткий, плотный, с крема', 'Short, dense, with crema'), price: 15000, kcal: 5, prep: 2, extras: ['shot'], pop: 70 },
  { id: 'americano', photo: 'photo-1514432324607-a09d9b4aefdd', cat: 'coffee', role: 'drink', art: D({ v: 'cup', liquid: C.amer, foam: '#7A4B30' }), name: n('Amerikano', 'Американо', 'Americano'), desc: n('Espresso va issiq suv', 'Эспрессо и горячая вода', 'Espresso topped with hot water'), price: 18000, kcal: 10, prep: 3, sized: true, extras: COFFEE_X, pop: 80 },
  { id: 'cappuccino', photo: 'photo-1534778101976-62847782c213', cat: 'coffee', role: 'drink', art: D({ v: 'cup', liquid: C.latte, foam: C.foam, art: 'heart' }), name: n('Kapuchino', 'Капучино', 'Cappuccino'), desc: n('Qalin sut koʻpigi va yurakcha', 'Плотная молочная пена и сердечко', 'Thick milk foam with a heart'), price: 25000, kcal: 120, prep: 4, sized: true, extras: COFFEE_X, tags: ['hit'], pop: 95 },
  { id: 'latte', photo: 'photo-1509042239860-f550ce710b93', cat: 'coffee', role: 'drink', art: D({ v: 'glass', liquid: C.latte, layers: [C.milk, C.latte], foam: C.foam }), name: n('Latte', 'Латте', 'Latte'), desc: n('Koʻp sut, yumshoq taʼm', 'Больше молока, мягкий вкус', 'More milk, softer taste'), price: 27000, kcal: 150, prep: 4, sized: true, extras: COFFEE_X, pop: 90 },
  { id: 'flat-white', photo: 'photo-1502462041640-b3d7e50d0662', cat: 'coffee', role: 'drink', art: D({ v: 'cup', liquid: C.latte, foam: '#E2C7A3', art: 'rosetta' }), name: n('Flet uayt', 'Флэт уайт', 'Flat white'), desc: n('Ikki shot va yupqa koʻpik', 'Двойной шот и тонкая пена', 'Double shot, thin foam'), price: 26000, kcal: 110, prep: 4, extras: COFFEE_X, pop: 72 },
  { id: 'raf', photo: 'photo-1632845407875-10b4d85e6bf8', cat: 'coffee', role: 'drink', art: D({ v: 'cup', liquid: C.raf, foam: '#F7EAD6', art: 'tulip' }), name: n('Vanilli raf', 'Раф ванильный', 'Vanilla raf'), desc: n('Qaymoq bilan koʻpirtirilgan kofe', 'Кофе, взбитый со сливками', 'Coffee whipped with cream'), price: 30000, kcal: 240, prep: 5, sized: true, extras: COFFEE_X, pop: 86 },
  { id: 'mocha', photo: 'photo-1718267050202-9b1b6bfb8545', cat: 'coffee', role: 'drink', art: D({ v: 'glass', liquid: C.mocha, layers: [C.mocha, C.latte], cream: true, dust: '#3A1F14' }), name: n('Mokko', 'Мокко', 'Mocha'), desc: n('Shokolad, espresso va qaymoq', 'Шоколад, эспрессо и сливки', 'Chocolate, espresso and whipped cream'), price: 30000, kcal: 290, prep: 5, sized: true, extras: COFFEE_X, pop: 75 },
  // ---- cold
  { id: 'iced-violette', photo: 'photo-1778430397340-2ca8a57675b3', cat: 'cold', role: 'drink', art: D({ v: 'iced', liquid: C.lav, layers: [C.lav, C.latte, '#EFE4F8'], straw: '#F4B731' }), name: n('Muzdek Violette', 'Айс Violette', 'Iced Violette'), desc: n('Lavanda, espresso va muz', 'Лаванда, эспрессо и лёд', 'Lavender, espresso and ice'), price: 34000, kcal: 180, prep: 4, tags: ['signature', 'new'], sized: true, extras: COFFEE_X, pop: 92 },
  { id: 'iced-latte', photo: 'photo-1461023058943-07fcbe16d735', cat: 'cold', role: 'drink', art: D({ v: 'iced', liquid: C.latte, layers: [C.milk, C.latte, C.esp] }), name: n('Ays latte', 'Айс латте', 'Iced latte'), desc: n('Sovuq sut ustida espresso', 'Эспрессо поверх холодного молока', 'Espresso over cold milk'), price: 29000, kcal: 140, prep: 3, sized: true, extras: COFFEE_X, pop: 84 },
  { id: 'frappe', photo: 'photo-1637178035575-b0dcbd28a09b', cat: 'cold', role: 'drink', art: D({ v: 'iced', liquid: '#C89A66', layers: ['#B98654', '#D9B288'], cream: true, dust: '#8A4B1F', straw: '#E2452F' }), name: n('Karamel frappe', 'Фраппе карамель', 'Caramel frappe'), desc: n('Muz bilan maydalangan kofe, karamel', 'Кофе, взбитый со льдом, карамель', 'Blended iced coffee with caramel'), price: 33000, kcal: 320, prep: 5, sized: true, pop: 78 },
  { id: 'matcha', photo: 'photo-1749280447307-31a68eb38673', cat: 'cold', role: 'drink', art: D({ v: 'iced', liquid: C.matcha, layers: [C.milk, C.matcha], straw: '#7A4FB0' }), name: n('Ays matcha latte', 'Айс матча латте', 'Iced matcha latte'), desc: n('Yapon matchasi va sovuq sut', 'Японская матча и холодное молоко', 'Japanese matcha and cold milk'), price: 32000, kcal: 160, prep: 4, sized: true, extras: ['oat', 'syrup'], pop: 74 },
  { id: 'lemonade', photo: 'photo-1523677011781-c91d1bbe2f9e', cat: 'cold', role: 'drink', art: D({ v: 'glass', liquid: '#F4E06A', layers: ['#F4E06A'], ice: true, lemon: true, straw: '#F4B731' }), name: n('Klassik limonad', 'Классический лимонад', 'Classic lemonade'), desc: n('Limon, yalpiz va gazli suv', 'Лимон, мята и газированная вода', 'Lemon, mint and sparkling water'), price: 20000, kcal: 90, prep: 2, sized: true, pop: 70 },
  { id: 'berry-lemonade', photo: 'photo-1573500883698-e3ef47a95feb', cat: 'cold', role: 'drink', art: D({ v: 'glass', liquid: '#E05A8A', layers: ['#B8336A', '#E05A8A'], ice: true, berry: true, straw: '#7A4FB0' }), name: n('Rezavor limonad', 'Ягодный лимонад', 'Berry lemonade'), desc: n('Malina, qulupnay va muz', 'Малина, клубника и лёд', 'Raspberry, strawberry and ice'), price: 22000, kcal: 110, prep: 2, sized: true, pop: 76 },
  { id: 'soda', photo: 'photo-1629654613528-5d0a2e4166de', cat: 'cold', role: 'drink', art: { k: 'soda' }, name: n('Gazli ichimlik 0,5', 'Газированный напиток 0,5', 'Soda 0.5 L'), desc: n('Muzdek, bankada', 'Холодный, в банке', 'Chilled, in a can'), price: 10000, kcal: 210, prep: 1, pop: 60 },
  // ---- tea
  { id: 'green-tea', photo: 'photo-1783915817252-1d81ed28ed9d', cat: 'tea', role: 'drink', art: D({ v: 'pot', liquid: '#C9B44C' }), name: n('Koʻk choy, choynak', 'Зелёный чай, чайник', 'Green tea, pot'), desc: n('Piyolada, doʻstlar bilan ulashish uchun', 'С пиалами — на всю компанию', 'With piyolas — for the whole table'), price: 10000, kcal: 0, prep: 3, pop: 82 },
  { id: 'black-tea', photo: 'photo-1637216789852-d2c6d5de6f68', cat: 'tea', role: 'drink', art: D({ v: 'pot', liquid: '#9A4A1C', lemon: true }), name: n('Qora choy, limon bilan', 'Чёрный чай с лимоном', 'Black tea with lemon'), desc: n('Choynakda, limon boʻlakchalari bilan', 'В чайнике, с дольками лимона', 'A pot with lemon slices'), price: 12000, kcal: 5, prep: 3, pop: 66 },
  { id: 'cocoa', photo: 'photo-1637572815755-c4b80092dce1', cat: 'tea', role: 'drink', art: D({ v: 'cup', liquid: C.cocoa, foam: '#8A5A3B', mallow: true }), name: n('Kakao, zefir bilan', 'Какао с маршмеллоу', 'Cocoa with marshmallows'), desc: n('Issiq shokoladli sut', 'Горячее шоколадное молоко', 'Hot chocolate milk'), price: 22000, kcal: 260, prep: 4, sized: true, pop: 68 },
  // ---- sweet
  { id: 'croissant', photo: 'photo-1530610476181-d83430b64dcd', cat: 'sweet', role: 'sweet', art: { k: 'croissant' }, name: n('Sariyogʻli kruassan', 'Круассан сливочный', 'Butter croissant'), desc: n('Har tong yangi pishiriladi', 'Выпекаем каждое утро', 'Baked fresh every morning'), price: 16000, kcal: 270, prep: 2, pop: 85 },
  { id: 'almond-croissant', photo: 'photo-1763207291761-e27bb059d851', cat: 'sweet', role: 'sweet', art: { k: 'croissant', variant: 'almond' }, name: n('Bodomli kruassan', 'Миндальный круассан', 'Almond croissant'), desc: n('Bodom kremi va yongʻoq parchalari', 'Миндальный крем и лепестки', 'Almond cream and flakes'), price: 22000, kcal: 380, prep: 2, tags: ['new'], pop: 74 },
  { id: 'cheesecake', photo: 'photo-1533134242443-d4fd215305ad', cat: 'sweet', role: 'sweet', art: { k: 'cheesecake' }, name: n('Rezavor cheesecake', 'Чизкейк с ягодами', 'Berry cheesecake'), desc: n('Nyu-York usulida, rezavor sous bilan', 'Нью-Йорк, с ягодным соусом', 'New York style, berry sauce'), price: 28000, kcal: 410, prep: 2, tags: ['hit'], pop: 90 },
  { id: 'tiramisu', photo: 'photo-1571877227200-a0d98ea607e9', cat: 'sweet', role: 'sweet', art: { k: 'tiramisu' }, name: n('Tiramisu', 'Тирамису', 'Tiramisu'), desc: n('Maskarpone va espresso', 'Маскарпоне и эспрессо', 'Mascarpone and espresso'), price: 30000, kcal: 450, prep: 2, pop: 80 },
  { id: 'medovik', photo: 'photo-1605138693981-6c8a5ea87796', cat: 'sweet', role: 'sweet', art: { k: 'medovik' }, name: n('Medovik', 'Медовик', 'Honey cake'), desc: n('Asalli qatlamlar va qaymoq', 'Медовые коржи и сметанный крем', 'Honey layers and sour-cream frosting'), price: 25000, kcal: 420, prep: 2, pop: 83 },
  // ---- burgers
  { id: 'violette-burger', photo: 'photo-1626111724770-6080b0d4118e', cat: 'burger', role: 'main', art: { k: 'burger', layers: ['bun:violet', 'sauce', 'beef', 'cheese', 'onion', 'lettuce'] }, name: n('Violette burger', 'Violette бургер', 'Violette burger'), desc: n('Binafsha bulochka, mol goʻshti, cheddar, marinadlangan piyoz', 'Фиолетовая булочка, говядина, чеддер, маринованный лук', 'Violet bun, beef, cheddar, pickled onion'), price: 49000, kcal: 640, prep: 12, tags: ['signature', 'new'], extras: [...FOOD_X, 'patty'], pop: 97 },
  { id: 'classic-burger', photo: 'photo-1568901346375-23c9450c58cd', cat: 'burger', role: 'main', art: { k: 'burger', layers: ['bun:classic', 'ketchup', 'beef', 'tomato', 'lettuce'] }, name: n('Klassik burger', 'Классический бургер', 'Classic burger'), desc: n('Mol goʻshti kotleti, pomidor, salat', 'Говяжья котлета, томат, салат', 'Beef patty, tomato, lettuce'), price: 35000, kcal: 520, prep: 10, extras: [...FOOD_X, 'patty'], pop: 88 },
  { id: 'cheeseburger', photo: 'photo-1667329829058-ac191ba4a905', cat: 'burger', role: 'main', art: { k: 'burger', layers: ['bun:classic', 'beef', 'cheese', 'pickles', 'ketchup'] }, name: n('Chizburger', 'Чизбургер', 'Cheeseburger'), desc: n('Erigan cheddar va tuzlangan bodring', 'Плавленый чеддер и огурчики', 'Melted cheddar and pickles'), price: 38000, kcal: 580, prep: 10, extras: [...FOOD_X, 'patty'], pop: 90 },
  { id: 'double-beef', photo: 'photo-1572802419224-296b0aeee0d9', cat: 'burger', role: 'main', art: { k: 'burger', layers: ['bun:brioche', 'beef', 'cheese', 'beef', 'cheese', 'onion'] }, name: n('Double beef', 'Дабл биф', 'Double beef'), desc: n('Ikki kotlet, ikki cheddar — chinakam ochlar uchun', 'Две котлеты, два чеддера — для голодных', 'Two patties, two cheddars — for the truly hungry'), price: 55000, kcal: 890, prep: 13, tags: ['hit'], extras: FOOD_X, pop: 94 },
  { id: 'chicken-burger', photo: 'photo-1637710847214-f91d99669e18', cat: 'burger', role: 'main', art: { k: 'burger', layers: ['bun:classic', 'sauce', 'chicken', 'lettuce', 'tomato'] }, name: n('Krispi tovuq burger', 'Бургер с хрустящей курицей', 'Crispy chicken burger'), desc: n('Qarsildoq tovuq filesi va oq sous', 'Хрустящее куриное филе и белый соус', 'Crispy chicken fillet and white sauce'), price: 36000, kcal: 560, prep: 11, extras: FOOD_X, pop: 86 },
  // ---- lavash
  { id: 'lavash-chicken', photo: 'photo-1762284513008-08f897ff5041', cat: 'lavash', role: 'main', art: { k: 'wrap', variant: 'chicken' }, name: n('Tovuqli lavash', 'Лаваш с курицей', 'Chicken lavash'), desc: n('Tovuq, fri, pomidor, bodring va sous', 'Курица, фри, томат, огурец и соус', 'Chicken, fries, tomato, cucumber and sauce'), price: 32000, kcal: 610, prep: 8, tags: ['hit'], extras: FOOD_X, pop: 99 },
  { id: 'lavash-beef', photo: 'photo-1529006557810-274b9b2fc783', cat: 'lavash', role: 'main', art: { k: 'wrap', variant: 'beef' }, name: n('Goʻshtli lavash', 'Лаваш с говядиной', 'Beef lavash'), desc: n('Mol goʻshti, fri va sarimsoqli sous', 'Говядина, фри и чесночный соус', 'Beef, fries and garlic sauce'), price: 36000, kcal: 660, prep: 9, extras: FOOD_X, pop: 91 },
  { id: 'lavash-cheese', photo: 'photo-1719282432114-45fd6c6df642', cat: 'lavash', role: 'main', art: { k: 'wrap', variant: 'cheese' }, name: n('Pishloqli lavash', 'Сырный лаваш', 'Cheese lavash'), desc: n('Ikki xil pishloq bilan, choʻziladigan', 'С двумя сырами — тянется', 'Two cheeses — stretchy'), price: 38000, kcal: 720, prep: 9, extras: FOOD_X, pop: 89 },
  { id: 'lavash-spicy', photo: 'photo-1719282431565-3b30bb7d2658', cat: 'lavash', role: 'main', art: { k: 'wrap', variant: 'spicy' }, name: n('Achchiq lavash', 'Острый лаваш', 'Spicy lavash'), desc: n('Halapeño va achchiq sous', 'Халапеньо и острый соус', 'Jalapeño and hot sauce'), price: 35000, kcal: 630, prep: 8, tags: ['spicy'], extras: FOOD_X, pop: 84 },
  { id: 'shaurma-pita', photo: 'photo-1676300187347-6f60002fd83e', cat: 'lavash', role: 'main', art: { k: 'pita' }, name: n('Non ichida shaurma', 'Шаурма в пите', 'Shawarma in pita'), desc: n('Yangi non, goʻsht va sabzavotlar', 'Свежая пита, мясо и овощи', 'Fresh pita, meat and vegetables'), price: 33000, kcal: 580, prep: 8, extras: FOOD_X, pop: 80 },
  // ---- hot dogs
  { id: 'hotdog', photo: 'photo-1638368593249-7cadb261e8b3', cat: 'hotdog', role: 'main', art: { k: 'hotdog' }, name: n('Klassik hot-dog', 'Классический хот-дог', 'Classic hot dog'), desc: n('Mol goʻshti sosiskasi, ketchup va xantal', 'Говяжья сосиска, кетчуп и горчица', 'Beef sausage, ketchup and mustard'), price: 18000, kcal: 380, prep: 5, extras: FOOD_X, pop: 82 },
  { id: 'french-hotdog', photo: 'photo-1619538189873-3f511db5fec6', cat: 'hotdog', role: 'main', art: { k: 'hotdog', variant: 'french' }, name: n('Fransuzcha hot-dog', 'Французский хот-дог', 'French hot dog'), desc: n('Ichi kovak bagetda, sous bilan', 'В багете с соусом внутри', 'Inside a baguette with sauce'), price: 20000, kcal: 400, prep: 5, pop: 78 },
  { id: 'club', photo: 'photo-1553909489-cd47e0907980', cat: 'hotdog', role: 'main', art: { k: 'club' }, name: n('Klab sendvich', 'Клаб сэндвич', 'Club sandwich'), desc: n('Tovuq, tuxum, pishloq va sabzavotlar', 'Курица, яйцо, сыр и овощи', 'Chicken, egg, cheese and vegetables'), price: 34000, kcal: 540, prep: 8, pop: 76 },
  // ---- sides
  { id: 'fries', photo: 'photo-1630384060421-cb20d0e0649d', cat: 'sides', role: 'side', art: { k: 'fries' }, name: n('Kartoshka fri', 'Картофель фри', 'French fries'), desc: n('Qarsildoq, tuzli', 'Хрустящий, подсоленный', 'Crispy and salted'), price: 15000, kcal: 340, prep: 5, tags: ['hit'], extras: ['sauce', 'cheese'], pop: 95 },
  { id: 'cheese-fries', photo: 'photo-1761934051063-1b3ea9516ed7', cat: 'sides', role: 'side', art: { k: 'fries', variant: 'cheese' }, name: n('Pishloqli fri', 'Фри с сырным соусом', 'Cheese fries'), desc: n('Ustida issiq pishloq sousi', 'Под горячим сырным соусом', 'Under hot cheese sauce'), price: 20000, kcal: 470, prep: 6, pop: 82 },
  { id: 'nuggets', photo: 'photo-1562967914-608f82629710', cat: 'sides', role: 'side', art: { k: 'nuggets' }, name: n('Naggetslar, 6 dona', 'Наггетсы, 6 шт', 'Nuggets, 6 pcs'), desc: n('Tovuq filesi, sous tanlovi bilan', 'Куриное филе, соус на выбор', 'Chicken fillet, sauce of choice'), price: 25000, kcal: 300, prep: 6, extras: ['sauce'], pop: 86 },
  { id: 'pizza-slice', photo: 'photo-1779832291336-bdd93c5d0bcd', cat: 'sides', role: 'side', art: { k: 'pizza' }, name: n('Pitsa boʻlagi', 'Кусок пиццы', 'Pizza slice'), desc: n('Mol goʻshti kolbasasi va mozzarella', 'Говяжья колбаса и моцарелла', 'Beef pepperoni and mozzarella'), price: 18000, kcal: 290, prep: 4, pop: 74 },
  // ---- combos
  { id: 'combo-lunch', photo: 'photo-1763689389824-dd2cea2e5772', cat: 'combo', role: 'main', art: { k: 'combo', parts: [{ k: 'burger', layers: ['bun:classic', 'beef', 'cheese', 'lettuce'] }, { k: 'fries' }, { k: 'soda' }] }, name: n('Tushlik kombosi', 'Комбо «Обед»', 'Lunch combo'), desc: n('Chizburger, fri va gazli ichimlik', 'Чизбургер, фри и газировка', 'Cheeseburger, fries and a soda'), price: 55000, kcal: 1130, prep: 10, tags: ['hit'], pop: 96 },
  { id: 'combo-friends', photo: 'photo-1773620494884-940e0db95e46', cat: 'combo', role: 'main', art: { k: 'combo', parts: [{ k: 'wrap', variant: 'chicken' }, { k: 'wrap', variant: 'beef' }] }, name: n('Ikki doʻst', 'Комбо «Два друга»', 'Two friends combo'), desc: n('2 lavash, katta fri va 2 limonad', '2 лаваша, большой фри и 2 лимонада', '2 lavash, large fries and 2 lemonades'), price: 109000, kcal: 2100, prep: 10, pop: 88 },
  { id: 'combo-morning', photo: 'photo-1763647872237-c76e660cf38b', cat: 'combo', role: 'main', art: { k: 'combo', parts: [{ k: 'croissant' }, { k: 'drink', d: { v: 'cup', liquid: '#C69C72', foam: '#F1E3CF', art: 'heart' } }] }, name: n('Ertalabki kombo', 'Утреннее комбо', 'Morning combo'), desc: n('Kruassan va kapuchino, soat 11:00 gacha', 'Круассан и капучино, до 11:00', 'Croissant and cappuccino, until 11:00'), price: 36000, kcal: 390, prep: 4, tags: ['new'], pop: 85 },
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
  sauce: { name: n('Qoʻshimcha sous', 'Доп. соус', 'Extra sauce'), price: 3000 },
  patty: { name: n('Ikkinchi kotlet', 'Вторая котлета', 'Second patty'), price: 15000 },
};

/* ---------- burger builder ---------- */
export const BUNS = [
  { id: 'classic', name: n('Kunjutli', 'С кунжутом', 'Sesame'), price: 6000, kcal: 150 },
  { id: 'brioche', name: n('Brioch', 'Бриошь', 'Brioche'), price: 8000, kcal: 190 },
  { id: 'violet', name: n('Binafsha', 'Фиолетовая', 'Violet'), price: 9000, kcal: 160 },
  { id: 'black', name: n('Qora', 'Чёрная', 'Black'), price: 9000, kcal: 160 },
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
  { id: 'jalapeno', name: n('Halapeño', 'Халапеньо', 'Jalapeño'), price: 3000, kcal: 5, prep: 0 },
  { id: 'sauce', name: n('Violette sousi', 'Соус Violette', 'Violette sauce'), price: 2000, kcal: 60, prep: 0 },
  { id: 'ketchup', name: n('Ketchup', 'Кетчуп', 'Ketchup'), price: 1000, kcal: 20, prep: 0 },
];
export const MAX_FILLINGS = 9;

/* ---------- coffee lab ---------- */
export const LAB = {
  base: 12000, shot: 6000, milk: { none: 0, cow: 4000, oat: 9000, coconut: 9000 } as Record<string, number>,
  syrup: 4000, topping: 3000, iced: 2000,
  milkC: { cow: '#F6EFE6', oat: '#EFE2CC', coconut: '#FAF7F2' } as Record<string, string>,
  syrupC: { lavender: '#B79AD8', caramel: '#C98A3C', vanilla: '#F1DFAE', hazelnut: '#A06A3E', coconut: '#F3EEE6' } as Record<string, string>,
  syrups: ['none', 'lavender', 'caramel', 'vanilla', 'hazelnut'],
  milks: ['none', 'cow', 'oat', 'coconut'],
  toppings: ['none', 'cinnamon', 'cocoa', 'cream'],
};

/* ---------- ordering ---------- */
export const ZONES = [
  { id: 'near', name: n('Yaqin hudud (3 km gacha)', 'Рядом (до 3 км)', 'Nearby (up to 3 km)'), fee: 7000, freeFrom: 120000, mins: 25 },
  { id: 'city', name: n('Andijon shahri', 'Город Андижан', 'Andijan city'), fee: 12000, freeFrom: 200000, mins: 40 },
];
export const STAMPS_FOR_GIFT = 6;
