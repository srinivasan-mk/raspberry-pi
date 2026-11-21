/**
 * Shared Type Definitions for Raspberry Pi 4B Modular Ecosystem
 * Compatible with React Native, Node.js, and TypeScript clients.
 */

export interface CommandEnvelope<T = Record<string, unknown>> {
  messageId: string;
  correlationId?: string;
  timestamp: number;
  pluginId: string;
  action: string;
  timeoutSeconds?: number;
  payload: T;
}

export type PromptType = 'OTP' | 'CONFIRMATION' | 'INPUT' | 'CAPTCHA';

export interface InteractivePrompt {
  sessionId: string;
  correlationId?: string;
  pluginId: string;
  promptType: PromptType;
  message: string;
  timeoutSeconds: number;
  timestamp: number;
}

export interface InteractiveResponse {
  sessionId: string;
  correlationId?: string;
  response: {
    code: string;
    confirmed?: boolean;
    extra?: Record<string, unknown>;
  };
  timestamp: number;
}

export type ResultStatus = 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'CANCELLED';

export interface PluginResultEnvelope<T = Record<string, unknown>> {
  messageId: string;
  correlationId?: string;
  pluginId: string;
  action: string;
  status: ResultStatus;
  durationMs?: number;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  timestamp: number;
}

export type PiOnlineStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED';

export interface PiTelemetry {
  deviceId: string;
  hostname: string;
  status: PiOnlineStatus;
  uptimeSeconds?: number;
  cpuTempCelsius?: number;
  cpuUsagePercent?: number;
  throttleState?: string;
  memory?: {
    totalMb: number;
    usedMb: number;
    freeMb: number;
    usagePercent: number;
  };
  activePlugins?: string[];
  timestamp: number;
}

export type MessagingChannel = 'TELEGRAM' | 'WHATSAPP' | 'SMS';

export interface MessagingPayload {
  channel: MessagingChannel;
  recipient: string;
  content: string;
  attachments?: Array<{
    type: 'IMAGE' | 'DOCUMENT' | 'AUDIO';
    url: string;
    filename?: string;
  }>;
  options?: {
    replyMarkup?: Record<string, unknown>;
    priority?: 'LOW' | 'NORMAL' | 'HIGH';
  };
}

export type PiholeAction = 'status' | 'enable' | 'disable' | 'update-gravity';

export interface PiholeStatus {
  status: 'enabled' | 'disabled';
  domainsBeingBlocked: number;
  dnsQueriesToday: number;
  adsBlockedToday: number;
  adsPercentageToday: number;
  uniqueClients?: number;
  gravityLastUpdated?: number;
  timestamp: number;
}

// Standard MQTT Topics helper
export const MQTT_TOPICS = {
  command: (pluginId: string, action: string) => `pi/commands/${pluginId}/${action}`,
  commandWildcard: 'pi/commands/#',
  status: (pluginId: string) => `pi/events/${pluginId}/status`,
  result: (pluginId: string) => `pi/events/${pluginId}/result`,
  resultWildcard: 'pi/events/+/result',
  interactivePrompt: (sessionId: string) => `pi/interactive/${sessionId}/prompt`,
  interactivePromptWildcard: 'pi/interactive/+/prompt',
  interactiveResponse: (sessionId: string) => `pi/interactive/${sessionId}/response`,
  interactiveResponseWildcard: 'pi/interactive/+/response',
  telemetryHealth: 'pi/telemetry/health',
  adminPlugins: 'pi/admin/plugins',
  piholeCommand: (action: PiholeAction) => `pi/commands/pihole/${action}`,
  piholeResult: 'pi/events/pihole/result',
};
