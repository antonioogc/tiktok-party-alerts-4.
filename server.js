
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { TikTokLiveConnection, WebcastEvent } from "tiktok-live-connector";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 10000;
const USERNAME = process.env.TIKTOK_USERNAME || "buonarroti23";

app.use(express.static("public"));

function broadcast(data) {
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  }
}

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({
    type: "status",
    text: "Panel preparado para @" + USERNAME
  }));
});

let connected = false;

async function connectTikTok() {
  if (connected) return;
  connected = true;

  try {
    const connection = new TikTokLiveConnection(USERNAME);

    connection.on(WebcastEvent.GIFT, (data) => {
      broadcast({
        type: "gift",
        user: data.user?.nickname || "Alguien",
        gift: data.giftDetails?.giftName || "Regalo",
        repeat: data.repeatCount || 1
      });
    });

    connection.on("connected", () => {
      broadcast({
        type: "status",
        text: "Conectado a @" + USERNAME
      });
    });

    connection.on("disconnected", () => {
      connected = false;
      broadcast({
        type: "status",
        text: "TikTok desconectado"
      });
    });

    await connection.connect();

  } catch (error) {
    connected = false;
    console.error(error);
    broadcast({
      type: "status",
      text: "No se ha podido conectar con TikTok LIVE"
    });
  }
}

wss.on("connection", connectTikTok);

server.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor iniciado en puerto " + PORT);
});
