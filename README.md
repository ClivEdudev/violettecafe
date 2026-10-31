# Violette cafe — website

Coffee shop and fast-food website for Violette cafe, Andijan (Plus Code P8WQ+PW, full code 8JGJP8WQ+PW).
Zero-dependency static site written in TypeScript, in Uzbek, Russian and English.

## What it does
- **Scroll-driven hero** built from real photos: the drink photo fills with colour from the bottom like a pour (steam rises when it's full), then the burger photo is stacked slice by slice from the top of the screen, and a receipt prints with the pair's price ("Get this pair" adds both). If the photos can't load, a drawn version of the same animation plays instead.
- **Two-world menu**: a Coffee & sweets / Fast food switch floods the screen with liquid and re-colours the site (violet for coffee, ketchup red for food). Opens on coffee before noon and on food after, by Tashkent time. Category chips, search across all three languages, item dialog with sizes (S/M/L) and extras.
- **Build your own** (`src/lab.ts`):
  - Burger stacker: pick a bun, drop up to 9 fillings (the top bun hops up and lands back), undo, clear, "Surprise me". Live price, calories, prep time, height in cm and an auto-generated name.
  - Coffee lab: hot or iced, size, espresso shots, milk type and amount, foam, syrup, topping. The cup pours as you choose; strength and sweetness meters, calories, price and the drink's name (latte, flat white, macchiato…) update live.
- **"Will it fit my budget?"** (`src/budget.ts`): enter money and number of people, pick fast food / coffee / both, pull the slot machine — every person gets a filling set within the budget, with total and change, and one tap adds everything.
- **Cart**: saved in the browser, **split the bill** between 2–8 friends (tap a dish to assign it, the rest is shared), ready-time estimate, a coffee stamp card (every 6th coffee free — **a proposal; confirm with the owner before launch**).
- **Checkout** in 3 steps: pick up (time slot), delivery (zones with free-delivery threshold, address) or **to my table** — opening the site with `?stol=7` (QR code on table 7) switches to table ordering. Payment chosen on the spot: cash, card, Click/Payme. Nothing is charged online.
- **Table booking** with dates in dd/mm/yyyy, time chips and guest count.
- Live open/closed badge and greeting by Tashkent time, light/dark theme (night scene with neon sign), coffee-bean cursor companion on desktop, reduced-motion support.
- Orders go to **Netlify Forms** (form `order`), bookings to form `booking`. Add email notifications in Netlify → Forms so the cafe gets each one.

## Edit content
- Menu, prices, phone, socials, hours, delivery zones: `src/data.ts` (prices, phone and hours are **placeholders** — replace with the cafe's real data).
- Texts in all three languages: `src/i18n.ts`.
- Photos: each dish in `src/data.ts` has a `photo` id from Unsplash (free licence, loaded from images.unsplash.com). Replace them with the cafe's own photos before launch — put the files in `public/img/` and change `photoURL` in `src/data.ts`. If a photo fails to load, the drawn illustration from `src/art.ts` is shown instead.
- Illustrations: `src/art.ts` — realistic burger layers and coffee glass (gradients, texture filters, gloss, soft shadows from `REAL_DEFS`) used by the builders, plus fallbacks for the hero and menu photos.
- Hero photos: `HERO_PHOTOS` in `src/main.ts`.

## Build and deploy
```
npm run build      # needs the TypeScript compiler (tsc)
```
Netlify publishes the `dist` folder as-is (see `netlify.toml`, which also sets the security headers). Netlify site: `violettecafeand` (violettecafeand.netlify.app), auto-deploys from this repo.
