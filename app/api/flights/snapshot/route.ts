import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// GET /api/flights/snapshot?routeId=xxx&days=60
// Retourne l'historique des meilleurs prix pour une route
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const routeId = searchParams.get('routeId')
  const days = parseInt(searchParams.get('days') ?? '60')

  if (!routeId) {
    return NextResponse.json({ error: 'routeId requis' }, { status: 400 })
  }

  const since = new Date()
  since.setDate(since.getDate() - days)

  // Meilleur prix par date de départ sur la fenêtre
  const { data, error } = await supabase
    .from('price_snapshots')
    .select('departure_date, price_eur, airline, stops, deep_link, captured_at')
    .eq('route_id', routeId)
    .gte('departure_date', new Date().toISOString().split('T')[0]) // pas les dates passées
    .lte('departure_date', new Date(Date.now() + days * 86400000).toISOString().split('T')[0])
    .order('departure_date', { ascending: true })
    .order('price_eur', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Dédupliquer : garder le meilleur prix par date
  const byDate = new Map<string, typeof data[0]>()
  for (const row of data ?? []) {
    if (!byDate.has(row.departure_date)) {
      byDate.set(row.departure_date, row)
    }
  }

  const calendar = Array.from(byDate.values())

  // Calcul des percentiles pour colorier le calendrier
  const prices = calendar.map(r => r.price_eur).sort((a, b) => a - b)
  const p25 = prices[Math.floor(prices.length * 0.25)] ?? 0
  const p75 = prices[Math.floor(prices.length * 0.75)] ?? 999999

  const result = calendar.map(r => ({
    ...r,
    level: r.price_eur <= p25 ? 'low' : r.price_eur <= p75 ? 'med' : 'high',
  }))

  return NextResponse.json({ calendar: result, p25, p75 })
}
