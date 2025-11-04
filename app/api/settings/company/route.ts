import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  buildApiContext, 
  formatApiResponse, 
  formatErrorResponse,
  withAdminGuard 
} from '@/lib/api/api-utils'
import { z } from 'zod'

// Validation schema for company settings
const companySettingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email('Invalid email format').optional(),
  workingHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  workingHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  lateArrivalGraceMinutes: z.number().min(0, 'Grace period cannot be negative').max(60, 'Grace period cannot exceed 60 minutes'),
  overtimeThresholdHours: z.number().min(1, 'Overtime threshold must be at least 1 hour').max(24, 'Overtime threshold cannot exceed 24 hours'),
  workingDaysPerWeek: z.number().min(1, 'Working days must be at least 1').max(7, 'Working days cannot exceed 7'),
  timezone: z.string().min(1, 'Timezone is required'),
  dateFormat: z.string().min(1, 'Date format is required'),
  currency: z.string().min(1, 'Currency is required'),
})

export async function GET(request: NextRequest) {
  try {
    const apiContext = await buildApiContext(request)
    if (apiContext instanceof NextResponse) {
      return apiContext
    }

    const { user } = apiContext

    // Only admin can access company settings
    if (user.role !== 'ADMIN') {
      return formatErrorResponse('Access denied. Admin role required.', 403)
    }

    // Get or create company settings
    let settings = await prisma.companySettings.findFirst({
      where: { isActive: true }
    })

    // If no settings exist, create default ones
    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          companyName: 'Employee Dashboard',
          workingHoursStart: '08:00',
          workingHoursEnd: '17:00',
          lateArrivalGraceMinutes: 2,
          overtimeThresholdHours: 8.0,
          workingDaysPerWeek: 5,
          timezone: 'UTC',
          dateFormat: 'MM/dd/yyyy',
          currency: 'USD',
          isActive: true
        }
      })
    }

    return formatApiResponse(settings)
  } catch (error) {
    console.error('Error fetching company settings:', error)
    return formatErrorResponse('Failed to fetch company settings', 500)
  }
}

export const PUT = withAdminGuard(async (context, request: NextRequest) => {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = companySettingsSchema.safeParse(body)
    if (!validation.success) {
      return formatErrorResponse('Validation failed', 400, {
        details: validation.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      })
    }

    const validatedData = validation.data

    // Check if working hours are valid
    const startTime = new Date(`2000-01-01T${validatedData.workingHoursStart}:00`)
    const endTime = new Date(`2000-01-01T${validatedData.workingHoursEnd}:00`)
    
    if (startTime >= endTime) {
      return formatErrorResponse('Working hours start time must be before end time', 400)
    }

    // Get existing settings or create new ones
    let settings = await prisma.companySettings.findFirst({
      where: { isActive: true }
    })

    if (settings) {
      // Update existing settings
      settings = await prisma.companySettings.update({
        where: { id: settings.id },
        data: validatedData
      })
    } else {
      // Create new settings
      settings = await prisma.companySettings.create({
        data: {
          ...validatedData,
          isActive: true
        }
      })
    }

    return formatApiResponse(settings, undefined, 'Company settings updated successfully')
  } catch (error) {
    console.error('Error updating company settings:', error)
    return formatErrorResponse('Failed to update company settings', 500)
  }
})
