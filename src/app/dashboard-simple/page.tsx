"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { formatCurrency, getCurrentMonth, formatMonth } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useSession } from "next-auth/react";

interface PaymentStats {
  paid: number;
  unpaid: number;
  totalStudents: number;
  totalAmount: number;
  paidAmount: number;
  paidStudents: string[];
  unpaidStudents: string[];
}

export default function SimpleDashboardPage() {
  const { data: session } = useSession();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({
    paid: 0,
    unpaid: 0,
    totalStudents: 0,
    totalAmount: 0,
    paidAmount: 0,
    paidStudents: [],
    unpaidStudents: [],
  });
  const [loading, setLoading] = useState(true);
  
  const isAdmin = session?.user?.email === 'mostanantachina@gmail.com';

  const fetchMonthlyStats = async (month: string) => {
    try {
      // Get all students
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, name, grade")
        .order("name");

      if (studentsError) {
        console.error("Database error:", studentsError);
        setPaymentStats({
          paid: 0,
          unpaid: 0,
          totalStudents: 0,
          totalAmount: 0,
          paidAmount: 0,
          paidStudents: [],
          unpaidStudents: [],
        });
        return;
      }

      // Get payments for the selected month
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("student_id, is_paid, total_amount")
        .eq("month", month);

      if (paymentsError) {
        console.error("Payments error:", paymentsError);
        return;
      }

      const paymentMap = new Map(
        payments?.map(p => [p.student_id, p]) || []
      );

      let paid = 0;
      let unpaid = 0;
      let totalAmount = 0;
      let paidAmount = 0;
      const paidStudents: string[] = [];
      const unpaidStudents: string[] = [];

      students?.forEach(student => {
        const payment = paymentMap.get(student.id);
        if (payment && payment.is_paid) {
          paid++;
          paidAmount += payment.total_amount;
          paidStudents.push(student.name);
        } else {
          unpaid++;
          unpaidStudents.push(student.name);
        }
        totalAmount += payment?.total_amount || 0;
      });

      setPaymentStats({
        paid,
        unpaid,
        totalStudents: students?.length || 0,
        totalAmount,
        paidAmount,
        paidStudents,
        unpaidStudents,
      });
    } catch (error) {
      console.error("Error fetching monthly stats:", error);
      setPaymentStats({
        paid: 0,
        unpaid: 0,
        totalStudents: 0,
        totalAmount: 0,
        paidAmount: 0,
        paidStudents: [],
        unpaidStudents: [],
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchMonthlyStats(selectedMonth);
      setLoading(false);
    };

    fetchData();
  }, [selectedMonth]);

  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
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
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  const paidPercentage = paymentStats.totalStudents > 0 
    ? Math.round((paymentStats.paid / paymentStats.totalStudents) * 100) 
    : 0;
  const unpaidPercentage = 100 - paidPercentage;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of payment statistics</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap gap-4 items-center">
            <label className="text-sm font-medium text-gray-700">Select Month:</label>
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

        {/* Database Setup Notice */}
        {paymentStats.totalStudents === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Database Setup Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    To see data in the dashboard, you need to set up your Supabase database:
                  </p>
                  <ol className="mt-2 list-decimal list-inside space-y-1">
                    <li>Go to your Supabase project dashboard</li>
                    <li>Navigate to SQL Editor</li>
                    <li>Run the SQL schema from <code className="bg-yellow-100 px-1 rounded">supabase-schema.sql</code></li>
                    <li>Add some test students through the Students page</li>
                  </ol>
                  <p className="mt-2">
                    Once set up, you'll see payment statistics and student data here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Stats Cards */}
        <div className={`grid grid-cols-1 gap-6 ${isAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{paymentStats.totalStudents}</div>
            <div className="text-gray-600">Total Students</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">{paymentStats.paid}</div>
            <div className="text-gray-600">Paid</div>
            <div className="text-sm text-gray-500">{paidPercentage}%</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-red-600">{paymentStats.unpaid}</div>
            <div className="text-gray-600">Unpaid</div>
            <div className="text-sm text-gray-500">{unpaidPercentage}%</div>
          </div>
          {isAdmin && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(paymentStats.paidAmount)}
              </div>
              <div className="text-gray-600">Amount Collected</div>
            </div>
          )}
        </div>

        {/* Payment Overview - Simple Progress Bar */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Payment Overview for {formatMonth(selectedMonth)}</h2>
          
          {paymentStats.totalStudents > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-green-600">Paid: {paymentStats.paid} students ({paidPercentage}%)</span>
                <span className="text-red-600">Unpaid: {paymentStats.unpaid} students ({unpaidPercentage}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-green-500 h-4 rounded-full transition-all duration-300" 
                  style={{ width: `${paidPercentage}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No students found. Add students to see payment statistics.</p>
          )}
        </div>

        {/* Student Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Paid Students */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-green-600 mb-4">
              Paid Students ({paymentStats.paid})
            </h3>
            <div className="max-h-64 overflow-y-auto">
              {paymentStats.paidStudents.length > 0 ? (
                <ul className="space-y-2">
                  {paymentStats.paidStudents.map((name, index) => (
                    <li key={index} className="flex items-center p-2 bg-green-50 rounded">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                      <span className="text-gray-700">{name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No paid students yet</p>
              )}
            </div>
          </div>

          {/* Unpaid Students */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-red-600 mb-4">
              Unpaid Students ({paymentStats.unpaid})
            </h3>
            <div className="max-h-64 overflow-y-auto">
              {paymentStats.unpaidStudents.length > 0 ? (
                <ul className="space-y-2">
                  {paymentStats.unpaidStudents.map((name, index) => (
                    <li key={index} className="flex items-center p-2 bg-red-50 rounded">
                      <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                      <span className="text-gray-700">{name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">All students have paid!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}