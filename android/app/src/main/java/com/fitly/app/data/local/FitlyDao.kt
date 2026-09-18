package com.fitly.app.data.local

import androidx.room.*
import com.fitly.app.data.local.entity.*
import kotlinx.coroutines.flow.Flow

@Dao
interface FitlyDao {

    // --- Items ---
    @Query("SELECT * FROM items WHERE status != 'retired' ORDER BY createdAt DESC")
    fun getAllActiveItems(): Flow<List<ClothingItemEntity>>

    @Query("SELECT * FROM items ORDER BY createdAt DESC")
    fun getAllItems(): Flow<List<ClothingItemEntity>>

    @Query("SELECT * FROM items WHERE status = :status ORDER BY createdAt DESC")
    fun getItemsByStatus(status: String): Flow<List<ClothingItemEntity>>

    @Query("SELECT * FROM items WHERE category = :category AND status != 'retired' ORDER BY createdAt DESC")
    fun getItemsByCategory(category: String): Flow<List<ClothingItemEntity>>

    @Query("SELECT * FROM items WHERE id = :id")
    suspend fun getItemById(id: String): ClothingItemEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItem(item: ClothingItemEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItems(items: List<ClothingItemEntity>)

    @Update
    suspend fun updateItem(item: ClothingItemEntity)

    @Delete
    suspend fun deleteItem(item: ClothingItemEntity)

    @Query("UPDATE items SET wearCount = wearCount + 1, lastWornAt = :timestamp WHERE id = :itemId")
    suspend fun recordItemWear(itemId: String, timestamp: Long)

    @Query("UPDATE items SET status = 'ready', lastWashedAt = :timestamp WHERE id = :itemId")
    suspend fun markItemWashed(itemId: String, timestamp: Long)

    @Query("UPDATE items SET status = 'ready', lastWashedAt = :timestamp WHERE status = 'dirty'")
    suspend fun markAllDirtyWashed(timestamp: Long)

    @Query("UPDATE items SET status = 'ready', lastWashedAt = :timestamp WHERE status = 'cleaning'")
    suspend fun markAllCleaningWashed(timestamp: Long)

    @Query("UPDATE items SET status = 'retired', retiredAt = :timestamp, retirementReason = :reason, gratitudeNote = :note WHERE id = :itemId")
    suspend fun retireItem(itemId: String, reason: String, note: String?, timestamp: Long)

    // --- Outfits ---
    @Query("SELECT * FROM outfits ORDER BY createdAt DESC")
    fun getAllOutfits(): Flow<List<OutfitEntity>>

    @Query("SELECT * FROM outfits WHERE id = :id")
    suspend fun getOutfitById(id: String): OutfitEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOutfit(outfit: OutfitEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOutfits(outfits: List<OutfitEntity>)

    @Update
    suspend fun updateOutfit(outfit: OutfitEntity)

    @Delete
    suspend fun deleteOutfit(outfit: OutfitEntity)

    @Query("UPDATE outfits SET wearCount = wearCount + 1, lastWornAt = :timestamp WHERE id = :outfitId")
    suspend fun recordOutfitWear(outfitId: String, timestamp: Long)

    // --- Wear & Wash Logs ---
    @Query("SELECT * FROM wear_logs ORDER BY timestamp DESC")
    fun getAllWearLogs(): Flow<List<WearLogEntity>>

    @Query("SELECT * FROM wear_logs WHERE wornDate = :date ORDER BY timestamp DESC")
    fun getLogsByDate(date: String): Flow<List<WearLogEntity>>

    @Query("SELECT * FROM wear_logs WHERE wornDate LIKE :monthPrefix || '%' ORDER BY timestamp DESC")
    fun getLogsForMonth(monthPrefix: String): Flow<List<WearLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWearLog(log: WearLogEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWearLogs(logs: List<WearLogEntity>)

    @Delete
    suspend fun deleteWearLog(log: WearLogEntity)

    // --- Planned Outfits ---
    @Query("SELECT * FROM planned_outfits ORDER BY date ASC")
    fun getAllPlannedOutfits(): Flow<List<PlannedOutfitEntity>>

    @Query("SELECT * FROM planned_outfits WHERE date = :date")
    fun getPlanForDateFlow(date: String): Flow<PlannedOutfitEntity?>

    @Query("SELECT * FROM planned_outfits WHERE date LIKE :monthPrefix || '%' ORDER BY date ASC")
    fun getPlansForMonth(monthPrefix: String): Flow<List<PlannedOutfitEntity>>

    @Query("SELECT * FROM planned_outfits WHERE date = :date")
    suspend fun getPlanForDate(date: String): PlannedOutfitEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPlan(plan: PlannedOutfitEntity)

    @Delete
    suspend fun deletePlan(plan: PlannedOutfitEntity)

    // --- Trips ---
    @Query("SELECT * FROM trips ORDER BY startDate DESC")
    fun getAllTrips(): Flow<List<TripEntity>>

    @Query("SELECT * FROM trips WHERE id = :id")
    suspend fun getTripById(id: String): TripEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTrip(trip: TripEntity)

    @Update
    suspend fun updateTrip(trip: TripEntity)

    @Delete
    suspend fun deleteTrip(trip: TripEntity)

    // --- Tags ---
    @Query("SELECT * FROM tags ORDER BY label ASC")
    fun getAllTags(): Flow<List<TagEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTags(tags: List<TagEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTag(tag: TagEntity)

    // --- Locations ---
    @Query("SELECT * FROM locations")
    fun getAllLocations(): Flow<List<LocationEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLocations(locations: List<LocationEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLocation(location: LocationEntity)

    // --- Stats ---
    @Query("SELECT COUNT(*) FROM items WHERE status != 'retired'")
    suspend fun getActiveItemCount(): Int

    @Query("SELECT COUNT(*) FROM outfits")
    suspend fun getOutfitCount(): Int

    @Query("SELECT COUNT(*) FROM items WHERE status = 'dirty'")
    suspend fun getDirtyItemCount(): Int
}
