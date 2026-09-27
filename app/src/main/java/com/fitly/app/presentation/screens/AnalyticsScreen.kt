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
        val priced = items.filter { (it.price ?: 0.0) > 0 }
        if (priced.isNotEmpty()) {
            priced.sumOf { (it.price ?: 0.0) / it.wearCount.coerceAtLeast(1) } / priced.size
        } else 0.0
    }

    // Spark Joy groups
    val joyItems = remember(items) { items.filter { it.sparkJoy == "joy" } }
    val essentialItems = remember(items) { items.filter { it.sparkJoy == "essential" || it.sparkJoy == null } }
    val releaseItems = remember(items) { items.filter { it.sparkJoy == "no-joy" } }

    // Best value (lowest CPW)
    val bestValueItems = remember(items) {
        items.filter { (it.price ?: 0.0) > 0 && it.wearCount > 0 }
            .sortedBy { (it.price ?: 0.0) / it.wearCount }
            .take(5)
    }

    // Dust collectors (0 wears or last worn > 60 days)
    val sixtyDaysAgo = remember { System.currentTimeMillis() - 60L * 24 * 60 * 60 * 1000 }
    val dustCollectors = remember(items) {
        items.filter { it.wearCount == 0 || (it.lastWornAt ?: 0L) < sixtyDaysAgo }
    }

    val utilizationRate = if (totalItems > 0) ((totalItems - dustCollectors.size) * 100) / totalItems else 0
    val currencyFormat = remember { NumberFormat.getCurrencyInstance(Locale.forLanguageTag("id-ID")) }

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

        // Top Summary Cards (2x2 Grid)
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text("TOTAL PIECES", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text("$totalItems", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        }
                    }

                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text("TOTAL VALUATION", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(formatCurrencyShort(totalValue), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, maxLines = 1)
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f))
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text("AVG CPW", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(formatCurrencyShort(avgCpw), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, maxLines = 1)
                        }
                    }

                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text("ACTIVE ROTATION", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text("$utilizationRate%", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = if (utilizationRate >= 70) Color(0xFF10B981) else MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
        }

        // KonMari Spark Joy Section with Visual Progress Bar
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "KonMari Minimalism Audit",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    // Segmented distribution bar
                    if (totalItems > 0) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(12.dp)
                                .clip(RoundedCornerShape(6.dp))
                        ) {
                            if (joyItems.isNotEmpty()) {
                                Box(
                                    modifier = Modifier
                                        .weight(joyItems.size.toFloat())
                                        .fillMaxHeight()
                                        .background(Color(0xFFEC4899))
                                )
                            }
                            if (essentialItems.isNotEmpty()) {
                                Box(
                                    modifier = Modifier
                                        .weight(essentialItems.size.toFloat())
                                        .fillMaxHeight()
                                        .background(MaterialTheme.colorScheme.primary)
                                )
                            }
                            if (releaseItems.isNotEmpty()) {
                                Box(
                                    modifier = Modifier
                                        .weight(releaseItems.size.toFloat())
                                        .fillMaxHeight()
                                        .background(Color(0xFFCA8A04))
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(14.dp))
                    }

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
            items(bestValueItems.mapIndexed { idx, itm -> Pair(idx + 1, itm) }, key = { it.second.id }) { (rank, item) ->
                val cpw = (item.price ?: 0.0) / item.wearCount.coerceAtLeast(1)
                val imgFile = remember(item.images) {
                    try {
                        val arr = JSONArray(item.images)
                        if (arr.length() > 0) ImageStorageHelper.getImageFile(context, arr.getString(0)) else null
                    } catch (_: Exception) {
                        null
                    }
                }

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onItemClick(item) },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Rank Badge
                        Text(
                            text = when (rank) {
                                1 -> "🥇"
                                2 -> "🥈"
                                3 -> "🥉"
                                else -> "#$rank"
                            },
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.width(32.dp)
                        )

                        // Thumbnail
                        Box(
                            modifier = Modifier
                                .size(50.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(MaterialTheme.colorScheme.surface)
                        ) {
                            if (imgFile != null) {
                                AsyncImage(
                                    model = imgFile,
                                    contentDescription = item.name,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = androidx.compose.ui.layout.ContentScale.Crop
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, maxLines = 1)
                            Text("Worn ${item.wearCount}x • ${item.category.uppercase()}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }

                        Text(
                            text = "${formatCurrencyShort(cpw)}/w",
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
                val imgFile = remember(item.images) {
                    try {
                        val arr = JSONArray(item.images)
                        if (arr.length() > 0) ImageStorageHelper.getImageFile(context, arr.getString(0)) else null
                    } catch (_: Exception) {
                        null
                    }
                }

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onItemClick(item) },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(50.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(MaterialTheme.colorScheme.surface)
                        ) {
                            if (imgFile != null) {
                                AsyncImage(
                                    model = imgFile,
                                    contentDescription = item.name,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = androidx.compose.ui.layout.ContentScale.Crop
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, maxLines = 1)
                            Text("${item.category.uppercase()} • Worn ${item.wearCount}x", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }

                        FilledTonalButton(
                            onClick = { onItemClick(item) },
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Inspect", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        }
    }
}
