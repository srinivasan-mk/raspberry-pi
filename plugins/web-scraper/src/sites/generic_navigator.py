import sys
from typing import Dict, Any, List
from playwright.async_api import Page

try:
    from core.interactive import request_user_challenge, request_user_otp
    from sites.base import BaseSiteScraper
except ImportError:
    from ..core.interactive import request_user_challenge, request_user_otp
    from .base import BaseSiteScraper

class GenericNavigator(BaseSiteScraper):
    """
    Executes a declarative list of browser actions from the command payload.
    Supports form filling, button clicks, page navigation, interactive OTPs, and element extraction.
    """

    async def execute(self, page: Page, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = payload.get("url") or payload.get("options", {}).get("url")
        steps: List[Dict[str, Any]] = payload.get("steps") or payload.get("options", {}).get("steps", [])

        if url:
            sys.stderr.write(f"[GenericNavigator] Navigating to: {url}\n")
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)

        extracted_data: Dict[str, Any] = {}

        for idx, step in enumerate(steps):
            action = step.get("action", "").lower()
            selector = step.get("selector")
            value = step.get("value")
            field = step.get("field", f"field_{idx}")

            sys.stderr.write(f"[GenericNavigator] Step {idx + 1}/{len(steps)}: {action}\n")

            if action == "goto":
                await page.goto(value or step.get("url"), timeout=45000)

            elif action == "click":
                await page.wait_for_selector(selector, timeout=15000)
                await page.click(selector)

            elif action == "fill":
                await page.wait_for_selector(selector, timeout=15000)
                await page.fill(selector, str(value or ""))

            elif action == "otp_challenge" or action == "otp":
                # Interactive challenge trigger
                msg = step.get("message", "Please enter the verification OTP")
                timeout = step.get("timeoutSeconds", 120)
                otp_code = request_user_otp(message=msg, timeout_seconds=timeout)
                if selector:
                    await page.wait_for_selector(selector, timeout=15000)
                    await page.fill(selector, otp_code)
                extracted_data["otpProvided"] = True

            elif action == "extract_text" or action == "extract":
                if selector:
                    await page.wait_for_selector(selector, timeout=15000)
                    text = await page.inner_text(selector)
                    extracted_data[field] = text.strip()

            elif action == "extract_attribute":
                attr = step.get("attribute", "href")
                if selector:
                    val = await page.get_attribute(selector, attr)
                    extracted_data[field] = val

            elif action == "wait":
                delay_ms = step.get("ms", 1000)
                await page.wait_for_timeout(delay_ms)

        extracted_data["status"] = "COMPLETED"
        return extracted_data
