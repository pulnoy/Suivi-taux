
'use client';

import React from 'react';

type TauxData = {
  estr: number | null;
  oat10: number | null;
  cac5: number | null;
  scpi5: number | null;
  asof: string;
};

type DashboardProps = {
  data: TauxData;
};

export default function Dashboard({ data }: DashboardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card title="€STR" value={data.estr} date={data.asof} />
      <Card title="OAT 10 ans" value={data.oat10} date={data.asof} />
      <Card title="CAC 40 (5 ans)" value={data.cac5} date={data.asof} />
      <Card title="SCPI (5 ans)" value={data.scpi5} date={data.asof} />
    </div>
  );
}

function Card({ title, value, date }: { title: string; value: number | null; date: string }) {
  const displayValue = typeof value === 'number' ? `${value.toFixed(2)} %` : '—';
  return (
    <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-700">{title}</h2>
      <p className="text-3xl font-bold text-blue-600 mt-2">{displayValue}</p>
      <p className="text-sm text-slate-500 mt-1">Mise à jour : {date || '—'}</p>
    </div>
  );
}
