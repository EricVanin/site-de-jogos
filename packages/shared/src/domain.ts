import type {
  ClientEventType,
  GameMode,
  ServerEventType,
  SupportedLocale
} from "./contracts.js";
import { clientEventTypes, publicApiRoutes, serverEventTypes } from "./contracts.js";

export const SUPPORTED_LOCALES: SupportedLocale[] = ["pt-BR", "en"];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  "pt-BR": "Português (Brasil)",
  en: "English"
};

export const GAME_MODE_LABELS: Record<SupportedLocale, Record<GameMode, string>> = {
  "pt-BR": {
    "classic-3x3": "Classico 3x3",
    "vanishing-tic-tac-toe": "Sem Velha",
    powers: "Poderes",
    "board-5x5-win-4": "5x5 vitoria em 4",
    "bo5-rotations": "Rounds BO5"
  },
  en: {
    "classic-3x3": "Classic 3x3",
    "vanishing-tic-tac-toe": "Vanishing Tic-Tac-Toe",
    powers: "Powers",
    "board-5x5-win-4": "5x5 win in 4",
    "bo5-rotations": "BO5 rounds"
  }
};

export const HEALTH_STATUS = {
  ready: "ready"
} as const;

export const PUBLIC_API_ROUTES = [...publicApiRoutes];

export const CLIENT_EVENT_TYPES: ClientEventType[] = [...clientEventTypes];

export const SERVER_EVENT_TYPES: ServerEventType[] = [...serverEventTypes];

export const CONTRACT_VERSION = "2026.04-t13";

export function getGameModeLabel(locale: SupportedLocale, mode: GameMode) {
  return GAME_MODE_LABELS[locale][mode];
}
