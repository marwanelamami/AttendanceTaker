import express from "express";
import { createServer as createViteServer } from "vite";
import http from "http";
import { Server } from "socket.io";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const activeBeacons = new Map();

  io.on('connection', (socket) => {
    // Send existing beacons to the newly connected client
    socket.emit('SYNC_BEACONS', Array.from(activeBeacons.values()));

    socket.on('message', (data) => {
      const { type, payload, target } = data;
      
      // Inject caller
      data.caller = socket.id;

      // Route directed P2P messages
      if (target) {
        io.to(target).emit('message', data);
        return;
      }

      if (type === 'BEACON_ANNOUNCE') {
        const beaconData = { ...payload, socketId: socket.id, updatedAt: Date.now() };
        activeBeacons.set(payload.id, beaconData);
        // Broadcast to all clients
        socket.broadcast.emit('message', { type: 'BEACON_ANNOUNCE', payload: beaconData });
      }
      else if (type === 'CHECK_IN') {
        socket.broadcast.emit('message', data);
      }
      else if (type === 'CHECK_IN_ACK') {
        socket.broadcast.emit('message', data);
      }
    });

    socket.on('disconnect', () => {
      for (const [id, beacon] of activeBeacons.entries()) {
        if (beacon.socketId === socket.id) {
          activeBeacons.delete(id);
          io.emit('message', {
            type: 'BEACON_REMOVE',
            payload: { id }
          });
        }
      }
    });
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
