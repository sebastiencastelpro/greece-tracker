'use client'

import { useState, useEffect } from 'react'
import { Route } from '@/types'
import { format, addDays } from 'date-fns'
import { Alert } from '@/types'

interface Props { route: Route }

export default function AlertForm({ route }: Props) {
  const [alerts, setAlerts] = useState<(Alert & { routes?: { label: string } })[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [form, setForm] = useState({
    direction: 'outbound',
    max_price_eur: '',
    min_trip_days: '5',
    max_trip_days: '21',
    earliest_depart: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    latest_depart: format(addDays(new Date(), 120), 'yyyy-MM-dd'),
    email: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchAlerts()
  }, [route.id])

  async function fetchAlerts() {
    setLoadingAlerts(true)
    try {
      const res = await fetch('/api/alerts')
      const data = await res.json()
      // Filtrer les alertes pour la route courante
      setAlerts((data.alerts ?? []).filter((a: Alert) => a.route_id === route.id))
    } catch {
      setAlerts([])
    } finally {
      setLoadingAlerts(false)
    }
  }

  async function toggleAlert(id: string, currentlyActive: boolean) {
    await fetch(`/api/alerts?id=${id}&active=${!currentlyActive}`, { method: 'PATCH' })
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !currentlyActive } : a))
  }

  async function deleteAlert(id: string) {
    await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' })
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setSuccess(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_id: route.id,
          ...form,
          max_price_eur: parseFloat(form.max_price_eur),
          min_trip_days: parseInt(form.min_trip_days),
          max_trip_days: parseInt(form.max_trip_days),
        }),
      })
      if (res.ok) {
        setSuccess(true)
        fetchAlerts()
        setForm(f => ({ ...f, max_price_eur: '', email: '' }))
      }
    } catch {
      // handle error
    } finally {
      setSubmitting(false)
    }
  }

  const dirLabel: Record<string, string> = {
    outbound: 'Aller',
    return: 'Retour',
    both: 'Aller + Retour',
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>

      {/* ── Alertes existantes ── */}
      {!loadingAlerts && alerts.length > 0 && (
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, marginBottom: 10 }}>
            Alertes actives sur cette route
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.map(alert => (
              <div key={alert.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                alignItems: 'center',
                gap: 14,
                background: 'var(--surface)',
                border: `1px solid ${alert.active ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '12px 16px',
                opacity: alert.active ? 1 : 0.6,
                transition: 'opacity 0.2s, border-color 0.2s',
              }}>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: 'var(--text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      background: 'var(--accent-dim)',
                      color: 'var(--accent)',
                      padding: '2px 7px',
                      borderRadius: 4,
                    }}>
                      {dirLabel[alert.direction] ?? alert.direction}
                    </span>
                    Sous {alert.max_price_eur}€
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 3 }}>
                    {alert.min_trip_days}–{alert.max_trip_days} jours ·{' '}
                    {alert.earliest_depart && new Date(alert.earliest_depart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    {' → '}
                    {alert.latest_depart && new Date(alert.latest_depart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ·{' '}
                    {alert.email}
                  </div>
                </div>

                {/* Toggle on/off */}
                <button
                  onClick={() => toggleAlert(alert.id, alert.active)}
                  title={alert.active ? 'Désactiver' : 'Activer'}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    border: 'none',
                    background: alert.active ? 'var(--accent)' : 'var(--border)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: 3,
                    left: alert.active ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                    display: 'block',
                  }} />
                </button>

                {/* Supprimer */}
                <button
                  onClick={() => deleteAlert(alert.id)}
                  title="Supprimer"
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--text-faint)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '2px 4px',
                    lineHeight: 1,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--high)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Créer une alerte ── */}
      <form className="alert-form" onSubmit={submit}>
        <h2>Créer une alerte prix</h2>
        <p className="alert-desc">
          Tu reçois un email dès qu'un vol <strong>{route.label}</strong> passe sous ton seuil.
        </p>

        <div className="alert-grid">
          <div className="form-group">
            <label className="form-label">Direction</label>
            <select className="form-select" value={form.direction} onChange={e => update('direction', e.target.value)}>
              <option value="outbound">Aller (Paris → Grèce)</option>
              <option value="return">Retour (Grèce → Paris)</option>
              <option value="both">Les deux</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Prix max (€)</label>
            <input type="number" className="form-input" required placeholder="Ex: 120"
              value={form.max_price_eur} onChange={e => update('max_price_eur', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Séjour min (jours)</label>
            <input type="number" className="form-input" min="1"
              value={form.min_trip_days} onChange={e => update('min_trip_days', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Séjour max (jours)</label>
            <input type="number" className="form-input" min="1"
              value={form.max_trip_days} onChange={e => update('max_trip_days', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Départ à partir du</label>
            <input type="date" className="form-input"
              value={form.earliest_depart} onChange={e => update('earliest_depart', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Départ avant le</label>
            <input type="date" className="form-input"
              value={form.latest_depart} onChange={e => update('latest_depart', e.target.value)} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Email</label>
          <input type="email" className="form-input" required placeholder="ton@email.com"
            value={form.email} onChange={e => update('email', e.target.value)} />
        </div>

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? 'Création…' : '🔔 Créer l\'alerte'}
        </button>

        {success && (
          <div className="alert-success">
            ✓ Alerte créée ! Tu recevras un email à <strong>{form.email}</strong> dès qu'un vol passe sous {form.max_price_eur}€.
          </div>
        )}
      </form>
    </section>
  )
}
