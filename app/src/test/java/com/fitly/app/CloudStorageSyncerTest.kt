package com.fitly.app

import com.fitly.app.data.util.CloudStorageSyncer
import org.junit.Assert.*
import org.junit.Test
import java.nio.charset.StandardCharsets

class CloudStorageSyncerTest {

    @Test
    fun testSha256HexEmptyString() {
        // Standard SHA256 of empty string is e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
        val emptyHash = CloudStorageSyncer.sha256Hex(ByteArray(0))
        assertEquals("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", emptyHash)
    }

    @Test
    fun testSha256HexKnownVector() {
        val hash = CloudStorageSyncer.sha256Hex("fitly".toByteArray(StandardCharsets.UTF_8))
        assertNotNull(hash)
        assertEquals(64, hash.length)
    }

    @Test
    fun testGetIsoTimestampsFormat() {
        val (amzDate, dateStamp) = CloudStorageSyncer.getIsoTimestamps()
        assertTrue("amzDate must end with Z", amzDate.endsWith("Z"))
        assertEquals("amzDate length must be 16 (yyyyMMdd'T'HHmmss'Z')", 16, amzDate.length)
        assertEquals("dateStamp length must be 8 (yyyyMMdd)", 8, dateStamp.length)
        assertTrue("amzDate must start with dateStamp", amzDate.startsWith(dateStamp))
    }

    @Test
    fun testBuildSigV4AuthorizationHeader() {
        val headers = sortedMapOf(
            "host" to "test-account.r2.cloudflarestorage.com",
            "x-amz-content-sha256" to "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "x-amz-date" to "20261025T000000Z"
        )
        val authHeader = CloudStorageSyncer.buildSigV4AuthorizationHeader(
            httpMethod = "GET",
            canonicalUri = "/test-bucket/db/fitly_latest.sqlite",
            headers = headers,
            payloadHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            accessKey = "TEST_KEY",
            secretKey = "TEST_SECRET",
            dateStamp = "20261025",
            amzDate = "20261025T000000Z",
            region = "auto",
            service = "s3"
        )

        assertTrue(authHeader.startsWith("AWS4-HMAC-SHA256 Credential=TEST_KEY/20261025/auto/s3/aws4_request"))
        assertTrue(authHeader.contains("SignedHeaders=host;x-amz-content-sha256;x-amz-date"))
        assertTrue(authHeader.contains("Signature="))
    }
}
