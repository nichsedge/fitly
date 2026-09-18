package com.fitly.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "items")
data class ClothingItemEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val brand: String? = null,
    val price: Double? = null,
    val purchaseDate: String? = null,
    val status: String = "ready", // ready, dirty, cleaning, retired
    val category: String = "top", // top, bottom, outerwear, shoes, accessory, bag, underwear
    val locationId: String? = null,
    val color: String? = null,
    val tags: String = "[]", // JSON array of tag labels
    val images: String = "[]", // JSON array of image file basenames
    val material: String? = null,
    val careInstructions: String? = null,
    val condition: String? = "good", // new, excellent, good, fair, poor, needs-repair, retired
    val wearCount: Int = 0,
    val lastWornAt: Long? = null,
    val lastWashedAt: Long? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val retiredAt: Long? = null,
    val retirementReason: String? = null, // donated, sold, recycled, discarded
    val sparkJoy: String? = null, // joy, essential, no-joy
    val gratitudeNote: String? = null
)

@Entity(tableName = "outfits")
data class OutfitEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val note: String? = null,
    val itemIds: String = "[]", // JSON array of ClothingItemEntity IDs
    val wearCount: Int = 0,
    val lastWornAt: Long? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "wear_logs")
data class WearLogEntity(
    @PrimaryKey
    val id: String,
    val itemId: String? = null,
    val outfitId: String? = null,
    val wornDate: String, // YYYY-MM-DD
    val timestamp: Long = System.currentTimeMillis(),
    val notes: String? = null,
    val type: String = "wear" // wear, wash
)

@Entity(tableName = "planned_outfits")
data class PlannedOutfitEntity(
    @PrimaryKey
    val id: String,
    val date: String, // YYYY-MM-DD
    val outfitId: String? = null,
    val itemIds: String = "[]",
    val note: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "trips")
data class TripEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val destination: String? = null,
    val startDate: String, // YYYY-MM-DD
    val endDate: String, // YYYY-MM-DD
    val itemIds: String = "[]", // JSON array of ClothingItemEntity IDs
    val outfitIds: String = "[]", // JSON array of OutfitEntity IDs
    val packedItemIds: String = "[]", // JSON array of packed ClothingItemEntity IDs
    val completed: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "tags")
data class TagEntity(
    @PrimaryKey
    val id: String,
    val label: String
)

@Entity(tableName = "locations")
data class LocationEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val icon: String? = null,
    val isDefault: Boolean = false
)
