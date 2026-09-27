.PHONY: help run build release clean

DEVICE ?=

help:
	@echo "Fitly Android Makefile"
	@echo "Usage: make [target] [DEVICE=<serial_or_ip_port>]"
	@echo ""
	@echo "Device Targets:"
	@echo "  run                Build, install, and run on connected Android device"
	@echo ""
	@echo "Build Targets:"
	@echo "  build              Build debug APK"
	@echo "  release            Build optimized minified APK"
	@echo "  clean              Clean build artifacts"

run:
	bash scripts/run_on_device.sh $(DEVICE)

build:
	./gradlew assembleDebug

release:
	./gradlew assembleRelease

clean:
	./gradlew clean
