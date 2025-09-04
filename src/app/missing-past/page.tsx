"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { ClockIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";
import { formatCurrency, getCurrentMonth, formatMonth } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface PastDuePayment {
  id: string;
  student_id: string;
  month: string;
  amount: number;
  total_amount: number;
  student: {
    name: string;
    grade: number;
  }[];
}

interface StudentPaymentSummary {
  student_id: string;
  student_name: string;
  grade: number;
  missing_months: string[];
  total_amount_due: number;
  months_behind: number;
}

export default function MissingPastPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  // Redirect non-admin users
  if (user && !isAdmin) {
    router.push("/dashboard-simple");
    return null;
  }
  const [pastDuePayments, setPastDuePayments] = useState<PastDuePayment[]>([]);
  const [studentSummaries, setStudentSummaries] = useState<StudentPaymentSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"detailed" | "summary">("summary");
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const currentMonth = getCurrentMonth();

  const fetchPastDuePayments = async (monthFilter: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id,
          student_id,
          month,
          amount,
          total_amount,
          student:students (
            name,
            grade
          )
        `)
        .eq("is_paid", false)
        .lt("month", monthFilter)
        .order("month", { ascending: false });

      if (error) throw error;

      setPastDuePayments(data || []);
      generateStudentSummaries(data || []);
    } catch (error) {
      console.error("Error fetching past due payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateStudentSummaries = (payments: PastDuePayment[]) => {
    const summaryMap = new Map<string, StudentPaymentSummary>();

    payments.forEach((payment) => {
      const key = payment.student_id;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          student_id: payment.student_id,
          student_name: payment.student?.[0]?.name || "",
          grade: payment.student?.[0]?.grade || 0,
          missing_months: [],
          total_amount_due: 0,
          months_behind: 0,
        });
      }

      const summary = summaryMap.get(key)!;
      summary.missing_months.push(payment.month);
      summary.total_amount_due += payment.total_amount;
      summary.months_behind = summary.missing_months.length;
    });

    // Sort by months behind (descending) and then by name
    const summaries = Array.from(summaryMap.values()).sort((a, b) => {
      if (b.months_behind !== a.months_behind) {
        return b.months_behind - a.months_behind;
      }
      return a.student_name.localeCompare(b.student_name);
    });

    setStudentSummaries(summaries);
  };

  useEffect(() => {
    fetchPastDuePayments(selectedMonth);
  }, [selectedMonth]);

  // Generate month options
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    for (let i = 0; i <= 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      options.push({
        value: monthStr,
        label: formatMonth(monthStr),
      });
    }
    return options;
  };

  const filteredPayments = pastDuePayments.filter((payment) =>
    payment.student?.[0]?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSummaries = studentSummaries.filter((summary) =>
    summary.student_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPastDue = pastDuePayments.reduce((sum, payment) => sum + payment.total_amount, 0);
  const uniqueStudents = new Set(pastDuePayments.map(p => p.student_id)).size;

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ClockIcon className="h-8 w-8 text-red-500" />
            Past Due Payments
          </h1>
          <p className="text-gray-600">Students with outstanding payments from previous months</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-red-600">{uniqueStudents}</div>
            <div className="text-gray-600">Students with Past Due</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-red-600">{pastDuePayments.length}</div>
            <div className="text-gray-600">Total Missing Payments</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-red-600">
              {formatCurrency(totalPastDue)}
            </div>
            <div className="text-gray-600">Total Amount Due</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-orange-600">
              {studentSummaries.filter(s => s.months_behind >= 3).length}
            </div>
            <div className="text-gray-600">3+ Months Behind</div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col gap-4">
            {/* Month Selector */}
            <div className="flex flex-wrap gap-4 items-center">
              <label className="text-sm font-medium text-gray-700">Show past due payments before:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                {generateMonthOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500">
                (Payments due before {formatMonth(selectedMonth)})
              </span>
            </div>
            
            {/* View Mode and Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("summary")}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    viewMode === "summary"
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Student Summary
                </button>
                <button
                  onClick={() => setViewMode("detailed")}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    viewMode === "detailed"
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Detailed View
                </button>
              </div>
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
            </div>
          </div>
        </div>

        {/* Content based on view mode */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {viewMode === "summary" ? (
            // Student Summary View
            filteredSummaries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                        Months Behind
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                        Total Amount Due
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                        Missing Months
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                        Priority
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSummaries.map((summary) => {
                      const getPriorityColor = (monthsBehind: number) => {
                        if (monthsBehind >= 4) return "bg-red-100 text-red-800";
                        if (monthsBehind >= 2) return "bg-orange-100 text-orange-800";
                        return "bg-yellow-100 text-yellow-800";
                      };

                      const getPriorityLabel = (monthsBehind: number) => {
                        if (monthsBehind >= 4) return "Critical";
                        if (monthsBehind >= 2) return "High";
                        return "Medium";
                      };

                      return (
                        <tr key={summary.student_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {summary.student_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              Grade {summary.grade}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-red-600">
                              {summary.months_behind} months
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(summary.total_amount_due)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600">
                              {summary.missing_months
                                .sort()
                                .map(month => formatMonth(month).split(" ")[0])
                                .join(", ")}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                                summary.months_behind
                              )}`}
                            >
                              {getPriorityLabel(summary.months_behind)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <ClockIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Past Due Payments
                </h3>
                <p className="text-gray-500">
                  All students are up to date with their payments.
                </p>
              </div>
            )
          ) : (
            // Detailed View
            filteredPayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                        Month
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                        Amount Due
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                        Months Overdue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPayments.map((payment) => {
                      const paymentDate = new Date(payment.month + "-01");
                      const selectedDate = new Date(selectedMonth + "-01");
                      const monthsOverdue = (selectedDate.getFullYear() - paymentDate.getFullYear()) * 12 + 
                                          (selectedDate.getMonth() - paymentDate.getMonth());

                      return (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {payment.student?.[0]?.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              Grade {payment.student?.[0]?.grade}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatMonth(payment.month)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(payment.total_amount)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${
                              monthsOverdue >= 3 ? "text-red-600" : "text-orange-600"
                            }`}>
                              {monthsOverdue} months
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <ClockIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Past Due Payments
                </h3>
                <p className="text-gray-500">
                  All students are up to date with their payments.
                </p>
              </div>
            )
          )}
        </div>

        {/* Action Buttons */}
        {(filteredSummaries.length > 0 || filteredPayments.length > 0) && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex-1 sm:flex-none">
                Send Urgent Notices
              </button>
              <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex-1 sm:flex-none">
                Schedule Parent Meetings
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex-1 sm:flex-none">
                Export Overdue Report
              </button>
              <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex-1 sm:flex-none">
                Create Payment Plans
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}