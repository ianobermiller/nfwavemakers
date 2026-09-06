import type { Position, Role, Winner } from '../types.ts';

export interface User {
  id: string;
  archived: boolean;
  avatarUrl: string | null;
  email?: string | undefined;
  name?: string | undefined;
  role?: Role | undefined;
}

export interface Debate {
  id: string;
  created: string;
  date: string;
  resolution?: string | undefined;
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
  ballotIds: string[];
}

interface StudentEvaluation {
  eval: SpeakerEval;
  ballot: Ballot;
}

export interface StudentEvaluations {
  student: User;
  evals: StudentEvaluation[];
}
