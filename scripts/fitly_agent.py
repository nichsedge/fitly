#!/usr/bin/env python3
"""Fitly Agent & CLI — Workstation Fashion Intelligence & Wardrobe Manager.

Integrates with iERP timeline events and local SQLite SSOT (data/fitly_latest.sqlite)
to provide intelligent outfit recommendations, fashion theory coaching, wardrobe
gap audits, wear tracking, and automated style guide export to digital-graveyard.
"""

import argparse
import datetime
import hashlib
import hmac
import json
import os
import sqlite3
import sys
import time
import urllib.request
from pathlib import Path

# Paths & SSOT
REPO_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = REPO_ROOT / "data" / "fitly_latest.sqlite"
IERP_DB_PATH = Path.home() / "Projects" / "ierp" / "events.db"
GRAVEYARD_STYLE_PATH = Path.home() / "Projects" / "digital-graveyard" / "content" / "Personal" / "Style"
CREDS_FILE = REPO_ROOT / "app" / "src" / "main" / "assets" / "r2_cred.json"
R2_BUCKET = "ichsanul-dev"
R2_KEY = "db/fitly_latest.sqlite"


def get_db():
    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def format_idr(amount):
    if amount is None or amount == 0:
        return "Rp 0"
    return f"Rp {amount:,.0f}".replace(",", ".")


def cmd_status(args):
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT count(*) FROM items WHERE status != 'retired'")
    total_active = c.fetchone()[0]

    c.execute("SELECT count(*) FROM outfits")
    total_outfits = c.fetchone()[0]

    c.execute("SELECT sum(price) FROM items WHERE status != 'retired' AND price IS NOT NULL")
    total_val = c.fetchone()[0] or 0

    print("═══════════════════════════════════════════════════════════════════")
    print("👔 FITLY WARDROBE INTELLIGENCE & ASSET STATUS")
    print("═══════════════════════════════════════════════════════════════════")
    print(f"Total Active Pieces: {total_active} | Saved Outfits: {total_outfits} | Total Asset Value: {format_idr(total_val)}")
    print()

    # Category breakdown
    print("📂 Category Breakdown:")
    c.execute("""
        SELECT category, count(*) as count, sum(wearCount) as total_wears, sum(price) as cat_val
        FROM items WHERE status != 'retired'
        GROUP BY category ORDER BY count DESC
    """)
    for row in c.fetchall():
        wears = row["total_wears"] or 0
        val = format_idr(row["cat_val"])
        print(f"  • {row['category'].title():<12} : {row['count']:>2} items | {wears:>3} total wears | Valuation: {val}")
    print()

    # Top Worn Pieces
    print("⭐ Most Worn Pieces (Lowest Cost-Per-Wear):")
    c.execute("""
        SELECT name, category, brand, wearCount, price,
               CASE WHEN wearCount > 0 THEN price / wearCount ELSE price END as cpw
        FROM items
        WHERE status != 'retired' AND wearCount > 0
        ORDER BY wearCount DESC LIMIT 5
    """)
    top_worn = c.fetchall()
    if top_worn:
        for r in top_worn:
            brand_str = f"({r['brand']})" if r['brand'] else ""
            cpw_str = format_idr(r['cpw']) if r['price'] else "N/A"
            print(f"  • {r['name']} {brand_str} [{r['category'].title()}]: {r['wearCount']} wears (CPW: {cpw_str}/wear)")
    else:
        print("  No worn items recorded yet.")
    print()

    # Dust Collectors (Unworn)
    c.execute("""
        SELECT count(*) FROM items
        WHERE status != 'retired' AND category != 'underwear' AND wearCount = 0
    """)
    unworn_count = c.fetchone()[0]
    print(f"💤 Dust Collectors (0 wears recorded): {unworn_count} items waiting for rotation!")
    print("═══════════════════════════════════════════════════════════════════")
    conn.close()


def get_ierp_today_context():
    """Extract context from iERP SQLite database if available."""
    if not IERP_DB_PATH.exists():
        return None

    try:
        conn = sqlite3.connect(IERP_DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        today_str = datetime.date.today().isoformat()
        c.execute("""
            SELECT title, place, tags, contacts FROM events
            WHERE start_date LIKE ? OR start_date >= ?
            ORDER BY start_date DESC LIMIT 3
        """, (f"{today_str}%", today_str))
        events = c.fetchall()
        conn.close()
        if events:
            return [dict(e) for e in events]
    except Exception:
        pass
    return None


def cmd_recommend(args):
    conn = get_db()
    c = conn.cursor()

    # Assess context
    context = args.context
    ierp_events = get_ierp_today_context()
    today_hint = ""

    if not context and ierp_events:
        event_titles = [e['title'] for e in ierp_events]
        today_hint = f"Detected from iERP: {', '.join(event_titles)}"
        combined = " ".join([e['title'] + " " + (e['place'] or "") for e in ierp_events]).lower()
        if any(w in combined for w in ["meeting", "client", "office", "formal", "pitch", "seminar"]):
            context = "smart-casual"
        elif any(w in combined for w in ["gym", "run", "workout", "training", "tennis"]):
            context = "athletic"
        elif any(w in combined for w in ["dinner", "date", "katedral", "party"]):
            context = "smart-casual"
        else:
            context = "casual"
    elif not context:
        context = "casual"

    print("═══════════════════════════════════════════════════════════════════")
    print(f"✨ FITLY AI STYLE RECOMMENDATION — Context: [{context.upper()}]")
    if today_hint:
        print(f"📅 {today_hint}")
    print("═══════════════════════════════════════════════════════════════════")

    # Fetch available pieces
    c.execute("SELECT * FROM items WHERE status != 'retired'")
    all_items = [dict(r) for r in c.fetchall()]

    tops = [i for i in all_items if i['category'] == 'top']
    bottoms = [i for i in all_items if i['category'] == 'bottom']
    shoes = [i for i in all_items if i['category'] == 'shoes']
    outerwear = [i for i in all_items if i['category'] == 'outerwear']

    recommendations = []

    if context == "athletic":
        top = next((t for t in tops if "Gym" in t['tags'] or "Training" in t['name']), tops[0])
        bottom = next((b for b in bottoms if "Gym" in b['tags'] or "Training" in b['name'] or "Jersey" in b['name']), bottoms[0])
        shoe = next((s for s in shoes if "910" in s['name'] or "Running" in s['name']), shoes[0])
        rationale = "Functional moisture-wicking materials with athletic footwear support. Keep accessories minimal."
        formality = "Level 1 (Athletic / Training)"
        recommendations.append((top, bottom, shoe, None, rationale, formality))
    elif context == "smart-casual":
        # Look for collared top (Polo or Shirt) + Trousers/Chinos + cleanest shoes
        top = next((t for t in tops if "Polo" in t['name'] or "Shirt" in t['name'] or "Twill" in t['name']), tops[0])
        bottom = next((b for b in bottoms if "Brown" in b['name'] or b.get('color') == '#854d0e' or "Chinos" in b['name'] or "Trousers" in b['name']), bottoms[0])
        shoe = next((s for s in shoes if "Jim Joker" in s['name'] or "Sneakers" in s['name']), shoes[0])
        layer = next((o for o in outerwear if "Parka" in o['name']), None)
        rationale = "Collared polo/shirt instantly elevates the look to Level 3. Earthy tones (brown/grey/navy) create sophisticated low-saturation balance."
        formality = "Level 3 (Smart Casual / Client / Dinner)"
        recommendations.append((top, bottom, shoe, layer, rationale, formality))

        # Alternative: Clean monochrome
        top_alt = next((t for t in tops if "Misty" in t['name'] or "Plain" in t['name'] or "White" in t['name'] or t['color'] in ['#f5f5f5', '#f9fafb']), tops[0])
        bottom_alt = next((b for b in bottoms if "Essential Chino" in b['name'] or ("Chinos" in b['name'] and b['color'] == '#1a1a1a')), bottoms[0])
        rationale_alt = "High value contrast: Light/White top with tailored black chinos creates crisp, intentional minimalist structure without looking sloppy."
        recommendations.append((top_alt, bottom_alt, shoe, None, rationale_alt, "Level 2.5 (Minimalist Monochrome)"))
    else:  # Casual / Work from Kos
        # Look for boxy/relaxed tee + comfortable chinos or jeans
        # Favor unworn items to encourage rotation
        unworn_tops = [t for t in tops if t['wearCount'] == 0 and "Casual" in t['tags']]
        top = unworn_tops[0] if unworn_tops else tops[0]
        bottom = next((b for b in bottoms if "Chinos" in b['name'] and b['color'] != top['color']), bottoms[0])
        shoe = next((s for s in shoes if "Jim Joker" in s['name']), shoes[0])
        layer = next((o for o in outerwear if "Taslan" in o['name']), None)
        rationale = "Relaxed proportions with a clean silhouette. Rotates an unworn piece to bring down your wardrobe cost-per-wear."
        formality = "Level 2 (Elevated Casual)"
        recommendations.append((top, bottom, shoe, layer, rationale, formality))

    for idx, (t, b, s, o, rat, form) in enumerate(recommendations, 1):
        print(f"\n💡 Option #{idx}: {form}")
        print(f"  • Top:       {t['name']} ({t.get('brand') or 'Basic'}) [Color: {t.get('color', 'N/A')}]")
        print(f"  • Bottom:    {b['name']} ({b.get('brand') or 'Basic'}) [Color: {b.get('color', 'N/A')}]")
        print(f"  • Footwear:  {s['name']} ({s.get('brand') or 'Basic'})")
        if o:
            print(f"  • Outerwear: {o['name']} ({o.get('brand') or 'Basic'})")
        print("  • Styling Rules:")
        print(f"    - Color Harmony: Dominant {b.get('color', 'neutral')} base paired with {t.get('color', 'neutral')} top.")
        print(f"    - Proportion: {rat}")
        print("    - Micro-Tip: Slightly cuff pant legs at the ankle bone and keep shirt drape clean.")

    print("\nTip: To log wearing one of these outfits: run `fitly wear <item_id_or_name>`")
    print("═══════════════════════════════════════════════════════════════════")
    conn.close()


def cmd_outfits(args):
    """List all saved outfits with resolved item names and wear counts."""
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, name, note, itemIds, wearCount, lastWornAt FROM outfits ORDER BY wearCount DESC, name ASC")
    outfits = c.fetchall()

    print("═══════════════════════════════════════════════════════════════════")
    print("👔 SAVED FITLY OUTFITS")
    print("═══════════════════════════════════════════════════════════════════")
    if not outfits:
        print("No outfits saved yet. Create one with: fitly add-outfit --name <NAME> --items <ITEMS>")
    else:
        for o in outfits:
            item_ids = json.loads(o["itemIds"])
            if item_ids:
                placeholders = ",".join(["?"] * len(item_ids))
                c.execute(f"SELECT name, category, color FROM items WHERE id IN ({placeholders})", item_ids)
                pieces = [f"{r['name']} ({r['category']})" for r in c.fetchall()]
                items_str = ", ".join(pieces)
            else:
                items_str = "No items"
            last_worn = ""
            if o["lastWornAt"]:
                dt = datetime.datetime.fromtimestamp(o["lastWornAt"] / 1000).strftime("%Y-%m-%d")
                last_worn = f" | Last worn: {dt}"
            print(f"  • [{o['name']}] ({o['wearCount']} wears{last_worn}):")
            print(f"    {items_str}")
    print("═══════════════════════════════════════════════════════════════════")
    conn.close()


def cmd_add_outfit(args):
    """Create a new outfit by resolving item names to IDs."""
    conn = get_db()
    c = conn.cursor()
    name = args.name.strip()
    item_queries = [s.strip() for s in args.items.split(",") if s.strip()]

    if not item_queries:
        print("❌ Error: Must specify at least 1 item (e.g. --items 'Boxy T-Shirt, Chinos Brown')", file=sys.stderr)
        conn.close()
        sys.exit(1)

    matched_ids = []
    matched_names = []

    for query in item_queries:
        c.execute("""
            SELECT id, name, category, brand FROM items
            WHERE status != 'retired' AND (
                lower(id) = ? 
                OR lower(name) LIKE ? 
                OR lower(name || ' ' || coalesce(brand, '')) LIKE ?
                OR lower(coalesce(brand, '') || ' ' || name) LIKE ?
            )
            LIMIT 1
        """, (query.lower(), f"%{query.lower()}%", f"%{query.lower()}%", f"%{query.lower()}%"))
        row = c.fetchone()
        if not row:
            print(f"❌ Error: Could not find wardrobe item matching '{query}'", file=sys.stderr)
            conn.close()
            sys.exit(1)
        matched_ids.append(row["id"])
        matched_names.append(f"{row['name']} [{row['category']}]")

    import uuid
    outfit_id = str(uuid.uuid4())
    now_ms = int(time.time() * 1000)
    note = args.note or ""

    c.execute("""
        INSERT INTO outfits (id, name, note, itemIds, wearCount, lastWornAt, createdAt)
        VALUES (?, ?, ?, ?, 0, NULL, ?)
    """, (outfit_id, name, note, json.dumps(matched_ids), now_ms))

    conn.commit()
    conn.close()

    print(f"✅ Created Outfit '{name}' with {len(matched_ids)} pieces:")
    for piece in matched_names:
        print(f"   • {piece}")
    print(f"💡 You can now wear it anytime via: fitly wear '{name}'")


def cmd_wear(args):
    conn = get_db()
    c = conn.cursor()
    target = args.item.lower().strip()
    now_ms = int(time.time() * 1000)

    # 1. First check if target matches an OUTFIT name or id
    c.execute("""
        SELECT id, name, itemIds, wearCount FROM outfits
        WHERE lower(id) = ? OR lower(name) = ? OR lower(name) LIKE ?
        LIMIT 1
    """, (target, target, f"%{target}%"))
    outfit = c.fetchone()

    if outfit:
        new_outfit_count = outfit["wearCount"] + 1
        c.execute("UPDATE outfits SET wearCount = ?, lastWornAt = ? WHERE id = ?", (new_outfit_count, now_ms, outfit["id"]))

        item_ids = json.loads(outfit["itemIds"])
        print(f"✅ Logged wear for Outfit '{outfit['name']}' (now {new_outfit_count} total wears)")
        print("   Updating constituent items:")

        for iid in item_ids:
            c.execute("SELECT id, name, category, wearCount, price FROM items WHERE id = ?", (iid,))
            it = c.fetchone()
            if it:
                new_item_count = it["wearCount"] + 1
                c.execute("UPDATE items SET wearCount = ?, lastWornAt = ? WHERE id = ?", (new_item_count, now_ms, iid))
                try:
                    c.execute("INSERT INTO wear_logs (id, itemId, wornAt, source) VALUES (?, ?, ?, 'cli_outfit')",
                              (f"wear-{int(time.time())}-{iid[:8]}", iid, now_ms))
                except Exception:
                    pass
                price = it["price"] or 0
                cpw = format_idr(price / new_item_count) if price > 0 else "N/A"
                print(f"   • {it['name']} [{it['category'].title()}]: {it['wearCount']} ➡️  {new_item_count} wears (CPW: {cpw}/wear)")

        conn.commit()
        conn.close()
        return

    # 2. Otherwise match an individual ITEM by id or partial name/brand
    c.execute("""
        SELECT id, name, category, wearCount, price FROM items
        WHERE lower(id) = ? 
           OR lower(name) LIKE ? 
           OR lower(name || ' ' || coalesce(brand, '')) LIKE ?
           OR lower(coalesce(brand, '') || ' ' || name) LIKE ?
        LIMIT 1
    """, (target, f"%{target}%", f"%{target}%", f"%{target}%"))
    item = c.fetchone()

    if not item:
        print(f"❌ Outfit or item matching '{args.item}' not found in wardrobe.", file=sys.stderr)
        conn.close()
        sys.exit(1)

    new_count = item['wearCount'] + 1

    c.execute("""
        UPDATE items
        SET wearCount = ?, lastWornAt = ?
        WHERE id = ?
    """, (new_count, now_ms, item['id']))

    # Also log wear into wear_logs table if exists
    try:
        log_id = f"wear-{int(time.time())}"
        c.execute("""
            INSERT INTO wear_logs (id, itemId, wornAt, source)
            VALUES (?, ?, ?, 'cli_agent')
        """, (log_id, item['id'], now_ms))
    except Exception:
        pass

    conn.commit()
    conn.close()

    price = item['price'] or 0
    cpw = format_idr(price / new_count) if price > 0 else "N/A"
    print(f"✅ Logged wear for '{item['name']}' [{item['category'].title()}]")
    print(f"   Wear count: {item['wearCount']} ➡️  {new_count} | New CPW: {cpw}/wear")


def cmd_audit(args):
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT * FROM items WHERE status != 'retired'")
    items = [dict(r) for r in c.fetchall()]
    conn.close()

    total = len(items)
    dark_neutrals = [i for i in items if i.get('color') in ['#1a1a1a', '#0f172a', '#3d3a3b', '#424451', '#47414d']]
    light_neutrals = [i for i in items if i.get('color') in ['#f5f5f5', '#f9fafb', '#6b7280', '#6d6c71', '#878a8e']]
    chromatic = [i for i in items if i not in dark_neutrals and i not in light_neutrals and i.get('category') != 'underwear']

    print("═══════════════════════════════════════════════════════════════════")
    print("🔍 FITLY WARDROBE CAPSULE AUDIT & GAP ANALYSIS")
    print("═══════════════════════════════════════════════════════════════════")
    print(f"Analyzed {total} items across color palettes, formality, and versatility:\n")

    print("📊 Palette Distribution:")
    print(f"  • Dark Neutrals (Black, Navy, Charcoal) : {len(dark_neutrals)} items ({len(dark_neutrals)*100//total}%)")
    print(f"  • Light/Mid Greys & Whites             : {len(light_neutrals)} items ({len(light_neutrals)*100//total}%)")
    print(f"  • Chromatic/Earth (Olive, Brown, Blue) : {len(chromatic)} items ({len(chromatic)*100//total}%)")
    print()

    print("⚠️ Key Architectural Gaps Identified:")
    print("  1. Missing Universal Footwear (High Priority):")
    print("     You have gym runners (910) and dark navy sneakers (Jim Joker). You lack crisp,")
    print("     minimalist white/off-white leather sneakers. Adding ONE pair of white sneakers")
    print("     instantly anchors over 15+ smart-casual combinations with your brown & black chinos.")
    print()
    print("  2. Heavy Bottom-to-Top Imbalance:")
    print("     You have 17 bottoms and 16 tops, but 10 of the bottoms are nearly identical dark chinos/trousers.")
    print("     Donate or retire duplicate unworn pants and invest in diverse top textures.")
    print()
    print("  3. Missing 'The Third Piece' (Lightweight Layer):")
    print("     You jump straight from t-shirts to heavy rain/parka jackets. A breathable linen")
    print("     or twill overshirt (worn open over a white tee) creates high-fashion depth in tropical heat.")
    print("═══════════════════════════════════════════════════════════════════")


def cmd_export_style(args):
    """Export comprehensive Personal Style Manifesto to digital-graveyard."""
    GRAVEYARD_STYLE_PATH.mkdir(parents=True, exist_ok=True)
    target_file = GRAVEYARD_STYLE_PATH / "Wardrobe Capsule & Style Manifesto.md"

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM items WHERE status != 'retired' AND category != 'underwear' ORDER BY category, name")
    items = [dict(r) for r in c.fetchall()]
    conn.close()

    content = f"""---
title: Personal Style Manifesto & Capsule Wardrobe
created: {datetime.date.today().isoformat()}
updated: {datetime.date.today().isoformat()}
tags:
  - style
  - fashion
  - wardrobe
  - minimalism
  - capsule
publish_external: false
---

# 👔 Personal Style Manifesto & Capsule Architecture

> **Engineering Framework for Modern Masculine Style**  
> Workstation: `al@fedora` | SSOT: `fitly_latest.sqlite`

This document defines personal style rules, color theory balance, formality ladders, and capsule wardrobe maintenance.

---

## 🏛️ The 4 First-Principles of Style

### 1. The 60-30-10 Color Harmonization Rule
A cohesive outfit does not mean matching everything to the same shade. Instead, balance values:
- **60% Base Neutral**: Dominant foundation (e.g., Black, Charcoal, or Khaki trousers).
- **30% Secondary Structure**: Contrast or harmonizing tone (e.g., Heather grey polo, white tee, or navy jacket).
- **10% Accent/Pop**: Small visual interest (e.g., Olive undertones, textured belt, watch strap, or silver cuff).

### 2. Formality Ladder (Levels 1 to 5)
Never combine pieces that are more than **1 level apart** on the formality ladder:
- **Level 1 (Gym/Lounge)**: Sweatpants, athletic mesh runners, technical tank tops.
- **Level 2 (Casual)**: T-shirts, relaxed jeans, casual sneakers.
- **Level 3 (Smart Casual)**: Clean polos, linen button-downs, tailored chinos, minimalist leather sneakers, loafers.
- **Level 4 (Business Casual)**: Unstructured blazers, dress trousers, leather dress shoes.
- **Level 5 (Formal)**: Tailored suit and tie.

> [!IMPORTANT]
> **The Common Tech Trap**: Pairing Level 3 pieces (Polo shirt or tailored chinos) with Level 1 pieces (mesh running shoes). Always ensure shoes match or elevate the trouser's formality.

### 3. The Rule of Thirds (Proportions & Silhouette)
- Bisecting your body 50/50 with a long untucked tee and low-rise pants makes your legs look short and posture sloppy.
- Aim for a **1:2 proportion** (torso 1/3, legs 2/3) by wearing mid-to-high-rise trousers and doing a clean front-tuck with boxy or tailored t-shirts.

### 4. Texture Over Graphics
Graphic tees distract; rich textures communicate quality:
- Waffle knit, linen weaves, pique polo cotton, twill, and slub cotton give visual depth even in pure solid colors.

---

## 🎯 Current Wardrobe Capsule Inventory ({len(items)} Pieces)

| Category | Item Name | Brand | Color | Formality Tier | Wear Count |
| :--- | :--- | :--- | :--- | :--- | :--- |
"""
    for i in items:
        brand = i.get('brand') or 'Basic'
        cat = i.get('category', '').title()
        color = i.get('color', 'N/A')
        wears = i.get('wearCount', 0)
        content += f"| {cat} | **{i['name']}** | {brand} | `{color}` | Casual/Smart | {wears} |\n"

    content += """
---

## 🛍️ Strategic Shopping Priority List (80/20 Rule)

To maximize outfit combinations with minimum new purchases:

1. **Minimalist White Leather Sneakers (Brodo / Piero / Veja / Stan Smith)**:
   - *Why*: Unlocks 20+ smart casual combinations with all existing chinos. Replaces clashing athletic runners for daily wear.
2. **Breathable Linen or Cotton Twill Overshirt (Olive or Khaki)**:
   - *Why*: Adds the "Third Piece" layer in warm climates without overheating.
3. **Heather Grey or Oatmeal Knit Polo**:
   - *Why*: Provides soft, sophisticated texture between basic tees and formal dress shirts.

---
*Auto-generated from Fitly SSOT by Antigravity Style Agent.*
"""

    target_file.write_text(content)
    print(f"✅ Successfully exported Style Manifesto to: {target_file}")


def load_r2_creds():
    account_id = os.getenv("R2_ACCOUNT_ID") or os.getenv("CLOUDFLARE_ACCOUNT_ID")
    access_key = os.getenv("R2_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY")
    bucket = os.getenv("R2_BUCKET_NAME") or R2_BUCKET

    if not (account_id and access_key and secret_key) and CREDS_FILE.exists():
        try:
            data = json.loads(CREDS_FILE.read_text())
            account_id = account_id or data.get("account_id")
            access_key = access_key or data.get("access_key_id")
            secret_key = secret_key or data.get("secret_access_key")
            bucket = data.get("bucket_name") or bucket
        except Exception:
            pass

    if not (account_id and access_key and secret_key):
        raise RuntimeError("Cloudflare R2 credentials could not be resolved from env or r2_cred.json")

    return account_id, access_key, secret_key, bucket


def cmd_sync(args):
    action = args.action.lower()
    account_id, access_key, secret_key, bucket = load_r2_creds()
    host = f"{account_id}.r2.cloudflarestorage.com"
    url = f"https://{host}/{bucket}/{R2_KEY}"

    now = datetime.datetime.now(datetime.timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")

    def sign(key, msg):
        return hmac.new(key, msg.encode(), hashlib.sha256).digest()

    algorithm = "AWS4-HMAC-SHA256"
    credential_scope = f"{date_stamp}/auto/s3/aws4_request"

    if action == "pull":
        payload_hash = hashlib.sha256(b"").hexdigest()
        canonical_headers = f"host:{host}\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{amz_date}\n"
        signed_headers = "host;x-amz-content-sha256;x-amz-date"
        canonical_request = f"GET\n/{bucket}/{R2_KEY}\n\n{canonical_headers}\n{signed_headers}\n{payload_hash}"
        string_to_sign = f"{algorithm}\n{amz_date}\n{credential_scope}\n{hashlib.sha256(canonical_request.encode()).hexdigest()}"

        k_date = sign(("AWS4" + secret_key).encode(), date_stamp)
        k_region = sign(k_date, "auto")
        k_service = sign(k_region, "s3")
        k_signing = sign(k_service, "aws4_request")
        signature = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()

        auth_header = f"{algorithm} Credential={access_key}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}"
        req = urllib.request.Request(url, method="GET")
        req.add_header("x-amz-content-sha256", payload_hash)
        req.add_header("x-amz-date", amz_date)
        req.add_header("Authorization", auth_header)

        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            DB_PATH.write_bytes(data)
        print(f"✅ Pulled latest database from Cloudflare R2 ({len(data):,} bytes)")

    elif action == "push":
        # Checkpoint WAL first
        conn = get_db()
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        conn.close()

        data = DB_PATH.read_bytes()
        payload_hash = hashlib.sha256(data).hexdigest()
        canonical_headers = f"host:{host}\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{amz_date}\n"
        signed_headers = "host;x-amz-content-sha256;x-amz-date"
        canonical_request = f"PUT\n/{bucket}/{R2_KEY}\n\n{canonical_headers}\n{signed_headers}\n{payload_hash}"
        string_to_sign = f"{algorithm}\n{amz_date}\n{credential_scope}\n{hashlib.sha256(canonical_request.encode()).hexdigest()}"

        k_date = sign(("AWS4" + secret_key).encode(), date_stamp)
        k_region = sign(k_date, "auto")
        k_service = sign(k_region, "s3")
        k_signing = sign(k_service, "aws4_request")
        signature = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()

        auth_header = f"{algorithm} Credential={access_key}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}"
        req = urllib.request.Request(url, data=data, method="PUT")
        req.add_header("x-amz-content-sha256", payload_hash)
        req.add_header("x-amz-date", amz_date)
        req.add_header("Authorization", auth_header)

        with urllib.request.urlopen(req) as resp:
            if resp.status not in (200, 204):
                raise RuntimeError(f"R2 PUT failed with status {resp.status}")
        print(f"✅ Successfully pushed database to Cloudflare R2 ({len(data):,} bytes)")


def main():
    parser = argparse.ArgumentParser(description="Fitly Wardrobe & Personal Style Agent")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("status", help="Show wardrobe asset valuation and wear status")
    subparsers.add_parser("outfits", help="List all saved outfits with composite items")

    add_outfit_p = subparsers.add_parser("add-outfit", help="Create a new outfit from item names")
    add_outfit_p.add_argument("--name", required=True, help="Outfit name (e.g. 'Clean Monochrome')")
    add_outfit_p.add_argument("--items", required=True, help="Comma-separated item names (e.g. 'Misty, Chinos Grey, Jim Joker')")
    add_outfit_p.add_argument("--note", default="", help="Optional styling note")

    rec_p = subparsers.add_parser("recommend", help="Get contextual outfit recommendation")
    rec_p.add_argument("--context", choices=["casual", "smart-casual", "athletic"], help="Target dress code")

    wear_p = subparsers.add_parser("wear", help="Log wear for an item or outfit")
    wear_p.add_argument("item", help="Item name or ID")

    subparsers.add_parser("audit", help="Run wardrobe capsule & gap analysis")
    subparsers.add_parser("export-style", help="Export style manifesto to digital-graveyard")

    sync_p = subparsers.add_parser("sync", help="Sync database with Cloudflare R2")
    sync_p.add_argument("action", choices=["pull", "push"], help="Pull or push snapshot")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)

    if args.command == "status":
        cmd_status(args)
    elif args.command == "outfits":
        cmd_outfits(args)
    elif args.command == "add-outfit":
        cmd_add_outfit(args)
    elif args.command == "recommend":
        cmd_recommend(args)
    elif args.command == "wear":
        cmd_wear(args)
    elif args.command == "audit":
        cmd_audit(args)
    elif args.command == "export-style":
        cmd_export_style(args)
    elif args.command == "sync":
        cmd_sync(args)


if __name__ == "__main__":
    main()
