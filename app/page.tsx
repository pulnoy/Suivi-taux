import { Dashboard } from '@/components/dashboard';
import { readTauxData, summarizeTauxData } from '@/lib/taux-data';

export const revalidate = 300;

export default async function Page() {
  const data = summarizeTauxData(await readTauxData());
  return <Dashboard initialData={data} />;
}
