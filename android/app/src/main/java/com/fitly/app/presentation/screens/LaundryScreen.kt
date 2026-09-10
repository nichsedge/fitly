package com.fitly.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.LocalLaundryService
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.fitly.app.data.local.entity.ClothingItemEntity
import com.fitly.app.data.util.ImageStorageHelper
import com.fitly.app.presentation.WardrobeViewModel
import org.json.JSONArray

@Composable
fun LaundryScreen(
    viewModel: WardrobeViewModel,
    onItemClick: (ClothingItemEntity) -> Unit
) {
    val dirtyItems by viewModel.dirtyItems.collectAsState()
    val cleaningItems by viewModel.cleaningItems.collectAsState()
    val readyItems by viewModel.readyItems.collectAsState()

    var selectedTab by remember { mutableIntStateOf(0) } // 0: Dirty, 1: In Cleaning, 2: Ready
    val displayedItems = when (selectedTab) {
        0 -> dirtyItems
        1 -> cleaningItems
        else -> readyItems
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Top Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Laundry Tracker",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )

            if (selectedTab == 0 && dirtyItems.isNotEmpty()) {
                Button(
                    onClick = { viewModel.markAllDirtyWashed() },
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Icon(Icons.Default.DoneAll, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Wash All")
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Status Tabs
        TabRow(selectedTabIndex = selectedTab) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = { Text("Dirty (${dirtyItems.size})") }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = { Text("Cleaning (${cleaningItems.size})") }
            )
            Tab(
                selected = selectedTab == 2,
                onClick = { selectedTab = 2 },
                text = { Text("Clean (${readyItems.size})") }
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (displayedItems.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.LocalLaundryService,
                        contentDescription = null,
                        modifier = Modifier.size(56.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    )
                    Text(
                        text = if (selectedTab == 0) "No dirty clothes! All clean." else "No items in this section",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(bottom = 80.dp)
            ) {
                items(displayedItems, key = { it.id }) { item ->
                    LaundryItemCard(
                        item = item,
                        onClick = { onItemClick(item) },
                        onMarkWashed = { viewModel.markItemWashed(item) },
                        onMoveToCleaning = { viewModel.setItemStatus(item, "cleaning") }
                    )
                }
            }
        }
    }
}

@Composable
fun LaundryItemCard(
    item: ClothingItemEntity,
    onClick: () -> Unit,
    onMarkWashed: () -> Unit,
    onMoveToCleaning: () -> Unit
) {
    val context = LocalContext.current
    val imageFile = remember(item.images) {
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
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Thumbnail
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surface)
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
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "${item.category.uppercase()} • ${item.brand ?: "Wardrobe"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (!item.careInstructions.isNullOrBlank()) {
                    Text(
                        text = "🧼 ${item.careInstructions}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            if (item.status == "dirty") {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    FilledTonalIconButton(onClick = onMoveToCleaning) {
                        Icon(Icons.Default.LocalLaundryService, contentDescription = "To Cleaning", modifier = Modifier.size(18.dp))
                    }
                    IconButton(onClick = onMarkWashed) {
                        Icon(Icons.Default.Check, contentDescription = "Mark Clean", tint = MaterialTheme.colorScheme.primary)
                    }
                }
            } else if (item.status == "cleaning") {
                IconButton(onClick = onMarkWashed) {
                    Icon(Icons.Default.Check, contentDescription = "Mark Clean", tint = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}
