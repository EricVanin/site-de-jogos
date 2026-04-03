import { once } from "node:events";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createApp } from "./app.js";

type ServerMessage = {
  type: string;
  payload: Record<string, unknown>;
};

type MessageQueue = {
  items: ServerMessage[];
};

const runningApps: Array<ReturnType<typeof createApp>> = [];

function attachQueue(socket: WebSocket) {
  const queue: MessageQueue = {
    items: []
  };

  socket.on("message", (message) => {
    queue.items.push(JSON.parse(String(message)) as ServerMessage);
  });

  return queue;
}

async function waitForMessage(
  queue: MessageQueue,
  expectedType: string,
  matcher?: (message: ServerMessage) => boolean,
  timeoutMs = 3000
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const index = queue.items.findIndex(
      (message) => message.type === expectedType && (matcher ? matcher(message) : true)
    );
    if (index >= 0) {
      const [message] = queue.items.splice(index, 1);
      return message;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(`Timed out waiting for ${expectedType}`);
}

afterEach(async () => {
  while (runningApps.length > 0) {
    const app = runningApps.pop();
    if (app) {
      await app.close();
    }
  }
});

describe("server app", () => {
  it("creates guest sessions and rooms through HTTP", async () => {
    const app = createApp();
    runningApps.push(app);

    const guestResponse = await app.inject({
      method: "POST",
      url: "/api/guest/session",
      payload: {
        locale: "pt-BR"
      }
    });

    expect(guestResponse.statusCode).toBe(200);
    const guest = guestResponse.json();
    expect(guest.guestId).toMatch(/^guest-/);

    const roomResponse = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: {
        guestId: guest.guestId,
        locale: "pt-BR",
        mode: "classic-3x3"
      }
    });

    expect(roomResponse.statusCode).toBe(200);
    expect(roomResponse.json().room.playerCount).toBe(1);
  });

  it("accepts the Sem Velha mode when creating rooms", async () => {
    const app = createApp();
    runningApps.push(app);

    const guestResponse = await app.inject({
      method: "POST",
      url: "/api/guest/session",
      payload: {
        locale: "pt-BR"
      }
    });

    const roomResponse = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: {
        guestId: guestResponse.json().guestId,
        locale: "pt-BR",
        mode: "vanishing-tic-tac-toe"
      }
    });

    expect(roomResponse.statusCode).toBe(200);
    expect(roomResponse.json().room.mode).toBe("vanishing-tic-tac-toe");
  });

  it("accepts the 5x5 win-in-4 mode when creating rooms", async () => {
    const app = createApp();
    runningApps.push(app);

    const guestResponse = await app.inject({
      method: "POST",
      url: "/api/guest/session",
      payload: {
        locale: "pt-BR"
      }
    });

    const roomResponse = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: {
        guestId: guestResponse.json().guestId,
        locale: "pt-BR",
        mode: "board-5x5-win-4"
      }
    });

    expect(roomResponse.statusCode).toBe(200);
    expect(roomResponse.json().room.mode).toBe("board-5x5-win-4");
  });

  it("accepts the powers mode when creating rooms", async () => {
    const app = createApp();
    runningApps.push(app);

    const guestResponse = await app.inject({
      method: "POST",
      url: "/api/guest/session",
      payload: {
        locale: "pt-BR"
      }
    });

    const roomResponse = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: {
        guestId: guestResponse.json().guestId,
        locale: "pt-BR",
        mode: "powers"
      }
    });

    expect(roomResponse.statusCode).toBe(200);
    expect(roomResponse.json().room.mode).toBe("powers");
  });

  it("accepts the BO5 rotations mode when creating rooms", async () => {
    const app = createApp();
    runningApps.push(app);

    const guestResponse = await app.inject({
      method: "POST",
      url: "/api/guest/session",
      payload: {
        locale: "pt-BR"
      }
    });

    const roomResponse = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: {
        guestId: guestResponse.json().guestId,
        locale: "pt-BR",
        mode: "bo5-rotations"
      }
    });

    expect(roomResponse.statusCode).toBe(200);
    expect(roomResponse.json().room.mode).toBe("bo5-rotations");
  });

  it(
    "synchronizes two players over websocket and finishes a classic match",
    async () => {
    const app = createApp();
    runningApps.push(app);
    await app.listen({
      host: "127.0.0.1",
      port: 0
    });

    const port = (app.server.address() as { port: number }).port;
    const address = new URL(`http://127.0.0.1:${port}`);

    const createSession = async () => {
      const response = await fetch(new URL("/api/guest/session", address), {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          locale: "pt-BR"
        })
      });

      return response.json() as Promise<{ guestId: string }>;
    };

    const host = await createSession();
    const guest = await createSession();

    const roomCreateResponse = await fetch(new URL("/api/rooms", address), {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        guestId: host.guestId,
        locale: "pt-BR",
        mode: "classic-3x3"
      })
    });
    const createdRoom = (await roomCreateResponse.json()) as {
      room: { code: string };
    };

    const hostSocket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const guestSocket = new WebSocket(`ws://127.0.0.1:${port}/ws`);

    await Promise.all([once(hostSocket, "open"), once(guestSocket, "open")]);
    const hostQueue = attachQueue(hostSocket);
    const guestQueue = attachQueue(guestSocket);

    hostSocket.send(
      JSON.stringify({
        type: "room.join",
        payload: {
          roomCode: createdRoom.room.code,
          guestId: host.guestId
        }
      })
    );

    const hostRoomUpdated = await waitForMessage(hostQueue, "room.updated");
    expect(hostRoomUpdated.payload.playerCount).toBe(1);

    const joinResponse = await fetch(
      new URL(`/api/rooms/${createdRoom.room.code}/join`, address),
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          guestId: guest.guestId
        })
      }
    );
    const joinedRoom = (await joinResponse.json()) as {
      room: { activeMatchId: string };
      activeMatch: { id: string };
    };

    guestSocket.send(
      JSON.stringify({
        type: "room.join",
        payload: {
          roomCode: createdRoom.room.code,
          guestId: guest.guestId
        }
      })
    );

    const hostMatchState = await waitForMessage(hostQueue, "match.state");
    const guestMatchState = await waitForMessage(guestQueue, "match.state");

    expect(hostMatchState.payload.id).toBe(joinedRoom.activeMatch.id);
    expect(guestMatchState.payload.id).toBe(joinedRoom.activeMatch.id);

    const playMove = (socket: WebSocket, guestId: string, cellIndex: number) => {
      socket.send(
        JSON.stringify({
          type: "move.play",
          payload: {
            roomCode: createdRoom.room.code,
            matchId: joinedRoom.activeMatch.id,
            guestId,
            cellIndex
          }
        })
      );
    };

    playMove(hostSocket, host.guestId, 0);
    await waitForMessage(hostQueue, "move.applied");
    await waitForMessage(guestQueue, "move.applied");
    await waitForMessage(hostQueue, "match.state");
    await waitForMessage(guestQueue, "match.state");

    playMove(guestSocket, guest.guestId, 3);
    await waitForMessage(hostQueue, "move.applied");
    await waitForMessage(guestQueue, "move.applied");
    await waitForMessage(hostQueue, "match.state");
    await waitForMessage(guestQueue, "match.state");

    playMove(hostSocket, host.guestId, 1);
    await waitForMessage(hostQueue, "move.applied");
    await waitForMessage(guestQueue, "move.applied");
    await waitForMessage(hostQueue, "match.state");
    await waitForMessage(guestQueue, "match.state");

    playMove(guestSocket, guest.guestId, 4);
    await waitForMessage(hostQueue, "move.applied");
    await waitForMessage(guestQueue, "move.applied");
    await waitForMessage(hostQueue, "match.state");
    await waitForMessage(guestQueue, "match.state");

    playMove(hostSocket, host.guestId, 2);
    await waitForMessage(hostQueue, "move.applied");
    await waitForMessage(guestQueue, "move.applied");

    const hostFinalState = await waitForMessage(hostQueue, "match.state");
    const guestFinalState = await waitForMessage(guestQueue, "match.state");
    const hostEnded = await waitForMessage(hostQueue, "match.ended");
    const guestEnded = await waitForMessage(guestQueue, "match.ended");

    expect(hostFinalState.payload.winner).toBe("X");
    expect(guestFinalState.payload.winner).toBe("X");
    expect(hostEnded.payload.winner).toBe("X");
    expect(guestEnded.payload.winner).toBe("X");

    const firstRematchResponse = await fetch(
      new URL(`/api/matches/${joinedRoom.activeMatch.id}/rematch`, address),
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          guestId: host.guestId
        })
      }
    );
    const firstRematch = (await firstRematchResponse.json()) as {
      accepted: boolean;
      rematchToken: string;
      roomCode: string;
    };

    expect(firstRematch.accepted).toBe(false);
    expect(firstRematch.roomCode).toBe(createdRoom.room.code);

    const secondRematchResponse = await fetch(
      new URL(`/api/matches/${joinedRoom.activeMatch.id}/rematch`, address),
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          guestId: guest.guestId
        })
      }
    );
    const secondRematch = (await secondRematchResponse.json()) as {
      accepted: boolean;
      rematchToken: string;
      roomCode: string;
    };

    expect(secondRematch.accepted).toBe(true);
    expect(secondRematch.rematchToken).toBe(firstRematch.rematchToken);

    const hostRematchRoom = await waitForMessage(hostQueue, "room.updated");
    const guestRematchRoom = await waitForMessage(guestQueue, "room.updated");
    const hostRematchState = await waitForMessage(hostQueue, "match.state");
    const guestRematchState = await waitForMessage(guestQueue, "match.state");

    expect(hostRematchRoom.payload.state).toBe("playing");
    expect(guestRematchRoom.payload.state).toBe("playing");
    expect(hostRematchState.payload.id).not.toBe(joinedRoom.activeMatch.id);
    expect(guestRematchState.payload.id).toBe(hostRematchState.payload.id);
    expect(hostRematchState.payload.status).toBe("in-progress");
    expect(hostRematchState.payload.turnNumber).toBe(0);
    expect(
      (hostRematchState.payload.board as Array<{ occupant: string | null }>).every(
        (cell) => cell.occupant === null
      )
    ).toBe(true);

    hostSocket.close();
    guestSocket.close();
    },
    15000
  );

  it(
    "applies a power card over websocket and syncs the updated match",
    async () => {
      const app = createApp();
      runningApps.push(app);
      await app.listen({
        host: "127.0.0.1",
        port: 0
      });

      const port = (app.server.address() as { port: number }).port;
      const address = new URL(`http://127.0.0.1:${port}`);

      const createSession = async () => {
        const response = await fetch(new URL("/api/guest/session", address), {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            locale: "pt-BR"
          })
        });

        return response.json() as Promise<{ guestId: string }>;
      };

      const host = await createSession();
      const guest = await createSession();

      const roomCreateResponse = await fetch(new URL("/api/rooms", address), {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          guestId: host.guestId,
          locale: "pt-BR",
          mode: "powers"
        })
      });
      const createdRoom = (await roomCreateResponse.json()) as {
        room: { code: string };
      };

      const hostSocket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      const guestSocket = new WebSocket(`ws://127.0.0.1:${port}/ws`);

      await Promise.all([once(hostSocket, "open"), once(guestSocket, "open")]);
      const hostQueue = attachQueue(hostSocket);
      const guestQueue = attachQueue(guestSocket);

      hostSocket.send(
        JSON.stringify({
          type: "room.join",
          payload: {
            roomCode: createdRoom.room.code,
            guestId: host.guestId
          }
        })
      );
      await waitForMessage(hostQueue, "room.updated");

      await fetch(new URL(`/api/rooms/${createdRoom.room.code}/join`, address), {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          guestId: guest.guestId
        })
      });

      guestSocket.send(
        JSON.stringify({
          type: "room.join",
          payload: {
            roomCode: createdRoom.room.code,
            guestId: guest.guestId
          }
        })
      );

      const hostMatchState = await waitForMessage(hostQueue, "match.state");
      const guestMatchState = await waitForMessage(guestQueue, "match.state");
      const hostHand = hostMatchState.payload.powers as {
        hands: {
          X: Array<{ cardId: string; effectType: string }>;
        };
      };
      const occupyCard = hostHand.hands.X.find((card) => card.effectType === "occupy-empty");

      expect(occupyCard).toBeDefined();
      expect(guestMatchState.payload.powers).toBeTruthy();
      if (!occupyCard) {
        throw new Error("Expected host to receive an occupy-empty card");
      }

      hostSocket.send(
        JSON.stringify({
          type: "power.use",
          payload: {
            roomCode: createdRoom.room.code,
            matchId: String(hostMatchState.payload.id),
            guestId: host.guestId,
            cardId: occupyCard.cardId,
            targetCellIndex: 0
          }
        })
      );

      const hostPowerApplied = await waitForMessage(hostQueue, "power.applied");
      const guestPowerApplied = await waitForMessage(guestQueue, "power.applied");
      const hostUpdatedMatch = await waitForMessage(hostQueue, "match.state");
      const guestUpdatedMatch = await waitForMessage(guestQueue, "match.state");

      expect(hostPowerApplied.payload.effectType).toBe("occupy-empty");
      expect(guestPowerApplied.payload.targetCellIndex).toBe(0);
      expect((hostUpdatedMatch.payload.board as Array<{ occupant: string | null }>)[0].occupant).toBe(
        "X"
      );
      expect((guestUpdatedMatch.payload.board as Array<{ occupant: string | null }>)[0].occupant).toBe(
        "X"
      );

      hostSocket.close();
      guestSocket.close();
    },
    15000
  );

  it(
    "tracks BO5 series state and advances to the next rotated round after confirmation",
    async () => {
      const app = createApp();
      runningApps.push(app);
      await app.listen({
        host: "127.0.0.1",
        port: 0
      });

      const port = (app.server.address() as { port: number }).port;
      const address = new URL(`http://127.0.0.1:${port}`);

      const createSession = async () => {
        const response = await fetch(new URL("/api/guest/session", address), {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            locale: "pt-BR"
          })
        });

        return response.json() as Promise<{ guestId: string }>;
      };

      const host = await createSession();
      const guest = await createSession();

      const roomCreateResponse = await fetch(new URL("/api/rooms", address), {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          guestId: host.guestId,
          locale: "pt-BR",
          mode: "bo5-rotations"
        })
      });
      const createdRoom = (await roomCreateResponse.json()) as {
        room: { code: string };
      };

      const hostSocket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      const guestSocket = new WebSocket(`ws://127.0.0.1:${port}/ws`);

      await Promise.all([once(hostSocket, "open"), once(guestSocket, "open")]);
      const hostQueue = attachQueue(hostSocket);
      const guestQueue = attachQueue(guestSocket);

      hostSocket.send(
        JSON.stringify({
          type: "room.join",
          payload: {
            roomCode: createdRoom.room.code,
            guestId: host.guestId
          }
        })
      );
      await waitForMessage(hostQueue, "room.updated");

      const joinResponse = await fetch(new URL(`/api/rooms/${createdRoom.room.code}/join`, address), {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          guestId: guest.guestId
        })
      });
      const joinedRoom = (await joinResponse.json()) as {
        activeMatch: { id: string; mode: string };
      };

      guestSocket.send(
        JSON.stringify({
          type: "room.join",
          payload: {
            roomCode: createdRoom.room.code,
            guestId: guest.guestId
          }
        })
      );

      const hostSeriesStart = await waitForMessage(hostQueue, "series.updated");
      const guestSeriesStart = await waitForMessage(guestQueue, "series.updated");
      const hostMatchState = await waitForMessage(hostQueue, "match.state");
      const guestMatchState = await waitForMessage(guestQueue, "match.state");

      expect(hostSeriesStart.payload.currentRound).toBe(1);
      expect(hostSeriesStart.payload.activeMode).toBe("classic-3x3");
      expect(guestSeriesStart.payload.bestOf).toBe(5);
      expect(hostMatchState.payload.mode).toBe("classic-3x3");
      expect(guestMatchState.payload.id).toBe(joinedRoom.activeMatch.id);

      const playMove = (socket: WebSocket, guestId: string, cellIndex: number) => {
        socket.send(
          JSON.stringify({
            type: "move.play",
            payload: {
              roomCode: createdRoom.room.code,
              matchId: joinedRoom.activeMatch.id,
              guestId,
              cellIndex
            }
          })
        );
      };

      playMove(hostSocket, host.guestId, 0);
      await waitForMessage(hostQueue, "move.applied");
      await waitForMessage(guestQueue, "move.applied");
      await waitForMessage(hostQueue, "match.state");
      await waitForMessage(guestQueue, "match.state");

      playMove(guestSocket, guest.guestId, 3);
      await waitForMessage(hostQueue, "move.applied");
      await waitForMessage(guestQueue, "move.applied");
      await waitForMessage(hostQueue, "match.state");
      await waitForMessage(guestQueue, "match.state");

      playMove(hostSocket, host.guestId, 1);
      await waitForMessage(hostQueue, "move.applied");
      await waitForMessage(guestQueue, "move.applied");
      await waitForMessage(hostQueue, "match.state");
      await waitForMessage(guestQueue, "match.state");

      playMove(guestSocket, guest.guestId, 4);
      await waitForMessage(hostQueue, "move.applied");
      await waitForMessage(guestQueue, "move.applied");
      await waitForMessage(hostQueue, "match.state");
      await waitForMessage(guestQueue, "match.state");

      playMove(hostSocket, host.guestId, 2);
      await waitForMessage(hostQueue, "move.applied");
      await waitForMessage(guestQueue, "move.applied");

      const hostRoundEndState = await waitForMessage(hostQueue, "match.state");
      await waitForMessage(guestQueue, "match.state");
      const hostSeriesAfterRound = await waitForMessage(hostQueue, "series.updated");
      const guestSeriesAfterRound = await waitForMessage(guestQueue, "series.updated");
      await waitForMessage(hostQueue, "match.ended");
      await waitForMessage(guestQueue, "match.ended");

      expect(hostRoundEndState.payload.winner).toBe("X");
      expect(
        (
          hostSeriesAfterRound.payload as {
            score: { X: number; O: number };
            currentRound: number;
            activeMode: string;
          }
        ).score.X
      ).toBe(1);
      expect(
        (hostSeriesAfterRound.payload as { currentRound: number }).currentRound
      ).toBe(2);
      expect(
        (hostSeriesAfterRound.payload as { activeMode: string }).activeMode
      ).toBe("vanishing-tic-tac-toe");
      expect((guestSeriesAfterRound.payload as { history: unknown[] }).history).toHaveLength(1);

      const firstAdvanceResponse = await fetch(
        new URL(`/api/matches/${joinedRoom.activeMatch.id}/rematch`, address),
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            guestId: host.guestId
          })
        }
      );
      expect((await firstAdvanceResponse.json()).accepted).toBe(false);

      const secondAdvanceResponse = await fetch(
        new URL(`/api/matches/${joinedRoom.activeMatch.id}/rematch`, address),
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            guestId: guest.guestId
          })
        }
      );
      expect((await secondAdvanceResponse.json()).accepted).toBe(true);

      const hostSeriesNext = await waitForMessage(
        hostQueue,
        "series.updated",
        (message) => message.payload.currentRound === 2 && message.payload.activeMode === "vanishing-tic-tac-toe"
      );
      const guestSeriesNext = await waitForMessage(
        guestQueue,
        "series.updated",
        (message) => message.payload.currentRound === 2 && message.payload.activeMode === "vanishing-tic-tac-toe"
      );
      const hostNextState = await waitForMessage(
        hostQueue,
        "match.state",
        (message) => message.payload.mode === "vanishing-tic-tac-toe"
      );
      const guestNextState = await waitForMessage(
        guestQueue,
        "match.state",
        (message) => message.payload.mode === "vanishing-tic-tac-toe"
      );
      const hostNextRoom = await waitForMessage(
        hostQueue,
        "room.updated",
        (message) =>
          message.payload.state === "playing" &&
          message.payload.activeMatchId === hostNextState.payload.id
      );
      const guestNextRoom = await waitForMessage(
        guestQueue,
        "room.updated",
        (message) =>
          message.payload.state === "playing" &&
          message.payload.activeMatchId === hostNextState.payload.id
      );

      expect(hostSeriesNext.payload.currentRound).toBe(2);
      expect(guestSeriesNext.payload.activeMode).toBe("vanishing-tic-tac-toe");
      expect(hostNextRoom.payload.state).toBe("playing");
      expect(guestNextRoom.payload.activeMatchId).toBe(hostNextState.payload.id);
      expect(hostNextState.payload.mode).toBe("vanishing-tic-tac-toe");
      expect(guestNextState.payload.id).toBe(hostNextState.payload.id);

      hostSocket.close();
      guestSocket.close();
    },
    15000
  );
});
