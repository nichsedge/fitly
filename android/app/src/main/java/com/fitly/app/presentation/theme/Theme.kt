package com.fitly.app.presentation.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF8B77FF),
    onPrimary = Color(0xFF1B153C),
    primaryContainer = Color(0xFF332A6B),
    onPrimaryContainer = Color(0xFFE4DFFF),
    secondary = Color(0xFF2DD4BF),
    onSecondary = Color(0xFF003731),
    secondaryContainer = Color(0xFF004F47),
    onSecondaryContainer = Color(0xFF73F7E3),
    tertiary = Color(0xFFFB7185),
    onTertiary = Color(0xFF4C0015),
    background = Color(0xFF0E1117),
    onBackground = Color(0xFFE3E6EE),
    surface = Color(0xFF151922),
    onSurface = Color(0xFFE3E6EE),
    surfaceVariant = Color(0xFF1F2432),
    onSurfaceVariant = Color(0xFF9CA3AF),
    outline = Color(0xFF374151),
    outlineVariant = Color(0xFF242B3B)
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF6352E8),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFEDE9FE),
    onPrimaryContainer = Color(0xFF2E2472),
    secondary = Color(0xFF0D9488),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFCCFBF1),
    onSecondaryContainer = Color(0xFF115E59),
    tertiary = Color(0xFFE11D48),
    onTertiary = Color.White,
    background = Color(0xFFF8FAFC),
    onBackground = Color(0xFF0F172A),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF0F172A),
    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = Color(0xFF64748B),
    outline = Color(0xFFCBD5E1),
    outlineVariant = Color(0xFFE2E8F0)
)

@Composable
fun FitlyTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}

