import { useState } from 'react';
import { updateProfile } from '../data/api.ts';
import { errorMessage } from '../data/pocketbase.ts';
import { useAppUser } from '../hooks/auth.tsx';
import { STUDENT_CATEGORY_LABELS, type Role, type StudentCategory } from '../types.ts';
import { Button } from './ui/Button.tsx';
import { CenteredPanel } from './ui/Panel.tsx';
import { ChoiceButton } from './ui/ChoiceButton.tsx';
import { FieldError } from './ui/FieldError.tsx';
import { Heading } from './ui/Heading.tsx';
import { Input } from './ui/Input.tsx';
import { Muted } from './ui/Muted.tsx';

const SELECTABLE_ROLES: { value: Role; label: string; description: string }[] = [
  { value: 'student', label: 'Student', description: 'I compete as a debater' },
  { value: 'parent', label: 'Parent / Judge', description: 'I judge debate rounds' },
];

const CATEGORY_OPTIONS: { value: StudentCategory; description: string }[] = [
  { value: 'speech', description: 'I compete in speech events only' },
  { value: 'tp', description: 'I debate Team Policy' },
  { value: 'ld', description: 'I debate Lincoln-Douglas' },
];

export function ProfileSetup(): React.JSX.Element {
  const me = useAppUser();
  const [name, setName] = useState(me?.name ?? '');
  const [role, setRole] = useState<Role | ''>(me?.role === 'admin' ? '' : (me?.role ?? ''));
  const [category, setCategory] = useState<StudentCategory | ''>(
    me?.category || (me?.role === 'student' ? 'speech' : ''),
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const needsCategory = role === 'student';
  const canSave = Boolean(name.trim() && role && (!needsCategory || category));

  async function save(): Promise<void> {
    if (!name.trim() || !role) return;
    if (role === 'student' && !category) return;
    setLoading(true);
    setError('');
    try {
      await updateProfile(name, role, role === 'student' ? category || undefined : undefined);
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Failed to save profile'));
      setLoading(false);
    }
  }

  function chooseRole(next: Role): void {
    setRole(next);
    if (next === 'student') {
      setCategory((current) => current || 'speech');
    } else {
      setCategory('');
    }
  }

  return (
    <CenteredPanel>
      <div className="text-center">
        <h1 className="text-xl font-bold text-nf-blue dark:text-nf-blue-d mb-1">Welcome!</h1>
        <Muted>Tell us a bit about yourself to get started.</Muted>
      </div>

      <div>
        <label htmlFor="name">Full name</label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          autoFocus
          required
          aria-required="true"
        />
      </div>

      <div>
        <Muted id="role-group-label" className="mb-2 font-semibold">
          I am a…
        </Muted>
        <div role="group" aria-labelledby="role-group-label" className="flex flex-col gap-2">
          {SELECTABLE_ROLES.map((r) => (
            <ChoiceButton
              key={r.value}
              pressed={role === r.value}
              onClick={() => chooseRole(r.value)}
            >
              <Heading as="p" variant="name">
                {r.label}
              </Heading>
              <Muted as="p" size="xs" className="mt-0.5">
                {r.description}
              </Muted>
            </ChoiceButton>
          ))}
        </div>
      </div>

      {needsCategory && (
        <div>
          <Muted id="category-group-label" className="mb-2 font-semibold">
            I compete in…
          </Muted>
          <div role="group" aria-labelledby="category-group-label" className="flex flex-col gap-2">
            {CATEGORY_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.value}
                pressed={category === option.value}
                onClick={() => setCategory(option.value)}
              >
                <Heading as="p" variant="name">
                  {STUDENT_CATEGORY_LABELS[option.value]}
                </Heading>
                <Muted as="p" size="xs" className="mt-0.5">
                  {option.description}
                </Muted>
              </ChoiceButton>
            ))}
          </div>
        </div>
      )}

      {error && <FieldError>{error}</FieldError>}

      <Button fullWidth onClick={() => void save()} disabled={loading || !canSave}>
        {loading ? 'Saving…' : 'Continue'}
      </Button>
    </CenteredPanel>
  );
}
