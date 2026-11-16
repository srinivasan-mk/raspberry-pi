# Zero-Cost Multi-Channel Messaging Plugin (`messaging`)

Unified notification and alert dispatcher for the Raspberry Pi 4B ecosystem. Supports **Telegram**, **free WhatsApp Web**, and **free SMS** without incurring third-party API subscription costs.

---

## Channels & Setup

### 1. Telegram (Official Free Bot API)
* **Cost**: 100% Free forever (unlimited messages).
* **Setup**:
  1. Open Telegram and search for `@BotFather`.
  2. Send `/newbot`, choose a name and username, and copy the **HTTP API Token**.
  3. Get your Chat ID by messaging `@userinfobot`.
  4. Set environment variable: `TELEGRAM_BOT_TOKEN="your_token_here"`.
* **Payload**:
  ```json
  {
    "channel": "TELEGRAM",
    "recipient": "YOUR_CHAT_ID",
    "content": "Jio AirFiber Alert: 85% data quota consumed!"
  }
  ```

---

### 2. WhatsApp (Free WhatsApp Web via Baileys)
* **Cost**: 100% Free (no Meta Business account or per-message fees).
* **Setup**:
  1. Run the interactive pairing command once:
     ```bash
     cd plugins/messaging
     npm install
     npm run build
     node dist/index.js --pair
     ```
  2. A QR code will display in your terminal.
  3. Open WhatsApp on your phone ➔ **Settings ➔ Linked Devices ➔ Link a Device** ➔ Scan the terminal QR code.
  4. Credentials are encrypted and saved in `sessions/whatsapp/`. Future messages send instantly!
* **Payload**:
  ```json
  {
    "channel": "WHATSAPP",
    "recipient": "919876543210",
    "content": "Pi Temperature Alert: 68°C. Throttling active."
  }
  ```

---

### 3. SMS (Zero-Cost via Android Gateway or GSM Modem)
* **Cost**: 100% Free (uses your phone carrier's daily free SMS allowance, e.g., 100 free SMS/day on Indian SIMs).
* **Setup**:
  1. Install the open-source **Android SMS Gateway** app on any spare Android phone on your home Wi-Fi.
  2. Open the app and turn on the server (displays IP like `http://192.168.1.50:8080`).
  3. Set `SMS_GATEWAY_URL="http://192.168.1.50:8080"`.
* **Payload**:
  ```json
  {
    "channel": "SMS",
    "recipient": "+919876543210",
    "content": "Emergency: Raspberry Pi offline!"
  }
  ```

---

## Standalone Execution

```bash
# Direct JSON invocation via stdin
echo '{"action":"send","payload":{"channel":"MOCK","recipient":"test","content":"Hello Pi"}}' | node dist/index.js
```

## Docker Container

```bash
docker build -t pi-plugin-messaging:latest .
docker run --rm -i -v $(pwd)/sessions:/app/sessions pi-plugin-messaging:latest < command.json
```
