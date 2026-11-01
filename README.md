# Violette cafe — website

Coffee shop and fast-food website for Violette cafe, Andijan (Plus Code P8WQ+PW, full code 8JGJP8WQ+PW).
Zero-dependency static site written in TypeScript, in Uzbek, Russian and English.

## What it does
- **Scroll-driven hero**, drawn to look real in one scene, with a **new random pair on every visit**: one of 8 drinks (Violette latte, latte, cappuccino, mocha, raf, iced latte, iced Violette, iced matcha — each with its own layers, foam, latte art, ice or whipped cream) and one of 5 burgers (built from that burger's real recipe), plus a random pair discount of 10, 12 or 15%. The glass fills layer by layer, the burger drops onto a plate, a discount sticker pops on and a receipt prints the prices, discount and total. "Get this pair" adds it to the cart as one discounted set (`SET_*` and `setPrice` in `src/data.ts`; the discount is a proposal — confirm with the owner).
- **Two-world menu**: a Coffee & sweets / Fast food switch floods the screen with liquid and re-colours the site (violet for coffee, ketchup red for food). Opens on coffee before noon and on food after, by Tashkent time. Category chips, search across all three languages, item dialog with sizes (S/M/L) and extras.
- **Build your own** (`src/lab.ts`):
  - Burger stacker: pick a bun, drop up to 9 fillings (the top bun hops up and lands back), undo, clear, "Surprise me". Live price, calories, prep time, height in cm and an auto-generated name.
  - Coffee lab: hot or iced, size, espresso shots, milk type and amount, foam, syrup, topping. The cup pours as you choose; strength and sweetness meters, calories, price and the drink's name (latte, flat white, macchiato…) update live.
- **"Will it fit my budget?"** (`src/budget.ts`): a live budget tracker. Enter the money and how many people (1–10), then tap dishes: each price flies off and is subtracted, the meter shows what's left (and goes red if over), dishes that no longer fit are marked with how much more they'd need, and each person's share of the bill is shown. "Fill at random" fills the rest of the budget with a filling set per person; one tap adds everything to the cart. On phones the meter stays pinned while you scroll the dishes.
- **Comforts** (from research on what fast-food customers want): a heart on every dish and a **Favourites** chip; **Repeat my last order** in the menu and the cart (one tap); **diet and allergen labels** on dishes (V vegetarian, G gluten, L dairy, N nuts) with filters for vegetarian, no nuts, no gluten, no lactose and spicy — the allergen data in `src/data.ts` is **sample data the cafe must confirm**; the **delivery fee is shown in the cart** before checkout, with a bar to free delivery.
- **Away screen** (`src/afk.ts`): after 15 seconds without activity, a calm kitchen scene fades in over the site. Sardor, the cook (human proportions, natural elbow bends, expressions, blinking, eyes following his busy hand), makes a latte, a classic burger (a patty flip that goes a little too high, an argument with the ketchup) and a chicken lavash (rolled with too much confidence). When a dish is served, **Enter** (or a tap on the button on phones) adds it to the cart; any other touch, key, scroll or real mouse move brings the site back. Off with reduced motion. Preview with `?afk=5` (start after 5 s) and `&afkt=22` (jump into the loop).
- **Build your own — shawarma & hot dog** (`src/lab2.ts`): next to the burger and coffee stations. Shawarma: lavash, tomato lavash or pita; chicken, beef or mixed, regular or double meat; up to 7 fillings (fries, tomato, cucumber, pickles, cabbage, Korean carrot, onion, cheese, jalapeño) and up to 3 sauces, all laid on the open lavash seen from above — it rolls itself up into Violette paper when added. Hot dog: four buns, four sausages, regular or XL, up to 5 toppings and 3 sauces, drawn from the side. Name, price, calories and prep time update live; custom wraps and hot dogs show in the cart, the order form and the kitchen show.
- **Watch your order** — optional, on the order-confirmation screen: the same cook makes the customer's exact order, dish by dish (×qty and ETA on the chalkboard), until they close it (× or Esc). Every dish is built from its recipe by a small routine engine: coffee by drink, size, extra shots, milk (steamed / cold / oat / coconut), syrup, latte-art pattern and topping, including Coffee Lab recipes; burgers layer by layer from the menu recipe plus extras (cheese, jalapeño, sauce, extra patty) or the Burger Builder spec (any bun, any number of patties); lavash with beef or chicken, cheese, jalapeño, spicy sauce, pita without fries; fryer items (fries, cheese fries, nuggets); plated hot dogs, sandwiches, pizza and desserts with their own garnish; lemonades and soda over ice; tea poured back the Uzbek way; combos and sets as their parts.
- **Delivery tracking** (`src/track.ts`): after a delivery order is sent, a pulsing "Track delivery" pill appears in the bottom-left corner of every page — only while that delivery is running (from when the kitchen starts until 20 minutes after the promised time; a scheduled delivery appears when cooking starts). It opens a tracker with the stage (received → being made → courier picking up → on the way → almost there), a live countdown, a map with the courier moving along the route and the distance left, a "watch it being made" link while cooking, a contact button and "I've got it". The order-confirmation screen has a "Track delivery" button too. There is no courier GPS behind the site, so stages are estimated from the order time, prep time and the zone's ride time, and the tracker says so. Delivery ETAs now include the ride time. Preview with `?trackdemo` or `?trackdemo=27` (27 minutes in).
- **Cart**: saved in the browser, **split the bill** between 2–8 friends (tap a dish to assign it, the rest is shared), ready-time estimate, a coffee stamp card (every 6th coffee free — **a proposal; confirm with the owner before launch**).
- **Checkout** in 3 steps: pick up (time slot), delivery (zones with free-delivery threshold, address) or **to my table** — opening the site with `?stol=7` (QR code on table 7) switches to table ordering. Payment chosen on the spot: cash, card, Click/Payme. Nothing is charged online.
- **Table booking** with dates in dd/mm/yyyy, time chips and guest count.
- **Scroll motion** (`src/scroll.ts`): headings slide in, menu cards flip up in 3D column by column, the builders and map open with a reveal, the booking card and budget form straighten as they arrive, the slot machine swings in, coffee beans drift behind the page at different speeds, the ticker tape leans with scroll speed and the footer word tightens at the end. Off with reduced motion.
- Live open/closed badge and greeting by Tashkent time, light/dark theme (night scene with neon sign), reduced-motion support.
- **Cursor & pointer comfort** (`src/ui.ts`, same system as the Robiya site): on mouse/trackpad a coffee-bean pointer replaces the system arrow, an outline frames what you're about to use (a whole menu card shows "Details"), and near-miss clicks beside small controls still count — never for add, remove, spin or send buttons.
- Orders go to **Netlify Forms** (form `order`), bookings to form `booking`. Add email notifications in Netlify → Forms so the cafe gets each one.

## Edit content
- Menu, prices, phone, socials, hours, delivery zones: `src/data.ts` (prices, phone and hours are **placeholders** — replace with the cafe's real data).
- Texts in all three languages: `src/i18n.ts`.
- Photos: each dish in `src/data.ts` has a `photo` id from Unsplash (free licence, loaded from images.unsplash.com). Replace them with the cafe's own photos before launch — put the files in `public/img/` and change `photoURL` in `src/data.ts`. If a photo fails to load, the drawn illustration from `src/art.ts` is shown instead.
- Illustrations: `src/art.ts` — realistic burger layers and coffee glass (gradients, texture filters, gloss, soft shadows from `REAL_DEFS`) used by the builders, plus fallbacks for the hero and menu photos.

## Build and deploy
```
npm run build      # needs the TypeScript compiler (tsc)
```
Netlify publishes the `dist` folder as-is (see `netlify.toml`, which also sets the security headers). Netlify site: `violettecafeand` (violettecafeand.netlify.app), auto-deploys from this repo.

## Ordering hours
"As soon as possible" is offered until 30 minutes before closing. When the cafe is closed, checkout only offers the first times after opening (tomorrow's when today is over), the cart says so, and table orders are refused until opening. Change the hours in `CAFE.open` / `CAFE.close` (`src/data.ts`).

## Placeholders to replace
- `CAFE.phone` in `src/data.ts` — while it holds the `XX` placeholder the site shows the Telegram link instead of a phone number.
- Prices for the shawarma and hot-dog builders (`WRAP_*`, `HD_*` in `src/data.ts`).

## Light mode (slower devices)
`src/perf.ts` decides between full and light animations. Light mode is chosen automatically when the device reports Data Saver, a slow connection or little memory, when the first seconds on screen run slowly, or when scrolling keeps dropping frames (a short notice tells the visitor). Visitors can choose Auto / Full / Light at the bottom of the page; `?lite=1` and `?lite=0` force it for testing.

Light mode keeps every feature but skips what costs the most to draw: SVG textures and soft shadows, blur, scroll-linked effects, the floating coffee beans, endlessly repeating decorative animations and the custom cursor; builder pieces drop in as one group and the kitchen show runs at 30 fps.

Measured on a simulated low-end phone (CPU slowed 6×): idle 30–40 → 60 fps, menu scrolling ~16 → ~54 fps, hero scrolling ~16 → ~37 fps, kitchen show ~20 → ~37 fps, shawarma builder ~15 → ~45 fps. Full mode also got cheaper: scroll effects no longer re-read the page layout or restyle whole sections on every frame.

