import net from 'net';
import config from '../config/index.js';

export function sendRconCommand(command) {
  return new Promise((resolve, reject) => {
    if (!config.fivem.rconPassword) {
      return reject(new Error('RCON not configured'));
    }

    const socket = new net.Socket();
    let buffer = Buffer.alloc(0);
    let requestId = Math.floor(Math.random() * 10000);
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('RCON timeout'));
    }, 10000);

    const buildPacket = (id, type, body) => {
      const bodyBuf = Buffer.from(body + '\x00', 'utf8');
      const packet = Buffer.alloc(12 + bodyBuf.length);
      packet.writeInt32LE(8 + bodyBuf.length, 0);
      packet.writeInt32LE(id, 4);
      packet.writeInt32LE(type, 8);
      bodyBuf.copy(packet, 12);
      return packet;
    };

    socket.connect(config.fivem.rconPort, config.fivem.rconHost, () => {
      socket.write(buildPacket(requestId, 3, config.fivem.rconPassword));
      requestId += 1;
      socket.write(buildPacket(requestId, 2, command));
    });

    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
      while (buffer.length >= 12) {
        const size = buffer.readInt32LE(0);
        if (buffer.length < size + 4) break;
        const type = buffer.readInt32LE(8);
        const body = buffer.slice(12, size + 4 - 2).toString('utf8');
        buffer = buffer.slice(size + 4);
        if (type === 2) {
          clearTimeout(timeout);
          socket.end();
          resolve(body);
        }
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
