import { randomUUID } from "node:crypto";
import type {
  GameMode,
  MatchPowers,
  MatchSnapshot,
  PlayerSession,
  PlayerSymbol,
  PowerCard
} from "@site-de-jogos/shared";

type SupportedMatchMode = Extract<
  GameMode,
  "classic-3x3" | "vanishing-tic-tac-toe" | "powers" | "board-5x5-win-4"
>;

type MoveResult =
  | {
      ok: true;
      match: MatchSnapshot;
      move: {
        symbol: PlayerSymbol;
        cellIndex: number;
        nextTurn: PlayerSymbol;
        turnNumber: number;
        removedCellIndex: number | null;
      };
      outcome: "in-progress" | "win" | "draw";
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

type PowerResult =
  | {
      ok: true;
      match: MatchSnapshot;
      power: {
        guestId: string;
        cardId: string;
        effectType: PowerCard["effectType"];
        targetCellIndex: number;
        nextTurn: PlayerSymbol;
        turnNumber: number;
      };
      outcome: "in-progress" | "win" | "draw";
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

const WIN_DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1]
] as const;

const MATCH_MODE_CONFIG: Record<
  SupportedMatchMode,
  {
    boardSize: number;
    winLength: number;
  }
> = {
  "classic-3x3": {
    boardSize: 3,
    winLength: 3
  },
  "vanishing-tic-tac-toe": {
    boardSize: 3,
    winLength: 3
  },
  powers: {
    boardSize: 3,
    winLength: 3
  },
  "board-5x5-win-4": {
    boardSize: 5,
    winLength: 4
  }
};

const POWER_CATALOG = [
  {
    effectType: "occupy-empty",
    targetRule: "empty-cell"
  },
  {
    effectType: "erase-opponent",
    targetRule: "opponent-cell"
  }
] satisfies Array<Pick<PowerCard, "effectType" | "targetRule">>;

function createBoard(size: number) {
  return Array.from({ length: size * size }, (_, index) => ({
    index,
    occupant: null,
    placedAtTurn: null
  }));
}

function otherSymbol(symbol: PlayerSymbol): PlayerSymbol {
  return symbol === "X" ? "O" : "X";
}

function createInitialPowers(roomCode: string): MatchPowers {
  const roomSeed = roomCode.split("").reduce((total, character) => total + character.charCodeAt(0), 0);

  const createHand = (symbol: PlayerSymbol) =>
    Array.from({ length: 3 }, (_, index) => {
      const catalogIndex = (roomSeed + index + (symbol === "X" ? 0 : 1)) % POWER_CATALOG.length;
      const template = POWER_CATALOG[catalogIndex];

      return {
        cardId: `${symbol.toLowerCase()}-${index + 1}`,
        effectType: template.effectType,
        targetRule: template.targetRule
      } satisfies PowerCard;
    });

  return {
    enabled: true,
    hands: {
      X: createHand("X"),
      O: createHand("O")
    }
  };
}

function resolvePlayerSymbol(players: PlayerSession[], guestId: string) {
  return players.find((player) => player.guestId === guestId)?.symbol ?? null;
}

function isBoardFull(match: MatchSnapshot) {
  return match.board.every((cell) => cell.occupant !== null);
}

function hasWinningLine(
  board: MatchSnapshot["board"],
  boardSize: number,
  winLength: number,
  symbol: PlayerSymbol
) {
  const readCell = (row: number, column: number) => {
    if (row < 0 || row >= boardSize || column < 0 || column >= boardSize) {
      return null;
    }

    return board[row * boardSize + column];
  };

  for (let row = 0; row < boardSize; row += 1) {
    for (let column = 0; column < boardSize; column += 1) {
      for (const [dx, dy] of WIN_DIRECTIONS) {
        let streak = 0;

        for (let step = 0; step < winLength; step += 1) {
          const cell = readCell(row + dy * step, column + dx * step);

          if (cell?.occupant !== symbol) {
            break;
          }

          streak += 1;
        }

        if (streak === winLength) {
          return true;
        }
      }
    }
  }

  return false;
}

function createMatchBase(mode: SupportedMatchMode, roomCode: string, players: PlayerSession[]) {
  const config = MATCH_MODE_CONFIG[mode];

  return {
    id: `match-${randomUUID().replaceAll("-", "").slice(0, 12)}`,
    roomCode,
    mode,
    status: "in-progress",
    boardSize: config.boardSize,
    winLength: config.winLength,
    currentTurn: "X",
    turnNumber: 0,
    board: createBoard(config.boardSize),
    players: players
      .slice()
      .sort((left, right) => Number(right.symbol === "X") - Number(left.symbol === "X")),
    winner: null,
    powers: mode === "powers" ? createInitialPowers(roomCode) : null
  } satisfies MatchSnapshot;
}

export function createTicTacToeMatch(
  mode: SupportedMatchMode,
  roomCode: string,
  players: PlayerSession[]
) {
  return createMatchBase(mode, roomCode, players);
}

function maybeRemoveOldestOwnPiece(
  match: MatchSnapshot,
  symbol: PlayerSymbol
): { board: MatchSnapshot["board"]; removedCellIndex: number | null } {
  if (match.mode !== "vanishing-tic-tac-toe") {
    return {
      board: match.board,
      removedCellIndex: null
    };
  }

  const occupiedByPlayer = match.board
    .filter((cell) => cell.occupant === symbol && cell.placedAtTurn !== null)
    .sort((left, right) => (left.placedAtTurn ?? 0) - (right.placedAtTurn ?? 0));

  if (occupiedByPlayer.length <= 3) {
    return {
      board: match.board,
      removedCellIndex: null
    };
  }

  const oldestPiece = occupiedByPlayer[0];
  return {
    board: match.board.map((cell) =>
      cell.index === oldestPiece.index
        ? {
            ...cell,
            occupant: null,
            placedAtTurn: null
          }
        : cell
    ),
    removedCellIndex: oldestPiece.index
  };
}

export function applyTicTacToeMove(
  currentMatch: MatchSnapshot,
  guestId: string,
  cellIndex: number
): MoveResult {
  if (
    currentMatch.mode !== "classic-3x3" &&
    currentMatch.mode !== "vanishing-tic-tac-toe" &&
    currentMatch.mode !== "powers" &&
    currentMatch.mode !== "board-5x5-win-4"
  ) {
    return {
      ok: false,
      code: "MODE_NOT_READY",
      message: "Only classic 3x3, Sem Velha, powers, and 5x5 win in 4 are supported in the current phase."
    };
  }

  if (currentMatch.status !== "in-progress") {
    return {
      ok: false,
      code: "MATCH_ENDED",
      message: "The match has already ended."
    };
  }

  const playerSymbol = resolvePlayerSymbol(currentMatch.players, guestId);
  if (!playerSymbol) {
    return {
      ok: false,
      code: "PLAYER_NOT_IN_MATCH",
      message: "The guest is not part of this match."
    };
  }

  if (playerSymbol !== currentMatch.currentTurn) {
    return {
      ok: false,
      code: "OUT_OF_TURN",
      message: "It is not this player's turn."
    };
  }

  const targetCell = currentMatch.board[cellIndex];
  if (!targetCell) {
    return {
      ok: false,
      code: "CELL_OUT_OF_RANGE",
      message: "The selected cell does not exist on the board."
    };
  }

  if (targetCell.occupant) {
    return {
      ok: false,
      code: "CELL_OCCUPIED",
      message: "The selected cell is already occupied."
    };
  }

  const nextTurn = otherSymbol(playerSymbol);
  const nextTurnNumber = currentMatch.turnNumber + 1;
  const placedBoard = currentMatch.board.map((cell) =>
    cell.index === cellIndex
      ? {
          ...cell,
          occupant: playerSymbol,
          placedAtTurn: nextTurnNumber
        }
      : cell
  );

  const placementMatch: MatchSnapshot = {
    ...currentMatch,
    board: placedBoard,
    currentTurn: nextTurn,
    turnNumber: nextTurnNumber
  };

  const { board: normalizedBoard, removedCellIndex } = maybeRemoveOldestOwnPiece(
    placementMatch,
    playerSymbol
  );

  const updatedMatch: MatchSnapshot = {
    ...placementMatch,
    board: normalizedBoard
  };

  if (
    hasWinningLine(
      updatedMatch.board,
      updatedMatch.boardSize,
      updatedMatch.winLength,
      playerSymbol
    )
  ) {
    return {
      ok: true,
      match: {
        ...updatedMatch,
        status: "ended",
        winner: playerSymbol
      },
      move: {
        symbol: playerSymbol,
        cellIndex,
        nextTurn,
        turnNumber: nextTurnNumber,
        removedCellIndex
      },
      outcome: "win"
    };
  }

  if (currentMatch.mode !== "vanishing-tic-tac-toe" && isBoardFull(updatedMatch)) {
    return {
      ok: true,
      match: {
        ...updatedMatch,
        status: "ended",
        winner: null
      },
      move: {
        symbol: playerSymbol,
        cellIndex,
        nextTurn,
        turnNumber: nextTurnNumber,
        removedCellIndex
      },
      outcome: "draw"
    };
  }

  return {
    ok: true,
    match: updatedMatch,
    move: {
      symbol: playerSymbol,
      cellIndex,
      nextTurn,
      turnNumber: nextTurnNumber,
      removedCellIndex
    },
    outcome: "in-progress"
  };
}

export function applyPowerCard(
  currentMatch: MatchSnapshot,
  guestId: string,
  cardId: string,
  targetCellIndex?: number
): PowerResult {
  if (currentMatch.mode !== "powers" || !currentMatch.powers?.enabled) {
    return {
      ok: false,
      code: "MODE_NOT_READY",
      message: "Powers can only be used in powers matches."
    };
  }

  if (currentMatch.status !== "in-progress") {
    return {
      ok: false,
      code: "MATCH_ENDED",
      message: "The match has already ended."
    };
  }

  const playerSymbol = resolvePlayerSymbol(currentMatch.players, guestId);
  if (!playerSymbol) {
    return {
      ok: false,
      code: "PLAYER_NOT_IN_MATCH",
      message: "The guest is not part of this match."
    };
  }

  if (playerSymbol !== currentMatch.currentTurn) {
    return {
      ok: false,
      code: "OUT_OF_TURN",
      message: "It is not this player's turn."
    };
  }

  const hand = currentMatch.powers.hands[playerSymbol];
  const card = hand.find((entry) => entry.cardId === cardId);
  if (!card) {
    return {
      ok: false,
      code: "CARD_NOT_AVAILABLE",
      message: "The selected power card is not available in the player's hand."
    };
  }

  if (targetCellIndex === undefined) {
    return {
      ok: false,
      code: "POWER_TARGET_REQUIRED",
      message: "This power requires a board target."
    };
  }

  const targetCell = currentMatch.board[targetCellIndex];
  if (!targetCell) {
    return {
      ok: false,
      code: "CELL_OUT_OF_RANGE",
      message: "The selected cell does not exist on the board."
    };
  }

  const opponentSymbol = otherSymbol(playerSymbol);
  let nextBoard = currentMatch.board;

  if (card.effectType === "occupy-empty") {
    if (targetCell.occupant !== null) {
      return {
        ok: false,
        code: "POWER_TARGET_INVALID",
        message: "This power can only target an empty cell."
      };
    }

    nextBoard = currentMatch.board.map((cell) =>
      cell.index === targetCellIndex
        ? {
            ...cell,
            occupant: playerSymbol,
            placedAtTurn: currentMatch.turnNumber + 1
          }
        : cell
    );
  } else {
    if (targetCell.occupant !== opponentSymbol) {
      return {
        ok: false,
        code: "POWER_TARGET_INVALID",
        message: "This power can only target an opponent piece."
      };
    }

    nextBoard = currentMatch.board.map((cell) =>
      cell.index === targetCellIndex
        ? {
            ...cell,
            occupant: null,
            placedAtTurn: null
          }
        : cell
    );
  }

  const nextTurn = otherSymbol(playerSymbol);
  const nextTurnNumber = currentMatch.turnNumber + 1;
  const updatedMatch: MatchSnapshot = {
    ...currentMatch,
    board: nextBoard,
    currentTurn: nextTurn,
    turnNumber: nextTurnNumber,
    powers: {
      ...currentMatch.powers,
      hands: {
        ...currentMatch.powers.hands,
        [playerSymbol]: hand.filter((entry) => entry.cardId !== card.cardId)
      }
    }
  };

  if (
    hasWinningLine(
      updatedMatch.board,
      updatedMatch.boardSize,
      updatedMatch.winLength,
      playerSymbol
    )
  ) {
    return {
      ok: true,
      match: {
        ...updatedMatch,
        status: "ended",
        winner: playerSymbol
      },
      power: {
        guestId,
        cardId: card.cardId,
        effectType: card.effectType,
        targetCellIndex,
        nextTurn,
        turnNumber: nextTurnNumber
      },
      outcome: "win"
    };
  }

  if (isBoardFull(updatedMatch)) {
    return {
      ok: true,
      match: {
        ...updatedMatch,
        status: "ended",
        winner: null
      },
      power: {
        guestId,
        cardId: card.cardId,
        effectType: card.effectType,
        targetCellIndex,
        nextTurn,
        turnNumber: nextTurnNumber
      },
      outcome: "draw"
    };
  }

  return {
    ok: true,
    match: updatedMatch,
    power: {
      guestId,
      cardId: card.cardId,
      effectType: card.effectType,
      targetCellIndex,
      nextTurn,
      turnNumber: nextTurnNumber
    },
    outcome: "in-progress"
  };
}
