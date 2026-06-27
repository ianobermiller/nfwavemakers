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

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
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
      className={`${base} bg-nf-blue dark:bg-nf-blue-d flex items-center justify-center font-semibold text-white select-none`}
      aria-label={name}
    >
      {initials(name)}
    </div>
  );
}
