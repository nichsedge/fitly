package com.fitly.app.presentation.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
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
    var isEditing by remember { mutableStateOf(false) }
    var showRetireDialog by remember { mutableStateOf(false) }
    var showDeleteConfirm by remember { mutableStateOf(false) }

    // Edit fields
    var editName by remember { mutableStateOf(item.name) }
    var editBrand by remember { mutableStateOf(item.brand ?: "") }
    var editCategory by remember { mutableStateOf(item.category) }
    var editPrice by remember { mutableStateOf(item.price?.toString() ?: "") }
    var editColor by remember { mutableStateOf(item.color ?: "#1a1a1a") }
    var editMaterial by remember { mutableStateOf(item.material ?: "") }
    var editCare by remember { mutableStateOf(item.careInstructions ?: "") }
    var editCondition by remember { mutableStateOf(item.condition ?: "good") }
    var editStatus by remember { mutableStateOf(item.status) }
    var editSparkJoy by remember { mutableStateOf(item.sparkJoy ?: "essential") }
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
                .padding(16.dp),
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 6.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp)
            ) {
                // Top Action Bar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                    Text(
                        text = if (isEditing) "Edit Item" else item.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1
                    )
                    IconButton(onClick = { isEditing = !isEditing }) {
                        Icon(
                            imageVector = if (isEditing) Icons.Default.Check else Icons.Default.Edit,
                            contentDescription = if (isEditing) "Done" else "Edit"
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Photo Display
                val imageFile = remember(item.images, newPhotoUri) {
                    try {
                        val arr = JSONArray(item.images)
                        if (arr.length() > 0) {
                            val imgId = arr.getString(0)
                            ImageStorageHelper.getImageFile(context, imgId)
                        } else null
                    } catch (_: Exception) {
                        null
                    }
                }

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(280.dp)
                        .clip(RoundedCornerShape(16.dp))
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
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                        )
                    }

                    // Change photo badge button
                    FloatingActionButton(
                        onClick = {
                            photoPickerLauncher.launch(
                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                            )
                        },
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(12.dp)
                            .size(44.dp),
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    ) {
                        Icon(Icons.Default.CameraAlt, contentDescription = "Change photo", modifier = Modifier.size(20.dp))
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (isEditing) {
                    // ================= EDIT MODE =================
                    OutlinedTextField(
                        value = editName,
                        onValueChange = { editName = it },
                        label = { Text("Item Name") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = editBrand,
                        onValueChange = { editBrand = it },
                        label = { Text("Brand") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    // Category Selector
                    Text("Category", style = MaterialTheme.typography.labelMedium)
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(vertical = 6.dp)
                    ) {
                        items(CATEGORY_OPTIONS) { cat ->
                            FilterChip(
                                selected = editCategory.equals(cat, ignoreCase = true),
                                onClick = { editCategory = cat },
                                label = { Text(cat.uppercase()) }
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = editPrice,
                        onValueChange = { editPrice = it },
                        label = { Text("Price (IDR / USD)") },
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    // Color swatches
                    Text("Color", style = MaterialTheme.typography.labelMedium)
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(vertical = 6.dp)
                    ) {
                        items(COLOR_OPTIONS) { (hex, name) ->
                            val colorInt = android.graphics.Color.parseColor(hex)
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(Color(colorInt))
                                    .border(
                                        width = if (editColor.equals(hex, ignoreCase = true)) 3.dp else 1.dp,
                                        color = if (editColor.equals(hex, ignoreCase = true)) MaterialTheme.colorScheme.primary else Color.Gray,
                                        shape = CircleShape
                                    )
                                    .clickable { editColor = hex }
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = editMaterial,
                        onValueChange = { editMaterial = it },
                        label = { Text("Material (e.g. 100% Linen)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = editCare,
                        onValueChange = { editCare = it },
                        label = { Text("Care Instructions (e.g. Cold Wash 30°C)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    // Status & Condition
                    Text("Status", style = MaterialTheme.typography.labelMedium)
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(vertical = 6.dp)
                    ) {
                        items(STATUS_OPTIONS) { st ->
                            FilterChip(
                                selected = editStatus == st,
                                onClick = { editStatus = st },
                                label = { Text(st.replaceFirstChar { it.uppercase() }) }
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))

                    Text("Spark Joy (KonMari)", style = MaterialTheme.typography.labelMedium)
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(vertical = 6.dp)
                    ) {
                        items(listOf("joy" to "💖 Joy", "essential" to "🧺 Essential", "no-joy" to "🍂 Release")) { (k, label) ->
                            FilterChip(
                                selected = editSparkJoy == k,
                                onClick = { editSparkJoy = k },
                                label = { Text(label) }
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))

                    // Save Button
                    Button(
                        onClick = {
                            val updated = item.copy(
                                name = editName.ifBlank { item.name },
                                brand = editBrand.ifBlank { null },
                                category = editCategory,
                                price = editPrice.toDoubleOrNull() ?: item.price,
                                color = editColor,
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
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Save, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Save Changes")
                    }
                } else {
                    // ================= VIEW MODE =================
                    // Stats Banner (Price & Cost Per Wear)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text("PRICE", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                val priceFormatted = item.price?.let {
                                    NumberFormat.getCurrencyInstance(Locale("id", "ID")).format(it)
                                } ?: "—"
                                Text(priceFormatted, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            }
                        }

                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text("COST PER WEAR", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
                                val cpwFormatted = item.price?.let { p ->
                                    val count = item.wearCount.coerceAtLeast(1)
                                    NumberFormat.getCurrencyInstance(Locale("id", "ID")).format(p / count)
                                } ?: "—"
                                Text(cpwFormatted, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Status and Spark Joy Badges
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Status toggle button
                        AssistChip(
                            onClick = {
                                val nextStatus = when (item.status) {
                                    "ready" -> "dirty"
                                    "dirty" -> "cleaning"
                                    else -> "ready"
                                }
                                viewModel.setItemStatus(item, nextStatus)
                            },
                            label = { Text("Status: ${item.status.uppercase()}") },
                            leadingIcon = {
                                Icon(
                                    when (item.status) {
                                        "ready" -> Icons.Default.CheckCircle
                                        "dirty" -> Icons.Default.LocalLaundryService
                                        else -> Icons.Default.HourglassTop
                                    },
                                    contentDescription = null,
                                    tint = when (item.status) {
                                        "ready" -> Color(0xFF16A34A)
                                        "dirty" -> Color(0xFFDC2626)
                                        else -> Color(0xFF2563EB)
                                    }
                                )
                            }
                        )

                        // Spark Joy chip
                        AssistChip(
                            onClick = { isEditing = true },
                            label = {
                                Text(
                                    when (item.sparkJoy) {
                                        "joy" -> "💖 Sparks Joy"
                                        "no-joy" -> "🍂 To Release"
                                        else -> "🧺 Daily Essential"
                                    }
                                )
                            }
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Metadata Spec Rows
                    SpecRow(label = "Category", value = item.category.uppercase())
                    if (!item.brand.isNullOrBlank()) SpecRow(label = "Brand", value = item.brand)
                    if (!item.color.isNullOrBlank()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Color", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            val parsedColor = remember(item.color) {
                                try {
                                    Color(android.graphics.Color.parseColor(item.color))
                                } catch (_: Exception) {
                                    null
                                }
                            }
                            if (parsedColor != null) {
                                Box(modifier = Modifier.size(16.dp).clip(CircleShape).background(parsedColor).border(1.dp, Color.Gray, CircleShape))
                            }
                        }
                    }
                    if (!item.material.isNullOrBlank()) SpecRow(label = "Material", value = item.material)
                    if (!item.careInstructions.isNullOrBlank()) SpecRow(label = "Care Info", value = item.careInstructions)
                    SpecRow(label = "Condition", value = item.condition?.replaceFirstChar { it.uppercase() } ?: "Good")
                    SpecRow(label = "Worn Count", value = "${item.wearCount} times")

                    val addedDateStr = SimpleDateFormat("MMM d, yyyy", Locale.US).format(Date(item.createdAt))
                    SpecRow(label = "Added", value = addedDateStr)

                    if (!item.gratitudeNote.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.5f))
                        ) {
                            Text(
                                text = "🌸 \"${item.gratitudeNote}\"",
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Action Buttons
                    Button(
                        onClick = {
                            viewModel.logItemWear(item)
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Log Wear Today")
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedButton(
                        onClick = { showRetireDialog = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Archive, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Thank & Retire Item")
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    TextButton(
                        onClick = { showDeleteConfirm = true },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)
                    ) {
                        Icon(Icons.Default.Delete, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Delete Item")
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
                        modifier = Modifier.fillMaxWidth()
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
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
    }
}
