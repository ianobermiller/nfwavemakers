import { useRef } from 'react';
import { useAutosize } from '../hooks/useAutosize.ts';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

export function AutoTextarea({ value, onChange, placeholder }: Props): React.JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutosize(ref, value);
  return (
    <textarea
      ref={ref}
      className="textarea-autosize"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
    />
  );
}
