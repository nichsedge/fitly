package com.fitly.app.data.util

object AppConstants {

    // Database
    const val DATABASE_NAME = "fitly_db"

    // SharedPreferences & Keys
    const val PREFS_NAME = "fitly_settings"
    const val PREF_KEY_DYNAMIC_COLOR = "dynamic_color"
    const val PREF_KEY_OUTFITS_SORT = "outfits_sort"
    const val PREF_KEY_WARDROBE_SORT = "wardrobe_sort"
    const val PREF_KEY_VIEW_MODE = "wardrobe_view_mode"
    const val PREF_KEY_SYNC_GATEWAY_URL = "sync_gateway_url"
    const val PREF_KEY_SYNC_AUTH_TOKEN = "sync_auth_token"
    const val PREF_KEY_LAST_BACKUP_TIME = "last_backup_time"
    const val PREF_KEY_LAST_BACKUP_SIZE = "last_backup_size"

    // Gateway Defaults
    const val DEFAULT_GATEWAY_URL = "https://gmail-expenses-worker-886416340889.us-central1.run.app"
    const val SYNC_CREDENTIALS_ASSET_FILE = "sync_cred.json"

    // Asset & Backup Files
    const val SEED_BACKUP_ASSET_FILE = "seed_wardrobe.json"
    const val R2_CREDENTIALS_ASSET_FILE = "r2_cred.json"
    const val BACKUP_JSON_FILENAME = "wardrobe.json"
    const val DEFAULT_R2_OBJECT_KEY = "db/fitly_latest.sqlite"
    const val MIME_TYPE_ZIP = "application/zip"

    // Storage & Image Processing
    const val IMAGES_DIRECTORY = "images"
    const val MAX_IMAGE_DIMENSION = 1200
    const val JPEG_COMPRESSION_QUALITY = 85

    // Item Statuses
    const val STATUS_READY = "ready"
    const val STATUS_DIRTY = "dirty"
    const val STATUS_CLEANING = "cleaning"
    const val STATUS_RETIRED = "retired"

    // Animation & Transitions
    const val TRANSITION_DURATION_ENTER_MS = 220
    const val TRANSITION_DURATION_EXIT_MS = 180
    const val TRANSITION_SLIDE_DIVISOR = 4
}
