package com.fitly.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.fitly.app.data.local.entity.ClothingItemEntity
import com.fitly.app.data.util.ImageStorageHelper
import com.fitly.app.presentation.WardrobeSort
import com.fitly.app.presentation.WardrobeViewMode
import com.fitly.app.presentation.WardrobeViewModel
import org.json.JSONArray

val WARDROBE_CATEGORIES = listOf("top", "bottom", "outerwear", "shoes", "accessory", "bag", "underwear")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WardrobeScreen(
    viewModel: WardrobeViewModel,
    onItemClick: (ClothingItemEntity) -> Unit
) {
    val haptic = LocalHapticFeedback.current
    val items by viewModel.filteredItems.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val sortOption by viewModel.sortOption.collectAsState()
    val statusFilter by viewModel.statusFilter.collectAsState()
    val sparkJoyFilter by viewModel.sparkJoyFilter.collectAsState()
    val viewMode by viewModel.viewMode.collectAsState()

    var showAddItemDialog by remember { mutableStateOf(false) }
    var showFilterSheet by remember { mutableStateOf(false) }
    var showSortMenu by remember { mutableStateOf(false) }
    var selectedItemForDetail by remember { mutableStateOf<ClothingItemEntity?>(null) }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp)
        ) {
            // Search & Action Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { viewModel.setSearchQuery(it) },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Search brand, color, name...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search") },
                    trailingIcon = {
                        if (searchQuery.isNotBlank()) {
                            IconButton(onClick = { viewModel.setSearchQuery("") }) {
                                Icon(Icons.Default.Clear, contentDescription = "Clear search")
                            }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )

                // Filter Sheet Toggle Button
                val hasActiveFilters = statusFilter != null || sparkJoyFilter != null
                BadgedBox(
                    badge = {
                        if (hasActiveFilters) {
                            Badge { Text("!") }
                        }
                    }
                ) {
                    FilledTonalIconButton(onClick = { showFilterSheet = true }) {
                        Icon(Icons.Default.FilterList, contentDescription = "Filters")
                    }
                }

                // Sort Menu
                Box {
                    IconButton(onClick = { showSortMenu = true }) {
                        Icon(Icons.Default.Sort, contentDescription = "Sort")
                    }
                    DropdownMenu(
                        expanded = showSortMenu,
                        onDismissRequest = { showSortMenu = false }
                    ) {
                        WardrobeSort.entries.forEach { sort ->
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        text = sort.label,
                                        fontWeight = if (sort == sortOption) FontWeight.Bold else FontWeight.Normal
                                    )
                                },
                                onClick = {
                                    viewModel.setSortOption(sort)
                                    showSortMenu = false
                                },
                                leadingIcon = if (sort == sortOption) {
                                    { Icon(Icons.Default.Check, contentDescription = null) }
                                } else null
                            )
                        }
                    }
                }
            }

            // Category Pills
            LazyRow(
                modifier = Modifier.padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    FilterChip(
                        selected = selectedCategory == null,
                        onClick = { viewModel.selectCategory(null) },
                        label = { Text("All") }
                    )
                }
                items(WARDROBE_CATEGORIES) { cat ->
                    FilterChip(
                        selected = selectedCategory.equals(cat, ignoreCase = true),
                        onClick = {
                            if (selectedCategory.equals(cat, ignoreCase = true)) {
                                viewModel.selectCategory(null)
                            } else {
                                viewModel.selectCategory(cat)
                            }
                        },
                        label = { Text(cat.replaceFirstChar { it.uppercase() }) }
                    )
                }
            }

            // Stats & View Density Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "${items.size} Items",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = sortOption.label,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                // Density Toggle
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(
                        onClick = { viewModel.setViewMode(WardrobeViewMode.GRID_2) },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Default.GridView,
                            contentDescription = "2 Columns",
                            tint = if (viewMode == WardrobeViewMode.GRID_2) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                        )
                    }
                    IconButton(
                        onClick = { viewModel.setViewMode(WardrobeViewMode.GRID_3) },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Default.ViewModule,
                            contentDescription = "3 Columns",
                            tint = if (viewMode == WardrobeViewMode.GRID_3) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                        )
                    }
                    IconButton(
                        onClick = { viewModel.setViewMode(WardrobeViewMode.LIST) },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Default.ViewList,
                            contentDescription = "List View",
                            tint = if (viewMode == WardrobeViewMode.LIST) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                        )
                    }
                }
            }

            // Content Display
            if (items.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.Checkroom,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                        )
                        Text(
                            text = "No clothing items found",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                when (viewMode) {
                    WardrobeViewMode.GRID_2 -> {
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(2),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            contentPadding = PaddingValues(bottom = 88.dp)
                        ) {
                            items(items, key = { it.id }) { item ->
                                WardrobeItemCard(
                                    item = item,
                                    onClick = { selectedItemForDetail = item },
                                    onLogWear = {
                                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                        viewModel.logItemWear(item)
                                    }
                                )
                            }
                        }
                    }
                    WardrobeViewMode.GRID_3 -> {
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(3),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            contentPadding = PaddingValues(bottom = 88.dp)
                        ) {
                            items(items, key = { it.id }) { item ->
                                WardrobeItemCardCompact(
                                    item = item,
                                    onClick = { selectedItemForDetail = item }
                                )
                            }
                        }
                    }
                    WardrobeViewMode.LIST -> {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            contentPadding = PaddingValues(bottom = 88.dp)
                        ) {
                            items(items, key = { it.id }) { item ->
                                WardrobeItemRow(
                                    item = item,
                                    onClick = { selectedItemForDetail = item },
                                    onLogWear = {
                                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                        viewModel.logItemWear(item)
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }

        // Floating Action Button to Add Item
        FloatingActionButton(
            onClick = { showAddItemDialog = true },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(bottom = 16.dp, end = 16.dp),
            containerColor = MaterialTheme.colorScheme.primary
        ) {
            Icon(Icons.Default.Add, contentDescription = "Add Item")
        }

        // Add Item Dialog
        if (showAddItemDialog) {
            AddItemDialog(
                viewModel = viewModel,
                onDismiss = { showAddItemDialog = false }
            )
        }

        // Item Detail Dialog
        selectedItemForDetail?.let { currentItem ->
            val latestItem = items.find { it.id == currentItem.id } ?: currentItem
            ItemDetailDialog(
                item = latestItem,
                viewModel = viewModel,
                onDismiss = { selectedItemForDetail = null }
            )
        }

        // Filters BottomSheet
        if (showFilterSheet) {
            ModalBottomSheet(
                onDismissRequest = { showFilterSheet = false }
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Filter Wardrobe",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        TextButton(onClick = {
                            viewModel.setStatusFilter(null)
                            viewModel.setSparkJoyFilter(null)
                        }) {
                            Text("Reset All")
                        }
                    }

                    // Status Filter
                    Text("Laundry & Readiness Status", style = MaterialTheme.typography.titleSmall)
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        item {
                            FilterChip(
                                selected = statusFilter == null,
                                onClick = { viewModel.setStatusFilter(null) },
                                label = { Text("All") }
                            )
                        }
                        listOf("ready" to "Ready (Clean)", "dirty" to "Dirty", "cleaning" to "In Laundry").forEach { (k, lbl) ->
                            item {
                                FilterChip(
                                    selected = statusFilter == k,
                                    onClick = { viewModel.setStatusFilter(if (statusFilter == k) null else k) },
                                    label = { Text(lbl) }
                                )
                            }
                        }
                    }

                    // Spark Joy (KonMari)
                    Text("KonMari Philosophy", style = MaterialTheme.typography.titleSmall)
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        item {
                            FilterChip(
                                selected = sparkJoyFilter == null,
                                onClick = { viewModel.setSparkJoyFilter(null) },
                                label = { Text("All") }
                            )
                        }
                        listOf("joy" to "💖 Sparks Joy", "essential" to "🧺 Daily Essential", "no-joy" to "🍂 To Release").forEach { (k, lbl) ->
                            item {
                                FilterChip(
                                    selected = sparkJoyFilter == k,
                                    onClick = { viewModel.setSparkJoyFilter(if (sparkJoyFilter == k) null else k) },
                                    label = { Text(lbl) }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = { showFilterSheet = false },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Apply Filters (${items.size} Results)")
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
        }
    }
}

@Composable
fun WardrobeItemCard(
    item: ClothingItemEntity,
    onClick: () -> Unit,
    onLogWear: () -> Unit
) {
    val context = LocalContext.current

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            // Category tag & color swatch & status indicator
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = item.category.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
                )
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (item.status == "dirty") {
                        Text("DIRTY", style = MaterialTheme.typography.labelSmall, color = Color(0xFFDC2626), fontWeight = FontWeight.Bold)
                    } else if (item.status == "cleaning") {
                        Text("CLEANING", style = MaterialTheme.typography.labelSmall, color = Color(0xFF2563EB), fontWeight = FontWeight.Bold)
                    }
                    val swatchColor = remember(item.color) {
                        try {
                            if (!item.color.isNullOrBlank()) Color(android.graphics.Color.parseColor(item.color)) else null
                        } catch (_: Exception) {
                            null
                        }
                    }
                    if (swatchColor != null) {
                        Box(
                            modifier = Modifier
                                .size(14.dp)
                                .clip(CircleShape)
                                .background(swatchColor)
                                .border(1.dp, Color.Gray.copy(alpha = 0.5f), CircleShape)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Item Photo if available
            val imageFile = remember(item.images) {
                try {
                    val jsonArray = JSONArray(item.images)
                    if (jsonArray.length() > 0) {
                        val imgId = jsonArray.getString(0)
                        ImageStorageHelper.getImageFile(context, imgId)
                    } else null
                } catch (e: Exception) {
                    null
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(MaterialTheme.colorScheme.surface),
                contentAlignment = Alignment.Center
            ) {
                if (imageFile != null) {
                    AsyncImage(
                        model = imageFile,
                        contentDescription = item.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Item Name
            Text(
                text = item.name,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            // Brand
            if (!item.brand.isNullOrBlank()) {
                Text(
                    text = item.brand,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Wear Count & Log Button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Worn ${item.wearCount}x",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Medium
                )
                IconButton(
                    onClick = onLogWear,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        Icons.Default.Check,
                        contentDescription = "Log Wear",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun WardrobeItemCardCompact(
    item: ClothingItemEntity,
    onClick: () -> Unit
) {
    val context = LocalContext.current
    val imageFile = remember(item.images) {
        try {
            val jsonArray = JSONArray(item.images)
            if (jsonArray.length() > 0) ImageStorageHelper.getImageFile(context, jsonArray.getString(0)) else null
        } catch (_: Exception) {
            null
        }
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(6.dp)) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(96.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surface),
                contentAlignment = Alignment.Center
            ) {
                if (imageFile != null) {
                    AsyncImage(
                        model = imageFile,
                        contentDescription = item.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = item.name,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = "${item.wearCount}x",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
fun WardrobeItemRow(
    item: ClothingItemEntity,
    onClick: () -> Unit,
    onLogWear: () -> Unit
) {
    val context = LocalContext.current
    val imageFile = remember(item.images) {
        try {
            val jsonArray = JSONArray(item.images)
            if (jsonArray.length() > 0) ImageStorageHelper.getImageFile(context, jsonArray.getString(0)) else null
        } catch (_: Exception) {
            null
        }
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier = Modifier.padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(60.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surface),
                contentAlignment = Alignment.Center
            ) {
                if (imageFile != null) {
                    AsyncImage(
                        model = imageFile,
                        contentDescription = item.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.name,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "${item.category.uppercase()} • ${item.brand ?: "Wardrobe"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "Worn ${item.wearCount} times",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            IconButton(onClick = onLogWear) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = "Log Wear",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}
