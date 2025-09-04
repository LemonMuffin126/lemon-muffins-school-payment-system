"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatCurrency, getCurrentMonth, formatMonth } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface PaymentStats {
  paid: number;
  unpaid: number;
  totalStudents: number;
  totalAmount: number;
  paidAmount: number;
  paidStudents: string[];
  unpaidStudents: string[];
}

interface MonthlyData {
  month: string;
  paid: number;
  unpaid: number;
  total: number;
}

const COLORS = {
  paid: "#10B981", // green
  unpaid: "#EF4444", // red
};

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({
    paid: 0,
    unpaid: 0,
    totalStudents: 0,
    totalAmount: 0,
    paidAmount: 0,
    paidStudents: [],
    unpaidStudents: [],
  });
  const [yearlyData, setYearlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonthlyStats = async (month: string) => {
    try {
      // Get all students
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, name, grade")
        .order("name");

      if (studentsError) {
        console.error("Database error:", studentsError);
        // Set empty state if database isn't set up yet
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
      // Set default empty state on any error
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

  const fetchYearlyStats = async (year: number) => {
    try {
      const monthlyData: MonthlyData[] = [];
      
      for (let month = 1; month <= 12; month++) {
        const monthStr = `${year}-${month.toString().padStart(2, "0")}`;
        
        // Get all students
        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select("id");

        if (studentsError) {
          console.error("Database error in yearly stats:", studentsError);
          // Create empty data for all months
          for (let m = 1; m <= 12; m++) {
            const mStr = `${year}-${m.toString().padStart(2, "0")}`;
            monthlyData.push({
              month: mStr,
              paid: 0,
              unpaid: 0,
              total: 0,
            });
          }
          break;
        }

        // Get payments for this month
        const { data: payments } = await supabase
          .from("payments")
          .select("student_id, is_paid")
          .eq("month", monthStr);

        const paymentMap = new Map(
          payments?.map(p => [p.student_id, p.is_paid]) || []
        );

        let paid = 0;
        let unpaid = 0;

        students?.forEach(student => {
          const isPaid = paymentMap.get(student.id);
          if (isPaid) {
            paid++;
          } else {
            unpaid++;
          }
        });

        monthlyData.push({
          month: monthStr,
          paid,
          unpaid,
          total: paid + unpaid,
        });
      }

      setYearlyData(monthlyData);
    } catch (error) {
      console.error("Error fetching yearly stats:", error);
      setYearlyData([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (viewMode === "month") {
        await fetchMonthlyStats(selectedMonth);
      } else {
        await fetchYearlyStats(selectedYear);
      }
      setLoading(false);
    };

    fetchData();
  }, [selectedMonth, selectedYear, viewMode]);

  const pieData = [
    { name: "Paid", value: paymentStats.paid, color: COLORS.paid },
    { name: "Unpaid", value: paymentStats.unpaid, color: COLORS.unpaid },
  ];

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

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const options = [];
    for (let i = 0; i < 5; i++) {
      const year = currentYear - i;
      options.push({ value: year, label: year.toString() });
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
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("month")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  viewMode === "month"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Monthly View
              </button>
              <button
                onClick={() => setViewMode("year")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  viewMode === "year"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Yearly View
              </button>
            </div>

            {viewMode === "month" ? (
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
            ) : (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {generateYearOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
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
                    Once set up, you'll see payment statistics, charts, and student data here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === "month" ? (
          <>
            {/* Monthly Stats Cards */}
            <div className={`grid grid-cols-1 gap-6 ${isAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-2xl font-bold text-gray-900">{paymentStats.totalStudents}</div>
                <div className="text-gray-600">Total Students</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-2xl font-bold text-green-600">{paymentStats.paid}</div>
                <div className="text-gray-600">Paid</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-2xl font-bold text-red-600">{paymentStats.unpaid}</div>
                <div className="text-gray-600">Unpaid</div>
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

            {/* Payment Statistics Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Payment Overview</h2>
                <div className="h-64 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {paymentStats.paid}
                      </div>
                      <div className="text-sm text-gray-600">
                        of {paymentStats.totalStudents}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Lists */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Student Details</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-green-600 mb-2">
                      Paid Students ({paymentStats.paid})
                    </h3>
                    <div className="max-h-32 overflow-y-auto">
                      {paymentStats.paidStudents.length > 0 ? (
                        <ul className="text-sm text-gray-700 space-y-1">
                          {paymentStats.paidStudents.map((name, index) => (
                            <li key={index}>{name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No paid students</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-red-600 mb-2">
                      Unpaid Students ({paymentStats.unpaid})
                    </h3>
                    <div className="max-h-32 overflow-y-auto">
                      {paymentStats.unpaidStudents.length > 0 ? (
                        <ul className="text-sm text-gray-700 space-y-1">
                          {paymentStats.unpaidStudents.map((name, index) => (
                            <li key={index}>{name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">All students have paid</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Yearly View */
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Yearly Overview - {selectedYear}</h2>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={(value) => formatMonth(value).split(" ")[0]}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => formatMonth(value)}
                  />
                  <Bar dataKey="paid" stackId="a" fill={COLORS.paid} name="Paid" />
                  <Bar dataKey="unpaid" stackId="a" fill={COLORS.unpaid} name="Unpaid" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}