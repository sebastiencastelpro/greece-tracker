import { NextRequest, NextResponse } from 'next/server'
import { searchOneWayFlights } from '@/lib/amadeus/client'
import { supabaseAdmin } from '@/lib/supabase/client'

// GET /api/flights/search?origin=CDG&destination=ATH&date=2025-07-15&maxPrice=150
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const origin = searchParams.get('origin')
  const destination = searchParams.get('destination')
  const date = searchParams.get('date')
  const maxPrice = searchParams.get('maxPrice')
  const maxStops = searchParams.get('maxStops')

  if (!origin || !destination || !date) {
    return NextResponse.json(
      { error: 'origin, destination et date sont requis' },
      { status: 400 }
    )
  }

  try {
    const offers = await searchOneWayFlights({
      origin,
      destination,
      date,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      maxStops: maxStops ? parseInt(maxStops) : undefined,
    })

    // Sauvegarder le meilleur prix en snapshot
    if (offers.length > 0) {
      const best = offers[0]

      // Récupérer l'id de la route
      const { data: route } = await supabaseAdmin
        .from('routes')
        .select('id')
        .eq('origin', origin)
        .eq('destination', destination)
        .single()

      if (route) {
        await supabaseAdmin.from('price_snapshots').insert({
          route_id: route.id,
          departure_date: date,
          price_eur: best.price,
          airline: best.airline,
          flight_number: best.flightNumber,
          duration_min: best.durationMin,
          stops: best.stops,
          deep_link: best.deepLink,
        })
      }
    }

    return NextResponse.json({ offers, count: offers.length })
  } catch (err) {
    console.error('Flight search error:', err)
    return NextResponse.json({ error: 'Erreur lors de la recherche' }, { status: 500 })
  }
}
