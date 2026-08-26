import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .eq('active', true)
    .order('origin', { ascending: true })
    .order('destination', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ routes: data })
}
