import asyncio
import json
import os
import sys
import time
from typing import Dict, Any

from core.browser import BrowserManager
from sites.jio_airfiber import JioAirFiberScraper
from sites.generic_navigator import GenericNavigator
from sites.mock_test import MockTestScraper

TARGET_REGISTRY = {
    "jio-airfiber": JioAirFiberScraper,
    "jio": JioAirFiberScraper,
    "mock-test": MockTestScraper,
    "mock": MockTestScraper,
    "generic": GenericNavigator,
}

async def run():
    # 1. Read CommandEnvelope JSON from stdin
    stdin_data = sys.stdin.readline()
    if not stdin_data or not stdin_data.strip():
        # Fallback if arguments or environment variables are provided
        raw_cmd = os.getenv("COMMAND_PAYLOAD", "{}")
        try:
            cmd = json.loads(raw_cmd)
        except Exception:
            cmd = {"action": "fetch-usage", "payload": {"target": "mock-test"}}
    else:
        cmd = json.loads(stdin_data.strip())

    action = cmd.get("action", "fetch-usage")
    payload: Dict[str, Any] = cmd.get("payload", {})
    target_name = payload.get("target", "jio-airfiber").lower()

    sys.stderr.write(f"[WebScraper] Starting action='{action}', target='{target_name}'...\n")
    start_time = time.time()

    # Determine site scraper
    scraper_cls = TARGET_REGISTRY.get(target_name, GenericNavigator)
    scraper = scraper_cls()

    # Launch browser and execute
    headless = os.getenv("HEADLESS", "true").lower() != "false"
    block_media = payload.get("options", {}).get("blockMedia", True)

    async with BrowserManager(headless=headless) as browser_mgr:
        page = await browser_mgr.new_page(block_images=block_media)
        try:
            result_data = await scraper.execute(page, payload)
            duration_ms = int((time.time() - start_time) * 1000)

            final_output = {
                "status": "SUCCESS",
                "durationMs": duration_ms,
                "data": result_data
            }
            # Output single line JSON to stdout
            sys.stdout.write(json.dumps(final_output) + "\n")
            sys.stdout.flush()
            sys.stderr.write(f"[WebScraper] Execution finished in {duration_ms}ms.\n")
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            error_output = {
                "status": "FAILED",
                "durationMs": duration_ms,
                "error": {
                    "code": "SCRAPER_EXECUTION_ERROR",
                    "message": str(e)
                }
            }
            sys.stdout.write(json.dumps(error_output) + "\n")
            sys.stdout.flush()
            sys.stderr.write(f"[WebScraper] ERROR: {e}\n")
            sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run())
