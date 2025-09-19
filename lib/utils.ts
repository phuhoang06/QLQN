import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date))
}

export function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + start.getDay() + 1) / 7)
}

export function getWeekStartDate(weekNumber: number, year: number): Date {
  const start = new Date(year, 0, 1)
  const days = (weekNumber - 1) * 7 - start.getDay() + 1
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000)
}

export function getWeekEndDate(weekNumber: number, year: number): Date {
  const startDate = getWeekStartDate(weekNumber, year)
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)
  return endDate
}
