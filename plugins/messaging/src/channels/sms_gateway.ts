export interface SmsResult {
  messageId: string;
  recipient: string;
  gatewayType: 'ANDROID_GATEWAY' | 'TERMUX_API' | 'GSM_MODEM';
  sentAt: number;
}

export class SmsGatewayChannel {
  private gatewayUrl: string;
  private apiKey: string;

  constructor(gatewayUrl?: string, apiKey?: string) {
    this.gatewayUrl = gatewayUrl || process.env.SMS_GATEWAY_URL || 'http://192.168.1.50:8080';
    this.apiKey = apiKey || process.env.SMS_GATEWAY_KEY || '';
  }

  /**
   * Dispatches real SMS with zero commercial fees via an Android phone with an active SIM card
   * running the open-source Android SMS Gateway or Termux API.
   */
  async send(recipient: string, content: string): Promise<SmsResult> {
    const cleanNumber = recipient.replace(/[^\d+]/g, '');
    if (!cleanNumber) {
      throw new Error(`Invalid SMS phone number: '${recipient}'`);
    }

    console.error(`[SMS] Sending message to ${cleanNumber} via Android Gateway at ${this.gatewayUrl}...`);

    const endpoint = `${this.gatewayUrl.replace(/\/+$/, '')}/message`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phoneNumbers: [cleanNumber],
          message: content,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Android SMS Gateway returned error (${response.status}): ${errorBody}`);
      }

      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

      return {
        messageId: String(data.id || data.messageId || `sms_${Date.now()}`),
        recipient: cleanNumber,
        gatewayType: 'ANDROID_GATEWAY',
        sentAt: Date.now(),
      };
    } catch (err: any) {
      throw new Error(
        `Failed to reach Android SMS Gateway (${err.message}). Ensure the Android SMS Gateway app is running on your phone connected to local Wi-Fi!`
      );
    }
  }
}
