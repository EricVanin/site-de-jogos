import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { I18nProvider } from "./i18n/I18nProvider";

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readyState = 1;
  sent: string[] = [];
  private listeners = new Map<string, Array<(event?: MessageEvent) => void>>();

  constructor() {
    MockWebSocket.instances.push(this);
    queueMicrotask(() => {
      this.emit("open");
    });
  }

  addEventListener(event: string, listener: (event?: MessageEvent) => void) {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  removeEventListener() {}

  send(message: string) {
    this.sent.push(message);
  }

  close() {
    this.readyState = 3;
    this.emit("close");
  }

  emit(event: string, payload?: MessageEvent) {
    const listeners = this.listeners.get(event) ?? [];
    for (const listener of listeners) {
      listener(payload);
    }
  }
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal("WebSocket", MockWebSocket);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/guest/session")) {
        return {
          ok: true,
          json: async () => ({
            guestId: "guest-test-01",
            locale: "pt-BR",
            createdAt: "2026-04-03T12:00:00.000Z"
          })
        } satisfies Partial<Response>;
      }

      if (url.includes("/api/rooms") && init?.method === "POST" && !url.includes("/join")) {
        const payload = JSON.parse(String(init.body ?? "{}")) as { mode?: string };
        const selectedMode = payload.mode ?? "classic-3x3";

        return {
          ok: true,
          json: async () => ({
            room: {
              code: "ABCD",
              state: "waiting",
              mode: selectedMode,
              hostGuestId: "guest-test-01",
              playerCount: 1,
              capacity: 2,
              activeMatchId: null,
              expiresAt: "2026-04-03T12:30:00.000Z",
              players: [
                {
                  guestId: "guest-test-01",
                  symbol: "X",
                  joinedAt: "2026-04-03T12:00:00.000Z"
                }
              ]
            },
            activeMatch: null
          })
        } satisfies Partial<Response>;
      }

      if (url.includes("/api/matches/") && url.includes("/rematch") && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            accepted: false,
            roomCode: "ABCD",
            rematchToken: "rematch-test-01"
          })
        } satisfies Partial<Response>;
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("loads the guest session and shows lobby actions", async () => {
    render(
      <I18nProvider initialLocale="pt-BR">
        <App />
      </I18nProvider>
    );

    expect(screen.getAllByText(/criando sua sessao guest/i).length).toBeGreaterThan(0);
    expect(await screen.findByText(/sessao pronta para entrar em uma sala/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /criar sala/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar na sala/i })).toBeInTheDocument();
  });

  it("creates a room and opens the realtime connection", async () => {
    render(
      <I18nProvider initialLocale="pt-BR">
        <App />
      </I18nProvider>
    );

    const createButton = await screen.findByRole("button", { name: /criar sala/i });
    fireEvent.click(createButton);

    expect(await screen.findByText(/^ABCD$/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
      expect(MockWebSocket.instances[0].sent[0]).toContain("\"type\":\"room.join\"");
    });
  });

  it("enables the 5x5 mode and renders a 25-cell board preview", async () => {
    render(
      <I18nProvider initialLocale="pt-BR">
        <App />
      </I18nProvider>
    );

    const modeButton = await screen.findByRole("button", { name: /5x5 vitoria em 4/i });
    fireEvent.click(modeButton);
    fireEvent.click(screen.getByRole("button", { name: /criar sala/i }));

    expect(await screen.findByText(/^ABCD$/i)).toBeInTheDocument();

    const grid = screen.getByRole("grid", { name: /partida da sala/i });
    expect(grid.querySelectorAll("button.board-cell")).toHaveLength(25);
  });

  it("requests a rematch after the match ends", async () => {
    render(
      <I18nProvider initialLocale="pt-BR">
        <App />
      </I18nProvider>
    );

    const createButton = await screen.findByRole("button", { name: /criar sala/i });
    fireEvent.click(createButton);

    await screen.findByText(/^ABCD$/i);
    const socket = MockWebSocket.instances[0];

    socket.emit("message", {
      data: JSON.stringify({
        type: "room.updated",
        payload: {
          code: "ABCD",
          state: "finished",
          mode: "classic-3x3",
          hostGuestId: "guest-test-01",
          playerCount: 2,
          capacity: 2,
          activeMatchId: "match-ended-01",
          expiresAt: "2026-04-03T12:30:00.000Z",
          players: [
            {
              guestId: "guest-test-01",
              symbol: "X",
              joinedAt: "2026-04-03T12:00:00.000Z"
            },
            {
              guestId: "guest-test-02",
              symbol: "O",
              joinedAt: "2026-04-03T12:00:03.000Z"
            }
          ]
        }
      })
    } as MessageEvent);

    socket.emit("message", {
      data: JSON.stringify({
        type: "match.state",
        payload: {
          id: "match-ended-01",
          roomCode: "ABCD",
          mode: "classic-3x3",
          status: "ended",
          boardSize: 3,
          winLength: 3,
          currentTurn: "O",
          turnNumber: 5,
          board: Array.from({ length: 9 }, (_, index) => ({
            index,
            occupant: index < 3 ? "X" : null,
            placedAtTurn: index < 3 ? index + 1 : null
          })),
          players: [
            {
              guestId: "guest-test-01",
              symbol: "X",
              joinedAt: "2026-04-03T12:00:00.000Z"
            },
            {
              guestId: "guest-test-02",
              symbol: "O",
              joinedAt: "2026-04-03T12:00:03.000Z"
            }
          ],
          winner: "X"
        }
      })
    } as MessageEvent);

    const rematchButton = await screen.findByRole("button", { name: /revanche em 1 clique/i });
    fireEvent.click(rematchButton);

    expect(
      await screen.findAllByText(/pedido enviado. aguardando oponente confirmar./i)
    ).toHaveLength(2);
  });
});
