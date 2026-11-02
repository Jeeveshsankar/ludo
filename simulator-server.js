const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleHttpRequest, handleWsUpgrade } = require('./backend/server');

const PORT = 3000;
const SIMULATOR_PATH = path.join(__dirname, 'web-simulator', 'index.html');

const server = http.createServer((req, res) => {
  // Directly process /api/ and /health endpoints inside the process
  if (req.url.startsWith('/api/') || req.url === '/health' || req.url === '/ready') {
    handleHttpRequest(req, res);
    return;
  }

  // Serve the simulator UI
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(SIMULATOR_PATH, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading simulator interface: ' + err.message);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Directly handle WebSocket upgrades in-process
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/ws')) {
    handleWsUpgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 HeySakhi Ludo — Integrated Game & Web Server LIVE!`);
  console.log(`📱 Open your browser at: http://localhost:${PORT}`);
  console.log(`⚡ Direct in-process REST APIs & WebSockets on port ${PORT}`);
  console.log(`======================================================\n`);
});
