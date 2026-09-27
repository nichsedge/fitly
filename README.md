# 👗 Fitly

A modern, privacy-focused digital wardrobe, outfit manager, and minimalism tracker built as a native Android app (Kotlin 2.x + Jetpack Compose Material 3 + Room SQLite).

> ℹ️ The legacy Next.js web application has been archived to the [`web-archive`](https://github.com/nichsedge/fitly/tree/web-archive) branch. The `master` branch is dedicated exclusively to the native Android client.

---

## 📱 Features

- 👕 **Wardrobe Catalog**: Real photo grid, live search, category filtering (tops, bottoms, outerwear, shoes, accessories, bags, underwear), color swatches, storage location filtering (Kos vs. Rumah), and wear count tracking.
- 🔍 **Item Detail & Edit**: View full specs, edit metadata, camera & gallery photo replacement, Cost-Per-Wear calculation (`price / wearCount`), condition, and care instructions.
- 🎨 **Outfit Builder & Search**: Compose outfits with visual category piece picker and location filtering, search by name, and custom sort (Recently Created, Oldest, Name A-Z, Most Worn, Recently Worn, Most Items); "Wear Outfit" automatically logs wear for both the outfit and each individual piece.
- 🧺 **Laundry Tracker**: Track dirty, cleaning, and clean items with one-tap "Mark Washed" and batch "Wash All" actions.
- 📅 **Calendar & Wear History**: Monthly calendar grid highlighting days with wear or wash logs, day detail breakdown, and manual wear logging.
- 🧳 **Trips & Packing**: Plan trips, assign packing lists, track packed items with checkboxes and progress bars.
- 📊 **Minimalism & Capsule Analytics**: KonMari audit (Spark Joy, Daily Essentials, Candidates to Release), Cost-Per-Wear ranking leaderboard, and unworn dust collectors list (>60 days inactive).
- 🎨 **Material You & Fluid Navigation**: System wallpaper dynamic color extraction (Android 12+), edge-to-edge rendering, persistent bottom bar, and stack-based tab navigation.
- ☁️ **Cloudflare R2 & ZIP Backups**: In-app configurable R2 credentials dialog (AWS SigV4 zero-dependency sync to `db/fitly_latest.sqlite` in `ichsanul-dev`) plus in-app complete ZIP export/import (database + images).

---

## 🛠️ Build & Run Commands

```bash
make build     # Build debug APK (app/build/outputs/apk/debug/app-debug.apk)
make release   # Build lightweight minified APK (app/build/outputs/apk/release/app-release.apk)
make run       # Build, deploy, and launch on connected Android phone via ADB
make clean     # Clean build artifacts
```
