import NextAuth from 'next-auth'
import { Role } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: Role
      employeeId?: string
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role: Role
    employeeId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    employeeId?: string
  }
}
