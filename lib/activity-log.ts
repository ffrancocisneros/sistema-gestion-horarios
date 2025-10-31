import { prisma } from './prisma'

export type ActivityAction =
  | 'CREATE_EMPLOYEE'
  | 'UPDATE_EMPLOYEE'
  | 'DELETE_EMPLOYEE'
  | 'CREATE_SHIFT'
  | 'UPDATE_SHIFT'
  | 'DELETE_SHIFT'
  | 'TOGGLE_PAYMENT'

export async function logActivity(
  action: ActivityAction,
  employeeId: string | null,
  details?: string
) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        employeeId,
        details,
      },
    })
  } catch (error) {
    console.error('Error logging activity:', error)
    // No lanzar error para no interrumpir el flujo principal
  }
}

