package com.fitly.app.presentation.util

import java.text.NumberFormat
import java.util.Locale

object FormatUtils {

    /**
     * Formats an amount in Indonesian Rupiah without fractional cents (e.g., "Rp 130.000").
     */
    fun formatCurrency(amount: Double): String {
        val formatter = NumberFormat.getNumberInstance(Locale.forLanguageTag("id-ID"))
        return "Rp " + formatter.format(amount.toLong())
    }

    /**
     * Formats currency in compact form (e.g. "Rp 130k", "Rp 1.5M").
     */
    fun formatCurrencyShort(amount: Double): String {
        return if (amount >= 1_000_000) {
            String.format(Locale.US, "Rp %.1fM", amount / 1_000_000.0)
        } else if (amount >= 1_000) {
            String.format(Locale.US, "Rp %.0fk", amount / 1_000.0)
        } else {
            String.format(Locale.US, "Rp %.0f", amount)
        }
    }
}
