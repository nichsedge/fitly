package com.fitly.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.fitly.app.data.local.entity.ClothingItemEntity
import com.fitly.app.data.local.entity.OutfitEntity
import com.fitly.app.data.local.entity.WearLogEntity
import com.fitly.app.data.util.ImageStorageHelper
import com.fitly.app.presentation.WardrobeViewModel
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun CalendarScreen(
    viewModel: WardrobeViewModel,
    onItemClick: (ClothingItemEntity) -> Unit
) {
    val context = LocalContext.current
    val allItems by viewModel.allItems.collectAsState()
    val allOutfits by viewModel.outfits.collectAsState()
    val selectedDate by viewModel.selectedDate.collectAsState()
    val currentMonth by viewModel.currentMonth.collectAsState()
    val logsForMonth by viewModel.logsForCurrentMonth.collectAsState()
    val logsForDate by viewModel.logsForSelectedDate.collectAsState()
    val plannedOutfitsForMonth by viewModel.plannedOutfitsForMonth.collectAsState()
    val planForSelectedDate by viewModel.planForSelectedDate.collectAsState()

    var showLogWearPicker by remember { mutableStateOf(false) }
    var showPlanOutfitDialog by remember { mutableStateOf(false) }

    // Month calendar calculation
    val cal = remember(currentMonth) {
        val c = Calendar.getInstance()
        val parts = currentMonth.split("-")
        if (parts.size == 2) {
            c.set(Calendar.YEAR, parts[0].toInt())
            c.set(Calendar.MONTH, parts[1].toInt() - 1)
        }
        c.set(Calendar.DAY_OF_MONTH, 1)
        c
    }

    val monthName = remember(cal) {
        SimpleDateFormat("MMMM yyyy", Locale.US).format(cal.time)
    }

    val daysInMonth = remember(cal) {
        cal.getActualMaximum(Calendar.DAY_OF_MONTH)
    }

    val firstDayOfWeek = remember(cal) {
        // Sunday = 1, Monday = 2
        cal.get(Calendar.DAY_OF_WEEK) - 1
    }

    // Set of day numbers in this month with activity
    val activeDays = remember(logsForMonth) {
        logsForMonth.mapNotNull { log ->
            val p = log.wornDate.split("-")
            if (p.size == 3) p[2].toIntOrNull() else null
        }.toSet()
    }

    // Set of day numbers in this month with planned outfits
    val plannedDays = remember(plannedOutfitsForMonth) {
        plannedOutfitsForMonth.mapNotNull { plan ->
            val p = plan.date.split("-")
            if (p.size == 3) p[2].toIntOrNull() else null
        }.toSet()
    }

    val selectedDayNum = remember(selectedDate, currentMonth) {
        if (selectedDate.startsWith(currentMonth)) {
            selectedDate.split("-").getOrNull(2)?.toIntOrNull()
        } else null
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        val todayStr = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()) }

        // Month Navigation Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = {
                cal.add(Calendar.MONTH, -1)
                val newMonth = SimpleDateFormat("yyyy-MM", Locale.US).format(cal.time)
                viewModel.setCurrentMonth(newMonth)
            }) {
                Icon(Icons.Default.ChevronLeft, contentDescription = "Previous Month")
            }

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = monthName,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                TextButton(
                    onClick = {
                        val currentM = SimpleDateFormat("yyyy-MM", Locale.US).format(Date())
                        viewModel.setCurrentMonth(currentM)
                        viewModel.setSelectedDate(todayStr)
                    },
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text("Today", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                }
            }

            IconButton(onClick = {
                cal.add(Calendar.MONTH, 1)
                val newMonth = SimpleDateFormat("yyyy-MM", Locale.US).format(cal.time)
                viewModel.setCurrentMonth(newMonth)
            }) {
                Icon(Icons.Default.ChevronRight, contentDescription = "Next Month")
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Weekday labels
        Row(modifier = Modifier.fillMaxWidth()) {
            listOf("S", "M", "T", "W", "T", "F", "S").forEach { day ->
                Text(
                    text = day,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Calendar Grid
        val totalCells = firstDayOfWeek + daysInMonth
        val gridRows = (totalCells + 6) / 7

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            for (row in 0 until gridRows) {
                Row(modifier = Modifier.fillMaxWidth()) {
                    for (col in 0 until 7) {
                        val cellIndex = row * 7 + col
                        val dayNum = cellIndex - firstDayOfWeek + 1
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(40.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            if (dayNum in 1..daysInMonth) {
                                val isSelected = dayNum == selectedDayNum
                                val hasActivity = activeDays.contains(dayNum)
                                val hasPlan = plannedDays.contains(dayNum)
                                val dateStr = String.format(Locale.US, "%s-%02d", currentMonth, dayNum)
                                val isToday = dateStr == todayStr

                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(
                                            if (isSelected) MaterialTheme.colorScheme.primary
                                            else if (hasActivity) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f)
                                            else Color.Transparent
                                        )
                                        .border(
                                            width = if (isToday && !isSelected) 1.5.dp else if (hasPlan && !isSelected) 1.dp else 0.dp,
                                            color = if (isToday && !isSelected) MaterialTheme.colorScheme.primary else if (hasPlan && !isSelected) MaterialTheme.colorScheme.tertiary else Color.Transparent,
                                            shape = CircleShape
                                        )
                                        .clickable {
                                            viewModel.setSelectedDate(dateStr)
                                        },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.Center
                                    ) {
                                        Text(
                                            text = dayNum.toString(),
                                            style = MaterialTheme.typography.bodySmall,
                                            fontWeight = if (isSelected || isToday || hasActivity || hasPlan) FontWeight.Bold else FontWeight.Normal,
                                            color = if (isSelected) MaterialTheme.colorScheme.onPrimary
                                            else if (hasActivity) MaterialTheme.colorScheme.onPrimaryContainer
                                            else MaterialTheme.colorScheme.onSurface
                                        )
                                        if (hasActivity && !isSelected) {
                                            Box(
                                                modifier = Modifier
                                                    .size(4.dp)
                                                    .clip(CircleShape)
                                                    .background(MaterialTheme.colorScheme.primary)
                                            )
                                        } else if (hasPlan && !isSelected) {
                                            Box(
                                                modifier = Modifier
                                                    .size(4.dp)
                                                    .clip(CircleShape)
                                                    .background(MaterialTheme.colorScheme.tertiary)
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

        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(modifier = Modifier.height(12.dp))

        // Selected Date Activity Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Activity on $selectedDate",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                OutlinedButton(
                    onClick = { showPlanOutfitDialog = true },
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Icon(Icons.Default.EventAvailable, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Plan Look")
                }

                Button(
                    onClick = { showLogWearPicker = true },
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Log Wear")
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Planned Outfit Banner if scheduled for this date
        planForSelectedDate?.let { plan ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 10.dp),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.Default.EventAvailable, contentDescription = null, tint = MaterialTheme.colorScheme.onTertiaryContainer)
                            Text(
                                text = "PLANNED OUTFIT (OOTD)",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onTertiaryContainer
                            )
                        }
                        IconButton(
                            onClick = { viewModel.deletePlan(plan) },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Cancel Plan", tint = MaterialTheme.colorScheme.onTertiaryContainer, modifier = Modifier.size(16.dp))
                        }
                    }

                    val planName = remember(plan, allOutfits) {
                        plan.outfitId?.let { oId -> allOutfits.find { it.id == oId }?.name } ?: "Custom Styled Look"
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = planName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onTertiaryContainer
                    )
                    if (!plan.note.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "Note: ${plan.note}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onTertiaryContainer.copy(alpha = 0.85f)
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = { viewModel.wearPlannedOutfit(plan) },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Wear Planned Outfit Today")
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        if (logsForDate.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 32.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No outfits or items logged for this date.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(bottom = 80.dp)
            ) {
                items(logsForDate, key = { it.id }) { log ->
                    val matchedOutfit = log.outfitId?.let { oId -> allOutfits.find { it.id == oId } }
                    val matchedItem = log.itemId?.let { iId -> allItems.find { it.id == iId } }
                    val logTime = remember(log.timestamp) {
                        SimpleDateFormat("hh:mm a", Locale.US).format(Date(log.timestamp))
                    }

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(enabled = matchedItem != null) {
                                matchedItem?.let { onItemClick(it) }
                            },
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (matchedItem != null) {
                                val imgFile = remember(matchedItem.images) {
                                    try {
                                        val arr = JSONArray(matchedItem.images)
                                        if (arr.length() > 0) ImageStorageHelper.getImageFile(context, arr.getString(0)) else null
                                    } catch (_: Exception) {
                                        null
                                    }
                                }
                                Box(
                                    modifier = Modifier
                                        .size(52.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(MaterialTheme.colorScheme.surface),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (imgFile != null) {
                                        AsyncImage(
                                            model = imgFile,
                                            contentDescription = matchedItem.name,
                                            modifier = Modifier.fillMaxSize(),
                                            contentScale = ContentScale.Crop
                                        )
                                    } else {
                                        Icon(
                                            Icons.Default.Checkroom,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(24.dp)
                                        )
                                    }
                                }
                            } else {
                                Surface(
                                    modifier = Modifier.size(52.dp),
                                    shape = RoundedCornerShape(10.dp),
                                    color = if (log.type == "wash") MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.primaryContainer
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = if (log.type == "wash") Icons.Default.LocalLaundryService else Icons.Default.Style,
                                            contentDescription = null,
                                            tint = if (log.type == "wash") MaterialTheme.colorScheme.onSecondaryContainer else MaterialTheme.colorScheme.onPrimaryContainer,
                                            modifier = Modifier.size(24.dp)
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = if (matchedOutfit != null) "Outfit: ${matchedOutfit.name}"
                                    else if (matchedItem != null) matchedItem.name
                                    else if (log.type == "wash") "Laundry Wash"
                                    else "Wear Log",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1
                                )
                                Text(
                                    text = if (log.type == "wash") "Washed & ready for rotation"
                                    else if (matchedItem != null) "${matchedItem.category.uppercase()} • ${matchedItem.brand ?: "Wardrobe"}"
                                    else "Logged look",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = MaterialTheme.colorScheme.surface
                            ) {
                                Text(
                                    text = logTime,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Log Wear Picker Dialog
    if (showLogWearPicker) {
        var pickerTab by remember { mutableIntStateOf(0) } // 0: Outfits, 1: Items

        AlertDialog(
            onDismissRequest = { showLogWearPicker = false },
            title = { Text("Log Wear for $selectedDate") },
            text = {
                Column(modifier = Modifier.height(350.dp)) {
                    PrimaryTabRow(selectedTabIndex = pickerTab) {
                        Tab(selected = pickerTab == 0, onClick = { pickerTab = 0 }, text = { Text("Outfits") })
                        Tab(selected = pickerTab == 1, onClick = { pickerTab = 1 }, text = { Text("Items") })
                    }
                    Spacer(modifier = Modifier.height(8.dp))

                    if (pickerTab == 0) {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(allOutfits) { outfit ->
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            viewModel.wearOutfit(outfit, selectedDate) {
                                                showLogWearPicker = false
                                            }
                                        },
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                                ) {
                                    Text(
                                        text = outfit.name,
                                        modifier = Modifier.padding(12.dp),
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(allItems) { item ->
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            viewModel.logItemWear(item, selectedDate)
                                            showLogWearPicker = false
                                        },
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                                ) {
                                    Text(
                                        text = item.name,
                                        modifier = Modifier.padding(12.dp),
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showLogWearPicker = false }) {
                    Text("Close")
                }
            }
        )
    }

    // Plan Outfit Dialog
    if (showPlanOutfitDialog) {
        PlanOutfitDialog(
            selectedDate = selectedDate,
            allOutfits = allOutfits,
            allItems = allItems,
            onSave = { outfitId, itemIds, note ->
                viewModel.planOutfitForDate(selectedDate, outfitId, itemIds, note) {
                    showPlanOutfitDialog = false
                }
            },
            onDismiss = { showPlanOutfitDialog = false }
        )
    }
}

@Composable
fun PlanOutfitDialog(
    selectedDate: String,
    allOutfits: List<OutfitEntity>,
    allItems: List<ClothingItemEntity>,
    onSave: (outfitId: String?, itemIds: List<String>, note: String?) -> Unit,
    onDismiss: () -> Unit
) {
    var planTab by remember { mutableIntStateOf(0) } // 0: Existing Outfits, 1: Pick Items
    var selectedOutfitId by remember { mutableStateOf<String?>(null) }
    val selectedItemIds = remember { mutableStateListOf<String>() }
    var note by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Plan Look for $selectedDate") },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(380.dp)
            ) {
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("Occasion / Styling Note (Optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(10.dp))

                PrimaryTabRow(selectedTabIndex = planTab) {
                    Tab(selected = planTab == 0, onClick = { planTab = 0 }, text = { Text("From Outfits") })
                    Tab(selected = planTab == 1, onClick = { planTab = 1 }, text = { Text("From Pieces (${selectedItemIds.size})") })
                }
                Spacer(modifier = Modifier.height(8.dp))

                if (planTab == 0) {
                    if (allOutfits.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("No outfits created yet. Create one in Outfits tab.")
                        }
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(allOutfits) { outfit ->
                                val isSelected = selectedOutfitId == outfit.id
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            selectedOutfitId = outfit.id
                                            selectedItemIds.clear()
                                            try {
                                                val arr = JSONArray(outfit.itemIds)
                                                for (i in 0 until arr.length()) selectedItemIds.add(arr.getString(i))
                                            } catch (_: Exception) {}
                                        },
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                                    )
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        RadioButton(selected = isSelected, onClick = {
                                            selectedOutfitId = outfit.id
                                            selectedItemIds.clear()
                                            try {
                                                val arr = JSONArray(outfit.itemIds)
                                                for (i in 0 until arr.length()) selectedItemIds.add(arr.getString(i))
                                            } catch (_: Exception) {}
                                        })
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            Text(outfit.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                            if (!outfit.note.isNullOrBlank()) {
                                                Text(outfit.note, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(allItems) { item ->
                            val isSelected = selectedItemIds.contains(item.id)
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        selectedOutfitId = null
                                        if (isSelected) selectedItemIds.remove(item.id) else selectedItemIds.add(item.id)
                                    },
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                                )
                            ) {
                                Row(
                                    modifier = Modifier.padding(10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Checkbox(
                                        checked = isSelected,
                                        onCheckedChange = {
                                            selectedOutfitId = null
                                            if (isSelected) selectedItemIds.remove(item.id) else selectedItemIds.add(item.id)
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
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSave(selectedOutfitId, selectedItemIds.toList(), note.trim().ifBlank { null })
                },
                enabled = selectedOutfitId != null || selectedItemIds.isNotEmpty()
            ) {
                Text("Schedule Look")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
