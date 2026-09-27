#!/usr/bin/env python3
"""Restore Fitly Android Room DB and Images from a Wardrobe ZIP backup.
"""

import datetime
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import zipfile
from pathlib import Path

IDENTITY_HASH = "4ab61f65910300f91546632d1fe4bd96"
PACKAGE = "com.fitly.app"


def create_room_schema(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.executescript(f"""
        CREATE TABLE IF NOT EXISTS `items` (
            `id` TEXT NOT NULL,
            `name` TEXT NOT NULL,
            `brand` TEXT,
            `price` REAL,
            `purchaseDate` TEXT,
            `status` TEXT NOT NULL,
            `category` TEXT NOT NULL,
            `locationId` TEXT,
            `color` TEXT,
            `tags` TEXT NOT NULL,
            `images` TEXT NOT NULL,
            `material` TEXT,
            `careInstructions` TEXT,
            `condition` TEXT,
            `wearCount` INTEGER NOT NULL,
            `lastWornAt` INTEGER,
            `lastWashedAt` INTEGER,
            `createdAt` INTEGER NOT NULL,
            `retiredAt` INTEGER,
            `retirementReason` TEXT,
            PRIMARY KEY(`id`)
        );

        CREATE TABLE IF NOT EXISTS `outfits` (
            `id` TEXT NOT NULL,
            `name` TEXT NOT NULL,
            `note` TEXT,
            `itemIds` TEXT NOT NULL,
            `wearCount` INTEGER NOT NULL,
            `lastWornAt` INTEGER,
            `createdAt` INTEGER NOT NULL,
            PRIMARY KEY(`id`)
        );

        CREATE TABLE IF NOT EXISTS `wear_logs` (
            `id` TEXT NOT NULL,
            `itemId` TEXT,
            `outfitId` TEXT,
            `wornDate` TEXT NOT NULL,
            `timestamp` INTEGER NOT NULL,
            `notes` TEXT,
            PRIMARY KEY(`id`)
        );

        CREATE TABLE IF NOT EXISTS `tags` (
            `id` TEXT NOT NULL,
            `label` TEXT NOT NULL,
            PRIMARY KEY(`id`)
        );

        CREATE TABLE IF NOT EXISTS `locations` (
            `id` TEXT NOT NULL,
            `name` TEXT NOT NULL,
            `icon` TEXT,
            `isDefault` INTEGER NOT NULL,
            PRIMARY KEY(`id`)
        );

        CREATE TABLE IF NOT EXISTS room_master_table (
            id INTEGER PRIMARY KEY,
            identity_hash TEXT
        );

        INSERT OR REPLACE INTO room_master_table (id, identity_hash) VALUES (42, '{IDENTITY_HASH}');
    """)
    conn.commit()


def populate_data(conn: sqlite3.Connection, data: dict):
    cur = conn.cursor()

    # 1. Tags
    for tag in data.get("tags", []):
        cur.execute("INSERT OR REPLACE INTO tags (id, label) VALUES (?, ?)", (tag["id"], tag.get("label", "")))

    # 2. Locations
    for loc in data.get("locations", []):
        cur.execute(
            "INSERT OR REPLACE INTO locations (id, name, icon, isDefault) VALUES (?, ?, ?, ?)",
            (loc["id"], loc.get("name", ""), loc.get("icon"), 1 if loc.get("isDefault") else 0)
        )

    # 3. Items & Wear Logs
    for item in data.get("items", []):
        item_id = item["id"]
        wear_logs = item.get("wearLogs", [])
        last_worn = None
        for i, w in enumerate(wear_logs):
            if isinstance(w, (int, float)):
                ts = int(w)
                try:
                    dt_str = datetime.datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d")
                except Exception:
                    dt_str = "2026-01-01"
                w_id = f"{item_id}_w_{i}"
                note = None
            elif isinstance(w, dict):
                ts = int(w.get("timestamp", 0))
                dt_str = w.get("wornDate", "2026-01-01")
                w_id = w.get("id") or f"{item_id}_w_{i}"
                note = w.get("notes")
            else:
                continue

            if last_worn is None or ts > last_worn:
                last_worn = ts

            cur.execute(
                "INSERT OR REPLACE INTO wear_logs (id, itemId, wornDate, timestamp, notes) VALUES (?, ?, ?, ?, ?)",
                (w_id, item_id, dt_str, ts, note)
            )

        cur.execute(
            """INSERT OR REPLACE INTO items (
                id, name, brand, price, purchaseDate, status, category, locationId,
                color, tags, images, material, careInstructions, condition,
                wearCount, lastWornAt, lastWashedAt, createdAt, retiredAt, retirementReason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                item_id,
                item["name"],
                item.get("brand"),
                item.get("price"),
                item.get("purchaseDate"),
                item.get("status", "ready"),
                item.get("category", "tops"),
                item.get("locationId"),
                item.get("color"),
                json.dumps(item.get("tags", [])),
                json.dumps(item.get("images", [])),
                item.get("material"),
                item.get("careInstructions"),
                item.get("condition", "good"),
                len(wear_logs),
                last_worn,
                item.get("lastWashedAt"),
                item.get("createdAt", 0),
                item.get("retiredAt"),
                item.get("retirementReason"),
            )
        )

    # 4. Outfits
    for outfit in data.get("outfits", []):
        outfit_id = outfit["id"]
        wear_logs = outfit.get("wearLogs", [])
        last_worn = None
        for i, w in enumerate(wear_logs):
            if isinstance(w, (int, float)):
                ts = int(w)
                try:
                    dt_str = datetime.datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d")
                except Exception:
                    dt_str = "2026-01-01"
                w_id = f"{outfit_id}_w_{i}"
                note = None
            elif isinstance(w, dict):
                ts = int(w.get("timestamp", 0))
                dt_str = w.get("wornDate", "2026-01-01")
                w_id = w.get("id") or f"{outfit_id}_w_{i}"
                note = w.get("notes")
            else:
                continue

            if last_worn is None or ts > last_worn:
                last_worn = ts

            cur.execute(
                "INSERT OR REPLACE INTO wear_logs (id, outfitId, wornDate, timestamp, notes) VALUES (?, ?, ?, ?, ?)",
                (w_id, outfit_id, dt_str, ts, note)
            )

        cur.execute(
            """INSERT OR REPLACE INTO outfits (
                id, name, note, itemIds, wearCount, lastWornAt, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                outfit_id,
                outfit["name"],
                outfit.get("note"),
                json.dumps(outfit.get("itemIds", [])),
                len(wear_logs),
                last_worn,
                outfit.get("createdAt", 0),
            )
        )

    conn.commit()


def main():
    zip_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/fitly_today.zip"
    print(f"📦 Reading ZIP archive: {zip_path}")

    temp_dir = Path("/tmp/fitly_zip_extracted")
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, 'r') as zf:
        zf.extractall(temp_dir)

    wardrobe_json_path = temp_dir / "wardrobe.json"
    if not wardrobe_json_path.exists():
        print("❌ wardrobe.json not found in ZIP")
        sys.exit(1)

    with open(wardrobe_json_path, 'r') as f:
        data = json.load(f)

    db_path = temp_dir / "fitly_db"
    if db_path.exists():
        db_path.unlink()

    conn = sqlite3.connect(str(db_path))
    create_room_schema(conn)
    populate_data(conn, data)
    conn.close()

    print(f"✅ Generated Room SQLite database with {len(data.get('items', []))} items and {len(data.get('outfits', []))} outfits.")

    # ADB Deploy
    print("📲 Pushing database and images to Android device via ADB...")
    subprocess.run(["adb", "shell", "am", "force-stop", PACKAGE], check=True)
    subprocess.run(["adb", "push", str(db_path), "/data/local/tmp/fitly_db"], check=True)

    images_dir = temp_dir / "images"
    has_images = images_dir.exists() and any(images_dir.iterdir())
    if has_images:
        image_count = len(list(images_dir.iterdir()))
        print(f"🖼 Found images directory ({image_count} images). Pushing images...")
        subprocess.run(["adb", "push", str(images_dir), "/data/local/tmp/fitly_images"], check=True)

    # Shell copy into app data
    copy_script = f"""
    run-as {PACKAGE} mkdir -p databases files/images
    run-as {PACKAGE} cp /data/local/tmp/fitly_db databases/fitly_db
    run-as {PACKAGE} rm -f databases/fitly_db-wal databases/fitly_db-shm
    """
    if has_images:
        copy_script += f"""
        run-as {PACKAGE} cp -r /data/local/tmp/fitly_images/* files/images/ 2>/dev/null || true
        rm -rf /data/local/tmp/fitly_images
        """
    copy_script += "\nrm -f /data/local/tmp/fitly_db\n"

    subprocess.run(["adb", "shell", copy_script], check=True)

    print("🚀 Restarting Fitly on phone...")
    subprocess.run(
        ["adb", "shell", "am", "start", "-S", "-n", f"{PACKAGE}/.presentation.MainActivity", "-a", "android.intent.action.MAIN", "-c", "android.intent.category.LAUNCHER"],
        check=True
    )
    print("🎉 Restore complete! All items and images are now live on your phone.")


if __name__ == "__main__":
    main()
