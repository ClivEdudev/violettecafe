# Frans Burger — website

Burger shop website for Frans Burger, Andijan (Plus Code Q944+3J5; street address to be confirmed).
Built from the FFS site (the FFS version is kept on the `ffs` branch, Violette on `violette`).
Zero-dependency static site written in TypeScript, in Uzbek, Russian and English.

## What it does
- **Scroll-driven hero**, drawn to look real in one scene, with a **new random pair on every visit**: one of 8 drinks (latte, cappuccino, mocha, raf, iced latte, iced matcha — each with its own layers, foam, latte art, ice or whipped cream) and one of 5 burgers (built from that burger's real recipe), plus a random pair discount of 10, 12 or 15%. The glass fills layer by layer, the burger drops onto a plate, a discount sticker pops on and a receipt prints the prices, discount and total. "Get this pair" adds it to the cart as one discounted set (`SET_*` and `setPrice` in `src/data.ts`; the discount is a proposal — confirm with the owner).
- **Two-world menu**: a Coffee & sweets / Fast food switch floods the screen with liquid and re-colours the site (violet for coffee, ketchup red for food). Opens on coffee before noon and on food after, by Tashkent time. Category chips, search across all three languages, item dialog with sizes (S/M/L) and extras.
- **Build your own** (`src/lab.ts`):
  - Burger stacker: pick a bun, drop up to 9 fillings (the top bun hops up and lands back), undo, clear, "Surprise me". Live price, calories, prep time, height in cm and an auto-generated name.
  - Coffee lab: hot or iced, size, espresso shots, milk type and amount, foam, syrup, topping. The cup pours as you choose; strength and sweetness meters, calories, price and the drink's name (latte, flat white, macchiato…) update live.
- **Burger fortune / Burger fol** (`src/fortune.ts`, replaces "Will it fit my budget?"): four quick questions (mood, hunger, taste, who you eat with). Every answer drops a real layer onto a burger on a starry stage; the top bun lands at the end. The visitor gets their burger of the day with a playful name ("Parisian XXL burger"), a silly prediction (same answers on the same day give the same one), a one-time gift code `FRANS-XXXX` (free Frans sauce if they order that burger within 7 days), one upsell matched to their company (fries / Duo combo / chicken box) and a **story card** (1080×1920 PNG drawn on a canvas, tagged @fransburger with the site link) shared through the phone's share sheet or downloaded. The burger goes to the cart as a builder burger (same prices as the constructor), and the gift code appears on that cart line and in the kitchen's Telegram order, so the owner can count orders that came from it. **The free-sauce gift is a proposal — confirm with the owner.**
- **Comforts** (from research on what fast-food customers want): a heart on every dish and a **Favourites** chip; **Repeat my last order** in the menu and the cart (one tap); **diet and allergen labels** on dishes (V vegetarian, G gluten, L dairy, N nuts) with filters for vegetarian, no nuts, no gluten, no lactose and spicy — the allergen data in `src/data.ts` is **sample data the cafe must confirm**; the **delivery fee is shown in the cart** before checkout, with a bar to free delivery.
- **Away screen** (`src/afk.ts`): after 50 seconds without activity, a calm kitchen scene fades in over the site. Sardor, the cook (human proportions, natural elbow bends, expressions, blinking, eyes following his busy hand), makes a latte, a classic burger (a patty flip that goes a little too high, an argument with the ketchup) and a chicken lavash (rolled with too much confidence). When a dish is served, **Enter** (or a tap on the button on phones) adds it to the cart; any other touch, key, scroll or real mouse move brings the site back. Off with reduced motion. Preview with `?afk=5` (start after 5 s) and `&afkt=22` (jump into the loop).
- **Build your own — shawarma & hot dog** (`src/lab2.ts`): next to the burger and coffee stations. Shawarma: lavash, tomato lavash or pita; chicken, beef or mixed, regular or double meat; up to 7 fillings (fries, tomato, cucumber, pickles, cabbage, Korean carrot, onion, cheese, jalapeño) and up to 3 sauces, all laid on the open lavash seen from above — it rolls itself up into Frans Burger paper when added. Hot dog: four buns, four sausages, regular or XL, up to 5 toppings and 3 sauces, drawn from the side. Name, price, calories and prep time update live; custom wraps and hot dogs show in the cart, the order form and the kitchen show.
- **Watch your order** — optional, on the order-confirmation screen: the same cook makes the customer's exact order, dish by dish (×qty and ETA on the chalkboard), until they close it (× or Esc). Every dish is built from its recipe by a small routine engine: coffee by drink, size, extra shots, milk (steamed / cold / oat / coconut), syrup, latte-art pattern and topping, including Coffee Lab recipes; burgers layer by layer from the menu recipe plus extras (cheese, jalapeño, sauce, extra patty) or the Burger Builder spec (any bun, any number of patties); lavash with beef or chicken, cheese, jalapeño, spicy sauce, pita without fries; fryer items (fries, cheese fries, nuggets); plated hot dogs, sandwiches, pizza and desserts with their own garnish; lemonades and soda over ice; tea poured back the Uzbek way; combos and sets as their parts.
- **Delivery tracking** (`src/track.ts`): after a delivery order is sent, a pulsing "Track delivery" pill appears in the bottom-left corner of every page — only while that delivery is running (from when the kitchen starts until 20 minutes after the promised time; a scheduled delivery appears when cooking starts). It opens a tracker with the stage (received → being made → courier picking up → on the way → almost there), a live countdown, a map with the courier moving along the route and the distance left, a "watch it being made" link while cooking, a contact button and "I've got it". The order-confirmation screen has a "Track delivery" button too. There is no courier GPS behind the site, so stages are estimated from the order time, prep time and the zone's ride time, and the tracker says so. Delivery ETAs now include the ride time. Preview with `?trackdemo` or `?trackdemo=27` (27 minutes in).
- **Cart**: saved in the browser, **split the bill** between 2–8 friends (tap a dish to assign it, the rest is shared), ready-time estimate, a coffee stamp card (every 6th coffee free — **a proposal; confirm with the owner before launch**).
- **Checkout** in 3 steps: pick up (time slot), delivery (zones with free-delivery threshold, address) or **to my table** — opening the site with `?stol=7` (QR code on table 7) switches to table ordering. Payment chosen on the spot: cash, card, Click/Payme. Nothing is charged online.
- **Table booking** with dates in dd/mm/yyyy, time chips and guest count.
- **Scroll motion** (`src/scroll.ts`): headings slide in, menu cards flip up in 3D column by column, the builders and map open with a reveal, the booking card and fortune stage straighten as they arrive, the slot machine swings in, coffee beans drift behind the page at different speeds, the ticker tape leans with scroll speed and the footer word tightens at the end. Off with reduced motion.
- Live open/closed badge and greeting by Tashkent time, light/dark theme (night scene with neon sign), reduced-motion support.
- **Cursor**: the normal system cursor (the custom pointer in `src/ui.ts` is switched off; `initPointer` is no longer called).
- Orders and table bookings are posted to the shop's **Telegram group** by `netlify/functions/telegram.mjs` (`/api/telegram`). A copy also goes to **Netlify Forms** (forms `order` and `booking`) as a backup; the visitor sees success if either one lands.
- The hero picks one sample deal per visit (Frans combo, Duo combo, Lavash combo, chicken box + 1 L soda, Double Frans set, French hot-dog set, doner set, spicy wings + tea) and builds it on the tray as you scroll; the receipt and the button show exactly that deal. `?deal=frans|duo|lavash|box|double|hotdog|doner|spicy` forces one. Deals live in `src/hero.ts`.

## Telegram group setup (one time)
1. In Telegram open **@BotFather** → `/newbot` → pick a name → copy the token.
2. Add the bot to the shop's order group (as admin, or turn off privacy mode in BotFather with `/setprivacy` → Disable), then send any message in the group.
3. Netlify → Site configuration → Environment variables: add `TELEGRAM_BOT_TOKEN` = the token. Redeploy.
4. Open `https://<site>/api/telegram` — it lists the groups the bot has seen. Copy the group's id (like `-1001234567890`) into `TELEGRAM_CHAT_ID`. Redeploy.
5. Opening `/api/telegram` again shows `"ready": true`. Place a test order.

## Edit content
- Menu, prices, phone, socials, hours, delivery zones: `src/data.ts` (prices, phone and hours are **placeholders** — replace with the cafe's real data).
- Texts in all three languages: `src/i18n.ts`.
- Photos: each dish in `src/data.ts` has a `photo` id from Unsplash (free licence, loaded from images.unsplash.com). Replace them with the cafe's own photos before launch — put the files in `public/img/` and change `photoURL` in `src/data.ts`. If a photo fails to load, the drawn illustration from `src/art.ts` is shown instead.
- Illustrations: `src/art.ts` — realistic burger layers and coffee glass (gradients, texture filters, gloss, soft shadows from `REAL_DEFS`) used by the builders, plus fallbacks for the hero and menu photos.

## Build and deploy
```
npm run build      # needs the TypeScript compiler (tsc)
```
Netlify publishes the `dist` folder as-is (see `netlify.toml`, which also sets the security headers). Netlify site: `ffsand` (ffsand.netlify.app), auto-deploys from `main`.

## Ordering hours
"As soon as possible" is offered until 30 minutes before closing. When the cafe is closed, checkout only offers the first times after opening (tomorrow's when today is over), the cart says so, and table orders are refused until opening. Change the hours in `CAFE.open` / `CAFE.close` (`src/data.ts`).

## Placeholders to replace
- `CAFE.phone` in `src/data.ts` — while it holds the `XX` placeholder the site shows the Telegram link instead of a phone number.
- Prices for the shawarma and hot-dog builders (`WRAP_*`, `HD_*` in `src/data.ts`).

## Light mode (on for every device)
The owner wants speed over show, so `src/perf.ts` turns light mode on for every visitor (there is no Full/Light switch any more; `?lite=0` brings full mode back for testing only).

- **Kept at full quality:** the main animations — the hero deal being built on the tray, the kitchen show, and the burger, lavash, hot-dog and coffee builders (textures and shadows included, full frame rate).
- **Calmer:** scroll effects. Instead of slides, 3D flips and tilts recalculated on every scroll frame, each block simply fades up once as it comes into view (one IntersectionObserver, no scroll loop). The floating sesame seeds, decorative loops, blur and the shadows/textures outside the main scenes are off.

## Shop details
Frans Burger, Andijan, Plus Code Q944+3J5 (40.75514, 72.35661). Brand on the site: French blue `#1F3FBF` (drinks world, packaging), tomato red `#E63329` (food world), cream background; logo is a burger wearing a beret (`public/favicon.svg`, also inline in `index.html`) — a placeholder until the shop's own logo arrives.

## Still to confirm with the owner
- Real menu, prices, calories and prep times (everything in `src/data.ts` is sample data), and real photos.
- Phone (`CAFE.phone` holds the `XX` placeholder, so the site shows the Telegram link instead), Telegram and Instagram handles (`fransburger` is a guess), street address.
- Opening hours (placeholder 10:00–23:00, last order 22:40) and delivery: minimum order, fees and free-delivery threshold (`ZONES`, `MIN_DELIVERY` still carry the FFS values).
- Halal status (not claimed on the site).
- Proposals to approve: Burger-fortune free sauce, coffee stamp card. FFS's Friday 4+1 deal is switched off (`FRIDAY_DEAL` in `src/data.ts`).
- Domain; then make `og:image` an absolute URL.

## Busy hours: what protects the orders

- **Kitchen commands** (type them in the orders group): `/pauza` stops new online orders (the site says Frans Burger is busy), `/davom` reopens, `/kutish 15` adds 15 minutes to every time the site promises (`/kutish 0` removes it), `/holat` shows the current state and how many orders nobody has accepted yet.
- **Nothing gets lost when Telegram is slow or down**: the order is saved first; if Telegram refuses it, `netlify/functions/watch.mjs` (runs every minute) posts it as soon as Telegram takes messages again. The customer still gets an honest "sent, waiting for the kitchen".
- **Missed orders**: if nobody presses "Qabul qilish" within 4 minutes, the bot replies to that order in the group, and again every 5 minutes.
- **No duplicates**: order numbers are random (`F` + 5 characters, no 0/O/1/I), and a retry of the same order is recognised and never posted twice. Two cooks pressing the same button at once count once.
- **Shared Wi-Fi in the cafe**: limits are 6 orders per phone number and 200 per network per 10 minutes.
- **Group upgraded by Telegram** (its id changes): the bot follows the new id by itself; `/api/telegram` shows a note so you can update `TELEGRAM_CHAT_ID`.
- **Backup chat** (optional): set `TELEGRAM_BACKUP_CHAT_ID` (for example the owner's own chat with the bot); orders go there if the main group refuses them.
- **Netlify Forms** only receives an order when the bot can't, so its monthly quota isn't used up.
- Telegram lets a bot post about **20 messages a minute in one group** (button presses count too). Above that the queue takes over; if the shop regularly gets more than that, split deliveries into a second group.

## Slow connections

Measured locally on a simulated slow 3G line (400 ms per request, 400 kbit/s) — first visit / repeat visit:

| | before | after |
|---|---|---|
| menu readable | 4.5 s / 2.3 s | 1.3 s / 0.6 s |
| page usable | 4.5 s / 2.3 s | 3.3 s / 0.6 s |
| requests | 17 / 17 | 7 / 7 (repeat: nothing downloaded) |

(Google Fonts couldn't be reached from the test machine, so the real "before" was slower than shown.)

What does it:
- **Build** (`npm run build` → `scripts/build.mjs`): esbuild bundles and minifies; file names carry a content hash and live in `/assets`, which `netlify.toml` lets browsers keep for a year. The idle show, the builders and the tracker are separate files loaded only when needed. `dist/` is still committed; Netlify just publishes it.
- **Fonts** are served from this site (`public/fonts`, cut to the characters the site uses — 49 KB for both; OFL licences alongside), no Google Fonts.
- **The menu is written into the page** (`scripts/prerender.mjs`, needs Playwright on the build machine; `NO_PRERENDER=1` skips it) so dishes and prices show before the scripts arrive. The loading logo steps aside after 6 s even if the scripts are still on their way.
- **Offline copy** (`public/sw.js`): the site stays on the phone; repeat visits open instantly and the menu works with no internet. Pages are checked with the network for 3 s first, so price changes still arrive. `/api/*` is never cached.
- **Orders survive a dropped connection**: if sending fails for lack of internet, the order is kept on the phone and sent automatically when the connection returns — even after the page was closed — with the same order number (the bot never posts it twice). The kitchen sees "Mijozda internet yoʻq edi — buyurtma N daqiqa kechikib keldi". After an hour it's dropped with a message to order again. Meanwhile the customer can call or copy the order text. What they type in checkout is saved as they type.
- **Weak-connection mode**: on 2G / data saver (or if the page took over 6 s to start) a short notice shows, decorative motion is off, the idle show only loads once the visitor is actually idle, and order-status checks happen half as often. With no internet a banner says so.
- **Photos**: put originals in `/photos` (named after the dish id) and run `npm run photos` — it makes 480 px and 960 px WebP versions plus a blurred preview; `photoHTML()` in `shared.ts` gives a lazy-loading `<img>` for a dish.
