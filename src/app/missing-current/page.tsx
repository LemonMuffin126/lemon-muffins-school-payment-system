"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { ExclamationTriangleIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";
import { formatCurrency, getCurrentMonth, formatMonth, isPaymentLate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface MissingPayment {
  id: string;
  student_id: string;
  month: string;
  amount: number;
  total_amount: number;
  student: {
    name: string;
    grade: number;
  };
}

export default function MissingCurrentPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.email === 'mostanantachina@gmail.com';
  
  const [missingPayments, setMissingPayments] = useState<MissingPayment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const currentMonth = getCurrentMonth();

  // Redirect non-admin users
  if (session && !isAdmin) {
    router.push("/dashboard-simple");
    return null;
  }

  const fetchMissingPayments = async () => {
    try {
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
        .eq("month", currentMonth)
        .eq("is_paid", false);

      if (error) throw error;

      setMissingPayments(data || []);
    } catch (error) {
      console.error("Error fetching missing payments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissingPayments();
  }, []);

  const filteredPayments = missingPayments.filter((payment) =>
    payment.student?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalMissingAmount = filteredPayments.reduce((sum, payment) => sum + payment.total_amount, 0);

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
            <ExclamationTriangleIcon className="h-8 w-8 text-orange-500" />
            Missing This Month
          </h1>
          <p className="text-gray-600">Students who haven't paid for {formatMonth(currentMonth)}</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-orange-600">{filteredPayments.length}</div>
            <div className="text-gray-600">Students Missing Payment</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-red-600">
              {formatCurrency(totalMissingAmount)}
            </div>
            <div className="text-gray-600">Total Missing Amount</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-gray-900">
              {filteredPayments.filter(p => isPaymentLate(p.month)).length}
            </div>
            <div className="text-gray-600">Already Late (25th passed)</div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-6">
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

        {/* Missing Payments Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredPayments.length > 0 ? (
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
                      Amount Due
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                      Days Since Due
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayments.map((payment) => {
                    const isLate = isPaymentLate(payment.month);
                    const dueDate = new Date();
                    dueDate.setDate(18); // Collection day is 18th
                    const daysSinceDue = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
                    
                    return (
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
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(payment.total_amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              isLate
                                ? "bg-red-100 text-red-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {isLate ? "Late" : "Due Soon"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${
                            daysSinceDue > 0 ? "text-red-600" : "text-gray-900"
                          }`}>
                            {daysSinceDue > 0 ? `${daysSinceDue} days` : "Not yet due"}
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
              <ExclamationTriangleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                All Payments Collected!
              </h3>
              <p className="text-gray-500">
                All students have paid their fees for {formatMonth(currentMonth)}.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {filteredPayments.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex-1 sm:flex-none">
                Send Payment Reminders
              </button>
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex-1 sm:flex-none">
                Export Missing List
              </button>
              <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex-1 sm:flex-none">
                Generate Follow-up Report
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}