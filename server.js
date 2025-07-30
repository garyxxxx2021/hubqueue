const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;
const wsPort = 3001;

// Create the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create an HTTP server for Next.js
  const server = createServer(handle).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Next.js server ready on http://${hostname}:${port}`);
  });
  
  // --- WebSocket Server Setup ---
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    // This function is called when a client requests a WebSocket connection.
    const { pathname } = parse(request.url);
    
    // You can add authentication/path checks here if needed
    // For now, we'll accept all connections
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    console.log('Client connected via WebSocket');
    ws.on('close', () => {
      console.log('Client disconnected');
    });
     ws.on('error', (error) => {
      console.error('WebSocket error on connection:', error);
    });
  });

  // --- Internal Notification Server ---
  // This server listens for notifications from our server actions
  const notificationServer = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/notify') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        console.log('Notification received, broadcasting to clients...');
        // Broadcast to all connected clients
        wss.clients.forEach((client) => {
          if (client.readyState === require('ws').OPEN) {
            client.send('update');
          }
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  }).listen(wsPort, () => {
    console.log(`> Internal notification server listening on http://localhost:${wsPort}`);
  });
   notificationServer.on('error', (error) => {
    console.error('Notification server error:', error);
  });
  
}).catch(err => {
  console.error("Error preparing Next.js app", err);
});
