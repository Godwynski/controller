const os = require('os');

const interfaces = os.networkInterfaces();
const broadcasts = [];

for (const name of Object.keys(interfaces)) {
  for (const net of interfaces[name] || []) {
    if (net.family === 'IPv4' && !net.internal) {
      const ipParts = net.address.split('.').map(Number);
      const maskParts = net.netmask.split('.').map(Number);
      const broadcastParts = ipParts.map((part, i) => (part | (~maskParts[i] & 255)));
      broadcasts.push({
        interface: name,
        ip: net.address,
        mask: net.netmask,
        broadcast: broadcastParts.join('.')
      });
    }
  }
}

console.log('Discovered Broadcasts:');
console.log(JSON.stringify(broadcasts, null, 2));
