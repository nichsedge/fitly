package com.fitly.app.data.util

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.*
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

data class R2Config(
    val accountId: String,
    val accessKeyId: String,
    val secretAccessKey: String,
    val bucketName: String,
    val objectKey: String = AppConstants.DEFAULT_R2_OBJECT_KEY
)

object CloudStorageSyncer {

    fun loadR2Config(context: Context): R2Config? {
        return try {
            val jsonStr = context.assets.open(AppConstants.R2_CREDENTIALS_ASSET_FILE).bufferedReader().use { it.readText() }
            val json = JSONObject(jsonStr)
            R2Config(
                accountId = json.getString("account_id"),
                accessKeyId = json.getString("access_key_id"),
                secretAccessKey = json.getString("secret_access_key"),
                bucketName = json.getString("bucket_name"),
                objectKey = json.optString("object_key", AppConstants.DEFAULT_R2_OBJECT_KEY)
            )
        } catch (e: Exception) {
            null
        }
    }

    suspend fun uploadDatabaseBackup(context: Context, dbFile: File): Result<String> = withContext(Dispatchers.IO) {
        val config = loadR2Config(context) ?: return@withContext Result.failure(Exception("R2 credentials not found"))
        try {
            val fileBytes = dbFile.readBytes()
            val host = "${config.accountId}.r2.cloudflarestorage.com"
            val canonicalUri = "/${config.bucketName}/${config.objectKey}"
            val endpointUrl = "https://$host$canonicalUri"

            val payloadHash = sha256Hex(fileBytes)
            val (amzDate, dateStamp) = getIsoTimestamps()
            val contentType = "application/x-sqlite3"

            val headers = sortedMapOf(
                "content-type" to contentType,
                "host" to host,
                "x-amz-content-sha256" to payloadHash,
                "x-amz-date" to amzDate
            )

            val authorization = buildSigV4AuthorizationHeader(
                httpMethod = "PUT",
                canonicalUri = canonicalUri,
                headers = headers,
                payloadHash = payloadHash,
                accessKey = config.accessKeyId,
                secretKey = config.secretAccessKey,
                dateStamp = dateStamp,
                amzDate = amzDate
            )

            val url = URL(endpointUrl)
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "PUT"
                doOutput = true
                setRequestProperty("Authorization", authorization)
                setRequestProperty("Content-Type", contentType)
                setRequestProperty("Host", host)
                setRequestProperty("x-amz-date", amzDate)
                setRequestProperty("x-amz-content-sha256", payloadHash)
                setFixedLengthStreamingMode(fileBytes.size)
            }
            conn.outputStream.use { it.write(fileBytes) }

            val responseCode = conn.responseCode
            if (responseCode in 200..299) {
                Result.success("R2 Backup Successful (${config.objectKey})")
            } else {
                val errorMsg = conn.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
                Result.failure(Exception("R2 Upload Failed ($responseCode): $errorMsg"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun downloadDatabaseBackup(context: Context, destFile: File): Result<String> = withContext(Dispatchers.IO) {
        val config = loadR2Config(context) ?: return@withContext Result.failure(Exception("R2 credentials not found"))
        try {
            val host = "${config.accountId}.r2.cloudflarestorage.com"
            val canonicalUri = "/${config.bucketName}/${config.objectKey}"
            val endpointUrl = "https://$host$canonicalUri"

            val emptyPayloadHash = sha256Hex(ByteArray(0))
            val (amzDate, dateStamp) = getIsoTimestamps()

            val headers = sortedMapOf(
                "host" to host,
                "x-amz-content-sha256" to emptyPayloadHash,
                "x-amz-date" to amzDate
            )

            val authorization = buildSigV4AuthorizationHeader(
                httpMethod = "GET",
                canonicalUri = canonicalUri,
                headers = headers,
                payloadHash = emptyPayloadHash,
                accessKey = config.accessKeyId,
                secretKey = config.secretAccessKey,
                dateStamp = dateStamp,
                amzDate = amzDate
            )

            val url = URL(endpointUrl)
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("Authorization", authorization)
                setRequestProperty("Host", host)
                setRequestProperty("x-amz-date", amzDate)
                setRequestProperty("x-amz-content-sha256", emptyPayloadHash)
            }

            if (conn.responseCode in 200..299) {
                conn.inputStream.use { input ->
                    destFile.outputStream().use { output ->
                        input.copyTo(output)
                    }
                }
                Result.success("R2 Download Successful")
            } else {
                val errorMsg = conn.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
                Result.failure(Exception("R2 Download Failed (${conn.responseCode}): $errorMsg"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun getIsoTimestamps(): Pair<String, String> {
        val now = Date()
        val amzFormat = SimpleDateFormat("yyyyMMdd'T'HHmmss'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        val dateStampFormat = SimpleDateFormat("yyyyMMdd", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        return Pair(amzFormat.format(now), dateStampFormat.format(now))
    }

    private fun buildSigV4AuthorizationHeader(
        httpMethod: String,
        canonicalUri: String,
        headers: SortedMap<String, String>,
        payloadHash: String,
        accessKey: String,
        secretKey: String,
        dateStamp: String,
        amzDate: String,
        region: String = "auto",
        service: String = "s3"
    ): String {
        val canonicalHeaders = headers.entries.joinToString("") { "${it.key}:${it.value.trim()}\n" }
        val signedHeaders = headers.keys.joinToString(";")

        val canonicalRequest = "$httpMethod\n$canonicalUri\n\n$canonicalHeaders\n$signedHeaders\n$payloadHash"
        val canonicalRequestHash = sha256Hex(canonicalRequest.toByteArray(StandardCharsets.UTF_8))

        val credentialScope = "$dateStamp/$region/$service/aws4_request"
        val stringToSign = "AWS4-HMAC-SHA256\n$amzDate\n$credentialScope\n$canonicalRequestHash"

        val signingKey = getSignatureKey(secretKey, dateStamp, region, service)
        val signature = hmacSha256Hex(signingKey, stringToSign)

        return "AWS4-HMAC-SHA256 Credential=$accessKey/$credentialScope, SignedHeaders=$signedHeaders, Signature=$signature"
    }

    private fun getSignatureKey(key: String, dateStamp: String, regionName: String, serviceName: String): ByteArray {
        val kSecret = ("AWS4$key").toByteArray(StandardCharsets.UTF_8)
        val kDate = hmacSha256(kSecret, dateStamp)
        val kRegion = hmacSha256(kDate, regionName)
        val kService = hmacSha256(kRegion, serviceName)
        return hmacSha256(kService, "aws4_request")
    }

    private fun hmacSha256(key: ByteArray, data: String): ByteArray {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(key, "HmacSHA256"))
        return mac.doFinal(data.toByteArray(StandardCharsets.UTF_8))
    }

    private fun hmacSha256Hex(key: ByteArray, data: String): String {
        return bytesToHex(hmacSha256(key, data))
    }

    private fun sha256Hex(data: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256")
        return bytesToHex(digest.digest(data))
    }

    private fun bytesToHex(bytes: ByteArray): String {
        val sb = StringBuilder()
        for (b in bytes) {
            sb.append(String.format("%02x", b))
        }
        return sb.toString()
    }
}
