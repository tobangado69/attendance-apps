const { PrismaClient } = require("@prisma/client");

async function testDatabase() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Testing database connection...");

    // Test basic connection
    await prisma.$connect();
    console.log("✅ Database connected successfully!");

    // Check tables
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `;
    console.log("📋 Available tables:", tables);

    // Check user count
    const userCount = await prisma.user.count();
    console.log(`👥 Total users: ${userCount}`);

    // Check employee count
    const employeeCount = await prisma.employee.count();
    console.log(`👷 Total employees: ${employeeCount}`);

    // Check attendance count
    const attendanceCount = await prisma.attendance.count();
    console.log(`⏰ Total attendance records: ${attendanceCount}`);

    // Check task count
    const taskCount = await prisma.task.count();
    console.log(`📝 Total tasks: ${taskCount}`);

    // Show sample data
    console.log("\n📊 Sample data:");
    const sampleUsers = await prisma.user.findMany({
      take: 3,
      include: {
        employee: true,
      },
    });

    sampleUsers.forEach((user) => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
      if (user.employee) {
        console.log(
          `  Employee ID: ${user.employee.employeeId}, Department: ${user.employee.department}`
        );
      }
    });
  } catch (error) {
    console.error("❌ Database error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
