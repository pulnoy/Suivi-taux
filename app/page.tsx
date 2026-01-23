
// app/page.tsx
import { Suspense } from 'react';
import Dashboard from '@/components/dashboard';
import { TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const res = await fetch('https://suivi-taux.vercel.app/api/taux', { cache: 'no-store' });
  const data = await res.json();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Taux Financiers</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }>
          <Dashboard data={data} />
        </Suspense>
      </div>

      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-slate-500">
            v20260119 - gillian.noesen - Données à titre indicatif uniquement
          </p>
        </div>
      </footer>
    </main>
  );
}
