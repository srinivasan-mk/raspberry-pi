import path from 'node:path';
import fs from 'node:fs';

export interface WhatsAppResult {
  messageId: string;
  recipientJid: string;
  sentAt: number;
}

export class WhatsAppChannel {
  private sessionDir: string;

  constructor(sessionDir?: string) {
    this.sessionDir = sessionDir || process.env.WHATSAPP_SESSION_DIR || path.join(process.cwd(), 'sessions', 'whatsapp');
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  /**
   * Dispatches a message to a WhatsApp recipient using Baileys.
   * recipient can be a 10-12 digit phone number (e.g. "919876543210" or "+91 98765 43210")
   */
  async send(recipient: string, content: string): Promise<WhatsAppResult> {
    // Sanitize phone number to standard international WhatsApp JID
    const cleanNumber = recipient.replace(/\D/g, '');
    if (!cleanNumber) {
      throw new Error(`Invalid WhatsApp phone number: '${recipient}'`);
    }
    const jid = cleanNumber.includes('@s.whatsapp.net') ? cleanNumber : `${cleanNumber}@s.whatsapp.net`;

    try {
      // Dynamic import of Baileys so the plugin can still load if Baileys is in peer dependencies
      const baileys = await import('@whiskeysockets/baileys');
      const makeWASocket = baileys.default || baileys.makeWASocket;
      const { useMultiFileAuthState, DisconnectReason } = baileys;
      const pino = (await import('pino')).default;

      const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);

      // Check if session has active registration
      if (!state.creds?.registered) {
        throw new Error(
          `WhatsApp session not paired! Please run 'node dist/index.js --pair' to scan the QR code and pair your WhatsApp.`
        );
      }

      const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
      });

      sock.ev.on('creds.update', saveCreds);

      // Wait for socket open connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          sock.end(undefined);
          reject(new Error('WhatsApp connection timeout (15s)'));
        }, 15000);

        sock.ev.on('connection.update', (update) => {
          const { connection, lastDisconnect } = update;
          if (connection === 'open') {
            clearTimeout(timeout);
            resolve();
          } else if (connection === 'close') {
            const reason = (lastDisconnect?.error as any)?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
              clearTimeout(timeout);
              reject(new Error('WhatsApp logged out! Re-pairing required.'));
            }
          }
        });
      });

      // Send the text message
      const sentMsg = await sock.sendMessage(jid, { text: content });
      const msgId = sentMsg?.key?.id || `wa_${Date.now()}`;

      // Cleanly end socket connection to free memory
      sock.end(undefined);

      return {
        messageId: msgId,
        recipientJid: jid,
        sentAt: Date.now(),
      };
    } catch (err: any) {
      // If Baileys is not yet installed in local dev, provide helpful diagnostics
      if (err.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(
          `Baileys package not installed. Run 'npm install' inside plugins/messaging/`
        );
      }
      throw err;
    }
  }
}
