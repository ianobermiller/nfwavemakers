import type { ReactNode } from 'react';
import { Button } from './Button.tsx';
import { Card } from './Card.tsx';

export function UndoNotice({
  children,
  onUndo,
}: {
  children: ReactNode;
  onUndo: () => void;
}): React.JSX.Element {
  return (
    <Card tone="muted" className="flex items-center justify-between gap-3 px-4 py-3">
      <span>{children}</span>
      <Button variant="text" onClick={onUndo}>
        Undo
      </Button>
    </Card>
  );
}
