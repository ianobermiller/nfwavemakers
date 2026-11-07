import type { RecordModel } from 'pocketbase';
import type { DebateEvent, Position, Role, StudentCategory, Winner } from '../types.ts';
import { parseDebateEvent, parseStudentCategory } from '../types.ts';
import type {
  AdminDebate,
  Ballot,
  Debate,
  DebateWithBallots,
  SpeakerEval,
  StudentEvaluations,
  User,
} from './model.ts';
import { fetchBallotRelations, orEqualFilter, uniqueIds } from '../lib/ballotHydrate.ts';
import { debatePartnerUpdates } from '../lib/debatePartners.ts';
import { collections, createRecordId, pb } from './pocketbase.ts';

interface UserRecord extends RecordModel {
  approved?: boolean;
  archived?: boolean;
  avatar: string;
  /** Absent on records written before the category field existed. */
  category?: StudentCategory | '';
  email: string;
  name: string;
  partner?: string;
  password_set?: boolean;
  role?: Role | '';
  verified?: boolean;
}

export interface CreateAccountInput {
  email: string;
  name: string;
  role: Role;
}

export type CreateAccountResult =
  | { status: 'created'; email: string; name: string; role: Role; userId: string }
  | { status: 'linked'; email: string; name: string; role: Role; userId: string }
  | { status: 'skipped'; email: string; name: string; reason: string }
  | { status: 'invalid'; email: string; name: string; reason: string };

interface DebateRecord extends RecordModel {
  aff_team: string[];
  created?: string;
  date: string;
  deleted_at: string;
  /** Absent on records written before the event field existed. */
  event?: DebateEvent | '';
  judges: string[];
  neg_team: string[];
  /** Stored under resolution; the app treats it as the round's affirmative case. */
  resolution: string;
  room: string;
  expand?: {
    aff_team?: UserRecord[];
    judges?: UserRecord[];
    neg_team?: UserRecord[];
  };
}

interface BallotRecord extends RecordModel {
  debate: string;
  deleted_at: string;
  judge: string;
  reason_for_decision: string;
  submitted_at: string;
  winner: Winner | '';
  expand?: {
    judge?: UserRecord;
  };
}

interface SpeakerEvalRecord extends RecordModel {
  ballot: string;
  conduct: number | null;
  cross_examination: number | null;
  delivery: number | null;
  evidence_and_support: number | null;
  notes: string;
  organization: number | null;
  position: Position;
  rank: number | null;
  refutation: number | null;
  speaker: string;
  expand?: {
    speaker?: UserRecord;
  };
}

export interface SaveDebateInput {
  debateId?: string;
  affTeam: string[];
  date: string;
  event: DebateEvent;
  judges: string[];
  negTeam: string[];
  /** Affirmative case for this round. Omitted leaves an existing value unchanged. */
  caseTitle?: string;
  room: string;
}

interface SaveEvalInput {
  conduct?: number;
  crossExamination?: number;
  delivery?: number;
  evalId?: string;
  evidenceAndSupport?: number;
  notes: string;
  organization?: number;
  position: Position;
  rank?: number;
  refutation?: number;
  speakerId?: string;
}

export interface SaveBallotInput {
  ballotId?: string;
  debateId: string;
  evals: SaveEvalInput[];
  reasonForDecision: string;
  submittedAt?: number;
  winner?: Winner;
}

export interface SavedBallotIds {
  ballotId: string;
  evalIds: Partial<Record<Position, string>>;
}

let activeProfile: User | undefined;

function authUserId(): string {
  const id = pb.authStore.record?.id;
  if (!id) throw new Error('Not authenticated');
  return id;
}

function currentUserId(): string {
  if (!activeProfile) throw new Error('Ballots profile not loaded');
  return activeProfile.id;
}

function optionalNumber(value: number | null): number | undefined {
  return value == null || value === 0 ? undefined : value;
}

function optionalText(value: string): string | undefined {
  return value || undefined;
}

function mapUser(record: UserRecord): User {
  return {
    id: record.id,
    approved: record.approved ?? false,
    archived: record.archived ?? false,
    avatarUrl: record.avatar ? pb.files.getURL(record, record.avatar, { thumb: '100x100' }) : null,
    category: parseStudentCategory(record.category),
    email: optionalText(record.email),
    emailVerified: record.verified ?? false,
    name: optionalText(record.name),
    passwordSet: record.password_set ?? false,
    partnerId: optionalText(record.partner ?? ''),
    role: record.role || undefined,
  };
}

/** Full club access requires email verification and admin Approval. */
export function isFullMember(user: User): boolean {
  return user.approved && user.emailVerified;
}

function randomPassword(): string {
  // PocketBase caps password length at 71 characters.
  return (
    crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '').slice(0, 8)
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function clearCurrentUser(): void {
  activeProfile = undefined;
}

export async function loadCurrentUser(): Promise<User | undefined> {
  if (!pb.authStore.isValid) {
    clearCurrentUser();
    return undefined;
  }

  let record: UserRecord;
  try {
    record = await pb.collection<UserRecord>(collections.users).getOne(authUserId());
  } catch (error: unknown) {
    if (!isNotFound(error)) throw error;
    clearCurrentUser();
    return undefined;
  }
  activeProfile = mapUser(record);
  return activeProfile;
}

function mapDebate(record: DebateRecord): Debate {
  return {
    id: record.id,
    created: record.created ?? '',
    date: record.date,
    event: parseDebateEvent(record.event),
    caseTitle: optionalText(record.resolution),
    room: record.room,
    affTeam: (record.expand?.aff_team ?? []).map(mapUser),
    negTeam: (record.expand?.neg_team ?? []).map(mapUser),
    judges: (record.expand?.judges ?? []).map(mapUser),
  };
}

function mapEval(record: SpeakerEvalRecord): SpeakerEval {
  return {
    id: record.id,
    conduct: optionalNumber(record.conduct),
    crossExamination: optionalNumber(record.cross_examination),
    delivery: optionalNumber(record.delivery),
    evidenceAndSupport: optionalNumber(record.evidence_and_support),
    notes: optionalText(record.notes),
    organization: optionalNumber(record.organization),
    position: record.position,
    rank: optionalNumber(record.rank),
    refutation: optionalNumber(record.refutation),
    speaker: record.expand?.speaker ? mapUser(record.expand.speaker) : null,
  };
}

const debateExpand = 'aff_team,neg_team,judges';

async function getDebateOrNull(id: string): Promise<Debate | null> {
  try {
    const record = await pb.collection<DebateRecord>(collections.debates).getOne(id, {
      expand: debateExpand,
    });
    return record.deleted_at ? null : mapDebate(record);
  } catch (error: unknown) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

function ballotFromParts(
  record: BallotRecord,
  debate: Debate | null,
  speakerEvals: SpeakerEval[],
): Ballot {
  return {
    id: record.id,
    debate,
    judge: record.expand?.judge ? mapUser(record.expand.judge) : null,
    reasonForDecision: optionalText(record.reason_for_decision),
    speakerEvals,
    submittedAt: record.submitted_at
      ? new Date(record.submitted_at.replace(' ', 'T')).getTime()
      : undefined,
    winner: record.winner || undefined,
  };
}

async function listDebatesByIds(ids: string[]): Promise<Map<string, Debate>> {
  const filter = orEqualFilter('id', ids, (expr, params) => pb.filter(expr, params));
  if (!filter) return new Map();
  const records = await pb.collection<DebateRecord>(collections.debates).getFullList({
    filter,
    expand: debateExpand,
  });
  const debates = new Map<string, Debate>();
  for (const record of records) {
    if (!record.deleted_at) debates.set(record.id, mapDebate(record));
  }
  return debates;
}

async function listEvalsByBallotIds(ids: string[]): Promise<Map<string, SpeakerEval[]>> {
  const filter = orEqualFilter('ballot', ids, (expr, params) => pb.filter(expr, params));
  if (!filter) return new Map();
  const records = await pb.collection<SpeakerEvalRecord>(collections.speakerEvals).getFullList({
    filter,
    expand: 'speaker',
    sort: 'position',
  });
  const evalsByBallot = new Map<string, SpeakerEval[]>();
  for (const record of records) {
    const list = evalsByBallot.get(record.ballot) ?? [];
    list.push(mapEval(record));
    evalsByBallot.set(record.ballot, list);
  }
  return evalsByBallot;
}

/** Attach debates (and optionally speaker scores) with one query each, not one per ballot. */
async function hydrateBallotRecords(
  records: BallotRecord[],
  includeEvals: boolean,
): Promise<Ballot[]> {
  const { debates, evalsByBallot } = await fetchBallotRelations(
    records.map((record) => record.debate),
    records.map((record) => record.id),
    includeEvals,
    { loadDebates: listDebatesByIds, loadEvals: listEvalsByBallotIds },
  );
  return records.map((record) =>
    ballotFromParts(
      record,
      record.debate ? (debates.get(record.debate) ?? null) : null,
      evalsByBallot.get(record.id) ?? [],
    ),
  );
}

async function listBallots(
  filter: string,
  sort = '-submitted_at',
  options: { includeEvals?: boolean } = {},
): Promise<Ballot[]> {
  const records = await pb.collection<BallotRecord>(collections.ballots).getFullList({
    filter,
    expand: 'judge',
    sort,
  });
  return await hydrateBallotRecords(records, options.includeEvals ?? true);
}

function activeFilter(extra?: string): string {
  return ['deleted_at = ""', extra].filter(Boolean).join(' && ');
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
}

function isConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 400;
}

export async function listUsers(includeArchived = false): Promise<User[]> {
  const records = await pb.collection<UserRecord>(collections.users).getFullList({
    filter: includeArchived ? '' : 'archived = false',
    sort: 'name',
  });
  return records.map(mapUser);
}

/** Name, and category for students. Role is only sent on first signup setup. */
export async function updateProfile(
  name: string,
  role?: Role,
  category?: StudentCategory,
): Promise<User> {
  const record = await pb.collection<UserRecord>(collections.users).update(currentUserId(), {
    name: name.trim(),
    ...(role !== undefined
      ? {
          role,
          // Parents/admins clear category. Students default to speech-only.
          category: role === 'student' ? (category ?? 'speech') : '',
        }
      : category !== undefined
        ? { category }
        : {}),
  });
  activeProfile = mapUser(record);
  window.dispatchEvent(new Event('ballots-profile-changed'));
  return activeProfile;
}

export async function updateAvatar(file: Blob): Promise<User> {
  const form = new FormData();
  form.set('avatar', file, 'avatar.webp');
  const record = await pb.collection<UserRecord>(collections.users).update(currentUserId(), form);
  activeProfile = mapUser(record);
  window.dispatchEvent(new Event('ballots-profile-changed'));
  return activeProfile;
}

export async function setDebatePartner(studentId: string, partnerId: string): Promise<void> {
  const students = (await listUsers(true)).filter((user) => user.role === 'student');
  const updates = debatePartnerUpdates(
    students.map((student) => ({ id: student.id, partnerId: student.partnerId ?? '' })),
    studentId,
    partnerId,
  );
  if (updates.length === 0) return;

  const batch = pb.createBatch();
  for (const update of updates) {
    batch.collection(collections.users).update(update.id, { partner: update.partnerId });
  }
  await batch.send();
}

export async function setUserArchived(userId: string, archived: boolean): Promise<void> {
  if (userId === currentUserId()) throw new Error('You cannot archive your own account');
  await pb.collection(collections.users).update(userId, { archived });
}

/**
 * Club admin Approval. A student with no category is admitted as speech-only.
 * Pass `category` only to fill that default; an existing category is left alone.
 */
export async function approveUser(userId: string, category?: StudentCategory): Promise<void> {
  if (userId === currentUserId()) throw new Error('You cannot approve your own account');
  await pb.collection(collections.users).update(userId, {
    approved: true,
    ...(category ? { category } : {}),
  });
}

/** Club admins edit another member's name, role, and category from Manage Users. */
export async function updateMember(
  userId: string,
  input: { name: string; role: Role; category?: StudentCategory },
): Promise<void> {
  if (userId === currentUserId()) throw new Error('You cannot edit your own account here');
  const name = input.name.trim();
  if (!name) throw new Error('Name is required');
  await pb.collection(collections.users).update(userId, {
    name,
    role: input.role,
    category: input.role === 'student' ? (input.category ?? 'speech') : '',
  });
}

async function findUserByEmail(email: string): Promise<UserRecord | null> {
  try {
    return await pb
      .collection<UserRecord>(collections.users)
      .getFirstListItem(pb.filter('email = {:email}', { email }));
  } catch (error: unknown) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

function isEmailTakenError(error: unknown): boolean {
  if (!isConflict(error) || typeof error !== 'object' || error === null) return false;
  const response = 'response' in error ? error.response : undefined;
  if (!response || typeof response !== 'object') return false;
  const data = 'data' in response ? response.data : undefined;
  if (!data || typeof data !== 'object') return false;
  const email = 'email' in data ? data.email : undefined;
  if (!email || typeof email !== 'object') return false;
  const code = 'code' in email ? email.code : undefined;
  return code === 'validation_not_unique';
}

interface LinkProfileResponse {
  email: string;
  name: string;
  role: Role;
  status: 'created' | 'exists';
  userId: string;
}

/** Fill club fields on a sign-in that does not have a role yet. */
async function linkProfileToExistingAuth(input: CreateAccountInput): Promise<CreateAccountResult> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const role = input.role;
  try {
    const linked = await pb.send<LinkProfileResponse>('/api/ballots/link-profile', {
      method: 'POST',
      body: { email, name, role },
    });
    if (linked.status === 'exists') {
      return { status: 'skipped', email, name, reason: 'Already has an account' };
    }
    return {
      status: 'linked',
      email: linked.email,
      name: linked.name,
      role: linked.role,
      userId: linked.userId,
    };
  } catch (error: unknown) {
    return {
      status: 'invalid',
      email,
      name,
      reason: error instanceof Error ? error.message : 'Could not update the existing account',
    };
  }
}

async function createOneAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const role = input.role;

  if (!name) return { status: 'invalid', email, name: input.name, reason: 'Name is required' };
  if (!isValidEmail(email)) {
    return { status: 'invalid', email: input.email, name, reason: 'Invalid email' };
  }

  const existing = await findUserByEmail(email);
  if (existing && (existing.role || existing.approved)) {
    return { status: 'skipped', email, name, reason: 'Already has an account' };
  }
  if (existing) {
    return await linkProfileToExistingAuth({ email, name, role });
  }

  const password = randomPassword();
  try {
    const authUser = await pb.collection<UserRecord>(collections.users).create({
      email,
      emailVisibility: true,
      password,
      passwordConfirm: password,
      name,
      role,
      ...(role === 'student' ? { category: 'speech' } : {}),
      archived: false,
      approved: true,
    });
    return { status: 'created', email, name, role, userId: authUser.id };
  } catch (error: unknown) {
    if (isEmailTakenError(error)) {
      return await linkProfileToExistingAuth({ email, name, role });
    }
    return {
      status: 'invalid',
      email,
      name,
      reason: error instanceof Error ? error.message : 'Could not create account',
    };
  }
}

/** Create club accounts. Does not send email. Continues after skips. */
export async function createAccounts(inputs: CreateAccountInput[]): Promise<CreateAccountResult[]> {
  const results: CreateAccountResult[] = [];
  for (const input of inputs) {
    results.push(await createOneAccount(input));
  }
  return results;
}

export async function getDebate(debateId: string): Promise<Debate | null> {
  return await getDebateOrNull(debateId);
}

export async function listUpcomingDebates(today: string): Promise<Debate[]> {
  const records = await pb.collection<DebateRecord>(collections.debates).getFullList({
    filter: activeFilter(pb.filter('date >= {:today}', { today })),
    expand: debateExpand,
    // Debates have no autodate `created` field; sort only on columns that exist.
    sort: 'date,id',
  });
  return records.map(mapDebate);
}

export async function listAssignedDebates(): Promise<Debate[]> {
  const records = await pb.collection<DebateRecord>(collections.debates).getFullList({
    // PocketBase needs the relation field: `judges ?= id` matches nothing.
    filter: activeFilter(pb.filter('judges.id ?= {:judge}', { judge: currentUserId() })),
    expand: debateExpand,
    sort: 'date',
  });
  return records.map(mapDebate);
}

export async function listAdminDebates(): Promise<AdminDebate[]> {
  const [debates, ballots] = await Promise.all([
    pb.collection<DebateRecord>(collections.debates).getFullList({
      filter: activeFilter(),
      expand: debateExpand,
      sort: '-date,-id',
    }),
    pb.collection<BallotRecord>(collections.ballots).getFullList({
      filter: activeFilter(),
    }),
  ]);
  return debates.map((record) => {
    const ids = ballots.filter((ballot) => ballot.debate === record.id).map((ballot) => ballot.id);
    return { ...mapDebate(record), ballotCount: ids.length, ballotIds: ids };
  });
}

export async function getDebateCard(
  debateId: string,
  judgeId?: string,
): Promise<{ debate: Debate; winner?: Winner } | null> {
  const debate = await getDebateOrNull(debateId);
  if (!debate) return null;
  if (!judgeId) return { debate };
  const records = await pb.collection<BallotRecord>(collections.ballots).getList(1, 1, {
    filter: activeFilter(
      pb.filter('debate = {:debate} && judge = {:judge}', { debate: debateId, judge: judgeId }),
    ),
  });
  const winner = records.items[0]?.winner;
  return winner ? { debate, winner } : { debate };
}

export async function saveDebate(input: SaveDebateInput): Promise<string> {
  const body = {
    aff_team: input.affTeam,
    date: input.date,
    event: input.event,
    judges: input.judges,
    neg_team: input.negTeam,
    room: input.room.trim(),
    ...(input.caseTitle !== undefined ? { resolution: input.caseTitle.trim() } : {}),
  };
  const record = input.debateId
    ? await pb.collection(collections.debates).update(input.debateId, body)
    : await pb.collection(collections.debates).create(body);
  return record.id;
}

export async function listActiveBallotIdsForDebate(debateId: string): Promise<string[]> {
  const ballots = await pb.collection<BallotRecord>(collections.ballots).getFullList({
    filter: activeFilter(pb.filter('debate = {:debate}', { debate: debateId })),
  });
  return ballots.map((ballot) => ballot.id);
}

export async function softDeleteDebate(debateId: string): Promise<void> {
  const ballotIds = await listActiveBallotIdsForDebate(debateId);
  const deletedAt = new Date().toISOString();
  const batch = pb.createBatch();
  batch.collection(collections.debates).update(debateId, { deleted_at: deletedAt });
  for (const ballotId of ballotIds) {
    batch.collection(collections.ballots).update(ballotId, { deleted_at: deletedAt });
  }
  await batch.send();
}

export async function restoreDebate(debateId: string, ballotIds: string[]): Promise<void> {
  const batch = pb.createBatch();
  batch.collection(collections.debates).update(debateId, { deleted_at: '' });
  for (const ballotId of ballotIds) {
    batch.collection(collections.ballots).update(ballotId, { deleted_at: '' });
  }
  await batch.send();
}

export async function getBallot(ballotId: string): Promise<Ballot | null> {
  try {
    const record = await pb.collection<BallotRecord>(collections.ballots).getOne(ballotId, {
      expand: 'judge',
    });
    if (record.deleted_at) return null;
    const [ballot] = await hydrateBallotRecords([record], true);
    return ballot ?? null;
  } catch (error: unknown) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function getDraftForJudge(debateId: string): Promise<Ballot | null> {
  const records = await pb.collection<BallotRecord>(collections.ballots).getList(1, 1, {
    filter: activeFilter(
      `judge = "${currentUserId()}" && submitted_at = "" && ${pb.filter('debate = {:debate}', { debate: debateId })}`,
    ),
    expand: 'judge',
  });
  if (!records.items[0]) return null;
  const [ballot] = await hydrateBallotRecords([records.items[0]], true);
  return ballot ?? null;
}

export async function listSubmittedByMe(): Promise<Ballot[]> {
  // Dashboard cards only need debate + winner; skip speaker scores.
  return await listBallots(
    activeFilter(`judge = "${currentUserId()}" && submitted_at != ""`),
    '-submitted_at',
    { includeEvals: false },
  );
}

export async function listForSpeaker(): Promise<Ballot[]> {
  const evals = await pb.collection<SpeakerEvalRecord>(collections.speakerEvals).getFullList({
    filter: pb.filter('speaker = {:speaker}', { speaker: currentUserId() }),
  });
  const ballotIds = uniqueIds(evals.map((evaluation) => evaluation.ballot));
  if (ballotIds.length === 0) return [];
  const idFilter = orEqualFilter('id', ballotIds, (expr, params) => pb.filter(expr, params));
  if (!idFilter) return [];
  const records = await pb.collection<BallotRecord>(collections.ballots).getFullList({
    filter: activeFilter(`(${idFilter}) && submitted_at != ""`),
    expand: 'judge',
    sort: '-submitted_at',
  });
  // Feedback list only shows debate + judge names.
  return await hydrateBallotRecords(records, false);
}

export async function getDebateDetail(debateId: string): Promise<DebateWithBallots | null> {
  const debate = await getDebateOrNull(debateId);
  if (!debate) return null;
  const ballots = await listBallots(
    activeFilter(pb.filter('debate = {:debate} && submitted_at != ""', { debate: debateId })),
  );
  return { debate, ballots };
}

export async function listAdminBallotsByDebate(): Promise<DebateWithBallots[]> {
  const debates = await listAdminDebates();
  return await Promise.all(
    debates.map(async (debate) => ({
      debate,
      ballots: await listBallots(
        activeFilter(pb.filter('debate = {:debate} && submitted_at != ""', { debate: debate.id })),
      ),
    })),
  );
}

export async function listAdminBallotsByStudent(): Promise<StudentEvaluations[]> {
  // One batched ballot load already includes speaker scores; reuse them here.
  const [users, ballots] = await Promise.all([
    listUsers(true),
    listBallots(activeFilter('submitted_at != ""')),
  ]);
  return users
    .filter((user) => user.role === 'student')
    .map((student) => ({
      student,
      evals: ballots.flatMap((ballot) =>
        ballot.speakerEvals
          .filter((evaluation) => evaluation.speaker?.id === student.id)
          .map((evaluation) => ({ eval: evaluation, ballot })),
      ),
    }))
    .filter((row) => row.evals.length > 0);
}

export async function listStrandedBallots(): Promise<Ballot[]> {
  return await listBallots(activeFilter('submitted_at != "" && debate = ""'), '-submitted_at', {
    includeEvals: false,
  });
}

export async function saveBallot(input: SaveBallotInput): Promise<SavedBallotIds> {
  if (!input.debateId) {
    throw new Error('A ballot must belong to a debate an admin already created');
  }
  const ballotId = input.ballotId ?? createRecordId();
  const evalIds: Partial<Record<Position, string>> = {};
  const ballot = {
    debate: input.debateId,
    judge: currentUserId(),
    reason_for_decision: input.reasonForDecision.trim(),
    submitted_at: input.submittedAt ? new Date(input.submittedAt).toISOString() : '',
    winner: input.winner ?? '',
  };
  const batch = pb.createBatch();
  if (input.ballotId) {
    batch.collection(collections.ballots).update(ballotId, ballot);
  } else {
    batch.collection(collections.ballots).create({ id: ballotId, ...ballot });
  }
  for (const evaluation of input.evals) {
    const evalId = evaluation.evalId ?? createRecordId();
    evalIds[evaluation.position] = evalId;
    const body = {
      ballot: ballotId,
      conduct: evaluation.conduct ?? null,
      cross_examination: evaluation.crossExamination ?? null,
      delivery: evaluation.delivery ?? null,
      evidence_and_support: evaluation.evidenceAndSupport ?? null,
      notes: evaluation.notes.trim(),
      organization: evaluation.organization ?? null,
      position: evaluation.position,
      rank: evaluation.rank ?? null,
      refutation: evaluation.refutation ?? null,
      speaker: evaluation.speakerId ?? '',
    };
    if (evaluation.evalId) {
      batch.collection(collections.speakerEvals).update(evalId, body);
    } else {
      batch.collection(collections.speakerEvals).create({ id: evalId, ...body });
    }
  }
  await batch.send();
  return { ballotId, evalIds };
}

export async function softDeleteBallot(ballotId: string): Promise<void> {
  await pb.collection(collections.ballots).update(ballotId, {
    deleted_at: new Date().toISOString(),
  });
}

export async function restoreBallot(ballotId: string): Promise<void> {
  await pb.collection(collections.ballots).update(ballotId, { deleted_at: '' });
}
