package com.fitly.app

import com.fitly.app.data.util.CloudStorageSyncer
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.nio.charset.StandardCharsets

class CloudStorageSyncerTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    @Test
    fun testIsDatabaseValidWithValidHeader() {
        val file = tempFolder.newFile("test_valid.sqlite")
        // SQLite header is "SQLite format 3\000" (16 bytes) followed by page size, etc.
        val headerBytes = ByteArray(1024)
        val magic = "SQLite format 3\u0000".toByteArray(StandardCharsets.UTF_8)
        System.arraycopy(magic, 0, headerBytes, 0, magic.size)
        file.writeBytes(headerBytes)

        assertTrue(CloudStorageSyncer.isDatabaseValid(file))
    }

    @Test
    fun testIsDatabaseValidWithEmptyFile() {
        val file = tempFolder.newFile("test_empty.sqlite")
        assertFalse(CloudStorageSyncer.isDatabaseValid(file))
    }

    @Test
    fun testIsDatabaseValidWithCorruptedHeader() {
        val file = tempFolder.newFile("test_corrupt.sqlite")
        file.writeBytes("Not a sqlite file content but long enough to exceed minimum check length...".toByteArray())
        assertFalse(CloudStorageSyncer.isDatabaseValid(file))
    }

    @Test
    fun testIsDatabaseValidWithNonExistentFile() {
        val file = File(tempFolder.root, "does_not_exist.sqlite")
        assertFalse(CloudStorageSyncer.isDatabaseValid(file))
    }
}
