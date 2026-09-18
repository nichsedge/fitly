package com.fitly.app.data.util

import android.content.Context
import android.net.Uri
import com.fitly.app.data.local.FitlyDao
import com.fitly.app.data.local.entity.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.*
import java.text.SimpleDateFormat
import java.util.*
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream

object ZipBackupManager {

    suspend fun exportToZip(context: Context, dao: FitlyDao, outputStream: OutputStream): Result<Int> = withContext(Dispatchers.IO) {
        try {
            val items = dao.getAllItems().first()
            val outfits = dao.getAllOutfits().first()
            val tags = dao.getAllTags().first()
            val locations = dao.getAllLocations().first()
            val wearLogs = dao.getAllWearLogs().first()
            val trips = dao.getAllTrips().first()

            val rootJson = JSONObject()

            // 1. Tags
            val tagsArray = JSONArray()
            for (t in tags) {
                val obj = JSONObject()
                obj.put("id", t.id)
                obj.put("label", t.label)
                tagsArray.put(obj)
            }
            rootJson.put("tags", tagsArray)

            // 2. Locations
            val locsArray = JSONArray()
            for (l in locations) {
                val obj = JSONObject()
                obj.put("id", l.id)
                obj.put("name", l.name)
                obj.put("icon", l.icon)
                obj.put("isDefault", l.isDefault)
                locsArray.put(obj)
            }
            rootJson.put("locations", locsArray)

            // Group wearLogs by itemId and outfitId
            val itemWearMap = wearLogs.filter { it.itemId != null }.groupBy { it.itemId!! }
            val outfitWearMap = wearLogs.filter { it.outfitId != null }.groupBy { it.outfitId!! }

            // 3. Items
            val itemsArray = JSONArray()
            for (item in items) {
                val obj = JSONObject()
                obj.put("id", item.id)
                obj.put("name", item.name)
                obj.put("brand", item.brand)
                if (item.price != null) obj.put("price", item.price)
                obj.put("purchaseDate", item.purchaseDate)
                obj.put("status", item.status)
                obj.put("category", item.category)
                obj.put("locationId", item.locationId)
                obj.put("color", item.color)
                obj.put("tags", JSONArray(item.tags))
                obj.put("images", JSONArray(item.images))
                obj.put("material", item.material)
                obj.put("careInstructions", item.careInstructions)
                obj.put("condition", item.condition)
                obj.put("sparkJoy", item.sparkJoy)
                obj.put("gratitudeNote", item.gratitudeNote)
                obj.put("createdAt", item.createdAt)
                if (item.lastWornAt != null) obj.put("lastWornAt", item.lastWornAt)
                if (item.lastWashedAt != null) obj.put("lastWashedAt", item.lastWashedAt)
                if (item.retiredAt != null) obj.put("retiredAt", item.retiredAt)
                if (item.retirementReason != null) obj.put("retirementReason", item.retirementReason)

                val itemLogs = itemWearMap[item.id] ?: emptyList()
                val wearLogsArray = JSONArray()
                for (log in itemLogs) {
                    val logObj = JSONObject()
                    logObj.put("id", log.id)
                    logObj.put("timestamp", log.timestamp)
                    logObj.put("wornDate", log.wornDate)
                    wearLogsArray.put(logObj)
                }
                obj.put("wearLogs", wearLogsArray)
                itemsArray.put(obj)
            }
            rootJson.put("items", itemsArray)

            // 4. Outfits
            val outfitsArray = JSONArray()
            for (outfit in outfits) {
                val obj = JSONObject()
                obj.put("id", outfit.id)
                obj.put("name", outfit.name)
                obj.put("note", outfit.note)
                obj.put("itemIds", JSONArray(outfit.itemIds))
                obj.put("createdAt", outfit.createdAt)
                if (outfit.lastWornAt != null) obj.put("lastWornAt", outfit.lastWornAt)

                val oLogs = outfitWearMap[outfit.id] ?: emptyList()
                val wearLogsArray = JSONArray()
                for (log in oLogs) {
                    val logObj = JSONObject()
                    logObj.put("id", log.id)
                    logObj.put("timestamp", log.timestamp)
                    logObj.put("wornDate", log.wornDate)
                    wearLogsArray.put(logObj)
                }
                obj.put("wearLogs", wearLogsArray)
                outfitsArray.put(obj)
            }
            rootJson.put("outfits", outfitsArray)

            // 5. Trips
            val tripsArray = JSONArray()
            for (trip in trips) {
                val obj = JSONObject()
                obj.put("id", trip.id)
                obj.put("name", trip.name)
                obj.put("destination", trip.destination)
                obj.put("startDate", trip.startDate)
                obj.put("endDate", trip.endDate)
                obj.put("itemIds", JSONArray(trip.itemIds))
                obj.put("outfitIds", JSONArray(trip.outfitIds))
                obj.put("packedItemIds", JSONArray(trip.packedItemIds))
                obj.put("completed", trip.completed)
                obj.put("createdAt", trip.createdAt)
                tripsArray.put(obj)
            }
            rootJson.put("trips", tripsArray)

            // Pack Zip
            val zos = ZipOutputStream(BufferedOutputStream(outputStream))
            // 1. wardrobe.json
            val jsonBytes = rootJson.toString(2).toByteArray(Charsets.UTF_8)
            zos.putNextEntry(ZipEntry(AppConstants.BACKUP_JSON_FILENAME))
            zos.write(jsonBytes)
            zos.closeEntry()

            // 2. images/ directory
            val imagesDir = File(context.filesDir, AppConstants.IMAGES_DIRECTORY)
            var imageCount = 0
            if (imagesDir.exists() && imagesDir.isDirectory) {
                val files = imagesDir.listFiles() ?: emptyArray()
                for (imgFile in files) {
                    if (imgFile.isFile) {
                        zos.putNextEntry(ZipEntry("${AppConstants.IMAGES_DIRECTORY}/${imgFile.name}"))
                        imgFile.inputStream().use { input ->
                            input.copyTo(zos)
                        }
                        zos.closeEntry()
                        imageCount++
                    }
                }
            }

            zos.finish()
            zos.flush()
            Result.success(items.size)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun importFromZip(context: Context, dao: FitlyDao, inputStream: InputStream): Result<Int> = withContext(Dispatchers.IO) {
        try {
            val zis = ZipInputStream(BufferedInputStream(inputStream))
            var entry: ZipEntry? = zis.nextEntry
            var jsonString: String? = null
            val imagesDir = File(context.filesDir, AppConstants.IMAGES_DIRECTORY)
            if (!imagesDir.exists()) imagesDir.mkdirs()

            val imagesPrefix = "${AppConstants.IMAGES_DIRECTORY}/"
            var restoredImages = 0
            while (entry != null) {
                val name = entry.name
                if (name == AppConstants.BACKUP_JSON_FILENAME) {
                    val baos = ByteArrayOutputStream()
                    zis.copyTo(baos)
                    jsonString = baos.toString("UTF-8")
                } else if (name.startsWith(imagesPrefix) && !entry.isDirectory) {
                    val filename = File(name).name
                    if (filename.isNotBlank()) {
                        val destFile = File(imagesDir, filename)
                        FileOutputStream(destFile).use { fos ->
                            zis.copyTo(fos)
                        }
                        restoredImages++
                    }
                }
                zis.closeEntry()
                entry = zis.nextEntry
            }
            zis.close()

            if (jsonString.isNullOrBlank()) {
                return@withContext Result.failure(IllegalStateException("${AppConstants.BACKUP_JSON_FILENAME} not found in archive"))
            }

            JsonBackupImporter.importJsonString(jsonString, dao)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
