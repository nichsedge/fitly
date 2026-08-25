# 👗 Fitly

A modern, privacy-focused digital wardrobe and outfit manager built with [Next.js](https://nextjs.org/) and IndexedDB.

🔗 **Live Demo**: [fitly-ruddy.vercel.app](https://fitly-ruddy.vercel.app/)

---

## ✨ Features

- 👕 **Clothing Catalog**: Organize and manage your wardrobe with custom categories and tags.
- 🎨 **Outfit Planner**: Create, style, and save custom outfits seamlessly.
- 📊 **Wear Tracking**: Track wear history and statistics for your clothing collection.
- 🔒 **Local-First & Private**: All data is stored locally in your browser using IndexedDB—no server or database tracking required.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **UI**: React 19, CSS / Tailwind
- **Storage**: IndexedDB (`idb`)

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/nichsedge/fitly.git
cd fitly
```

### 2. Install dependencies
```bash
bun install
```

### 3. Run the development server
```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🧪 Testing & Quality

The project uses [Vitest](https://vitest.dev/) with React Testing Library and fake-indexeddb:

```bash
bun run test          # run all tests once
bun run test:watch    # watch mode
bun run test:coverage # coverage report
bun run lint          # eslint (must exit clean)
```

Tested modules include the wear/wash log domain logic, CSV export/import round-trips, KonMari statistics, and core UI components.

---

## 💾 Backups

All data lives only in your browser, so backups matter. Use **Settings → Backup Data → Backup All** for a full ZIP export (with photos). Fitly shows a reminder when your last backup is more than 14 days old.
