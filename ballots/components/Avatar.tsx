interface Props {
  name: string;
  imageURL?: string | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg' | undefined;
  className?: string | undefined;
}

const SIZE_CLASSES = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-20 h-20 text-2xl',
};

const SIZE_PX = { xs: 20, sm: 32, md: 40, lg: 80 };

// Palette for the initials fallback. Each entry reads well with white text in
// both light and dark mode. A name's color is chosen deterministically so the
// same person keeps the same color everywhere.
const FALLBACK_COLORS = [
  'bg-red-500 dark:bg-red-600',
  'bg-orange-500 dark:bg-orange-600',
  'bg-amber-500 dark:bg-amber-600',
  'bg-green-600 dark:bg-green-700',
  'bg-teal-600 dark:bg-teal-700',
  'bg-cyan-600 dark:bg-cyan-700',
  'bg-blue-600 dark:bg-blue-700',
  'bg-indigo-500 dark:bg-indigo-600',
  'bg-violet-500 dark:bg-violet-600',
  'bg-purple-500 dark:bg-purple-600',
  'bg-pink-500 dark:bg-pink-600',
  'bg-rose-500 dark:bg-rose-600',
];

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function fallbackColor(name: string): string {
  const key = name.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length] ?? 'bg-blue-600 dark:bg-blue-700';
}

export function Avatar({ name, imageURL, size = 'md', className }: Props): React.JSX.Element {
  const sizeClass = SIZE_CLASSES[size];
  const base = `rounded-full shrink-0 overflow-hidden ${sizeClass} ${className ?? ''}`;

  if (imageURL) {
    return (
      <img
        src={imageURL}
        alt={name}
        className={`${base} object-cover`}
        width={SIZE_PX[size]}
        height={SIZE_PX[size]}
      />
    );
  }

  return (
    <div
      className={`${base} ${fallbackColor(name)} flex items-center justify-center font-semibold text-white select-none`}
      aria-label={name}
    >
      {initials(name)}
    </div>
  );
}
