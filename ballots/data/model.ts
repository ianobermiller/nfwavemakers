import type { DebateEvent, Position, Role, StudentCategory, Winner } from '../types.ts';

export interface User {
  id: string;
  approved: boolean;
  archived: boolean;
  avatarUrl: string | null;
  /** Set for students: Speech-only, Team Policy, or Lincoln-Douglas. */
  category?: StudentCategory | undefined;
  email?: string | undefined;
  emailVerified: boolean;
  name?: string | undefined;
  /** True once the person has chosen a sign-in password (not the random code-only one). */
  passwordSet: boolean;
  partnerId?: string | undefined;
  role?: Role | undefined;
}

export interface Debate {
  id: string;
  created: string;
  date: string;
  event: DebateEvent;
  /** Affirmative case for this round (stored as resolution in PocketBase). */
  caseTitle?: string | undefined;
  room: string;
  affTeam: User[];
  negTeam: User[];
  judges: User[];
}

export interface SpeakerEval {
  id: string;
  conduct?: number | undefined;
  crossExamination?: number | undefined;
  delivery?: number | undefined;
  evidenceAndSupport?: number | undefined;
  notes?: string | undefined;
  organization?: number | undefined;
  position: Position;
  rank?: number | undefined;
  refutation?: number | undefined;
  speaker: User | null;
}

export interface Ballot {
  orderConfirmed?: Winner[];
  id: string;
  debate: Debate | null;
  judge: User | null;
  reasonForDecision?: string | undefined;
  speakerEvals: SpeakerEval[];
  submittedAt?: number | undefined;
  winner?: Winner | undefined;
}

export interface DebateWithBallots {
  debate: Debate;
  ballots: Ballot[];
}

export interface AdminDebate extends Debate {
  ballotCount: number;
}

export interface ResultPage<T> {
  items: T[];
  hasMore: boolean;
}

export interface CursorRange<C> {
  after: C | null;
  through: C | null;
}

export interface CursorPage<T, C> extends ResultPage<T> {
  cursor: C | null;
}

export type DebateBallotCursor = Pick<Debate, 'date' | 'id'>;

export interface StudentBallotCursor {
  name: string;
  id: string;
}

export interface DebateBallotSummary {
  debate: Debate;
  ballotCount: number;
}

export interface StudentBallotSummary {
  student: User;
  debateCount: number;
}

export interface Lesson {
  id: string;
  year: number;
  number: number;
  title: string;
  date: string;
  body: string;
  slug: string;
}
