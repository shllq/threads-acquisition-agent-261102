import { chromium } from 'playwright';
import { browserEnvironment } from './credentials.mjs';
import { createNetworkProxy } from './network.mjs';

export async function launchBrowser() {
  const proxy = await createNetworkProxy();
  try {
    const browser = await chromium.launch({
      env: browserEnvironment(),
      proxy: { server: proxy.server, bypass: '<-loopback>' },
      args: ['--disable-quic', '--force-webrtc-ip-handling-policy=disable_non_proxied_udp', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']
    });
    browser.once('disconnected', () => { void proxy.close(); });
    return browser;
  } catch (error) {
    await proxy.close();
    throw error;
  }
}
