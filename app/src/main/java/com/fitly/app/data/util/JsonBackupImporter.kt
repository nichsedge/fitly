package com.fitly.app.data.util

import android.content.Context
import com.fitly.app.data.local.FitlyDao
import com.fitly.app.data.local.entity.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

object JsonBackupImporter {

    private fun JSONObject.optStringOrNull(name: String): String? {
        return if (has(name) && !isNull(name)) getString(name) else null
    }

    suspend fun importFromAssetsIfEmpty(context: Context, dao: FitlyDao) = withContext(Dispatchers.IO) {
        val count = dao.getActiveItemCount()
        if (count > 0) return@withContext

        try {
            val jsonStr = context.assets.open(AppConstants.SEED_BACKUP_ASSET_FILE).bufferedReader().use { it.readText() }
            importJsonString(jsonStr, dao)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun importJsonString(jsonStr: String, dao: FitlyDao): Result<Int> = withContext(Dispatchers.IO) {
        try {
            val root = JSONObject(jsonStr)

            // 1. Tags
            val tagsArray = root.optJSONArray("tags") ?: JSONArray()
            val tagsList = mutableListOf<TagEntity>()
            for (i in 0 until tagsArray.length()) {
                val obj = tagsArray.getJSONObject(i)
                tagsList.add(TagEntity(id = obj.getString("id"), label = obj.getString("label")))
            }
            if (tagsList.isNotEmpty()) dao.insertTags(tagsList)

            // 2. Locations
            val locsArray = root.optJSONArray("locations") ?: JSONArray()
            val locsList = mutableListOf<LocationEntity>()
            for (i in 0 until locsArray.length()) {
                val obj = locsArray.getJSONObject(i)
                locsList.add(
                    LocationEntity(
                        id = obj.getString("id"),
                        name = obj.getString("name"),
                        icon = obj.optStringOrNull("icon"),
                        isDefault = obj.optBoolean("isDefault", false)
                    )
                )
            }
            if (locsList.isNotEmpty()) dao.insertLocations(locsList)

            // 3. Items
            val itemsArray = root.optJSONArray("items") ?: JSONArray()
            val itemsList = mutableListOf<ClothingItemEntity>()
            val wearLogsList = mutableListOf<WearLogEntity>()

            for (i in 0 until itemsArray.length()) {
                val obj = itemsArray.getJSONObject(i)
                val id = obj.getString("id")
                val name = obj.getString("name")
                val brand = obj.optStringOrNull("brand")
                val price = if (obj.has("price") && !obj.isNull("price")) obj.getDouble("price") else null
                val purchaseDate = obj.optStringOrNull("purchaseDate")
                val status = obj.optString("status", "ready")
                val category = obj.optString("category", "top")
                val locationId = obj.optStringOrNull("locationId")
                val color = obj.optStringOrNull("color")
                val material = obj.optStringOrNull("material")
                val care = obj.optStringOrNull("careInstructions")
                val condition = obj.optString("condition", "good")
                val sparkJoy = obj.optStringOrNull("sparkJoy")
                val gratitudeNote = obj.optStringOrNull("gratitudeNote")
                val createdAt = obj.optLong("createdAt", System.currentTimeMillis())

                val tagsJson = obj.optJSONArray("tags")?.toString() ?: "[]"
                val imagesJson = obj.optJSONArray("images")?.toString() ?: "[]"

                val wearLogsJson = obj.optJSONArray("wearLogs") ?: JSONArray()
                val wearCount = wearLogsJson.length()

                var lastWorn: Long? = null
                for (w in 0 until wearLogsJson.length()) {
                    val itemVal = wearLogsJson.get(w)
                    val ts = when (itemVal) {
                        is Number -> itemVal.toLong()
                        is JSONObject -> itemVal.optLong("timestamp", System.currentTimeMillis())
                        else -> System.currentTimeMillis()
                    }
                    val date = when (itemVal) {
                        is JSONObject -> itemVal.optString("wornDate", "2026-01-01")
                        else -> java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date(ts))
                    }
                    if (lastWorn == null || ts > lastWorn) {
                        lastWorn = ts
                    }
                    wearLogsList.add(
                        WearLogEntity(
                            id = "${id}_wear_$w",
                            itemId = id,
                            wornDate = date,
                            timestamp = ts,
                            type = "wear"
                        )
                    )
                }

                itemsList.add(
                    ClothingItemEntity(
                        id = id,
                        name = name,
                        brand = brand,
                        price = price,
                        purchaseDate = purchaseDate,
                        status = status,
                        category = category,
                        locationId = locationId,
                        color = color,
                        tags = tagsJson,
                        images = imagesJson,
                        material = material,
                        careInstructions = care,
                        condition = condition,
                        wearCount = wearCount,
                        lastWornAt = lastWorn,
                        sparkJoy = sparkJoy,
                        gratitudeNote = gratitudeNote,
                        createdAt = createdAt
                    )
                )
            }
            if (itemsList.isNotEmpty()) dao.insertItems(itemsList)
            if (wearLogsList.isNotEmpty()) dao.insertWearLogs(wearLogsList)

            // 4. Outfits
            val outfitsArray = root.optJSONArray("outfits") ?: JSONArray()
            val outfitsList = mutableListOf<OutfitEntity>()
            for (i in 0 until outfitsArray.length()) {
                val obj = outfitsArray.getJSONObject(i)
                val id = obj.getString("id")
                val name = obj.getString("name")
                val note = obj.optStringOrNull("note")
                val itemIds = obj.optJSONArray("itemIds")?.toString() ?: "[]"
                val createdAt = obj.optLong("createdAt", System.currentTimeMillis())
                val wearLogs = obj.optJSONArray("wearLogs") ?: JSONArray()
                outfitsList.add(
                    OutfitEntity(
                        id = id,
                        name = name,
                        note = note,
                        itemIds = itemIds,
                        wearCount = wearLogs.length(),
                        createdAt = createdAt
                    )
                )
            }
            if (outfitsList.isNotEmpty()) dao.insertOutfits(outfitsList)

            // 5. Trips
            val tripsArray = root.optJSONArray("trips") ?: JSONArray()
            for (i in 0 until tripsArray.length()) {
                val obj = tripsArray.getJSONObject(i)
                val trip = TripEntity(
                    id = obj.getString("id"),
                    name = obj.getString("name"),
                    destination = obj.optStringOrNull("destination"),
                    startDate = obj.getString("startDate"),
                    endDate = obj.getString("endDate"),
                    itemIds = obj.optJSONArray("itemIds")?.toString() ?: "[]",
                    outfitIds = obj.optJSONArray("outfitIds")?.toString() ?: "[]",
                    packedItemIds = obj.optJSONArray("packedItemIds")?.toString() ?: "[]",
                    completed = obj.optBoolean("completed", false),
                    createdAt = obj.optLong("createdAt", System.currentTimeMillis())
                )
                dao.insertTrip(trip)
            }

            Result.success(itemsList.size)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
