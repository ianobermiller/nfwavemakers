import { Textarea } from './ui/Textarea.tsx';

interface Props {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

export function AutoTextarea({ id, value, onChange, placeholder }: Props): React.JSX.Element {
  return (
    <Textarea
      id={id}
      className="textarea-autosize"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
    />
  );
}
