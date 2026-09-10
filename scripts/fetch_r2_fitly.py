#!/usr/bin/env python3
"""Fetch the latest Fitly SQLite snapshot from Cloudflare R2.

Downloads db/fitly_latest.sqlite from the ichsanul-dev R2 bucket,
saves to ~/Projects/fitly/data/fitly_latest.sqlite, and prints
a status summary of wardrobe items, outfits, and valuation.
"""

import datetime
import hashlib
import hmac
import json
import os
import sqlite3
import sys
import urllib.request
from pathlib import Path

R2_BUCKET = "ichsanul-dev"
R2_KEY = "db/fitly_latest.sqlite"
LOCAL_DEST = Path.home() / "Projects" / "fitly" / "data" / "fitly_latest.sqlite"
CREDS_FILE = Path.home() / "Projects" / "fitly" / "android" / "app" / "src" / "main" / "assets" / "r2_cred.json"


def load_credentials():
    account_id = os.getenv("R2_ACCOUNT_ID") or os.getenv("CLOUDFLARE_ACCOUNT_ID")
    access_key = os.getenv("R2_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY")
    bucket = os.getenv("R2_BUCKET_NAME") or R2_BUCKET

    if not (account_id and access_key and secret_key):
        if CREDS_FILE.exists():
            try:
                data = json.loads(CREDS_FILE.read_text())
                account_id = account_id or data.get("account_id")
                access_key = access_key or data.get("access_key_id")
                secret_key = secret_key or data.get("secret_access_key")
                bucket = data.get("bucket_name") or bucket
            except Exception as e:
                print(f"Warning loading credentials file: {e}", file=sys.stderr)

    if not (account_id and access_key and secret_key):
        raise RuntimeError("Cloudflare R2 credentials could not be resolved from env or r2_cred.json")

    return account_id, access_key, secret_key, bucket


def fetch_from_r2():
    account_id, access_key, secret_key, bucket = load_credentials()
    host = f"{account_id}.r2.cloudflarestorage.com"
    url = f"https://{host}/{bucket}/{R2_KEY}"

    now = datetime.datetime.now(datetime.timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")

    canonical_uri = f"/{bucket}/{R2_KEY}"
    payload_hash = hashlib.sha256(b"").hexdigest()
    canonical_headers = f"host:{host}\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{amz_date}\n"
    signed_headers = "host;x-amz-content-sha256;x-amz-date"
    canonical_request = f"GET\n{canonical_uri}\n\n{canonical_headers}\n{signed_headers}\n{payload_hash}"

    algorithm = "AWS4-HMAC-SHA256"
    credential_scope = f"{date_stamp}/auto/s3/aws4_request"
    string_to_sign = f"{algorithm}\n{amz_date}\n{credential_scope}\n{hashlib.sha256(canonical_request.encode()).hexdigest()}"

    def sign(key, msg):
        return hmac.new(key, msg.encode(), hashlib.sha256).digest()

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

    LOCAL_DEST.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(req) as resp:
        if resp.status != 200:
            raise RuntimeError(f"R2 download returned HTTP {resp.status}")
        data = resp.read()
        LOCAL_DEST.write_bytes(data)

    # Inspect SQLite database
    conn = sqlite3.connect(LOCAL_DEST)
    cursor = conn.cursor()
    cursor.execute("SELECT count(*) FROM items WHERE status != 'retired'")
    active_items = cursor.fetchone()[0]
    cursor.execute("SELECT count(*) FROM outfits")
    outfits = cursor.fetchone()[0]
    cursor.execute("SELECT sum(price) FROM items WHERE status != 'retired' AND price IS NOT NULL")
    total_val = cursor.fetchone()[0] or 0
    conn.close()

    val_str = f"Rp {total_val:,.0f}".replace(",", ".")
    print(f"✅ Fetched Fitly snapshot from R2 ({len(data):,} bytes): {active_items} active items, {outfits} outfits (Total value: {val_str})")


if __name__ == "__main__":
    try:
        fetch_from_r2()
    except Exception as e:
        print(f"❌ Fitly R2 Fetch Failed: {e}", file=sys.stderr)
        sys.exit(1)
