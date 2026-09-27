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
    const val PREF_KEY_R2_ACCOUNT_ID = "r2_account_id"
    const val PREF_KEY_R2_ACCESS_KEY_ID = "r2_access_key_id"
    const val PREF_KEY_R2_SECRET_ACCESS_KEY = "r2_secret_access_key"
    const val PREF_KEY_R2_BUCKET_NAME = "r2_bucket_name"
    const val PREF_KEY_R2_OBJECT_KEY = "r2_object_key"

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
