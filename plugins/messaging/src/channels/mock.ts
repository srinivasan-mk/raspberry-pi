export interface MockResult {
  messageId: string;
  channel: string;
  recipient: string;
  content: string;
  delivered: boolean;
  timestamp: number;
}

export class MockChannel {
  async send(channel: string, recipient: string, content: string): Promise<MockResult> {
    console.error(`[MockChannel] Simulated delivery: [${channel}] to '${recipient}': "${content}"`);
    return {
      messageId: `mock_${Date.now()}`,
      channel,
      recipient,
      content,
      delivered: true,
      timestamp: Date.now(),
    };
  }
}
