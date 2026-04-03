import { useEffect, useMemo, useRef, useState } from "react";
import {
  type CreateGuestSessionResponse,
  type GameMode,
  type MatchSnapshot,
  type RoomSnapshot,
  type ServerEvent
} from "@site-de-jogos/shared";
import {
  createGuestSession,
  createRoom,
  getRealtimeUrl,
  joinRoom,
  requestRematch
} from "./lib/api";
import { loadGuestSession, saveGuestSession } from "./lib/storage";
import { useI18n } from "./i18n/useI18n";

const MODE_ORDER: GameMode[] = [
  "classic-3x3",
  "vanishing-tic-tac-toe",
  "powers",
  "board-5x5-win-4",
  "bo5-rotations"
];

type SocketStatus = "idle" | "connecting" | "connected" | "disconnected";

function resolveBoardSize(mode: GameMode | null | undefined) {
  return mode === "board-5x5-win-4" ? 5 : 3;
}

export function App() {
  const { locale, messages, setLocale } = useI18n();
  const [guestSession, setGuestSession] = useState<CreateGuestSessionResponse | null>(() =>
    loadGuestSession()
  );
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [match, setMatch] = useState<MatchSnapshot | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode>("classic-3x3");
  const [joinCode, setJoinCode] = useState("");
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAwaitingRematch, setIsAwaitingRematch] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ensureGuestSession() {
      if (guestSession) {
        return;
      }

      try {
        const session = await createGuestSession(locale);
        if (cancelled) {
          return;
        }

        saveGuestSession(session);
        setGuestSession(session);
        setFeedback(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setFeedback(error instanceof Error ? error.message : "Failed to create guest session.");
      }
    }

    void ensureGuestSession();

    return () => {
      cancelled = true;
    };
  }, [guestSession, locale]);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  const myPlayer = useMemo(() => {
    return match?.players.find((player) => player.guestId === guestSession?.guestId) ?? null;
  }, [guestSession?.guestId, match]);

  const boardHint = useMemo(() => {
    if (!room || room.playerCount < 2) {
      return messages.boardHintWaiting;
    }

    if (!match) {
      return messages.socketConnecting;
    }

    if (match.status === "ended") {
      return messages.boardHintEnded;
    }

    if (myPlayer?.symbol === match.currentTurn) {
      return messages.boardHintYourTurn;
    }

    return messages.boardHintOpponentTurn;
  }, [match, messages, myPlayer?.symbol, room]);

  const socketStatusLabel = {
    idle: messages.socketDisconnected,
    connecting: messages.socketConnecting,
    connected: messages.socketConnected,
    disconnected: messages.socketDisconnected
  }[socketStatus];

  const previewBoardSize = match?.boardSize ?? resolveBoardSize(room?.mode ?? selectedMode);
  const renderedBoard =
    match?.board ??
    Array.from({ length: previewBoardSize * previewBoardSize }, (_, index) => ({
      index,
      occupant: null
    }));

  function connectToRoom(nextRoom: RoomSnapshot, nextGuestId: string) {
    socketRef.current?.close();
    const socket = new WebSocket(getRealtimeUrl());
    socketRef.current = socket;
    setSocketStatus("connecting");

    socket.addEventListener("open", () => {
      setSocketStatus("connected");
      socket.send(
        JSON.stringify({
          type: "room.join",
          payload: {
            roomCode: nextRoom.code,
            guestId: nextGuestId
          }
        })
      );
    });

    socket.addEventListener("close", () => {
      setSocketStatus("disconnected");
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data as string) as ServerEvent;

      switch (message.type) {
        case "room.updated":
          setRoom(message.payload);
          return;
        case "match.state":
          setIsAwaitingRematch(false);
          setFeedback(null);
          setMatch(message.payload);
          return;
        case "move.applied":
          setFeedback(null);
          return;
        case "match.ended":
          setFeedback(
            message.payload.winner
              ? `${messages.winnerLabel}: ${message.payload.winner}`
              : messages.drawLabel
          );
          return;
        case "error.rule_violation":
          setFeedback(message.payload.message);
          return;
        default:
          return;
      }
    });
  }

  async function handleCreateRoom() {
    if (!guestSession) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createRoom(guestSession.guestId, locale, selectedMode);
      setRoom(response.room);
      setMatch(response.activeMatch);
      setFeedback(null);
      connectToRoom(response.room, guestSession.guestId);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to create room.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoinRoom() {
    if (!guestSession) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await joinRoom(joinCode.trim().toUpperCase(), guestSession.guestId);
      setRoom(response.room);
      setMatch(response.activeMatch);
      setFeedback(null);
      connectToRoom(response.room, guestSession.guestId);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to join room.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePlay(cellIndex: number) {
    if (!guestSession || !room || !match || socketRef.current?.readyState !== 1) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "move.play",
        payload: {
          roomCode: room.code,
          matchId: match.id,
          guestId: guestSession.guestId,
          cellIndex
        }
      })
    );
  }

  async function handleRequestRematch() {
    if (!guestSession || !match || match.status !== "ended") {
      return;
    }

    try {
      const response = await requestRematch(match.id, guestSession.guestId);
      if (response.accepted) {
        setIsAwaitingRematch(false);
        setFeedback(messages.rematchStarting);
        return;
      }

      setIsAwaitingRematch(true);
      setFeedback(messages.rematchWaiting);
    } catch (error) {
      setIsAwaitingRematch(false);
      setFeedback(error instanceof Error ? error.message : "Unable to request rematch.");
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="topbar">
          <div>
            <p className="eyebrow">{messages.phaseEyebrow}</p>
            <h1>{messages.title}</h1>
          </div>
          <div className="locale-switcher" aria-label={messages.languageSwitcherLabel}>
            {Object.entries(messages.localeLabels).map(([supportedLocale, label]) => (
              <button
                type="button"
                key={supportedLocale}
                className={`locale-button${
                  locale === supportedLocale ? " locale-button-active" : ""
                }`}
                onClick={() => setLocale(supportedLocale as typeof locale)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="lead">{messages.lead}</p>
      </section>

      <section className="grid grid-main">
        <article className="panel panel-highlight">
          <h2>{messages.createRoomTitle}</h2>
          <p className="microcopy">{messages.createRoomBody}</p>
          <div className="mode-list">
            {MODE_ORDER.map((mode) => {
              const available =
                mode === "classic-3x3" ||
                mode === "vanishing-tic-tac-toe" ||
                mode === "board-5x5-win-4";
              return (
                <button
                  type="button"
                  key={mode}
                  className={`mode-card${
                    selectedMode === mode ? " mode-card-active" : ""
                  }${available ? "" : " mode-card-disabled"}`}
                  onClick={() => available && setSelectedMode(mode)}
                  disabled={!available}
                >
                  <strong>{messages.modeLabels[mode]}</strong>
                  <span>{available ? messages.availableModeLabel : messages.upcomingModeLabel}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={handleCreateRoom}
            disabled={!guestSession || isSubmitting}
          >
            {messages.createRoomButton}
          </button>
        </article>

        <article className="panel">
          <h2>{messages.joinRoomTitle}</h2>
          <p className="microcopy">{messages.joinRoomBody}</p>
          <label className="field">
            <span>{messages.roomCodeLabel}</span>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder={messages.roomCodePlaceholder}
              maxLength={8}
            />
          </label>
          <button
            type="button"
            className="primary-button secondary-button"
            onClick={handleJoinRoom}
            disabled={!guestSession || isSubmitting || joinCode.trim().length < 4}
          >
            {messages.joinRoomButton}
          </button>
        </article>

        <article className="panel">
          <h2>{messages.localePreferenceTitle}</h2>
          <p className="microcopy">{messages.localePreferenceBody}</p>
          <div className="status-list">
            <div>
              <span className="status-label">{messages.guestIdLabel}</span>
              <strong>{guestSession?.guestId ?? messages.sessionLoading}</strong>
            </div>
            <div>
              <span className="status-label">{messages.realtimeLabel}</span>
              <strong>{socketStatusLabel}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="grid grid-game">
        <article className="panel">
          <h2>{room ? messages.roomCreatedLabel : messages.waitingTitle}</h2>
          {room ? (
            <div className="status-list">
              <div>
                <span className="status-label">{messages.roomCodeLabel}</span>
                <strong>{room.code}</strong>
              </div>
              <div>
                <span className="status-label">{messages.roomStateLabel}</span>
                <strong>{messages.roomStateLabels[room.state]}</strong>
              </div>
              <div>
                <span className="status-label">{messages.roomPlayersLabel}</span>
                <strong>
                  {room.playerCount}/{room.capacity}
                </strong>
              </div>
            </div>
          ) : (
            <p className="microcopy">{guestSession ? messages.sessionReady : messages.sessionLoading}</p>
          )}
          <p className="microcopy">{room?.playerCount === 2 ? boardHint : messages.waitingBody}</p>
          {feedback ? (
            <p className="feedback">
              {messages.errorPrefix}: {feedback}
            </p>
          ) : null}
        </article>

        <article className="panel panel-board">
          <div className="match-header">
            <div>
              <h2>
                {messages.matchTitle}
                {match ? ` - ${messages.modeLabels[match.mode]}` : ""}
              </h2>
              <p className="microcopy">
                {match?.status === "ended"
                  ? messages.matchStatusEnded
                  : messages.matchStatusInProgress}
              </p>
            </div>
            <div className="badge-column">
              <span className="pill">
                {messages.yourSymbolLabel}: {myPlayer?.symbol ?? "-"}
              </span>
              <span className="pill">
                {messages.turnLabel}: {match?.currentTurn ?? "-"}
              </span>
            </div>
          </div>

          <div
            className="board"
            role="grid"
            aria-label={messages.matchTitle}
            data-size={previewBoardSize}
            style={{
              gridTemplateColumns: `repeat(${previewBoardSize}, minmax(0, 1fr))`
            }}
          >
            {renderedBoard.map((cell) => (
              <button
                type="button"
                key={cell.index}
                className="board-cell"
                onClick={() => handlePlay(cell.index)}
                disabled={
                  !match ||
                  match.status !== "in-progress" ||
                  cell.occupant !== null ||
                  myPlayer?.symbol !== match.currentTurn
                }
              >
                {cell.occupant ?? ""}
              </button>
            ))}
          </div>

          <p className="microcopy">{boardHint}</p>
          {match?.status === "ended" ? (
            <>
              <p className="result-line">
                {messages.winnerLabel}: {match.winner ?? messages.drawLabel}
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={handleRequestRematch}
                disabled={!guestSession || isAwaitingRematch}
              >
                {isAwaitingRematch ? messages.rematchWaiting : messages.rematchButton}
              </button>
            </>
          ) : null}
        </article>
      </section>
    </main>
  );
}
