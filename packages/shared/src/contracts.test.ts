import { describe, expect, it } from "vitest";
import {
  clientEventSchema,
  createRoomResponseSchema,
  createRoomRequestSchema,
  guestSessionSchema,
  roomUpdatedEventPayloadSchema,
  serverEventSchema,
  supportedLocales
} from "./contracts.js";

describe("shared contracts", () => {
  it("accepts a valid guest session", () => {
    const result = guestSessionSchema.parse({
      guestId: "guest-1234",
      locale: supportedLocales[0]
    });

    expect(result.guestId).toBe("guest-1234");
  });

  it("parses a valid create room request", () => {
    const result = createRoomRequestSchema.parse({
      guestId: "guest-1234",
      locale: "pt-BR",
      mode: "classic-3x3"
    });

    expect(result.mode).toBe("classic-3x3");
  });

  it("parses a valid client event envelope", () => {
    const result = clientEventSchema.parse({
      type: "move.play",
      payload: {
        roomCode: "ABCD",
        matchId: "match-1234",
        guestId: "guest-1234",
        cellIndex: 4
      }
    });

    expect(result.type).toBe("move.play");
  });

  it("parses a valid server event envelope", () => {
    const result = serverEventSchema.parse({
      type: "room.updated",
      payload: {
        roomCode: "ABCD",
        code: "ABCD",
        state: "playing",
        mode: "classic-3x3",
        hostGuestId: "guest-1234",
        playerCount: 2,
        capacity: 2,
        activeMatchId: "match-1234",
        expiresAt: "2026-04-03T12:30:00.000Z",
        players: [
          {
            guestId: "guest-1234",
            symbol: "X",
            joinedAt: "2026-04-03T12:00:00.000Z"
          },
          {
            guestId: "guest-5678",
            symbol: "O",
            joinedAt: "2026-04-03T12:00:05.000Z"
          }
        ]
      }
    });

    expect(result.type).toBe("room.updated");
    if (result.type !== "room.updated") {
      throw new Error("Expected match.ended event");
    }

    expect(result.payload.playerCount).toBe(2);
  });

  it("parses a valid create room response", () => {
    const room = roomUpdatedEventPayloadSchema.parse({
      code: "ABCD",
      state: "waiting",
      mode: "classic-3x3",
      hostGuestId: "guest-1234",
      playerCount: 1,
      capacity: 2,
      activeMatchId: null,
      expiresAt: "2026-04-03T12:30:00.000Z",
      players: [
        {
          guestId: "guest-1234",
          symbol: "X",
          joinedAt: "2026-04-03T12:00:00.000Z"
        }
      ]
    });

    const result = createRoomResponseSchema.parse({
      room,
      activeMatch: null
    });

    expect(result.room.code).toBe("ABCD");
  });

  it("parses a valid power.applied server event", () => {
    const result = serverEventSchema.parse({
      type: "power.applied",
      payload: {
        roomCode: "ABCD",
        matchId: "match-1234",
        guestId: "guest-1234",
        cardId: "x-1",
        effectType: "occupy-empty",
        targetCellIndex: 4,
        nextTurn: "O",
        turnNumber: 1
      }
    });

    expect(result.type).toBe("power.applied");
  });

  it("parses a valid series.updated event", () => {
    const result = serverEventSchema.parse({
      type: "series.updated",
      payload: {
        roomCode: "ABCD",
        bestOf: 5,
        targetWins: 3,
        status: "in-progress",
        score: {
          X: 2,
          O: 1
        },
        currentRound: 4,
        activeMode: "powers",
        winner: null,
        history: [
          {
            roundNumber: 1,
            mode: "classic-3x3",
            winner: "X",
            matchId: "match-round-1"
          }
        ]
      }
    });

    expect(result.type).toBe("series.updated");
  });
});
