'use client'

import { useState } from 'react'
import { Route } from '@/types'
import { format, addDays } from 'date-fns'

interface FlightOffer {
  price: number
  airline: string
  flightNumber: string
  durationMin: number
  stops: number
  departureTime: string
  arrivalTime: string
  deepLink: string
}

interface Props { route: Route }

export default function FlightSearch({ route }: Props) {
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const [date, setDate] = useState(tomorrow)
  const [maxPrice, setMaxPrice] = useState('')
  const [maxStops, setMaxStops] = useState('2')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<FlightOffer[]>([])
  const [searched, setSearched] = useState(false)

  async function search() {
    setLoading(true)
    setSearched(true)

    const qs = new URLSearchParams({
      origin: route.origin,
      destination: route.destination,
      date,
      maxStops,
    })
    if (maxPrice) qs.set('maxPrice', maxPrice)

    try {
      const res = await fetch(`/api/flights/search?${qs}`)
      const data = await res.json()
      setResults(data.offers ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function formatDuration(min: number) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${h}h${m > 0 ? m + 'min' : ''}`
  }

  function formatTime(iso: string) {
    return iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'
  }

  return (
    <section className="search-section">
      <div className="search-form">
        <div className="form-group">
          <label className="form-label">Date de départ</label>
          <input
            type="date"
            className="form-input"
            value={date}
            min={tomorrow}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Prix max (€)</label>
          <input
            type="number"
            className="form-input"
            value={maxPrice}
            placeholder="Ex: 150"
            onChange={e => setMaxPrice(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Escales max</label>
          <select
            className="form-select"
            value={maxStops}
            onChange={e => setMaxStops(e.target.value)}
          >
            <option value="0">Direct uniquement</option>
            <option value="1">1 escale max</option>
            <option value="2">2 escales max</option>
          </select>
        </div>

        <button
          className="search-btn"
          onClick={search}
          disabled={loading || !date}
        >
          {loading ? 'Recherche…' : 'Rechercher'}
        </button>
      </div>

      {searched && !loading && (
        <div className="results-list">
          {results.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: 'var(--text-muted)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              fontSize: '0.88rem',
            }}>
              Aucun vol trouvé pour ces critères.
              <br/>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>
                Essaie une autre date ou augmente le prix max.
              </span>
            </div>
          ) : (
            results.map((offer, i) => (
              <div key={i} className="flight-card">
                <div className="flight-main">
                  <div className="flight-route">
                    <span>{route.origin}</span>
                    <span className="flight-arrow">→</span>
                    <span>{route.destination}</span>
                  </div>
                  <div className="flight-meta">
                    {offer.airline} · {offer.flightNumber} ·{' '}
                    {formatTime(offer.departureTime)} → {formatTime(offer.arrivalTime)} ·{' '}
                    {formatDuration(offer.durationMin)} ·{' '}
                    {offer.stops === 0 ? 'Direct' : `${offer.stops} escale${offer.stops > 1 ? 's' : ''}`}
                  </div>
                </div>

                <div className="flight-price">
                  {Math.round(offer.price)}<span className="eur">€</span>
                </div>

                <a
                  href={offer.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="book-btn"
                >
                  Voir →
                </a>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  )
}
