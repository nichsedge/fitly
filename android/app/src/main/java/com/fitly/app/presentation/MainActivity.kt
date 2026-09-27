package com.fitly.app.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.*
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fitly.app.data.local.entity.ClothingItemEntity
import com.fitly.app.data.util.AppConstants
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
        enableEdgeToEdge()
        setContent {
            val dynamicColor by viewModel.dynamicColorEnabled.collectAsState()
            FitlyTheme(dynamicColor = dynamicColor) {
                val tabStack = remember { mutableStateListOf(FitlyTab.WARDROBE) }
                var currentTab by remember { mutableStateOf(FitlyTab.WARDROBE) }
                var activeDetailItem by remember { mutableStateOf<ClothingItemEntity?>(null) }
                val snackbarHostState = remember { SnackbarHostState() }

                fun navigateTo(tab: FitlyTab) {
                    if (currentTab == tab) return
                    if (tab in listOf(FitlyTab.WARDROBE, FitlyTab.OUTFITS, FitlyTab.LAUNDRY, FitlyTab.CALENDAR, FitlyTab.TRIPS)) {
                        tabStack.clear()
                        if (tab != FitlyTab.WARDROBE) {
                            tabStack.add(FitlyTab.WARDROBE)
                        }
                        tabStack.add(tab)
                    } else {
                        tabStack.removeAll { it == tab }
                        tabStack.add(tab)
                    }
                    currentTab = tab
                }

                fun navigateBack() {
                    if (tabStack.size > 1) {
                        tabStack.removeAt(tabStack.lastIndex)
                        currentTab = tabStack.last()
                    } else {
                        tabStack.clear()
                        tabStack.add(FitlyTab.WARDROBE)
                        currentTab = FitlyTab.WARDROBE
                    }
                }

                LaunchedEffect(Unit) {
                    viewModel.userMessage.collect { msg ->
                        snackbarHostState.showSnackbar(
                            message = msg,
                            duration = SnackbarDuration.Short
                        )
                    }
                }

                BackHandler(enabled = currentTab != FitlyTab.WARDROBE || tabStack.size > 1) {
                    navigateBack()
                }

                val dirtyItems by viewModel.dirtyItems.collectAsState()

                Scaffold(
                    snackbarHost = {
                        SnackbarHost(hostState = snackbarHostState) { data ->
                            Snackbar(
                                snackbarData = data,
                                shape = RoundedCornerShape(12.dp),
                                containerColor = MaterialTheme.colorScheme.inverseSurface,
                                contentColor = MaterialTheme.colorScheme.inverseOnSurface
                            )
                        }
                    },
                    topBar = {
                        TopAppBar(
                            title = {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    if (currentTab != FitlyTab.ANALYTICS && currentTab != FitlyTab.SETTINGS) {
                                        Text(
                                            text = "FITLY",
                                            style = MaterialTheme.typography.titleLarge.copy(
                                                fontWeight = FontWeight.Black,
                                                letterSpacing = 2.sp
                                            ),
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                        Text(
                                            text = "•",
                                            color = MaterialTheme.colorScheme.outlineVariant,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                    Text(
                                        text = currentTab.label,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            },
                            navigationIcon = {
                                if (currentTab == FitlyTab.ANALYTICS || currentTab == FitlyTab.SETTINGS) {
                                    IconButton(onClick = { navigateBack() }) {
                                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                                    }
                                }
                            },
                            actions = {
                                val isAnalytics = currentTab == FitlyTab.ANALYTICS
                                val isSettings = currentTab == FitlyTab.SETTINGS

                                if (isAnalytics) {
                                    FilledIconButton(
                                        onClick = { navigateBack() },
                                        modifier = Modifier.size(38.dp)
                                    ) {
                                        Icon(Icons.Default.Insights, contentDescription = "Analytics", modifier = Modifier.size(20.dp))
                                    }
                                } else {
                                    FilledTonalIconButton(
                                        onClick = { navigateTo(FitlyTab.ANALYTICS) },
                                        modifier = Modifier.size(38.dp)
                                    ) {
                                        Icon(Icons.Default.Insights, contentDescription = "Analytics", modifier = Modifier.size(20.dp))
                                    }
                                }

                                Spacer(modifier = Modifier.width(6.dp))

                                if (isSettings) {
                                    FilledIconButton(
                                        onClick = { navigateBack() },
                                        modifier = Modifier.size(38.dp)
                                    ) {
                                        Icon(Icons.Default.Settings, contentDescription = "Settings", modifier = Modifier.size(20.dp))
                                    }
                                } else {
                                    FilledTonalIconButton(
                                        onClick = { navigateTo(FitlyTab.SETTINGS) },
                                        modifier = Modifier.size(38.dp)
                                    ) {
                                        Icon(Icons.Default.Settings, contentDescription = "Settings", modifier = Modifier.size(20.dp))
                                    }
                                }

                                Spacer(modifier = Modifier.width(8.dp))
                            },
                            colors = TopAppBarDefaults.topAppBarColors(
                                containerColor = MaterialTheme.colorScheme.background
                            )
                        )
                    },
                    bottomBar = {
                        NavigationBar(
                            containerColor = MaterialTheme.colorScheme.surface,
                            tonalElevation = 3.dp
                        ) {
                            NavigationBarItem(
                                selected = currentTab == FitlyTab.WARDROBE,
                                onClick = { navigateTo(FitlyTab.WARDROBE) },
                                icon = { Icon(Icons.Default.Checkroom, contentDescription = "Wardrobe") },
                                label = { Text("Wardrobe") }
                            )
                            NavigationBarItem(
                                selected = currentTab == FitlyTab.OUTFITS,
                                onClick = { navigateTo(FitlyTab.OUTFITS) },
                                icon = { Icon(Icons.Default.Style, contentDescription = "Outfits") },
                                label = { Text("Outfits") }
                            )
                            NavigationBarItem(
                                selected = currentTab == FitlyTab.LAUNDRY,
                                onClick = { navigateTo(FitlyTab.LAUNDRY) },
                                icon = {
                                    BadgedBox(badge = {
                                        if (dirtyItems.isNotEmpty()) {
                                            Badge(
                                                containerColor = MaterialTheme.colorScheme.error,
                                                contentColor = MaterialTheme.colorScheme.onError
                                            ) {
                                                Text("${dirtyItems.size}")
                                            }
                                        }
                                    }) {
                                        Icon(Icons.Default.LocalLaundryService, contentDescription = "Laundry")
                                    }
                                },
                                label = { Text("Laundry") }
                            )
                            NavigationBarItem(
                                selected = currentTab == FitlyTab.CALENDAR,
                                onClick = { navigateTo(FitlyTab.CALENDAR) },
                                icon = { Icon(Icons.Default.CalendarMonth, contentDescription = "Calendar") },
                                label = { Text("Calendar") }
                            )
                            NavigationBarItem(
                                selected = currentTab == FitlyTab.TRIPS,
                                onClick = { navigateTo(FitlyTab.TRIPS) },
                                icon = { Icon(Icons.Default.Luggage, contentDescription = "Trips") },
                                label = { Text("Trips") }
                            )
                        }
                    }
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                    ) {
                        AnimatedContent(
                            targetState = currentTab,
                            transitionSpec = {
                                val isForward = targetState.ordinal > initialState.ordinal
                                val enter = (if (isForward) slideInHorizontally(animationSpec = tween(AppConstants.TRANSITION_DURATION_ENTER_MS, easing = FastOutSlowInEasing)) { it / AppConstants.TRANSITION_SLIDE_DIVISOR } else slideInHorizontally(animationSpec = tween(AppConstants.TRANSITION_DURATION_ENTER_MS, easing = FastOutSlowInEasing)) { -it / AppConstants.TRANSITION_SLIDE_DIVISOR }) + fadeIn(animationSpec = tween(AppConstants.TRANSITION_DURATION_ENTER_MS))
                                val exit = (if (isForward) slideOutHorizontally(animationSpec = tween(AppConstants.TRANSITION_DURATION_EXIT_MS, easing = FastOutSlowInEasing)) { -it / AppConstants.TRANSITION_SLIDE_DIVISOR } else slideOutHorizontally(animationSpec = tween(AppConstants.TRANSITION_DURATION_EXIT_MS, easing = FastOutSlowInEasing)) { it / AppConstants.TRANSITION_SLIDE_DIVISOR }) + fadeOut(animationSpec = tween(AppConstants.TRANSITION_DURATION_EXIT_MS))
                                enter togetherWith exit
                            },
                            label = "TabTransition"
                        ) { tab ->
                            when (tab) {
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
