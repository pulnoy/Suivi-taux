import { NextResponse } from 'next/server';
import { readTauxData, selectTauxData, summarizeTauxData } from '@/lib/taux-data';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await readTauxData();
    const keys = (url.searchParams.get('keys') ?? '').split(',').filter(Boolean);
    const responseData = url.searchParams.get('summary') === '1'
      ? summarizeTauxData(data)
      : keys.length > 0
        ? selectTauxData(data, keys, url.searchParams.get('from'), url.searchParams.get('to'))
        : data;

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Erreur lecture taux.json:', error);
    return NextResponse.json(
      { error: "Erreur lors de la lecture des taux" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
