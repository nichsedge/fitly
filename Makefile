.PHONY: help status recommend audit export-style sync-pull sync-push run build release test clean

DEVICE ?=

help:
	@echo "Fitly Workstation Style Agent & Android Makefile"
	@echo "Usage: make [target] [DEVICE=<serial_or_ip_port>]"
	@echo ""
	@echo "Style Agent & CLI Targets:"
	@echo "  status             Display wardrobe asset valuation, CPW, and status"
	@echo "  recommend          Get AI outfit recommendation tailored to iERP events"
	@echo "  audit              Run wardrobe capsule audit and gap analysis"
	@echo "  export-style       Export Style Manifesto to digital-graveyard"
	@echo "  sync-pull          Pull latest database snapshot from Cloudflare R2"
	@echo "  sync-push          Push local database snapshot to Cloudflare R2"
	@echo ""
	@echo "Android Legacy Targets:"
	@echo "  run                Build, install, and run on connected Android device"
	@echo "  build              Build debug APK"
	@echo "  release            Build optimized minified APK"
	@echo "  test               Run local JVM unit tests"
	@echo "  clean              Clean build artifacts"

status:
	uv run scripts/fitly_agent.py status

recommend:
	uv run scripts/fitly_agent.py recommend

audit:
	uv run scripts/fitly_agent.py audit

export-style:
	uv run scripts/fitly_agent.py export-style

sync-pull:
	uv run scripts/fitly_agent.py sync pull

sync-push:
	uv run scripts/fitly_agent.py sync push

run:
	bash scripts/run_on_device.sh $(DEVICE)

build:
	./gradlew assembleDebug

release:
	./gradlew assembleRelease

test:
	./gradlew testDebugUnitTest

clean:
	./gradlew clean
