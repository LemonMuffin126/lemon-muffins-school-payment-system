"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { MagnifyingGlassIcon, PlusIcon, DocumentIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";
import { formatCurrency, getCurrentMonth, formatMonth, calculateLateFee } from "@/lib/utils";
import { generateReceiptPDF, printReceipt } from "@/lib/receiptGenerator";
import { exportPaidStudents, exportUnpaidStudents, exportAllStudentsWithStatus, exportByGrade } from "@/lib/excelExport";
import { useSession } from "next-auth/react";

interface Student {
  id: string;
  name: string;
  grade: number;
  year?: number;
  subjects?: string[];
  monthly_fee?: number;
}

interface Payment {
  id: string;
  student_id: string;
  month: string;
  amount: number;
  late_fee: number;
  total_amount: number;
  payment_method: string;
  reference?: string;
  paid_at?: string;
  is_paid: boolean;
  is_registration: boolean;
  is_half_month: boolean;
  student?: Student;
}

interface FeeSettings {
  grade: number;
  monthly_fee: number;
  registration_fee: number;
  late_fee_rate: number;
}

export default function PaymentsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.email === 'mostanantachina@gmail.com';
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeSettings, setFeeSettings] = useState<FeeSettings[]>([]);
  const [adminSettings, setAdminSettings] = useState<{[key: string]: string}>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedSchool, setSelectedSchool] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: "Cash/Transfer",
    reference: "",
    isRegistration: false,
    isHalfMonth: false,
    waiveRegistrationFee: false,
  });

  const fetchData = async () => {
    try {
      // Fetch students with monthly_fee, year, and subjects
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, name, grade, year, subjects, monthly_fee")
        .order("name");

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch fee settings
      const { data: feeData, error: feeError } = await supabase
        .from("fee_settings")
        .select("*")
        .order("grade");

      if (feeError) throw feeError;
      setFeeSettings(feeData || []);

      // Fetch admin settings
      const { data: adminData, error: adminError } = await supabase
        .from("admin_settings")
        .select("*");

      if (adminError) throw adminError;

      const settingsMap: {[key: string]: string} = {};
      (adminData || []).forEach(setting => {
        settingsMap[setting.setting_key] = setting.setting_value;
      });
      setAdminSettings(settingsMap);

      // Fetch or create payments for selected month
      await fetchPaymentsForMonth(selectedMonth, studentsData || [], feeData || []);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentsForMonth = async (
    month: string, 
    studentsData: Student[], 
    feeData: FeeSettings[]
  ) => {
    try {
      // Fetch existing payments for the month
      const { data: existingPayments, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("month", month);

      if (paymentsError) throw paymentsError;

      const paymentMap = new Map(
        existingPayments?.map(p => [p.student_id, p]) || []
      );

      // Create missing payment records and update existing ones if needed
      const allPayments: Payment[] = [];
      for (const student of studentsData) {
        let payment = paymentMap.get(student.id);
        const currentMonthlyFee = student.monthly_fee || 0;
        
        if (!payment) {
          // Always use student's individual monthly_fee - this should match what's shown in students page
          const monthlyFee = student.monthly_fee || 0;
          
          if (monthlyFee === 0) {
            console.warn(`Student ${student.name} has no monthly_fee set - this may indicate missing data`);
          }
          
          console.log(`Creating payment for ${student.name}: ${monthlyFee} THB for ${month}`);
          
          // Create payment record with exact monthly fee from student
          const { data: newPayment, error: createError } = await supabase
            .from("payments")
            .insert([{
              student_id: student.id,
              month,
              amount: monthlyFee,
              late_fee: 0,
              total_amount: monthlyFee,
              is_paid: false,
            }])
            .select()
            .single();

          if (createError) {
            console.error(`Error creating payment for ${student.name}:`, createError);
            throw createError;
          }
          payment = newPayment;
        } else {
          // Check if existing payment amount matches current student monthly fee
          if (!payment.is_paid && payment.amount !== currentMonthlyFee && currentMonthlyFee > 0) {
            console.log(`Updating payment amount for ${student.name}: ${payment.amount} -> ${currentMonthlyFee} THB`);
            
            // Update existing unpaid payment to match current monthly fee
            const { data: updatedPayment, error: updateError } = await supabase
              .from("payments")
              .update({
                amount: currentMonthlyFee,
                total_amount: currentMonthlyFee
              })
              .eq("id", payment.id)
              .select()
              .single();

            if (updateError) {
              console.error(`Error updating payment for ${student.name}:`, updateError);
            } else {
              payment = updatedPayment;
            }
          }
        }

        allPayments.push({
          ...payment,
          student,
        });
      }

      setPayments(allPayments);
    } catch (error) {
      console.error("Error fetching payments for month:", error);
      // Show user-friendly error message
      if (error.message && error.message.includes('column "monthly_fee" does not exist')) {
        alert("Database error: monthly_fee column is missing. Please run the database update SQL script.");
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (students.length > 0 && feeSettings.length > 0) {
      fetchPaymentsForMonth(selectedMonth, students, feeSettings);
    }
  }, [selectedMonth]);

  const filteredPayments = payments.filter((payment) =>
    payment.student?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMarkPaid = (payment: Payment) => {
    const feeSetting = feeSettings.find(fs => fs.grade === payment.student?.grade);
    const lateFeeAfterDay = parseInt(adminSettings.late_fee_after_day || "25");
    const lateFeeAmount = parseInt(adminSettings.late_fee_amount || "50");
    
    const lateFee = calculateLateFee(
      payment.amount,
      feeSetting?.late_fee_rate || 0,
      new Date(),
      18, // collection day (not used in prepaid system)
      lateFeeAfterDay,
      lateFeeAmount,
      payment.month // Pass payment month for prepaid calculation
    );
    
    setSelectedPayment(payment);
    setPaymentForm({
      amount: payment.amount || 0,
      paymentMethod: "Cash/Transfer",
      reference: "",
      isRegistration: false,
      isHalfMonth: false,
      waiveRegistrationFee: false,
    });
    setShowMarkPaidModal(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    try {
      let totalAmount = paymentForm.amount;
      let lateFee = 0;

      // Half month fee - reduce base amount to half FIRST
      if (paymentForm.isHalfMonth) {
        totalAmount = totalAmount / 2;
        console.log(`Half month applied: ${paymentForm.amount} -> ${totalAmount}`);
      }

      // Calculate late fee based on (possibly reduced) amount using prepaid system
      const feeSetting = feeSettings.find(fs => fs.grade === selectedPayment.student?.grade);
      const lateFeeAfterDay = parseInt(adminSettings.late_fee_after_day || "25");
      const lateFeeAmount = parseInt(adminSettings.late_fee_amount || "50");
      
      lateFee = calculateLateFee(
        totalAmount,
        feeSetting?.late_fee_rate || 0,
        new Date(),
        18, // collection day (not used in prepaid system)
        lateFeeAfterDay,
        lateFeeAmount,
        selectedPayment.month // Pass payment month for prepaid calculation
      );

      // Add registration fee (535 THB) if applicable and not waived
      if (paymentForm.isRegistration && !paymentForm.waiveRegistrationFee) {
        totalAmount += 535;
        console.log(`Registration fee added: +535 THB`);
      }

      // Add late fee
      totalAmount += lateFee;
      
      console.log(`Final calculation: Base=${paymentForm.amount}, Half=${paymentForm.isHalfMonth}, Registration=${paymentForm.isRegistration}, Late=${lateFee}, Total=${totalAmount}`);

      const { data, error } = await supabase
        .from("payments")
        .update({
          amount: paymentForm.isHalfMonth ? paymentForm.amount / 2 : paymentForm.amount,
          late_fee: lateFee,
          total_amount: totalAmount,
          payment_method: paymentForm.paymentMethod,
          reference: paymentForm.reference || null,
          paid_at: new Date().toISOString(),
          is_paid: true,
          is_registration: paymentForm.isRegistration,
          is_half_month: paymentForm.isHalfMonth,
        })
        .eq("id", selectedPayment.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setPayments(payments.map(p => 
        p.id === selectedPayment.id 
          ? { ...p, ...data, student: p.student }
          : p
      ));

      setShowMarkPaidModal(false);
      setSelectedPayment(null);
    } catch (error) {
      console.error("Error marking payment as paid:", error);
    }
  };

  const calculatePreviewTotal = () => {
    let total = paymentForm.amount;
    
    // Half month reduction
    if (paymentForm.isHalfMonth) {
      total = total / 2;
    }
    
    // Registration fee
    if (paymentForm.isRegistration && !paymentForm.waiveRegistrationFee) {
      total += 535;
    }
    
    // Late fee using prepaid system
    const feeSetting = feeSettings.find(fs => fs.grade === selectedPayment?.student?.grade);
    const lateFeeAfterDay = parseInt(adminSettings.late_fee_after_day || "25");
    const lateFeeAmount = parseInt(adminSettings.late_fee_amount || "50");
    
    const lateFee = calculateLateFee(
      total,
      feeSetting?.late_fee_rate || 0,
      new Date(),
      18, // collection day (not used in prepaid system)
      lateFeeAfterDay,
      lateFeeAmount,
      selectedPayment?.month // Pass payment month for prepaid calculation
    );
    total += lateFee;
    
    return { total, lateFee };
  };

  const handleMarkUnpaid = async (payment: Payment) => {
    const confirmMessage = `⚠️ REVERSE PAYMENT CONFIRMATION ⚠️\n\n` +
      `Student: ${payment.student?.name}\n` +
      `Month: ${formatMonth(payment.month)}\n` +
      `Current Status: PAID (${formatCurrency(payment.total_amount)})\n` +
      `Will become: UNPAID (${formatCurrency(payment.student?.monthly_fee || payment.amount)})\n\n` +
      `This will:\n` +
      `• Reset payment to unpaid status\n` +
      `• Clear payment date and reference\n` +
      `• Remove registration/half-month flags\n` +
      `• Reset amount to original monthly fee\n\n` +
      `Are you sure you want to proceed?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Reset payment to unpaid state
      const { data, error } = await supabase
        .from("payments")
        .update({
          amount: payment.student?.monthly_fee || payment.amount, // Reset to original monthly fee
          late_fee: 0,
          total_amount: payment.student?.monthly_fee || payment.amount,
          payment_method: 'Cash/Transfer',
          reference: null,
          paid_at: null,
          is_paid: false,
          is_registration: false,
          is_half_month: false,
        })
        .eq("id", payment.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setPayments(payments.map(p => 
        p.id === payment.id 
          ? { ...p, ...data, student: p.student }
          : p
      ));

      console.log(`Marked ${payment.student?.name} as unpaid for ${formatMonth(payment.month)}`);
      
      // Show success message
      alert(`✅ SUCCESS\n\n${payment.student?.name} has been marked as UNPAID for ${formatMonth(payment.month)}.\n\nThe payment record has been reset to its original state.`);
      
    } catch (error) {
      console.error("Error marking payment as unpaid:", error);
      alert(`❌ ERROR\n\nFailed to mark payment as unpaid.\nError: ${error.message || error}\n\nPlease try again.`);
    }
  };

  const generateReceipt = async (payment: Payment) => {
    try {
      // Fetch school settings from database
      const { data: adminSettings } = await supabase
        .from("admin_settings")
        .select("*");

      const settingsMap = new Map((adminSettings || []).map(s => [s.setting_key, s.setting_value]));
      
      const receiptData = {
        id: payment.id,
        student_name: payment.student?.name || "",
        student_grade: payment.student?.grade || 0,
        student_year: payment.student?.year,
        student_subjects: payment.student?.subjects || [],
        month: payment.month,
        amount: payment.amount,
        late_fee: payment.late_fee,
        total_amount: payment.total_amount,
        payment_method: payment.payment_method,
        reference: payment.reference,
        paid_at: payment.paid_at || new Date().toISOString(),
        is_registration: payment.is_registration,
        is_half_month: payment.is_half_month,
        waive_registration_fee: false, // This would need to be stored in payment record
        registration_fee_amount: 535,
      };

      const schoolInfo = {
        name: settingsMap.get(`school${selectedSchool}_name`) || `School ${selectedSchool}`,
        address: settingsMap.get(`school${selectedSchool}_address`) || `Address for School ${selectedSchool}`,
        phone: settingsMap.get(`school${selectedSchool}_phone`) || undefined,
        email: settingsMap.get(`school${selectedSchool}_email`) || undefined,
      };

      // Show options for PDF or Print
      const action = window.confirm("Choose OK for PDF download, Cancel for print");
      
      if (action) {
        await generateReceiptPDF(receiptData, schoolInfo);
      } else {
        await printReceipt(receiptData, schoolInfo);
      }
    } catch (error) {
      console.error("Error generating receipt:", error);
      alert("Error generating receipt. Please try again.");
    }
  };

  const handleExportPaid = () => {
    const paidStudents = filteredPayments
      .filter(p => p.is_paid)
      .map(p => ({
        id: p.id,
        name: p.student?.name || '',
        grade: p.student?.grade || 0,
        year: new Date().getFullYear(),
        subjects: [], // We don't have subjects in payment data
        monthly_fee: p.amount,
        payment_status: 'paid' as const,
        amount: p.amount,
        late_fee: p.late_fee,
        total_amount: p.total_amount,
        payment_method: p.payment_method,
        reference: p.reference,
        paid_at: p.paid_at,
        is_registration: p.is_registration,
        is_half_month: p.is_half_month,
      }));

    exportPaidStudents(paidStudents, {
      month: selectedMonth,
      includePaymentDetails: true,
    });
  };

  const handleExportUnpaid = () => {
    const unpaidStudents = filteredPayments
      .filter(p => !p.is_paid)
      .map(p => ({
        id: p.id,
        name: p.student?.name || '',
        grade: p.student?.grade || 0,
        year: new Date().getFullYear(),
        subjects: [],
        monthly_fee: p.amount,
        payment_status: 'unpaid' as const,
      }));

    exportUnpaidStudents(unpaidStudents, {
      month: selectedMonth,
    });
  };

  const handleExportAll = () => {
    const allStudents = filteredPayments.map(p => ({
      id: p.id,
      name: p.student?.name || '',
      grade: p.student?.grade || 0,
      year: new Date().getFullYear(),
      subjects: [],
      monthly_fee: p.amount,
      payment_status: p.is_paid ? 'paid' as const : 'unpaid' as const,
      amount: p.amount,
      late_fee: p.late_fee,
      total_amount: p.total_amount,
      payment_method: p.payment_method,
      reference: p.reference,
      paid_at: p.paid_at,
      is_registration: p.is_registration,
      is_half_month: p.is_half_month,
    }));

    exportAllStudentsWithStatus(allStudents, {
      month: selectedMonth,
      includePaymentDetails: true,
    });
  };

  const handleExportByGrade = () => {
    const allStudents = filteredPayments.map(p => ({
      id: p.id,
      name: p.student?.name || '',
      grade: p.student?.grade || 0,
      year: new Date().getFullYear(),
      subjects: [],
      monthly_fee: p.amount,
      payment_status: p.is_paid ? 'paid' as const : 'unpaid' as const,
      amount: p.amount,
      late_fee: p.late_fee,
      total_amount: p.total_amount,
      payment_method: p.payment_method,
      reference: p.reference,
      paid_at: p.paid_at,
      is_registration: p.is_registration,
      is_half_month: p.is_half_month,
    }));

    exportByGrade(allStudents, {
      month: selectedMonth,
    });
  };

  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    // Generate months from 11 months ago to 3 months in the future
    for (let i = -11; i <= 3; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      options.push({
        value: monthStr,
        label: formatMonth(monthStr),
      });
    }
    return options;
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Payments
            <span className="text-lg font-normal text-purple-600 ml-3">
              - {adminSettings[`school${selectedSchool}_name`] || `School ${selectedSchool}`}
            </span>
          </h1>
          <p className="text-gray-600">Manage monthly fee payments</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by student name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-4 items-center">
              {/* School Switcher */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSchool(1)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    selectedSchool === 1
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  School 1
                </button>
                <button
                  onClick={() => setSelectedSchool(2)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    selectedSchool === 2
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  School 2
                </button>
              </div>

              {/* Month Selector */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {generateMonthOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">
              {filteredPayments.length}
            </div>
            <div className="text-gray-600">Total Students</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">
              {filteredPayments.filter(p => p.is_paid).length}
            </div>
            <div className="text-gray-600">Paid</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-red-600">
              {filteredPayments.filter(p => !p.is_paid).length}
            </div>
            <div className="text-gray-600">Unpaid</div>
          </div>
          {isAdmin && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  filteredPayments
                    .filter(p => p.is_paid)
                    .reduce((sum, p) => sum + p.total_amount, 0)
                )}
              </div>
              <div className="text-gray-600">Total Collected</div>
            </div>
          )}
          {!isAdmin && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-gray-400">
                ***
              </div>
              <div className="text-gray-600 flex items-center gap-1">
                Total Collected 
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Admin Only</span>
              </div>
            </div>
          )}
        </div>

        {/* Export Options - Admin Only */}
        {isAdmin ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Export Payment Data</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportPaid}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Export Paid Students
              </button>
              <button
                onClick={handleExportUnpaid}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Export Unpaid Students
              </button>
              <button
                onClick={handleExportAll}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Export All Students
              </button>
              <button
                onClick={handleExportByGrade}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Export by Grade
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Export Payment Data</h3>
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <ArrowDownTrayIcon className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-600">Export features are restricted to administrators only.</p>
              <p className="text-sm text-gray-500 mt-1">Contact your admin for payment data reports.</p>
            </div>
          </div>
        )}

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Late Fee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.student?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Grade {payment.student?.grade}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(payment.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(payment.late_fee)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(payment.total_amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          payment.is_paid
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {payment.is_paid ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        {!payment.is_paid && (
                          <button
                            onClick={() => handleMarkPaid(payment)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Mark Paid
                          </button>
                        )}
                        {payment.is_paid && (
                          <>
                            <button
                              onClick={() => generateReceipt(payment)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                            >
                              <DocumentIcon className="h-4 w-4" />
                              Receipt
                            </button>
                            <button
                              onClick={() => handleMarkUnpaid(payment)}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              Mark Unpaid
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mark as Paid Modal */}
        {showMarkPaidModal && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-semibold mb-4">Mark as Paid</h2>
              <div className="mb-4">
                <p className="text-gray-600">
                  Student: <span className="font-medium">{selectedPayment.student?.name}</span>
                </p>
                <p className="text-gray-600">
                  Month: <span className="font-medium">{formatMonth(selectedPayment.month)}</span>
                </p>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (THB)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentForm.amount || 0}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={paymentForm.isRegistration}
                      onChange={(e) => setPaymentForm({ ...paymentForm, isRegistration: e.target.checked })}
                      className="mr-2"
                    />
                    Registration Fee
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={paymentForm.isHalfMonth}
                      onChange={(e) => setPaymentForm({ ...paymentForm, isHalfMonth: e.target.checked })}
                      className="mr-2"
                    />
                    Half Month
                  </label>
                </div>

                {paymentForm.isRegistration && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={paymentForm.waiveRegistrationFee}
                      onChange={(e) => setPaymentForm({ ...paymentForm, waiveRegistrationFee: e.target.checked })}
                      className="mr-2"
                    />
                    Waive Registration Fee
                  </label>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Cash/Transfer">Cash/Transfer</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Check">Check</option>
                    <option value="Online Payment">Online Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference/Slip No. (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentForm.reference || ""}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Payment Calculation Preview */}
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Calculation:</h4>
                  <div className="space-y-1 text-sm">
                    {paymentForm.isHalfMonth ? (
                      <div className="flex justify-between">
                        <span>Monthly Tuition (Half Month):</span>
                        <span>{formatCurrency(paymentForm.amount / 2)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span>Monthly Tuition:</span>
                        <span>{formatCurrency(paymentForm.amount)}</span>
                      </div>
                    )}
                    {paymentForm.isRegistration && !paymentForm.waiveRegistrationFee && (
                      <div className="flex justify-between text-green-600">
                        <span>Registration Fee:</span>
                        <span>+{formatCurrency(535)}</span>
                      </div>
                    )}
                    {calculatePreviewTotal().lateFee > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Late Fee:</span>
                        <span>+{formatCurrency(calculatePreviewTotal().lateFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-lg border-t pt-1">
                      <span>Total Amount:</span>
                      <span>{formatCurrency(calculatePreviewTotal().total)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                  >
                    Save & Generate Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMarkPaidModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}