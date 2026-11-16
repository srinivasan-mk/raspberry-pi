import sys
from typing import Dict, Any
from playwright.async_api import Page

from .base import BaseSiteScraper
from ..core.interactive import request_user_otp

MOCK_HTML_PORTAL = """
<!DOCTYPE html>
<html>
<head>
  <title>Mock Fiber Portal</title>
  <style>
    body { font-family: sans-serif; padding: 30px; }
    .card { max-width: 400px; margin: auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px; }
    .hidden { display: none; }
    input, button { width: 100%; padding: 10px; margin: 8px 0; box-sizing: border-box; }
    button { background: #0070f3; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .metric { padding: 10px; background: #f0f7ff; margin: 8px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="card" id="login-box">
    <h2>Telecom Portal Login</h2>
    <input id="mobile-input" type="tel" placeholder="Mobile Number" value="9876543210" />
    <button id="send-otp-btn" onclick="showOtp()">Generate OTP</button>
  </div>

  <div class="card hidden" id="otp-box">
    <h2>Verify OTP</h2>
    <p>OTP sent to your registered mobile.</p>
    <input id="otp-input" type="text" maxlength="6" placeholder="Enter 6-digit OTP" />
    <button id="verify-otp-btn" onclick="verifyOtp()">Verify & Continue</button>
  </div>

  <div class="card hidden" id="dashboard">
    <h2>Account Dashboard</h2>
    <div class="metric" id="plan-name">Plan: SuperFiber 100 Mbps Unlimited</div>
    <div class="metric" id="data-balance">Balance: 540 GB left of 1000 GB</div>
    <div class="metric" id="validity">Valid Till: 28-Nov-2026 (12 Days Left)</div>
  </div>

  <script>
    function showOtp() {
      document.getElementById('login-box').classList.add('hidden');
      document.getElementById('otp-box').classList.remove('hidden');
    }
    function verifyOtp() {
      const code = document.getElementById('otp-input').value;
      if (code && code.length >= 4) {
        document.getElementById('otp-box').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
      } else {
        alert('Invalid OTP');
      }
    }
  </script>
</body>
</html>
"""

class MockTestScraper(BaseSiteScraper):
    """
    Offline self-contained test target.
    Simulates a login form, prompts for interactive OTP, and renders a usage dashboard.
    """

    async def execute(self, page: Page, payload: Dict[str, Any]) -> Dict[str, Any]:
        sys.stderr.write("[MockScraper] Setting up mock in-memory web portal...\n")
        await page.set_content(MOCK_HTML_PORTAL)

        # 1. Fill mobile number and click Generate OTP
        sys.stderr.write("[MockScraper] Step 1: Submitting login credentials...\n")
        await page.fill("#mobile-input", "9876543210")
        await page.click("#send-otp-btn")

        # 2. Wait for OTP form to become visible
        await page.wait_for_selector("#otp-input", state="visible", timeout=5000)
        sys.stderr.write("[MockScraper] Step 2: OTP screen detected! Requesting interactive OTP...\n")

        # 3. Trigger interactive challenge back to daemon / cloud bus
        session_id = payload.get("correlationId") or "mock_test_session"
        user_otp = request_user_otp(
            message="Enter OTP (Test: type 123456)",
            session_id=session_id,
            timeout_seconds=60
        )

        sys.stderr.write(f"[MockScraper] Step 3: Received user OTP: {user_otp}. Submitting to form...\n")
        await page.fill("#otp-input", user_otp)
        await page.click("#verify-otp-btn")

        # 4. Wait for dashboard to display
        await page.wait_for_selector("#dashboard", state="visible", timeout=5000)
        sys.stderr.write("[MockScraper] Step 4: Login verified! Extracting dashboard metrics...\n")

        plan_name = await page.inner_text("#plan-name")
        data_balance = await page.inner_text("#data-balance")
        validity = await page.inner_text("#validity")

        return {
            "target": "mock-test",
            "status": "AUTHENTICATED",
            "plan": plan_name.replace("Plan: ", "").strip(),
            "dataBalance": data_balance.replace("Balance: ", "").strip(),
            "validity": validity.replace("Valid Till: ", "").strip(),
            "otpVerified": True
        }
