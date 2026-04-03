import {
  GAME_MODE_LABELS,
  LOCALE_LABELS,
  type GameMode,
  type SupportedLocale
} from "@site-de-jogos/shared";

export type MessageCatalog = {
  phaseEyebrow: string;
  title: string;
  lead: string;
  languageSwitcherLabel: string;
  sessionLoading: string;
  sessionReady: string;
  createRoomTitle: string;
  createRoomBody: string;
  joinRoomTitle: string;
  joinRoomBody: string;
  createRoomButton: string;
  joinRoomButton: string;
  roomCodeLabel: string;
  roomCodePlaceholder: string;
  roomCreatedLabel: string;
  roomStateLabel: string;
  roomPlayersLabel: string;
  realtimeLabel: string;
  waitingTitle: string;
  waitingBody: string;
  matchTitle: string;
  matchStatusInProgress: string;
  matchStatusEnded: string;
  yourSymbolLabel: string;
  turnLabel: string;
  winnerLabel: string;
  drawLabel: string;
  socketConnecting: string;
  socketConnected: string;
  socketDisconnected: string;
  boardHint: string;
  boardHintYourTurn: string;
  boardHintOpponentTurn: string;
  boardHintWaiting: string;
  boardHintEnded: string;
  availableModeLabel: string;
  upcomingModeLabel: string;
  errorPrefix: string;
  localePreferenceTitle: string;
  localePreferenceBody: string;
  guestIdLabel: string;
  rematchButton: string;
  rematchWaiting: string;
  rematchStarting: string;
  localeLabels: Record<SupportedLocale, string>;
  modeLabels: Record<GameMode, string>;
  roomStateLabels: {
    waiting: string;
    playing: string;
    finished: string;
  };
};

type StringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

export const messages = {
  "pt-BR": {
    phaseEyebrow: "Fase 1 em andamento",
    title: "Lobby Multiplayer do Jogo da Velha",
    lead:
      "Sessao guest, sala por codigo, lobby mobile-first e modos 3x3 e 5x5 agora funcionam em tempo real na base do MVP.",
    languageSwitcherLabel: "Idioma",
    sessionLoading: "Criando sua sessao guest...",
    sessionReady: "Sessao pronta para entrar em uma sala.",
    createRoomTitle: "Criar sala",
    createRoomBody:
      "Inicie uma sala em um dos modos ja liberados e compartilhe o codigo com outro jogador.",
    joinRoomTitle: "Entrar por codigo",
    joinRoomBody: "Digite o codigo recebido para entrar na sala e sincronizar a partida.",
    createRoomButton: "Criar sala",
    joinRoomButton: "Entrar na sala",
    roomCodeLabel: "Codigo da sala",
    roomCodePlaceholder: "Ex.: ABCD",
    roomCreatedLabel: "Sala ativa",
    roomStateLabel: "Estado",
    roomPlayersLabel: "Jogadores",
    realtimeLabel: "Realtime",
    waitingTitle: "Aguardando oponente",
    waitingBody: "Assim que o segundo jogador entrar, a partida comeca automaticamente.",
    matchTitle: "Partida da sala",
    matchStatusInProgress: "Em andamento",
    matchStatusEnded: "Encerrada",
    yourSymbolLabel: "Seu simbolo",
    turnLabel: "Vez atual",
    winnerLabel: "Vencedor",
    drawLabel: "Empate",
    socketConnecting: "Conectando ao realtime...",
    socketConnected: "Realtime conectado",
    socketDisconnected: "Realtime desconectado",
    boardHint: "Toque em uma casa livre para jogar.",
    boardHintYourTurn: "Sua vez. Escolha uma casa livre.",
    boardHintOpponentTurn: "Espere a jogada do adversario.",
    boardHintWaiting: "O tabuleiro libera quando os dois jogadores entram na sala.",
    boardHintEnded: "A partida terminou. Toque em revanche para jogar de novo.",
    availableModeLabel: "Disponivel agora",
    upcomingModeLabel: "Nas proximas tasks",
    errorPrefix: "Atencao",
    localePreferenceTitle: "Preferencia de idioma",
    localePreferenceBody: "A interface muda na hora e mantem a escolha no navegador.",
    guestIdLabel: "Guest ID",
    rematchButton: "Revanche em 1 clique",
    rematchWaiting: "Pedido enviado. Aguardando oponente confirmar.",
    rematchStarting: "Revanche confirmada. Reiniciando partida...",
    localeLabels: LOCALE_LABELS,
    modeLabels: GAME_MODE_LABELS["pt-BR"],
    roomStateLabels: {
      waiting: "Aguardando",
      playing: "Em partida",
      finished: "Encerrada"
    }
  },
  en: {
    phaseEyebrow: "Phase 1 in progress",
    title: "Multiplayer Tic-Tac-Toe Lobby",
    lead:
      "Guest session, room code flow, mobile-first lobby, and the released 3x3 and 5x5 modes now run in real time on the MVP foundation.",
    languageSwitcherLabel: "Language",
    sessionLoading: "Creating your guest session...",
    sessionReady: "Session ready to join a room.",
    createRoomTitle: "Create room",
    createRoomBody: "Start a room in one of the released modes and share the code with another player.",
    joinRoomTitle: "Join with code",
    joinRoomBody: "Enter the received code to join the room and sync the match.",
    createRoomButton: "Create room",
    joinRoomButton: "Join room",
    roomCodeLabel: "Room code",
    roomCodePlaceholder: "Example: ABCD",
    roomCreatedLabel: "Active room",
    roomStateLabel: "State",
    roomPlayersLabel: "Players",
    realtimeLabel: "Realtime",
    waitingTitle: "Waiting for opponent",
    waitingBody: "As soon as the second player joins, the match starts automatically.",
    matchTitle: "Current room match",
    matchStatusInProgress: "In progress",
    matchStatusEnded: "Finished",
    yourSymbolLabel: "Your symbol",
    turnLabel: "Current turn",
    winnerLabel: "Winner",
    drawLabel: "Draw",
    socketConnecting: "Connecting to realtime...",
    socketConnected: "Realtime connected",
    socketDisconnected: "Realtime disconnected",
    boardHint: "Tap an empty cell to play.",
    boardHintYourTurn: "Your turn. Pick an empty cell.",
    boardHintOpponentTurn: "Wait for the opponent move.",
    boardHintWaiting: "The board unlocks when both players join the room.",
    boardHintEnded: "The match is over. Tap rematch to play again.",
    availableModeLabel: "Available now",
    upcomingModeLabel: "Coming in next tasks",
    errorPrefix: "Heads up",
    localePreferenceTitle: "Language preference",
    localePreferenceBody: "The interface switches instantly and keeps the choice in the browser.",
    guestIdLabel: "Guest ID",
    rematchButton: "One-click rematch",
    rematchWaiting: "Request sent. Waiting for the opponent to confirm.",
    rematchStarting: "Rematch confirmed. Restarting match...",
    localeLabels: LOCALE_LABELS,
    modeLabels: GAME_MODE_LABELS.en,
    roomStateLabels: {
      waiting: "Waiting",
      playing: "Playing",
      finished: "Finished"
    }
  }
} satisfies Record<SupportedLocale, MessageCatalog>;

export type MessageKey = StringKeys<MessageCatalog>;
