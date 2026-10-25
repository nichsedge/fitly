package com.fitly.app

import com.fitly.app.presentation.util.FormatUtils
import org.junit.Assert.assertEquals
import org.junit.Test

class FormatUtilsTest {

    @Test
    fun testIndonesianCurrencyFormattingWithoutDecimals() {
        // Must format as standard Indonesian Rupiah without fractional cents
        val formatted = FormatUtils.formatCurrency(130000.0)
        assertEquals("Rp 130.000", formatted)

        val formattedMillion = FormatUtils.formatCurrency(1500000.0)
        assertEquals("Rp 1.500.000", formattedMillion)
    }

    @Test
    fun testShortCurrencyFormatting() {
        assertEquals("Rp 1.5M", FormatUtils.formatCurrencyShort(1500000.0))
        assertEquals("Rp 130k", FormatUtils.formatCurrencyShort(130000.0))
        assertEquals("Rp 500", FormatUtils.formatCurrencyShort(500.0))
    }
}
