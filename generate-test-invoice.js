// Script to generate a test GST invoice PDF
// Run: node generate-test-invoice.js

const fs = require('fs');
const path = require('path');

function createPDF() {
  const lines = [];

  // PDF content stream (invoice text using PDF operators)
  const contentLines = [
    'BT',
    '/F1 20 Tf',
    '50 750 Td',
    '(TAX INVOICE) Tj',
    '/F1 10 Tf',
    '0 -30 Td',
    '(------------------------------------------------------------------------) Tj',
    '0 -15 Td',
    '(Supplier: Shree Cement & Aggregates Pvt. Ltd.) Tj',
    '0 -15 Td',
    '(Address: Plot 45, Industrial Area, Sector 12, Gurgaon, Haryana - 122001) Tj',
    '0 -15 Td',
    '(GSTIN: 06AABCS1429B1ZP   |   PAN: AABCS1429B) Tj',
    '0 -15 Td',
    '(Phone: +91-124-4567890   |   Email: billing@shreecement.in) Tj',
    '0 -20 Td',
    '(------------------------------------------------------------------------) Tj',
    '0 -15 Td',
    '(Invoice No: INV/2024-25/0892          Date: 15-Mar-2025) Tj',
    '0 -15 Td',
    '(Place of Supply: Haryana (06)) Tj',
    '0 -20 Td',
    '(------------------------------------------------------------------------) Tj',
    '/F1 10 Tf',
    '0 -15 Td',
    '(Bill To:) Tj',
    '0 -15 Td',
    '(Rajesh Constructions & Builders) Tj',
    '0 -15 Td',
    '(45-B, New Colony, Faridabad, Haryana - 121001) Tj',
    '0 -15 Td',
    '(GSTIN: 06AAXPR5678Q1ZM) Tj',
    '0 -20 Td',
    '(------------------------------------------------------------------------) Tj',
    '0 -15 Td',
    '(S.No  Description                    HSN    Qty   Unit  Rate      Amount) Tj',
    '0 -15 Td',
    '(------------------------------------------------------------------------) Tj',
    '0 -15 Td',
    '(1.    OPC Cement 53 Grade (50kg)     2523   200   Bags  380.00    76000.00) Tj',
    '0 -15 Td',
    '(2.    TMT Steel Bars Fe500 (12mm)    7214   500   Kg    65.00     32500.00) Tj',
    '0 -15 Td',
    '(3.    River Sand (Construction)      2505   10    Ton   1800.00   18000.00) Tj',
    '0 -15 Td',
    '(4.    20mm Crushed Stone Aggregate   2517   8     Ton   1200.00    9600.00) Tj',
    '0 -20 Td',
    '(------------------------------------------------------------------------) Tj',
    '0 -15 Td',
    '(                                          Taxable Value:   1,36,100.00) Tj',
    '0 -15 Td',
    '(                                          CGST @ 9%:          12,249.00) Tj',
    '0 -15 Td',
    '(                                          SGST @ 9%:          12,249.00) Tj',
    '0 -15 Td',
    '(                                          IGST @ 0%:               0.00) Tj',
    '0 -15 Td',
    '(------------------------------------------------------------------------) Tj',
    '/F1 11 Tf',
    '0 -18 Td',
    '(                                   TOTAL INVOICE AMOUNT: Rs 1,60,598.00) Tj',
    '/F1 10 Tf',
    '0 -25 Td',
    '(Amount in Words: Rupees One Lakh Sixty Thousand Five Hundred Ninety-Eight Only) Tj',
    '0 -20 Td',
    '(------------------------------------------------------------------------) Tj',
    '0 -15 Td',
    '(Payment Terms: Net 30 days) Tj',
    '0 -15 Td',
    '(Bank: HDFC Bank  |  A/C: 50200012345678  |  IFSC: HDFC0001234) Tj',
    '0 -20 Td',
    '(This is a computer generated invoice. No signature required.) Tj',
    'ET',
  ];

  const contentStream = contentLines.join('\n');
  const contentLength = Buffer.byteLength(contentStream, 'latin1');

  // Build PDF objects
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842]\n   /Contents 4 0 R\n   /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`;
  const obj4 = `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`;
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>\nendobj\n';

  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';

  // Calculate byte offsets for xref
  const offset1 = Buffer.byteLength(header, 'latin1');
  const offset2 = offset1 + Buffer.byteLength(obj1, 'latin1');
  const offset3 = offset2 + Buffer.byteLength(obj2, 'latin1');
  const offset4 = offset3 + Buffer.byteLength(obj3, 'latin1');
  const offset5 = offset4 + Buffer.byteLength(obj4, 'latin1');

  const body = header + obj1 + obj2 + obj3 + obj4 + obj5;
  const xrefOffset = Buffer.byteLength(body, 'latin1');

  const xref = [
    'xref',
    '0 6',
    '0000000000 65535 f \n' +
    `${String(offset1).padStart(10, '0')} 00000 n \n` +
    `${String(offset2).padStart(10, '0')} 00000 n \n` +
    `${String(offset3).padStart(10, '0')} 00000 n \n` +
    `${String(offset4).padStart(10, '0')} 00000 n \n` +
    `${String(offset5).padStart(10, '0')} 00000 n `,
  ].join('\n');

  const trailer = `\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const pdf = body + xref + trailer;

  const outputPath = path.join(__dirname, 'public', 'test-invoice.pdf');
  fs.writeFileSync(outputPath, pdf, 'latin1');
  console.log(`✅ Invoice PDF generated: ${outputPath}`);
  console.log(`   File size: ${fs.statSync(outputPath).size} bytes`);
}

createPDF();
