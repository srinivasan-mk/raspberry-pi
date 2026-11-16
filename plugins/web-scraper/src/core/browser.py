import os
import sys
from typing import Optional
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

# Performance and memory optimization flags for Raspberry Pi 4B / Raspbian Lite
RPI_CHROMIUM_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--single-process",
    "--no-zygote",
    "--disable-accelerated-2d-canvas",
    "--disable-background-networking",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-breakpad",
    "--disable-component-extensions-with-background-pages",
    "--disable-extensions",
    "--disable-features=TranslateUI,BlinkGenPropertyTrees",
    "--disable-ipc-flooding-protection",
    "--disable-renderer-backgrounding",
    "--enable-features=NetworkService,NetworkServiceInProcess",
    "--force-color-profile=srgb",
    "--mute-audio",
]

class BrowserManager:
    """Manages lightweight headless browser contexts optimized for low-RAM devices."""

    def __init__(self, headless: bool = True):
        self.headless = headless
        self._playwright = None
        self._browser: Optional[Browser] = None

    async def __aenter__(self):
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=self.headless,
            args=RPI_CHROMIUM_ARGS,
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    async def new_page(self, block_images: bool = False) -> Page:
        """Create an isolated, lightweight page context."""
        context: BrowserContext = await self._browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        )

        if block_images:
            # Block heavy media assets to save Pi memory and network bandwidth
            await context.route(
                "**/*.{png,jpg,jpeg,svg,gif,webp,woff,woff2,ttf,mp4}",
                lambda route: route.abort()
            )

        return await context.new_page()
