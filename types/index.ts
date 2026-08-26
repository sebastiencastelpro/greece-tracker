export interface Route {
  id: string
  origin: string
  destination: string
  label: string
  active: boolean
}

export interface PriceSnapshot {
  id: string
  route_id: string
  departure_date: string
  return_date?: string
  price_eur: number
  airline?: string
  flight_number?: string
  duration_min?: number
  stops?: number
  deep_link?: string
  captured_at: string
}

export interface Alert {
  id: string
  route_id: string
  direction: 'outbound' | 'return' | 'both'
  max_price_eur: number
  min_trip_days: number
  max_trip_days: number
  earliest_depart?: string
  latest_depart?: string
  email: string
  active: boolean
  last_triggered?: string
}

export interface BestCombo {
  outbound_route_id: string
  return_route_id: string
  outbound_label: string
  return_label: string
  outbound_date: string
  return_date: string
  outbound_price: number
  return_price: number
  total_price: number
  trip_days: number
  outbound_airline?: string
  return_airline?: string
  outbound_link?: string
  return_link?: string
}

export interface PriceCalendarDay {
  date: string
  price: number
  isLow: boolean    // < percentile 25
  isMed: boolean    // entre p25 et p75
  isHigh: boolean   // > percentile 75
}
