'use client'

import { useState, useEffect } from 'react'
import RouteSelector from '@/components/RouteSelector'
import PriceCalendar from '@/components/PriceCalendar'
import FlightSearch from '@/components/FlightSearch'
import AlertForm from '@/components/AlertForm'
import PriceChart from '@/components/PriceChart'
import { Route } from '@/types'

const OUTBOUND_ROUTES = ['CDG', 'ORY']

export default function HomePage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [activeTab, setActiveTab] = useState<'calendar' | 'search' | 'alerts'>('calendar')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/routes')
      .then(r => r.json())
      .then(d => {
        const outbound = (d.routes ?? []).filter((r: Route) =>
          OUTBOUND_ROUTES.includes(r.origin)
        )
        setRoutes(outbound)
        if (outbound.length) setSelectedRoute(outbound[0])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">🇬🇷</span>
          <div>
            <span className="brand-name">Greece Tracker</span>
            <span className="brand-tagline">Prix en temps réel</span>
          </div>
        </div>

        <nav className="route-nav">
          <p className="nav-label">Routes aller</p>
          {loading ? (
            <p className="loading-text">Chargement…</p>
          ) : (
            <RouteSelector
              routes={routes}
              selected={selectedRoute}
              onSelect={setSelectedRoute}
            />
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="status-dot" />
          <p className="footer-note">Amadeus · maj. toutes les 6h</p>
        </div>
      </aside>

      <main className="main">
        <header className="main-header">
          <div className="header-info">
            <h1 className="route-title">
              {selectedRoute ? selectedRoute.label : 'Sélectionne une route'}
            </h1>
            <p className="route-subtitle">
              Aller one-way · prix par date · retour cherché séparément
            </p>
          </div>

          <div className="tab-bar">
            {([
              { id: 'calendar', label: 'Calendrier', icon: '📅' },
              { id: 'search',   label: 'Recherche',  icon: '🔍' },
              { id: 'alerts',   label: 'Alertes',    icon: '🔔' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="main-content">
          {activeTab === 'calendar' && selectedRoute && (
            <>
              <PriceCalendar route={selectedRoute} />
              <PriceChart route={selectedRoute} />
            </>
          )}
          {activeTab === 'search' && selectedRoute && (
            <FlightSearch route={selectedRoute} />
          )}
          {activeTab === 'alerts' && selectedRoute && (
            <AlertForm route={selectedRoute} />
          )}
          {!selectedRoute && !loading && (
            <div className="empty-state">
              <span>←</span>
              <p>Sélectionne une route dans la barre de gauche</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
