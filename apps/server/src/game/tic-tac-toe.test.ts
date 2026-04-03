import { describe, expect, it } from "vitest";
import type { MatchSnapshot, PlayerSession } from "@site-de-jogos/shared";
import { applyTicTacToeMove, createTicTacToeMatch } from "./tic-tac-toe.js";

const players: PlayerSession[] = [
  { guestId: "guest-host-01", symbol: "X", joinedAt: "2026-04-03T12:00:00.000Z" },
  { guestId: "guest-join-02", symbol: "O", joinedAt: "2026-04-03T12:00:05.000Z" }
];

describe("tic-tac-toe engines", () => {
  it("rejects moves played out of turn", () => {
    const match = createTicTacToeMatch("classic-3x3", "ABCD", players);
    const result = applyTicTacToeMove(match, "guest-join-02", 0);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected move rejection");
    }

    expect(result.code).toBe("OUT_OF_TURN");
  });

  it("detects a winning line for the classic board", () => {
    let match: MatchSnapshot = createTicTacToeMatch("classic-3x3", "ABCD", players);

    const scriptedMoves = [
      ["guest-host-01", 0],
      ["guest-join-02", 3],
      ["guest-host-01", 1],
      ["guest-join-02", 4],
      ["guest-host-01", 2]
    ] as const;

    let lastResult = null as ReturnType<typeof applyTicTacToeMove> | null;

    for (const [guestId, cellIndex] of scriptedMoves) {
      lastResult = applyTicTacToeMove(match, guestId, cellIndex);
      if (!lastResult.ok) {
        throw new Error(`Expected valid move, got ${lastResult.code}`);
      }
      match = lastResult.match;
    }

    expect(lastResult?.ok).toBe(true);
    if (!lastResult || !lastResult.ok) {
      throw new Error("Expected a completed result");
    }

    expect(lastResult.outcome).toBe("win");
    expect(lastResult.match.winner).toBe("X");
  });

  it("creates the 5x5 mode with victory in 4", () => {
    const match = createTicTacToeMatch("board-5x5-win-4", "ABCD", players);

    expect(match.boardSize).toBe(5);
    expect(match.winLength).toBe(4);
    expect(match.board).toHaveLength(25);
  });

  it("detects a 4-piece line on the 5x5 board", () => {
    let match: MatchSnapshot = createTicTacToeMatch("board-5x5-win-4", "ABCD", players);

    const scriptedMoves = [
      ["guest-host-01", 0],
      ["guest-join-02", 5],
      ["guest-host-01", 1],
      ["guest-join-02", 6],
      ["guest-host-01", 2],
      ["guest-join-02", 7],
      ["guest-host-01", 3]
    ] as const;

    let lastResult = null as ReturnType<typeof applyTicTacToeMove> | null;

    for (const [guestId, cellIndex] of scriptedMoves) {
      lastResult = applyTicTacToeMove(match, guestId, cellIndex);
      if (!lastResult.ok) {
        throw new Error(`Expected valid move, got ${lastResult.code}`);
      }
      match = lastResult.match;
    }

    expect(lastResult?.ok).toBe(true);
    if (!lastResult || !lastResult.ok) {
      throw new Error("Expected a completed 5x5 result");
    }

    expect(lastResult.outcome).toBe("win");
    expect(lastResult.match.winner).toBe("X");
  });

  it("does not produce a false positive with only 3 aligned pieces on 5x5", () => {
    let match: MatchSnapshot = createTicTacToeMatch("board-5x5-win-4", "ABCD", players);

    const scriptedMoves = [
      ["guest-host-01", 0],
      ["guest-join-02", 5],
      ["guest-host-01", 1],
      ["guest-join-02", 6],
      ["guest-host-01", 2]
    ] as const;

    let lastResult = null as ReturnType<typeof applyTicTacToeMove> | null;

    for (const [guestId, cellIndex] of scriptedMoves) {
      lastResult = applyTicTacToeMove(match, guestId, cellIndex);
      if (!lastResult.ok) {
        throw new Error(`Expected valid move, got ${lastResult.code}`);
      }
      match = lastResult.match;
    }

    expect(lastResult?.ok).toBe(true);
    if (!lastResult || !lastResult.ok) {
      throw new Error("Expected an in-progress 5x5 result");
    }

    expect(lastResult.outcome).toBe("in-progress");
    expect(lastResult.match.status).toBe("in-progress");
    expect(lastResult.match.winner).toBeNull();
  });

  it("removes the oldest piece from the same player in Sem Velha", () => {
    let match: MatchSnapshot = createTicTacToeMatch("vanishing-tic-tac-toe", "ABCD", players);

    const scriptedMoves = [
      ["guest-host-01", 0],
      ["guest-join-02", 3],
      ["guest-host-01", 1],
      ["guest-join-02", 4],
      ["guest-host-01", 5],
      ["guest-join-02", 6],
      ["guest-host-01", 2]
    ] as const;

    let lastResult = null as ReturnType<typeof applyTicTacToeMove> | null;

    for (const [guestId, cellIndex] of scriptedMoves) {
      lastResult = applyTicTacToeMove(match, guestId, cellIndex);
      if (!lastResult.ok) {
        throw new Error(`Expected valid move, got ${lastResult.code}`);
      }
      match = lastResult.match;
    }

    expect(lastResult?.ok).toBe(true);
    if (!lastResult || !lastResult.ok) {
      throw new Error("Expected a valid Sem Velha result");
    }

    expect(lastResult.outcome).toBe("in-progress");
    expect(lastResult.move.removedCellIndex).toBe(0);
    expect(lastResult.match.board[0].occupant).toBeNull();
    expect(lastResult.match.board[3].occupant).toBe("O");
    expect(lastResult.match.board[2].occupant).toBe("X");
  });
});
