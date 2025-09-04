import { format, parseISO, startOfMonth, endOfMonth, addDays, isBefore, isAfter } from "date-fns";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, "dd/MM/yyyy");
}

export function formatMonth(month: string): string {
  const [year, monthNum] = month.split("-");
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return format(date, "MMMM yyyy");
}

export function getCurrentMonth(): string {
  return format(new Date(), "yyyy-MM");
}

export function getMonthsForYear(year: number): string[] {
  const months = [];
  for (let i = 1; i <= 12; i++) {
    months.push(`${year}-${i.toString().padStart(2, "0")}`);
  }
  return months;
}

export function calculateLateFee(
  amount: number,
  lateFeeRate: number,
  paymentDate: Date,
  collectionDay: number = 18,
  lateFeeAfterDay: number = 25,
  lateFeeAmount: number = 50,
  paymentMonth?: string
): number {
  // For prepaid system: If we're calculating late fee for a payment,
  // we need to check if payment is made after the due date in the PREVIOUS month
  
  if (paymentMonth) {
    // Parse the payment month (e.g., "2025-09" for September fees)
    const [year, monthNum] = paymentMonth.split("-");
    const paymentMonthDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    
    // Calculate due date: lateFeeAfterDay of PREVIOUS month
    const previousMonth = new Date(paymentMonthDate);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const dueDate = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), lateFeeAfterDay);
    
    // If payment is made after the due date, apply late fee
    if (isAfter(paymentDate, dueDate)) {
      return lateFeeAmount;
    }
  } else {
    // Legacy calculation for backward compatibility
    const monthStart = startOfMonth(paymentDate);
    const lateFeeStartDate = addDays(monthStart, lateFeeAfterDay - 1);
    
    if (isBefore(paymentDate, lateFeeStartDate)) {
      return 0;
    }
    
    return lateFeeRate;
  }
  
  return 0;
}

export function isPaymentLate(
  month: string,
  collectionDay: number = 18,
  lateFeeAfterDay: number = 25
): boolean {
  const now = new Date();
  const [year, monthNum] = month.split("-");
  const monthStart = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  const lateFeeStartDate = addDays(monthStart, lateFeeAfterDay - 1);
  
  return isAfter(now, lateFeeStartDate);
}

export function getGradeName(grade: number): string {
  const gradeNames: { [key: number]: string } = {
    1: "Grade 1",
    2: "Grade 2", 
    3: "Grade 3",
    4: "Grade 4",
    5: "Grade 5",
    6: "Grade 6",
    7: "Grade 7",
    8: "Grade 8",
    9: "Grade 9",
    10: "Grade 10",
    11: "Grade 11",
    12: "Grade 12",
  };
  
  return gradeNames[grade] || `Grade ${grade}`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}