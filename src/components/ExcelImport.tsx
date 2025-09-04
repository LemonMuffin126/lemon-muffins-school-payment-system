"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { DocumentArrowUpIcon, ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";

interface StudentData {
  name: string;
  grade: number | string;
  year: number;
  monthly_fee?: number;
  subjects: string[];
}

interface ImportResult {
  success: number;
  errors: Array<{ row: number; error: string; data: any }>;
}

interface ExcelImportProps {
  onImportComplete: () => void;
  onClose: () => void;
}

export default function ExcelImport({ onImportComplete, onClose }: ExcelImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<StudentData[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseExcelFile(selectedFile);
    }
  };

  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const parsedData: StudentData[] = [];
        
        // Skip header row if it exists (row 0)
        const startRow = jsonData.length > 0 && typeof jsonData[0] === 'object' && 
                         Array.isArray(jsonData[0]) && 
                         typeof jsonData[0][0] === 'string' && 
                         (jsonData[0][0].toLowerCase().includes('name') || 
                          jsonData[0][0].toLowerCase().includes('student') ||
                          String(jsonData[0][0]).includes('Name')) ? 1 : 0;
        
        console.log('First few rows of Excel data:', jsonData.slice(0, 3));
        console.log('Starting from row:', startRow);

        // Group students by name and grade to handle multiple subject rows
        const studentMap = new Map<string, StudentData>();

        for (let i = startRow; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          
          // Skip empty rows
          if (!row || row.length === 0 || !row[0]) continue;

          try {
            const name = String(row[0] || '').trim();
            const gradeStr = String(row[1] || '').trim();
            // Handle year format like "2025 - 2026" or just "2025"
            const yearStr = String(row[2] || '').trim();
            const year = yearStr.includes('-') 
              ? parseInt(yearStr.split('-')[0].trim()) 
              : parseInt(yearStr) || new Date().getFullYear();
            const monthlyFeeFromFile = parseFloat(String(row[3] || '0'));
            const subjectsStr = String(row[4] || '').trim();
            
            console.log(`Row ${i + 1}:`, {
              name: name,
              grade: gradeStr,
              year: year,
              fee: monthlyFeeFromFile,
              subjects: subjectsStr,
              rawRow: row
            });
            
            // Extract subject from the subjects column - handle comma, space, or mixed separators
            const subjects = subjectsStr 
              ? subjectsStr.split(/[,\s]+/).map(s => s.trim()).filter(s => s.length > 0)
              : [];

            // Handle different grade formats and calculate correct fee per subject
            let grade: number | string = gradeStr;
            let feePerSubject = 0;
            
            const gradeUpper = gradeStr.toUpperCase();
            if (gradeUpper === 'K' || gradeUpper === 'PK1' || gradeUpper === 'PK2') {
              // Keep as string for K, PK1, PK2
              grade = gradeUpper;
              feePerSubject = 1700;
            } else {
              const gradeNum = parseInt(gradeStr);
              if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 6) {
                grade = gradeNum;
                feePerSubject = 1700;
              } else if (!isNaN(gradeNum) && gradeNum >= 7 && gradeNum <= 12) {
                grade = gradeNum;
                feePerSubject = 1800;
              }
            }

            if (name && (typeof grade === 'string' || (typeof grade === 'number' && grade >= 1 && grade <= 12))) {
              const studentKey = `${name.toLowerCase()}-${grade}`;
              
              if (studentMap.has(studentKey)) {
                // Add subjects to existing student
                const existingStudent = studentMap.get(studentKey)!;
                subjects.forEach(subject => {
                  if (!existingStudent.subjects.includes(subject)) {
                    existingStudent.subjects.push(subject);
                  }
                });
                
                // Recalculate total fee: base_fee_per_grade × total_number_of_subjects
                existingStudent.monthly_fee = feePerSubject * existingStudent.subjects.length;
                
                console.log(`Updated student ${name}: ${existingStudent.subjects.length} subjects at ${feePerSubject} each = ${existingStudent.monthly_fee} THB`);
              } else {
                // Calculate fee: base_fee_per_grade × number_of_subjects
                const totalFee = feePerSubject * Math.max(1, subjects.length);
                
                console.log(`New student ${name}: ${subjects.length} subjects at ${feePerSubject} each = ${totalFee} THB`);
                
                // Create new student entry
                studentMap.set(studentKey, {
                  name,
                  grade,
                  year,
                  monthly_fee: totalFee,
                  subjects
                });
              }
            }
          } catch (error) {
            console.error(`Error parsing row ${i + 1}:`, error);
          }
        }

        // Convert map to array
        parsedData.push(...Array.from(studentMap.values()));

        console.log('Final parsed data:', parsedData);
        setPreview(parsedData);
      } catch (error) {
        console.error('Excel parsing error:', error);
        alert(`Error reading Excel file: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    setImporting(true);
    const results: ImportResult = { success: 0, errors: [] };

    for (let i = 0; i < preview.length; i++) {
      const studentData = preview[i];
      
      try {
        // Prepare data for insertion
        const insertData = {
          name: studentData.name,
          grade: studentData.grade,
          year: studentData.year,
          subjects: studentData.subjects,
          monthly_fee: studentData.monthly_fee,
        };

        // Insert student
        const { error: studentError } = await supabase
          .from("students")
          .insert([insertData]);

        if (studentError) {
          results.errors.push({
            row: i + 1,
            error: studentError.message,
            data: studentData
          });
        } else {
          results.success++;
          
          // If monthly fee is provided and different from default, update fee settings
          if (studentData.monthly_fee && studentData.monthly_fee > 0) {
            const { error: feeError } = await supabase
              .from("fee_settings")
              .upsert([{
                grade: studentData.grade,
                monthly_fee: studentData.monthly_fee,
                registration_fee: 500, // Default registration fee
                late_fee_rate: Number(studentData.grade) <= 6 ? 50 : 100 // Default late fee
              }], { onConflict: 'grade' });
            
            if (feeError) {
              console.warn(`Warning: Could not update fee for grade ${studentData.grade}:`, feeError.message);
            }
          }
        }
      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: studentData
        });
      }
    }

    setImportResult(results);
    setImporting(false);
    
    if (results.success > 0) {
      onImportComplete();
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Name', 'Grade', 'Year', 'Monthly Fee (Optional)', 'Subjects (space-separated)'],
      ['John Smith', 8, 2025, '', 'MATH ENGLISH SCIENCE'], // Grade 8: 1800*3 = 5400 THB
      ['Jane Doe', 4, 2025, '', 'MATH ENGLISH'], // Grade 4: 1700*2 = 3400 THB
      ['Bob Johnson', 'PK1', 2025, '', 'MATH'], // PK1 = 1700/subject, 1 subject = 1700 THB
      ['Alice Brown', 'K', 2025, '', 'ENGLISH'], // K = 1700/subject, 1 subject = 1700 THB
      ['', '', '', '', ''],
      ['Fee Structure (auto-calculated if Monthly Fee is empty):'],
      ['K, PK1, PK2, Grades 1-6: 1700 THB per subject per month'],
      ['Grades 7-12: 1800 THB per subject per month'],
      ['', '', '', '', ''],
      ['Alternative format - One subject per row (fees will be summed):'],
      ['David Kim', 4, 2025, '', 'MATH'],
      ['David Kim', 4, 2025, '', 'ENGLISH'],
      ['Note: David total = 1700*2 subjects = 3400 THB (Grade 4)'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Name
      { wch: 8 },  // Grade
      { wch: 8 },  // Year
      { wch: 18 }, // Monthly Fee
      { wch: 25 }, // Subjects
    ];

    XLSX.writeFile(workbook, 'student-import-template.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Import Students from Excel</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Excel File Format (Two formats supported):</h3>
            <div className="text-sm text-blue-700 space-y-2">
              <div>
                <strong>Column Structure:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li><strong>Column 1:</strong> Student Name (Required)</li>
                  <li><strong>Column 2:</strong> Grade (K, PK1, PK2, 1-12, Required)</li>
                  <li><strong>Column 3:</strong> Year (Required)</li>
                  <li><strong>Column 4:</strong> Monthly Fee (Ignored - auto-calculated)</li>
                  <li><strong>Column 5:</strong> Subjects (Space-separated, e.g., "MATH ENGLISH SCIENCE")</li>
                </ul>
              </div>
              <div className="mt-3 p-2 bg-blue-100 rounded">
                <strong>Supported Formats:</strong>
                <ul className="ml-4 mt-1">
                  <li>• <strong>Format 1:</strong> One row per student with all subjects in one cell</li>
                  <li>• <strong>Format 2:</strong> Multiple rows per student (one row per subject) - like your data</li>
                </ul>
                <p className="mt-2 text-xs">The system will automatically group duplicate students, combine their subjects, and <strong>sum up the fees</strong> from all rows for each student.</p>
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                  <strong>Automatic Fee Calculation:</strong><br/>
                  • K, PK1, PK2, Grades 1-6: <strong>1,700 THB × number of subjects</strong><br/>
                  • Grades 7-12: <strong>1,800 THB × number of subjects</strong><br/>
                  <em>Monthly Fee column is ignored - fees are calculated automatically</em><br/>
                  <strong>Examples:</strong> Grade 4 + 2 subjects = 1,700 × 2 = 3,400 THB
                </div>
              </div>
            </div>
            <div className="mt-3">
              <button
                onClick={downloadTemplate}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                📥 Download Template File (Shows Both Formats)
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Excel File
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400">
              <div className="space-y-1 text-center">
                <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                  >
                    <span>Upload Excel file</span>
                    <input
                      ref={fileInputRef}
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">.xlsx, .xls files only</p>
              </div>
            </div>
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {file.name}
              </p>
            )}
          </div>

          {/* Preview */}
          {preview.length > 0 && !importResult && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Preview ({preview.length} students found)
              </h3>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subjects</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.slice(0, 10).map((student, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">{student.name}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{student.grade}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{student.year}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {student.monthly_fee ? `${student.monthly_fee.toLocaleString()} THB` : '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {student.subjects.join(', ') || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <div className="p-3 text-sm text-gray-500 text-center bg-gray-50">
                    ... and {preview.length - 10} more students
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Import Complete</h3>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800">
                    <strong>Successfully imported:</strong> {importResult.success} students
                  </p>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                      <p className="text-red-800 font-medium">
                        Errors ({importResult.errors.length}):
                      </p>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-700 mb-1">
                          <strong>Row {error.row}:</strong> {error.error}
                          <br />
                          <span className="text-xs">Data: {JSON.stringify(error.data)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {importResult ? 'Close' : 'Cancel'}
          </button>
          
          {preview.length > 0 && !importResult && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importing...
                </div>
              ) : (
                `Import ${preview.length} Students`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}