# 👗 Fitly

A modern, privacy-focused digital wardrobe, personal style intelligence engine, and outfit manager.

Fitly combines a **Workstation Style Agent & CLI** (integrated with iERP timeline events and digital-graveyard knowledge vault) with an **offline-first Android companion app** (Kotlin 2.x + Jetpack Compose Material 3 + Room SQLite).

---

## ⚡ Workstation Style Agent & CLI

Fitly features a native workstation intelligence CLI (`fitly` / `scripts/fitly_agent.py`) designed to teach fashion theory, solve color/proportion coordination, audit capsule gaps, and recommend daily outfits based on your actual `ierp` agenda.

```bash
# View wardrobe valuation, category breakdown, CPW, and dust collectors
fitly status

# List all saved outfits and wear counts
fitly outfits

# Create a new outfit combination directly from the terminal
fitly add-outfit --name "Earthy Minimalist" --items "T-Shirt Manly, Chinos Brown, Jim Joker"

# Get AI outfit recommendation tailored to today's iERP events & dress code
fitly recommend
fitly recommend --context smart-casual

# Log wear for an outfit (auto-increments outfit AND all constituent items) or single item
fitly wear "Earthy Minimalist"
fitly wear "Boxy T-Shirt"

# Run capsule wardrobe gap analysis (identifies missing anchor pieces)
fitly audit

# Export Personal Style Manifesto & Capsule Inventory to digital-graveyard
fitly export-style

# Bidirectional Cloudflare R2 Sync (pure Python AWS SigV4)
fitly sync pull
fitly sync push
```

---

## 📱 Android Client Features

- 👕 **Wardrobe Catalog**: Real photo grid, live search, category filtering (tops, bottoms, outerwear, shoes, accessories, bags, underwear), color swatches, storage location filtering (Kos vs. Rumah), and wear count tracking.
- 🔍 **Item Detail & Edit**: View full specs, edit metadata, camera & gallery photo replacement, Cost-Per-Wear calculation (`price / wearCount`), condition, and care instructions.
- 🎨 **Outfit Builder & Search**: Compose outfits with visual category piece picker and location filtering, search by name, and custom sort (Recently Created, Oldest, Name A-Z, Most Worn, Recently Worn, Most Items); "Wear Outfit" automatically logs wear for both the outfit and each individual piece.
- 🧺 **Laundry Tracker**: Track dirty, cleaning, and clean items with one-tap "Mark Washed" and batch "Wash All" actions.
- 📅 **Calendar & Wear History**: Monthly calendar grid highlighting days with wear or wash logs, day detail breakdown, and manual wear logging.
- 🧳 **Trips & Packing**: Plan trips, assign packing lists, track packed items with checkboxes and progress bars.
- 📊 **Minimalism & Capsule Analytics**: KonMari audit (Spark Joy, Daily Essentials, Candidates to Release), Cost-Per-Wear ranking leaderboard, and unworn dust collectors list (>60 days inactive).
- ☁️ **Cloudflare R2 & ZIP Backups**: In-app configurable R2 credentials dialog (AWS SigV4 zero-dependency sync to `db/fitly_latest.sqlite` in `ichsanul-dev` with automated SQLite WAL checkpointing) plus full-fidelity in-app ZIP export/import.

---

## 🛠️ Build & Run Commands

```bash
# Style Agent CLI (via uv)
make status        # Wardrobe asset valuation, CPW, and wear status
make recommend     # Intelligent outfit recommendations tailored to iERP events
make audit         # Capsule wardrobe gap audit
make export-style  # Export style guide to digital-graveyard
make sync-pull     # Pull latest snapshot from Cloudflare R2
make sync-push     # Push local changes to Cloudflare R2

# Android Build & Test Targets
make build         # Build debug APK (app/build/outputs/apk/debug/app-debug.apk)
make release       # Build lightweight minified APK (app/build/outputs/apk/release/app-release.apk)
make test          # Run unit test suite (SigV4 signing, CPW math, backup fidelity)
make run           # Build, deploy, and launch on connected Android phone via ADB
make clean         # Clean build artifacts
```
