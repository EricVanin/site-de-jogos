import { z } from "zod";

export const supportedLocales = ["pt-BR", "en"] as const;
export const gameModes = [
  "classic-3x3",
  "vanishing-tic-tac-toe",
  "powers",
  "board-5x5-win-4",
  "bo5-rotations"
] as const;
export const roomStates = ["waiting", "playing", "finished"] as const;
export const playerSymbols = ["X", "O"] as const;
export const matchStatuses = ["waiting", "in-progress", "ended"] as const;
export const seriesStatuses = ["in-progress", "ended"] as const;
export const powerEffectTypes = ["occupy-empty", "erase-opponent"] as const;
export const powerTargetRules = ["empty-cell", "opponent-cell"] as const;
export const clientEventTypes = [
  "room.join",
  "move.play",
  "power.use",
  "rematch.request"
] as const;
export const serverEventTypes = [
  "room.updated",
  "match.state",
  "move.applied",
  "power.applied",
  "match.ended",
  "series.updated",
  "error.rule_violation"
] as const;
export const publicApiRoutes = [
  "POST /api/guest/session",
  "POST /api/rooms",
  "POST /api/rooms/{code}/join",
  "POST /api/matches/{id}/rematch"
] as const;

export const localeSchema = z.enum(supportedLocales);
export const gameModeSchema = z.enum(gameModes);
export const roomStateSchema = z.enum(roomStates);
export const playerSymbolSchema = z.enum(playerSymbols);
export const matchStatusSchema = z.enum(matchStatuses);
export const seriesStatusSchema = z.enum(seriesStatuses);
export const powerEffectTypeSchema = z.enum(powerEffectTypes);
export const powerTargetRuleSchema = z.enum(powerTargetRules);
export const roomCodeSchema = z
  .string()
  .trim()
  .min(4)
  .max(8)
  .regex(/^[A-Z0-9]+$/);
export const guestIdSchema = z.string().trim().min(8).max(64);
export const matchIdSchema = z.string().trim().min(8).max(64);
export const turnNumberSchema = z.number().int().min(0);
export const isoTimestampSchema = z.string().datetime();

export const apiErrorSchema = z.object({
  code: z.string().trim().min(3).max(40),
  message: z.string().trim().min(3).max(200)
});

export const guestSessionSchema = z.object({
  guestId: guestIdSchema,
  locale: localeSchema
});

export const playerSessionSchema = z.object({
  guestId: guestIdSchema,
  symbol: playerSymbolSchema,
  joinedAt: isoTimestampSchema
});

export const boardCellSchema = z.object({
  index: z.number().int().min(0),
  occupant: playerSymbolSchema.nullable(),
  placedAtTurn: turnNumberSchema.nullable()
});

export const powerCardSchema = z.object({
  cardId: z.string().trim().min(2).max(32),
  effectType: powerEffectTypeSchema,
  targetRule: powerTargetRuleSchema
});

export const matchPowersSchema = z.object({
  enabled: z.boolean(),
  hands: z.object({
    X: z.array(powerCardSchema).max(3),
    O: z.array(powerCardSchema).max(3)
  })
});

export const seriesRoundResultSchema = z.object({
  roundNumber: z.number().int().min(1).max(5),
  mode: gameModeSchema,
  winner: playerSymbolSchema.nullable(),
  matchId: matchIdSchema
});

export const roomSnapshotSchema = z.object({
  code: roomCodeSchema,
  state: roomStateSchema,
  mode: gameModeSchema,
  hostGuestId: guestIdSchema,
  playerCount: z.number().int().min(0).max(2),
  capacity: z.literal(2),
  activeMatchId: matchIdSchema.nullable(),
  expiresAt: isoTimestampSchema,
  players: z.array(playerSessionSchema).max(2)
});

export const matchSnapshotSchema = z.object({
  id: matchIdSchema,
  roomCode: roomCodeSchema,
  mode: gameModeSchema,
  status: matchStatusSchema,
  boardSize: z.number().int().min(3).max(5),
  winLength: z.number().int().min(3).max(4),
  currentTurn: playerSymbolSchema,
  turnNumber: turnNumberSchema,
  board: z.array(boardCellSchema),
  players: z.array(playerSessionSchema).length(2),
  winner: playerSymbolSchema.nullable(),
  powers: matchPowersSchema.nullable()
});

export const createGuestSessionRequestSchema = z.object({
  locale: localeSchema.default("pt-BR")
});

export const createGuestSessionResponseSchema = guestSessionSchema.extend({
  createdAt: isoTimestampSchema
});

export const createRoomRequestSchema = z.object({
  guestId: guestIdSchema,
  locale: localeSchema,
  mode: gameModeSchema
});

export const createRoomResponseSchema = z.object({
  room: roomSnapshotSchema,
  activeMatch: matchSnapshotSchema.nullable()
});

export const joinRoomRequestSchema = z.object({
  guestId: guestIdSchema
});

export const joinRoomResponseSchema = z.object({
  room: roomSnapshotSchema,
  activeMatch: matchSnapshotSchema.nullable()
});

export const rematchRequestSchema = z.object({
  guestId: guestIdSchema
});

export const rematchResponseSchema = z.object({
  accepted: z.boolean(),
  roomCode: roomCodeSchema,
  rematchToken: z.string().trim().min(8).max(64)
});

export const roomJoinEventPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  guestId: guestIdSchema
});

export const movePlayEventPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  matchId: matchIdSchema,
  guestId: guestIdSchema,
  cellIndex: z.number().int().min(0).max(24)
});

export const powerUseEventPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  matchId: matchIdSchema,
  guestId: guestIdSchema,
  cardId: z.string().trim().min(2).max(32),
  targetCellIndex: z.number().int().min(0).optional()
});

export const rematchRequestEventPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  matchId: matchIdSchema,
  guestId: guestIdSchema
});

export const roomUpdatedEventPayloadSchema = roomSnapshotSchema;

export const moveAppliedEventPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  matchId: matchIdSchema,
  symbol: playerSymbolSchema,
  cellIndex: z.number().int().min(0),
  nextTurn: playerSymbolSchema,
  turnNumber: turnNumberSchema,
  removedCellIndex: z.number().int().min(0).max(24).nullable().optional()
});

export const powerAppliedEventPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  matchId: matchIdSchema,
  guestId: guestIdSchema,
  cardId: z.string().trim().min(2).max(32),
  effectType: powerEffectTypeSchema,
  targetCellIndex: z.number().int().min(0).max(24).nullable(),
  nextTurn: playerSymbolSchema,
  turnNumber: turnNumberSchema
});

export const matchEndedEventPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  matchId: matchIdSchema,
  winner: playerSymbolSchema.nullable(),
  reason: z.enum(["win", "draw", "abandon"])
});

export const seriesUpdatedEventPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  bestOf: z.literal(5),
  targetWins: z.literal(3),
  status: seriesStatusSchema,
  score: z.record(playerSymbolSchema, z.number().int().min(0)),
  currentRound: z.number().int().min(1).max(5),
  activeMode: gameModeSchema,
  winner: playerSymbolSchema.nullable(),
  history: z.array(seriesRoundResultSchema).max(5)
});

export const ruleViolationEventPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  code: z.string().trim().min(3).max(40),
  message: z.string().trim().min(3).max(200),
  recoverable: z.boolean()
});

export const clientEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("room.join"),
    payload: roomJoinEventPayloadSchema
  }),
  z.object({
    type: z.literal("move.play"),
    payload: movePlayEventPayloadSchema
  }),
  z.object({
    type: z.literal("power.use"),
    payload: powerUseEventPayloadSchema
  }),
  z.object({
    type: z.literal("rematch.request"),
    payload: rematchRequestEventPayloadSchema
  })
]);

export const serverEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("room.updated"),
    payload: roomUpdatedEventPayloadSchema
  }),
  z.object({
    type: z.literal("match.state"),
    payload: matchSnapshotSchema
  }),
  z.object({
    type: z.literal("move.applied"),
    payload: moveAppliedEventPayloadSchema
  }),
  z.object({
    type: z.literal("power.applied"),
    payload: powerAppliedEventPayloadSchema
  }),
  z.object({
    type: z.literal("match.ended"),
    payload: matchEndedEventPayloadSchema
  }),
  z.object({
    type: z.literal("series.updated"),
    payload: seriesUpdatedEventPayloadSchema
  }),
  z.object({
    type: z.literal("error.rule_violation"),
    payload: ruleViolationEventPayloadSchema
  })
]);

export type SupportedLocale = (typeof supportedLocales)[number];
export type GameMode = (typeof gameModes)[number];
export type RoomState = (typeof roomStates)[number];
export type PlayerSymbol = (typeof playerSymbols)[number];
export type MatchStatus = (typeof matchStatuses)[number];
export type SeriesStatus = (typeof seriesStatuses)[number];
export type PowerEffectType = (typeof powerEffectTypes)[number];
export type PowerTargetRule = (typeof powerTargetRules)[number];
export type ClientEventType = (typeof clientEventTypes)[number];
export type ServerEventType = (typeof serverEventTypes)[number];
export type PublicApiRoute = (typeof publicApiRoutes)[number];
export type ApiError = z.infer<typeof apiErrorSchema>;
export type GuestSession = z.infer<typeof guestSessionSchema>;
export type PlayerSession = z.infer<typeof playerSessionSchema>;
export type PowerCard = z.infer<typeof powerCardSchema>;
export type MatchPowers = z.infer<typeof matchPowersSchema>;
export type SeriesRoundResult = z.infer<typeof seriesRoundResultSchema>;
export type RoomSnapshot = z.infer<typeof roomSnapshotSchema>;
export type MatchSnapshot = z.infer<typeof matchSnapshotSchema>;
export type CreateGuestSessionRequest = z.infer<
  typeof createGuestSessionRequestSchema
>;
export type CreateGuestSessionResponse = z.infer<
  typeof createGuestSessionResponseSchema
>;
export type CreateRoomRequest = z.infer<typeof createRoomRequestSchema>;
export type CreateRoomResponse = z.infer<typeof createRoomResponseSchema>;
export type JoinRoomRequest = z.infer<typeof joinRoomRequestSchema>;
export type JoinRoomResponse = z.infer<typeof joinRoomResponseSchema>;
export type RematchRequest = z.infer<typeof rematchRequestSchema>;
export type RematchResponse = z.infer<typeof rematchResponseSchema>;
export type SeriesSnapshot = z.infer<typeof seriesUpdatedEventPayloadSchema>;
export type ClientEvent = z.infer<typeof clientEventSchema>;
export type ServerEvent = z.infer<typeof serverEventSchema>;
