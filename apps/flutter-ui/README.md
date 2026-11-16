# Future Flutter Client Guide (`apps/flutter-ui`)

Because all communication with the Raspberry Pi 4B orchestrator daemon uses **standardized JSON envelopes over MQTT**, adding a Flutter client is 100% plug-and-play.

---

## 1. Required Flutter Dependencies (`pubspec.yaml`)

```yaml
dependencies:
  flutter:
    sdk: flutter
  mqtt_client: ^10.0.0      # Official MQTT client supporting WebSockets and TLS
  provider: ^6.1.1          # State management
```

---

## 2. Topic Map for Flutter

| Topic | Flutter Action |
| :--- | :--- |
| `pi/telemetry/health` | Subscribe ➔ Update CPU Temp & RAM Gauge |
| `pi/interactive/+/prompt` | Subscribe ➔ Open `showDialog` with OTP TextField |
| `pi/interactive/{sessionId}/response` | Publish ➔ Send user OTP |
| `pi/commands/{pluginId}/{action}` | Publish ➔ Trigger scraper / messaging |
| `pi/events/+/result` | Subscribe ➔ Display usage result card |

---

## 3. Minimal Flutter MQTT Snippet

```dart
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_server_client.dart';

Future<void> connectToHiveMQ() async {
  final client = MqttServerClient.withPort(
    'your-cluster.s1.eu.hivemq.cloud',
    'flutter-client',
    8883,
  );
  client.secure = true;
  client.logging(on: false);

  final connMessage = MqttConnectMessage()
      .authenticateAs('web_client', 'YourPassword')
      .withWillTopic('pi/telemetry/health')
      .startClean();
  client.connectionMessage = connMessage;

  await client.connect();
  print('Flutter connected to HiveMQ Cloud!');

  // Subscribe to live telemetry
  client.subscribe('pi/telemetry/health', MqttQos.atMostOnce);
}
```
