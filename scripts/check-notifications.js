const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkNotifications() {
  try {
    console.log("🔔 Checking notifications...");

    // Get all notifications
    const notifications = await prisma.notification.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`📊 Total notifications: ${notifications.length}`);

    if (notifications.length > 0) {
      console.log("\n📋 Recent notifications:");
      notifications.slice(0, 10).forEach((notif, index) => {
        console.log(
          `${index + 1}. [${notif.type.toUpperCase()}] ${notif.title}`
        );
        console.log(`   Message: ${notif.message}`);
        console.log(`   User: ${notif.user.name} (${notif.user.email})`);
        console.log(`   Read: ${notif.isRead ? "Yes" : "No"}`);
        console.log(`   Created: ${notif.createdAt.toLocaleString()}`);
        console.log("");
      });
    } else {
      console.log("❌ No notifications found in database");
    }

    // Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    console.log("\n👥 Available users:");
    users.forEach((user) => {
      console.log(`- ${user.name} (${user.email}) - ${user.role}`);
    });
  } catch (error) {
    console.error("❌ Error checking notifications:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotifications();
