import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import {
  clientEventSchema,
  createGuestSessionResponseSchema,
  createRoomResponseSchema,
  joinRoomResponseSchema,
  rematchResponseSchema,
  ruleViolationEventPayloadSchema,
  serverEventSchema,
  type ClientEvent,
  type CreateGuestSessionResponse,
  type CreateRoomRequest,
  type CreateRoomResponse,
  type GameMode,
  type JoinRoomRequest,
  type JoinRoomResponse,
  type MatchSnapshot,
  type PlayerSession,
  type RematchRequest,
  type RematchResponse,
  type RoomSnapshot,
  type ServerEvent,
  type SupportedLocale
} from "@site-de-jogos/shared";
import { applyTicTacToeMove, createTicTacToeMatch } from "../game/tic-tac-toe.js";

const ROOM_TTL_MS = 1000 * 60 * 30;

type SessionRecord = CreateGuestSessionResponse;

type SocketContext = {
  roomCode: string;
  guestId: string;
};

type RematchRecord = {
  roomCode: string;
  sourceMatchId: string;
  rematchToken: string;
  acceptedGuestIds: Set<string>;
};

class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function futureIso(milliseconds: number) {
  return new Date(Date.now() + milliseconds).toISOString();
}

function normalizeRoomCode(code: string) {
  return code.trim().toUpperCase();
}

function isReady(socket: WebSocket) {
  return socket.readyState === 1;
}

export class GameStore {
  private sessions = new Map<string, SessionRecord>();
  private rooms = new Map<string, RoomSnapshot>();
  private matches = new Map<string, MatchSnapshot>();
  private rematches = new Map<string, RematchRecord>();
  private roomSockets = new Map<string, Set<WebSocket>>();
  private socketContexts = new WeakMap<WebSocket, SocketContext>();

  createGuestSession(locale: SupportedLocale): CreateGuestSessionResponse {
    const session = createGuestSessionResponseSchema.parse({
      guestId: `guest-${randomUUID().replaceAll("-", "").slice(0, 12)}`,
      locale,
      createdAt: nowIso()
    });

    this.sessions.set(session.guestId, session);
    return session;
  }

  createRoom(input: CreateRoomRequest): CreateRoomResponse {
    this.sweepExpiredRooms();
    this.ensureSupportedMode(input.mode);
    const session = this.requireSession(input.guestId);
    const roomCode = this.generateRoomCode();
    const player = this.createPlayerSession(session.guestId, "X");

    const room: RoomSnapshot = {
      code: roomCode,
      state: "waiting",
      mode: input.mode,
      hostGuestId: input.guestId,
      playerCount: 1,
      capacity: 2,
      activeMatchId: null,
      expiresAt: futureIso(ROOM_TTL_MS),
      players: [player]
    };

    this.rooms.set(room.code, room);
    const response = createRoomResponseSchema.parse({
      room,
      activeMatch: null
    });

    return response;
  }

  joinRoom(roomCode: string, input: JoinRoomRequest): JoinRoomResponse {
    this.sweepExpiredRooms();
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = this.requireRoom(normalizedCode);
    this.requireSession(input.guestId);

    if (room.players.some((player) => player.guestId === input.guestId)) {
      return joinRoomResponseSchema.parse({
        room,
        activeMatch: room.activeMatchId ? this.matches.get(room.activeMatchId) ?? null : null
      });
    }

    if (room.playerCount >= room.capacity) {
      throw new AppError(409, "ROOM_FULL", "This room already has two players.");
    }

    const updatedRoom: RoomSnapshot = {
      ...room,
      playerCount: room.playerCount + 1,
      expiresAt: futureIso(ROOM_TTL_MS),
      players: [...room.players, this.createPlayerSession(input.guestId, "O")]
    };

    let activeMatch: MatchSnapshot | null = null;
    if (updatedRoom.playerCount === 2) {
      activeMatch = createTicTacToeMatch(
        updatedRoom.mode as "classic-3x3" | "vanishing-tic-tac-toe" | "board-5x5-win-4",
        updatedRoom.code,
        updatedRoom.players
      );
      this.matches.set(activeMatch.id, activeMatch);
      updatedRoom.state = "playing";
      updatedRoom.activeMatchId = activeMatch.id;
    }

    this.rooms.set(updatedRoom.code, updatedRoom);
    this.broadcastRoomState(updatedRoom.code);
    if (activeMatch) {
      this.broadcastEvent(updatedRoom.code, {
        type: "match.state",
        payload: activeMatch
      });
    }

    return joinRoomResponseSchema.parse({
      room: updatedRoom,
      activeMatch
    });
  }

  requestRematch(matchId: string, input: RematchRequest): RematchResponse {
    this.sweepExpiredRooms();
    this.requireSession(input.guestId);

    const match = this.requireMatch(matchId);
    const room = this.requireRoom(match.roomCode);

    if (room.activeMatchId !== match.id) {
      throw new AppError(409, "MATCH_NOT_ACTIVE", "This match is not active for the room.");
    }

    if (match.status !== "ended" || room.state !== "finished") {
      throw new AppError(
        409,
        "MATCH_NOT_ENDED",
        "Rematch is only available after the current match has ended."
      );
    }

    if (!room.players.some((player) => player.guestId === input.guestId)) {
      throw new AppError(403, "ROOM_ACCESS_DENIED", "The guest is not part of this room.");
    }

    const rematch = this.rematches.get(match.id) ?? {
      roomCode: room.code,
      sourceMatchId: match.id,
      rematchToken: `rematch-${randomUUID().replaceAll("-", "").slice(0, 12)}`,
      acceptedGuestIds: new Set<string>()
    };

    rematch.acceptedGuestIds.add(input.guestId);
    this.rematches.set(match.id, rematch);

    if (rematch.acceptedGuestIds.size < room.players.length) {
      return rematchResponseSchema.parse({
        accepted: false,
        roomCode: room.code,
        rematchToken: rematch.rematchToken
      });
    }

    const nextMatch = createTicTacToeMatch(
      room.mode as "classic-3x3" | "vanishing-tic-tac-toe" | "board-5x5-win-4",
      room.code,
      room.players
    );

    const restartedRoom: RoomSnapshot = {
      ...room,
      state: "playing",
      activeMatchId: nextMatch.id,
      expiresAt: futureIso(ROOM_TTL_MS)
    };

    this.matches.set(nextMatch.id, nextMatch);
    this.rooms.set(room.code, restartedRoom);
    this.rematches.delete(match.id);

    this.broadcastEvent(room.code, {
      type: "room.updated",
      payload: restartedRoom
    });
    this.broadcastEvent(room.code, {
      type: "match.state",
      payload: nextMatch
    });

    return rematchResponseSchema.parse({
      accepted: true,
      roomCode: room.code,
      rematchToken: rematch.rematchToken
    });
  }

  handleSocketMessage(socket: WebSocket, rawMessage: string) {
    const parsed = clientEventSchema.safeParse(JSON.parse(rawMessage));
    if (!parsed.success) {
      socket.close(1008, "Invalid client event payload");
      return;
    }

    const event = parsed.data;
    switch (event.type) {
      case "room.join":
        this.joinSocketRoom(socket, event);
        return;
      case "move.play":
        this.handleMovePlay(socket, event);
        return;
      case "power.use":
        this.sendRuleViolation(socket, {
          roomCode: event.payload.roomCode,
          code: "MODE_NOT_READY",
          message: "Powers are not available before T12.",
          recoverable: true
        });
        return;
      case "rematch.request":
        this.handleRematchRequest(socket, event);
        return;
      default:
        return;
    }
  }

  detachSocket(socket: WebSocket) {
    const context = this.socketContexts.get(socket);
    if (!context) {
      return;
    }

    this.socketContexts.delete(socket);
    const roomSockets = this.roomSockets.get(context.roomCode);
    roomSockets?.delete(socket);
    if (roomSockets && roomSockets.size === 0) {
      this.roomSockets.delete(context.roomCode);
    }
  }

  private joinSocketRoom(
    socket: WebSocket,
    event: Extract<ClientEvent, { type: "room.join" }>
  ) {
    const room = this.requireRoom(event.payload.roomCode);
    if (!room.players.some((player) => player.guestId === event.payload.guestId)) {
      throw new AppError(403, "ROOM_ACCESS_DENIED", "The guest is not part of this room.");
    }

    this.detachSocket(socket);
    const roomSockets = this.roomSockets.get(room.code) ?? new Set<WebSocket>();
    roomSockets.add(socket);
    this.roomSockets.set(room.code, roomSockets);
    this.socketContexts.set(socket, {
      roomCode: room.code,
      guestId: event.payload.guestId
    });

    this.sendEvent(socket, {
      type: "room.updated",
      payload: room
    });

    if (room.activeMatchId) {
      const activeMatch = this.matches.get(room.activeMatchId);
      if (activeMatch) {
        this.sendEvent(socket, {
          type: "match.state",
          payload: activeMatch
        });
      }
    }
  }

  private handleMovePlay(
    socket: WebSocket,
    event: Extract<ClientEvent, { type: "move.play" }>
  ) {
    const context = this.socketContexts.get(socket);
    if (!context) {
      throw new AppError(403, "SOCKET_NOT_JOINED", "Join a room before playing moves.");
    }

    if (
      context.roomCode !== event.payload.roomCode ||
      context.guestId !== event.payload.guestId
    ) {
      throw new AppError(403, "SOCKET_CONTEXT_MISMATCH", "Socket context does not match event.");
    }

    const room = this.requireRoom(event.payload.roomCode);
    const match = this.requireMatch(event.payload.matchId);

    if (room.activeMatchId !== match.id) {
      throw new AppError(409, "MATCH_NOT_ACTIVE", "This match is not active for the room.");
    }

    const result = applyTicTacToeMove(match, event.payload.guestId, event.payload.cellIndex);
    if (!result.ok) {
      this.sendRuleViolation(socket, {
        roomCode: event.payload.roomCode,
        code: result.code,
        message: result.message,
        recoverable: true
      });
      return;
    }

    this.matches.set(result.match.id, result.match);
    this.broadcastEvent(room.code, {
      type: "move.applied",
      payload: {
        roomCode: room.code,
        matchId: result.match.id,
        symbol: result.move.symbol,
        cellIndex: result.move.cellIndex,
        nextTurn: result.move.nextTurn,
        turnNumber: result.move.turnNumber,
        removedCellIndex: result.move.removedCellIndex
      }
    });

    this.broadcastEvent(room.code, {
      type: "match.state",
      payload: result.match
    });

    if (result.outcome !== "in-progress") {
      const finishedRoom: RoomSnapshot = {
        ...room,
        state: "finished",
        expiresAt: futureIso(ROOM_TTL_MS)
      };

      this.rooms.set(room.code, finishedRoom);
      this.broadcastEvent(room.code, {
        type: "match.ended",
        payload: {
          roomCode: room.code,
          matchId: result.match.id,
          winner: result.match.winner,
          reason: result.outcome === "win" ? "win" : "draw"
        }
      });
      this.broadcastEvent(room.code, {
        type: "room.updated",
        payload: finishedRoom
      });
    }
  }

  private handleRematchRequest(
    socket: WebSocket,
    event: Extract<ClientEvent, { type: "rematch.request" }>
  ) {
    const context = this.socketContexts.get(socket);
    if (!context) {
      throw new AppError(403, "SOCKET_NOT_JOINED", "Join a room before requesting rematch.");
    }

    if (
      context.roomCode !== event.payload.roomCode ||
      context.guestId !== event.payload.guestId
    ) {
      throw new AppError(403, "SOCKET_CONTEXT_MISMATCH", "Socket context does not match event.");
    }

    try {
      this.requestRematch(event.payload.matchId, {
        guestId: event.payload.guestId
      });
    } catch (error) {
      if (error instanceof AppError) {
        this.sendRuleViolation(socket, {
          roomCode: event.payload.roomCode,
          code: error.code,
          message: error.message,
          recoverable: true
        });
        return;
      }

      throw error;
    }
  }

  private sendRuleViolation(
    socket: WebSocket,
    payload: Parameters<typeof ruleViolationEventPayloadSchema.parse>[0]
  ) {
    this.sendEvent(socket, {
      type: "error.rule_violation",
      payload: ruleViolationEventPayloadSchema.parse(payload)
    });
  }

  private sendEvent(socket: WebSocket, event: ServerEvent) {
    if (!isReady(socket)) {
      return;
    }

    socket.send(JSON.stringify(serverEventSchema.parse(event)));
  }

  private broadcastEvent(roomCode: string, event: ServerEvent) {
    const sockets = this.roomSockets.get(roomCode);
    if (!sockets) {
      return;
    }

    for (const socket of sockets) {
      this.sendEvent(socket, event);
    }
  }

  private broadcastRoomState(roomCode: string) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return;
    }

    this.broadcastEvent(roomCode, {
      type: "room.updated",
      payload: room
    });
  }

  private createPlayerSession(guestId: string, symbol: PlayerSession["symbol"]): PlayerSession {
    return {
      guestId,
      symbol,
      joinedAt: nowIso()
    };
  }

  private requireSession(guestId: string) {
    const session = this.sessions.get(guestId);
    if (!session) {
      throw new AppError(404, "SESSION_NOT_FOUND", "Guest session was not found.");
    }

    return session;
  }

  private requireRoom(roomCode: string) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new AppError(404, "ROOM_NOT_FOUND", "Room code was not found or has expired.");
    }

    return room;
  }

  private requireMatch(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new AppError(404, "MATCH_NOT_FOUND", "Match identifier was not found.");
    }

    return match;
  }

  private ensureSupportedMode(mode: GameMode) {
    if (
      mode !== "classic-3x3" &&
      mode !== "vanishing-tic-tac-toe" &&
      mode !== "board-5x5-win-4"
    ) {
      throw new AppError(
        409,
        "MODE_NOT_READY",
        "Only classic 3x3, Sem Velha, and 5x5 win in 4 are available up to T10."
      );
    }
  }

  private generateRoomCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";
    do {
      code = Array.from({ length: 4 }, () => {
        const index = Math.floor(Math.random() * alphabet.length);
        return alphabet[index];
      }).join("");
    } while (this.rooms.has(code));

    return code;
  }

  private sweepExpiredRooms() {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      if (new Date(room.expiresAt).getTime() > now) {
        continue;
      }

      if (room.activeMatchId) {
        this.matches.delete(room.activeMatchId);
        this.rematches.delete(room.activeMatchId);
      }
      this.rooms.delete(room.code);
      this.roomSockets.delete(room.code);
    }
  }
}

export { AppError };
