import { prisma } from './prisma'
import { logError } from '@/lib/utils/logger'
import { BusinessRules } from '@/lib/constants/business-rules'

export interface CompanySettings {
  id: string
  companyName: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  workingHoursStart: string
  workingHoursEnd: string
  lateArrivalGraceMinutes: number
  overtimeThresholdHours: number
  workingDaysPerWeek: number
  timezone: string
  dateFormat: string
  currency: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

let cachedSettings: CompanySettings | null = null
let cacheExpiry: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getCompanySettings(): Promise<CompanySettings> {
  const now = Date.now()
  
  // Return cached settings if still valid
  if (cachedSettings && now < cacheExpiry) {
    return cachedSettings
  }

  try {
    // Get or create company settings
    let settings = await prisma.companySettings.findFirst({
      where: { isActive: true }
    })

    // If no settings exist, create default ones
    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          companyName: 'Employee Dashboard',
          workingHoursStart: BusinessRules.DEFAULT_WORKING_HOURS_START,
          workingHoursEnd: BusinessRules.DEFAULT_WORKING_HOURS_END,
          lateArrivalGraceMinutes: BusinessRules.DEFAULT_LATE_ARRIVAL_GRACE_MINUTES,
          overtimeThresholdHours: BusinessRules.DEFAULT_OVERTIME_THRESHOLD_HOURS,
          workingDaysPerWeek: BusinessRules.DEFAULT_WORKING_DAYS_PER_WEEK,
          timezone: BusinessRules.DEFAULT_TIMEZONE,
          dateFormat: 'MM/dd/yyyy',
          currency: BusinessRules.DEFAULT_CURRENCY,
          isActive: true
        }
      })
    }

    // Cache the settings
    cachedSettings = settings
    cacheExpiry = now + CACHE_DURATION

    return settings
  } catch (error) {
    logError(error, { context: 'getCompanySettings' })
    
    // Return default settings if database error
    return {
      id: 'default',
      companyName: 'Employee Dashboard',
      workingHoursStart: BusinessRules.DEFAULT_WORKING_HOURS_START,
      workingHoursEnd: BusinessRules.DEFAULT_WORKING_HOURS_END,
      lateArrivalGraceMinutes: BusinessRules.DEFAULT_LATE_ARRIVAL_GRACE_MINUTES,
      overtimeThresholdHours: BusinessRules.DEFAULT_OVERTIME_THRESHOLD_HOURS,
      workingDaysPerWeek: BusinessRules.DEFAULT_WORKING_DAYS_PER_WEEK,
      timezone: BusinessRules.DEFAULT_TIMEZONE,
      dateFormat: 'MM/dd/yyyy',
      currency: BusinessRules.DEFAULT_CURRENCY,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
}

export function clearSettingsCache() {
  cachedSettings = null
  cacheExpiry = 0
}

export function parseTimeToDate(timeString: string, baseDate: Date = new Date()): Date {
  const [hours, minutes] = timeString.split(':').map(Number)
  const date = new Date(baseDate)
  date.setHours(hours, minutes, 0, 0)
  return date
}

export function calculateLateMinutes(checkInTime: Date, settings: CompanySettings): number {
  const expectedCheckIn = parseTimeToDate(settings.workingHoursStart, checkInTime)
  const gracePeriod = settings.lateArrivalGraceMinutes * 60 * 1000 // Convert to milliseconds
  const lateThreshold = new Date(expectedCheckIn.getTime() + gracePeriod)
  
  if (checkInTime > lateThreshold) {
    return Math.floor((checkInTime.getTime() - expectedCheckIn.getTime()) / (1000 * 60))
  }
  
  return 0
}

export function isLateArrival(checkInTime: Date, settings: CompanySettings): boolean {
  return calculateLateMinutes(checkInTime, settings) > 0
}

export function calculateOvertimeHours(totalHours: number, settings: CompanySettings): number {
  return Math.max(0, totalHours - settings.overtimeThresholdHours)
}
