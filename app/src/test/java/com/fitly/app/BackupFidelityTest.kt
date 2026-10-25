package com.fitly.app

import com.fitly.app.data.local.FitlyDao
import com.fitly.app.data.local.entity.*
import com.fitly.app.data.util.JsonBackupImporter
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test

class FakeFitlyDao : FitlyDao {
    val items = mutableListOf<ClothingItemEntity>()
    val outfits = mutableListOf<OutfitEntity>()
    val wearLogs = mutableListOf<WearLogEntity>()
    val plans = mutableListOf<PlannedOutfitEntity>()
    val trips = mutableListOf<TripEntity>()
    val tags = mutableListOf<TagEntity>()
    val locations = mutableListOf<LocationEntity>()

    override fun getAllActiveItems(): Flow<List<ClothingItemEntity>> = flowOf(items.filter { it.status != "retired" })
    override fun getAllItems(): Flow<List<ClothingItemEntity>> = flowOf(items)
    override fun getItemsByStatus(status: String): Flow<List<ClothingItemEntity>> = flowOf(items.filter { it.status == status })
    override fun getItemsByCategory(category: String): Flow<List<ClothingItemEntity>> = flowOf(items.filter { it.category == category })
    override suspend fun getItemById(id: String): ClothingItemEntity? = items.find { it.id == id }
    override suspend fun insertItem(item: ClothingItemEntity) { items.removeAll { it.id == item.id }; items.add(item) }
    override suspend fun insertItems(items: List<ClothingItemEntity>) {
        val ids = items.map { it.id }.toSet()
        this.items.removeAll { it.id in ids }
        this.items.addAll(items)
    }
    override suspend fun updateItem(item: ClothingItemEntity) { insertItem(item) }
    override suspend fun deleteItem(item: ClothingItemEntity) { items.removeIf { it.id == item.id } }
    override suspend fun recordItemWear(itemId: String, timestamp: Long) {}
    override suspend fun markItemWashed(itemId: String, timestamp: Long) {}
    override suspend fun markAllDirtyWashed(timestamp: Long) {}
    override suspend fun markAllCleaningWashed(timestamp: Long) {}
    override suspend fun retireItem(itemId: String, reason: String, note: String?, timestamp: Long) {}

    override fun getAllOutfits(): Flow<List<OutfitEntity>> = flowOf(outfits)
    override suspend fun getOutfitById(id: String): OutfitEntity? = outfits.find { it.id == id }
    override suspend fun insertOutfit(outfit: OutfitEntity) { outfits.removeAll { it.id == outfit.id }; outfits.add(outfit) }
    override suspend fun insertOutfits(outfits: List<OutfitEntity>) {
        val ids = outfits.map { it.id }.toSet()
        this.outfits.removeAll { it.id in ids }
        this.outfits.addAll(outfits)
    }
    override suspend fun updateOutfit(outfit: OutfitEntity) { insertOutfit(outfit) }
    override suspend fun deleteOutfit(outfit: OutfitEntity) { outfits.removeIf { it.id == outfit.id } }
    override suspend fun recordOutfitWear(outfitId: String, timestamp: Long) {}

    override fun getAllWearLogs(): Flow<List<WearLogEntity>> = flowOf(wearLogs)
    override fun getLogsByDate(date: String): Flow<List<WearLogEntity>> = flowOf(wearLogs.filter { it.wornDate == date })
    override fun getLogsForMonth(monthPrefix: String): Flow<List<WearLogEntity>> = flowOf(wearLogs.filter { it.wornDate.startsWith(monthPrefix) })
    override suspend fun insertWearLog(log: WearLogEntity) { wearLogs.removeAll { it.id == log.id }; wearLogs.add(log) }
    override suspend fun insertWearLogs(logs: List<WearLogEntity>) {
        val ids = logs.map { it.id }.toSet()
        this.wearLogs.removeAll { it.id in ids }
        this.wearLogs.addAll(logs)
    }
    override suspend fun deleteWearLog(log: WearLogEntity) { wearLogs.removeIf { it.id == log.id } }

    override fun getAllPlannedOutfits(): Flow<List<PlannedOutfitEntity>> = flowOf(plans)
    override fun getPlanForDateFlow(date: String): Flow<PlannedOutfitEntity?> = flowOf(plans.find { it.date == date })
    override fun getPlansForMonth(monthPrefix: String): Flow<List<PlannedOutfitEntity>> = flowOf(plans.filter { it.date.startsWith(monthPrefix) })
    override suspend fun getPlanForDate(date: String): PlannedOutfitEntity? = plans.find { it.date == date }
    override suspend fun insertPlan(plan: PlannedOutfitEntity) { plans.removeAll { it.id == plan.id }; plans.add(plan) }
    override suspend fun insertPlans(plans: List<PlannedOutfitEntity>) {
        val ids = plans.map { it.id }.toSet()
        this.plans.removeAll { it.id in ids }
        this.plans.addAll(plans)
    }
    override suspend fun deletePlan(plan: PlannedOutfitEntity) { plans.removeIf { it.id == plan.id } }

    override fun getAllTrips(): Flow<List<TripEntity>> = flowOf(trips)
    override suspend fun getTripById(id: String): TripEntity? = trips.find { it.id == id }
    override suspend fun insertTrip(trip: TripEntity) { trips.removeAll { it.id == trip.id }; trips.add(trip) }
    override suspend fun insertTrips(trips: List<TripEntity>) {
        val ids = trips.map { it.id }.toSet()
        this.trips.removeAll { it.id in ids }
        this.trips.addAll(trips)
    }
    override suspend fun updateTrip(trip: TripEntity) { insertTrip(trip) }
    override suspend fun deleteTrip(trip: TripEntity) { trips.removeIf { it.id == trip.id } }

    override fun getAllTags(): Flow<List<TagEntity>> = flowOf(tags)
    override suspend fun insertTags(tags: List<TagEntity>) { this.tags.addAll(tags) }
    override suspend fun insertTag(tag: TagEntity) { this.tags.add(tag) }

    override fun getAllLocations(): Flow<List<LocationEntity>> = flowOf(locations)
    override suspend fun insertLocations(locations: List<LocationEntity>) { this.locations.addAll(locations) }
    override suspend fun insertLocation(location: LocationEntity) { this.locations.add(location) }

    override suspend fun getActiveItemCount(): Int = items.count { it.status != "retired" }
    override suspend fun getOutfitCount(): Int = outfits.size
    override suspend fun getDirtyItemCount(): Int = items.count { it.status == "dirty" }
}

class BackupFidelityTest {

    @Test
    fun testJsonImportPreservesAllFieldsAndLogTypes() = runBlocking {
        val dao = FakeFitlyDao()

        val sampleJson = """
        {
          "items": [
            {
              "id": "item_123",
              "name": "Uniqlo Linen Shirt",
              "brand": "Uniqlo",
              "price": 399000.0,
              "status": "ready",
              "category": "top",
              "sparkJoy": "joy",
              "gratitudeNote": "Very breathable for hot days",
              "lastWashedAt": 1729000000000,
              "retiredAt": null,
              "retirementReason": null,
              "wearLogs": [
                {
                  "id": "log_w_1",
                  "wornDate": "2026-10-20",
                  "timestamp": 1729400000000,
                  "type": "wear"
                },
                {
                  "id": "log_wash_1",
                  "wornDate": "2026-10-21",
                  "timestamp": 1729486400000,
                  "type": "wash"
                }
              ]
            },
            {
              "id": "item_retired_456",
              "name": "Old Canvas Shoes",
              "price": 150000.0,
              "status": "retired",
              "category": "shoes",
              "sparkJoy": "no-joy",
              "retiredAt": 1728000000000,
              "retirementReason": "donated",
              "wearLogs": []
            }
          ],
          "plannedOutfits": [
            {
              "id": "plan_1",
              "date": "2026-10-26",
              "itemIds": ["item_123"],
              "note": "Office presentation outfit"
            }
          ],
          "trips": [
            {
              "id": "trip_1",
              "name": "Bandung Trip",
              "destination": "Bandung",
              "startDate": "2026-11-01",
              "endDate": "2026-11-03",
              "itemIds": ["item_123"],
              "packedItemIds": ["item_123"],
              "completed": false
            }
          ]
        }
        """.trimIndent()

        val result = JsonBackupImporter.importJsonString(sampleJson, dao)
        if (result.isFailure) {
            fail("Import failed: ${result.exceptionOrNull()?.message}\n${result.exceptionOrNull()?.stackTraceToString()}")
        }
        assertTrue(result.isSuccess)
        assertEquals(2, result.getOrNull())

        // Verify Item 1: Uniqlo Linen Shirt
        val item1 = dao.items.find { it.id == "item_123" }
        assertNotNull(item1)
        assertEquals("joy", item1?.sparkJoy)
        assertEquals("Very breathable for hot days", item1?.gratitudeNote)
        assertEquals(1729000000000L, item1?.lastWashedAt)
        // Wear count should ONLY count wear logs (1 wear, 1 wash -> wearCount = 1)
        assertEquals(1, item1?.wearCount)
        assertEquals(1729400000000L, item1?.lastWornAt)

        // Verify wear logs types were preserved
        val wearLogs = dao.wearLogs.filter { it.itemId == "item_123" }
        assertEquals(2, wearLogs.size)
        val wearLog = wearLogs.find { it.id == "log_w_1" }
        val washLog = wearLogs.find { it.id == "log_wash_1" }
        assertEquals("wear", wearLog?.type)
        assertEquals("wash", washLog?.type)

        // Verify Item 2: Retired item fields
        val retiredItem = dao.items.find { it.id == "item_retired_456" }
        assertNotNull(retiredItem)
        assertEquals("retired", retiredItem?.status)
        assertEquals("donated", retiredItem?.retirementReason)
        assertEquals(1728000000000L, retiredItem?.retiredAt)
        assertEquals("no-joy", retiredItem?.sparkJoy)

        // Verify Planned Outfits restored
        assertEquals(1, dao.plans.size)
        val plan = dao.plans[0]
        assertEquals("plan_1", plan.id)
        assertEquals("2026-10-26", plan.date)
        assertEquals("Office presentation outfit", plan.note)

        // Verify Trips restored
        assertEquals(1, dao.trips.size)
        val trip = dao.trips[0]
        assertEquals("Bandung Trip", trip.name)
        assertEquals("Bandung", trip.destination)
    }
}
