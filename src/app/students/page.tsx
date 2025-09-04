"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, DocumentArrowUpIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";
import { formatCurrency, getGradeName } from "@/lib/utils";
import ExcelImport from "@/components/ExcelImport";

interface Student {
  id: string;
  name: string;
  grade: number;
  year: number;
  subjects: string[];
  monthly_fee?: number;
  created_at: string;
}

interface FeeSettings {
  grade: number;
  monthly_fee: number;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [feeSettings, setFeeSettings] = useState<FeeSettings[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [newStudent, setNewStudent] = useState({
    name: "",
    grade: 1,
    year: new Date().getFullYear(),
    subjects: [] as string[],
  });

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("name");

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchFeeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("fee_settings")
        .select("grade, monthly_fee")
        .order("grade");

      if (error) throw error;
      setFeeSettings(data || []);
    } catch (error) {
      console.error("Error fetching fee settings:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStudents(), fetchFeeSettings()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = selectedGrade === "all" || student.grade === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  const getFeeForStudent = (student: Student): number => {
    // Use individual student's monthly_fee if available, otherwise fall back to fee_settings
    if (student.monthly_fee && student.monthly_fee > 0) {
      return student.monthly_fee;
    }
    const feeSetting = feeSettings.find((fs) => fs.grade === student.grade);
    return feeSetting?.monthly_fee || 0;
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one subject is selected
    if (newStudent.subjects.length === 0) {
      alert("Please select at least one subject");
      return;
    }
    
    try {
      // Calculate monthly fee based on grade and number of subjects
      const baseRate = (typeof newStudent.grade === 'number' && newStudent.grade >= 7) ? 1800 : 1700;
      const monthlyFee = baseRate * newStudent.subjects.length;
      
      const studentData = {
        ...newStudent,
        monthly_fee: monthlyFee
      };

      const { data, error } = await supabase
        .from("students")
        .insert([studentData])
        .select()
        .single();

      if (error) throw error;

      setStudents([...students, data]);
      setShowAddModal(false);
      setNewStudent({
        name: "",
        grade: 1,
        year: new Date().getFullYear(),
        subjects: [],
      });
    } catch (error) {
      console.error("Error adding student:", error);
      alert(`Error adding student: ${error.message || JSON.stringify(error)}`);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    // Validate that at least one subject is selected
    if (newStudent.subjects.length === 0) {
      alert("Please select at least one subject");
      return;
    }

    try {
      // Calculate monthly fee based on grade and number of subjects
      const baseRate = (typeof newStudent.grade === 'number' && newStudent.grade >= 7) ? 1800 : 1700;
      const monthlyFee = baseRate * newStudent.subjects.length;
      
      const studentData = {
        ...newStudent,
        monthly_fee: monthlyFee
      };

      const { data, error } = await supabase
        .from("students")
        .update(studentData)
        .eq("id", editingStudent.id)
        .select()
        .single();

      if (error) throw error;

      setStudents(students.map((s) => (s.id === editingStudent.id ? data : s)));
      setEditingStudent(null);
      setNewStudent({
        name: "",
        grade: 1,
        year: new Date().getFullYear(),
        subjects: [],
      });
    } catch (error) {
      console.error("Error updating student:", error);
      alert(`Error updating student: ${error.message || JSON.stringify(error)}`);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", studentId);

      if (error) throw error;

      setStudents(students.filter((s) => s.id !== studentId));
    } catch (error) {
      console.error("Error deleting student:", error);
      alert(`Error deleting student: ${error.message || JSON.stringify(error)}`);
    }
  };

  const startEdit = (student: Student) => {
    setEditingStudent(student);
    setNewStudent({
      name: student.name,
      grade: student.grade,
      year: student.year,
      subjects: student.subjects,
    });
  };

  const cancelEdit = () => {
    setEditingStudent(null);
    setNewStudent({
      name: "",
      grade: 1,
      year: new Date().getFullYear(),
      subjects: [],
    });
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Students</h1>
            <p className="text-gray-600">Manage student information</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowExcelImport(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <DocumentArrowUpIcon className="h-5 w-5" />
              Import Excel
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Add Student
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Grades</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                  <option key={grade} value={grade}>
                    {getGradeName(grade)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monthly Fee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subjects
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getGradeName(student.grade)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.year}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(getFeeForStudent(student))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {student.subjects.length > 0 ? student.subjects.join(", ") : "No subjects"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(student)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No students found</p>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {(showAddModal || editingStudent) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingStudent ? "Edit Student" : "Add New Student"}
              </h2>

              <form onSubmit={editingStudent ? handleEditStudent : handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade
                  </label>
                  <select
                    value={newStudent.grade}
                    onChange={(e) => setNewStudent({ ...newStudent, grade: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                      <option key={grade} value={grade}>
                        {getGradeName(grade)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={newStudent.year}
                    onChange={(e) => setNewStudent({ ...newStudent, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subjects
                  </label>
                  <div className="space-y-2">
                    {['THAI', 'MATH', 'ENGLISH'].map((subject) => (
                      <label key={subject} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newStudent.subjects.includes(subject)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewStudent({
                                ...newStudent,
                                subjects: [...newStudent.subjects, subject]
                              });
                            } else {
                              setNewStudent({
                                ...newStudent,
                                subjects: newStudent.subjects.filter(s => s !== subject)
                              });
                            }
                          }}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{subject}</span>
                      </label>
                    ))}
                  </div>
                  {newStudent.subjects.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">Please select at least one subject</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                  >
                    {editingStudent ? "Update" : "Add"} Student
                  </button>
                  <button
                    type="button"
                    onClick={editingStudent ? cancelEdit : () => setShowAddModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Excel Import Modal */}
        {showExcelImport && (
          <ExcelImport
            onImportComplete={() => {
              fetchStudents(); // Refresh the student list
              setShowExcelImport(false);
            }}
            onClose={() => setShowExcelImport(false)}
          />
        )}
      </div>
    </Layout>
  );
}