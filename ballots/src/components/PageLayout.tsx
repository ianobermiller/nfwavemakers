import { AppBar } from './AppBar.tsx';

interface Props {
  children: React.ReactNode;
}

export function PageLayout({ children }: Props): React.JSX.Element {
  return (
    <div className="flex flex-col min-h-screen">
      <AppBar />
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-12">{children}</div>
    </div>
  );
}
