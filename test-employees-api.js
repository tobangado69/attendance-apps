// Test script to check employees API
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testEmployeesQuery() {
  try {
    console.log('Testing employees query...');
    
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        employeeId: true,
        position: true,
        salary: true,
        status: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        managerId: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        }
      },
      take: 5
    });
    
    console.log('Query successful!');
    console.log('Found employees:', employees.length);
    console.log('First employee:', employees[0]);
    
  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEmployeesQuery();


