package com.fitly.app.presentation.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.core.graphics.toColorInt
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil3.compose.AsyncImage
import com.fitly.app.data.local.entity.ClothingItemEntity
import com.fitly.app.presentation.WardrobeViewModel
import org.json.JSONArray
import java.util.UUID

private val CATEGORY_DISPLAY = listOf(
    "top" to "👕 TOP",
    "bottom" to "👖 BOTTOM",
    "outerwear" to "🧥 OUTERWEAR",
    "shoes" to "👟 SHOES",
    "accessory" to "🕶️ ACCESSORY",
    "bag" to "🎒 BAG",
    "underwear" to "🩲 UNDERWEAR"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddItemDialog(
    viewModel: WardrobeViewModel,
    onDismiss: () -> Unit
) {
    val haptic = LocalHapticFeedback.current
    var name by remember { mutableStateOf("") }
    var brand by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("top") }
    var price by remember { mutableStateOf("") }
    var color by remember { mutableStateOf("#1a1a1a") }
    var material by remember { mutableStateOf("") }
    var careInstructions by remember { mutableStateOf("") }
    var selectedPhotoUri by remember { mutableStateOf<Uri?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    val locations by viewModel.locations.collectAsState()
    val tags by viewModel.tags.collectAsState()
    var selectedLocationId by remember { mutableStateOf<String?>(null) }
    val selectedTags = remember { mutableStateListOf<String>() }
    var newTagInput by remember { mutableStateOf("") }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            selectedPhotoUri = uri
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp, vertical = 20.dp),
            shape = RoundedCornerShape(28.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 8.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onDismiss,
                        colors = IconButtonDefaults.filledTonalIconButtonColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Close", modifier = Modifier.size(20.dp))
                    }
                    Text(
                        text = "New Wardrobe Piece",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(
                        onClick = {
                            if (name.isNotBlank() && !isSaving) {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                isSaving = true
                                val newItem = ClothingItemEntity(
                                    id = "item_${UUID.randomUUID()}",
                                    name = name.trim(),
                                    brand = brand.trim().ifBlank { null },
                                    category = category,
                                    price = price.toDoubleOrNull(),
                                    color = color,
                                    locationId = selectedLocationId,
                                    tags = JSONArray(selectedTags.toList()).toString(),
                                    material = material.trim().ifBlank { null },
                                    careInstructions = careInstructions.trim().ifBlank { null },
                                    status = "ready",
                                    condition = "good",
                                    sparkJoy = "essential",
                                    createdAt = System.currentTimeMillis()
                                )
                                viewModel.saveItem(newItem, selectedPhotoUri) {
                                    isSaving = false
                                    onDismiss()
                                }
                            }
                        },
                        enabled = name.isNotBlank() && !isSaving,
                        colors = IconButtonDefaults.filledTonalIconButtonColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer
                        )
                    ) {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = "Save",
                            tint = if (name.isNotBlank()) MaterialTheme.colorScheme.primary else Color.Gray,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                // Photo Selector Box
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(210.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .clickable {
                            photoPickerLauncher.launch(
                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                            )
                        },
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                ) {
                    if (selectedPhotoUri != null) {
                        Box(modifier = Modifier.fillMaxSize()) {
                            AsyncImage(
                                model = selectedPhotoUri,
                                contentDescription = "Selected photo",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                            Surface(
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .padding(10.dp),
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.surface.copy(alpha = 0.85f)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.primary)
                                    Text("Change Photo", style = MaterialTheme.typography.labelSmall)
                                }
                            }
                        }
                    } else {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Surface(
                                shape = CircleShape,
                                color = MaterialTheme.colorScheme.primaryContainer,
                                modifier = Modifier.size(56.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        Icons.Default.AddPhotoAlternate,
                                        contentDescription = "Pick photo",
                                        modifier = Modifier.size(28.dp),
                                        tint = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = "Select High-Res Photo",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "Supports JPG, PNG, WEBP from your device",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Item Name *") },
                    placeholder = { Text("e.g. Linen Relaxed Shirt") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true
                )

                OutlinedTextField(
                    value = brand,
                    onValueChange = { brand = it },
                    label = { Text("Brand") },
                    placeholder = { Text("e.g. Uniqlo, COS, Muji") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true
                )

                // Category Chips
                Column {
                    Text("Category", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(top = 6.dp)
                    ) {
                        items(CATEGORY_DISPLAY) { (catKey, label) ->
                            FilterChip(
                                selected = category.equals(catKey, ignoreCase = true),
                                onClick = {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    category = catKey
                                },
                                label = { Text(label, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold) },
                                shape = RoundedCornerShape(12.dp)
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = price,
                    onValueChange = { price = it },
                    label = { Text("Price (IDR)") },
                    placeholder = { Text("e.g. 399000") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true
                )

                // Color Swatches
                Column {
                    Text("Primary Color", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(top = 6.dp)
                    ) {
                        items(COLOR_OPTIONS) { (hex, _) ->
                            val colorInt = hex.toColorInt()
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(Color(colorInt))
                                    .border(
                                        width = if (color.equals(hex, ignoreCase = true)) 3.dp else 1.dp,
                                        color = if (color.equals(hex, ignoreCase = true)) MaterialTheme.colorScheme.primary else Color.Gray.copy(alpha = 0.35f),
                                        shape = CircleShape
                                    )
                                    .clickable {
                                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                        color = hex
                                    }
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = material,
                    onValueChange = { material = it },
                    label = { Text("Material") },
                    placeholder = { Text("e.g. 100% French Linen") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true
                )

                OutlinedTextField(
                    value = careInstructions,
                    onValueChange = { careInstructions = it },
                    label = { Text("Care Instructions") },
                    placeholder = { Text("e.g. Cold gentle cycle, dry flat") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true
                )

                // Storage Location
                Column {
                    Text("Storage Location", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(top = 6.dp)
                    ) {
                        item {
                            FilterChip(
                                selected = selectedLocationId == null,
                                onClick = { selectedLocationId = null },
                                label = { Text("None") },
                                shape = RoundedCornerShape(12.dp)
                            )
                        }
                        items(locations) { loc ->
                            FilterChip(
                                selected = selectedLocationId == loc.id,
                                onClick = { selectedLocationId = if (selectedLocationId == loc.id) null else loc.id },
                                label = { Text("${loc.icon ?: "📍"} ${loc.name}") },
                                shape = RoundedCornerShape(12.dp)
                            )
                        }
                    }
                }

                // Style Tags
                Column {
                    Text("Style Tags (${selectedTags.size})", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = newTagInput,
                            onValueChange = { newTagInput = it },
                            placeholder = { Text("Add tag (e.g. casual, office)...") },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(14.dp),
                            singleLine = true
                        )
                        IconButton(
                            onClick = {
                                val clean = newTagInput.trim().lowercase()
                                if (clean.isNotBlank() && !selectedTags.contains(clean)) {
                                    selectedTags.add(clean)
                                    viewModel.addTag(clean)
                                    newTagInput = ""
                                }
                            }
                        ) {
                            Icon(Icons.Default.AddCircle, contentDescription = "Add tag", tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                    if (tags.isNotEmpty() || selectedTags.isNotEmpty()) {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.padding(top = 6.dp)
                        ) {
                            items(tags) { t ->
                                val isSel = selectedTags.contains(t.label)
                                FilterChip(
                                    selected = isSel,
                                    onClick = {
                                        if (isSel) selectedTags.remove(t.label) else selectedTags.add(t.label)
                                    },
                                    label = { Text("#${t.label}") },
                                    shape = RoundedCornerShape(12.dp)
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Button(
                    onClick = {
                        if (name.isBlank() || isSaving) return@Button
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        isSaving = true
                        val newItem = ClothingItemEntity(
                            id = "item_${UUID.randomUUID()}",
                            name = name.trim(),
                            brand = brand.trim().ifBlank { null },
                            category = category,
                            price = price.toDoubleOrNull(),
                            color = color,
                            locationId = selectedLocationId,
                            tags = JSONArray(selectedTags.toList()).toString(),
                            material = material.trim().ifBlank { null },
                            careInstructions = careInstructions.trim().ifBlank { null },
                            status = "ready",
                            condition = "good",
                            sparkJoy = "essential",
                            createdAt = System.currentTimeMillis()
                        )
                        viewModel.saveItem(newItem, selectedPhotoUri) {
                            isSaving = false
                            onDismiss()
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    enabled = name.isNotBlank() && !isSaving
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("Saving item...")
                    } else {
                        Icon(Icons.Default.Done, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Add to Wardrobe", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
