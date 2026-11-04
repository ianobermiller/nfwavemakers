import { POSITIONS, type Position, type SpeakerFormState, type Winner } from '../types.ts';
import type { BallotFormInit, BallotIds } from '../services/ballot.ts';

const LOCAL_DRAFT_VERSION = 1 as const;

export interface LocalBallotDraft {
  version: typeof LOCAL_DRAFT_VERSION;
  debateId: string | null;
  judgeId: string;
  updatedAt: number;
  ballotId?: string;
  evalIds: Partial<Record<Position, string>>;
  speakers: Record<Position, SpeakerFormState>;
  rankOrder: Position[];
  winner?: Winner;
  rfd: string;
}

export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Memory-backed store for tests; mirrors the localStorage surface. */
export function memoryDraftStorage(seed: Record<string, string> = {}): DraftStorage {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function getLocalStorage(): Storage | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') return null;
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function browserDraftStorage(): DraftStorage {
  return {
    getItem: (key) => getLocalStorage()?.getItem(key) ?? null,
    setItem: (key, value) => {
      getLocalStorage()?.setItem(key, value);
    },
    removeItem: (key) => {
      getLocalStorage()?.removeItem(key);
    },
  };
}

export function localDraftKey(judgeId: string, debateId?: string): string {
  return `ballots:draft:v${LOCAL_DRAFT_VERSION}:${judgeId}:${debateId ?? 'new'}`;
}

function isWinner(value: unknown): value is Winner {
  return value === 'aff' || value === 'neg';
}

function isPosition(value: unknown): value is Position {
  return typeof value === 'string' && (POSITIONS as string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalScore(value: unknown): number | undefined {
  return typeof value === 'number' && value >= 1 && value <= 5 ? value : undefined;
}

function parseSpeaker(value: unknown): SpeakerFormState | null {
  if (!isRecord(value)) return null;
  return {
    userId: typeof value['userId'] === 'string' ? value['userId'] : '',
    delivery: optionalScore(value['delivery']),
    organization: optionalScore(value['organization']),
    evidenceAndSupport: optionalScore(value['evidenceAndSupport']),
    refutation: optionalScore(value['refutation']),
    crossExamination: optionalScore(value['crossExamination']),
    conduct: optionalScore(value['conduct']),
    notes: typeof value['notes'] === 'string' ? value['notes'] : '',
  };
}

export function parseLocalDraft(raw: string | null): LocalBallotDraft | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data)) return null;
    if (data['version'] !== LOCAL_DRAFT_VERSION) return null;
    if (typeof data['judgeId'] !== 'string' || !data['judgeId']) return null;
    if (data['debateId'] !== null && typeof data['debateId'] !== 'string') return null;
    if (typeof data['updatedAt'] !== 'number') return null;
    if (!isRecord(data['speakers'])) return null;

    const speakersIn = data['speakers'];
    const aff1 = parseSpeaker(speakersIn['aff1']);
    const aff2 = parseSpeaker(speakersIn['aff2']);
    const neg1 = parseSpeaker(speakersIn['neg1']);
    const neg2 = parseSpeaker(speakersIn['neg2']);
    if (!aff1 || !aff2 || !neg1 || !neg2) return null;
    const speakers: Record<Position, SpeakerFormState> = { aff1, aff2, neg1, neg2 };

    const rankOrder = Array.isArray(data['rankOrder']) ? data['rankOrder'].filter(isPosition) : [];

    const evalIds: Partial<Record<Position, string>> = {};
    if (isRecord(data['evalIds'])) {
      for (const pos of POSITIONS) {
        const id = data['evalIds'][pos];
        if (typeof id === 'string' && id) evalIds[pos] = id;
      }
    }

    const debateIdValue = data['debateId'];
    const debateId = typeof debateIdValue === 'string' ? debateIdValue : null;
    const ballotId = data['ballotId'];
    const winner = data['winner'];
    const judgeId = data['judgeId'];
    const updatedAt = data['updatedAt'];
    if (typeof judgeId !== 'string' || typeof updatedAt !== 'number') return null;

    return {
      version: LOCAL_DRAFT_VERSION,
      debateId,
      judgeId,
      updatedAt,
      ...(typeof ballotId === 'string' && ballotId ? { ballotId } : {}),
      evalIds,
      speakers,
      rankOrder,
      ...(isWinner(winner) ? { winner } : {}),
      rfd: typeof data['rfd'] === 'string' ? data['rfd'] : '',
    };
  } catch {
    return null;
  }
}

export function readLocalDraft(
  judgeId: string,
  debateId: string | undefined,
  storage: DraftStorage,
): LocalBallotDraft | null {
  return parseLocalDraft(storage.getItem(localDraftKey(judgeId, debateId)));
}

export function writeLocalDraft(draft: LocalBallotDraft, storage: DraftStorage): void {
  storage.setItem(localDraftKey(draft.judgeId, draft.debateId ?? undefined), JSON.stringify(draft));
}

export function clearLocalDraft(
  judgeId: string,
  debateId: string | undefined,
  storage: DraftStorage,
): void {
  storage.removeItem(localDraftKey(judgeId, debateId));
}

export function buildLocalDraft(input: {
  judgeId: string;
  debateId?: string | undefined;
  ids: BallotIds;
  speakers: Record<Position, SpeakerFormState>;
  rankOrder: Position[];
  winner: Winner | undefined;
  rfd: string;
  updatedAt?: number;
}): LocalBallotDraft {
  return {
    version: LOCAL_DRAFT_VERSION,
    debateId: input.debateId ?? null,
    judgeId: input.judgeId,
    updatedAt: input.updatedAt ?? Date.now(),
    ...(input.ids.ballotId ? { ballotId: input.ids.ballotId } : {}),
    evalIds: { ...input.ids.evalIds },
    speakers: structuredClone(input.speakers),
    rankOrder: [...input.rankOrder],
    ...(input.winner ? { winner: input.winner } : {}),
    rfd: input.rfd,
  };
}

/** How much written feedback this draft still holds. */
export function feedbackWeight(speakers: Record<Position, SpeakerFormState>, rfd: string): number {
  let weight = rfd.trim().length;
  for (const pos of POSITIONS) {
    weight += speakers[pos].notes.trim().length;
  }
  return weight;
}

/**
 * Prefer the local draft when it still has written feedback the server copy lost.
 * Scores and ranks ride along so a restored draft matches what the judge last typed.
 */
export function shouldRestoreLocalDraft(server: BallotFormInit, local: LocalBallotDraft): boolean {
  const localWeight = feedbackWeight(local.speakers, local.rfd);
  if (localWeight === 0) return false;
  return localWeight > feedbackWeight(server.speakers, server.rfd);
}

/**
 * Keep notes that the judge already typed when a later payload would wipe them.
 * Matches by speaker id first, then by position slot.
 */
export function preserveNotes(
  previous: Record<Position, SpeakerFormState>,
  next: Record<Position, SpeakerFormState>,
): Record<Position, SpeakerFormState> {
  const notesBySpeaker = new Map<string, string>();
  for (const pos of POSITIONS) {
    const notes = previous[pos].notes;
    if (previous[pos].userId && notes.trim()) {
      notesBySpeaker.set(previous[pos].userId, notes);
    }
  }

  const result = { ...next };
  for (const pos of POSITIONS) {
    const current = result[pos];
    if (current.notes.trim()) continue;
    const fromSpeaker = current.userId ? notesBySpeaker.get(current.userId) : undefined;
    const fromSlot = previous[pos].notes;
    const keep = fromSpeaker ?? (fromSlot.trim() ? fromSlot : '');
    if (keep) result[pos] = { ...current, notes: keep };
  }
  return result;
}

export function applyLocalDraft(server: BallotFormInit, local: LocalBallotDraft): BallotFormInit {
  const evalIds = { ...local.evalIds };
  for (const pos of POSITIONS) {
    if (!evalIds[pos] && server.ids.evalIds[pos]) evalIds[pos] = server.ids.evalIds[pos];
  }

  const ballotId = local.ballotId ?? server.ids.ballotId;
  return {
    speakers: preserveNotes(local.speakers, local.speakers),
    rankOrder: local.rankOrder,
    winner: local.winner ?? server.winner,
    rfd: local.rfd || server.rfd,
    ids: {
      ...(ballotId ? { ballotId } : {}),
      evalIds,
    },
    needsPersist: true,
  };
}

export function restoreBallotFormState(
  server: BallotFormInit,
  judgeId: string,
  debateId: string | undefined,
  storage: DraftStorage,
): { initial: BallotFormInit; restoredFromLocal: boolean } {
  const local = readLocalDraft(judgeId, debateId, storage);
  if (!local || !shouldRestoreLocalDraft(server, local)) {
    return { initial: server, restoredFromLocal: false };
  }
  return { initial: applyLocalDraft(server, local), restoredFromLocal: true };
}
