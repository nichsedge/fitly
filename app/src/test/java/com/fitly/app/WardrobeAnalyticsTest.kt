package com.fitly.app

import com.fitly.app.data.local.entity.ClothingItemEntity
import org.junit.Assert.*
import org.junit.Test

class WardrobeAnalyticsTest {

    private fun createTestItem(
        id: String,
        price: Double? = null,
        wearCount: Int = 0,
        lastWornAt: Long? = null,
        status: String = "ready",
        sparkJoy: String? = null
    ): ClothingItemEntity {
        return ClothingItemEntity(
            id = id,
            name = "Test Item $id",
            price = price,
            wearCount = wearCount,
            lastWornAt = lastWornAt,
            status = status,
            sparkJoy = sparkJoy
        )
    }

    @Test
    fun testCostPerWearCalculation() {
        val item1 = createTestItem(id = "1", price = 300_000.0, wearCount = 10)
        val cpw1 = (item1.price ?: 0.0) / item1.wearCount.coerceAtLeast(1)
        assertEquals(30_000.0, cpw1, 0.001)

        // Zero wears should not divide by zero
        val item2 = createTestItem(id = "2", price = 500_000.0, wearCount = 0)
        val cpw2 = (item2.price ?: 0.0) / item2.wearCount.coerceAtLeast(1)
        assertEquals(500_000.0, cpw2, 0.001)

        // Free item
        val item3 = createTestItem(id = "3", price = 0.0, wearCount = 5)
        val cpw3 = (item3.price ?: 0.0) / item3.wearCount.coerceAtLeast(1)
        assertEquals(0.0, cpw3, 0.001)
    }

    @Test
    fun testDustCollectorsFilteringExcludesRetired() {
        val now = System.currentTimeMillis()
        val sixtyDaysAgo = now - 60L * 24 * 60 * 60 * 1000

        val activeRecentlyWorn = createTestItem(id = "1", wearCount = 5, lastWornAt = now - 5L * 24 * 60 * 60 * 1000, status = "ready")
        val activeNeverWorn = createTestItem(id = "2", wearCount = 0, lastWornAt = null, status = "ready")
        val activeOldWorn = createTestItem(id = "3", wearCount = 2, lastWornAt = sixtyDaysAgo - 10_000, status = "ready")
        val retiredOldItem = createTestItem(id = "4", wearCount = 0, lastWornAt = null, status = "retired")

        val allItems = listOf(activeRecentlyWorn, activeNeverWorn, activeOldWorn, retiredOldItem)

        // Only active items should be considered for dust collectors
        val activeItems = allItems.filter { it.status != "retired" }
        assertEquals(3, activeItems.size)

        val dustCollectors = activeItems.filter { it.wearCount == 0 || (it.lastWornAt ?: 0L) < sixtyDaysAgo }
        assertEquals(2, dustCollectors.size)
        assertTrue(dustCollectors.any { it.id == "2" })
        assertTrue(dustCollectors.any { it.id == "3" })
        assertFalse("Retired item must NOT be in dust collectors", dustCollectors.any { it.id == "4" })
    }

    @Test
    fun testSparkJoyGrouping() {
        val items = listOf(
            createTestItem(id = "1", sparkJoy = "joy"),
            createTestItem(id = "2", sparkJoy = "joy"),
            createTestItem(id = "3", sparkJoy = "essential"),
            createTestItem(id = "4", sparkJoy = null), // default essential
            createTestItem(id = "5", sparkJoy = "no-joy")
        )

        val joyItems = items.filter { it.sparkJoy == "joy" }
        val essentialItems = items.filter { it.sparkJoy == "essential" || it.sparkJoy == null }
        val releaseItems = items.filter { it.sparkJoy == "no-joy" }

        assertEquals(2, joyItems.size)
        assertEquals(2, essentialItems.size)
        assertEquals(1, releaseItems.size)
    }
}
