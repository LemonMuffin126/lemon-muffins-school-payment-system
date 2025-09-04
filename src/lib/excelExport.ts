import * as XLSX from "xlsx";
import { formatCurrency, formatDate, formatMonth } from "./utils";

interface StudentPaymentData {
  id: string;
  name: string;
  grade: number;
  year: number;
  subjects: string[];
  monthly_fee: number;
  payment_status: 'paid' | 'unpaid';
  amount?: number;
  late_fee?: number;
  total_amount?: number;
  payment_method?: string;
  reference?: string;
  paid_at?: string;
  is_registration?: boolean;
  is_half_month?: boolean;
}

export interface ExportOptions {
  month: string;
  includePaymentDetails?: boolean;
  includeFeeSettings?: boolean;
  customFilename?: string;
}

export const exportPaidStudents = (
  students: StudentPaymentData[],
  options: ExportOptions
) => {
  const paidStudents = students.filter(s => s.payment_status === 'paid');
  
  const exportData = paidStudents.map((student, index) => ({
    'No.': index + 1,
    'Student Name': student.name,
    'Grade': student.grade,
    'Year': student.year,
    'Subjects': student.subjects.join(', '),
    'Monthly Fee': formatCurrency(student.monthly_fee),
    'Payment Status': 'PAID',
    ...(options.includePaymentDetails && {
      'Amount Paid': formatCurrency(student.total_amount || 0),
      'Late Fee': formatCurrency(student.late_fee || 0),
      'Payment Method': student.payment_method || '',
      'Reference': student.reference || '',
      'Paid Date': student.paid_at ? formatDate(student.paid_at) : '',
      'Registration Fee': student.is_registration ? 'Yes' : 'No',
      'Half Month': student.is_half_month ? 'Yes' : 'No',
    })
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  
  // Set column widths
  const maxColWidths = [
    { wch: 5 },  // No.
    { wch: 25 }, // Student Name
    { wch: 8 },  // Grade
    { wch: 8 },  // Year
    { wch: 25 }, // Subjects
    { wch: 15 }, // Monthly Fee
    { wch: 12 }, // Payment Status
  ];

  if (options.includePaymentDetails) {
    maxColWidths.push(
      { wch: 15 }, // Amount Paid
      { wch: 12 }, // Late Fee
      { wch: 15 }, // Payment Method
      { wch: 15 }, // Reference
      { wch: 12 }, // Paid Date
      { wch: 12 }, // Registration Fee
      { wch: 12 }, // Half Month
    );
  }

  worksheet['!cols'] = maxColWidths;

  // Add title and summary
  XLSX.utils.sheet_add_aoa(worksheet, [
    [`Students Who Paid - ${formatMonth(options.month)}`],
    [`Total Paid Students: ${paidStudents.length}`],
    [`Total Amount Collected: ${formatCurrency(paidStudents.reduce((sum, s) => sum + (s.total_amount || 0), 0))}`],
    [`Export Date: ${formatDate(new Date())}`],
    [], // Empty row
  ], { origin: 'A1' });

  // Shift the data down to accommodate the header
  XLSX.utils.sheet_add_json(worksheet, exportData, { origin: 'A6' });

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Paid Students');

  const filename = options.customFilename || 
    `paid-students-${options.month}-${new Date().toISOString().split('T')[0]}.xlsx`;
  
  XLSX.writeFile(workbook, filename);
};

export const exportUnpaidStudents = (
  students: StudentPaymentData[],
  options: ExportOptions
) => {
  const unpaidStudents = students.filter(s => s.payment_status === 'unpaid');
  
  const exportData = unpaidStudents.map((student, index) => ({
    'No.': index + 1,
    'Student Name': student.name,
    'Grade': student.grade,
    'Year': student.year,
    'Subjects': student.subjects.join(', '),
    'Monthly Fee': formatCurrency(student.monthly_fee),
    'Payment Status': 'UNPAID',
    'Amount Due': formatCurrency(student.monthly_fee),
    'Days Overdue': calculateDaysOverdue(options.month),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No.
    { wch: 25 }, // Student Name
    { wch: 8 },  // Grade
    { wch: 8 },  // Year
    { wch: 25 }, // Subjects
    { wch: 15 }, // Monthly Fee
    { wch: 12 }, // Payment Status
    { wch: 15 }, // Amount Due
    { wch: 12 }, // Days Overdue
  ];

  // Add title and summary
  XLSX.utils.sheet_add_aoa(worksheet, [
    [`Students Who Haven't Paid - ${formatMonth(options.month)}`],
    [`Total Unpaid Students: ${unpaidStudents.length}`],
    [`Total Amount Due: ${formatCurrency(unpaidStudents.reduce((sum, s) => sum + s.monthly_fee, 0))}`],
    [`Export Date: ${formatDate(new Date())}`],
    [], // Empty row
  ], { origin: 'A1' });

  // Shift the data down
  XLSX.utils.sheet_add_json(worksheet, exportData, { origin: 'A6' });

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Unpaid Students');

  const filename = options.customFilename || 
    `unpaid-students-${options.month}-${new Date().toISOString().split('T')[0]}.xlsx`;
  
  XLSX.writeFile(workbook, filename);
};

export const exportAllStudentsWithStatus = (
  students: StudentPaymentData[],
  options: ExportOptions
) => {
  const workbook = XLSX.utils.book_new();
  
  // Summary Sheet
  const summaryData = [
    ['Payment Summary Report'],
    ['Month:', formatMonth(options.month)],
    ['Export Date:', formatDate(new Date())],
    [''],
    ['Summary Statistics:'],
    ['Total Students:', students.length],
    ['Paid Students:', students.filter(s => s.payment_status === 'paid').length],
    ['Unpaid Students:', students.filter(s => s.payment_status === 'unpaid').length],
    ['Total Amount Collected:', formatCurrency(students.filter(s => s.payment_status === 'paid').reduce((sum, s) => sum + (s.total_amount || 0), 0))],
    ['Total Amount Due:', formatCurrency(students.filter(s => s.payment_status === 'unpaid').reduce((sum, s) => sum + s.monthly_fee, 0))],
    ['Collection Rate:', `${((students.filter(s => s.payment_status === 'paid').length / students.length) * 100).toFixed(1)}%`],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // All Students Sheet
  const allStudentsData = students.map((student, index) => ({
    'No.': index + 1,
    'Student Name': student.name,
    'Grade': student.grade,
    'Year': student.year,
    'Subjects': student.subjects.join(', '),
    'Monthly Fee': formatCurrency(student.monthly_fee),
    'Payment Status': student.payment_status === 'paid' ? 'PAID' : 'UNPAID',
    'Amount': student.payment_status === 'paid' 
      ? formatCurrency(student.total_amount || 0) 
      : formatCurrency(student.monthly_fee),
    'Late Fee': student.payment_status === 'paid' 
      ? formatCurrency(student.late_fee || 0) 
      : '-',
    'Payment Method': student.payment_method || '',
    'Paid Date': student.paid_at ? formatDate(student.paid_at) : '',
    'Reference': student.reference || '',
  }));

  const allStudentsSheet = XLSX.utils.json_to_sheet(allStudentsData);
  allStudentsSheet['!cols'] = [
    { wch: 5 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 25 },
    { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
    { wch: 12 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(workbook, allStudentsSheet, 'All Students');

  // Paid Students Sheet
  const paidStudents = students.filter(s => s.payment_status === 'paid');
  if (paidStudents.length > 0) {
    const paidData = paidStudents.map((student, index) => ({
      'No.': index + 1,
      'Student Name': student.name,
      'Grade': student.grade,
      'Amount Paid': formatCurrency(student.total_amount || 0),
      'Late Fee': formatCurrency(student.late_fee || 0),
      'Payment Method': student.payment_method || '',
      'Paid Date': student.paid_at ? formatDate(student.paid_at) : '',
      'Reference': student.reference || '',
      'Registration': student.is_registration ? 'Yes' : 'No',
      'Half Month': student.is_half_month ? 'Yes' : 'No',
    }));

    const paidSheet = XLSX.utils.json_to_sheet(paidData);
    paidSheet['!cols'] = [
      { wch: 5 }, { wch: 25 }, { wch: 8 }, { wch: 15 }, { wch: 12 },
      { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, paidSheet, 'Paid Students');
  }

  // Unpaid Students Sheet
  const unpaidStudents = students.filter(s => s.payment_status === 'unpaid');
  if (unpaidStudents.length > 0) {
    const unpaidData = unpaidStudents.map((student, index) => ({
      'No.': index + 1,
      'Student Name': student.name,
      'Grade': student.grade,
      'Subjects': student.subjects.join(', '),
      'Amount Due': formatCurrency(student.monthly_fee),
      'Days Overdue': calculateDaysOverdue(options.month),
      'Contact Required': calculateDaysOverdue(options.month) > 7 ? 'URGENT' : 'NORMAL',
    }));

    const unpaidSheet = XLSX.utils.json_to_sheet(unpaidData);
    unpaidSheet['!cols'] = [
      { wch: 5 }, { wch: 25 }, { wch: 8 }, { wch: 25 }, { wch: 15 }, 
      { wch: 12 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, unpaidSheet, 'Unpaid Students');
  }

  const filename = options.customFilename || 
    `payment-report-${options.month}-${new Date().toISOString().split('T')[0]}.xlsx`;
  
  XLSX.writeFile(workbook, filename);
};

const calculateDaysOverdue = (month: string): number => {
  const [year, monthNum] = month.split('-');
  const dueDate = new Date(parseInt(year), parseInt(monthNum) - 1, 25); // 25th is the late fee date
  const today = new Date();
  
  if (today <= dueDate) return 0;
  
  const diffTime = today.getTime() - dueDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Export by grade level
export const exportByGrade = (
  students: StudentPaymentData[],
  options: ExportOptions
) => {
  const workbook = XLSX.utils.book_new();
  
  // Group students by grade
  const gradeGroups = students.reduce((groups, student) => {
    const grade = student.grade;
    if (!groups[grade]) groups[grade] = [];
    groups[grade].push(student);
    return groups;
  }, {} as Record<number, StudentPaymentData[]>);

  // Create a sheet for each grade
  Object.keys(gradeGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(grade => {
    const gradeStudents = gradeGroups[parseInt(grade)];
    const paidCount = gradeStudents.filter(s => s.payment_status === 'paid').length;
    
    const gradeData = gradeStudents.map((student, index) => ({
      'No.': index + 1,
      'Student Name': student.name,
      'Subjects': student.subjects.join(', '),
      'Payment Status': student.payment_status === 'paid' ? 'PAID' : 'UNPAID',
      'Amount': student.payment_status === 'paid' 
        ? formatCurrency(student.total_amount || 0) 
        : formatCurrency(student.monthly_fee),
      'Paid Date': student.paid_at ? formatDate(student.paid_at) : '',
    }));

    const gradeSheet = XLSX.utils.json_to_sheet(gradeData);
    
    // Add grade summary at the top
    XLSX.utils.sheet_add_aoa(gradeSheet, [
      [`Grade ${grade} - ${formatMonth(options.month)}`],
      [`Total Students: ${gradeStudents.length}, Paid: ${paidCount}, Unpaid: ${gradeStudents.length - paidCount}`],
      [], // Empty row
    ], { origin: 'A1' });

    // Shift the data down
    XLSX.utils.sheet_add_json(gradeSheet, gradeData, { origin: 'A4' });
    
    gradeSheet['!cols'] = [
      { wch: 5 }, { wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 12 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, gradeSheet, `Grade ${grade}`);
  });

  const filename = options.customFilename || 
    `payment-by-grade-${options.month}-${new Date().toISOString().split('T')[0]}.xlsx`;
  
  XLSX.writeFile(workbook, filename);
};