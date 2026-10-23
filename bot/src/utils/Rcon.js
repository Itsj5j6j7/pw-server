const net = require('net');

// Sends one command to a Minecraft server over RCON and resolves with its reply.
// RCON_HOST (default 127.0.0.1), RCON_PORT and RCON_PASSWORD come from .env.
const rcon = (command) => new Promise((resolve, reject) => {
    const socket = net.connect(Number(process.env.RCON_PORT), process.env.RCON_HOST || '127.0.0.1');
    let buffer = Buffer.alloc(0);
    const packet = (id, type, body) => {
        const payload = Buffer.from(body, 'utf8');
        const out = Buffer.alloc(14 + payload.length);
        out.writeInt32LE(10 + payload.length, 0);
        out.writeInt32LE(id, 4);
        out.writeInt32LE(type, 8);
        payload.copy(out, 12);
        return out;
    };
    socket.setTimeout(10000, () => socket.destroy(new Error('RCON timed out')));
    socket.on('error', reject);
    socket.on('connect', () => socket.write(packet(1, 3, process.env.RCON_PASSWORD ?? '')));
    socket.on('data', (data) => {
        buffer = Buffer.concat([buffer, data]);
        while (buffer.length >= 4 && buffer.length >= 4 + buffer.readInt32LE(0)) {
            const size = buffer.readInt32LE(0);
            const id = buffer.readInt32LE(4);
            const body = buffer.toString('utf8', 12, 4 + size - 2);
            buffer = buffer.subarray(4 + size);
            if (id === -1) return socket.destroy(new Error('RCON: wrong password'));
            if (id === 1) socket.write(packet(2, 2, command)); // logged in
            else if (id === 2) { socket.end(); resolve(body); }
        }
    });
});

module.exports = { rcon };
