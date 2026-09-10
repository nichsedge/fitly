package com.fitly.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Done
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil3.compose.AsyncImage
import com.fitly.app.data.local.entity.ClothingItemEntity
import com.fitly.app.data.util.ImageStorageHelper
import com.fitly.app.presentation.WardrobeViewModel
import org.json.JSONArray

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OutfitBuilderDialog(
    viewModel: WardrobeViewModel,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val allItems by viewModel.allItems.collectAsState()

    var outfitName by remember { mutableStateOf("") }
    var outfitNote by remember { mutableStateOf("") }
    val selectedItemIds = remember { mutableStateListOf<String>() }

    val selectedItems = remember(selectedItemIds.toList(), allItems) {
        val set = selectedItemIds.toSet()
        allItems.filter { set.contains(it.id) }
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
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                    Text(
                        text = "Build Outfit",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(
                        onClick = {
                            if (outfitName.isNotBlank() && selectedItemIds.isNotEmpty()) {
                                viewModel.createOutfit(
                                    name = outfitName.trim(),
                                    note = outfitNote.trim().ifBlank { null },
                                    itemIds = selectedItemIds.toList()
                                ) {
                                    onDismiss()
                                }
                            }
                        },
                        enabled = outfitName.isNotBlank() && selectedItemIds.isNotEmpty()
                    ) {
                        Icon(Icons.Default.Done, contentDescription = "Save Outfit")
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = outfitName,
                    onValueChange = { outfitName = it },
                    label = { Text("Outfit Name * (e.g. Minimalist Workwear)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = outfitNote,
                    onValueChange = { outfitNote = it },
                    label = { Text("Styling Note (e.g. Great for rainy days)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Canvas / Selected Items Bar
                Text(
                    text = "Selected Items (${selectedItemIds.size})",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )

                if (selectedItems.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(80.dp)
                            .padding(vertical = 8.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "Tap items below to add to this outfit",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                } else {
                    LazyRow(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(selectedItems, key = { it.id }) { item ->
                            val imageFile = remember(item.images) {
                                try {
                                    val arr = JSONArray(item.images)
                                    if (arr.length() > 0) ImageStorageHelper.getImageFile(context, arr.getString(0)) else null
                                } catch (_: Exception) {
                                    null
                                }
                            }

                            Box(
                                modifier = Modifier
                                    .size(72.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(12.dp))
                                    .clickable { selectedItemIds.remove(item.id) }
                            ) {
                                if (imageFile != null) {
                                    AsyncImage(
                                        model = imageFile,
                                        contentDescription = item.name,
                                        modifier = Modifier.fillMaxSize(),
                                        contentScale = ContentScale.Crop
                                    )
                                } else {
                                    Box(
                                        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surfaceVariant),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(item.name.take(4), style = MaterialTheme.typography.labelSmall)
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Items list grouped by category
                val categories = listOf("top", "bottom", "outerwear", "shoes", "accessory", "bag", "underwear")
                val groupedItems = remember(allItems) {
                    allItems.groupBy { it.category.lowercase() }
                }

                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    categories.forEach { cat ->
                        val itemsInCat = groupedItems[cat] ?: emptyList()
                        if (itemsInCat.isNotEmpty()) {
                            item {
                                Text(
                                    text = cat.uppercase(),
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.padding(bottom = 6.dp)
                                )

                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    items(itemsInCat, key = { it.id }) { item ->
                                        val isSelected = selectedItemIds.contains(item.id)
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
                                                .width(100.dp)
                                                .clickable {
                                                    if (isSelected) selectedItemIds.remove(item.id)
                                                    else selectedItemIds.add(item.id)
                                                },
                                            shape = RoundedCornerShape(10.dp),
                                            colors = CardDefaults.cardColors(
                                                containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                                            )
                                        ) {
                                            Column(modifier = Modifier.padding(6.dp)) {
                                                Box(
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .height(90.dp)
                                                        .clip(RoundedCornerShape(6.dp))
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
                                                    if (isSelected) {
                                                        Box(
                                                            modifier = Modifier
                                                                .size(24.dp)
                                                                .align(Alignment.TopEnd)
                                                                .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(bottomStart = 8.dp)),
                                                            contentAlignment = Alignment.Center
                                                        ) {
                                                            Icon(
                                                                Icons.Default.Check,
                                                                contentDescription = null,
                                                                tint = MaterialTheme.colorScheme.onPrimary,
                                                                modifier = Modifier.size(16.dp)
                                                            )
                                                        }
                                                    }
                                                }
                                                Spacer(modifier = Modifier.height(4.dp))
                                                Text(
                                                    text = item.name,
                                                    style = MaterialTheme.typography.labelSmall,
                                                    maxLines = 1
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
}
