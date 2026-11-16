# Web Scraper & Automation Plugin (`web-scraper`)

Headless browser automation plugin for the Raspberry Pi 4B ecosystem, powered by **Playwright**.

## Capabilities
1. **Interactive OTP Challenge-Response**:
   * Automatically pauses browser session when an OTP screen is encountered.
   * Emits an `INTERACTIVE_PROMPT` event intercepted by the Go Daemon and forwarded over MQTT to your phone/Telegram.
   * Resumes seamlessly once the OTP is received.
2. **Low-Memory Optimization for Raspberry Pi 4B**:
   * Runs Chromium with `--single-process`, `--no-zygote`, `--disable-gpu`, and `--disable-dev-shm-usage`.
   * Automatically blocks heavy media (images, fonts, videos) to minimize RAM and network bandwidth.
3. **Pluggable Targets**:
   * `jio-airfiber`: Self-care portal usage and local router gateway reader (`192.168.29.1`).
   * `generic`: Declarative JSON-driven web automation steps (click, fill, wait, extract).
   * `mock-test`: Offline self-contained test target for validating OTP flows without internet.

---

## Standalone Execution

### Local (Python)
```bash
pip install -r requirements.txt
playwright install chromium
python src/main.py < command.json
```

### Docker
```bash
docker build -t pi-plugin-web-scraper:latest .
docker run --rm -i pi-plugin-web-scraper:latest < command.json
```

---

## Interactive OTP Protocol

1. Plugin emits to `stdout`:
```json
{
  "type": "INTERACTIVE_PROMPT",
  "sessionId": "sess_otp_12345",
  "promptType": "OTP",
  "message": "Please enter the Jio AirFiber OTP",
  "timeoutSeconds": 120
}
```
2. Go daemon publishes this to MQTT topic: `pi/interactive/sess_otp_12345/prompt`.
3. User responds on topic `pi/interactive/sess_otp_12345/response` with `{"code": "543210"}`.
4. Go daemon feeds `{"code": "543210"}\n` into plugin's `stdin`.
5. Plugin fills OTP on the webpage and completes data extraction.
