import { NextRequest, NextResponse } from 'next/server'
import { searchOneWayFlights } from '@/lib/amadeus/client'
import { supabaseAdmin } from '@/lib/supabase/client'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Vercel Cron Job — appelé toutes les 6h
// vercel.json: { "crons": [{ "path": "/api/cron", "schedule": "0 */6 * * *" }] }
export async function GET(req: NextRequest) {
  // Sécurité basique : vérifier le header Vercel Cron
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: string[] = []

  // 1. Récupérer toutes les routes actives
  const { data: routes } = await supabaseAdmin
    .from('routes')
    .select('*')
    .eq('active', true)

  if (!routes) return NextResponse.json({ error: 'No routes found' }, { status: 500 })

  // 2. Scanner les 90 prochains jours pour chaque route
  const today = new Date()
  const datesToCheck: string[] = []
  for (let i = 1; i <= 90; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    // On ne check que certains jours pour rester dans les quotas API
    if (i <= 30 || i % 3 === 0) {
      datesToCheck.push(d.toISOString().split('T')[0])
    }
  }

  for (const route of routes) {
    for (const date of datesToCheck.slice(0, 10)) { // max 10 dates par run par route
      try {
        const offers = await searchOneWayFlights({
          origin: route.origin,
          destination: route.destination,
          date,
          maxStops: 2,
        })

        if (offers.length === 0) continue
        const best = offers[0]

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

        results.push(`${route.label} ${date}: ${best.price}€`)

        // 3. Vérifier les alertes pour cette route
        await checkAlerts(route.id, date, best.price, route.label, best.deepLink)
      } catch (e) {
        console.error(`Error for ${route.label} ${date}:`, e)
      }
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

async function checkAlerts(
  routeId: string,
  date: string,
  price: number,
  routeLabel: string,
  deepLink: string
) {
  // Alertes actives pour cette route dont le prix actuel est sous le seuil
  const { data: triggerable } = await supabaseAdmin
    .from('alerts')
    .select('*')
    .eq('route_id', routeId)
    .eq('active', true)          // respecte le toggle on/off
    .gte('max_price_eur', price) // le prix trouvé est sous le seuil configuré

  if (!triggerable) return

  for (const alert of triggerable) {
    // Vérifier la fenêtre de dates
    if (alert.earliest_depart && date < alert.earliest_depart) continue
    if (alert.latest_depart && date > alert.latest_depart) continue

    // Éviter de spammer : ne pas re-déclencher si déjà notifié il y a moins de 12h
    if (alert.last_triggered) {
      const lastTrig = new Date(alert.last_triggered)
      if (Date.now() - lastTrig.getTime() < 12 * 3600 * 1000) continue
    }

    // Envoyer l'email
    try {
      await resend.emails.send({
        from: 'Greece Tracker <alerts@greece-tracker.app>',
        to: alert.email,
        subject: `✈️ Prix alert : ${routeLabel} — ${price}€ le ${date}`,
        html: `
          <h2>🇬🇷 Une alerte s'est déclenchée !</h2>
          <p><strong>${routeLabel}</strong></p>
          <p>Prix trouvé : <strong>${price}€</strong> (votre seuil : ${alert.max_price_eur}€)</p>
          <p>Date de départ : <strong>${date}</strong></p>
          <p>
            <a href="${deepLink}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
              🔍 Voir ce vol
            </a>
          </p>
          <hr/>
          <p style="color:#666;font-size:12px">
            Vous recevez cet email car vous avez configuré une alerte sur Greece Tracker.<br/>
            <a href="#">Se désabonner</a>
          </p>
        `,
      })

      // Mettre à jour last_triggered
      await supabaseAdmin
        .from('alerts')
        .update({ last_triggered: new Date().toISOString() })
        .eq('id', alert.id)
    } catch (e) {
      console.error('Email send error:', e)
    }
  }
}
