import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { existsSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type RawData } from "ws";
import {
  CLIENT_EVENT_TYPES,
  CONTRACT_VERSION,
  HEALTH_STATUS,
  PUBLIC_API_ROUTES,
  SERVER_EVENT_TYPES,
  createGuestSessionRequestSchema,
  createRoomRequestSchema,
  joinRoomRequestSchema,
  rematchRequestSchema
} from "@site-de-jogos/shared";
import { ZodError } from "zod";
import { AppError, GameStore } from "./state/game-store.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const webDistDir = join(currentDir, "../../web/dist");

export function createApp() {
  const app = Fastify({
    logger: false
  });
  const store = new GameStore();
  const realtimeServer = new WebSocketServer({
    noServer: true
  });

  app.register(cors, {
    origin: true
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message
        }
      });
      return;
    }

    if (error instanceof ZodError) {
      reply.status(400).send({
        error: {
          code: "INVALID_PAYLOAD",
          message: "The request payload does not match the expected contract."
        }
      });
      return;
    }

    reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected server error happened."
      }
    });
  });

  app.get("/health", async () => {
    return {
      status: HEALTH_STATUS.ready
    };
  });

  app.get("/api/meta", async () => {
    return {
      name: "site-de-jogos-server",
      phase: "T11",
      status: HEALTH_STATUS.ready,
      contractVersion: CONTRACT_VERSION,
      httpRoutes: PUBLIC_API_ROUTES,
      ws: {
        clientEvents: CLIENT_EVENT_TYPES,
        serverEvents: SERVER_EVENT_TYPES
      }
    };
  });

  app.post("/api/guest/session", async (request) => {
    const payload = createGuestSessionRequestSchema.parse(request.body ?? {});
    return store.createGuestSession(payload.locale);
  });

  app.post("/api/rooms", async (request) => {
    const payload = createRoomRequestSchema.parse(request.body ?? {});
    return store.createRoom(payload);
  });

  app.post("/api/rooms/:code/join", async (request) => {
    const payload = joinRoomRequestSchema.parse(request.body ?? {});
    const roomCode = String((request.params as { code?: string }).code ?? "");
    return store.joinRoom(roomCode, payload);
  });

  app.post("/api/matches/:id/rematch", async (request) => {
    const payload = rematchRequestSchema.parse(request.body ?? {});
    const matchId = String((request.params as { id?: string }).id ?? "");
    return store.requestRematch(matchId, payload);
  });

  if (existsSync(webDistDir)) {
    app.register(fastifyStatic, {
      root: webDistDir,
      prefix: "/",
      wildcard: false
    });

    app.setNotFoundHandler((request, reply) => {
      const pathname = request.raw.url?.split("?")[0] ?? request.url;
      if (request.raw.method !== "GET" || pathname.startsWith("/api") || pathname === "/ws") {
        reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "The requested resource could not be found."
          }
        });
        return;
      }

      return reply.type("text/html; charset=utf-8").sendFile("index.html");
    });
  }

  const handleUpgrade = (request: IncomingMessage, socket: Socket, head: Buffer) => {
    const requestUrl = request.url ? new URL(request.url, "http://localhost") : null;
    if (requestUrl?.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    realtimeServer.handleUpgrade(request, socket, head, (ws) => {
      realtimeServer.emit("connection", ws, request);
    });
  };

  app.server.on("upgrade", handleUpgrade);

  realtimeServer.on("connection", (socket) => {
    socket.on("message", (rawMessage: RawData) => {
      try {
        store.handleSocketMessage(socket, rawMessage.toString());
      } catch (error) {
        socket.close(error instanceof AppError ? 1008 : 1011, "Unexpected websocket failure");
      }
    });

    socket.on("close", () => {
      store.detachSocket(socket);
    });
  });

  app.addHook("onClose", (_instance, done) => {
    app.server.off("upgrade", handleUpgrade);
    realtimeServer.clients.forEach((client) => client.close());
    realtimeServer.close(() => done());
  });

  return app;
}
