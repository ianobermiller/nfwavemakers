import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { navigate } from '@/hooks/useHashRoute.ts';
import type { Debate } from '../data/model.ts';
import { DebateCard } from './DebateCard.tsx';

export interface DebateDeletePayload {
  id: string;
  ballotIds: string[];
  ballotCount: number;
}

export function AdminDebateItem({
  debateId,
  debate,
  onDelete,
}: {
  debateId: string;
  debate?: Debate | undefined;
  onDelete: () => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <DebateCard
          debateId={debateId}
          debate={debate}
          onClick={() => navigate(`admin/${debateId}`)}
        />
      </div>
      <DebateActionsMenu onEdit={() => navigate(`admin/${debateId}`)} onDelete={onDelete} />
    </div>
  );
}

function DebateActionsMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          aria-haspopup="menu"
          aria-label="Debate actions"
          className="shrink-0 p-1.5 rounded-lg text-slate-500 dark:text-slate-400 enabled:hover:bg-slate-100 enabled:dark:hover:bg-slate-700 enabled:hover:text-slate-800 enabled:dark:hover:text-slate-100"
          type="button"
        >
          <KebabIcon />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className="z-50 min-w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden"
          role="menu"
          sideOffset={4}
        >
          <button
            className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 enabled:hover:bg-slate-50 enabled:dark:hover:bg-slate-700"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            role="menuitem"
            type="button"
          >
            Edit
          </button>
          <button
            className="w-full text-left px-3 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 enabled:hover:bg-slate-50 enabled:dark:hover:bg-slate-700"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            role="menuitem"
            type="button"
          >
            Delete
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function UndoDebateRow({
  payload,
  onUndo,
}: {
  payload: DebateDeletePayload;
  onUndo: () => void;
}): React.JSX.Element {
  const ballotNote =
    payload.ballotCount > 0
      ? ` and ${payload.ballotCount} ballot${payload.ballotCount !== 1 ? 's' : ''}`
      : '';
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 dark:text-slate-400">
      <span>Debate{ballotNote} deleted.</span>
      <button
        className="shrink-0 text-nf-blue dark:text-nf-blue-d font-semibold hover:underline cursor-pointer border-none bg-transparent text-sm"
        onClick={onUndo}
        type="button"
      >
        Undo
      </button>
    </div>
  );
}

function KebabIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" className="size-4" fill="currentColor" viewBox="0 0 16 16">
      <circle cx="8" cy="3" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="8" cy="13" r="1.5" />
    </svg>
  );
}
