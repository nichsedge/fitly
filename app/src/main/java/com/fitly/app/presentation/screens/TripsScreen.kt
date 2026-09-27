package com.fitly.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.fitly.app.data.local.entity.ClothingItemEntity
import com.fitly.app.data.local.entity.OutfitEntity
import com.fitly.app.data.local.entity.TripEntity
import com.fitly.app.presentation.WardrobeViewModel
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun TripsScreen(
    viewModel: WardrobeViewModel,
    onItemClick: (ClothingItemEntity) -> Unit
) {
    val trips by viewModel.trips.collectAsState()
    val allItems by viewModel.allItems.collectAsState()
    val outfits by viewModel.outfits.collectAsState()

    var showCreateTripDialog by remember { mutableStateOf(false) }
    var selectedTripForPacking by remember { mutableStateOf<TripEntity?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Trips & Packing (${trips.size})",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Button(onClick = { showCreateTripDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(modifier = Modifier.width(4.dp))
                Text("New Trip")
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (trips.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.Luggage,
                        contentDescription = null,
                        modifier = Modifier.size(56.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    )
                    Text(
                        text = "No upcoming trips planned yet",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(bottom = 80.dp)
            ) {
                items(trips, key = { it.id }) { trip ->
                    TripCard(
                        trip = trip,
                        onClick = { selectedTripForPacking = trip },
                        onDelete = { viewModel.deleteTrip(trip) }
                    )
                }
            }
        }
    }

    // Packing Checklist Dialog
    selectedTripForPacking?.let { currentTrip ->
        val latestTrip = trips.find { it.id == currentTrip.id } ?: currentTrip
        PackingChecklistDialog(
            trip = latestTrip,
            allItems = allItems,
            allOutfits = outfits,
            onTogglePacked = { itemId -> viewModel.toggleTripItemPacked(latestTrip, itemId) },
            onItemClick = onItemClick,
            onDismiss = { selectedTripForPacking = null }
        )
    }

    // Create Trip Dialog
    if (showCreateTripDialog) {
        CreateTripDialog(
            allItems = allItems,
            allOutfits = outfits,
            onSave = { newTrip ->
                viewModel.saveTrip(newTrip) {
                    showCreateTripDialog = false
                }
            },
            onDismiss = { showCreateTripDialog = false }
        )
    }
}

@Composable
fun TripCard(
    trip: TripEntity,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    val totalItems = remember(trip.itemIds) {
        try { JSONArray(trip.itemIds).length() } catch (_: Exception) { 0 }
    }
    val packedCount = remember(trip.packedItemIds) {
        try { JSONArray(trip.packedItemIds).length() } catch (_: Exception) { 0 }
    }
    val progress = if (totalItems > 0) packedCount.toFloat() / totalItems.toFloat() else 0f
    val isAllPacked = totalItems > 0 && packedCount == totalItems

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = trip.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    if (!trip.destination.isNullOrBlank()) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 2.dp)) {
                            Icon(Icons.Default.Place, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.primary)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(trip.destination, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Medium)
                        }
                    }
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "📅 ${trip.startDate} → ${trip.endDate}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (isAllPacked) Color(0xFF10B981).copy(alpha = 0.15f) else MaterialTheme.colorScheme.surface
                ) {
                    Text(
                        text = if (isAllPacked) "Ready! (100%)" else "$packedCount/$totalItems (${(progress * 100).toInt()}%)",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = if (isAllPacked) Color(0xFF10B981) else MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp)),
                color = if (isAllPacked) Color(0xFF10B981) else MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surface
            )
        }
    }
}

@Composable
fun PackingChecklistDialog(
    trip: TripEntity,
    allItems: List<ClothingItemEntity>,
    allOutfits: List<OutfitEntity>,
    onTogglePacked: (String) -> Unit,
    onItemClick: (ClothingItemEntity) -> Unit,
    onDismiss: () -> Unit
) {
    val haptic = LocalHapticFeedback.current

    val tripItems = remember(trip.itemIds, trip.outfitIds, allItems, allOutfits) {
        val ids = mutableSetOf<String>()
        try {
            val arr = JSONArray(trip.itemIds)
            for (i in 0 until arr.length()) ids.add(arr.getString(i))
        } catch (_: Exception) {}
        try {
            val outArr = JSONArray(trip.outfitIds)
            val outIdSet = mutableSetOf<String>()
            for (i in 0 until outArr.length()) outIdSet.add(outArr.getString(i))
            allOutfits.filter { outIdSet.contains(it.id) }.forEach { outfit ->
                try {
                    val itArr = JSONArray(outfit.itemIds)
                    for (i in 0 until itArr.length()) ids.add(itArr.getString(i))
                } catch (_: Exception) {}
            }
        } catch (_: Exception) {}
        allItems.filter { ids.contains(it.id) }
    }

    val packedIds = remember(trip.packedItemIds) {
        try {
            val arr = JSONArray(trip.packedItemIds)
            val ids = mutableSetOf<String>()
            for (i in 0 until arr.length()) ids.add(arr.getString(i))
            ids
        } catch (_: Exception) {
            emptySet<String>()
        }
    }

    val groupedTripItems = remember(tripItems) {
        tripItems.groupBy { it.category.ifBlank { "other" }.lowercase() }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 6.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                    Text(
                        text = "${trip.name} Packing List",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.size(48.dp))
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "${packedIds.size} of ${tripItems.size} items packed",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(12.dp))

                if (tripItems.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("No items assigned to this trip.")
                    }
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        groupedTripItems.forEach { (cat, itemsInCategory) ->
                            val packedInCat = itemsInCategory.count { packedIds.contains(it.id) }
                            item(key = "header_$cat") {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 10.dp, bottom = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = cat.uppercase(),
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Text(
                                        text = "$packedInCat/${itemsInCategory.size} packed",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            items(itemsInCategory, key = { it.id }) { item ->
                                val isPacked = packedIds.contains(item.id)
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                            onTogglePacked(item.id)
                                        },
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (isPacked) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                                        else MaterialTheme.colorScheme.surfaceVariant
                                    )
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Checkbox(
                                            checked = isPacked,
                                            onCheckedChange = {
                                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                onTogglePacked(item.id)
                                            }
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = item.name,
                                                style = MaterialTheme.typography.bodyMedium,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                            Text(
                                                text = "${item.category.uppercase()} • ${item.brand ?: ""}",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CreateTripDialog(
    allItems: List<ClothingItemEntity>,
    allOutfits: List<OutfitEntity>,
    onSave: (TripEntity) -> Unit,
    onDismiss: () -> Unit
) {
    val haptic = LocalHapticFeedback.current
    val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    var name by remember { mutableStateOf("") }
    var destination by remember { mutableStateOf("") }
    var startDate by remember { mutableStateOf(today) }
    var endDate by remember { mutableStateOf(today) }
    var packMode by remember { mutableIntStateOf(0) } // 0 = Items, 1 = Outfits
    val selectedItemIds = remember { mutableStateListOf<String>() }
    val selectedOutfitIds = remember { mutableStateListOf<String>() }

    val groupedAllItems = remember(allItems) {
        allItems.groupBy { it.category.ifBlank { "other" }.lowercase() }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 6.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                    Text(
                        text = "New Trip",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(
                        onClick = {
                            if (name.isNotBlank()) {
                                val trip = TripEntity(
                                    id = "trip_${UUID.randomUUID()}",
                                    name = name.trim(),
                                    destination = destination.trim().ifBlank { null },
                                    startDate = startDate,
                                    endDate = endDate,
                                    itemIds = JSONArray(selectedItemIds.distinct()).toString(),
                                    outfitIds = JSONArray(selectedOutfitIds.distinct()).toString(),
                                    packedItemIds = "[]",
                                    completed = false,
                                    createdAt = System.currentTimeMillis()
                                )
                                onSave(trip)
                            }
                        },
                        enabled = name.isNotBlank()
                    ) {
                        Icon(Icons.Default.Done, contentDescription = "Save")
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Trip Name * (e.g. Bali Summer 2026)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = destination,
                    onValueChange = { destination = it },
                    label = { Text("Destination (e.g. Denpasar, Bali)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = startDate,
                        onValueChange = { startDate = it },
                        label = { Text("Start Date") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = endDate,
                        onValueChange = { endDate = it },
                        label = { Text("End Date") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                PrimaryTabRow(
                    selectedTabIndex = packMode,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Tab(
                        selected = packMode == 0,
                        onClick = { packMode = 0 },
                        text = { Text("Items (${selectedItemIds.size})") }
                    )
                    Tab(
                        selected = packMode == 1,
                        onClick = { packMode = 1 },
                        text = { Text("Outfits (${selectedOutfitIds.size})") }
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                if (packMode == 0) {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        groupedAllItems.forEach { (cat, itemsInCat) ->
                            val selectedInCat = itemsInCat.count { selectedItemIds.contains(it.id) }
                            item(key = "header_select_$cat") {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 8.dp, bottom = 2.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = cat.uppercase(),
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Text(
                                        text = "$selectedInCat selected",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                            items(itemsInCat, key = { it.id }) { item ->
                                val isSelected = selectedItemIds.contains(item.id)
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                            if (isSelected) selectedItemIds.remove(item.id)
                                            else selectedItemIds.add(item.id)
                                        },
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer
                                        else MaterialTheme.colorScheme.surfaceVariant
                                    )
                                ) {
                                    Row(
                                        modifier = Modifier.padding(10.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Checkbox(
                                            checked = isSelected,
                                            onCheckedChange = {
                                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                if (isSelected) selectedItemIds.remove(item.id)
                                                else selectedItemIds.add(item.id)
                                            }
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            Text(item.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                            Text(item.category.uppercase(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    if (allOutfits.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                "No saved outfits yet.\nCreate outfits in the Outfits tab to pack them here.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            items(allOutfits, key = { it.id }) { outfit ->
                                val isSelected = selectedOutfitIds.contains(outfit.id)
                                val outfitItemCount = remember(outfit.itemIds) {
                                    try { JSONArray(outfit.itemIds).length() } catch (_: Exception) { 0 }
                                }
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                            if (isSelected) {
                                                selectedOutfitIds.remove(outfit.id)
                                            } else {
                                                selectedOutfitIds.add(outfit.id)
                                                try {
                                                    val arr = JSONArray(outfit.itemIds)
                                                    for (i in 0 until arr.length()) {
                                                        val itId = arr.getString(i)
                                                        if (!selectedItemIds.contains(itId)) {
                                                            selectedItemIds.add(itId)
                                                        }
                                                    }
                                                } catch (_: Exception) {}
                                            }
                                        },
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer
                                        else MaterialTheme.colorScheme.surfaceVariant
                                    )
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Checkbox(
                                            checked = isSelected,
                                            onCheckedChange = {
                                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                if (isSelected) {
                                                    selectedOutfitIds.remove(outfit.id)
                                                } else {
                                                    selectedOutfitIds.add(outfit.id)
                                                    try {
                                                        val arr = JSONArray(outfit.itemIds)
                                                        for (i in 0 until arr.length()) {
                                                            val itId = arr.getString(i)
                                                            if (!selectedItemIds.contains(itId)) {
                                                                selectedItemIds.add(itId)
                                                            }
                                                        }
                                                    } catch (_: Exception) {}
                                                }
                                            }
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            Text(
                                                text = outfit.name,
                                                style = MaterialTheme.typography.bodyMedium,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                            Text(
                                                text = "$outfitItemCount items${if (!outfit.note.isNullOrBlank()) " • ${outfit.note}" else ""}",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
