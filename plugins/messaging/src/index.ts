import readline from 'node:readline';
import { TelegramChannel } from './channels/telegram.js';
import { WhatsAppChannel } from './channels/whatsapp.js';
import { SmsGatewayChannel } from './channels/sms_gateway.js';
import { MockChannel } from './channels/mock.js';

interface CommandEnvelope {
  messageId: string;
  correlationId?: string;
  action: string;
  pluginId: string;
  payload: {
    channel: 'TELEGRAM' | 'WHATSAPP' | 'SMS' | 'MOCK';
    recipient: string;
    content: string;
    attachments?: any[];
    options?: Record<string, any>;
  };
}

async function handlePairing() {
  console.log('==> Starting WhatsApp Web Pairing Session (Scan QR code)...');
  try {
    const baileys = await import('@whiskeysockets/baileys');
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const { useMultiFileAuthState } = baileys;
    const qrcode = (await import('qrcode-terminal')).default;
    const pino = (await import('pino')).default;

    const sessionDir = process.env.WHATSAPP_SESSION_DIR || './sessions/whatsapp';
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
      const { qr, connection } = update;
      if (qr) {
        console.log('\nScan this QR code with your WhatsApp (Linked Devices):');
        qrcode.generate(qr, { small: true });
      }
      if (connection === 'open') {
        console.log('✅ WhatsApp paired successfully! Credentials saved.');
        process.exit(0);
      }
    });
  } catch (err: any) {
    console.error('Error during pairing:', err.message);
    process.exit(1);
  }
}

async function run() {
  // Check if CLI pairing mode is requested
  if (process.argv.includes('--pair')) {
    await handlePairing();
    return;
  }

  const telegram = new TelegramChannel();
  const whatsapp = new WhatsAppChannel();
  const sms = new SmsGatewayChannel();
  const mock = new MockChannel();

  // Read JSON from stdin
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  let rawInput = '';
  for await (const line of rl) {
    rawInput += line;
    if (line.trim().endsWith('}')) break;
  }

  const startTime = Date.now();

  if (!rawInput.trim()) {
    console.error('[Messaging] No input provided on stdin.');
    process.exit(1);
  }

  let cmd: CommandEnvelope;
  try {
    cmd = JSON.parse(rawInput.trim());
  } catch (err: any) {
    console.error('[Messaging] Failed to parse JSON command:', err.message);
    process.exit(1);
  }

  const payload = cmd.payload || ({} as any);
  const channel = (payload.channel || 'TELEGRAM').toUpperCase();
  const recipient = payload.recipient;
  const content = payload.content;

  if (!recipient || !content) {
    const errorRes = {
      status: 'FAILED',
      durationMs: Date.now() - startTime,
      error: {
        code: 'INVALID_PARAMETERS',
        message: 'Both "recipient" and "content" are required in payload',
      },
    };
    console.log(JSON.stringify(errorRes));
    process.exit(1);
  }

  console.error(`[Messaging] Dispatching via channel='${channel}' to '${recipient}'...`);

  try {
    let resultData: Record<string, any>;

    switch (channel) {
      case 'TELEGRAM':
        resultData = await telegram.send(recipient, content, payload.options);
        break;

      case 'WHATSAPP':
        resultData = await whatsapp.send(recipient, content);
        break;

      case 'SMS':
        resultData = await sms.send(recipient, content);
        break;

      case 'MOCK':
      default:
        resultData = await mock.send(channel, recipient, content);
        break;
    }

    const durationMs = Date.now() - startTime;
    const responsePayload = {
      status: 'SUCCESS',
      durationMs,
      data: {
        channel,
        recipient,
        delivered: true,
        details: resultData,
      },
    };

    // Write final JSON output to stdout
    console.log(JSON.stringify(responsePayload));
    console.error(`[Messaging] Message dispatched successfully in ${durationMs}ms.`);
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const errorPayload = {
      status: 'FAILED',
      durationMs,
      error: {
        code: 'DISPATCH_ERROR',
        message: err.message,
      },
    };
    console.log(JSON.stringify(errorPayload));
    console.error(`[Messaging] Failed: ${err.message}`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('[Messaging] Fatal error:', err);
  process.exit(1);
});
