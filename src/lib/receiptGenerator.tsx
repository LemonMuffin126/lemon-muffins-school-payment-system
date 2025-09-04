import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { formatCurrency, formatDate, formatMonth } from "./utils";

interface ReceiptData {
  id: string;
  student_name: string;
  student_grade: number;
  student_year?: number;
  student_subjects?: string[];
  month: string;          // e.g. "2025-08" or "August 2025" (your formatMonth handles it)
  amount: number;         // base tuition (before late/registration/half-month)
  late_fee: number;
  total_amount: number;   // final amount charged (amount + late + etc.)
  payment_method: string; // 'cash' | 'bank' | 'transfer' etc.
  reference?: string;
  paid_at: string;        // ISO or display string
  is_registration: boolean;
  is_half_month: boolean;
  waive_registration_fee?: boolean;
  registration_fee_amount?: number;
}

interface SchoolInfo {
  name: string;
  address: string;
  phone?: string;
  email?: string;
}

const pmLabel = (method: string) => {
  switch (method.toLowerCase()) {
    case 'cash':
      return "เงินสด";
    case 'bank':
    case 'bank_transfer':
      return "โอนธนาคาร";
    case 'credit_card':
      return "บัตรเครดิต";
    case 'mobile_banking':
      return "Mobile Banking";
    case 'promptpay':
      return "PromptPay";
    default:
      return "ธนาคาร";
  }
};

export const generateReceiptHTML = (
  receipt: ReceiptData,
  schoolInfo: SchoolInfo,
  receiptNumber?: string
): string => {
  const receiptNo = receiptNumber || `${formatMonth(receipt.month).split(" ")[0]}-${receipt.id.slice(-5)}`;
  
  // Create student ID: year + first name (first part before space)
  const firstName = receipt.student_name.split(' ')[0];
  const year = receipt.student_year || new Date().getFullYear() + 543; // Thai Buddhist year
  const studentId = `${year}-${firstName}`;
  
  const currentDate = formatDate(new Date());
  const monthTH = formatMonth(receipt.month).split(" ")[0]; // "สิงหาคม" …

  // Calculate fee per subject based on grade
  const feePerSubject = receipt.student_grade >= 7 ? 1800 : 1700;
  const subjects = receipt.student_subjects || [];

  // helper: detailed charge rows
  const optionalRows = () => {
    const rows: string[] = [];
    
    // Show tuition fee for the month
    if (!receipt.is_half_month) {
      rows.push(`
        <tr>
          <td style="border:1px solid #000;padding:8px;font-size:14px;">
            ค่าเรียน
          </td>
          <td style="border:1px solid #000;padding:8px;text-align:right;font-size:14px;">
            ${formatCurrency(receipt.amount)}
          </td>
        </tr>`);
    } else {
      // For half month
      rows.push(`
        <tr>
          <td style="border:1px solid #000;padding:8px;font-size:14px;">
            ค่าเรียนครึ่งเดือน
          </td>
          <td style="border:1px solid #000;padding:8px;text-align:right;font-size:14px;">
            ${formatCurrency(receipt.amount)}
          </td>
        </tr>`);
    }

    // Registration fee handling
    if (receipt.is_registration) {
      const regFeeAmount = receipt.registration_fee_amount || 535;
      if (receipt.waive_registration_fee) {
        rows.push(`
          <tr>
            <td style="border:1px solid #000;padding:8px;font-size:14px;">
              ค่าลงทะเบียน (ยกเว้น)
            </td>
            <td style="border:1px solid #000;padding:8px;text-align:right;font-size:14px;">
              ${formatCurrency(0)}
            </td>
          </tr>`);
      } else {
        rows.push(`
          <tr>
            <td style="border:1px solid #000;padding:8px;font-size:14px;">
              ค่าลงทะเบียน
            </td>
            <td style="border:1px solid #000;padding:8px;text-align:right;font-size:14px;">
              ${formatCurrency(regFeeAmount)}
            </td>
          </tr>`);
      }
    }

    // Late fee
    if (receipt.late_fee > 0) {
      rows.push(`
        <tr>
          <td style="border:1px solid #000;padding:8px;font-size:14px;">ค่าปรับชำระล่าช้า</td>
          <td style="border:1px solid #000;padding:8px;text-align:right;font-size:14px;">${formatCurrency(receipt.late_fee)}</td>
        </tr>`);
    }
    
    return rows.join("");
  };

  const receiptBlock = (isOriginal: boolean) => `
  <div style="
    width:540px;
    margin:0 auto 28px auto;
    font-family:'Sarabun','Leelawadee UI','Tahoma',sans-serif;
    background:#fff;
    border:1px solid #000;
    padding:16px 16px 12px 16px;
    line-height:1.35;
    page-break-inside:avoid;
  ">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:8px;">
      <div style="font-weight:700;font-size:16px;">${schoolInfo.name || "โรงเรียนเสริมทักษะอุดรคอมพิวเตอร์พัฒนา"}</div>
      <div style="font-size:12px;margin-top:2px;">${schoolInfo.address || "491 ถนนนิตโย ตำบลหมากแข้ง อำเภอเมือง จังหวัดอุดรธานี"}</div>
      ${schoolInfo.phone || schoolInfo.email ? `
      <div style="font-size:11px;margin-top:2px;">
        ${schoolInfo.phone ? `โทร: ${schoolInfo.phone}` : ""} ${schoolInfo.email ? ` • อีเมล: ${schoolInfo.email}` : ""}
      </div>` : ""}
    </div>

    <div style="text-align:center;font-size:18px;font-weight:700;margin:8px 0 10px 0;">ใบเสร็จรับเงิน</div>

    <!-- Meta row -->
    <div style="display:flex;justify-content:space-between;gap:8px;font-size:14px;margin-bottom:6px;">
      <div><strong>รหัสนักเรียน:</strong> ${studentId}</div>
      <div><strong>วันที่:</strong> ${currentDate}</div>
    </div>
    <div style="font-size:14px;margin-bottom:4px;"><strong>Receipt No:</strong> ${receiptNo}</div>
    <div style="border-bottom:1px solid #000;margin:10px 0;"></div>
    <div style="font-size:14px;margin-bottom:12px;"><strong>ชื่อนักเรียน:</strong> ${receipt.student_name}</div>

    <!-- Month label -->
    <div style="text-align:center;font-size:14px;font-weight:700;margin:8px 0 12px;">
      ค่าเรียนประจำเดือน <span style="text-decoration:underline;">${monthTH}</span>
    </div>

    <!-- Charges Table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
      <thead>
        <tr>
          <th style="border:1px solid #000;padding:8px;text-align:center;font-size:14px;background:#f5f5f5;">รายการ</th>
          <th style="border:1px solid #000;padding:8px;text-align:center;font-size:14px;background:#f5f5f5;">จำนวนเงิน</th>
        </tr>
      </thead>
      <tbody>
        ${optionalRows()}
        <tr>
          <td style="border:1px solid #000;padding:8px;font-weight:700;background:#f5f5f5;font-size:14px;">รวม</td>
          <td style="border:1px solid #000;padding:8px;text-align:right;font-weight:700;background:#f5f5f5;font-size:14px;">${formatCurrency(receipt.total_amount)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Payment method / amount received -->
    <table style="width:100%;border-collapse:collapse;margin-top:10px;">
      <thead>
        <tr>
          <th style="border:1px solid #000;padding:8px;text-align:center;font-size:14px;background:#f5f5f5;">จำนวน</th>
          <th style="border:1px solid #000;padding:8px;text-align:center;font-size:14px;background:#f5f5f5;">วิธีการชำระ</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border:1px solid #000;padding:8px;text-align:center;font-size:14px;">ได้รับเงินจำนวน<br/>${formatCurrency(receipt.total_amount)}</td>
          <td style="border:1px solid #000;padding:8px;text-align:center;font-size:14px;">
            ${pmLabel(receipt.payment_method)}
            ${receipt.reference ? `<div style="font-size:12px;margin-top:4px;">Ref: ${receipt.reference}</div>` : ""}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Signer -->
    <div style="margin-top:28px;padding-top:8px;text-align:center;">
      <div style="border-bottom:1px solid #000;width:180px;margin:0 auto 8px;"></div>
      <div style="font-size:14px;">ผู้รับเงิน</div>
    </div>

    ${isOriginal ? `<div style="text-align:right;font-size:12px;margin-top:12px;">ส่วนของโรงเรียน</div>` : ``}
  </div>`;

  // two stacked copies: original + copy
  return `
    <div style="width:600px;margin:0 auto;padding:10px;background:#fff;">
      ${receiptBlock(true)}
      ${receiptBlock(false)}
    </div>
  `;
};

export const generateReceiptPDF = async (
  receiptData: ReceiptData,
  schoolInfo: SchoolInfo,
  receiptNumber?: string
): Promise<void> => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = generateReceiptHTML(receiptData, schoolInfo, receiptNumber);
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.style.top = "-9999px";
  document.body.appendChild(tempDiv);

  try {
    const canvas = await html2canvas(tempDiv.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const pxToMm = 0.264583;
    const imgWmm = canvas.width * pxToMm;
    const imgHmm = canvas.height * pxToMm;
    const ratio = Math.min(pdfW / imgWmm, pdfH / imgHmm);
    const w = imgWmm * ratio;
    const h = imgHmm * ratio;
    const x = (pdfW - w) / 2;
    const y = 8;

    pdf.addImage(imgData, "PNG", x, y, w, h);
    const filename = `receipt-${receiptData.student_name.replace(/\s+/g, "-")}-${receiptData.month}.pdf`;
    pdf.save(filename);
  } finally {
    document.body.removeChild(tempDiv);
  }
};

export const printReceipt = async (
  receiptData: ReceiptData,
  schoolInfo: SchoolInfo,
  receiptNumber?: string
): Promise<void> => {
  const win = window.open("", "_blank", "width=600,height=800");
  if (!win) throw new Error("Unable to open print window. Please allow popups.");

  const html = generateReceiptHTML(receiptData, schoolInfo, receiptNumber);

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt - ${receiptData.student_name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body { margin:0; padding:16px; background:#fff; font-family:'Sarabun','Leelawadee UI','Tahoma',sans-serif; }
          @media print {
            body { margin:0; padding:8mm; }
            .no-print { display:none; }
          }
        </style>
      </head>
      <body>
        ${html}
        <div class="no-print" style="text-align:center;margin-top:16px;">
          <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;margin-right:8px;">Print</button>
          <button onclick="window.close()" style="background:#6b7280;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;">Close</button>
        </div>
      </body>
    </html>
  `);
  win.document.close();
};
