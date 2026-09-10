package com.fitly.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.fitly.app.data.local.entity.ClothingItemEntity
import com.fitly.app.data.util.ImageStorageHelper
import com.fitly.app.presentation.WardrobeViewModel
import org.json.JSONArray
import java.text.NumberFormat
import java.util.*

@Composable
fun AnalyticsScreen(
    viewModel: WardrobeViewModel,
    onItemClick: (ClothingItemEntity) -> Unit
) {
    val context = LocalContext.current
    val items by viewModel.allItems.collectAsState()

    // Calculated metrics
    val totalItems = items.size
    val totalValue = remember(items) {
        items.mapNotNull { it.price }.sum()
    }
    val avgCpw = remember(items) {
        val priced = items.filter { it.price != null && it.price!! > 0 }
        if (priced.isNotEmpty()) {
            priced.sumOf { it.price!! / it.wearCount.coerceAtLeast(1) } / priced.size
        } else 0.0
    }

    // Spark Joy groups
    val joyItems = remember(items) { items.filter { it.sparkJoy == "joy" } }
    val essentialItems = remember(items) { items.filter { it.sparkJoy == "essential" || it.sparkJoy == null } }
    val releaseItems = remember(items) { items.filter { it.sparkJoy == "no-joy" } }

    // Best value (lowest CPW)
    val bestValueItems = remember(items) {
        items.filter { it.price != null && it.price!! > 0 && it.wearCount > 0 }
            .sortedBy { it.price!! / it.wearCount }
            .take(5)
    }

    // Dust collectors (0 wears or last worn > 60 days)
    val sixtyDaysAgo = remember { System.currentTimeMillis() - 60L * 24 * 60 * 60 * 1000 }
    val dustCollectors = remember(items) {
        items.filter { it.wearCount == 0 || (it.lastWornAt != null && it.lastWornAt!! < sixtyDaysAgo) }
    }

    val currencyFormat = remember { NumberFormat.getCurrencyInstance(Locale("id", "ID")) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(bottom = 80.dp)
    ) {
        item {
            Text(
                text = "Wardrobe Analytics & Capsule",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        }

        // Top Summary Cards
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("TOTAL ITEMS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("$totalItems", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    }
                }

                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("TOTAL VALUE", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(currencyFormat.format(totalValue), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1)
                    }
                }

                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("AVG CPW", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
                        Text(currencyFormat.format(avgCpw), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1)
                    }
                }
            }
        }

        // KonMari Spark Joy Section
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "KonMari Minimalism Audit",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("💖 Sparks Joy", style = MaterialTheme.typography.labelMedium)
                            Text("${joyItems.size}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color(0xFFEC4899))
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("🧺 Essentials", style = MaterialTheme.typography.labelMedium)
                            Text("${essentialItems.size}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("🍂 Release", style = MaterialTheme.typography.labelMedium)
                            Text("${releaseItems.size}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color(0xFFCA8A04))
                        }
                    }
                }
            }
        }

        // Best Value Leaderboard
        item {
            Text(
                text = "🏆 Best Value (Lowest Cost Per Wear)",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        if (bestValueItems.isEmpty()) {
            item {
                Text("Log wears to calculate cost-per-wear rankings.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            items(bestValueItems, key = { it.id }) { item ->
                val cpw = (item.price ?: 0.0) / item.wearCount.coerceAtLeast(1)
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onItemClick(item) },
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                            Text("Worn ${item.wearCount}x • ${item.category.uppercase()}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text(
                            text = "${currencyFormat.format(cpw)} / wear",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }

        // Dust Collectors (Unworn > 60 days)
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "🕸️ Dust Collectors (${dustCollectors.size} unworn in 60+ days)",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        if (dustCollectors.isEmpty()) {
            item {
                Text("No dust collectors! Every item is regularly worn.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            items(dustCollectors.take(8), key = { it.id }) { item ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onItemClick(item) },
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                            Text("${item.category.uppercase()} • Worn ${item.wearCount}x", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        AssistChip(
                            onClick = { onItemClick(item) },
                            label = { Text("Inspect") }
                        )
                    }
                }
            }
        }
    }
}
