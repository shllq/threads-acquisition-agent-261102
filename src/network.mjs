import { createServer } from 'node:http';
import { lookup } from 'node:dns/promises';
import { BlockList, isIPv4, connect } from 'node:net';

const blocked = new BlockList();
for (const [address, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3]]) blocked.addSubnet(address, prefix, 'ipv4');

blocked.addAddress('168.63.129.16', 'ipv4'); // Azure platform services use a public-looking address.

// shortcut: IPv6-only sites are unsupported; add validated IPv6 egress if a required source needs it.
export function publicAddress(address) {
  return isIPv4(address) && !blocked.check(address, 'ipv4');
}

export async function createNetworkProxy({ resolve = lookup, dial = connect } = {}) {
  const sockets = new Set();
  const track = socket => {
    sockets.add(socket);
    socket.on('error', () => socket.destroy());
    socket.once('close', () => sockets.delete(socket));
    socket.setTimeout(45_000, () => socket.destroy());
    return socket;
  };
  const server = createServer((_request, response) => { response.writeHead(403); response.end(); });
  server.maxConnections = 128;
  server.on('connection', track);
  server.on('connect', async (request, client, head) => {
    let upstream;
    try {
      if (!/^[A-Za-z0-9._-]+:443$/.test(request.url)) throw new Error('Only HTTPS port 443 is allowed.');
      const hostname = request.url.slice(0, -4);
      const addresses = await resolve(hostname, { family: 4, all: true });
      if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) throw new Error('Non-public destination.');
      if (client.destroyed) return;
      // Connect to the checked IP, not the hostname: DNS cannot change between validation and connection.
      upstream = track(dial({ host: addresses[0].address, port: 443 }));
      client.once('close', () => upstream.destroy());
      upstream.once('close', () => client.destroy());
      upstream.once('connect', () => {
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head.length) upstream.write(head);
        upstream.pipe(client);
        client.pipe(upstream);
      });
    } catch {
      upstream?.destroy();
      if (!client.destroyed) client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    server: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(resolve => {
      for (const socket of sockets) socket.destroy();
      server.close(resolve);
    })
  };
}
