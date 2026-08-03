import React, { useState, useRef } from 'react';
import {
  Search,
  Plus,
  Trash2,
  SlidersHorizontal,
  Globe,
  KeyRound,
  RefreshCw,
  Check,
  Link2,
  Code2,
  ListPlus,
  UploadCloud,
  FileText,
  Download,
  AlertCircle,
  Pause,
  Play,
  Square,
  XCircle,
  ShieldCheck
} from 'lucide-react';
import { SearchOptions, PresetSample } from '../types';
import { SAMPLE_PRESETS } from '../data/presets';

interface UrlTargetItem {
  id: string;
  url: string;
  keywords: string[];
}

interface SearchControlsProps {
  onSearch: (
    searchData: { targets?: { url: string; keywords: string[] }[]; urls?: string[]; keywords?: string[] },
    options: SearchOptions
  ) => void;
  isLoading: boolean;
  isPaused?: boolean;
  scanProgress?: { current: number; total: number; currentUrl?: string } | null;
  onPauseScan?: () => void;
  onResumeScan?: () => void;
  onStopScan?: () => void;
  theme?: 'dark' | 'light';
}

export const SearchControls: React.FC<SearchControlsProps> = ({
  onSearch,
  isLoading,
  isPaused = false,
  scanProgress,
  onPauseScan,
  onResumeScan,
  onStopScan,
  theme = 'dark'
}) => {
  const [searchMode, setSearchMode] = useState<'mapped' | 'global'>('mapped');

  // Mapped Targets State - Empty Defaults
  const [targets, setTargets] = useState<UrlTargetItem[]>([]);

  const [bulkMappedText, setBulkMappedText] = useState<string>('');
  const [showBulkText, setShowBulkText] = useState<boolean>(false);
  const [showFileUpload, setShowFileUpload] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global State - Empty Defaults
  const [urlsText, setUrlsText] = useState<string>('');
  const [globalKeywords, setGlobalKeywords] = useState<string[]>([]);
  const [globalKwInput, setGlobalKwInput] = useState<string>('');
  const [showGlobalBulkText, setShowGlobalBulkText] = useState<boolean>(false);
  const [globalBulkText, setGlobalBulkText] = useState<string>('');
  const [showGlobalFileUpload, setShowGlobalFileUpload] = useState<boolean>(false);

  const globalFileInputRef = useRef<HTMLInputElement>(null);

  // Per-target keyword inputs
  const [targetKwInputs, setTargetKwInputs] = useState<Record<string, string>>({});

  const [options, setOptions] = useState<SearchOptions>({
    matchCase: false,
    exactPhrase: true,
    useRegex: false,
    contextLength: 90,
    stealthMode: true
  });

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Direct Clear All Targets & Global State (No window.confirm)
  const handleClearAllTargets = () => {
    setTargets([]);
    setUrlsText('');
    setGlobalKeywords([]);
    setGlobalKwInput('');
    setBulkMappedText('');
    setGlobalBulkText('');
    setShowGlobalBulkText(false);
    setImportStatus(null);
    setSelectedPresetId(null);
    setTargetKwInputs({});
  };

  // Load Presets
  const handleLoadPreset = (preset: PresetSample) => {
    setSelectedPresetId(preset.id);
    if (preset.targets && preset.targets.length > 0) {
      setSearchMode('mapped');
      setTargets(preset.targets.map((t, i) => ({ id: `preset-t-${i}`, url: t.url, keywords: [...t.keywords] })));
    } else {
      setUrlsText(preset.urls.join('\n'));
      setGlobalBulkText(preset.keywords.join(', '));
      setGlobalKeywords(preset.keywords);
    }
  };

  // Helper to normalize URLs for grouping/matching
  const normalizeUrlKey = (u: string) => {
    return u.trim().toLowerCase().replace(/\/+$/, '');
  };

  // Target Actions (Mapped Mode)
  const handleAddTarget = () => {
    setTargets([
      ...targets,
      {
        id: `target-${Date.now()}`,
        url: '',
        keywords: []
      }
    ]);
  };

  const handleRemoveTarget = (id: string) => {
    setTargets(targets.filter(t => t.id !== id));
  };

  const handleUpdateTargetUrl = (id: string, newUrl: string) => {
    setTargets(targets.map(t => (t.id === id ? { ...t, url: newUrl } : t)));
  };

  const handleAddTargetKeyword = (id: string) => {
    const inputVal = (targetKwInputs[id] || '').trim();
    if (!inputVal) return;

    // Split input in case user entered multiple keywords (comma/semicolon/newline separated)
    const newKws = inputVal
      .split(/[,;\r\n\t]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (newKws.length > 0) {
      setTargets(
        targets.map(t => {
          if (t.id === id) {
            const combined = Array.from(new Set([...t.keywords, ...newKws]));
            return { ...t, keywords: combined };
          }
          return t;
        })
      );
    }

    setTargetKwInputs({ ...targetKwInputs, [id]: '' });
  };

  const handleRemoveTargetKeyword = (id: string, kwToRemove: string) => {
    setTargets(
      targets.map(t => {
        if (t.id === id) {
          return { ...t, keywords: t.keywords.filter(k => k !== kwToRemove) };
        }
        return t;
      })
    );
  };

  // Deduplicate and Merge Targets with same URL
  const handleMergeDuplicateTargets = () => {
    if (targets.length === 0) return;
    const targetMap = new Map<string, { id: string; url: string; keywordsSet: Set<string> }>();

    targets.forEach((target, idx) => {
      const url = target.url.trim();
      if (!url) return;
      const key = normalizeUrlKey(url);

      if (targetMap.has(key)) {
        const existing = targetMap.get(key)!;
        target.keywords.forEach(k => existing.keywordsSet.add(k));
      } else {
        targetMap.set(key, {
          id: target.id || `target-${Date.now()}-${idx}`,
          url: target.url,
          keywordsSet: new Set<string>(target.keywords)
        });
      }
    });

    const merged = Array.from(targetMap.values()).map(item => ({
      id: item.id,
      url: item.url,
      keywords: Array.from(item.keywordsSet)
    }));

    setTargets(merged);
    setImportStatus(`Merged into ${merged.length} unique target URL${merged.length !== 1 ? 's' : ''}.`);
  };

  // Parse Raw Text (Supports Column 1 = URL, Column 2 = Keywords)
  // AUTOMATICALLY GROUPS/MERGES MULTIPLE KEYWORDS FOR THE SAME URL
  const parseRawTextContent = (rawText: string): UrlTargetItem[] => {
    const lines = rawText.split(/\r?\n/);
    const targetMap = new Map<string, { id: string; url: string; keywordsSet: Set<string> }>();

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return; // ignore comments/empty

      let url = '';
      let kwString = '';

      // Check delimiters in order: Tab (\t), Pipe (|), Semicolon (;), Comma (,), or Arrow (->)
      if (trimmed.includes('\t')) {
        const parts = trimmed.split('\t');
        url = parts[0].trim();
        kwString = parts.slice(1).join(' ').trim();
      } else if (trimmed.includes('|')) {
        const parts = trimmed.split('|');
        url = parts[0].trim();
        kwString = parts.slice(1).join(' ').trim();
      } else if (trimmed.includes('->')) {
        const parts = trimmed.split('->');
        url = parts[0].trim();
        kwString = parts.slice(1).join(' ').trim();
      } else if (trimmed.includes(';')) {
        const parts = trimmed.split(';');
        url = parts[0].trim();
        kwString = parts.slice(1).join(' ').trim();
      } else if (trimmed.includes(',')) {
        // Handle CSV style: url, kw1 kw2 OR url, "kw1, kw2"
        const firstCommaIndex = trimmed.indexOf(',');
        url = trimmed.substring(0, firstCommaIndex).trim();
        kwString = trimmed.substring(firstCommaIndex + 1).replace(/^["']|["']$/g, '').trim();
      } else {
        // Space separated if URL starts with http
        const spaceIndex = trimmed.search(/\s/);
        if (spaceIndex !== -1) {
          url = trimmed.substring(0, spaceIndex).trim();
          kwString = trimmed.substring(spaceIndex + 1).trim();
        } else {
          url = trimmed;
          kwString = '';
        }
      }

      // Format keywords from string (comma, semicolon, pipe or tab separated - preserve slashes in keywords)
      const kws = kwString
        ? kwString
            .split(/[,;\t|]+/)
            .map(k => k.trim())
            .filter(k => k.length > 0)
        : [];

      if (url) {
        const key = normalizeUrlKey(url);
        if (targetMap.has(key)) {
          const existing = targetMap.get(key)!;
          kws.forEach(k => existing.keywordsSet.add(k));
        } else {
          targetMap.set(key, {
            id: `file-target-${Date.now()}-${idx}`,
            url,
            keywordsSet: new Set<string>(kws)
          });
        }
      }
    });

    return Array.from(targetMap.values()).map(item => ({
      id: item.id,
      url: item.url,
      keywords: Array.from(item.keywordsSet)
    }));
  };

  // Handle File Upload (.txt, .csv, .tsv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const parsed = parseRawTextContent(content);
        if (parsed.length > 0) {
          setTargets(parsed);
          const totalKeywords = parsed.reduce((sum, t) => sum + t.keywords.length, 0);
          setImportStatus(`Successfully imported ${parsed.length} unique target URL${parsed.length !== 1 ? 's' : ''} with ${totalKeywords} mapped keyword${totalKeywords !== 1 ? 's' : ''} from ${file.name}`);
          setShowFileUpload(false);
          setSelectedPresetId(null);
        } else {
          alert('Could not parse any valid URLs from the file. Ensure Column 1 contains URLs and Column 2 contains keywords.');
        }
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Download Sample Text File
  const handleDownloadSampleFile = () => {
    const sampleContent = `# Sample URL & Mapped Keywords File
# Column 1: URL | Column 2: Mapped Keywords (separated by commas)

https://en.wikipedia.org/wiki/Artificial_intelligence\tneural network, algorithm, robot
https://en.wikipedia.org/wiki/Machine_learning\ttraining, model, dataset, quantum
https://en.wikipedia.org/wiki/Renewable_energy\tcarbon, efficiency, grid, sustainability
https://react.dev\tcomponent, hooks, state, JSX
`;

    const blob = new Blob([sampleContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-urls-and-keywords.txt';
    link.click();
  };

  // Parse Bulk Mapped Text
  const handleParseBulkMappedText = () => {
    if (!bulkMappedText.trim()) return;

    const parsed = parseRawTextContent(bulkMappedText);

    if (parsed.length > 0) {
      setTargets(parsed);
      const totalKeywords = parsed.reduce((sum, t) => sum + t.keywords.length, 0);
      setBulkMappedText('');
      setShowBulkText(false);
      setImportStatus(`Loaded ${parsed.length} unique target URL${parsed.length !== 1 ? 's' : ''} with ${totalKeywords} mapped keyword${totalKeywords !== 1 ? 's' : ''}.`);
    } else {
      alert('Could not parse valid targets from bulk text.');
    }
  };

  // Global Keywords Actions (Supports multi-keyword input comma/newline/tab/pipe/semicolon separated)
  const handleAddGlobalKeyword = () => {
    const trimmed = globalKwInput.trim();
    if (!trimmed) return;

    const newKws = trimmed
      .split(/[,;\r\n\t|]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (newKws.length > 0) {
      const combined = Array.from(new Set([...globalKeywords, ...newKws]));
      setGlobalKeywords(combined);
      setGlobalKwInput('');
    }
  };

  const handleParseGlobalBulkKeywords = () => {
    const trimmed = globalBulkText.trim();
    if (!trimmed) return;

    const newKws = trimmed
      .split(/[,;\r\n\t|]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (newKws.length > 0) {
      const combined = Array.from(new Set([...globalKeywords, ...newKws]));
      setGlobalKeywords(combined);
      setGlobalBulkText('');
      setShowGlobalBulkText(false);
    } else {
      alert('Could not parse any valid keywords from bulk text.');
    }
  };

  const handleRemoveGlobalKeyword = (kwToRemove: string) => {
    setGlobalKeywords(globalKeywords.filter(k => k !== kwToRemove));
  };

  // Convert Global Mode URLs & Keywords into URL-Keyword Mapped Targets without running search (Merging with existing targets)
  const handleConvertToMappedTargets = () => {
    const parsedUrls = urlsText
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    let activeKws = [...globalKeywords];
    if (activeKws.length === 0 && globalBulkText.trim()) {
      activeKws = Array.from(
        new Set(
          globalBulkText
            .split(/[,;\r\n\t|]+/)
            .map(k => k.trim())
            .filter(k => k.length > 0)
        )
      );
      setGlobalKeywords(activeKws);
    }

    if (parsedUrls.length === 0) {
      alert('الرجاء إدخال رابط واحد على الأقل في قائمة الـ URLs لتحويلها إلى Mapped Targets.');
      return;
    }

    if (activeKws.length === 0) {
      alert('الرجاء إدخال كلمة مفتاحية واحدة على الأقل لربطها بالروابط.');
      return;
    }

    // Build unique target map initialized with existing targets to append/merge rather than overwrite!
    const targetMap = new Map<string, { id?: string; url: string; keywordsSet: Set<string> }>();

    targets.forEach((t, idx) => {
      const url = t.url.trim();
      if (!url) return;
      const key = normalizeUrlKey(url);
      if (targetMap.has(key)) {
        const existing = targetMap.get(key)!;
        t.keywords.forEach(k => existing.keywordsSet.add(k));
      } else {
        targetMap.set(key, {
          id: t.id || `target-${Date.now()}-${idx}`,
          url: t.url,
          keywordsSet: new Set<string>(t.keywords)
        });
      }
    });

    parsedUrls.forEach((url) => {
      const key = normalizeUrlKey(url);
      if (targetMap.has(key)) {
        const existing = targetMap.get(key)!;
        activeKws.forEach(k => existing.keywordsSet.add(k));
      } else {
        targetMap.set(key, {
          id: `converted-target-${Date.now()}-${targetMap.size}`,
          url,
          keywordsSet: new Set(activeKws)
        });
      }
    });

    const newTargets: UrlTargetItem[] = Array.from(targetMap.values()).map((item) => ({
      id: item.id || `target-${Date.now()}`,
      url: item.url,
      keywords: Array.from(item.keywordsSet)
    }));

    setTargets(newTargets);
    setSearchMode('mapped');
    setImportStatus(
      `تم دمج وربط ${parsedUrls.length} رابط مع ${activeKws.length} كلمة مفتاحية دون إزالة الأهداف السابقة (الإجمالي: ${newTargets.length} رابط مستهدف).`
    );
  };

  // Handle File Upload in Global Mode (Col 1: Webpage URLs, Col 2: Global Keywords)
  const handleGlobalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const lines = content.split(/\r?\n/);
        const urlList: string[] = [];
        const kwSet = new Set<string>();

        lines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;

          let url = '';
          let kwString = '';

          if (trimmed.includes('\t')) {
            const parts = trimmed.split('\t');
            url = parts[0].trim();
            kwString = parts.slice(1).join(' ').trim();
          } else if (trimmed.includes('|')) {
            const parts = trimmed.split('|');
            url = parts[0].trim();
            kwString = parts.slice(1).join(' ').trim();
          } else if (trimmed.includes('->')) {
            const parts = trimmed.split('->');
            url = parts[0].trim();
            kwString = parts.slice(1).join(' ').trim();
          } else if (trimmed.includes(';')) {
            const parts = trimmed.split(';');
            url = parts[0].trim();
            kwString = parts.slice(1).join(' ').trim();
          } else if (trimmed.includes(',')) {
            const firstCommaIndex = trimmed.indexOf(',');
            url = trimmed.substring(0, firstCommaIndex).trim();
            kwString = trimmed.substring(firstCommaIndex + 1).replace(/^["']|["']$/g, '').trim();
          } else {
            const spaceIndex = trimmed.search(/\s/);
            if (spaceIndex !== -1) {
              url = trimmed.substring(0, spaceIndex).trim();
              kwString = trimmed.substring(spaceIndex + 1).trim();
            } else {
              url = trimmed;
              kwString = '';
            }
          }

          if (url) {
            urlList.push(url);
          }

          if (kwString) {
            const kws = kwString
              .split(/[,;\t|]+/)
              .map(k => k.trim())
              .filter(k => k.length > 0);
            kws.forEach(k => kwSet.add(k));
          }
        });

        if (urlList.length > 0 || kwSet.size > 0) {
          // Append URLs to existing urlsText
          const currentUrls = urlsText
            ? urlsText.split('\n').map(u => u.trim()).filter(Boolean)
            : [];
          const mergedUrls = Array.from(new Set([...currentUrls, ...urlList]));
          setUrlsText(mergedUrls.join('\n'));

          // Merge extracted keywords into globalKeywords & globalBulkText
          const mergedKws = Array.from(new Set([...globalKeywords, ...Array.from(kwSet)]));
          setGlobalKeywords(mergedKws);
          setGlobalBulkText(mergedKws.join(', '));

          setImportStatus(
            `تم استخراج ${urlList.length} رابط من العمود الأول و ${kwSet.size} كلمة مفتاحية من العمود الثاني بنجاح من ملف ${file.name}.`
          );
          setShowGlobalFileUpload(false);
          setSelectedPresetId(null);
        } else {
          alert('لم يتم العثور على أي روابط أو كلمات مفتاحية صالحة في الملف.');
        }
      }
    };
    reader.readAsText(file);

    if (globalFileInputRef.current) globalFileInputRef.current.value = '';
  };

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (searchMode === 'mapped') {
      // Auto-merge any duplicate URLs before search
      const targetMap = new Map<string, { url: string; keywordsSet: Set<string> }>();

      targets.forEach(t => {
        const url = t.url.trim();
        if (!url) return;
        const key = normalizeUrlKey(url);
        if (targetMap.has(key)) {
          const existing = targetMap.get(key)!;
          t.keywords.forEach(k => existing.keywordsSet.add(k));
        } else {
          targetMap.set(key, { url, keywordsSet: new Set(t.keywords) });
        }
      });

      const validTargets = Array.from(targetMap.values())
        .map(t => ({
          url: t.url,
          keywords: Array.from(t.keywordsSet)
        }))
        .filter(t => t.url.length > 0 && t.keywords.length > 0);

      if (validTargets.length === 0) {
        alert('Please add or import at least one URL with mapped keywords.');
        return;
      }

      onSearch({ targets: validTargets }, options);
    } else {
      const parsedUrls = urlsText
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.length > 0);

      if (parsedUrls.length === 0) {
        alert('Please enter at least one URL.');
        return;
      }

      let activeKws = [...globalKeywords];
      if (activeKws.length === 0 && globalBulkText.trim()) {
        activeKws = Array.from(
          new Set(
            globalBulkText
              .split(/[,;\r\n\t|]+/)
              .map(k => k.trim())
              .filter(k => k.length > 0)
          )
        );
        setGlobalKeywords(activeKws);
      }

      if (activeKws.length === 0) {
        alert('Please enter at least one keyword.');
        return;
      }

      onSearch({ urls: parsedUrls, keywords: activeKws }, options);
    }
  };

  const progressPercent = scanProgress && scanProgress.total > 0
    ? Math.round((scanProgress.current / scanProgress.total) * 100)
    : 0;

  const isDark = theme === 'dark';

  return (
    <div className={
      isDark
        ? "bg-zinc-900/90 rounded-2xl shadow-md border border-zinc-800 p-5 sm:p-6 transition-colors"
        : "bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 transition-colors"
    }>
      {/* Header & Mode Switcher */}
      <div className={isDark ? "flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-zinc-800" : "flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200"}>
        <div>
          <h2 className={isDark ? "text-base font-semibold text-zinc-100 flex items-center gap-2" : "text-base font-semibold text-slate-900 flex items-center gap-2"}>
            <SlidersHorizontal className="w-4 h-4 text-blue-500" />
            Webpage Search & Keyword Configuration
          </h2>
          <p className={isDark ? "text-xs text-zinc-400 mt-0.5 font-mono" : "text-xs text-slate-500 mt-0.5 font-mono"}>
            Map specific keywords per URL or search global keywords across multiple webpages.
          </p>
        </div>

        {/* Search Mode Toggle & Presets */}
        <div className="flex flex-wrap items-center gap-3">
          <div className={isDark ? "flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800" : "flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200"}>
            <button
              type="button"
              onClick={() => setSearchMode('mapped')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                searchMode === 'mapped'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>URL-Keyword Mapping</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchMode('global')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                searchMode === 'global'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Global Keywords</span>
            </button>
          </div>

          {/* Clear All Button (Single Prominent Button) */}
          {(targets.length > 0 || urlsText.trim().length > 0 || globalKeywords.length > 0) && (
            <button
              type="button"
              onClick={handleClearAllTargets}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shadow-xs"
              title="Clear all URLs and keywords"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        {/* MODE 1: Mapped Keywords Per URL */}
        {searchMode === 'mapped' ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className={isDark ? "text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 font-mono" : "text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono"}>
                <Link2 className="w-4 h-4 text-blue-500" />
                URL & Mapped Keywords Builder ({targets.length} Target Pages)
              </label>

              <div className="flex flex-wrap items-center gap-2">
                {/* File Upload Button */}
                <button
                  type="button"
                  onClick={() => setShowFileUpload(!showFileUpload)}
                  className="text-xs text-emerald-500 hover:text-emerald-600 transition-colors flex items-center gap-1 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Text/CSV File</span>
                </button>

                {/* Bulk Paste Button */}
                <button
                  type="button"
                  onClick={() => setShowBulkText(!showBulkText)}
                  className="text-xs text-indigo-500 hover:text-indigo-600 transition-colors flex items-center gap-1 font-mono bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  {showBulkText ? 'Hide Paste' : 'Bulk Paste Text'}
                </button>

                {/* Merge Duplicates Button */}
                {targets.length > 1 && (
                  <button
                    type="button"
                    onClick={handleMergeDuplicateTargets}
                    className="text-xs text-amber-500 hover:text-amber-600 transition-colors flex items-center gap-1 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20"
                    title="Merge duplicate URLs and combine their keywords"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                    <span>Merge Duplicate URLs</span>
                  </button>
                )}
              </div>
            </div>

            {/* Notification Banner when File is Imported */}
            {importStatus && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 font-mono flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{importStatus}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setImportStatus(null)}
                  className="text-emerald-500 hover:text-emerald-700 font-bold"
                >
                  &times;
                </button>
              </div>
            )}

            {/* File Upload Drawer / Dropzone */}
            {showFileUpload && (
              <div className={
                isDark
                  ? "bg-zinc-950 rounded-2xl p-4 sm:p-5 border border-emerald-500/30 space-y-4 font-mono text-xs animate-in fade-in zoom-in-95 duration-150"
                  : "bg-slate-50 rounded-2xl p-4 sm:p-5 border border-emerald-500/40 space-y-4 font-mono text-xs animate-in fade-in zoom-in-95 duration-150"
              }>
                <div className={isDark ? "flex items-start justify-between gap-2 border-b border-zinc-800 pb-3" : "flex items-start justify-between gap-2 border-b border-slate-200 pb-3"}>
                  <div>
                    <h4 className={isDark ? "font-bold text-zinc-100 flex items-center gap-2 text-sm" : "font-bold text-slate-900 flex items-center gap-2 text-sm"}>
                      <FileText className="w-4 h-4 text-emerald-500" />
                      Import Text / CSV File with Mapped Keywords
                    </h4>
                    <p className={isDark ? "text-zinc-400 mt-1" : "text-slate-500 mt-1"}>
                      File format: <strong>Column 1 = Webpage URL</strong> | <strong>Column 2 = Mapped Keywords</strong> (separated by Tab, Comma, Pipe, or Semicolon)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadSampleFile}
                    className={
                      isDark
                        ? "px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1 text-[11px]"
                        : "px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1 text-[11px]"
                    }
                  >
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    Download Sample File
                  </button>
                </div>

                {/* Dropzone input */}
                <div className={
                  isDark
                    ? "border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 rounded-xl p-6 text-center bg-zinc-900/50 hover:bg-zinc-900 transition-all cursor-pointer"
                    : "border-2 border-dashed border-emerald-500/40 hover:border-emerald-500/70 rounded-xl p-6 text-center bg-white hover:bg-emerald-50/50 transition-all cursor-pointer"
                }>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.csv,.tsv,.text"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="txt-csv-file-input"
                  />
                  <label htmlFor="txt-csv-file-input" className="cursor-pointer block space-y-2">
                    <UploadCloud className="w-8 h-8 mx-auto text-emerald-500 opacity-80" />
                    <div className={isDark ? "text-sm font-bold text-zinc-200" : "text-sm font-bold text-slate-800"}>
                      Click to choose or drop text file (.txt, .csv, .tsv)
                    </div>
                    <div className={isDark ? "text-zinc-500 text-[11px]" : "text-slate-500 text-[11px]"}>
                      Supports Tab-separated, Comma-separated, or Pipe-separated text columns
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Bulk Paste Drawer */}
            {showBulkText && (
              <div className={isDark ? "bg-zinc-950 rounded-xl p-4 border border-zinc-800 space-y-3 font-mono text-xs" : "bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 font-mono text-xs"}>
                <p className={isDark ? "text-zinc-400" : "text-slate-600"}>
                  Paste URLs and mapped keywords line-by-line in format: <strong className={isDark ? "text-zinc-200" : "text-slate-800"}>URL | keyword1, keyword2</strong> or <strong className={isDark ? "text-zinc-200" : "text-slate-800"}>URL [TAB] keyword1, keyword2</strong>
                </p>
                <textarea
                  value={bulkMappedText}
                  onChange={(e) => setBulkMappedText(e.target.value)}
                  rows={4}
                  placeholder={`https://en.wikipedia.org/wiki/Artificial_intelligence\tneural network, algorithm\nhttps://en.wikipedia.org/wiki/Machine_learning\ttraining, model, dataset`}
                  className={
                    isDark
                      ? "w-full rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500"
                      : "w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
                  }
                />
                <button
                  type="button"
                  onClick={handleParseBulkMappedText}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex items-center gap-1"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  Parse & Load Mapped Targets
                </button>
              </div>
            )}

            {/* Scrollable Mapped Targets List */}
            {targets.length === 0 ? (
              <div className={isDark ? "p-8 text-center bg-zinc-950 rounded-2xl border border-dashed border-zinc-800 space-y-3" : "p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3"}>
                <p className={isDark ? "text-xs text-zinc-500 font-mono" : "text-xs text-slate-500 font-mono"}>No target URLs configured.</p>
                <button
                  type="button"
                  onClick={handleAddTarget}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 text-blue-600 border border-blue-500/30 text-xs font-mono font-semibold hover:bg-blue-600/30 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-blue-500" />
                  Add First Target URL
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1.5 custom-scrollbar">
                {targets.map((target, idx) => (
                  <div
                    key={target.id}
                    className={
                      isDark
                        ? "bg-zinc-950 rounded-xl p-4 border border-zinc-800 space-y-3 hover:border-zinc-700 transition-all"
                        : "bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 hover:border-slate-300 transition-all"
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className={
                          isDark
                            ? "w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-xs font-bold flex items-center justify-center shrink-0"
                            : "w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-600 font-mono text-xs font-bold flex items-center justify-center shrink-0"
                        }>
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={target.url}
                          onChange={(e) => handleUpdateTargetUrl(target.id, e.target.value)}
                          placeholder="Target Webpage URL (e.g. https://example.com/page)"
                          className={
                            isDark
                              ? "flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-mono text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500"
                              : "flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-mono text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
                          }
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveTarget(target.id)}
                        className={isDark ? "p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-colors" : "p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 transition-colors"}
                        title="Remove URL Target"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Keywords mapped to this specific URL */}
                    <div className="pl-8 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={isDark ? "text-[11px] font-mono text-zinc-500 mr-1" : "text-[11px] font-mono text-slate-500 mr-1"}>
                          Mapped Keywords:
                        </span>
                        {target.keywords.map((kw, kIdx) => (
                          <span
                            key={kIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-amber-500/10 text-amber-600 border border-amber-500/30"
                          >
                            <span>{kw}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTargetKeyword(target.id, kw)}
                              className="text-amber-500 hover:text-amber-700 font-bold ml-1"
                            >
                              &times;
                            </button>
                          </span>
                        ))}

                        {target.keywords.length === 0 && (
                          <span className={isDark ? "text-xs text-zinc-600 italic font-mono" : "text-xs text-slate-400 italic font-mono"}>
                            No keywords mapped to this URL yet. Add one below.
                          </span>
                        )}
                      </div>

                      {/* Add Keyword to this URL */}
                      <div className="flex items-center gap-2 max-w-md">
                        <input
                          type="text"
                          value={targetKwInputs[target.id] || ''}
                          onChange={(e) => setTargetKwInputs({ ...targetKwInputs, [target.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTargetKeyword(target.id);
                            }
                          }}
                          placeholder="Add keyword for this URL..."
                          className={
                            isDark
                              ? "flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-mono text-zinc-200 placeholder-zinc-600 outline-none focus:border-amber-500"
                              : "flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500"
                          }
                        />
                        <button
                          type="button"
                          onClick={() => handleAddTargetKeyword(target.id)}
                          className={
                            isDark
                              ? "px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium border border-zinc-700 transition-colors flex items-center gap-1"
                              : "px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-mono font-medium border border-slate-300 transition-colors flex items-center gap-1"
                          }
                        >
                          <Plus className="w-3 h-3 text-amber-500" />
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleAddTarget}
              className={
                isDark
                  ? "w-full py-2.5 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200 text-xs font-mono font-semibold transition-all flex items-center justify-center gap-2"
                  : "w-full py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-mono font-semibold transition-all flex items-center justify-center gap-2"
              }
            >
              <Plus className="w-4 h-4 text-blue-500" />
              Add Another Target URL with Custom Keywords
            </button>
          </div>
        ) : (
          /* MODE 2: Global Keywords Mode */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="text-xs text-blue-400 font-mono">
                💡 <strong>Global Keywords Mode:</strong> Enter URLs & Keywords, then search across all URLs or convert them into specific URL-Keyword Mapped targets without running search.
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGlobalFileUpload(!showGlobalFileUpload)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all flex items-center gap-1.5"
                  title="Upload CSV or Text File with Column 1 = URLs, Column 2 = Keywords"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload File (Col 1: URLs | Col 2: Keywords)</span>
                </button>
                <button
                  type="button"
                  onClick={handleConvertToMappedTargets}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-all flex items-center gap-1.5"
                  title="Map these Global Keywords to each URL and switch to URL-Keyword Mapping mode without executing search"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Map Keywords to URLs (No Search)</span>
                </button>
              </div>
            </div>

            {/* Global File Upload Drawer */}
            {showGlobalFileUpload && (
              <div className={
                isDark
                  ? "bg-zinc-950 rounded-2xl p-4 sm:p-5 border border-emerald-500/30 space-y-4 font-mono text-xs animate-in fade-in zoom-in-95 duration-150"
                  : "bg-slate-50 rounded-2xl p-4 sm:p-5 border border-emerald-500/40 space-y-4 font-mono text-xs animate-in fade-in zoom-in-95 duration-150"
              }>
                <div className={isDark ? "flex items-start justify-between gap-2 border-b border-zinc-800 pb-3" : "flex items-start justify-between gap-2 border-b border-slate-200 pb-3"}>
                  <div>
                    <h4 className={isDark ? "font-bold text-zinc-100 flex items-center gap-2 text-sm" : "font-bold text-slate-900 flex items-center gap-2 text-sm"}>
                      <FileText className="w-4 h-4 text-emerald-500" />
                      Import Text / CSV File for Global Keywords Mode
                    </h4>
                    <p className={isDark ? "text-zinc-400 mt-1" : "text-slate-500 mt-1"}>
                      <strong>Column 1 = Webpage URLs</strong> (extracted into URLs box) | <strong>Column 2 = Keywords</strong> (extracted into Global Keywords list for all URLs)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadSampleFile}
                    className={
                      isDark
                        ? "px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1 text-[11px]"
                        : "px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1 text-[11px]"
                    }
                  >
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    Download Sample File
                  </button>
                </div>

                <div className={
                  isDark
                    ? "border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 rounded-xl p-6 text-center bg-zinc-900/50 hover:bg-zinc-900 transition-all cursor-pointer"
                    : "border-2 border-dashed border-emerald-500/40 hover:border-emerald-500/70 rounded-xl p-6 text-center bg-white hover:bg-emerald-50/50 transition-all cursor-pointer"
                }>
                  <input
                    ref={globalFileInputRef}
                    type="file"
                    accept=".txt,.csv,.tsv,.text"
                    onChange={handleGlobalFileUpload}
                    className="hidden"
                    id="global-txt-csv-file-input"
                  />
                  <label htmlFor="global-txt-csv-file-input" className="cursor-pointer block space-y-2">
                    <UploadCloud className="w-8 h-8 mx-auto text-emerald-500 opacity-80" />
                    <div className={isDark ? "text-sm font-bold text-zinc-200" : "text-sm font-bold text-slate-800"}>
                      Click to choose or drop text file (.txt, .csv, .tsv)
                    </div>
                    <div className={isDark ? "text-zinc-500 text-[11px]" : "text-slate-500 text-[11px]"}>
                      Supports Tab, Comma, Pipe, or Semicolon separated columns
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Section 1: Webpage URLs Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={isDark ? "text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 font-mono" : "text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono"}>
                  <Globe className="w-4 h-4 text-blue-500" />
                  Target Webpage URLs
                </label>
                <button
                  type="button"
                  onClick={() => setUrlsText('')}
                  className="text-xs text-zinc-500 hover:text-rose-500 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </div>

              <textarea
                value={urlsText}
                onChange={(e) => {
                  setUrlsText(e.target.value);
                  setSelectedPresetId(null);
                }}
                rows={5}
                placeholder="Enter or paste webpage URLs (1 per line)...&#10;https://en.wikipedia.org/wiki/Artificial_intelligence"
                className={
                  isDark
                    ? "w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs sm:text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:border-blue-500 outline-none transition-all resize-y min-h-[120px]"
                    : "w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs sm:text-sm font-mono text-slate-800 placeholder-slate-400 focus:border-blue-500 outline-none transition-all resize-y min-h-[120px]"
                }
              />
            </div>

            {/* Section 2: Global Keywords Input (Direct Bulk Textarea) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={isDark ? "text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 font-mono" : "text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono"}>
                  <KeyRound className="w-4 h-4 text-indigo-500" />
                  Global Keywords ({globalKeywords.length})
                </label>
                {(globalKeywords.length > 0 || globalBulkText.length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setGlobalBulkText('');
                      setGlobalKeywords([]);
                    }}
                    className="text-xs text-zinc-500 hover:text-rose-500 transition-colors flex items-center gap-1 font-mono"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Clear Keywords</span>
                  </button>
                )}
              </div>

              <textarea
                value={globalBulkText}
                onChange={(e) => {
                  const val = e.target.value;
                  setGlobalBulkText(val);
                  const parsed = Array.from(
                    new Set(
                      val
                        .split(/[,;\r\n\t|]+/)
                        .map(k => k.trim())
                        .filter(k => k.length > 0)
                    )
                  );
                  setGlobalKeywords(parsed);
                  setSelectedPresetId(null);
                }}
                rows={4}
                placeholder="Enter or paste global keywords (separated by commas, newlines, semicolons, tabs, or pipes)...&#10;e.g. neural network, artificial intelligence, 24-6337-7601"
                className={
                  isDark
                    ? "w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs sm:text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 outline-none transition-all resize-y min-h-[100px]"
                    : "w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs sm:text-sm font-mono text-slate-800 placeholder-slate-400 focus:border-indigo-500 outline-none transition-all resize-y min-h-[100px]"
                }
              />

              {/* Active Parsed Keyword Badges */}
              {globalKeywords.length > 0 && (
                <div className={isDark ? "flex flex-wrap gap-1.5 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80 max-h-[110px] overflow-y-auto" : "flex flex-wrap gap-1.5 bg-slate-100/70 p-2.5 rounded-xl border border-slate-200/80 max-h-[110px] overflow-y-auto"}>
                  {globalKeywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                    >
                      <span>{kw}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Options & Search Action Row */}
        <div className={isDark ? "pt-2 border-t border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4" : "pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"}>
          <div className={isDark ? "flex flex-wrap items-center gap-4 text-xs text-zinc-400 font-mono" : "flex flex-wrap items-center gap-4 text-xs text-slate-600 font-mono"}>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.matchCase}
                onChange={(e) => setOptions({ ...options, matchCase: e.target.checked })}
                className="w-4 h-4 bg-zinc-950 border-zinc-800 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className={isDark ? "text-zinc-300" : "text-slate-700"}>Case Sensitive</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.exactPhrase}
                onChange={(e) => setOptions({ ...options, exactPhrase: e.target.checked })}
                className="w-4 h-4 bg-zinc-950 border-zinc-800 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className={isDark ? "text-zinc-300" : "text-slate-700"}>Exact Phrase</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20" title="Uses browser-like Sec-Ch-Ua headers & Googlebot fallbacks to bypass WAF & 403 Forbidden blocks">
              <input
                type="checkbox"
                checked={options.stealthMode !== false}
                onChange={(e) => setOptions({ ...options, stealthMode: e.target.checked })}
                className="w-4 h-4 bg-zinc-950 border-zinc-800 text-emerald-500 rounded focus:ring-emerald-500"
              />
              <span className="text-emerald-500 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Stealth Mode (403 Bypass)</span>
              </span>
            </label>

            <div className={isDark ? "flex items-center gap-1.5 pl-2 border-l border-zinc-800" : "flex items-center gap-1.5 pl-2 border-l border-slate-200"}>
              <span className={isDark ? "text-zinc-500" : "text-slate-500"}>Context Length:</span>
              <select
                value={options.contextLength}
                onChange={(e) => setOptions({ ...options, contextLength: Number(e.target.value) })}
                className={
                  isDark
                    ? "rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-200 focus:border-blue-500 outline-none"
                    : "rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs text-slate-800 focus:border-blue-500 outline-none"
                }
              >
                <option value={60}>Short (60 chars)</option>
                <option value={90}>Medium (90 chars)</option>
                <option value={150}>Long (150 chars)</option>
              </select>
            </div>
          </div>

          {/* Action Row & Progressive Progress Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {isLoading && (
              <div className="flex items-center gap-2">
                {/* Pause / Resume Button */}
                {isPaused ? (
                  <button
                    type="button"
                    onClick={onResumeScan}
                    className="px-3 py-2 rounded-xl text-xs font-mono font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition-all shadow-md"
                    title="Resume Scanning"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Resume Scan</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onPauseScan}
                    className="px-3 py-2 rounded-xl text-xs font-mono font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 flex items-center gap-1.5 transition-all"
                    title="Pause Scanning"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </button>
                )}

                {/* Stop Button */}
                <button
                  type="button"
                  onClick={onStopScan}
                  className="px-3 py-2 rounded-xl text-xs font-mono font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 flex items-center gap-1.5 transition-all"
                  title="Stop Scanning"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              </div>
            )}

            {searchMode === 'global' && !isLoading && (
              <button
                type="button"
                onClick={handleConvertToMappedTargets}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-semibold text-xs bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 transition-all flex items-center justify-center gap-1.5 font-mono"
                title="Convert Global URLs and Keywords to Mapped Targets without running search"
              >
                <Link2 className="w-4 h-4 text-indigo-400" />
                <span>Map to URLs (No Search)</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading && !isPaused}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-mono"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    {isPaused ? 'Scanning Paused' : scanProgress ? `Scanning ${scanProgress.current}/${scanProgress.total}` : 'Scanning...'}
                  </span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Run Webpage Keyword Search</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scanning Progress Details Bar */}
        {isLoading && scanProgress && (
          <div className="mt-3 p-3 bg-zinc-950 rounded-xl border border-blue-500/30 space-y-2 animate-in fade-in duration-150 font-mono text-xs">
            <div className="flex items-center justify-between text-zinc-300 font-medium">
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-blue-400 animate-ping'}`} />
                {isPaused ? 'Scan Paused' : 'Scanning Webpages'}: {scanProgress.current} of {scanProgress.total} URLs ({progressPercent}%)
              </span>
              <span className="text-zinc-500 text-[11px] truncate max-w-[260px]">
                {scanProgress.currentUrl}
              </span>
            </div>

            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${isPaused ? 'bg-amber-400' : 'bg-blue-500'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

