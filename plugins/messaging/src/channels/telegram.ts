export interface TelegramMessageOptions {
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  disableNotification?: boolean;
  replyMarkup?: Record<string, unknown>;
}

export interface TelegramResult {
  messageId: number;
  chatId: string;
  sentAt: number;
}

export class TelegramChannel {
  private botToken: string;

  constructor(botToken?: string) {
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || '';
    if (!this.botToken) {
      console.error('[Telegram] Warning: TELEGRAM_BOT_TOKEN environment variable is not set.');
    }
  }

  async send(
    recipient: string,
    content: string,
    options?: TelegramMessageOptions
  ): Promise<TelegramResult> {
    if (!this.botToken) {
      throw new Error('Telegram Bot Token is missing. Set TELEGRAM_BOT_TOKEN.');
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const body: Record<string, unknown> = {
      chat_id: recipient,
      text: content,
      parse_mode: options?.parseMode || 'HTML',
      disable_notification: options?.disableNotification || false,
    };

    if (options?.replyMarkup) {
      body.reply_markup = options.replyMarkup;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Telegram API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as { ok: boolean; result: { message_id: number; chat: { id: number } } };
    if (!data.ok) {
      throw new Error(`Telegram API responded ok=false: ${JSON.stringify(data)}`);
    }

    return {
      messageId: data.result.message_id,
      chatId: String(data.result.chat.id),
      sentAt: Date.now(),
    };
  }
}
