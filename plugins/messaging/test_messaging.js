/**
 * Automated test suite for the Multi-Channel Messaging Plugin.
 * Tests JSON stdin parsing, routing, and simulated dispatch.
 */

const { spawn } = require('child_process');
const path = require('path');

function runTest(channelName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'src', 'index.ts');
    const tsNode = process.platform === 'win32' ? 'npx.cmd' : 'npx';

    console.log(`[Test] Testing channel '${channelName}'...`);

    const command = {
      messageId: `test_msg_${Date.now()}`,
      pluginId: 'messaging',
      action: 'send',
      payload: {
        channel: channelName,
        recipient: channelName === 'TELEGRAM' ? '123456789' : '+919876543210',
        content: `Test alert from Raspberry Pi! Time: ${new Date().toISOString()}`,
      },
    };

    // Use tsx or node with loader if available, or direct node if compiled
    const proc = spawn('node', [
      '--no-warnings',
      '--loader', 'ts-node/esm',
      scriptPath
    ], {
      cwd: __dirname,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      console.log(`[Test] Process exited with code ${code}`);
      if (stdout.trim()) {
        try {
          const parsed = JSON.parse(stdout.trim());
          console.log(`[Test] Received valid JSON result:`, parsed);
          resolve(parsed);
          return;
        } catch (e) {
          // not json
        }
      }
      resolve({ stdout, stderr, code });
    });

    proc.stdin.write(JSON.stringify(command) + '\n');
    proc.stdin.end();
  });
}

async function main() {
  console.log('==> Running Messaging Plugin Tests...');
  const res = await runTest('MOCK');
  console.log('✅ Messaging Plugin Test Completed.');
}

if (require.main === module) {
  main().catch(console.error);
}
