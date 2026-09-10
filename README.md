# 👗 Fitly

A modern, privacy-focused digital wardrobe, outfit manager, and minimalism tracker built as a native Android app (Kotlin + Jetpack Compose + Room) and Next.js web application.

---

## 📱 Native Android App (`android/`)

The native Android app provides a local-first mobile client with 100% feature parity:

- 👕 **Wardrobe Catalog**: Real photo grid, live search, category filtering (tops, bottoms, outerwear, shoes, accessories, bags, underwear), color swatches, and wear count tracking.
- 🔍 **Item Detail & Edit**: View full specs, edit metadata, camera & gallery photo replacement, Cost-Per-Wear calculation (`price / wearCount`), condition, and care instructions.
- 🎨 **Outfit Builder & Wear Logging**: Select items grouped by category to build outfits; "Wear Outfit" automatically logs wear for both the outfit and each individual clothing piece.
- 🧺 **Laundry Tracker**: Track dirty, cleaning, and clean items with one-tap "Mark Washed" and batch "Wash All" actions.
- 📅 **Calendar & Wear History**: Monthly calendar grid highlighting days with wear or wash logs, day detail breakdown, and manual wear logging.
- 🧳 **Trips & Packing**: Plan trips, assign packing lists, track packed items with checkboxes and progress bars.
- 📊 **Minimalism & Capsule Analytics**: KonMari audit (Spark Joy, Daily Essentials, Candidates to Release), Cost-Per-Wear ranking leaderboard, and unworn dust collectors list (>60 days inactive).
- ☁️ **Cloudflare R2 & ZIP Backups**: Zero-dependency AWS SigV4 signed backups to Cloudflare R2 (`db/fitly_latest.sqlite` in `ichsanul-dev`) plus in-app complete ZIP export/import (database + images).

### Running Android App

```bash
cd android
make build   # Build debug APK
make run     # Deploy and run on connected Android phone via ADB
```

---

## 🌐 Web Application (`./`)

- **Framework**: Next.js 15 (App Router), React 19, Tailwind CSS, IndexedDB (`idb`)
- **Commands**:
  ```bash
  bun install
  bun run dev    # Local dev server on http://localhost:3001
  bun run test   # Run Vitest test suite
  ```
