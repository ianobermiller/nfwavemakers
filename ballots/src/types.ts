export type Role = 'admin' | 'student' | 'parent';
export type Position = 'aff1' | 'aff2' | 'neg1' | 'neg2';
export type Winner = 'aff' | 'neg';

export interface SpeakerScores {
  delivery: number | undefined;
  organization: number | undefined;
  evidenceAndSupport: number | undefined;
  refutation: number | undefined;
  crossExamination: number | undefined;
  conduct: number | undefined;
}

export interface SpeakerFormState extends SpeakerScores {
  userId: string;
  notes: string;
}

export const SCORE_CATEGORIES: Array<{ key: keyof SpeakerScores; label: string }> = [
  { key: 'delivery', label: 'Delivery' },
  { key: 'organization', label: 'Organization' },
  { key: 'evidenceAndSupport', label: 'Evidence & Support' },
  { key: 'refutation', label: 'Refutation' },
  { key: 'crossExamination', label: 'Cross Examination' },
  { key: 'conduct', label: 'Conduct' },
];

export const POSITIONS: Position[] = ['aff1', 'aff2', 'neg1', 'neg2'];

export const POSITION_LABELS: Record<Position, string> = {
  aff1: 'Aff 1st Speaker',
  aff2: 'Aff 2nd Speaker',
  neg1: 'Neg 1st Speaker',
  neg2: 'Neg 2nd Speaker',
};

export const SPEAKER_GUIDE_ROWS: Array<{
  category: string;
  scores: [string, string, string, string, string];
}> = [
  {
    category: 'Delivery',
    scores: [
      'Poor/distracting volume, rate, articulation, gestures, or mannerisms.',
      'Less than ideal rate, volume, flow, articulation/pronunciation; lacks energy/eye contact; may have distracting habits.',
      'Good rate/volume; few articulation issues; some eye contact and energy.',
      'Solid rate, volume, flow, articulation, pronunciation; energetic, professional, engaging.',
      'Exceptionally smooth, engaging, professional; exceptional rate, volume, pronunciation, articulation.',
    ],
  },
  {
    category: 'Organization',
    scores: [
      'Disorganized; evidence presented haphazardly.',
      'Some structure but lacks overall connection between points.',
      'Arguments/evidence follow a general outline.',
      'Good organization of arguments, evidence, and support.',
      'Superior organization of arguments, evidence, and support throughout the round.',
    ],
  },
  {
    category: 'Evidence & Support',
    scores: [
      'Serious omissions, mishandling, or misapplication of evidence/logic.',
      "Noticeable gaps in evidence/logic; support doesn't always relate to the issue.",
      'Most points supported well; some evidence may be confusing or misapplied.',
      'Consistent use of relevant evidence/examples/logic for major points.',
      'Interesting and understandable evidence/reasoning for every major argument.',
    ],
  },
  {
    category: 'Refutation',
    scores: [
      "Consistently misses or ignores opponent's arguments.",
      "Some ability to identify and counter opponent's arguments.",
      'Correctly identifies most opponent arguments; makes reasonable responses.',
      "Quickly makes sense of opponent's arguments; consistently responds with solid argumentation.",
      'Exceptionally skilled at identifying core issues; presents persuasive rebuttals.',
    ],
  },
  {
    category: 'Cross Examination',
    scores: [
      'Unprepared/unwilling; questions/answers vague, unconvincing, or disrespectful.',
      'Not well prepared; questions may confuse or miss the point; answers may be vague.',
      'Asks some good questions, gives effective answers, generally respectful.',
      'Asks probing questions, gives compelling answers, very respectful.',
      'Asks excellent questions that expose/weaken opponent; answers persuasively; always very respectful.',
    ],
  },
  {
    category: 'Conduct',
    scores: [
      'Rude: sarcasm, personal attacks, raised voice, disdainful demeanor, arrogance.',
      'Less than ideal manners; somewhat abrasive.',
      'Generally well-mannered and polite.',
      'Displays proactive courtesy and respect throughout the round.',
      'Exceptionally gracious, winsome, and respectful to all participants.',
    ],
  },
];
