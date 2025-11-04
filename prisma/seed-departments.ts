import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedDepartments() {
  try {
    console.log('🌱 Seeding departments...')

    // Create sample departments
    const departments = [
      {
        name: 'Engineering',
        description: 'Software development and technical solutions',
        budget: 500000
      },
      {
        name: 'Human Resources',
        description: 'Employee management and recruitment',
        budget: 200000
      },
      {
        name: 'Marketing',
        description: 'Brand promotion and customer acquisition',
        budget: 300000
      },
      {
        name: 'Sales',
        description: 'Customer acquisition and revenue generation',
        budget: 400000
      },
      {
        name: 'Finance',
        description: 'Financial planning and accounting',
        budget: 150000
      }
    ]

    for (const dept of departments) {
      await prisma.department.upsert({
        where: { name: dept.name },
        update: dept,
        create: dept
      })
      console.log(`✅ Created department: ${dept.name}`)
    }

    console.log('🎉 Department seeding completed!')
  } catch (error) {
    console.error('❌ Error seeding departments:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedDepartments()
