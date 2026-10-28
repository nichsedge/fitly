# AGENTS.md — Guidelines for Fitly

> Autonomous coding agent guidelines for **Fitly** — Local-first digital wardrobe & outfit manager (Native Android).

---

## 🏛️ Ecosystem Role & Data Boundaries

Fitly is a specialized domain recorder in the workstation's Personal Data Architecture ([`~/Projects/DATA_ARCHITECTURE.md`](file:///home/al/Projects/DATA_ARCHITECTURE.md)):

- **Primary Domain**: Wardrobe clothing items, categories, style tags, custom outfits, laundry tracking, calendar wear history, trips packing lists, and minimalism/KonMari audit.
- **Storage**:
  - **Android**: Local Room SQLite (`fitly_db` v2) + high-res images in internal storage (`files/images/`).
  - **Cloud**: Automated zero-dependency AWS SigV4 signed sync to Cloudflare R2 (`db/fitly_latest.sqlite` in `ichsanul-dev`).
- **Boundaries**:
  - **Clothing vs. Tech Gadgets**: Apparel, shoes, and outfits belong in `fitly`. Electronic devices and tech hardware belong in `ierp gadgets`.
  - **Financial Transactions**: Clothing purchases and costs belong in `sansfinance` (daily expenses) or `ierp receipts`. Do NOT build full accounting/banking ledgers inside Fitly.
  - **Unstructured Style Notes**: General fashion essays, philosophy, or personal style manifestos belong in `digital-graveyard/content/`.

---

## 🛠️ Stack & Modules

Fitly operates as a dual-interface architecture sharing a single SQLite SSOT:

### ⚡ Workstation Style Agent & CLI (`scripts/fitly_agent.py` / `~/.local/bin/fitly`)
- **Stack**: Python 3.12+ (zero third-party dependencies, standard library only), SQLite WAL, AWS SigV4.
- **Role**: Fashion education, intelligent styling, wardrobe gap audits, daily outfit recommendations linked to iERP timeline context, and direct export to `digital-graveyard`.
- **Commands**:
  ```bash
  fitly status                      # Valuation, wear counts, CPW, and dust collectors
  fitly recommend [--context ...]   # Daily outfit suggestions tailored to iERP events
  fitly wear "<item_or_outfit>"     # Quick terminal wear logging
  fitly audit                       # Capsule gap & palette analysis
  fitly export-style                # Export Style Manifesto to digital-graveyard
  fitly sync [pull|push]            # Cloudflare R2 AWS SigV4 bidirectional sync
  ```

### 📱 Native Android Companion App (`./app/`)
- **Stack**: Kotlin 2.x, Jetpack Compose Material 3, Room SQLite (`fitly_db` v2), Coil 3.6, Coroutines.
- **Role**: On-the-go visual catalog browser, camera photo replacement, and in-app backup/restore.
- **Commands**:
  ```bash
  make build     # Build debug APK (app/build/outputs/apk/debug/app-debug.apk)
  make release   # Build lightweight minified APK (app/build/outputs/apk/release/app-release.apk)
  make test      # Run local JVM unit tests (SigV4 signing, CPW math, backup fidelity)
  make run       # Build and deploy to connected Android phone (via ADB)
  make clean     # Clean build cache
  ```

---

## 🤖 Agent Guidelines

1. **Zero Dummy Data**: Strictly use real wardrobe items restored from real backups (49 real items, 8 outfits, 47 images). No dummy or placeholder records.
2. **Local-First & Privacy First**: All catalog data must remain client-side in Room SQLite.
3. **Cloudflare R2 Parity with Sans Finance**: Cloud backups use AWS SigV4 directly to Cloudflare R2 (`db/fitly_latest.sqlite`). Keep this implementation standard and zero-dependency.
4. **Deterministic Modern Code**: Use modern Kotlin / Jetpack Compose Material 3 patterns with zero legacy shims.
5. **Web Archive**: The legacy web app is permanently archived on the `web-archive` branch. Do not recreate web code in `master`.
