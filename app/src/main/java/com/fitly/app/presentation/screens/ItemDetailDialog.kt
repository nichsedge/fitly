package com.fitly.app.presentation.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.core.graphics.toColorInt
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil3.compose.AsyncImage
import com.fitly.app.data.local.entity.ClothingItemEntity
import com.fitly.app.data.util.ImageStorageHelper
import com.fitly.app.presentation.WardrobeViewModel
import org.json.JSONArray
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

val COLOR_OPTIONS = listOf(
    "#1a1a1a" to "Black",
    "#f5f5f5" to "White",
    "#6b7280" to "Gray",
    "#dc2626" to "Red",
    "#2563eb" to "Blue",
    "#16a34a" to "Green",
    "#ca8a04" to "Yellow",
    "#9333ea" to "Purple",
    "#ea580c" to "Orange",
    "#db2777" to "Pink",
    "#854d0e" to "Brown",
    "#1d4ed8" to "Navy",
    "#d4a373" to "Beige"
)

val CATEGORY_OPTIONS = listOf("top", "bottom", "outerwear", "shoes", "accessory", "bag", "underwear")
val CONDITION_OPTIONS = listOf("new", "excellent", "good", "fair", "poor", "needs-repair")
val STATUS_OPTIONS = listOf("ready", "dirty", "cleaning")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ItemDetailDialog(
    item: ClothingItemEntity,
    viewModel: WardrobeViewModel,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current
    var isEditing by remember { mutableStateOf(false) }
    var showRetireDialog by remember { mutableStateOf(false) }
    var showDeleteConfirm by remember { mutableStateOf(false) }

    val locations by viewModel.locations.collectAsState()
    val tags by viewModel.tags.collectAsState()
    val allWearLogs by viewModel.allWearLogs.collectAsState()

    val itemWearLogs = remember(allWearLogs, item.id) {
        allWearLogs.filter { it.itemId == item.id }.sortedByDescending { it.timestamp }
    }

    // Edit fields
    var editName by remember { mutableStateOf(item.name) }
    var editBrand by remember { mutableStateOf(item.brand ?: "") }
    var editCategory by remember { mutableStateOf(item.category) }
    var editPrice by remember { mutableStateOf(item.price?.toInt()?.toString() ?: "") }
    var editColor by remember { mutableStateOf(item.color ?: "#1a1a1a") }
    var editMaterial by remember { mutableStateOf(item.material ?: "") }
    var editCare by remember { mutableStateOf(item.careInstructions ?: "") }
    var editCondition by remember { mutableStateOf(item.condition ?: "good") }
    var editStatus by remember { mutableStateOf(item.status) }
    var editSparkJoy by remember { mutableStateOf(item.sparkJoy ?: "essential") }
    var editLocationId by remember { mutableStateOf(item.locationId) }
    val editTagsList = remember {
        val list = mutableStateListOf<String>()
        try {
            val arr = JSONArray(item.tags)
            for (i in 0 until arr.length()) list.add(arr.getString(i))
        } catch (_: Exception) {}
        list
    }
    var newTagInput by remember { mutableStateOf("") }
    var selectedImageIndex by remember { mutableIntStateOf(0) }
    var newPhotoUri by remember { mutableStateOf<Uri?>(null) }

    // Pick photo launcher
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            newPhotoUri = uri
            viewModel.saveItem(item, newPhotoUri)
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
                    .padding(20.dp)
            ) {
                // Top Header Row
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
                        text = if (isEditing) "Edit Item" else item.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        modifier = Modifier.weight(1f).padding(horizontal = 12.dp)
                    )

                    IconButton(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            isEditing = !isEditing
                        },
                        colors = IconButtonDefaults.filledTonalIconButtonColors(
                            containerColor = if (isEditing) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Icon(
                            imageVector = if (isEditing) Icons.Default.Check else Icons.Default.Edit,
                            contentDescription = if (isEditing) "Done" else "Edit",
                            tint = if (isEditing) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Photos List
                val imageList = remember(item.images, newPhotoUri) {
                    try {
                        val arr = JSONArray(item.images)
                        val list = mutableListOf<String>()
                        for (i in 0 until arr.length()) list.add(arr.getString(i))
                        list
                    } catch (_: Exception) {
                        emptyList()
                    }
                }

                val currentImgId = imageList.getOrNull(selectedImageIndex) ?: imageList.firstOrNull()
                val imageFile = remember(currentImgId, newPhotoUri) {
                    if (currentImgId != null) ImageStorageHelper.getImageFile(context, currentImgId) else null
                }

                // Hero Image Box with Overlays
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(290.dp)
                        .clip(RoundedCornerShape(22.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center
                ) {
                    if (imageFile != null) {
                        AsyncImage(
                            model = imageFile,
                            contentDescription = item.name,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Icon(
                            Icons.Default.Checkroom,
                            contentDescription = null,
                            modifier = Modifier.size(72.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
                        )
                    }

                    // Scrim gradient for contrast
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color.Black.copy(alpha = 0.45f),
                                        Color.Transparent,
                                        Color.Black.copy(alpha = 0.6f)
                                    )
                                )
                            )
                    )

                    // Top row overlay: Category & Spark Joy
                    Row(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.85f),
                            tonalElevation = 2.dp
                        ) {
                            Text(
                                text = item.category.uppercase(),
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                color = MaterialTheme.colorScheme.primary
                            )
                        }

                        // Spark joy badge
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.85f),
                            tonalElevation = 2.dp
                        ) {
                            Text(
                                text = when (item.sparkJoy) {
                                    "joy" -> "💖 Joy"
                                    "no-joy" -> "🍂 Release"
                                    else -> "🧺 Essential"
                                },
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }

                    // Bottom row overlay: Status & Camera FAB
                    Row(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Quick toggle status button
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = when (item.status) {
                                "ready" -> Color(0xFF10B981).copy(alpha = 0.9f)
                                "dirty" -> Color(0xFFEF4444).copy(alpha = 0.9f)
                                else -> Color(0xFF3B82F6).copy(alpha = 0.9f)
                            },
                            modifier = Modifier.clickable {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                val nextStatus = when (item.status) {
                                    "ready" -> "dirty"
                                    "dirty" -> "cleaning"
                                    else -> "ready"
                                }
                                viewModel.setItemStatus(item, nextStatus)
                            }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    imageVector = when (item.status) {
                                        "ready" -> Icons.Default.CheckCircle
                                        "dirty" -> Icons.Default.LocalLaundryService
                                        else -> Icons.Default.HourglassTop
                                    },
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = item.status.uppercase(),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }

                        // Change photo button
                        SmallFloatingActionButton(
                            onClick = {
                                photoPickerLauncher.launch(
                                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                )
                            },
                            containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f),
                            contentColor = MaterialTheme.colorScheme.primary,
                            shape = CircleShape
                        ) {
                            Icon(Icons.Default.CameraAlt, contentDescription = "Add/Change photo", modifier = Modifier.size(18.dp))
                        }
                    }
                }

                // Thumbnail strip if multiple photos
                if (imageList.size > 1) {
                    Spacer(modifier = Modifier.height(10.dp))
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(imageList.indices.toList()) { idx ->
                            val thumbId = imageList[idx]
                            val thumbFile = remember(thumbId) { ImageStorageHelper.getImageFile(context, thumbId) }
                            Box(
                                modifier = Modifier
                                    .size(54.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .border(
                                        width = if (selectedImageIndex == idx) 2.dp else 1.dp,
                                        color = if (selectedImageIndex == idx) MaterialTheme.colorScheme.primary else Color.Gray.copy(alpha = 0.3f),
                                        shape = RoundedCornerShape(10.dp)
                                    )
                                    .clickable { selectedImageIndex = idx }
                            ) {
                                if (thumbFile != null) {
                                    AsyncImage(
                                        model = thumbFile,
                                        contentDescription = null,
                                        modifier = Modifier.fillMaxSize(),
                                        contentScale = ContentScale.Crop
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                AnimatedContent(
                    targetState = isEditing,
                    transitionSpec = { fadeIn() togetherWith fadeOut() },
                    label = "mode_transition"
                ) { editing ->
                    if (editing) {
                        // ================= EDIT MODE =================
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = editName,
                                onValueChange = { editName = it },
                                label = { Text("Item Name *") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(14.dp),
                                singleLine = true
                            )

                            OutlinedTextField(
                                value = editBrand,
                                onValueChange = { editBrand = it },
                                label = { Text("Brand (e.g. Uniqlo, Zara)") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(14.dp),
                                singleLine = true
                            )

                            // Category Selector
                            Column {
                                Text("Category", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.padding(top = 4.dp)
                                ) {
                                    items(CATEGORY_OPTIONS) { cat ->
                                        FilterChip(
                                            selected = editCategory.equals(cat, ignoreCase = true),
                                            onClick = { editCategory = cat },
                                            label = { Text(cat.uppercase()) }
                                        )
                                    }
                                }
                            }

                            OutlinedTextField(
                                value = editPrice,
                                onValueChange = { editPrice = it },
                                label = { Text("Price (IDR)") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(14.dp),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true
                            )

                            // Color swatches
                            Column {
                                Text("Color", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                                                    width = if (editColor.equals(hex, ignoreCase = true)) 3.dp else 1.dp,
                                                    color = if (editColor.equals(hex, ignoreCase = true)) MaterialTheme.colorScheme.primary else Color.Gray.copy(alpha = 0.4f),
                                                    shape = CircleShape
                                                )
                                                .clickable { editColor = hex }
                                        )
                                    }
                                }
                            }

                            OutlinedTextField(
                                value = editMaterial,
                                onValueChange = { editMaterial = it },
                                label = { Text("Material (e.g. 100% Linen)") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(14.dp),
                                singleLine = true
                            )

                            OutlinedTextField(
                                value = editCare,
                                onValueChange = { editCare = it },
                                label = { Text("Care Instructions (e.g. Cold Wash 30°C)") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(14.dp)
                            )

                            // Status & Spark Joy
                            Column {
                                Text("Status", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.padding(top = 4.dp)
                                ) {
                                    items(STATUS_OPTIONS) { st ->
                                        FilterChip(
                                            selected = editStatus == st,
                                            onClick = { editStatus = st },
                                            label = { Text(st.uppercase()) }
                                        )
                                    }
                                }
                            }

                            Column {
                                Text("Spark Joy (KonMari)", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.padding(top = 4.dp)
                                ) {
                                    items(listOf("joy" to "💖 Joy", "essential" to "🧺 Essential", "no-joy" to "🍂 Release")) { (k, label) ->
                                        FilterChip(
                                            selected = editSparkJoy == k,
                                            onClick = { editSparkJoy = k },
                                            label = { Text(label) }
                                        )
                                    }
                                }
                            }

                            // Storage Location
                            Column {
                                Text("Storage Location", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.padding(top = 4.dp)
                                ) {
                                    item {
                                        FilterChip(
                                            selected = editLocationId == null,
                                            onClick = { editLocationId = null },
                                            label = { Text("None") }
                                        )
                                    }
                                    items(locations) { loc ->
                                        FilterChip(
                                            selected = editLocationId == loc.id,
                                            onClick = { editLocationId = if (editLocationId == loc.id) null else loc.id },
                                            label = { Text("${loc.icon ?: "📍"} ${loc.name}") }
                                        )
                                    }
                                }
                            }

                            // Style Tags
                            Column {
                                Text("Style Tags (${editTagsList.size})", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    OutlinedTextField(
                                        value = newTagInput,
                                        onValueChange = { newTagInput = it },
                                        placeholder = { Text("Add custom tag...") },
                                        modifier = Modifier.weight(1f),
                                        shape = RoundedCornerShape(14.dp),
                                        singleLine = true
                                    )
                                    IconButton(
                                        onClick = {
                                            val clean = newTagInput.trim().lowercase()
                                            if (clean.isNotBlank() && !editTagsList.contains(clean)) {
                                                editTagsList.add(clean)
                                                viewModel.addTag(clean)
                                                newTagInput = ""
                                            }
                                        }
                                    ) {
                                        Icon(Icons.Default.AddCircle, contentDescription = "Add tag", tint = MaterialTheme.colorScheme.primary)
                                    }
                                }
                                if (editTagsList.isNotEmpty() || tags.isNotEmpty()) {
                                    LazyRow(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        modifier = Modifier.padding(top = 6.dp)
                                    ) {
                                        items(tags) { t ->
                                            val hasTag = editTagsList.contains(t.label)
                                            FilterChip(
                                                selected = hasTag,
                                                onClick = {
                                                    if (hasTag) editTagsList.remove(t.label) else editTagsList.add(t.label)
                                                },
                                                label = { Text("#${t.label}") }
                                            )
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            // Save Button
                            Button(
                                onClick = {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    val updated = item.copy(
                                        name = editName.ifBlank { item.name },
                                        brand = editBrand.ifBlank { null },
                                        category = editCategory,
                                        price = editPrice.toDoubleOrNull() ?: item.price,
                                        color = editColor,
                                        locationId = editLocationId,
                                        tags = JSONArray(editTagsList.toList()).toString(),
                                        material = editMaterial.ifBlank { null },
                                        careInstructions = editCare.ifBlank { null },
                                        condition = editCondition,
                                        status = editStatus,
                                        sparkJoy = editSparkJoy
                                    )
                                    viewModel.saveItem(updated, newPhotoUri) {
                                        isEditing = false
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Icon(Icons.Default.Save, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Save Changes", fontWeight = FontWeight.Bold)
                            }
                        }
                    } else {
                        // ================= VIEW MODE =================
                        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            // Stats Banner (Price, CPW, Wears)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                // Price
                                Card(
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                                ) {
                                    Column(modifier = Modifier.padding(14.dp)) {
                                        Text("PRICE", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        val priceFormatted = item.price?.let {
                                            NumberFormat.getCurrencyInstance(Locale.forLanguageTag("id-ID")).format(it)
                                        } ?: "—"
                                        Text(priceFormatted, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1)
                                    }
                                }

                                // Cost-Per-Wear
                                Card(
                                    modifier = Modifier.weight(1.2f),
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                                ) {
                                    Column(modifier = Modifier.padding(14.dp)) {
                                        Text("COST / WEAR", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
                                        val cpw = item.price?.let { p ->
                                            val count = item.wearCount.coerceAtLeast(1)
                                            p / count
                                        }
                                        val cpwText = cpw?.let { formatCurrencyShort(it) + "/w" } ?: "—"
                                        Text(cpwText, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                    }
                                }

                                // Wears Count
                                Card(
                                    modifier = Modifier.weight(0.9f),
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                                ) {
                                    Column(modifier = Modifier.padding(14.dp)) {
                                        Text("WEARS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Text("${item.wearCount}x", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }

                            // Metadata Card
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(18.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                            ) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    SpecRow(label = "Category", value = item.category.uppercase())
                                    if (!item.brand.isNullOrBlank()) SpecRow(label = "Brand", value = item.brand)
                                    if (!item.color.isNullOrBlank()) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text("Color", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            val parsedColor = remember(item.color) {
                                                try {
                                                    Color(item.color.toColorInt())
                                                } catch (_: Exception) {
                                                    null
                                                }
                                            }
                                            if (parsedColor != null) {
                                                Box(modifier = Modifier.size(18.dp).clip(CircleShape).background(parsedColor).border(1.dp, Color.Gray, CircleShape))
                                            }
                                        }
                                    }
                                    if (!item.material.isNullOrBlank()) SpecRow(label = "Material", value = item.material)
                                    if (!item.careInstructions.isNullOrBlank()) SpecRow(label = "Care Info", value = item.careInstructions)
                                    SpecRow(label = "Condition", value = item.condition?.replaceFirstChar { it.uppercase() } ?: "Good")

                                    val locName = remember(item.locationId, locations) {
                                        item.locationId?.let { lId -> locations.find { it.id == lId }?.name }
                                    }
                                    if (!locName.isNullOrBlank()) {
                                        SpecRow(label = "Location", value = "📍 $locName")
                                    }

                                    val addedDateStr = SimpleDateFormat("MMM d, yyyy", Locale.US).format(Date(item.createdAt))
                                    SpecRow(label = "Added to Wardrobe", value = addedDateStr)
                                }
                            }

                            // Tags row
                            val itemTags = remember(item.tags) {
                                try {
                                    val arr = JSONArray(item.tags)
                                    val list = mutableListOf<String>()
                                    for (i in 0 until arr.length()) list.add(arr.getString(i))
                                    list
                                } catch (_: Exception) {
                                    emptyList()
                                }
                            }
                            if (itemTags.isNotEmpty()) {
                                Column {
                                    Text("Style Tags", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    LazyRow(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        modifier = Modifier.padding(top = 4.dp)
                                    ) {
                                        items(itemTags) { t ->
                                            AssistChip(
                                                onClick = {},
                                                label = { Text("#$t", style = MaterialTheme.typography.labelSmall) },
                                                shape = RoundedCornerShape(12.dp)
                                            )
                                        }
                                    }
                                }
                            }

                            if (!item.gratitudeNote.isNullOrBlank()) {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.4f)),
                                    shape = RoundedCornerShape(14.dp)
                                ) {
                                    Text(
                                        text = "🌸 \"${item.gratitudeNote}\"",
                                        style = MaterialTheme.typography.bodySmall,
                                        modifier = Modifier.padding(14.dp)
                                    )
                                }
                            }

                            // Wear & Wash History
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    text = "Wear & Wash History (${itemWearLogs.size})",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold
                                )
                                if (itemWearLogs.isEmpty()) {
                                    Text("No wear logs recorded yet.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                } else {
                                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        itemWearLogs.take(5).forEach { log ->
                                            Card(
                                                modifier = Modifier.fillMaxWidth(),
                                                shape = RoundedCornerShape(12.dp),
                                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                        Icon(
                                                            imageVector = if (log.type == "wash") Icons.Default.LocalLaundryService else Icons.Default.Check,
                                                            contentDescription = null,
                                                            modifier = Modifier.size(16.dp),
                                                            tint = if (log.type == "wash") MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.primary
                                                        )
                                                        Text(
                                                            text = if (log.type == "wash") "Washed / Cleaned" else "Worn",
                                                            style = MaterialTheme.typography.bodySmall,
                                                            fontWeight = FontWeight.Medium
                                                        )
                                                    }
                                                    Text(
                                                        text = log.wornDate,
                                                        style = MaterialTheme.typography.labelSmall,
                                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(6.dp))

                            // Action Buttons
                            Button(
                                onClick = {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    viewModel.logItemWear(item)
                                },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Icon(Icons.Default.Check, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Log Wear Today", fontWeight = FontWeight.Bold)
                            }

                            OutlinedButton(
                                onClick = { showRetireDialog = true },
                                modifier = Modifier.fillMaxWidth().height(48.dp),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Icon(Icons.Default.Archive, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Thank & Retire Item")
                            }

                            TextButton(
                                onClick = { showDeleteConfirm = true },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)
                            ) {
                                Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Delete Item")
                            }
                        }
                    }
                }
            }
        }
    }

    // Retire Dialog
    if (showRetireDialog) {
        var retireReason by remember { mutableStateOf("donated") }
        var gratitudeNote by remember { mutableStateOf("Thank you for serving me well!") }

        AlertDialog(
            onDismissRequest = { showRetireDialog = false },
            title = { Text("Retire \"${item.name}\"") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Select retirement reason:")
                    listOf("donated" to "Donated", "sold" to "Sold", "recycled" to "Recycled", "discarded" to "Discarded").forEach { (k, label) ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(selected = retireReason == k, onClick = { retireReason = k })
                            Text(label, modifier = Modifier.padding(start = 6.dp))
                        }
                    }
                    OutlinedTextField(
                        value = gratitudeNote,
                        onValueChange = { gratitudeNote = it },
                        label = { Text("Gratitude Note") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            },
            confirmButton = {
                Button(onClick = {
                    viewModel.retireItem(item, retireReason, gratitudeNote) {
                        showRetireDialog = false
                        onDismiss()
                    }
                }) {
                    Text("Retire")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRetireDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Delete confirmation
    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Delete Item?") },
            text = { Text("Are you sure you want to delete \"${item.name}\"? This action cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteItem(item) {
                            showDeleteConfirm = false
                            onDismiss()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun SpecRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
    }
}
