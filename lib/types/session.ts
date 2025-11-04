/**
 * Session types for components
 */

import { Session } from 'next-auth'
import { Role } from '@prisma/client'

export interface ExtendedSession extends Session {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role: Role
  }
}

export type SessionProp = ExtendedSession | null | undefined

