package com.fitly.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Style
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.fitly.app.data.local.entity.ClothingItemEntity
import com.fitly.app.data.local.entity.OutfitEntity
import com.fitly.app.data.util.ImageStorageHelper
import com.fitly.app.presentation.WardrobeViewModel
import org.json.JSONArray

@Composable
fun OutfitsScreen(
    viewModel: WardrobeViewModel,
    onItemClick: (ClothingItemEntity) -> Unit
) {
    val outfits by viewModel.outfits.collectAsState()
    val allItems by viewModel.allItems.collectAsState()

    var showOutfitBuilder by remember { mutableStateOf(false) }
    var selectedOutfitForDetail by remember { mutableStateOf<OutfitEntity?>(null) }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Outfits (${outfits.size})",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Button(onClick = { showOutfitBuilder = true }) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("New Outfit")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (outfits.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.Style,
                            contentDescription = null,
                            modifier = Modifier.size(56.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                        )
                        Text(
                            text = "No outfits styled yet",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    items(outfits, key = { it.id }) { outfit ->
                        OutfitCard(
                            outfit = outfit,
                            allItems = allItems,
                            onClick = { selectedOutfitForDetail = outfit },
                            onWear = { viewModel.wearOutfit(outfit) }
                        )
                    }
                }
            }
        }

        // Outfit Detail Dialog
        selectedOutfitForDetail?.let { currentOutfit ->
            val latest = outfits.find { it.id == currentOutfit.id } ?: currentOutfit
            OutfitDetailDialog(
                outfit = latest,
                viewModel = viewModel,
                onItemClick = onItemClick,
                onDismiss = { selectedOutfitForDetail = null }
            )
        }

        // Outfit Builder Dialog
        if (showOutfitBuilder) {
            OutfitBuilderDialog(
                viewModel = viewModel,
                onDismiss = { showOutfitBuilder = false }
            )
        }
    }
}

@Composable
fun OutfitCard(
    outfit: OutfitEntity,
    allItems: List<ClothingItemEntity>,
    onClick: () -> Unit,
    onWear: () -> Unit
) {
    val context = LocalContext.current

    val composedItems = remember(outfit.itemIds, allItems) {
        try {
            val arr = JSONArray(outfit.itemIds)
            val ids = mutableSetOf<String>()
            for (i in 0 until arr.length()) ids.add(arr.getString(i))
            allItems.filter { ids.contains(it.id) }
        } catch (_: Exception) {
            emptyList()
        }
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = outfit.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Worn ${outfit.wearCount}x",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                FilledTonalIconButton(onClick = onWear) {
                    Icon(Icons.Default.Check, contentDescription = "Wear Outfit")
                }
            }

            if (!outfit.note.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = outfit.note,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (composedItems.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(composedItems, key = { it.id }) { item ->
                        val imgFile = remember(item.images) {
                            try {
                                val arr = JSONArray(item.images)
                                if (arr.length() > 0) ImageStorageHelper.getImageFile(context, arr.getString(0)) else null
                            } catch (_: Exception) {
                                null
                            }
                        }

                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(MaterialTheme.colorScheme.surface)
                        ) {
                            if (imgFile != null) {
                                AsyncImage(
                                    model = imgFile,
                                    contentDescription = item.name,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
