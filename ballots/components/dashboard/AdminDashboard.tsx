import { navigate } from '@/hooks/useHashRoute.ts';
import { Card } from '../ui/Card.tsx';
import { Muted } from '../ui/Muted.tsx';
import { Heading } from '../ui/Heading.tsx';

export function AdminDashboard(): React.JSX.Element {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card as="button" interactive padding="lg" onClick={() => navigate('admin')}>
          <Heading variant="card">Manage Debates</Heading>
          <Muted>Create and edit debates, assign students and judges.</Muted>
        </Card>
        <Card as="button" interactive padding="lg" onClick={() => navigate('admin-ballots')}>
          <Heading variant="card">All Ballots</Heading>
          <Muted>Browse submitted ballots by debate or by student.</Muted>
        </Card>
        <Card as="button" interactive padding="lg" onClick={() => navigate('admin-users')}>
          <Heading variant="card">Manage Users</Heading>
          <Muted>Create accounts, archive members, and manage club roles.</Muted>
        </Card>
      </div>
    </div>
  );
}
