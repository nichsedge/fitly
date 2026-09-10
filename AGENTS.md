# AGENTS.md — Guidelines for Fitly

> Autonomous coding agent guidelines for **Fitly** — Local-first digital wardrobe & outfit manager.

---

## 🏛️ Ecosystem Role & Data Boundaries

Fitly is a specialized domain recorder in the workstation's Personal Data Architecture ([`~/Projects/DATA_ARCHITECTURE.md`](file:///home/al/Projects/DATA_ARCHITECTURE.md)):

- **Primary Domain**: Wardrobe clothing items, categories, style tags, custom outfits, laundry tracking, calendar wear history, trips packing lists, and minimalism/KonMari audit.
- **Storage**:
  - **Android**: Local Room SQLite (`fitly_db`) + high-res images in internal storage (`files/images/`).
  - **Web**: Local browser IndexedDB (`idb`).
- **Boundaries**:
  - **Clothing vs. Tech Gadgets**: Apparel, shoes, and outfits belong in `fitly`. Electronic devices and tech hardware belong in `ierp gadgets`.
  - **Financial Transactions**: Clothing purchases and costs belong in `sansfinance` (daily expenses) or `ierp receipts`. Do NOT build full accounting/banking ledgers inside Fitly.
  - **Unstructured Style Notes**: General fashion essays, philosophy, or personal style manifestos belong in `digital-graveyard/content/`.

---

## 🛠️ Stack & Modules

Fitly consists of two presentation interfaces backed by standard SQLite / IndexedDB:

### 1. 📱 Native Android App (`android/`)
- **Stack**: Kotlin 2.x, Jetpack Compose Material 3, Room SQLite (`fitly_db` v2), Coil 3.1, Coroutines.
- **Features (100% Parity with Web)**:
  - **Wardrobe**: Filter by category (tops, bottoms, shoes, etc.), live search, real photo grid with color swatches, wear count, and status badges.
  - **Item Detail & Edit**: View full specs, photo capture/gallery replacement, Cost-Per-Wear calculation (`price / wearCount`), spark joy status, care info, status toggle (ready/dirty/cleaning), and retirement workflow.
  - **Outfit Builder & Detail**: Compose outfits with visual category-based piece picker; "Wear Outfit" automatically logs wear for the outfit and all composed items.
  - **Laundry Tracker**: Separate tabs for Dirty, Cleaning, and Clean with one-tap "Mark Washed" and "Wash All" batch actions.
  - **Calendar & History**: Monthly interactive calendar marking active wear and wash days, daily breakdown, and manual wear logging.
  - **Trips & Packing**: Trip itinerary management with packing checklists, checkboxes, and real-time progress bars.
  - **Analytics & Minimalism**: KonMari Spark Joy audit, Cost-Per-Wear leaderboard, and unworn dust collectors list (>60 days inactive).
- **Data Backup & Cloud Parity**:
  - **In-App ZIP Archive**: Export and import complete `.zip` archives (database + `images/*`) directly via Android document pickers.
  - **Cloudflare R2**: Automated zero-dependency AWS SigV4 signed sync to `db/fitly_latest.sqlite` in bucket `ichsanul-dev`.
- **Commands**:
  ```bash
  cd android
  make build   # Build debug APK (app/build/outputs/apk/debug/app-debug.apk)
  make run     # Build and deploy to connected Android phone (via ADB)
  ```

### 2. 🌐 Web Application (`./`)
- **Runtime**: Bun
- **Framework**: Next.js (App Router), React 19, Tailwind CSS, IndexedDB (`idb`).
- **Commands**:
  ```bash
  bun install
  bun run dev    # Local dev server (Port 3001)
  bun run lint
  bun run build  # Static export
  ```

---

## 🤖 Agent Guidelines

1. **Zero Dummy Data**: Strictly use real wardrobe items restored from real backups (49 real items, 8 outfits, 47 images). No dummy or placeholder records.
2. **Local-First & Privacy First**: All catalog data must remain client-side in Room (Android) or IndexedDB (Web).
3. **Cloudflare R2 Parity with Sans Finance**: Cloud backups use AWS SigV4 directly to Cloudflare R2 (`db/fitly_latest.sqlite`). Keep this implementation standard and zero-dependency.
4. **Deterministic Modern Code**: Use modern Kotlin / Jetpack Compose and Next.js App Router patterns with zero legacy shims.
