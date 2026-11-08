package com.fitly.app.data.util

import android.content.Context
import androidx.core.content.edit
import com.fitly.app.data.local.FitlyDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

object CloudStorageSyncer {

    fun getGatewayUrl(context: Context): String {
        val prefs = context.getSharedPreferences(AppConstants.PREFS_NAME, Context.MODE_PRIVATE)
        val url = prefs.getString(AppConstants.PREF_KEY_SYNC_GATEWAY_URL, null)?.trim()
        if (!url.isNullOrBlank()) return url
        val fromAsset = loadConfigFromAsset(context)?.optString("gateway_url")?.trim()
        if (!fromAsset.isNullOrBlank()) return fromAsset
        return AppConstants.DEFAULT_GATEWAY_URL
    }

    fun getSyncAuthToken(context: Context): String {
        val prefs = context.getSharedPreferences(AppConstants.PREFS_NAME, Context.MODE_PRIVATE)
        val token = prefs.getString(AppConstants.PREF_KEY_SYNC_AUTH_TOKEN, null)?.trim()
        if (!token.isNullOrBlank()) return token
        val fromAsset = loadConfigFromAsset(context)?.optString("sync_auth_token")?.trim()
        if (!fromAsset.isNullOrBlank()) return fromAsset
        return ""
    }

    fun saveGatewayConfig(context: Context, url: String, token: String) {
        val prefs = context.getSharedPreferences(AppConstants.PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit {
            putString(AppConstants.PREF_KEY_SYNC_GATEWAY_URL, url.trim())
            putString(AppConstants.PREF_KEY_SYNC_AUTH_TOKEN, token.trim())
        }
    }

    private fun loadConfigFromAsset(context: Context): JSONObject? {
        return try {
            val jsonStr = context.assets.open(AppConstants.SYNC_CREDENTIALS_ASSET_FILE).bufferedReader().use { it.readText() }
            JSONObject(jsonStr)
        } catch (_: Exception) {
            null
        }
    }

    fun getLastBackupTime(context: Context): Long {
        val prefs = context.getSharedPreferences(AppConstants.PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getLong(AppConstants.PREF_KEY_LAST_BACKUP_TIME, 0L)
    }

    fun getLastBackupSize(context: Context): Long {
        val prefs = context.getSharedPreferences(AppConstants.PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getLong(AppConstants.PREF_KEY_LAST_BACKUP_SIZE, 0L)
    }

    suspend fun uploadDatabaseBackup(context: Context, dbFile: File): Result<String> = withContext(Dispatchers.IO) {
        FitlyDatabase.checkpoint(context)
        val baseUrl = getGatewayUrl(context).trimEnd('/')
        val token = getSyncAuthToken(context).trim()
        if (token.isBlank()) {
            return@withContext Result.failure(Exception("Sync Auth Token is not configured. Please set your token in Settings."))
        }

        try {
            val url = URL("$baseUrl/api/fitly/backup")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "PUT"
                doOutput = true
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("X-Sync-Token", token)
                setRequestProperty("X-App", "fitly")
                setRequestProperty("Content-Type", "application/x-sqlite3")
                setFixedLengthStreamingMode(dbFile.length())
                connectTimeout = 15000
                readTimeout = 45000
            }

            dbFile.inputStream().use { input ->
                conn.outputStream.use { output ->
                    input.copyTo(output)
                }
            }

            val code = conn.responseCode
            if (code in 200..299) {
                val prefs = context.getSharedPreferences(AppConstants.PREFS_NAME, Context.MODE_PRIVATE)
                prefs.edit {
                    putLong(AppConstants.PREF_KEY_LAST_BACKUP_TIME, System.currentTimeMillis())
                    putLong(AppConstants.PREF_KEY_LAST_BACKUP_SIZE, dbFile.length())
                }
                Result.success("Cloud Backup Successful via Gateway")
            } else {
                val err = conn.errorStream?.bufferedReader()?.use { it.readText() } ?: "HTTP $code"
                Result.failure(Exception("Gateway upload failed ($code): $err"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun downloadDatabaseBackup(context: Context, destFile: File): Result<String> = withContext(Dispatchers.IO) {
        val baseUrl = getGatewayUrl(context).trimEnd('/')
        val token = getSyncAuthToken(context).trim()
        if (token.isBlank()) {
            return@withContext Result.failure(Exception("Sync Auth Token is not configured. Please set your token in Settings."))
        }

        try {
            val url = URL("$baseUrl/api/fitly/backup")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("X-Sync-Token", token)
                setRequestProperty("X-App", "fitly")
                connectTimeout = 15000
                readTimeout = 45000
            }

            val code = conn.responseCode
            if (code == 200) {
                destFile.outputStream().use { output ->
                    conn.inputStream.use { input ->
                        input.copyTo(output)
                    }
                }
                if (!isDatabaseValid(destFile)) {
                    destFile.delete()
                    return@withContext Result.failure(Exception("Downloaded database is corrupted or empty"))
                }
                Result.success("Cloud Restore Successful via Gateway")
            } else {
                val err = conn.errorStream?.bufferedReader()?.use { it.readText() } ?: "HTTP $code"
                Result.failure(Exception("Gateway download failed ($code): $err"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun isDatabaseValid(file: File): Boolean {
        if (!file.exists() || file.length() < 100L) return false
        return try {
            file.inputStream().use { stream ->
                val header = ByteArray(16)
                val bytesRead = stream.read(header)
                bytesRead == 16 && String(header, StandardCharsets.UTF_8).startsWith("SQLite format 3")
            }
        } catch (_: Exception) {
            false
        }
    }
}
