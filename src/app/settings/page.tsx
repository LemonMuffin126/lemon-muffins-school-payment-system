"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { CogIcon, CurrencyDollarIcon, AcademicCapIcon, BuildingOffice2Icon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";
import { formatCurrency, getGradeName } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface FeeSettings {
  id: string;
  grade: number;
  monthly_fee: number;
  registration_fee: number;
  late_fee_rate: number;
}

interface AdminSetting {
  id: string;
  setting_key: string;
  setting_value: string;
}

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  // Redirect non-admin users
  if (user && !isAdmin) {
    router.push("/dashboard-simple");
    return null;
  }
  const [feeSettings, setFeeSettings] = useState<FeeSettings[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"fees" | "general">("fees");
  const [editingGrade, setEditingGrade] = useState<number | null>(null);

  const [tempSettings, setTempSettings] = useState({
    monthly_fee: 0,
    registration_fee: 0,
    late_fee_rate: 0,
  });

  const [generalSettings, setGeneralSettings] = useState({
    collection_day: 18,
    late_fee_after_day: 25,
    late_fee_amount: 50,
    school1_name: "",
    school1_address: "",
    school1_phone: "",
    school1_email: "",
    school2_name: "",
    school2_address: "",
    school2_phone: "",
    school2_email: "",
    currency: "THB",
  });

  const fetchFeeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("fee_settings")
        .select("*")
        .order("grade");

      if (error) throw error;
      setFeeSettings(data || []);
    } catch (error) {
      console.error("Error fetching fee settings:", error);
    }
  };

  const fetchAdminSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*");

      if (error) throw error;
      
      setAdminSettings(data || []);

      // Parse admin settings into generalSettings state
      const settingsMap = new Map((data || []).map(s => [s.setting_key, s.setting_value]));
      setGeneralSettings({
        collection_day: parseInt(settingsMap.get("collection_day") || "18"),
        late_fee_after_day: parseInt(settingsMap.get("late_fee_after_day") || "25"),
        late_fee_amount: parseInt(settingsMap.get("late_fee_amount") || "50"),
        school1_name: settingsMap.get("school1_name") || "",
        school1_address: settingsMap.get("school1_address") || "",
        school1_phone: settingsMap.get("school1_phone") || "",
        school1_email: settingsMap.get("school1_email") || "",
        school2_name: settingsMap.get("school2_name") || "",
        school2_address: settingsMap.get("school2_address") || "",
        school2_phone: settingsMap.get("school2_phone") || "",
        school2_email: settingsMap.get("school2_email") || "",
        currency: settingsMap.get("currency") || "THB",
      });
    } catch (error) {
      console.error("Error fetching admin settings:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchFeeSettings(), fetchAdminSettings()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const startEditingGrade = (feeSetting: FeeSettings) => {
    setEditingGrade(feeSetting.grade);
    setTempSettings({
      monthly_fee: feeSetting.monthly_fee,
      registration_fee: feeSetting.registration_fee,
      late_fee_rate: feeSetting.late_fee_rate,
    });
  };

  const saveGradeSettings = async () => {
    if (editingGrade === null) return;

    try {
      const { error } = await supabase
        .from("fee_settings")
        .update({
          monthly_fee: tempSettings.monthly_fee,
          registration_fee: tempSettings.registration_fee,
          late_fee_rate: tempSettings.late_fee_rate,
        })
        .eq("grade", editingGrade);

      if (error) throw error;

      setFeeSettings(feeSettings.map(fs => 
        fs.grade === editingGrade 
          ? { ...fs, ...tempSettings }
          : fs
      ));

      setEditingGrade(null);
    } catch (error) {
      console.error("Error updating fee settings:", error);
    }
  };

  const cancelEditingGrade = () => {
    setEditingGrade(null);
    setTempSettings({
      monthly_fee: 0,
      registration_fee: 0,
      late_fee_rate: 0,
    });
  };

  const saveGeneralSettings = async () => {
    try {
      const updates = [
        { setting_key: "collection_day", setting_value: generalSettings.collection_day.toString() },
        { setting_key: "late_fee_after_day", setting_value: generalSettings.late_fee_after_day.toString() },
        { setting_key: "late_fee_amount", setting_value: generalSettings.late_fee_amount.toString() },
        { setting_key: "school1_name", setting_value: generalSettings.school1_name },
        { setting_key: "school1_address", setting_value: generalSettings.school1_address },
        { setting_key: "school1_phone", setting_value: generalSettings.school1_phone },
        { setting_key: "school1_email", setting_value: generalSettings.school1_email },
        { setting_key: "school2_name", setting_value: generalSettings.school2_name },
        { setting_key: "school2_address", setting_value: generalSettings.school2_address },
        { setting_key: "school2_phone", setting_value: generalSettings.school2_phone },
        { setting_key: "school2_email", setting_value: generalSettings.school2_email },
        { setting_key: "currency", setting_value: generalSettings.currency },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("admin_settings")
          .upsert([update], { onConflict: "setting_key" });

        if (error) throw error;
      }

      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving general settings:", error);
      alert("Error saving settings. Please try again.");
    }
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CogIcon className="h-8 w-8 text-gray-600" />
            Settings
          </h1>
          <p className="text-gray-600">Configure system settings and fee structures</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab("fees")}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === "fees"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <CurrencyDollarIcon className="h-5 w-5 inline mr-2" />
                Fee Settings
              </button>
              <button
                onClick={() => setActiveTab("general")}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === "general"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <BuildingOffice2Icon className="h-5 w-5 inline mr-2" />
                General Settings
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "fees" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Grade Fee Configuration</h2>
                  <p className="text-gray-600 mb-6">
                    Configure monthly fees, registration fees, and late fee rates for each grade level.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grade
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monthly Fee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registration Fee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Late Fee Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {feeSettings.map((feeSetting) => (
                        <tr key={feeSetting.grade} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <AcademicCapIcon className="h-5 w-5 text-gray-400 mr-2" />
                              <div className="text-sm font-medium text-gray-900">
                                {getGradeName(feeSetting.grade)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingGrade === feeSetting.grade ? (
                              <input
                                type="number"
                                step="0.01"
                                value={tempSettings.monthly_fee}
                                onChange={(e) =>
                                  setTempSettings({
                                    ...tempSettings,
                                    monthly_fee: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              <div className="text-sm text-gray-900">
                                {formatCurrency(feeSetting.monthly_fee)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingGrade === feeSetting.grade ? (
                              <input
                                type="number"
                                step="0.01"
                                value={tempSettings.registration_fee}
                                onChange={(e) =>
                                  setTempSettings({
                                    ...tempSettings,
                                    registration_fee: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              <div className="text-sm text-gray-900">
                                {formatCurrency(feeSetting.registration_fee)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingGrade === feeSetting.grade ? (
                              <input
                                type="number"
                                step="0.01"
                                value={tempSettings.late_fee_rate}
                                onChange={(e) =>
                                  setTempSettings({
                                    ...tempSettings,
                                    late_fee_rate: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              <div className="text-sm text-gray-900">
                                {formatCurrency(feeSetting.late_fee_rate)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {editingGrade === feeSetting.grade ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={saveGradeSettings}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditingGrade}
                                  className="text-gray-600 hover:text-gray-900"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditingGrade(feeSetting)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">General System Settings</h2>
                  <p className="text-gray-600 mb-6">
                    Configure general system settings and school information.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Payment Settings</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Collection Day (Day of month)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={generalSettings.collection_day}
                        onChange={(e) =>
                          setGeneralSettings({
                            ...generalSettings,
                            collection_day: parseInt(e.target.value) || 18,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Day of the month when fees are due
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Late Fee After Day (Previous Month)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={generalSettings.late_fee_after_day}
                        onChange={(e) =>
                          setGeneralSettings({
                            ...generalSettings,
                            late_fee_after_day: parseInt(e.target.value) || 25,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Day in previous month after which late fees apply (e.g., 25th August for September fees)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Late Fee Amount (THB)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={generalSettings.late_fee_amount}
                        onChange={(e) =>
                          setGeneralSettings({
                            ...generalSettings,
                            late_fee_amount: e.target.value === "" ? 50 : parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Fixed late fee amount charged after the due date
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      <select
                        value={generalSettings.currency}
                        onChange={(e) =>
                          setGeneralSettings({
                            ...generalSettings,
                            currency: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="THB">Thai Baht (THB)</option>
                        <option value="USD">US Dollar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900">School Information</h3>
                    
                    {/* School 1 */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h4 className="text-md font-medium text-gray-800 mb-3">School 1</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            School Name
                          </label>
                          <input
                            type="text"
                            value={generalSettings.school1_name}
                            onChange={(e) =>
                              setGeneralSettings({
                                ...generalSettings,
                                school1_name: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            School Address
                          </label>
                          <textarea
                            rows={2}
                            value={generalSettings.school1_address}
                            onChange={(e) =>
                              setGeneralSettings({
                                ...generalSettings,
                                school1_address: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone
                            </label>
                            <input
                              type="text"
                              value={generalSettings.school1_phone}
                              onChange={(e) =>
                                setGeneralSettings({
                                  ...generalSettings,
                                  school1_phone: e.target.value,
                                })
                              }
                              placeholder="e.g., +66 2 123 4567"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={generalSettings.school1_email}
                              onChange={(e) =>
                                setGeneralSettings({
                                  ...generalSettings,
                                  school1_email: e.target.value,
                                })
                              }
                              placeholder="e.g., admin@school1.edu"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* School 2 */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h4 className="text-md font-medium text-gray-800 mb-3">School 2</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            School Name
                          </label>
                          <input
                            type="text"
                            value={generalSettings.school2_name}
                            onChange={(e) =>
                              setGeneralSettings({
                                ...generalSettings,
                                school2_name: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            School Address
                          </label>
                          <textarea
                            rows={2}
                            value={generalSettings.school2_address}
                            onChange={(e) =>
                              setGeneralSettings({
                                ...generalSettings,
                                school2_address: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone
                            </label>
                            <input
                              type="text"
                              value={generalSettings.school2_phone}
                              onChange={(e) =>
                                setGeneralSettings({
                                  ...generalSettings,
                                  school2_phone: e.target.value,
                                })
                              }
                              placeholder="e.g., +66 2 123 4567"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={generalSettings.school2_email}
                              onChange={(e) =>
                                setGeneralSettings({
                                  ...generalSettings,
                                  school2_email: e.target.value,
                                })
                              }
                              placeholder="e.g., admin@school2.edu"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={saveGeneralSettings}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Save General Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}