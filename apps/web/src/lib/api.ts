import {
  apiErrorSchema,
  createGuestSessionResponseSchema,
  createRoomResponseSchema,
  joinRoomResponseSchema,
  rematchResponseSchema,
  type CreateGuestSessionResponse,
  type CreateRoomResponse,
  type GameMode,
  type JoinRoomResponse,
  type RematchResponse,
  type SupportedLocale
} from "@site-de-jogos/shared";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL =
  configuredApiBaseUrl && configuredApiBaseUrl.length > 0
    ? configuredApiBaseUrl.replace(/\/$/, "")
    : window.location.origin;

export class ApiRequestError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  parser: { parse: (value: unknown) => T }
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {})
    }
  });
  const json = await response.json();

  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(json?.error);
    throw parsedError.success
      ? new ApiRequestError(parsedError.data.message, parsedError.data.code, response.status)
      : new ApiRequestError("Request failed.", "REQUEST_FAILED", response.status);
  }

  return parser.parse(json);
}

export function createGuestSession(locale: SupportedLocale) {
  return requestJson<CreateGuestSessionResponse>(
    "/api/guest/session",
    {
      method: "POST",
      body: JSON.stringify({ locale })
    },
    createGuestSessionResponseSchema
  );
}

export function createRoom(guestId: string, locale: SupportedLocale, mode: GameMode) {
  return requestJson<CreateRoomResponse>(
    "/api/rooms",
    {
      method: "POST",
      body: JSON.stringify({ guestId, locale, mode })
    },
    createRoomResponseSchema
  );
}

export function joinRoom(roomCode: string, guestId: string) {
  return requestJson<JoinRoomResponse>(
    `/api/rooms/${roomCode}/join`,
    {
      method: "POST",
      body: JSON.stringify({ guestId })
    },
    joinRoomResponseSchema
  );
}

export function requestRematch(matchId: string, guestId: string) {
  return requestJson<RematchResponse>(
    `/api/matches/${matchId}/rematch`,
    {
      method: "POST",
      body: JSON.stringify({ guestId })
    },
    rematchResponseSchema
  );
}

export function getRealtimeUrl() {
  const apiUrl = new URL(API_BASE_URL);
  apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  apiUrl.pathname = "/ws";
  apiUrl.search = "";
  apiUrl.hash = "";
  return apiUrl.toString();
}
