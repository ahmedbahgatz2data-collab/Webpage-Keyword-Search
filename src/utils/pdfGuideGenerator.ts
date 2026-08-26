import { jsPDF } from 'jspdf';

export function generateUserGuidePdf() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text('Webpage Keyword Search Engine', 20, 20);

  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text('Comprehensive User Guide & Instructions Manual', 20, 28);

  doc.setLineWidth(0.5);
  doc.setDrawColor(203, 213, 225);
  doc.line(20, 33, 190, 33);

  let y = 42;

  const addSection = (title: string, items: string[]) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 20, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);

    items.forEach((item) => {
      const wrappedLines = doc.splitTextToSize(`• ${item}`, 165);
      const blockHeight = wrappedLines.length * 5.5;

      if (y + blockHeight > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(wrappedLines, 24, y);
      y += blockHeight + 2;
    });
    y += 4;
  };

  addSection('1. Introduction & Overview', [
    'Webpage Keyword Search Engine is a powerful tool designed to scan webpages for specific keywords.',
    'It extracts visible text and raw HTML source code, analyzes keyword matches, extracts context snippets, and provides AI-powered page analysis.',
    'It supports two primary operational modes: Global Keywords Mode and URL-Keyword Mapped Mode.'
  ]);

  addSection('2. Search Modes', [
    'Global Keywords Mode: Enter multiple webpage URLs in the first box and multiple keywords in the second box. The engine scans every URL for all entered keywords simultaneously.',
    'URL-Keyword Mapping Mode: Map specific keywords to individual URLs precisely so each link gets its own dedicated keyword targets.',
    'Convert to Mapped Targets: Easily convert Global Mode inputs into Mapped Targets without running a search, or merge new URLs & keywords into existing targets.'
  ]);

  addSection('3. File Import & Templates', [
    'You can upload TXT, CSV, TSV, or Text files containing URLs and Keywords.',
    'In Global Mode: Column 1 = Webpage URLs, Column 2 = Keywords. The system automatically populates the URL box and Global Keywords list.',
    'Sample File Download: Use the built-in "Download Sample File" button to get a pre-formatted template instantly.'
  ]);

  addSection('4. Search Execution & Results', [
    'Real-time Progress: Live scan progress bar tracks successful fetches, word counts, and fetch times in milliseconds.',
    'Context Snippets: Click on any keyword match badge to view the exact sentence or context snippet where the keyword appeared (Visible Page or Raw Code / SSR Data).',
    'AI Page Analysis: Use the built-in Gemini AI integration to analyze page content, summarize findings, and check keyword relevance.'
  ]);

  addSection('5. Reports & Error Tracking', [
    'Export Reports: Export detailed reports in CSV, JSON, or Markdown formats.',
    'Error Tracking: Failed or empty webpage fetches (e.g., 403 Forbidden, 404 Not Found, Network Timeout) are clearly recorded in the results table and export reports with error status and http status codes.'
  ]);

  // Footer on all pages
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount} — Webpage Keyword Search Engine User Guide`, 20, 290);
  }

  doc.save('Webpage_Keyword_Search_Engine_User_Guide.pdf');
}
