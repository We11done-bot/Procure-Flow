import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

// Set worker for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function wordToPDF(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;
  
  const doc = new jsPDF();
  const margin = 15;
  const width = doc.internal.pageSize.getWidth() - (margin * 2);
  
  // Clean HTML to text for simple PDF generation
  let text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) text = "Dokumen Word tidak memiliki teks yang dapat dikonversi.";
  
  const splitText = doc.splitTextToSize(text, width);
  doc.text(splitText, margin, 25);
  
  return doc.output('blob');
}

export interface InvoiceData {
  invoiceNumber: string;
  clientName: string;
  clientAddress: string;
  invoiceDate: string;
  dueDate: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  companyName: string;
  companyAddress: string;
  bankInfo?: string;
}

export async function generateInvoicePDF(data: InvoiceData) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text(data.companyName, 20, 20);
  doc.setFontSize(10);
  doc.text(data.companyAddress, 20, 30);
  
  doc.setFontSize(24);
  doc.setTextColor(100);
  doc.text('INVOICE', 140, 25);
  
  // Invoice Details
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Invoice No: ${data.invoiceNumber}`, 140, 35);
  doc.text(`Date: ${new Date(data.invoiceDate).toLocaleDateString()}`, 140, 40);
  doc.text(`Due Date: ${new Date(data.dueDate).toLocaleDateString()}`, 140, 45);
  
  // Client Info
  doc.setFontSize(12);
  doc.text('Bill To:', 20, 60);
  doc.setFontSize(10);
  doc.text(data.clientName, 20, 65);
  doc.text(data.clientAddress, 20, 70);
  
  // Items Table
  (doc as any).autoTable({
    startY: 85,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: data.items.map(item => [
      item.description,
      item.quantity.toString(),
      `Rp ${item.unitPrice.toLocaleString()}`,
      `Rp ${item.total.toLocaleString()}`
    ]),
    theme: 'grid',
    headStyles: { fillStyle: [20, 20, 20] }
  });
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text(`Subtotal: Rp ${data.subtotal.toLocaleString()}`, 140, finalY);
  doc.text(`Tax (${data.taxRate}%): Rp ${data.taxAmount.toLocaleString()}`, 140, finalY + 5);
  doc.setFontSize(12);
  doc.text(`Total: Rp ${data.totalAmount.toLocaleString()}`, 140, finalY + 12);
  
  // Bank Info
  if (data.bankInfo) {
    doc.setFontSize(10);
    doc.text('Payment Details:', 20, finalY + 20);
    doc.text(data.bankInfo, 20, finalY + 25);
  }
  
  // Notes
  if (data.notes) {
    doc.setFontSize(10);
    doc.text('Notes:', 20, finalY + 40);
    doc.text(data.notes, 20, finalY + 45);
  }
  
  return doc.output('blob');
}

export async function optimizePDF(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Image (JPEG/PNG) to PDF
 */
export async function imageToPDF(file: File) {
  const doc = new jsPDF();
  const imgData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
  
  const img = new Image();
  img.src = imgData;
  await new Promise(resolve => img.onload = resolve);
  
  const imgWidth = doc.internal.pageSize.getWidth();
  const imgHeight = (img.height * imgWidth) / img.width;
  
  doc.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
  return doc.output('blob');
}

import { Document, Packer, Paragraph, TextRun } from 'docx';
import { createWorker } from 'tesseract.js';

/**
 * Perform OCR on a blob (image or canvas)
 */
export async function performOCR(imageSource: Blob | string) {
  const worker = await createWorker('ind'); // Using Indonesian as default
  const { data: { text } } = await worker.recognize(imageSource);
  await worker.terminate();
  return text;
}

/**
 * PDF to Image (JPEG) - Returns first page as blob
 */
export async function pdfToImage(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  if (!context) throw new Error('Canvas context failed');
  
  await page.render({ 
    canvasContext: context, 
    viewport,
    canvas: canvas as any 
  }).promise;
  
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
  });
}

/**
 * Extract all pages as images for OCR
 */
async function pdfToImagesForOCR(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: Blob[] = [];

  for(let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    if (context) {
      await page.render({ canvasContext: context, viewport, canvas: canvas as any }).promise;
      const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.8));
      images.push(blob);
    }
  }
  return images;
}

/**
 * PDF to Word (docx) - Text extraction and creation with OCR fallback
 */
export async function pdfToWord(file: File, useOCR = false) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const sections = [];
  
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];
    
    let lines: string[] = [];

    if (items.length === 0 || useOCR) {
      // Fallback to OCR if page has no selectable text
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      if (context) {
        await page.render({ canvasContext: context, viewport, canvas: canvas as any }).promise;
        const ocrText = await performOCR(canvas.toDataURL('image/jpeg'));
        lines = ocrText.split('\n');
      }
    } else {
      items.sort((a, b) => {
        if (Math.abs(a.transform[5] - b.transform[5]) > 2) {
          return b.transform[5] - a.transform[5];
        }
        return a.transform[4] - b.transform[4];
      });

      let currentLine = "";
      let lastY = -1;

      items.forEach(item => {
        const y = item.transform[5];
        if (lastY !== -1 && Math.abs(y - lastY) > 8) {
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = "";
        }
        currentLine += (item.str || "") + " ";
        lastY = y;
      });
      if (currentLine.trim()) lines.push(currentLine.trim());
    }

    if (lines.length > 0) {
      sections.push({
        children: [
          new Paragraph({
            children: [new TextRun({ text: `Page ${i} ${useOCR ? '(OCR Result)' : ''}`, bold: true, size: 24 })],
            spacing: { before: 400, after: 200 }
          }),
          ...lines.map(line => new Paragraph({
            children: [new TextRun({ text: line, break: 1 })],
            spacing: { after: 120 },
          }))
        ]
      });
    }
  }

  if (sections.length === 0) {
    sections.push({
      children: [
        new Paragraph({
          children: [new TextRun({ text: "Dokumen tidak mengandung teks yang dapat diekstrak.", color: "FF0000" })]
        }),
        new Paragraph({
          children: [new TextRun("Coba gunakan mode OCR jika dokumen merupakan hasil scan.")]
        })
      ],
    });
  }

  const doc = new Document({
    sections
  });

  const buffer = await Packer.toBlob(doc);
  return buffer;
}

/**
 * Excel to PDF
 */
export async function excelToPDF(file: File) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text("Excel To PDF Export", 14, 15);
  
  (doc as any).autoTable({
    startY: 25,
    head: [jsonData[0]],
    body: jsonData.slice(1),
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [51, 122, 183] }
  });
  
  return doc.output('blob');
}

/**
 * PDF to Excel (Simulated extraction)
 */
export async function pdfToExcel(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const tableData: string[][] = [];
  
  tableData.push(["PDF TO EXCEL EXTRACTION REPORT"]);
  tableData.push([`Generated on: ${new Date().toLocaleString()}`]);
  tableData.push([]);

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as any[];
    
    tableData.push([`--- PAGE ${i} ---`]);

    // Group by Y coordinate (rounded to ignore tiny shifts)
    const linesMap = new Map<number, any[]>();
    items.forEach(item => {
      const y = Math.round(item.transform[5]);
      if (!linesMap.has(y)) linesMap.set(y, []);
      linesMap.get(y)!.push(item);
    });

    // Sort Y coordinates descending (top to bottom)
    const sortedYs = Array.from(linesMap.keys()).sort((a, b) => b - a);

    sortedYs.forEach(y => {
      const lineItems = linesMap.get(y)!;
      // Sort items in line by X coordinate
      lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
      tableData.push(lineItems.map(item => item.str));
    });
    
    tableData.push([]); // Space between pages
  }

  if (tableData.length <= 3) { // Only header exists
    tableData.push(["TIDAK ADA TEKS TERDETEKSI"]);
    tableData.push(["Dokumen ini mungkin berupa gambar hasil scan."]);
  }
  
  const ws = XLSX.utils.aoa_to_sheet(tableData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
