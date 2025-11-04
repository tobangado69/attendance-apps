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
