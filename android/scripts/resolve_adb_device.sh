#!/bin/bash
# Resolves the active target ADB device serial.
# Usage:
#   source "$(dirname "${BASH_SOURCE[0]}")/resolve_adb_device.sh" [DEVICE_PARAM]
# Sets $DEVICE_SERIAL and $ADB_CMD ("adb -s $DEVICE_SERIAL")

DEVICE_PARAM="$1"
if [ -z "$DEVICE_PARAM" ]; then
    DEVICE_PARAM="${DEVICE:-$ANDROID_SERIAL}"
fi

STATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.gradle/run_on_device_state"
mkdir -p "$STATE_DIR"
LAST_DEVICE_FILE="$STATE_DIR/last_device"

if ! command -v adb >/dev/null 2>&1; then
    echo "❌ adb not found. Make sure Android platform-tools are installed and in PATH." >&2
    return 1 2>/dev/null || exit 1
fi

resolve_device() {
    # 1. If explicit parameter provided, connect if IP:port
    if [ -n "$DEVICE_PARAM" ]; then
        if [[ "$DEVICE_PARAM" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+$ ]]; then
            adb connect "$DEVICE_PARAM" >/dev/null 2>&1 || true
        fi
        DEVICE_SERIAL="$DEVICE_PARAM"
        echo "$DEVICE_SERIAL" > "$LAST_DEVICE_FILE"
        ADB_CMD="adb -s $DEVICE_SERIAL"
        return 0
    fi

    # 2. Get list of attached online devices
    local attached_devices
    attached_devices=($(adb devices | awk '$2=="device" {print $1}'))
    local count=${#attached_devices[@]}

    if [ "$count" -eq 1 ]; then
        DEVICE_SERIAL="${attached_devices[0]}"
        echo "$DEVICE_SERIAL" > "$LAST_DEVICE_FILE"
        ADB_CMD="adb -s $DEVICE_SERIAL"
        return 0
    fi

    if [ "$count" -gt 1 ]; then
        # Check if last_device is still connected
        if [ -f "$LAST_DEVICE_FILE" ]; then
            local last_dev
            last_dev="$(cat "$LAST_DEVICE_FILE")"
            for dev in "${attached_devices[@]}"; do
                if [ "$dev" = "$last_dev" ]; then
                    DEVICE_SERIAL="$last_dev"
                    ADB_CMD="adb -s $DEVICE_SERIAL"
                    return 0
                fi
            done
        fi
        # Default to first connected device
        DEVICE_SERIAL="${attached_devices[0]}"
        echo "$DEVICE_SERIAL" > "$LAST_DEVICE_FILE"
        ADB_CMD="adb -s $DEVICE_SERIAL"
        return 0
    fi

    # 3. No device connected. Try reconnecting to last known device if it was wireless IP:PORT
    if [ -f "$LAST_DEVICE_FILE" ]; then
        local cached_dev
        cached_dev="$(cat "$LAST_DEVICE_FILE")"
        if [[ "$cached_dev" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+$ ]]; then
            echo "📡 Attempting auto-reconnect to previous device ($cached_dev)..." >&2
            if adb connect "$cached_dev" 2>&1 | grep -q "connected"; then
                DEVICE_SERIAL="$cached_dev"
                ADB_CMD="adb -s $DEVICE_SERIAL"
                return 0
            fi
        fi
    fi

    # 4. Check Tailscale for known Android devices
    if command -v tailscale >/dev/null 2>&1; then
        local ts_ip
        ts_ip="$(tailscale status 2>/dev/null | grep -iE 'xiaomi|phone|android' | awk '{print $1}' | head -n 1)"
        if [ -n "$ts_ip" ]; then
            echo "🔍 Discovered Tailscale Android node: $ts_ip" >&2
            echo "   Connect using: adb connect $ts_ip:<WIRELESS_ADB_PORT>" >&2
        fi
    fi

    echo "❌ No Android device detected via ADB." >&2
    echo "💡 Connect your device or run: make run DEVICE=<IP>:<PORT>" >&2
    return 1
}

resolve_device || return 1 2>/dev/null || exit 1
