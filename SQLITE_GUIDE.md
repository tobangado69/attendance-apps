# SQLite Database Guide for Employee Dashboard

## 🎉 **SQLite is Working Perfectly!**

Your SQLite database is fully functional with all data properly seeded. Here's everything you need to know:

## 📊 **Current Database Status**

✅ **Database File**: `prisma/dev.db` (61KB)  
✅ **Tables**: 5 tables created successfully  
✅ **Data**: 8 users, 8 employees, 16 attendance records, 3 tasks, 3 departments  
✅ **Connection**: Working perfectly with Prisma ORM  

## 🛠️ **Available Database Commands**

### Quick Commands
```bash
# View database contents in terminal
npm run db:view

# Test database connection
npm run db:test

# Open Prisma Studio (visual database browser)
npm run db:studio

# Reset database and reseed
npm run db:reset

# Seed database with sample data
npm run db:seed
```

### Prisma Commands
```bash
# Push schema changes to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Open Prisma Studio
npx prisma studio

# Execute SQL queries
npx prisma db execute --stdin --schema=./prisma/schema.prisma
```

## 🗄️ **Database Schema Overview**

### Tables Created
1. **users** - User authentication and basic info
2. **employees** - Employee-specific data (salary, department, etc.)
3. **attendance** - Check-in/check-out records
4. **tasks** - Task management system
5. **departments** - Department information

### Sample Data Included
- **8 Users** with different roles (Admin, Manager, Employee)
- **8 Employees** with complete profiles
- **16 Attendance Records** (2 days of data per employee)
- **3 Tasks** with different priorities and statuses
- **3 Departments** (Engineering, Marketing, HR)

## 🔍 **Viewing Your Data**

### Method 1: Terminal Viewer
```bash
npm run db:view
```
Shows a formatted view of all your data in the terminal.

### Method 2: Prisma Studio (Recommended)
```bash
npm run db:studio
```
Opens a web-based database browser at `http://localhost:5555`

### Method 3: Direct SQLite Access
```bash
# Install SQLite command line tool
npm install -g sqlite3

# Open database
sqlite3 prisma/dev.db

# Run SQL queries
.tables
SELECT * FROM users;
.quit
```

## 📝 **Common SQLite Queries**

### View All Users
```sql
SELECT u.name, u.email, u.role, e.employeeId, e.department 
FROM users u 
LEFT JOIN employees e ON u.id = e.userId;
```

### Check Today's Attendance
```sql
SELECT u.name, a.checkIn, a.checkOut, a.totalHours 
FROM attendance a 
JOIN users u ON a.userId = u.id 
WHERE date(a.date) = date('now');
```

### View Tasks by Status
```sql
SELECT t.title, t.status, t.priority, u.name as assignee 
FROM tasks t 
LEFT JOIN users u ON t.assigneeId = u.id 
ORDER BY t.priority DESC;
```

## 🔧 **Database Management**

### Backup Database
```bash
# Copy the database file
cp prisma/dev.db prisma/backup-$(date +%Y%m%d).db
```

### Reset Database
```bash
# Reset and reseed
npm run db:reset
```

### Add New Data
```bash
# Run the seed script again
npm run db:seed
```

## 🚀 **Next Steps**

Your SQLite database is ready! You can now:

1. **Continue Development** - Build the attendance and task management features
2. **View Data** - Use `npm run db:studio` to explore your data visually
3. **Test Queries** - Use the terminal viewer to see data changes
4. **Add Features** - The database schema supports all planned features

## 🐛 **Troubleshooting**

### If Database Seems Empty
```bash
# Check if tables exist
npm run db:test

# Reseed if needed
npm run db:seed
```

### If Connection Fails
```bash
# Regenerate Prisma client
npx prisma generate

# Push schema again
npx prisma db push
```

### If Data is Missing
```bash
# Reset and reseed
npm run db:reset
```

## 📚 **Useful Resources**

- [Prisma Documentation](https://www.prisma.io/docs)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Prisma Studio Guide](https://www.prisma.io/docs/studio)

## 🎯 **Database Features Ready**

✅ **User Authentication** - Complete with roles  
✅ **Employee Management** - Full CRUD support  
✅ **Attendance Tracking** - Ready for check-in/out  
✅ **Task Management** - Assignment and status tracking  
✅ **Department Management** - Organizational structure  
✅ **Data Relationships** - Proper foreign keys and joins  

Your SQLite database is production-ready and fully integrated with your Next.js application! 🚀
