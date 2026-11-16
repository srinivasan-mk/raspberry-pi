import Paho from 'paho-mqtt';

export interface BrokerConfig {
  host: string;
  port: number;
  path: string;
  username: string;
  password: string;
  useSSL: boolean;
}

export const DEFAULT_BROKER_CONFIG: BrokerConfig = {
  host: 'your-cluster-id.s1.eu.hivemq.cloud',
  port: 8884, // Standard WSS port on HiveMQ Cloud
  path: '/mqtt',
  username: 'web_client',
  password: '',
  useSSL: true,
};

type MessageCallback = (topic: string, payload: any) => void;

class MqttService {
  private client: Paho.Client | null = null;
  private isConnected = false;
  private listeners: Set<MessageCallback> = new Set();
  private config: BrokerConfig = DEFAULT_BROKER_CONFIG;

  configure(cfg: Partial<BrokerConfig>) {
    this.config = { ...this.config, ...cfg };
  }

  getConfig(): BrokerConfig {
    return { ...this.config };
  }

  connect(onSuccess?: () => void, onFailure?: (err: any) => void) {
    if (this.isConnected && this.client) {
      onSuccess?.();
      return;
    }

    const clientId = `pi-ui-${Math.random().toString(16).substring(2, 10)}`;
    const client = new Paho.Client(
      this.config.host,
      Number(this.config.port),
      this.config.path,
      clientId
    );

    client.onConnectionLost = (responseObject) => {
      this.isConnected = false;
      console.warn('[MQTT] Connection lost:', responseObject.errorMessage);
    };

    client.onMessageArrived = (message) => {
      const topic = message.destinationName;
      let parsedPayload: any = null;
      try {
        parsedPayload = JSON.parse(message.payloadString);
      } catch {
        parsedPayload = message.payloadString;
      }

      this.listeners.forEach((callback) => callback(topic, parsedPayload));
    };

    const connectOptions: Paho.ConnectionOptions = {
      useSSL: this.config.useSSL,
      timeout: 10,
      keepAliveInterval: 30,
      cleanSession: true,
      onSuccess: () => {
        this.isConnected = true;
        this.client = client;
        console.log('[MQTT] Connected to HiveMQ Cloud via WebSockets!');

        // Subscribe to relevant topics
        client.subscribe('pi/telemetry/health', { qos: 0 });
        client.subscribe('pi/events/+/result', { qos: 1 });
        client.subscribe('pi/interactive/+/prompt', { qos: 1 });

        onSuccess?.();
      },
      onFailure: (err) => {
        this.isConnected = false;
        console.error('[MQTT] Connection failed:', err);
        onFailure?.(err);
      },
    };

    if (this.config.username) {
      connectOptions.userName = this.config.username;
    }
    if (this.config.password) {
      connectOptions.password = this.config.password;
    }

    client.connect(connectOptions);
  }

  disconnect() {
    if (this.client && this.isConnected) {
      this.client.disconnect();
      this.isConnected = false;
      this.client = null;
    }
  }

  subscribe(callback: MessageCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  publish(topic: string, payload: any, qos: 0 | 1 | 2 = 1) {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client is not connected');
    }
    const message = new Paho.Message(JSON.stringify(payload));
    message.destinationName = topic;
    message.qos = qos;
    this.client.send(message);
    console.log(`[MQTT] Published to ${topic}:`, payload);
  }

  publishCommand(pluginId: string, action: string, payload: Record<string, any>) {
    const topic = `pi/commands/${pluginId}/${action}`;
    const envelope = {
      messageId: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      correlationId: `corr_${Date.now()}`,
      timestamp: Math.floor(Date.now() / 1000),
      pluginId,
      action,
      payload,
    };
    this.publish(topic, envelope, 1);
  }

  sendInteractiveResponse(sessionId: string, code: string) {
    const topic = `pi/interactive/${sessionId}/response`;
    const responsePayload = {
      sessionId,
      response: {
        code,
        confirmed: true,
      },
      timestamp: Math.floor(Date.now() / 1000),
    };
    this.publish(topic, responsePayload, 1);
  }

  getConnected(): boolean {
    return this.isConnected;
  }
}

export const mqttService = new MqttService();
