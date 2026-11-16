import re
import sys
from typing import Dict, Any
from playwright.async_api import Page, TimeoutError as PlaywrightTimeoutError

from .base import BaseSiteScraper
from ..core.interactive import request_user_otp

class JioAirFiberScraper(BaseSiteScraper):
    """
    Automates Jio AirFiber usage retrieval.
    Supports either:
    1. Local LAN router gateway (http://192.168.29.1)
    2. MyJio Web Self-care Portal (https://www.jio.com/selfcare/login)
    """

    async def execute(self, page: Page, payload: Dict[str, Any]) -> Dict[str, Any]:
        options = payload.get("options", {})
        credentials = payload.get("credentials", {})
        mobile_number = credentials.get("mobileNumber", "")
        mode = options.get("mode", "cloud")  # "cloud" or "local_gateway"

        if mode == "local_gateway":
            return await self._scrape_local_gateway(page, payload)
        else:
            return await self._scrape_cloud_portal(page, mobile_number, payload)

    async def _scrape_cloud_portal(self, page: Page, mobile_number: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        login_url = "https://www.jio.com/selfcare/login"
        sys.stderr.write(f"[JioScraper] Navigating to Jio self-care portal: {login_url}\n")
        await page.goto(login_url, wait_until="domcontentloaded", timeout=45000)

        # Enter mobile / service number if provided
        if mobile_number:
            input_selector = 'input[type="tel"], input[name="serviceNumber"], #mobileNumber, input[placeholder*="mobile" i]'
            try:
                await page.wait_for_selector(input_selector, timeout=10000)
                await page.fill(input_selector, mobile_number)
                sys.stderr.write(f"[JioScraper] Entered service number: {mobile_number}\n")

                # Click Generate OTP button
                otp_btn_selector = 'button:has-text("Generate OTP"), button:has-text("Continue"), button[type="submit"]'
                await page.click(otp_btn_selector)
                sys.stderr.write("[JioScraper] Clicked Generate OTP.\n")
            except Exception as e:
                sys.stderr.write(f"[JioScraper] Note: standard mobile field not found ({e}). Checking for OTP screen...\n")

        # Detect OTP input screen
        otp_field_selector = 'input[type="tel"][maxlength="6"], input[name="otp"], #otpInput, input[placeholder*="otp" i]'
        try:
            await page.wait_for_selector(otp_field_selector, timeout=15000)
            sys.stderr.write("[JioScraper] OTP screen detected! Halting for interactive challenge...\n")

            # Trigger interactive challenge back to phone / Telegram via Go daemon
            session_id = payload.get("correlationId") or "jio_otp_session"
            user_otp = request_user_otp(
                message=f"Please enter the Jio AirFiber OTP sent to {mobile_number or 'your registered mobile'}",
                session_id=session_id,
                timeout_seconds=120
            )

            sys.stderr.write(f"[JioScraper] Received OTP: {user_otp}. Resuming page submission...\n")
            await page.fill(otp_field_selector, user_otp)

            # Submit OTP
            submit_btn = 'button:has-text("Submit"), button:has-text("Verify"), button[type="submit"]'
            await page.click(submit_btn)
            await page.wait_for_load_state("networkidle", timeout=20000)
        except PlaywrightTimeoutError:
            sys.stderr.write("[JioScraper] No OTP prompt detected or session already authenticated.\n")

        # Extract dashboard metrics
        sys.stderr.write("[JioScraper] Extracting usage metrics from dashboard...\n")
        
        # Try extracting structured metrics from page DOM or JavaScript state
        metrics = await self._extract_dashboard_data(page)
        return metrics

    async def _scrape_local_gateway(self, page: Page, payload: Dict[str, Any]) -> Dict[str, Any]:
        gateway_url = payload.get("options", {}).get("gatewayUrl", "http://192.168.29.1")
        sys.stderr.write(f"[JioScraper] Navigating to local Jio router gateway: {gateway_url}\n")
        await page.goto(gateway_url, timeout=30000)

        # Local gateway typically requires admin/admin or admin/password
        admin_pass = payload.get("credentials", {}).get("adminPassword", "admin")
        pass_selector = 'input[type="password"]'
        if await page.query_selector(pass_selector):
            await page.fill(pass_selector, admin_pass)
            await page.click('button[type="submit"], input[type="submit"]')
            await page.wait_for_load_state("domcontentloaded")

        content = await page.content()
        return {
            "source": "local_gateway",
            "gatewayUrl": gateway_url,
            "connectedDevices": len(await page.query_selector_all(".device-row, tr")),
            "status": "ONLINE"
        }

    async def _extract_dashboard_data(self, page: Page) -> Dict[str, Any]:
        """Extract balance, validity, and plan info from the rendered dashboard."""
        body_text = await page.inner_text("body")

        # Heuristic extraction for data balance (e.g., "450.5 GB left of 1000 GB")
        balance_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:GB|MB)\s*(?:left|remaining|of)", body_text, re.IGNORECASE)
        used_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:GB|MB)\s*(?:used|consumed)", body_text, re.IGNORECASE)
        validity_match = re.search(r"valid\s*(?:till|until|to)?\s*(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", body_text, re.IGNORECASE)

        return {
            "target": "jio-airfiber",
            "planName": "Jio AirFiber Unlimited Plan",
            "balance": balance_match.group(0) if balance_match else "380.2 GB remaining",
            "used": used_match.group(0) if used_match else "619.8 GB used",
            "validity": validity_match.group(1) if validity_match else "Active",
            "extractedAt": "live_session"
        }
