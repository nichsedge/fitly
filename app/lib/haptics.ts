/**
 * Light haptic feedback helper for Android devices supporting navigator.vibrate
 */
export function triggerHaptic(duration = 12) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(duration);
    } catch {
      // Ignore if vibration is disabled or unsupported
    }
  }
}
