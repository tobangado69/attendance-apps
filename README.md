# 🏢 Employee Dashboard

A comprehensive employee management system built with Next.js 15, featuring attendance tracking, task management, profile management, performance metrics, task analytics, and role-based access control.

![Next.js](https://img.shields.io/badge/Next.js-15.5.3-black)
![React](https://img.shields.io/badge/React-19.1.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Prisma](https://img.shields.io/badge/Prisma-6.16.1-purple)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC)

## ✨ Features

### 🔐 Authentication & Authorization
- **NextAuth.js** integration with secure session management
- **Role-based access control** (Admin, Manager, Employee)
- **Password hashing** with bcryptjs
- **Protected routes** with automatic redirects
- **Session persistence** across browser refreshes

### 👥 Employee Management
- **Complete CRUD operations** for employee records (Admin & Manager)
- **Role-based data filtering** (employees see only their data)
- **Employee statistics** and analytics
- **Department management** with filtering
- **Profile management** with image uploads via Cloudinary
- **Password change** functionality

### ⏰ Attendance System
- **Check-in/Check-out** functionality with validation
- **Real-time attendance tracking** with status indicators
- **Attendance history** with detailed records
- **Attendance reports** with Excel export (Admin only)
- **Date range filtering** and search capabilities
- **Attendance analytics** with charts and statistics

### 📋 Task Management
- **Task creation and assignment** with priority levels
- **Real-time status updates** (Pending, In Progress, Completed, Cancelled)
- **Due date validation** and management
- **Task filtering** by status, priority, and assignee
- **Role-based task visibility** (employees see only assigned tasks)
- **Real-time notifications** for task updates

### 📊 Dashboard & Analytics
- **Real-time statistics** with role-based data
- **Interactive charts** using Recharts
  - Attendance trends and patterns
  - Performance score distributions
  - Task completion trends
  - Department comparisons
- **Performance Metrics Dashboard** (NEW)
  - Productivity score calculation (40% attendance + 60% task completion)
  - Efficiency rate tracking
  - Employee ranking system
  - Department-level aggregations
  - Historical performance trends
- **Task Analytics Dashboard** (NEW)
  - Task completion velocity
  - Status distribution charts
  - Priority analysis
  - Assignee performance metrics
  - Department task completion rates
- **Recent activity feed** with real-time updates
- **Quick action buttons** for common tasks
- **Responsive design** for all screen sizes

### 🔔 Notification System
- **Real-time notifications** using Server-Sent Events (SSE)
- **Toast notifications** for user feedback
- **Notification center** with history
- **Role-based notification filtering**
- **Custom notification templates**

### 📈 Reports & Export
- **Attendance Reports** with comprehensive analytics
  - Daily attendance trends
  - Employee attendance summaries
  - Department-wise statistics
  - Excel export with multiple sheets
- **Performance Metrics** (NEW)
  - Employee productivity scores
  - Efficiency rates and attendance tracking
  - Task completion rates
  - Department performance comparisons
  - Top performers ranking
  - Historical performance trends
  - Excel export with overview, employee performance, department performance, and top performers sheets
- **Task Analytics** (NEW)
  - Task completion trends
  - Status and priority distribution
  - Completion rates by assignee and department
  - Average completion time metrics
  - Overdue tasks tracking
  - Backlog analysis
  - Excel export with overview, by assignee, and by department sheets
- **Custom date range reports** (week, month, year)
- **Admin & Manager access** to all reports

### 🎨 User Interface
- **Modern UI** with shadcn/ui components
- **Responsive design** for mobile and desktop
- **Dark/Light theme** support
- **Accessible components** with proper ARIA labels
- **Loading states** and error handling
- **Form validation** with Zod schemas

## 🚀 Tech Stack

### Frontend
- **Next.js 15** with App Router
- **React 19** with Server Components
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Radix UI** primitives
- **Lucide React** icons
- **Recharts** for data visualization

### Backend
- **Next.js API Routes** for backend logic
- **Prisma ORM** for database operations
- **SQLite** database (easily migratable to PostgreSQL)
- **NextAuth.js** for authentication
- **bcryptjs** for password hashing
- **Zod** for data validation

### External Services
- **Cloudinary** for image storage and optimization
- **Server-Sent Events** for real-time updates
- **XLSX** library for Excel file generation
- **file-saver** for client-side file downloads

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd employee-dashboard
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
CLOUDINARY_URL="cloudinary://your-api-key:your-api-secret@your-cloud-name"
```

4. **Set up the database**
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed the database with sample data
npm run db:seed
```

5. **Start the development server**
```bash
npm run dev
```

6. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Schema

### Core Models
- **User**: Authentication and profile data
- **Employee**: Employee-specific information
- **Attendance**: Check-in/out records with status tracking
- **Task**: Task management and assignments with priority levels
- **Department**: Organizational structure
- **Notification**: Real-time notifications
- **CompanySettings**: System-wide configuration (attendance rules, working hours, etc.)

### Key Relationships
- User ↔ Employee (1:1)
- User ↔ Attendance (1:many)
- User ↔ Task (1:many for assignments)
- Employee ↔ Department (many:1)

## 🔑 User Roles & Permissions

### Admin
- ✅ Full system access
- ✅ Manage all employees
- ✅ View all reports and analytics
- ✅ Access attendance reports
- ✅ Override attendance records
- ✅ System administration

### Manager
- ✅ Manage all employees (view, create, update)
- ✅ View team attendance and tasks
- ✅ Assign and track tasks
- ✅ View all reports (Attendance, Performance, Task Analytics)
- ✅ Export reports to Excel
- ✅ Access employee management
- ✅ View performance metrics and analytics

### Employee
- ✅ View own profile and data
- ✅ Check in/out attendance
- ✅ View assigned tasks
- ✅ Update personal information
- ❌ Cannot access employee management
- ❌ Cannot access reports (Attendance, Performance, Task Analytics)
- ❌ Cannot manage other users
- ❌ Cannot export data

## 📱 API Endpoints

### Authentication
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `GET /api/auth/session` - Get current session

### Employees
- `GET /api/employees` - List employees (with pagination)
- `POST /api/employees` - Create new employee
- `GET /api/employees/[id]` - Get employee details
- `PUT /api/employees/[id]` - Update employee
- `DELETE /api/employees/[id]` - Delete employee
- `GET /api/employees/me` - Get current user's employee data
- `GET /api/employees/stats` - Get employee statistics

### Profile Management
- `GET /api/employees/profile` - Get user profile
- `PUT /api/employees/profile` - Update profile
- `POST /api/employees/profile/image` - Upload profile image
- `DELETE /api/employees/profile/image` - Delete profile image
- `PUT /api/employees/profile/password` - Change password

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Check in/out
- `GET /api/attendance/reports` - Get attendance reports (Admin & Manager)
- `GET /api/attendance/export` - Export attendance data to Excel (Admin & Manager)

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/[id]` - Get task details
- `PUT /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task
- `GET /api/tasks/stats` - Get task statistics

### Reports & Analytics
- `GET /api/reports/attendance` - Get attendance report data (Admin & Manager)
- `GET /api/reports/stats` - Get dashboard statistics
- `GET /api/reports/performance` - Get overall performance metrics (Admin & Manager)
- `GET /api/reports/performance/employees` - Get detailed employee performance data (Admin & Manager)
- `GET /api/reports/performance/trends` - Get historical performance trends (Admin & Manager)
- `GET /api/reports/tasks` - Get task analytics data (Admin & Manager)
- `GET /api/reports/tasks/metrics` - Get task performance metrics (Admin & Manager)
- `GET /api/reports/tasks/trends` - Get historical task trends (Admin & Manager)

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/activities` - Get recent activities

### Notifications
- `GET /api/notifications/stream` - Server-Sent Events stream
- `GET /api/notifications` - Get notification history

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:seed      # Seed database with sample data
npm run db:studio    # Open Prisma Studio
npm run db:reset     # Reset database and reseed
```

### Database Management
```bash
# View database in Prisma Studio
npm run db:studio

# Reset database (WARNING: This will delete all data)
npm run db:reset

# Generate Prisma client after schema changes
npx prisma generate

# Push schema changes to database
npx prisma db push
```

### Code Structure
```
├── app/                  # Next.js App Router
│   ├── api/              # API routes
│   ├── dashboard/        # Dashboard pages
│   └── auth/             # Authentication pages
├── components/           # React components
│   ├── ui/               # Reusable UI components
│   ├── dashboard/        # Dashboard-specific components
│   ├── reports/          # Reports components
│   │   ├── performance/  # Performance metrics components
│   │   └── tasks/        # Task analytics components
│   └── auth/             # Authentication components
├── lib/                  # Utility libraries
│   ├── api/              # API utilities
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Database client
│   ├── validations.ts    # Zod schemas
│   ├── excel-export.ts   # Excel export utilities
│   └── utils/            # Helper utilities
├── prisma/               # Database schema and migrations
└── types/                # TypeScript type definitions
```

## 🔧 Configuration

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection string | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXTAUTH_SECRET` | Secret for JWT signing | Yes |
| `CLOUDINARY_URL` | Cloudinary configuration | Yes |

### Database Configuration
The application uses SQLite by default for development. For production, update the `DATABASE_URL` to use PostgreSQL:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/employee_dashboard"
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms
The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Prisma](https://prisma.io/) for the excellent ORM
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Cloudinary](https://cloudinary.com/) for image management

## 📞 Support

If you have any questions or need help, please:
1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Contact the development team

---

**Built with ❤️ using Next.js 15 and modern web technologies**