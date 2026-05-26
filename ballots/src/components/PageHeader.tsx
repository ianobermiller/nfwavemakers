interface Props {
  title?: string;
  onBack: () => void;
  action?: React.ReactNode;
}

export function PageHeader({ title, onBack, action }: Props): React.JSX.Element {
  return (
    <div className="bg-nf-blue dark:bg-slate-900 text-white h-14 flex items-center justify-between px-4 sticky top-0 z-10 shadow shrink-0">
      <button
        className="self-stretch flex items-center px-2 text-white/80 hover:text-white cursor-pointer bg-transparent border-none text-sm"
        onClick={onBack}
      >
        ← Back
      </button>
      {title && <span className="font-bold text-base">{title}</span>}
      <div className="w-28 flex justify-end">{action}</div>
    </div>
  );
}
