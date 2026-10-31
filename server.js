// server.js
const express = require('express');
const { Server } = require('ws');

const PORT = process.env.PORT || 8080;

// HTTPサーバーの立ち上げ
const app = express();
app.get('/', (req, res) => res.send('Server is running!'));
const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

// WebSocketサーバーをHTTPサーバーにバインド
const wss = new Server({ server });

// サーバー側の状態管理（唯一の真実）
const gameState = {
  players: new Map() // key: socket, value: { id, x, y }
};

wss.on('connection', (ws) => {
  const playerId = Math.random().toString(36).substring(2, 9);
  gameState.players.set(ws, { id: playerId, x: 0, y: 0 });
  console.log(`Player connected: ${playerId}`);

  ws.on('message', (message) => {
    try {
      const packet = JSON.parse(message);
      // RPCのアクション処理
      if (packet.type === 'RPC_MOVE') {
        const player = gameState.players.get(ws);
        if (player) {
          player.x += packet.dx || 0;
          player.y += packet.dy || 0;
        }
      }
    } catch (e) {
      console.error("Invalid JSON:", e);
    }
  });

  ws.on('close', () => {
    console.log(`Player disconnected: ${playerId}`);
    gameState.players.delete(ws);
  });
});

// 20ms（毎秒50回）ごとに全員へ状態の差分をブロードキャスト
setInterval(() => {
  const snapshot = {
    type: 'STATE_UPDATE',
    players: Array.from(gameState.players.values())
  };
  const payload = JSON.stringify(snapshot);

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // 1 = OPEN
      client.send(payload);
    }
  });
}, 20);