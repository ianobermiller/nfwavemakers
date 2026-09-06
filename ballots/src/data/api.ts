import type { RecordModel } from 'pocketbase';
import type { Position, Role, Winner } from '../types.ts';
import type {
  AdminDebate,
  Ballot,
  Debate,
  DebateWithBallots,
  SpeakerEval,
  StudentEvaluations,
  User,
} from './model.ts';
import { collections, createRecordId, pb } from './pocketbase.ts';

interface AuthUserRecord extends RecordModel {
  email: string;
}

interface ProfileRecord extends RecordModel {
  archived: boolean;
  avatar: string;
  name: string;
  role: Role | '';
  user: string;
  expand?: {
    user?: AuthUserRecord;
  };
}

interface DebateRecord extends RecordModel {
  aff_team: string[];
  created: string;
  date: string;
  deleted_at: string;
  judges: string[];
  neg_team: string[];
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
  judges: string[];
  negTeam: string[];
  resolution: string;
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
  debateId?: string;
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
    archived: record.archived,
    avatarUrl: record.avatar ? pb.files.getURL(record, record.avatar, { thumb: '100x100' }) : null,
    email: optionalText(record.expand?.user?.email ?? ''),
    name: optionalText(record.name),
    role: record.role || undefined,
  };
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
  let record: ProfileRecord;
  try {
    record = await pb.collection<ProfileRecord>(collections.profiles).getFirstListItem(filter, {
      expand: 'user',
    });
  } catch (error: unknown) {
    if (!isNotFound(error)) throw error;
    try {
      record = await pb
        .collection<ProfileRecord>(collections.profiles)
        .create({ user: authUserId() }, { expand: 'user' });
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
    created: record.created,
    date: record.date,
    resolution: optionalText(record.resolution),
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

async function getDebateOrNull(id: string): Promise<Debate | null> {
  try {
    const record = await pb.collection<DebateRecord>(collections.debates).getOne(id, {
      expand: 'aff_team.user,neg_team.user,judges.user',
    });
    return record.deleted_at ? null : mapDebate(record);
  } catch (error: unknown) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

async function loadBallot(record: BallotRecord): Promise<Ballot> {
  const [debate, evals] = await Promise.all([
    record.debate ? getDebateOrNull(record.debate) : Promise.resolve(null),
    pb.collection<SpeakerEvalRecord>(collections.speakerEvals).getFullList({
      filter: pb.filter('ballot = {:ballot}', { ballot: record.id }),
      expand: 'speaker.user',
      sort: 'position',
    }),
  ]);
  return {
    id: record.id,
    debate,
    judge: record.expand?.judge ? mapUser(record.expand.judge) : null,
    reasonForDecision: optionalText(record.reason_for_decision),
    speakerEvals: evals.map(mapEval),
    submittedAt: record.submitted_at
      ? new Date(record.submitted_at.replace(' ', 'T')).getTime()
      : undefined,
    winner: record.winner || undefined,
  };
}

async function listBallots(filter: string, sort = '-submitted_at'): Promise<Ballot[]> {
  const records = await pb.collection<BallotRecord>(collections.ballots).getFullList({
    filter,
    expand: 'judge.user',
    sort,
  });
  return await Promise.all(records.map(loadBallot));
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

export async function updateProfile(name: string, role: Role): Promise<User> {
  const record = await pb.collection<ProfileRecord>(collections.profiles).update(
    currentUserId(),
    {
      name: name.trim(),
      role,
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

export async function setUserArchived(userId: string, archived: boolean): Promise<void> {
  if (userId === currentUserId()) throw new Error('You cannot archive your own account');
  await pb.collection(collections.profiles).update(userId, { archived });
}

export async function getDebate(debateId: string): Promise<Debate | null> {
  return await getDebateOrNull(debateId);
}

export async function listUpcomingDebates(today: string): Promise<Debate[]> {
  const records = await pb.collection<DebateRecord>(collections.debates).getFullList({
    filter: activeFilter(pb.filter('date >= {:today}', { today })),
    expand: 'aff_team.user,neg_team.user,judges.user',
    sort: 'date,created',
  });
  return records.map(mapDebate);
}

export async function listAssignedDebates(): Promise<Debate[]> {
  const records = await pb.collection<DebateRecord>(collections.debates).getFullList({
    filter: activeFilter(pb.filter('judges ?= {:judge}', { judge: currentUserId() })),
    expand: 'aff_team.user,neg_team.user,judges.user',
    sort: 'date',
  });
  return records.map(mapDebate);
}

export async function listAdminDebates(): Promise<AdminDebate[]> {
  const [debates, ballots] = await Promise.all([
    pb.collection<DebateRecord>(collections.debates).getFullList({
      filter: activeFilter(),
      expand: 'aff_team.user,neg_team.user,judges.user',
      sort: '-created',
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
    judges: input.judges,
    neg_team: input.negTeam,
    resolution: input.resolution.trim(),
    room: input.room.trim(),
  };
  const record = input.debateId
    ? await pb.collection(collections.debates).update(input.debateId, body)
    : await pb.collection(collections.debates).create(body);
  return record.id;
}

export async function softDeleteDebate(debateId: string): Promise<void> {
  const ballots = await pb.collection<BallotRecord>(collections.ballots).getFullList({
    filter: activeFilter(pb.filter('debate = {:debate}', { debate: debateId })),
  });
  const deletedAt = new Date().toISOString();
  const batch = pb.createBatch();
  batch.collection(collections.debates).update(debateId, { deleted_at: deletedAt });
  for (const ballot of ballots) {
    batch.collection(collections.ballots).update(ballot.id, { deleted_at: deletedAt });
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
      expand: 'judge.user',
    });
    return record.deleted_at ? null : await loadBallot(record);
  } catch (error: unknown) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function getDraftForJudge(debateId?: string): Promise<Ballot | null> {
  const debateFilter = debateId
    ? pb.filter('debate = {:debate}', { debate: debateId })
    : 'debate = ""';
  const records = await pb.collection<BallotRecord>(collections.ballots).getList(1, 1, {
    filter: activeFilter(`judge = "${currentUserId()}" && submitted_at = "" && ${debateFilter}`),
    expand: 'judge.user',
  });
  return records.items[0] ? await loadBallot(records.items[0]) : null;
}

export async function listSubmittedByMe(): Promise<Ballot[]> {
  return await listBallots(activeFilter(`judge = "${currentUserId()}" && submitted_at != ""`));
}

export async function listForSpeaker(): Promise<Ballot[]> {
  const evals = await pb.collection<SpeakerEvalRecord>(collections.speakerEvals).getFullList({
    filter: pb.filter('speaker = {:speaker}', { speaker: currentUserId() }),
  });
  const ballotIds = [...new Set(evals.map((evaluation) => evaluation.ballot))];
  const ballots = await Promise.all(ballotIds.map(getBallot));
  return ballots.filter((ballot): ballot is Ballot => ballot?.submittedAt != null);
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
  const [users, evalRecords, ballots] = await Promise.all([
    listUsers(true),
    pb.collection<SpeakerEvalRecord>(collections.speakerEvals).getFullList({
      filter: 'speaker != ""',
      expand: 'speaker.user',
    }),
    listBallots(activeFilter('submitted_at != ""')),
  ]);
  const ballotById = new Map(ballots.map((ballot) => [ballot.id, ballot]));
  return users
    .filter((user) => user.role === 'student')
    .map((student) => ({
      student,
      evals: evalRecords
        .filter((evaluation) => evaluation.speaker === student.id)
        .flatMap((evaluation) => {
          const ballot = ballotById.get(evaluation.ballot);
          return ballot ? [{ eval: mapEval(evaluation), ballot }] : [];
        }),
    }))
    .filter((row) => row.evals.length > 0);
}

export async function listStrandedBallots(): Promise<Ballot[]> {
  return await listBallots(activeFilter('submitted_at != "" && debate = ""'));
}

export async function saveBallot(input: SaveBallotInput): Promise<SavedBallotIds> {
  const ballotId = input.ballotId ?? createRecordId();
  const evalIds: Partial<Record<Position, string>> = {};
  const ballot = {
    debate: input.debateId ?? '',
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
