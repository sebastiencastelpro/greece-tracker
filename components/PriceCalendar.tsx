'use client'

import { useState, useEffect } from 'react'
import { Route } from '@/types'
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns'
import { fr } from 'date-fns/locale'

interface CalendarDay {
  departure_date: string
  price_eur: number
  airline: string
  stops: number
  deep_link?: string
  level: 'low' | 'med' | 'high'
}

interface Props { route: Route }

export default function PriceCalendar({ route }: Props) {
  const [data, setData] = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [monthOffset, setMonthOffset] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/flights/snapshot?routeId=${route.id}&days=90`)
      .then(r => r.json())
      .then(d => {
        setData(d.calendar ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [route.id])

  const baseDate = addDays(new Date(), monthOffset * 30)
  const monthStart = startOfMonth(baseDate)
  const monthEnd = endOfMonth(baseDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Map data by date
  const byDate = new Map<string, CalendarDay>()
  for (const d of data) byDate.set(d.departure_date, d)

  const paddingDays = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1

  const weekdays = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

  return (
    <section className="calendar-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 className="section-title">
          {format(baseDate, 'MMMM yyyy', { locale: fr }).replace(/^\w/, c => c.toUpperCase())}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setMonthOffset(o => o - 1)}
            disabled={monthOffset <= 0}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.82rem',
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            ← Précédent
          </button>
          <button
            onClick={() => setMonthOffset(o => o + 1)}
            disabled={monthOffset >= 2}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.82rem',
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            Suivant →
          </button>
        </div>
      </div>

      <div className="calendar-legend">
        <span className="legend-item"><span className="legend-dot low" />Bon prix</span>
        <span className="legend-item"><span className="legend-dot med" />Prix moyen</span>
        <span className="legend-item"><span className="legend-dot high" />Prix élevé</span>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>
          Chargement du calendrier…
        </p>
      ) : (
        <div className="calendar-grid">
          {weekdays.map(d => (
            <div key={d} className="calendar-dow">{d}</div>
          ))}

          {/* Padding cells */}
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} className="calendar-day empty" />
          ))}

          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const entry = byDate.get(dateStr)
            const isPast = day < new Date()

            if (isPast) {
              return <div key={dateStr} className="calendar-day empty" />
            }

            return (
              <div
                key={dateStr}
                className={`calendar-day ${entry ? entry.level : 'no-data'}`}
                onClick={() => entry?.deep_link && window.open(entry.deep_link, '_blank')}
                title={entry ? `${entry.price_eur}€ · ${entry.airline} · ${entry.stops === 0 ? 'Direct' : `${entry.stops} escale(s)`}` : 'Pas de données'}
              >
                <span className="day-num">{format(day, 'd')}</span>
                {entry ? (
                  <>
                    <span className="day-price">{Math.round(entry.price_eur)}€</span>
                    <span className="day-airline">{entry.airline}</span>
                  </>
                ) : (
                  <span className="day-price" style={{ fontSize: '0.55rem' }}>—</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && data.length === 0 && (
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          marginTop: 12,
        }}>
          Aucune donnée encore — le cron job va alimenter le calendrier à la prochaine exécution.
          <br/>
          Lance <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>/api/cron</code> manuellement pour démarrer.
        </div>
      )}
    </section>
  )
}
