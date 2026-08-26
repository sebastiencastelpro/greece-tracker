'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import { Route } from '@/types'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props { route: Route }

export default function PriceChart({ route }: Props) {
  const [data, setData] = useState<any[]>([])
  const [p25, setP25] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/flights/snapshot?routeId=${route.id}&days=90`)
      .then(r => r.json())
      .then(d => {
        const formatted = (d.calendar ?? []).map((row: any) => ({
          date: format(parseISO(row.departure_date), 'd MMM', { locale: fr }),
          price: row.price_eur,
          level: row.level,
        }))
        setData(formatted)
        setP25(d.p25 ?? 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [route.id])

  if (loading || data.length === 0) return null

  const minPrice = Math.min(...data.map(d => d.price))
  const maxPrice = Math.max(...data.map(d => d.price))

  return (
    <section className="chart-section">
      <h2 className="section-title">Évolution des prix — 90 jours</h2>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--text-faint)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(data.length / 8)}
            />
            <YAxis
              tick={{ fill: 'var(--text-faint)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${v}€`}
              width={48}
              domain={[Math.floor(minPrice * 0.9), Math.ceil(maxPrice * 1.05)]}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
              }}
              formatter={(v: any) => [`${v}€`, 'Prix']}
              labelStyle={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
            />
            {p25 > 0 && (
              <ReferenceLine
                y={p25}
                stroke="var(--low)"
                strokeDasharray="4 4"
                label={{
                  value: `Bon prix <${Math.round(p25)}€`,
                  fill: 'var(--low)',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="price"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#priceGrad)"
              dot={false}
              activeDot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
