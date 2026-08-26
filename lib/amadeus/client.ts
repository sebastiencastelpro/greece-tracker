// Client Amadeus — recherche de vols one-way
// Doc: https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search

const AMADEUS_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.amadeus.com'
  : 'https://test.api.amadeus.com'

let cachedToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value
  }

  const res = await fetch(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AMADEUS_CLIENT_ID!,
      client_secret: process.env.AMADEUS_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) {
    throw new Error(`Amadeus auth failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // marge 60s
  }
  return cachedToken.value
}

export interface FlightOffer {
  price: number
  currency: string
  airline: string
  flightNumber: string
  durationMin: number
  stops: number
  departureTime: string
  arrivalTime: string
  deepLink: string
}

export interface SearchParams {
  origin: string        // IATA ex: "CDG"
  destination: string   // IATA ex: "ATH"
  date: string          // "YYYY-MM-DD"
  maxPrice?: number     // EUR
  maxStops?: number     // 0 = direct, 1 = 1 escale
  adults?: number
}

function parseDuration(iso: string): number {
  // PT2H30M → 150 min
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return 0
  return (parseInt(match[1] ?? '0') * 60) + parseInt(match[2] ?? '0')
}

export async function searchOneWayFlights(params: SearchParams): Promise<FlightOffer[]> {
  const token = await getAccessToken()

  const qs = new URLSearchParams({
    originLocationCode: params.origin,
    destinationLocationCode: params.destination,
    departureDate: params.date,
    adults: String(params.adults ?? 1),
    max: '10',
    currencyCode: 'EUR',
  })
  if (params.maxPrice) qs.set('maxPrice', String(params.maxPrice))

  const res = await fetch(
    `${AMADEUS_BASE_URL}/v2/shopping/flight-offers?${qs}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('Amadeus flight search error:', err)
    return []
  }

  const data = await res.json()
  const offers: FlightOffer[] = []

  for (const offer of data.data ?? []) {
    const itinerary = offer.itineraries[0]
    const segments = itinerary.segments
    const stops = segments.length - 1

    if (params.maxStops !== undefined && stops > params.maxStops) continue

    const firstSeg = segments[0]
    const lastSeg = segments[segments.length - 1]
    const airline = firstSeg.carrierCode
    const flightNumber = `${firstSeg.carrierCode}${firstSeg.number}`
    const durationMin = parseDuration(itinerary.duration)
    const price = parseFloat(offer.price.grandTotal)

    offers.push({
      price,
      currency: 'EUR',
      airline,
      flightNumber,
      durationMin,
      stops,
      departureTime: firstSeg.departure.at,
      arrivalTime: lastSeg.arrival.at,
      deepLink: `https://www.google.com/flights#flt=${params.origin}.${params.destination}.${params.date}`,
    })
  }

  // Trier par prix croissant
  return offers.sort((a, b) => a.price - b.price)
}

// Rechercher les meilleurs prix sur une fenêtre de dates (ex: les 60 prochains jours)
export async function searchBestPricesWindow(
  origin: string,
  destination: string,
  startDate: string,  // "YYYY-MM-DD"
  endDate: string,
  maxPrice?: number
): Promise<{ date: string; price: number; airline: string; durationMin: number }[]> {
  const token = await getAccessToken()

  const qs = new URLSearchParams({
    origin,
    destination,
    departureDate: `${startDate},${endDate}`,
    oneWay: 'true',
    duration: '1',
    nonStop: 'false',
    viewBy: 'DATE',
    currencyCode: 'EUR',
  })

  const res = await fetch(
    `${AMADEUS_BASE_URL}/v1/shopping/flight-dates?${qs}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!res.ok) {
    console.error('Amadeus flight-dates error:', await res.text())
    return []
  }

  const data = await res.json()
  const results = []

  for (const item of data.data ?? []) {
    const price = parseFloat(item.price.total)
    if (maxPrice && price > maxPrice) continue
    results.push({
      date: item.departureDate,
      price,
      airline: item.links?.flightDates ?? '',
      durationMin: 0,
    })
  }

  return results.sort((a, b) => a.price - b.price)
}
