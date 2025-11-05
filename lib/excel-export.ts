import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface ExcelExportOptions {
  filename?: string;
  sheetName?: string;
  dateFormat?: string;
}

export interface AttendanceData {
  date: string;
  day: string;
  present: number;
  absent: number;
  late: number;
  totalHours: number;
}

export interface EmployeeData {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  position: string;
  salary: number;
  presentDays: number;
  totalDays: number;
  attendanceRate: number;
  totalHours: number;
  avgHours: number;
  lateDays: number;
}

export interface DepartmentData {
  department: string;
  totalEmployees: number;
  totalPresentDays: number;
  totalDays: number;
  avgAttendanceRate: number;
  totalHours: number;
}

export interface TaskData {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeName: string;
  dueDate: string;
  createdAt: string;
}

// Export attendance data to Excel
export function exportAttendanceToExcel(
  dailyData: AttendanceData[],
  employeeData: EmployeeData[],
  departmentData: DepartmentData[],
  options: ExcelExportOptions = {}
) {
  const workbook = XLSX.utils.book_new();
  
  // Daily Attendance Sheet
  const dailySheet = XLSX.utils.json_to_sheet(
    dailyData.map(day => ({
      Date: day.date,
      Day: day.day,
      'Present Employees': day.present,
      'Absent Employees': day.absent,
      'Late Employees': day.late,
      'Total Hours': day.totalHours
    }))
  );
  
  // Set column widths
  dailySheet['!cols'] = [
    { wch: 12 }, // Date
    { wch: 8 },  // Day
    { wch: 18 }, // Present Employees
    { wch: 18 }, // Absent Employees
    { wch: 16 }, // Late Employees
    { wch: 12 }  // Total Hours
  ];
  
  XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Attendance');
  
    // Employee Summary Sheet
    const employeeSheet = XLSX.utils.json_to_sheet(
      employeeData.map(emp => ({
        'Employee ID': emp.employeeId,
        'Name': emp.name,
        'Email': emp.email,
        'Department': emp.department,
        'Position': emp.position,
        'Salary': `$${emp.salary?.toLocaleString() || '0'}`,
        'Present Days': emp.presentDays,
        'Total Days': emp.totalDays,
        'Attendance Rate (%)': emp.attendanceRate,
        'Total Hours': emp.totalHours,
        'Avg Hours/Day': emp.avgHours,
        'Late Days': emp.lateDays
      }))
    );
    
    // Set column widths
    employeeSheet['!cols'] = [
      { wch: 12 }, // Employee ID
      { wch: 20 }, // Name
      { wch: 25 }, // Email
      { wch: 15 }, // Department
      { wch: 20 }, // Position
      { wch: 12 }, // Salary
      { wch: 12 }, // Present Days
      { wch: 10 }, // Total Days
      { wch: 16 }, // Attendance Rate
      { wch: 12 }, // Total Hours
      { wch: 14 }, // Avg Hours/Day
      { wch: 10 }  // Late Days
    ];
  
  XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Employee Summary');
  
  // Department Summary Sheet
  const departmentSheet = XLSX.utils.json_to_sheet(
    departmentData.map(dept => ({
      'Department': dept.department,
      'Total Employees': dept.totalEmployees,
      'Present Days': dept.totalPresentDays,
      'Total Days': dept.totalDays,
      'Avg Attendance Rate (%)': dept.avgAttendanceRate,
      'Total Hours': dept.totalHours
    }))
  );
  
  // Set column widths
  departmentSheet['!cols'] = [
    { wch: 15 }, // Department
    { wch: 16 }, // Total Employees
    { wch: 12 }, // Present Days
    { wch: 10 }, // Total Days
    { wch: 20 }, // Avg Attendance Rate
    { wch: 12 }  // Total Hours
  ];
  
  XLSX.utils.book_append_sheet(workbook, departmentSheet, 'Department Summary');
  
  // Export the file
  const filename = options.filename || `attendance-report-${new Date().toISOString().split('T')[0]}.xlsx`;
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(data, filename);
}

// Export tasks to Excel
export function exportTasksToExcel(
  tasks: TaskData[],
  options: ExcelExportOptions = {}
) {
  const workbook = XLSX.utils.book_new();
  
  const taskSheet = XLSX.utils.json_to_sheet(
    tasks.map(task => ({
      'Task ID': task.id,
      'Title': task.title,
      'Description': task.description,
      'Status': task.status,
      'Priority': task.priority,
      'Assignee': task.assigneeName,
      'Due Date': task.dueDate,
      'Created Date': task.createdAt
    }))
  );
  
  // Set column widths
  taskSheet['!cols'] = [
    { wch: 12 }, // Task ID
    { wch: 30 }, // Title
    { wch: 40 }, // Description
    { wch: 12 }, // Status
    { wch: 10 }, // Priority
    { wch: 20 }, // Assignee
    { wch: 12 }, // Due Date
    { wch: 12 }  // Created Date
  ];
  
  XLSX.utils.book_append_sheet(workbook, taskSheet, 'Tasks');
  
  // Export the file
  const filename = options.filename || `tasks-export-${new Date().toISOString().split('T')[0]}.xlsx`;
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(data, filename);
}

// Export employees to Excel
export function exportEmployeesToExcel(
  employees: Array<Record<string, unknown>>,
  options: ExcelExportOptions = {}
) {
  const workbook = XLSX.utils.book_new();
  
  const employeeSheet = XLSX.utils.json_to_sheet(
    employees.map(emp => ({
      'Employee ID': emp.employeeId,
      'Name': emp.name,
      'Email': emp.email,
      'Department': emp.department,
      'Position': emp.position || 'N/A',
      'Salary': `$${(emp.salary || 0).toLocaleString()}`,
      'Role': emp.role,
      'Status': emp.isActive,
      'Created Date': emp.createdAt
    }))
  );
  
  // Set column widths
  employeeSheet['!cols'] = [
    { wch: 12 }, // Employee ID
    { wch: 20 }, // Name
    { wch: 25 }, // Email
    { wch: 15 }, // Department
    { wch: 20 }, // Position
    { wch: 12 }, // Salary
    { wch: 12 }, // Role
    { wch: 10 }, // Status
    { wch: 12 }  // Created Date
  ];
  
  XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Employees');
  
  // Export the file
  const filename = options.filename || `employees-export-${new Date().toISOString().split('T')[0]}.xlsx`;
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(data, filename);
}

// Generic export function for any data
export function exportToExcel(
  data: Array<Record<string, unknown>>,
  sheetName: string = 'Data',
  options: ExcelExportOptions = {}
) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, 15)
  }));
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Export the file
  const filename = options.filename || `export-${new Date().toISOString().split('T')[0]}.xlsx`;
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(blob, filename);
}

// Performance Metrics Export Interfaces
export interface PerformanceEmployeeData {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  productivityScore: number;
  efficiencyRate: number;
  attendanceRate: number;
  taskCompletionRate: number;
  rank: number;
}

export interface PerformanceDepartmentData {
  department: string;
  totalEmployees: number;
  avgProductivityScore: number;
  avgEfficiencyRate: number;
  avgAttendanceRate: number;
  avgTaskCompletionRate: number;
  totalHours: number;
}

export interface PerformanceSummary {
  totalEmployees: number;
  avgProductivityScore: number;
  avgEfficiencyRate: number;
  avgAttendanceRate: number;
  avgTaskCompletionRate: number;
}

// Export performance metrics to Excel
export function exportPerformanceToExcel(
  summary: PerformanceSummary,
  employeePerformance: PerformanceEmployeeData[],
  departmentPerformance: PerformanceDepartmentData[],
  topPerformers: Array<{ employeeId: string; name: string; productivityScore: number; rank: number }>,
  options: ExcelExportOptions = {}
) {
  const workbook = XLSX.utils.book_new();
  
  // Overview/Summary Sheet
  const summarySheet = XLSX.utils.json_to_sheet([
    { Metric: 'Total Employees', Value: summary.totalEmployees },
    { Metric: 'Avg Productivity Score (%)', Value: summary.avgProductivityScore },
    { Metric: 'Avg Efficiency Rate (%)', Value: summary.avgEfficiencyRate },
    { Metric: 'Avg Attendance Rate (%)', Value: summary.avgAttendanceRate },
    { Metric: 'Avg Task Completion Rate (%)', Value: summary.avgTaskCompletionRate }
  ]);
  
  summarySheet['!cols'] = [
    { wch: 30 }, // Metric
    { wch: 15 }  // Value
  ];
  
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Overview');
  
  // Employee Performance Sheet
  const employeeSheet = XLSX.utils.json_to_sheet(
    employeePerformance.map(emp => ({
      'Rank': emp.rank,
      'Employee ID': emp.employeeId,
      'Name': emp.name,
      'Email': emp.email,
      'Department': emp.department || 'Unassigned',
      'Productivity Score (%)': emp.productivityScore,
      'Efficiency Rate (%)': emp.efficiencyRate,
      'Attendance Rate (%)': emp.attendanceRate,
      'Task Completion Rate (%)': emp.taskCompletionRate
    }))
  );
  
  employeeSheet['!cols'] = [
    { wch: 8 },  // Rank
    { wch: 12 }, // Employee ID
    { wch: 20 }, // Name
    { wch: 25 }, // Email
    { wch: 15 }, // Department
    { wch: 20 }, // Productivity Score
    { wch: 18 }, // Efficiency Rate
    { wch: 18 }, // Attendance Rate
    { wch: 22 }  // Task Completion Rate
  ];
  
  XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Employee Performance');
  
  // Department Performance Sheet
  const departmentSheet = XLSX.utils.json_to_sheet(
    departmentPerformance.map(dept => ({
      'Department': dept.department || 'Unassigned',
      'Total Employees': dept.totalEmployees,
      'Avg Productivity Score (%)': dept.avgProductivityScore,
      'Avg Efficiency Rate (%)': dept.avgEfficiencyRate,
      'Avg Attendance Rate (%)': dept.avgAttendanceRate,
      'Avg Task Completion Rate (%)': dept.avgTaskCompletionRate,
      'Total Hours': dept.totalHours
    }))
  );
  
  departmentSheet['!cols'] = [
    { wch: 15 }, // Department
    { wch: 16 }, // Total Employees
    { wch: 24 }, // Avg Productivity Score
    { wch: 22 }, // Avg Efficiency Rate
    { wch: 22 }, // Avg Attendance Rate
    { wch: 26 }, // Avg Task Completion Rate
    { wch: 12 }  // Total Hours
  ];
  
  XLSX.utils.book_append_sheet(workbook, departmentSheet, 'Department Performance');
  
  // Top Performers Sheet
  const topPerformersSheet = XLSX.utils.json_to_sheet(
    topPerformers.map(performer => ({
      'Rank': performer.rank,
      'Employee ID': performer.employeeId,
      'Name': performer.name,
      'Productivity Score (%)': performer.productivityScore
    }))
  );
  
  topPerformersSheet['!cols'] = [
    { wch: 8 },  // Rank
    { wch: 12 }, // Employee ID
    { wch: 20 }, // Name
    { wch: 20 }  // Productivity Score
  ];
  
  XLSX.utils.book_append_sheet(workbook, topPerformersSheet, 'Top Performers');
  
  // Export the file
  const filename = options.filename || `performance-report-${new Date().toISOString().split('T')[0]}.xlsx`;
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(data, filename);
}

// Task Analytics Export Interfaces
export interface TaskSummary {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  inProgressTasks: number;
  pendingTasks: number;
  cancelledTasks: number;
}

export interface TaskMetrics {
  avgCompletionTime: number;
  overdueTasks: number;
  overduePercentage: number;
  backlogSize: number;
}

export interface TaskByAssignee {
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  completionRate: number;
}

export interface TaskByDepartment {
  department: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  avgCompletionTime: number;
}

// Export task analytics to Excel
export function exportTaskAnalyticsToExcel(
  summary: TaskSummary,
  metrics: TaskMetrics,
  byAssignee: TaskByAssignee[],
  byDepartment: TaskByDepartment[],
  options: ExcelExportOptions = {}
) {
  const workbook = XLSX.utils.book_new();
  
  // Overview/Summary Sheet
  const summarySheet = XLSX.utils.json_to_sheet([
    { Metric: 'Total Tasks', Value: summary.totalTasks },
    { Metric: 'Completed Tasks', Value: summary.completedTasks },
    { Metric: 'Completion Rate (%)', Value: summary.completionRate },
    { Metric: 'In Progress Tasks', Value: summary.inProgressTasks },
    { Metric: 'Pending Tasks', Value: summary.pendingTasks },
    { Metric: 'Cancelled Tasks', Value: summary.cancelledTasks },
    { Metric: 'Average Completion Time (days)', Value: metrics.avgCompletionTime },
    { Metric: 'Overdue Tasks', Value: metrics.overdueTasks },
    { Metric: 'Overdue Percentage (%)', Value: metrics.overduePercentage },
    { Metric: 'Backlog Size', Value: metrics.backlogSize }
  ]);
  
  summarySheet['!cols'] = [
    { wch: 35 }, // Metric
    { wch: 15 }  // Value
  ];
  
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Overview');
  
  // By Assignee Sheet
  const assigneeSheet = XLSX.utils.json_to_sheet(
    byAssignee.map(assignee => ({
      'Assignee Name': assignee.assigneeName,
      'Email': assignee.assigneeEmail,
      'Total Tasks': assignee.totalTasks,
      'Completed Tasks': assignee.completedTasks,
      'In Progress Tasks': assignee.inProgressTasks,
      'Completion Rate (%)': assignee.completionRate
    }))
  );
  
  assigneeSheet['!cols'] = [
    { wch: 20 }, // Assignee Name
    { wch: 25 }, // Email
    { wch: 12 }, // Total Tasks
    { wch: 16 }, // Completed Tasks
    { wch: 18 }, // In Progress Tasks
    { wch: 18 }  // Completion Rate
  ];
  
  XLSX.utils.book_append_sheet(workbook, assigneeSheet, 'By Assignee');
  
  // By Department Sheet
  const departmentSheet = XLSX.utils.json_to_sheet(
    byDepartment.map(dept => ({
      'Department': dept.department || 'Unassigned',
      'Total Tasks': dept.totalTasks,
      'Completed Tasks': dept.completedTasks,
      'Completion Rate (%)': dept.completionRate,
      'Avg Completion Time (days)': dept.avgCompletionTime
    }))
  );
  
  departmentSheet['!cols'] = [
    { wch: 15 }, // Department
    { wch: 12 }, // Total Tasks
    { wch: 16 }, // Completed Tasks
    { wch: 18 }, // Completion Rate
    { wch: 25 }  // Avg Completion Time
  ];
  
  XLSX.utils.book_append_sheet(workbook, departmentSheet, 'By Department');
  
  // Export the file
  const filename = options.filename || `task-report-${new Date().toISOString().split('T')[0]}.xlsx`;
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(data, filename);
}