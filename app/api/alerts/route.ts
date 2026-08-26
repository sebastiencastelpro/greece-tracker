import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

// GET /api/alerts — liste toutes les alertes (actives ET inactives)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('alerts')
    .select(`*, routes(label, origin, destination)`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ alerts: data })
}

// POST /api/alerts — créer une alerte
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { route_id, direction, max_price_eur, min_trip_days, max_trip_days,
          earliest_depart, latest_depart, email } = body

  if (!route_id || !max_price_eur || !email) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('alerts')
    .insert({
      route_id,
      direction: direction ?? 'outbound',
      max_price_eur,
      min_trip_days: min_trip_days ?? 5,
      max_trip_days: max_trip_days ?? 21,
      earliest_depart,
      latest_depart,
      email,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ alert: data }, { status: 201 })
}

// PATCH /api/alerts?id=xxx&active=true|false — toggle on/off
export async function PATCH(req: NextRequest) {
  const id     = req.nextUrl.searchParams.get('id')
  const active = req.nextUrl.searchParams.get('active')
  if (!id || active === null) return NextResponse.json({ error: 'id et active requis' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('alerts')
    .update({ active: active === 'true' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/alerts?id=xxx — suppression définitive
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('alerts')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
