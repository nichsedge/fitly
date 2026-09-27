package com.fitly.app.presentation

import android.app.Application
import android.content.Context
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fitly.app.data.local.FitlyDatabase
import com.fitly.app.data.local.entity.*
import com.fitly.app.data.util.AppConstants
import com.fitly.app.data.util.CloudStorageSyncer
import com.fitly.app.data.util.ImageStorageHelper
import com.fitly.app.data.util.JsonBackupImporter
import com.fitly.app.data.util.ZipBackupManager
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import org.json.JSONArray
import java.io.File
import java.io.InputStream
import java.io.OutputStream
import java.text.SimpleDateFormat
import java.util.*

enum class WardrobeSort(val label: String) {
    RECENT("Recently Added"),
    MOST_WORN("Most Worn"),
    LEAST_WORN("Least Worn"),
    CPW_LOWEST("Best Value (Lowest CPW)"),
    CPW_HIGHEST("Highest CPW"),
    PRICE_HIGH("Price: High to Low"),
    PRICE_LOW("Price: Low to High"),
    NAME("Name (A-Z)")
}

enum class WardrobeViewMode {
    GRID_2,
    GRID_3,
    LIST
}

enum class OutfitSort(val label: String) {
    NEWEST("Recently Created"),
    OLDEST("Oldest Created"),
    NAME("Name (A-Z)"),
    MOST_WORN("Most Worn"),
    RECENTLY_WORN("Recently Worn"),
    ITEMS_COUNT("Most Items")
}

@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class WardrobeViewModel(application: Application) : AndroidViewModel(application) {

    val db = FitlyDatabase.getDatabase(application)
    val dao = db.fitlyDao()

    private val prefs = application.getSharedPreferences(AppConstants.PREFS_NAME, Context.MODE_PRIVATE)
    private val _dynamicColorEnabled = MutableStateFlow(prefs.getBoolean(AppConstants.PREF_KEY_DYNAMIC_COLOR, true))
    val dynamicColorEnabled: StateFlow<Boolean> = _dynamicColorEnabled.asStateFlow()

    fun setDynamicColorEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(AppConstants.PREF_KEY_DYNAMIC_COLOR, enabled).apply()
        _dynamicColorEnabled.value = enabled
    }

    private val _selectedCategory = MutableStateFlow<String?>(null)
    val selectedCategory: StateFlow<String?> = _selectedCategory.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _sortOption = MutableStateFlow(WardrobeSort.RECENT)
    val sortOption: StateFlow<WardrobeSort> = _sortOption.asStateFlow()

    private val _statusFilter = MutableStateFlow<String?>(null)
    val statusFilter: StateFlow<String?> = _statusFilter.asStateFlow()

    private val _sparkJoyFilter = MutableStateFlow<String?>(null)
    val sparkJoyFilter: StateFlow<String?> = _sparkJoyFilter.asStateFlow()

    private val _selectedLocationId = MutableStateFlow<String?>(null)
    val selectedLocationId: StateFlow<String?> = _selectedLocationId.asStateFlow()

    fun setSelectedLocationId(locationId: String?) {
        _selectedLocationId.value = locationId
    }

    private val _viewMode = MutableStateFlow(WardrobeViewMode.GRID_2)
    val viewMode: StateFlow<WardrobeViewMode> = _viewMode.asStateFlow()

    private val _syncStatus = MutableStateFlow<String?>(null)
    val syncStatus: StateFlow<String?> = _syncStatus.asStateFlow()

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    private val _userMessage = MutableSharedFlow<String>()
    val userMessage: SharedFlow<String> = _userMessage.asSharedFlow()

    fun notify(message: String) {
        viewModelScope.launch {
            _userMessage.emit(message)
        }
    }

    // Items
    val allItems: StateFlow<List<ClothingItemEntity>> = dao.getAllActiveItems()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allItemsIncludingRetired: StateFlow<List<ClothingItemEntity>> = dao.getAllItems()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val filteredItems: StateFlow<List<ClothingItemEntity>> = combine(
        allItems,
        _selectedCategory,
        _searchQuery,
        _sortOption,
        _statusFilter,
        _sparkJoyFilter,
        _selectedLocationId
    ) { args: Array<Any?> ->
        @Suppress("UNCHECKED_CAST")
        val items = args[0] as List<ClothingItemEntity>
        val category = args[1] as String?
        val query = args[2] as String
        val sort = args[3] as WardrobeSort
        val status = args[4] as String?
        val sparkJoy = args[5] as String?
        val locationId = args[6] as String?

        val filtered = items.filter { item ->
            val matchesCategory = category == null || item.category.equals(category, ignoreCase = true)
            val matchesQuery = query.isBlank() ||
                    item.name.contains(query, ignoreCase = true) ||
                    (item.brand?.contains(query, ignoreCase = true) == true) ||
                    (item.color?.contains(query, ignoreCase = true) == true)
            val matchesStatus = status == null || item.status.equals(status, ignoreCase = true)
            val matchesJoy = sparkJoy == null || item.sparkJoy.equals(sparkJoy, ignoreCase = true)
            val matchesLocation = locationId == null || item.locationId == locationId || (locationId == "loc-home" && item.locationId == null)

            matchesCategory && matchesQuery && matchesStatus && matchesJoy && matchesLocation
        }

        when (sort) {
            WardrobeSort.RECENT -> filtered.sortedByDescending { it.createdAt }
            WardrobeSort.MOST_WORN -> filtered.sortedByDescending { it.wearCount }
            WardrobeSort.LEAST_WORN -> filtered.sortedBy { it.wearCount }
            WardrobeSort.CPW_LOWEST -> filtered.sortedBy { (it.price ?: 0.0) / it.wearCount.coerceAtLeast(1) }
            WardrobeSort.CPW_HIGHEST -> filtered.sortedByDescending { (it.price ?: 0.0) / it.wearCount.coerceAtLeast(1) }
            WardrobeSort.PRICE_HIGH -> filtered.sortedByDescending { it.price ?: 0.0 }
            WardrobeSort.PRICE_LOW -> filtered.sortedBy { it.price ?: 0.0 }
            WardrobeSort.NAME -> filtered.sortedBy { it.name.lowercase() }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Outfits
    val outfits: StateFlow<List<OutfitEntity>> = dao.getAllOutfits()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _outfitSort = MutableStateFlow(
        try {
            OutfitSort.valueOf(prefs.getString(AppConstants.PREF_KEY_OUTFITS_SORT, OutfitSort.NEWEST.name) ?: OutfitSort.NEWEST.name)
        } catch (_: Exception) {
            OutfitSort.NEWEST
        }
    )
    val outfitSort: StateFlow<OutfitSort> = _outfitSort.asStateFlow()

    private val _outfitSearchQuery = MutableStateFlow("")
    val outfitSearchQuery: StateFlow<String> = _outfitSearchQuery.asStateFlow()

    fun setOutfitSort(sort: OutfitSort) {
        prefs.edit().putString(AppConstants.PREF_KEY_OUTFITS_SORT, sort.name).apply()
        _outfitSort.value = sort
    }

    fun setOutfitSearchQuery(query: String) {
        _outfitSearchQuery.value = query
    }

    val sortedOutfits: StateFlow<List<OutfitEntity>> = combine(
        dao.getAllOutfits(),
        _outfitSort,
        _outfitSearchQuery,
        _selectedLocationId,
        allItems
    ) { rawOutfits, sort, query, locationId, itemsList ->
        val itemMap = itemsList.associateBy { it.id }
        val filtered = rawOutfits.filter { outfit ->
            val matchesQuery = if (query.isBlank()) {
                true
            } else {
                outfit.name.contains(query, ignoreCase = true) ||
                (outfit.note?.contains(query, ignoreCase = true) == true)
            }
            val matchesLocation = if (locationId == null) {
                true
            } else {
                try {
                    val array = JSONArray(outfit.itemIds)
                    val ids = (0 until array.length()).map { array.getString(it) }
                    if (ids.isEmpty()) true
                    else ids.all { id ->
                        val itLoc = itemMap[id]?.locationId ?: "loc-home"
                        itLoc == locationId
                    }
                } catch (_: Exception) {
                    true
                }
            }
            matchesQuery && matchesLocation
        }
        when (sort) {
            OutfitSort.NEWEST -> filtered.sortedByDescending { it.createdAt }
            OutfitSort.OLDEST -> filtered.sortedBy { it.createdAt }
            OutfitSort.NAME -> filtered.sortedBy { it.name.lowercase() }
            OutfitSort.MOST_WORN -> filtered.sortedByDescending { it.wearCount }
            OutfitSort.RECENTLY_WORN -> filtered.sortedByDescending { it.lastWornAt ?: 0L }
            OutfitSort.ITEMS_COUNT -> filtered.sortedByDescending {
                try {
                    JSONArray(it.itemIds).length()
                } catch (_: Exception) {
                    0
                }
            }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Laundry
    val dirtyItems: StateFlow<List<ClothingItemEntity>> = dao.getItemsByStatus(AppConstants.STATUS_DIRTY)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val cleaningItems: StateFlow<List<ClothingItemEntity>> = dao.getItemsByStatus(AppConstants.STATUS_CLEANING)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val readyItems: StateFlow<List<ClothingItemEntity>> = dao.getItemsByStatus(AppConstants.STATUS_READY)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Trips
    val trips: StateFlow<List<TripEntity>> = dao.getAllTrips()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Tags & Locations
    val tags: StateFlow<List<TagEntity>> = dao.getAllTags()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val locations: StateFlow<List<LocationEntity>> = dao.getAllLocations()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Wear Logs
    val allWearLogs: StateFlow<List<WearLogEntity>> = dao.getAllWearLogs()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Calendar selection
    private val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    private val _selectedDate = MutableStateFlow(todayStr)
    val selectedDate: StateFlow<String> = _selectedDate.asStateFlow()

    private val currentMonthStr = SimpleDateFormat("yyyy-MM", Locale.US).format(Date())
    private val _currentMonth = MutableStateFlow(currentMonthStr)
    val currentMonth: StateFlow<String> = _currentMonth.asStateFlow()

    val logsForSelectedDate: StateFlow<List<WearLogEntity>> = _selectedDate.flatMapLatest { date ->
        dao.getLogsByDate(date)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val logsForCurrentMonth: StateFlow<List<WearLogEntity>> = _currentMonth.flatMapLatest { month ->
        dao.getLogsForMonth(month)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val plannedOutfitsForMonth: StateFlow<List<PlannedOutfitEntity>> = _currentMonth.flatMapLatest { month ->
        dao.getPlansForMonth(month)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val planForSelectedDate: StateFlow<PlannedOutfitEntity?> = _selectedDate.flatMapLatest { date ->
        dao.getPlanForDateFlow(date)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    init {
        viewModelScope.launch {
            JsonBackupImporter.importFromAssetsIfEmpty(getApplication(), dao)
        }
    }

    fun selectCategory(category: String?) {
        _selectedCategory.value = category
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setSortOption(sort: WardrobeSort) {
        _sortOption.value = sort
    }

    fun setStatusFilter(status: String?) {
        _statusFilter.value = status
    }

    fun setSparkJoyFilter(joy: String?) {
        _sparkJoyFilter.value = joy
    }

    fun setViewMode(mode: WardrobeViewMode) {
        _viewMode.value = mode
    }

    fun setSelectedDate(date: String) {
        _selectedDate.value = date
    }

    fun setCurrentMonth(month: String) {
        _currentMonth.value = month
    }

    // --- Item Mutations ---
    fun saveItem(item: ClothingItemEntity, newImageUri: Uri? = null, onComplete: (() -> Unit)? = null) {
        viewModelScope.launch {
            var updatedItem = item
            if (newImageUri != null) {
                val saveRes = ImageStorageHelper.saveImageFromUri(getApplication(), newImageUri)
                saveRes.onSuccess { newImageId ->
                    val existingImages = try {
                        val arr = JSONArray(item.images)
                        val list = mutableListOf<String>()
                        for (i in 0 until arr.length()) list.add(arr.getString(i))
                        list
                    } catch (_: Exception) {
                        mutableListOf<String>()
                    }
                    existingImages.add(0, newImageId)
                    updatedItem = updatedItem.copy(images = JSONArray(existingImages).toString())
                }
            }
            dao.insertItem(updatedItem)
            onComplete?.invoke()
        }
    }

    fun deleteItem(item: ClothingItemEntity, onComplete: (() -> Unit)? = null) {
        viewModelScope.launch {
            dao.deleteItem(item)
            onComplete?.invoke()
        }
    }

    fun retireItem(item: ClothingItemEntity, reason: String, note: String?, onComplete: (() -> Unit)? = null) {
        viewModelScope.launch {
            dao.retireItem(item.id, reason, note, System.currentTimeMillis())
            onComplete?.invoke()
        }
    }

    fun logItemWear(item: ClothingItemEntity, date: String = todayStr) {
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            dao.recordItemWear(item.id, now)
            dao.insertWearLog(
                WearLogEntity(
                    id = "wear_${UUID.randomUUID()}",
                    itemId = item.id,
                    wornDate = date,
                    timestamp = now,
                    type = "wear"
                )
            )
            notify("Wore ${item.name} ✨ (${item.wearCount + 1}x)")
        }
    }

    fun setItemStatus(item: ClothingItemEntity, newStatus: String) {
        viewModelScope.launch {
            val updated = item.copy(
                status = newStatus,
                lastWashedAt = if (newStatus == "ready") System.currentTimeMillis() else item.lastWashedAt
            )
            dao.updateItem(updated)
            if (newStatus == "ready") {
                dao.insertWearLog(
                    WearLogEntity(
                        id = "wash_${UUID.randomUUID()}",
                        itemId = item.id,
                        wornDate = todayStr,
                        timestamp = System.currentTimeMillis(),
                        type = "wash"
                    )
                )
                notify("${item.name} is clean & ready! 🧼")
            } else if (newStatus == "cleaning") {
                notify("Sent ${item.name} to laundry 🧺")
            } else if (newStatus == "dirty") {
                notify("Marked ${item.name} as dirty")
            }
        }
    }

    // --- Outfits ---
    fun createOutfit(name: String, note: String?, itemIds: List<String>, onComplete: (() -> Unit)? = null) {
        viewModelScope.launch {
            val newOutfit = OutfitEntity(
                id = "outfit_${UUID.randomUUID()}",
                name = name,
                note = note,
                itemIds = JSONArray(itemIds).toString(),
                wearCount = 0,
                createdAt = System.currentTimeMillis()
            )
            dao.insertOutfit(newOutfit)
            notify("Created outfit '$name' 👔")
            onComplete?.invoke()
        }
    }

    fun deleteOutfit(outfit: OutfitEntity, onComplete: (() -> Unit)? = null) {
        viewModelScope.launch {
            dao.deleteOutfit(outfit)
            notify("Deleted outfit '${outfit.name}'")
            onComplete?.invoke()
        }
    }

    fun wearOutfit(outfit: OutfitEntity, date: String = todayStr, onComplete: (() -> Unit)? = null) {
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            dao.recordOutfitWear(outfit.id, now)
            dao.insertWearLog(
                WearLogEntity(
                    id = "outfit_wear_${UUID.randomUUID()}",
                    outfitId = outfit.id,
                    wornDate = date,
                    timestamp = now,
                    type = "wear"
                )
            )
            // Increment wear count and insert wear log for all composed items
            try {
                val arr = JSONArray(outfit.itemIds)
                for (i in 0 until arr.length()) {
                    val itemId = arr.getString(i)
                    dao.recordItemWear(itemId, now)
                    dao.insertWearLog(
                        WearLogEntity(
                            id = "item_wear_${UUID.randomUUID()}",
                            itemId = itemId,
                            outfitId = outfit.id,
                            wornDate = date,
                            timestamp = now,
                            type = "wear"
                        )
                    )
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            notify("Styled & wore '${outfit.name}'! 🌟")
            onComplete?.invoke()
        }
    }

    // --- Planned Outfits ---
    fun planOutfitForDate(date: String, outfitId: String?, itemIds: List<String>, note: String?, onComplete: (() -> Unit)? = null) {
        viewModelScope.launch {
            val plan = PlannedOutfitEntity(
                id = "plan_${UUID.randomUUID()}",
                date = date,
                outfitId = outfitId,
                itemIds = JSONArray(itemIds).toString(),
                note = note,
                createdAt = System.currentTimeMillis()
            )
            dao.insertPlan(plan)
            onComplete?.invoke()
        }
    }

    fun deletePlan(plan: PlannedOutfitEntity, onComplete: (() -> Unit)? = null) {
        viewModelScope.launch {
            dao.deletePlan(plan)
            onComplete?.invoke()
        }
    }

    fun wearPlannedOutfit(plan: PlannedOutfitEntity, onComplete: (() -> Unit)? = null) {
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            val oId = plan.outfitId
            if (!oId.isNullOrBlank()) {
                dao.recordOutfitWear(oId, now)
                dao.insertWearLog(
                    WearLogEntity(
                        id = "outfit_wear_${UUID.randomUUID()}",
                        outfitId = oId,
                        wornDate = plan.date,
                        timestamp = now,
                        type = "wear"
                    )
                )
            }
            try {
                val arr = JSONArray(plan.itemIds)
                for (i in 0 until arr.length()) {
                    val itemId = arr.getString(i)
                    dao.recordItemWear(itemId, now)
                    dao.insertWearLog(
                        WearLogEntity(
                            id = "item_wear_${UUID.randomUUID()}",
                            itemId = itemId,
                            outfitId = oId,
                            wornDate = plan.date,
                            timestamp = now,
                            type = "wear"
                        )
                    )
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            dao.deletePlan(plan)
            onComplete?.invoke()
        }
    }

    // --- Laundry ---
    fun markItemWashed(item: ClothingItemEntity) {
        setItemStatus(item, "ready")
    }

    fun markAllDirtyWashed() {
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            dao.markAllDirtyWashed(now)
            notify("All dirty items washed & ready! 🧼")
        }
    }

    fun markAllCleaningWashed() {
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            dao.markAllCleaningWashed(now)
            notify("All cleaning items ready! 🧼")
        }
    }

    // --- Trips ---
    fun saveTrip(trip: TripEntity, onComplete: (() -> Unit)? = null) {
        viewModelScope.launch {
            dao.insertTrip(trip)
            onComplete?.invoke()
        }
    }

    fun deleteTrip(trip: TripEntity, onComplete: (() -> Unit)? = null) {
        viewModelScope.launch {
            dao.deleteTrip(trip)
            onComplete?.invoke()
        }
    }

    fun toggleTripItemPacked(trip: TripEntity, itemId: String) {
        viewModelScope.launch {
            val packedList = try {
                val arr = JSONArray(trip.packedItemIds)
                val list = mutableListOf<String>()
                for (i in 0 until arr.length()) list.add(arr.getString(i))
                list
            } catch (_: Exception) {
                mutableListOf<String>()
            }
            if (packedList.contains(itemId)) {
                packedList.remove(itemId)
            } else {
                packedList.add(itemId)
            }
            val updated = trip.copy(packedItemIds = JSONArray(packedList).toString())
            dao.updateTrip(updated)
        }
    }

    // --- Tags & Locations ---
    fun addTag(label: String) {
        viewModelScope.launch {
            dao.insertTag(TagEntity(id = "tag_${UUID.randomUUID()}", label = label))
        }
    }

    fun addLocation(name: String, icon: String = "📍") {
        viewModelScope.launch {
            dao.insertLocation(LocationEntity(id = "loc_${UUID.randomUUID()}", name = name, icon = icon))
        }
    }

    // --- Backup & Cloud ---
    fun backupToR2() {
        viewModelScope.launch {
            _isSyncing.value = true
            _syncStatus.value = "Backing up to Cloudflare R2..."
            try {
                val dbFile = getApplication<Application>().getDatabasePath("fitly_db")
                if (!dbFile.exists()) {
                    _syncStatus.value = "Database file does not exist yet"
                    return@launch
                }
                val res = CloudStorageSyncer.uploadDatabaseBackup(getApplication(), dbFile)
                val msg = res.fold(
                    onSuccess = { "✅ $it" },
                    onFailure = { "❌ Backup error: ${it.localizedMessage}" }
                )
                _syncStatus.value = msg
                notify(msg)
            } finally {
                _isSyncing.value = false
            }
        }
    }

    fun restoreFromR2() {
        viewModelScope.launch {
            _isSyncing.value = true
            _syncStatus.value = "Restoring from Cloudflare R2..."
            try {
                val context = getApplication<Application>()
                val destFile = File(context.cacheDir, "fitly_restore.sqlite")
                val res = CloudStorageSyncer.downloadDatabaseBackup(context, destFile)
                if (res.isFailure) {
                    val err = "❌ Restore error: ${res.exceptionOrNull()?.localizedMessage}"
                    _syncStatus.value = err
                    notify(err)
                    return@launch
                }
                try {
                    FitlyDatabase.closeAndReset()
                    val dbFile = context.getDatabasePath("fitly_db")
                    val walFile = File(dbFile.path + "-wal")
                    val shmFile = File(dbFile.path + "-shm")
                    if (walFile.exists()) walFile.delete()
                    if (shmFile.exists()) shmFile.delete()
                    destFile.copyTo(dbFile, overwrite = true)
                    destFile.delete()
                    val successMsg = "✅ Database restored from R2! Restart app to refresh."
                    _syncStatus.value = successMsg
                    notify(successMsg)
                } catch (e: Exception) {
                    val swapErr = "❌ Database swap error: ${e.localizedMessage}"
                    _syncStatus.value = swapErr
                    notify(swapErr)
                }
            } finally {
                _isSyncing.value = false
            }
        }
    }

    fun reloadSeedBackup() {
        viewModelScope.launch {
            _isSyncing.value = true
            _syncStatus.value = "Reloading 48 seed items from backup JSON..."
            try {
                val jsonStr = getApplication<Application>().assets.open("seed_wardrobe.json").bufferedReader().use { it.readText() }
                val res = JsonBackupImporter.importJsonString(jsonStr, dao)
                val msg = res.fold(
                    onSuccess = { "✅ Reloaded $it items from seed backup!" },
                    onFailure = { "❌ Seed error: ${it.localizedMessage}" }
                )
                _syncStatus.value = msg
                notify(msg)
            } catch (e: Exception) {
                val err = "❌ Error: ${e.localizedMessage}"
                _syncStatus.value = err
                notify(err)
            } finally {
                _isSyncing.value = false
            }
        }
    }

    fun exportToZip(outputStream: OutputStream) {
        viewModelScope.launch {
            _isSyncing.value = true
            _syncStatus.value = "Exporting wardrobe ZIP archive..."
            try {
                val res = ZipBackupManager.exportToZip(getApplication(), dao, outputStream)
                val msg = res.fold(
                    onSuccess = { "✅ Exported $it items & photos to ZIP archive!" },
                    onFailure = { "❌ ZIP Export error: ${it.localizedMessage}" }
                )
                _syncStatus.value = msg
                notify(msg)
            } finally {
                _isSyncing.value = false
            }
        }
    }

    fun importFromZip(inputStream: InputStream) {
        viewModelScope.launch {
            _isSyncing.value = true
            _syncStatus.value = "Importing wardrobe ZIP archive..."
            try {
                val res = ZipBackupManager.importFromZip(getApplication(), dao, inputStream)
                val msg = res.fold(
                    onSuccess = { "✅ Restored $it items from ZIP archive!" },
                    onFailure = { "❌ ZIP Import error: ${it.localizedMessage}" }
                )
                _syncStatus.value = msg
                notify(msg)
            } finally {
                _isSyncing.value = false
            }
        }
    }

    fun clearSyncStatus() {
        _syncStatus.value = null
    }
}
