package com.fitly.app.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.fitly.app.data.local.entity.ClothingItemEntity
import com.fitly.app.presentation.screens.*
import com.fitly.app.presentation.theme.FitlyTheme

enum class FitlyTab(val label: String) {
    WARDROBE("Wardrobe"),
    OUTFITS("Outfits"),
    LAUNDRY("Laundry"),
    CALENDAR("Calendar"),
    TRIPS("Trips"),
    ANALYTICS("Analytics"),
    SETTINGS("Settings")
}

class MainActivity : ComponentActivity() {

    private val viewModel: WardrobeViewModel by viewModels()

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            FitlyTheme {
                var currentTab by remember { mutableStateOf(FitlyTab.WARDROBE) }
                var previousTab by remember { mutableStateOf(FitlyTab.WARDROBE) }
                var activeDetailItem by remember { mutableStateOf<ClothingItemEntity?>(null) }

                val dirtyItems by viewModel.dirtyItems.collectAsState()

                Scaffold(
                    topBar = {
                        TopAppBar(
                            title = {
                                Text(
                                    text = currentTab.label,
                                    style = MaterialTheme.typography.titleLarge
                                )
                            },
                            navigationIcon = {
                                if (currentTab == FitlyTab.ANALYTICS || currentTab == FitlyTab.SETTINGS) {
                                    IconButton(onClick = { currentTab = previousTab }) {
                                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                                    }
                                }
                            },
                            actions = {
                                if (currentTab != FitlyTab.ANALYTICS) {
                                    IconButton(onClick = {
                                        previousTab = currentTab
                                        currentTab = FitlyTab.ANALYTICS
                                    }) {
                                        Icon(Icons.Default.Insights, contentDescription = "Analytics")
                                    }
                                }
                                if (currentTab != FitlyTab.SETTINGS) {
                                    IconButton(onClick = {
                                        previousTab = currentTab
                                        currentTab = FitlyTab.SETTINGS
                                    }) {
                                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                                    }
                                }
                            },
                            colors = TopAppBarDefaults.topAppBarColors(
                                containerColor = MaterialTheme.colorScheme.background
                            )
                        )
                    },
                    bottomBar = {
                        if (currentTab != FitlyTab.ANALYTICS && currentTab != FitlyTab.SETTINGS) {
                            NavigationBar {
                                NavigationBarItem(
                                    selected = currentTab == FitlyTab.WARDROBE,
                                    onClick = { currentTab = FitlyTab.WARDROBE },
                                    icon = { Icon(Icons.Default.Checkroom, contentDescription = "Wardrobe") },
                                    label = { Text("Wardrobe") }
                                )
                                NavigationBarItem(
                                    selected = currentTab == FitlyTab.OUTFITS,
                                    onClick = { currentTab = FitlyTab.OUTFITS },
                                    icon = { Icon(Icons.Default.Style, contentDescription = "Outfits") },
                                    label = { Text("Outfits") }
                                )
                                NavigationBarItem(
                                    selected = currentTab == FitlyTab.LAUNDRY,
                                    onClick = { currentTab = FitlyTab.LAUNDRY },
                                    icon = {
                                        BadgedBox(badge = {
                                            if (dirtyItems.isNotEmpty()) {
                                                Badge { Text(dirtyItems.size.toString()) }
                                            }
                                        }) {
                                            Icon(Icons.Default.LocalLaundryService, contentDescription = "Laundry")
                                        }
                                    },
                                    label = { Text("Laundry") }
                                )
                                NavigationBarItem(
                                    selected = currentTab == FitlyTab.CALENDAR,
                                    onClick = { currentTab = FitlyTab.CALENDAR },
                                    icon = { Icon(Icons.Default.CalendarMonth, contentDescription = "Calendar") },
                                    label = { Text("Calendar") }
                                )
                                NavigationBarItem(
                                    selected = currentTab == FitlyTab.TRIPS,
                                    onClick = { currentTab = FitlyTab.TRIPS },
                                    icon = { Icon(Icons.Default.Luggage, contentDescription = "Trips") },
                                    label = { Text("Trips") }
                                )
                            }
                        }
                    }
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                    ) {
                        when (currentTab) {
                            FitlyTab.WARDROBE -> WardrobeScreen(
                                viewModel = viewModel,
                                onItemClick = { activeDetailItem = it }
                            )
                            FitlyTab.OUTFITS -> OutfitsScreen(
                                viewModel = viewModel,
                                onItemClick = { activeDetailItem = it }
                            )
                            FitlyTab.LAUNDRY -> LaundryScreen(
                                viewModel = viewModel,
                                onItemClick = { activeDetailItem = it }
                            )
                            FitlyTab.CALENDAR -> CalendarScreen(
                                viewModel = viewModel,
                                onItemClick = { activeDetailItem = it }
                            )
                            FitlyTab.TRIPS -> TripsScreen(
                                viewModel = viewModel,
                                onItemClick = { activeDetailItem = it }
                            )
                            FitlyTab.ANALYTICS -> AnalyticsScreen(
                                viewModel = viewModel,
                                onItemClick = { activeDetailItem = it }
                            )
                            FitlyTab.SETTINGS -> SettingsScreen(
                                viewModel = viewModel
                            )
                        }

                        // Shared global item detail dialog if clicked from any screen
                        activeDetailItem?.let { item ->
                            ItemDetailDialog(
                                item = item,
                                viewModel = viewModel,
                                onDismiss = { activeDetailItem = null }
                            )
                        }
                    }
                }
            }
        }
    }
}
