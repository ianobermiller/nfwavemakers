import { navigate } from '@/hooks/useHashRoute.ts';

interface Props {
  /** Parent path used when this screen was opened directly (no in-app history). */
  to: string;
  label: string;
}

/** Returns to the previous in-app screen, or `to` when the URL was opened directly. */
export function BackLink({ to, label }: Props): React.JSX.Element {
  return (
    <button
      type="button"
      className="mb-3 text-sm font-medium text-nf-blue cursor-pointer border-none bg-transparent p-0 hover:underline dark:text-nf-blue-d"
      onClick={() => {
        const state = history.state;
        if (state && typeof state === 'object' && 'appNav' in state && state.appNav === true) {
          history.back();
          return;
        }
        navigate(to);
      }}
    >
      ← {label}
    </button>
  );
}
