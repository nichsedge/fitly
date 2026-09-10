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

    var showLogWearPicker by remember { mutableStateOf(false) }

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

            Text(
                text = monthName,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )

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
                                .height(38.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            if (dayNum in 1..daysInMonth) {
                                val isSelected = dayNum == selectedDayNum
                                val hasActivity = activeDays.contains(dayNum)
                                val dateStr = String.format(Locale.US, "%s-%02d", currentMonth, dayNum)

                                Box(
                                    modifier = Modifier
                                        .size(34.dp)
                                        .clip(CircleShape)
                                        .background(
                                            if (isSelected) MaterialTheme.colorScheme.primary
                                            else if (hasActivity) MaterialTheme.colorScheme.primaryContainer
                                            else Color.Transparent
                                        )
                                        .clickable {
                                            viewModel.setSelectedDate(dateStr)
                                        },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = dayNum.toString(),
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = if (isSelected || hasActivity) FontWeight.Bold else FontWeight.Normal,
                                        color = if (isSelected) MaterialTheme.colorScheme.onPrimary
                                        else if (hasActivity) MaterialTheme.colorScheme.onPrimaryContainer
                                        else MaterialTheme.colorScheme.onSurface
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        Divider()
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

            Button(
                onClick = { showLogWearPicker = true },
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Log Wear")
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

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = if (log.type == "wash") Icons.Default.LocalLaundryService
                                else if (matchedOutfit != null) Icons.Default.Style
                                else Icons.Default.Checkroom,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = if (matchedOutfit != null) "Outfit: ${matchedOutfit.name}"
                                    else if (matchedItem != null) matchedItem.name
                                    else if (log.type == "wash") "Laundry Wash"
                                    else "Wear Log",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = if (log.type == "wash") "Washed & Cleaned"
                                    else if (matchedItem != null) "${matchedItem.category.uppercase()} • ${matchedItem.brand ?: ""}"
                                    else "Worn on $selectedDate",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
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
                    TabRow(selectedTabIndex = pickerTab) {
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
}
