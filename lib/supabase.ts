import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  name: string
  phone: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Contribution {
  id: string
  user_id: string
  week: number
  amount: number
  status: 'paid' | 'unpaid' | 'overdue'
  penalty: number
  paid_at?: string
  due_date: string
  created_at: string
  updated_at: string
  user?: User
}

export interface WeeklyFund {
  week: number
  total_amount: number
  paid_amount: number
  unpaid_amount: number
  penalty_amount: number
  due_date: string
  contributions: Contribution[]
}

export interface ContributionSchedule {
  id: string
  name: string
  type: 'weekly' | 'monthly'
  amount: number
  day_of_week?: number // 0-6 (Sunday-Saturday) for weekly
  day_of_month?: number // 1-31 for monthly
  is_active: boolean
  created_at: string
  updated_at: string
}
