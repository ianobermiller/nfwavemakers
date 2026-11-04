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

interface AuthUserRecord extends RecordModel {
  email: string;
}

interface ProfileRecord extends RecordModel {
  approved?: boolean;
  archived: boolean;
  avatar: string;
  /** Absent on records written before the category field existed. */
  category?: StudentCategory | '';
  email: string;
  email_verified?: boolean;
  name: string;
  partner?: string;
  password_set?: boolean;
  role: Role | '';
  user: string;
  expand?: {
    user?: AuthUserRecord;
  };
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
  /** Absent until autodate fields are added to ballots_debates. */
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
    aff_team?: ProfileRecord[];
    judges?: ProfileRecord[];
    neg_team?: ProfileRecord[];
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
    judge?: ProfileRecord;
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
    speaker?: ProfileRecord;
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

function mapUser(record: ProfileRecord): User {
  return {
    id: record.id,
    approved: record.approved ?? false,
    archived: record.archived,
    avatarUrl: record.avatar ? pb.files.getURL(record, record.avatar, { thumb: '100x100' }) : null,
    category: parseStudentCategory(record.category),
    // Prefer the denormalized profile email: other members' auth emails are not readable.
    email: optionalText(record.email || record.expand?.user?.email || ''),
    emailVerified: record.email_verified ?? false,
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

  const filter = pb.filter('user = {:user}', { user: authUserId() });
  const authEmail = optionalText(
    typeof pb.authStore.record?.['email'] === 'string' ? pb.authStore.record['email'] : '',
  );
  const authVerified = pb.authStore.record?.['verified'] === true;
  let record: ProfileRecord;
  try {
    record = await pb.collection<ProfileRecord>(collections.profiles).getFirstListItem(filter, {
      expand: 'user',
    });
    const patch: { email?: string; email_verified?: boolean } = {};
    if (authEmail && !record.email) patch.email = authEmail;
    // PocketBase may have verified the auth email before the profile hook ran.
    if (authVerified && !record.email_verified) patch.email_verified = true;
    if (Object.keys(patch).length > 0) {
      record = await pb
        .collection<ProfileRecord>(collections.profiles)
        .update(record.id, patch, { expand: 'user' });
    }
  } catch (error: unknown) {
    if (!isNotFound(error)) throw error;
    try {
      // Self-create must omit approved/email_verified (defaults false). Sync
      // email_verified in a follow-up update once PocketBase has verified auth.
      record = await pb.collection<ProfileRecord>(collections.profiles).create(
        {
          user: authUserId(),
          ...(authEmail ? { email: authEmail } : {}),
        },
        { expand: 'user' },
      );
      if (authVerified) {
        record = await pb
          .collection<ProfileRecord>(collections.profiles)
          .update(record.id, { email_verified: true }, { expand: 'user' });
      }
    } catch (createError: unknown) {
      if (!isConflict(createError)) throw createError;
      record = await pb.collection<ProfileRecord>(collections.profiles).getFirstListItem(filter, {
        expand: 'user',
      });
    }
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
  const records = await pb.collection<ProfileRecord>(collections.profiles).getFullList({
    filter: includeArchived ? '' : 'archived = false',
    expand: 'user',
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
  const record = await pb.collection<ProfileRecord>(collections.profiles).update(
    currentUserId(),
    {
      name: name.trim(),
      ...(role !== undefined
        ? {
            role,
            // Parents/admins clear category; students store Speech / TP / LD.
            category: role === 'student' ? (category ?? '') : '',
          }
        : category !== undefined
          ? { category }
          : {}),
    },
    { expand: 'user' },
  );
  activeProfile = mapUser(record);
  window.dispatchEvent(new Event('ballots-profile-changed'));
  return activeProfile;
}

export async function updateAvatar(file: Blob): Promise<User> {
  const form = new FormData();
  form.set('avatar', file, 'avatar.webp');
  const record = await pb
    .collection<ProfileRecord>(collections.profiles)
    .update(currentUserId(), form, { expand: 'user' });
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
    batch.collection(collections.profiles).update(update.id, { partner: update.partnerId });
  }
  await batch.send();
}

export async function setUserArchived(userId: string, archived: boolean): Promise<void> {
  if (userId === currentUserId()) throw new Error('You cannot archive your own account');
  await pb.collection(collections.profiles).update(userId, { archived });
}

/** Club admin Approval — admits a pending signup into the club. */
export async function approveUser(
  userId: string,
  options: { role: 'student' | 'parent'; category?: StudentCategory },
): Promise<void> {
  if (userId === currentUserId()) throw new Error('You cannot approve your own account');
  await pb.collection(collections.profiles).update(userId, {
    approved: true,
    role: options.role,
    category: options.role === 'student' ? (options.category ?? '') : '',
  });
}

/** Admin sets (or clears) a student's Speech / TP / LD category. */
export async function setStudentCategory(
  userId: string,
  category: StudentCategory | '',
): Promise<void> {
  await pb.collection(collections.profiles).update(userId, { category });
}

/** Club admins set another member's role. Self-service cannot change role after signup. */
export async function setUserRole(userId: string, role: Role): Promise<void> {
  if (userId === currentUserId()) throw new Error('You cannot change your own role');
  await pb.collection(collections.profiles).update(userId, {
    role,
    // Leaving student drops Speech / TP / LD. Staying a student keeps the category.
    ...(role === 'student' ? {} : { category: '' }),
  });
}

async function profileExistsForEmail(email: string): Promise<boolean> {
  try {
    await pb
      .collection(collections.profiles)
      .getFirstListItem(pb.filter('email = {:email}', { email }));
    return true;
  } catch (error: unknown) {
    if (isNotFound(error)) return false;
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

/** Attach a ballots profile to an auth user the SPA cannot look up (users view rule). */
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
      return { status: 'skipped', email, name, reason: 'Already has a ballots profile' };
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
      reason: error instanceof Error ? error.message : 'Could not link profile to existing account',
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

  if (await profileExistsForEmail(email)) {
    return { status: 'skipped', email, name, reason: 'Already has a ballots profile' };
  }

  const password = randomPassword();
  let authUserId: string;
  try {
    const authUser = await pb.collection(collections.authUsers).create({
      email,
      password,
      passwordConfirm: password,
    });
    authUserId = authUser.id;
  } catch (error: unknown) {
    if (isEmailTakenError(error)) {
      // Auth account already exists (often from another app on the shared users
      // collection). Link a ballots profile to that record instead of skipping.
      return await linkProfileToExistingAuth({ email, name, role });
    }
    return {
      status: 'invalid',
      email,
      name,
      reason: error instanceof Error ? error.message : 'Could not create auth user',
    };
  }

  try {
    const profile = await pb.collection<ProfileRecord>(collections.profiles).create({
      user: authUserId,
      name,
      email,
      role,
      archived: false,
      approved: true,
      email_verified: true,
    });
    return { status: 'created', email, name, role, userId: profile.id };
  } catch (error: unknown) {
    // Auth user was created; leave it so a retry can attach a profile, but surface the failure.
    return {
      status: 'invalid',
      email,
      name,
      reason: error instanceof Error ? error.message : 'Could not create profile',
    };
  }
}

/** Create auth users + ballots profiles. Does not send email. Continues after skips. */
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
