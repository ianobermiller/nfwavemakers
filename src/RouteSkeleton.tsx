type SkeletonKind = 'dashboard' | 'detail' | 'list' | 'lessons' | 'lesson';

function skeletonKind(path: string): SkeletonKind {
  const [segment, param = ''] = path.split('/');
  if (segment === 'lessons' && !param) return 'lessons';
  if (segment === 'lessons') return 'lesson';
  if (segment === 'admin' && param) return 'detail';
  if (segment === 'admin' || segment === 'admin-ballots' || segment === 'admin-users')
    return 'list';
  if (
    segment === 'ballot' ||
    segment === 'debate' ||
    segment === 'judge' ||
    segment === 'profile'
  ) {
    return 'detail';
  }
  return 'dashboard';
}

function Block({
  className,
  tone = 'slate',
}: {
  className: string;
  tone?: 'slate' | 'on-blue';
}): React.JSX.Element {
  const color = tone === 'on-blue' ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-700';
  return <div className={`rounded-md ${color} ${className}`} />;
}

function Card({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
      {children}
    </div>
  );
}

function DashboardSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <Block className="mb-3 h-5 w-40" />
        <div className="flex flex-col gap-3">
          <Card>
            <Block className="h-4 w-28" />
            <Block className="mt-2 h-3 w-56" />
            <Block className="mt-2 h-3 w-24" />
          </Card>
          <Card>
            <Block className="h-4 w-32" />
            <Block className="mt-2 h-3 w-48" />
            <Block className="mt-2 h-3 w-20" />
          </Card>
        </div>
      </section>
      <section>
        <Block className="mb-3 h-5 w-32" />
        <div className="flex flex-col gap-3">
          <Card>
            <Block className="h-4 w-36" />
            <Block className="mt-2 h-3 w-44" />
          </Card>
          <Card>
            <Block className="h-4 w-40" />
            <Block className="mt-2 h-3 w-28" />
          </Card>
        </div>
      </section>
    </div>
  );
}

function DetailSkeleton(): React.JSX.Element {
  return (
    <div>
      <Block className="mb-4 h-4 w-24" />
      <Block className="mb-4 h-5 w-64" />
      <Card>
        <Block className="h-3 w-40" />
        <Block className="mt-2 h-3 w-28" />
        <Block className="mt-2 h-3 w-full" />
      </Card>
      <div className="mt-6 flex flex-col gap-3">
        <Card>
          <Block className="h-4 w-32" />
          <Block className="mt-3 h-3 w-full" />
          <Block className="mt-2 h-3 w-5/6" />
          <Block className="mt-2 h-3 w-2/3" />
        </Card>
        <Card>
          <Block className="h-4 w-36" />
          <Block className="mt-3 h-3 w-full" />
          <Block className="mt-2 h-3 w-4/5" />
        </Card>
      </div>
    </div>
  );
}

function ListSkeleton(): React.JSX.Element {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Block className="h-6 w-40" />
        <Block className="h-9 w-20" />
      </div>
      <div className="flex flex-col gap-3">
        <Card>
          <Block className="h-4 w-48" />
          <Block className="mt-2 h-3 w-32" />
        </Card>
        <Card>
          <Block className="h-4 w-40" />
          <Block className="mt-2 h-3 w-36" />
        </Card>
        <Card>
          <Block className="h-4 w-52" />
          <Block className="mt-2 h-3 w-28" />
        </Card>
        <Card>
          <Block className="h-4 w-36" />
          <Block className="mt-2 h-3 w-44" />
        </Card>
      </div>
    </div>
  );
}

function LessonsSkeleton(): React.JSX.Element {
  return (
    <>
      <div className="bg-gradient-to-br from-nf-blue to-nf-blue-mid px-5 py-14 text-center">
        <Block className="mx-auto h-10 w-48" tone="on-blue" />
        <Block className="mx-auto mt-3 h-4 w-72" tone="on-blue" />
      </div>
      <section className="px-5 py-16">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          <Card>
            <Block className="h-3 w-40" />
            <Block className="mt-2 h-5 w-64" />
          </Card>
          <Card>
            <Block className="h-3 w-36" />
            <Block className="mt-2 h-5 w-56" />
          </Card>
          <Card>
            <Block className="h-3 w-44" />
            <Block className="mt-2 h-5 w-60" />
          </Card>
        </div>
      </section>
    </>
  );
}

function LessonSkeleton(): React.JSX.Element {
  return (
    <>
      <div className="bg-gradient-to-br from-nf-blue to-nf-blue-mid px-5 py-14 text-center">
        <Block className="mx-auto h-3 w-40" tone="on-blue" />
        <Block className="mx-auto mt-3 h-10 w-80 max-w-full" tone="on-blue" />
        <Block className="mx-auto mt-3 h-4 w-56" tone="on-blue" />
      </div>
      <section className="px-5 py-16">
        <div className="mx-auto max-w-3xl">
          <Block className="h-4 w-full" />
          <Block className="mt-3 h-4 w-11/12" />
          <Block className="mt-3 h-4 w-4/5" />
          <Block className="mt-8 h-5 w-48" />
          <Block className="mt-3 h-4 w-full" />
          <Block className="mt-3 h-4 w-10/12" />
          <Block className="mt-3 h-4 w-3/4" />
        </div>
      </section>
    </>
  );
}

function skeletonBody(kind: SkeletonKind): React.JSX.Element {
  if (kind === 'lessons') return <LessonsSkeleton />;
  if (kind === 'lesson') return <LessonSkeleton />;
  if (kind === 'detail') return <DetailSkeleton />;
  if (kind === 'list') return <ListSkeleton />;
  return <DashboardSkeleton />;
}

/** Placeholder for a cold load, when there is no previous screen to keep visible. */
export function RouteSkeleton({ path }: { path: string }): React.JSX.Element {
  const kind = skeletonKind(path);
  const framed = kind !== 'lessons' && kind !== 'lesson';
  return (
    <div aria-busy="true" className="animate-pulse motion-reduce:animate-none">
      <p className="sr-only">Loading</p>
      {framed ? (
        <div className="mx-auto w-full max-w-4xl flex-1 px-3 py-5 pb-12 sm:px-4 sm:py-6">
          {skeletonBody(kind)}
        </div>
      ) : (
        skeletonBody(kind)
      )}
    </div>
  );
}
