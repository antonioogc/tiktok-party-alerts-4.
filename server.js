
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import {
  TikTokLiveConnection,
  WebcastEvent
} from "tiktok-live-connector";

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

let connected = false;
let connection = null;

function sendStatus(message) {
  broadcast({
    type: "status",
    text: message
  });
}

async function connectTikTok() {
  if (connected) return;

  connected = true;

  try {
    sendStatus("Conectando con @" + USERNAME + "...");

    connection = new TikTokLiveConnection(USERNAME, {
      processInitialData: false
    });

    connection.on(WebcastEvent.GIFT, (data) => {
      broadcast({
        type: "gift",
        user: data.user?.nickname || data.user?.uniqueId || "Alguien",
        gift: data.extendedGiftInfo?.name ||
              data.giftDetails?.giftName ||
              String(data.giftId || "Regalo"),
        repeat: data.repeatCount || 1
      });
    });

    connection.on("connected", () => {
      sendStatus("Conectado a @" + USERNAME);
    });

    connection.on("disconnected", () => {
      connected = false;
      connection = null;
      sendStatus("TikTok desconectado");
    });

    connection.on("error", (error) => {
      console.error("Error de TikTok:", error);
      sendStatus("Error en la conexión con TikTok");
    });

    await connection.connect();

    console.log("Conexión con TikTok establecida");

  } catch (error) {
    connected = false;
    connection = null;

    console.error("ERROR AL CONECTAR CON TIKTOK:");
    console.error(error);

    sendStatus("No se ha podido conectar con TikTok LIVE");
  }
}

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({
    type: "status",
    text: "Panel preparado para @" + USERNAME
  }));

  connectTikTok();
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor iniciado en puerto " + PORT);
});
