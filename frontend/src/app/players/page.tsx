import { Suspense } from 'react';
import PlayersPage from './PlayersPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="text-noxus-muted animate-pulse p-6">Loading players...</div>}>
      <PlayersPage />
    </Suspense>
  );
}
