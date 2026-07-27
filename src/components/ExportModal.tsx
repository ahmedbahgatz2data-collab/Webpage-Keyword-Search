import React, { useState } from 'react';
import { PageResult } from '../types';
import { X, Download, FileSpreadsheet, FileCode, FileText, Check } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: PageResult[];
  keywords: string[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  results,
  keywords
}) => {
  const [downloadedFormat, setDownloadedFormat] = useState<string | null>(null);

  if (!isOpen) return null;

  // Export JSON
  const handleExportJson = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `keyword-search-export-${Date.now()}.json`;
    link.click();
    triggerDownloaded('JSON');
  };

  // Export CSV matching exact requested columns + 1 row per keyword structure
  const handleExportCsv = () => {
    const headers = [
      'URL',
      'Title',
      'Status',
      'Searched Keywords',
      'Status Found or Not Found',
      'Total Matches',
      'Word Count',
      'Fetch Time (ms)',
      'Context Snippets'
    ];

    const rows: string[] = [];

    results.forEach(p => {
      const targetKws = p.targetKeywords && p.targetKeywords.length > 0 ? p.targetKeywords : keywords;

      targetKws.forEach(kw => {
        const km = p.keywordMatches?.[kw];
        const matchCount = km?.count || 0;
        const isFound = matchCount > 0;
        const statusFoundOrNot = p.status === 'error' ? 'Error' : isFound ? 'Found' : 'Not found';
        const snippets = km?.snippets || [];

        if (snippets.length > 0) {
          snippets.forEach(s => {
            const snippetText = s.text.replace(/[\r\n]+/g, ' ');
            rows.push([
              `"${p.url.replace(/"/g, '""')}"`,
              `"${(p.title || 'Untitled').replace(/"/g, '""')}"`,
              p.status === 'error' ? 'Error' : '200 OK',
              `"${kw.replace(/"/g, '""')}"`,
              `"${statusFoundOrNot}"`,
              matchCount,
              p.wordCount || 0,
              p.fetchTimeMs || 0,
              `"${snippetText.replace(/"/g, '""')}"`
            ].join(','));
          });
        } else {
          rows.push([
            `"${p.url.replace(/"/g, '""')}"`,
            `"${(p.title || 'Untitled').replace(/"/g, '""')}"`,
            p.status === 'error' ? 'Error' : '200 OK',
            `"${kw.replace(/"/g, '""')}"`,
            `"${statusFoundOrNot}"`,
            matchCount,
            p.wordCount || 0,
            p.fetchTimeMs || 0,
            `"-"`
          ].join(','));
        }
      });
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `keyword-search-export-${Date.now()}.csv`;
    link.click();
    triggerDownloaded('CSV');
  };

  // Export Markdown Report
  const handleExportMarkdown = () => {
    let md = `# Webpage Keyword Search Report\n\n`;
    md += `**Date:** ${new Date().toLocaleString()}\n`;
    md += `**Total Webpages:** ${results.length}\n`;
    md += `**Total Keyword Occurrences:** ${results.reduce((a, b) => a + b.totalMatches, 0)}\n\n`;
    md += `## Detailed Results Table\n\n`;
    md += `| URL | Title | Status | Searched Keywords | Status Found or Not Found | Total Matches | Word Count | Fetch Time (ms) | Context Snippets |\n`;
    md += `| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;

    results.forEach(p => {
      const targetKws = p.targetKeywords && p.targetKeywords.length > 0 ? p.targetKeywords : keywords;

      targetKws.forEach(kw => {
        const km = p.keywordMatches?.[kw];
        const matchCount = km?.count || 0;
        const isFound = matchCount > 0;
        const statusFoundOrNot = p.status === 'error' ? 'Error' : isFound ? 'Found' : 'Not found';
        const snippets = km?.snippets || [];

        if (snippets.length > 0) {
          snippets.forEach(s => {
            const snippetText = s.text.replace(/[\r\n]+/g, ' ');
            md += `| ${p.url} | ${p.title || 'Untitled'} | ${p.status === 'error' ? 'Error' : '200 OK'} | ${kw} | ${statusFoundOrNot} | ${matchCount} | ${p.wordCount || 0} | ${p.fetchTimeMs || 0} | ${snippetText.slice(0, 120)} |\n`;
          });
        } else {
          md += `| ${p.url} | ${p.title || 'Untitled'} | ${p.status === 'error' ? 'Error' : '200 OK'} | ${kw} | ${statusFoundOrNot} | ${matchCount} | ${p.wordCount || 0} | ${p.fetchTimeMs || 0} | - |\n`;
        }
      });
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `keyword-search-report-${Date.now()}.md`;
    link.click();
    triggerDownloaded('Markdown');
  };

  const triggerDownloaded = (fmt: string) => {
    setDownloadedFormat(fmt);
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl max-w-md w-full flex flex-col shadow-2xl border border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-zinc-100">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-zinc-100 font-mono">Export Results Table</h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Options */}
        <div className="p-5 space-y-3">
          <p className="text-xs text-zinc-400 mb-2 font-mono">
            Select a format to export all {results.length} webpage search results:
          </p>

          <button
            onClick={handleExportCsv}
            className="w-full p-3.5 rounded-xl border border-zinc-800 hover:border-emerald-500/50 bg-zinc-950 hover:bg-zinc-800/80 text-left transition-all flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-100">CSV Table (.csv)</div>
                <div className="text-xs text-zinc-400 font-mono">Includes Found, Not Found, & Context Snippets</div>
              </div>
            </div>
            {downloadedFormat === 'CSV' ? (
              <Check className="w-5 h-5 text-emerald-400" />
            ) : (
              <Download className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
            )}
          </button>

          <button
            onClick={handleExportJson}
            className="w-full p-3.5 rounded-xl border border-zinc-800 hover:border-blue-500/50 bg-zinc-950 hover:bg-zinc-800/80 text-left transition-all flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold shrink-0">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-100">JSON Dataset (.json)</div>
                <div className="text-xs text-zinc-400 font-mono">Structured dataset with all metadata</div>
              </div>
            </div>
            {downloadedFormat === 'JSON' ? (
              <Check className="w-5 h-5 text-blue-400" />
            ) : (
              <Download className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 transition-colors" />
            )}
          </button>

          <button
            onClick={handleExportMarkdown}
            className="w-full p-3.5 rounded-xl border border-zinc-800 hover:border-indigo-500/50 bg-zinc-950 hover:bg-zinc-800/80 text-left transition-all flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-100">Markdown Report (.md)</div>
                <div className="text-xs text-zinc-400 font-mono">Formatted report with Found/Not Found</div>
              </div>
            </div>
            {downloadedFormat === 'Markdown' ? (
              <Check className="w-5 h-5 text-indigo-400" />
            ) : (
              <Download className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
