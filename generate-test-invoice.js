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
    '(Supplier: Bharat Steel & Cement Works Pvt. Ltd.) Tj',
    '0 -15 Td',
    '(Address: B-12, MIDC Industrial Estate, Pune, Maharashtra - 411019) Tj',
    '0 -15 Td',
    '(GSTIN: 27AABCB4321K1ZT   |   PAN: AABCB4321K) Tj',
    '0 -15 Td',
    '(Phone: +91-20-66778899   |   Email: accounts@bharatsteel.in) Tj',
    '0 -20 Td',
    '(------------------------------------------------------------------------) Tj',
    '0 -15 Td',
    '(Invoice No: BSW/2025-26/1147          Date: 10-Feb-2026) Tj',
    '0 -15 Td',
    '(Place of Supply: Maharashtra (27)) Tj',
    '0 -20 Td',
    '(------------------------------------------------------------------------) Tj',
    '/F1 10 Tf',
    '0 -15 Td',
    '(Bill To:) Tj',
    '0 -15 Td',
    '(Rohith Infrastructure Pvt. Ltd.) Tj',
    '0 -15 Td',
    '(Survey No. 88, Baner Road, Pune, Maharashtra - 411045) Tj',
    '0 -15 Td',
    '(GSTIN: 27AADCR9876P1ZH) Tj',
    '0 -20 Td',
    '(------------------------------------------------------------------------) Tj',
    '0 -15 Td',
    '(S.No  Description                    HSN    Qty   Unit  Rate      Amount) Tj',
    '0 -15 Td',
    '(------------------------------------------------------------------------) Tj',
    '0 -15 Td',
    '(1.    OPC Cement 53 Grade (50kg)     2523   300   Bags  420.00   126000.00) Tj',
    '0 -15 Td',
    '(2.    TMT Steel Bars Fe500D (16mm)   7214   800   Kg    68.00     54400.00) Tj',
    '0 -15 Td',
    '(3.    AAC Blocks (600x200x150mm)     6810   500   NOS   52.00     26000.00) Tj',
    '0 -15 Td',
    '(4.    Portland Slag Cement (50kg)    2523   100   Bags  390.00    39000.00) Tj',
    '0 -15 Td',
    '(5.    Binding Wire (20 SWG)          7217   50    Kg    85.00      4250.00) Tj',
    '0 -20 Td',
    '(------------------------------------------------------------------------) Tj',
    '0 -15 Td',
    '(                                          Taxable Value:   2,49,650.00) Tj',
    '0 -15 Td',
    '(                                          CGST @ 9%:          22,468.50) Tj',
    '0 -15 Td',
    '(                                          SGST @ 9%:          22,468.50) Tj',
    '0 -15 Td',
    '(                                          IGST @ 0%:               0.00) Tj',
    '0 -15 Td',
    '(------------------------------------------------------------------------) Tj',
    '/F1 11 Tf',
    '0 -18 Td',
    '(                                   TOTAL INVOICE AMOUNT: Rs 2,94,587.00) Tj',
    '/F1 10 Tf',
    '0 -25 Td',
    '(Amount in Words: Rupees Two Lakh Ninety Four Thousand Five Hundred Eighty Seven Only) Tj',
    '0 -20 Td',
    '(------------------------------------------------------------------------) Tj',
    '0 -15 Td',
    '(Payment Terms: Net 45 days) Tj',
    '0 -15 Td',
    '(Bank: ICICI Bank  |  A/C: 123456789012  |  IFSC: ICIC0001234) Tj',
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

  const outputPath = path.join(__dirname, 'public', 'invoice-feb-2026.pdf');
  fs.writeFileSync(outputPath, pdf, 'latin1');
  console.log(`✅ Invoice PDF generated: ${outputPath}`);
  console.log(`   File size: ${fs.statSync(outputPath).size} bytes`);
}

createPDF();
