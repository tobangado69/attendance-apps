const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function viewDatabase() {
  try {
    console.log("🗄️  Employee Dashboard Database Viewer\n");
    console.log("=".repeat(50));

    // Users
    console.log("\n👥 USERS:");
    const users = await prisma.user.findMany({
      include: {
        employee: true,
      },
    });
    users.forEach((user) => {
      console.log(`  ${user.name} (${user.email})`);
      console.log(`    Role: ${user.role}`);
      if (user.employee) {
        console.log(`    Employee ID: ${user.employee.employeeId}`);
        console.log(`    Department: ${user.employee.department}`);
        console.log(`    Position: ${user.employee.position}`);
        console.log(
          `    Salary: $${user.employee.salary?.toLocaleString() || "N/A"}`
        );
      }
      console.log("");
    });

    // Attendance
    console.log("\n⏰ RECENT ATTENDANCE:");
    const recentAttendance = await prisma.attendance.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: {
        user: true,
        employee: true,
      },
    });
    recentAttendance.forEach((record) => {
      const checkIn = record.checkIn
        ? record.checkIn.toLocaleTimeString()
        : "Not checked in";
      const checkOut = record.checkOut
        ? record.checkOut.toLocaleTimeString()
        : "Not checked out";
      const hours = record.totalHours
        ? `${record.totalHours.toFixed(1)}h`
        : "N/A";
      console.log(`  ${record.user.name} - ${record.date.toDateString()}`);
      console.log(
        `    Check-in: ${checkIn} | Check-out: ${checkOut} | Hours: ${hours}`
      );
      console.log(`    Status: ${record.status}`);
      console.log("");
    });

    // Tasks
    console.log("\n📝 TASKS:");
    const tasks = await prisma.task.findMany({
      include: {
        assignee: true,
        creator: true,
      },
    });
    tasks.forEach((task) => {
      console.log(`  ${task.title}`);
      console.log(`    Status: ${task.status} | Priority: ${task.priority}`);
      console.log(`    Creator: ${task.creator.name}`);
      console.log(`    Assignee: ${task.assignee?.name || "Unassigned"}`);
      console.log(
        `    Due: ${task.dueDate ? task.dueDate.toDateString() : "No due date"}`
      );
      console.log("");
    });

    // Departments
    console.log("\n🏢 DEPARTMENTS:");
    const departments = await prisma.department.findMany();
    departments.forEach((dept) => {
      console.log(`  ${dept.name}`);
      console.log(`    Description: ${dept.description || "N/A"}`);
      console.log(`    Budget: $${dept.budget?.toLocaleString() || "N/A"}`);
      console.log("");
    });

    // Statistics
    console.log("\n📊 STATISTICS:");
    const stats = {
      totalUsers: await prisma.user.count(),
      totalEmployees: await prisma.employee.count(),
      totalAttendance: await prisma.attendance.count(),
      totalTasks: await prisma.task.count(),
      totalDepartments: await prisma.department.count(),
    };

    Object.entries(stats).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

viewDatabase();
