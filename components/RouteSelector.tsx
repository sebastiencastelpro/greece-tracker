'use client'

import { Route } from '@/types'

interface Props {
  routes: Route[]
  selected: Route | null
  onSelect: (r: Route) => void
}

export default function RouteSelector({ routes, selected, onSelect }: Props) {
  return (
    <div>
      {routes.map(route => (
        <button
          key={route.id}
          className={`route-item ${selected?.id === route.id ? 'selected' : ''}`}
          onClick={() => onSelect(route)}
          style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none' }}
        >
          <span className="route-origin">{route.origin} → {route.destination}</span>
          <span className="route-dest">{route.label.split('→')[1]?.trim()}</span>
        </button>
      ))}
    </div>
  )
}
