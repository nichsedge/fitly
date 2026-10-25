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
                val lastWashedAt = if (obj.has("lastWashedAt") && !obj.isNull("lastWashedAt")) obj.getLong("lastWashedAt") else null
                val retiredAt = if (obj.has("retiredAt") && !obj.isNull("retiredAt")) obj.getLong("retiredAt") else null
                val retirementReason = obj.optStringOrNull("retirementReason")

                val tagsJson = obj.optJSONArray("tags")?.toString() ?: "[]"
                val imagesJson = obj.optJSONArray("images")?.toString() ?: "[]"

                val wearLogsJson = obj.optJSONArray("wearLogs") ?: JSONArray()
                var wearCount = 0
                var lastWorn: Long? = if (obj.has("lastWornAt") && !obj.isNull("lastWornAt")) obj.getLong("lastWornAt") else null

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
                    val type = when (itemVal) {
                        is JSONObject -> itemVal.optString("type", "wear")
                        else -> "wear"
                    }
                    val notes = when (itemVal) {
                        is JSONObject -> itemVal.optStringOrNull("notes")
                        else -> null
                    }
                    val logId = if (itemVal is JSONObject && itemVal.has("id")) {
                        itemVal.getString("id")
                    } else {
                        "${id}_${type}_$w"
                    }

                    if (type == "wear") {
                        wearCount++
                        if (lastWorn == null || ts > lastWorn) {
                            lastWorn = ts
                        }
                    }

                    wearLogsList.add(
                        WearLogEntity(
                            id = logId,
                            itemId = id,
                            wornDate = date,
                            timestamp = ts,
                            notes = notes,
                            type = type
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
                        lastWashedAt = lastWashedAt,
                        createdAt = createdAt,
                        retiredAt = retiredAt,
                        retirementReason = retirementReason,
                        sparkJoy = sparkJoy,
                        gratitudeNote = gratitudeNote
                    )
                )
            }
            if (itemsList.isNotEmpty()) dao.insertItems(itemsList)
            if (wearLogsList.isNotEmpty()) dao.insertWearLogs(wearLogsList)

            // 4. Outfits
            val outfitsArray = root.optJSONArray("outfits") ?: JSONArray()
            val outfitsList = mutableListOf<OutfitEntity>()
            val outfitLogsList = mutableListOf<WearLogEntity>()

            for (i in 0 until outfitsArray.length()) {
                val obj = outfitsArray.getJSONObject(i)
                val id = obj.getString("id")
                val name = obj.getString("name")
                val note = obj.optStringOrNull("note")
                val itemIds = obj.optJSONArray("itemIds")?.toString() ?: "[]"
                val createdAt = obj.optLong("createdAt", System.currentTimeMillis())
                val wearLogs = obj.optJSONArray("wearLogs") ?: JSONArray()
                var oWearCount = 0
                var oLastWorn: Long? = if (obj.has("lastWornAt") && !obj.isNull("lastWornAt")) obj.getLong("lastWornAt") else null

                for (w in 0 until wearLogs.length()) {
                    val oVal = wearLogs.get(w)
                    val ts = when (oVal) {
                        is Number -> oVal.toLong()
                        is JSONObject -> oVal.optLong("timestamp", System.currentTimeMillis())
                        else -> System.currentTimeMillis()
                    }
                    val date = when (oVal) {
                        is JSONObject -> oVal.optString("wornDate", "2026-01-01")
                        else -> java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date(ts))
                    }
                    val type = when (oVal) {
                        is JSONObject -> oVal.optString("type", "wear")
                        else -> "wear"
                    }
                    val notes = when (oVal) {
                        is JSONObject -> oVal.optStringOrNull("notes")
                        else -> null
                    }
                    val logId = if (oVal is JSONObject && oVal.has("id")) {
                        oVal.getString("id")
                    } else {
                        "${id}_outfit_${type}_$w"
                    }

                    if (type == "wear") {
                        oWearCount++
                        if (oLastWorn == null || ts > oLastWorn) {
                            oLastWorn = ts
                        }
                    }

                    outfitLogsList.add(
                        WearLogEntity(
                            id = logId,
                            outfitId = id,
                            wornDate = date,
                            timestamp = ts,
                            notes = notes,
                            type = type
                        )
                    )
                }

                outfitsList.add(
                    OutfitEntity(
                        id = id,
                        name = name,
                        note = note,
                        itemIds = itemIds,
                        wearCount = oWearCount,
                        lastWornAt = oLastWorn,
                        createdAt = createdAt
                    )
                )
            }
            if (outfitsList.isNotEmpty()) dao.insertOutfits(outfitsList)
            if (outfitLogsList.isNotEmpty()) dao.insertWearLogs(outfitLogsList)

            // 5. Trips
            val tripsArray = root.optJSONArray("trips") ?: JSONArray()
            val tripsList = mutableListOf<TripEntity>()
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
                tripsList.add(trip)
            }
            if (tripsList.isNotEmpty()) dao.insertTrips(tripsList)

            // 6. Planned Outfits
            val plannedArray = root.optJSONArray("plannedOutfits") ?: JSONArray()
            val plannedList = mutableListOf<PlannedOutfitEntity>()
            for (i in 0 until plannedArray.length()) {
                val obj = plannedArray.getJSONObject(i)
                val plan = PlannedOutfitEntity(
                    id = obj.getString("id"),
                    date = obj.getString("date"),
                    outfitId = obj.optStringOrNull("outfitId"),
                    itemIds = obj.optJSONArray("itemIds")?.toString() ?: "[]",
                    note = obj.optStringOrNull("note"),
                    createdAt = obj.optLong("createdAt", System.currentTimeMillis())
                )
                plannedList.add(plan)
            }
            if (plannedList.isNotEmpty()) dao.insertPlans(plannedList)

            Result.success(itemsList.size)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
