import React, { useState, useEffect } from 'react';
import { PageResult } from '../types';
import { X, Sparkles, Send, RefreshCw, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';

interface AiAnalysisModalProps {
  page: PageResult | null;
  onClose: () => void;
  keywords: string[];
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  page,
  onClose,
  keywords
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<{ summary: string; keyTakeaways: string[] } | null>(null);
  const [userQuery, setUserQuery] = useState<string>('');
  const [askingQuery, setAskingQuery] = useState<boolean>(false);
  const [qaHistory, setQaHistory] = useState<Array<{ question: string; answer: string }>>([]);

  useEffect(() => {
    if (!page) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchAiAnalysis = async () => {
      try {
        const res = await fetch('/api/ai-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: page.url,
            title: page.title,
            textContent: page.textContent,
            keywords
          })
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || 'Failed to analyze page with AI');
        }

        const data = await res.json();
        if (isMounted) {
          setSummaryData(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'AI Analysis failed');
          setLoading(false);
        }
      }
    };

    fetchAiAnalysis();

    return () => {
      isMounted = false;
    };
  }, [page, keywords]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || !page) return;

    const q = userQuery.trim();
    setUserQuery('');
    setAskingQuery(true);

    try {
      const res = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: page.url,
          title: page.title,
          textContent: page.textContent,
          keywords,
          userQuery: q
        })
      });

      if (!res.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await res.json();
      setQaHistory(prev => [
        ...prev,
        {
          question: q,
          answer: data.summary || (data.keyTakeaways ? data.keyTakeaways.join(' ') : 'No clear answer found.')
        }
      ]);
    } catch (err: any) {
      setQaHistory(prev => [
        ...prev,
        { question: q, answer: `Error: ${err.message || 'Could not process question.'}` }
      ]);
    } finally {
      setAskingQuery(false);
    }
  };

  if (!page) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-zinc-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 font-mono">Gemini AI Keyword Analysis</h3>
              <p className="text-xs text-zinc-400 line-clamp-1 font-mono">{page.title}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 bg-zinc-950/50">
          {loading ? (
            <div className="py-12 text-center space-y-3 font-mono">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-sm font-medium text-zinc-200">Analyzing webpage content with Gemini AI...</p>
              <p className="text-xs text-zinc-500">Synthesizing keyword context & insights</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3 font-mono">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-semibold">Analysis Failed</p>
                <p>{error}</p>
              </div>
            </div>
          ) : (
            <>
              {summaryData?.summary && (
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 font-mono">
                    <Sparkles className="w-3.5 h-3.5" />
                    Keyword Context Summary
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
                    {summaryData.summary}
                  </p>
                </div>
              )}

              {summaryData?.keyTakeaways && summaryData.keyTakeaways.length > 0 && (
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                    Key Highlights & Findings
                  </div>
                  <ul className="space-y-2">
                    {summaryData.keyTakeaways.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-zinc-300 font-sans">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {qaHistory.length > 0 && (
                <div className="space-y-3 pt-2 font-mono">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Questions & Answers
                  </div>
                  {qaHistory.map((item, idx) => (
                    <div key={idx} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 space-y-1.5 text-xs">
                      <p className="font-semibold text-zinc-100 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                        Q: {item.question}
                      </p>
                      <p className="text-zinc-300 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80 leading-relaxed font-sans">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Ask Question Footer */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800">
          <form onSubmit={handleAskQuestion} className="flex items-center gap-2 font-mono">
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Ask Gemini a question about this page..."
              disabled={loading || askingQuery}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs sm:text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={loading || askingQuery || !userQuery.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-xs sm:text-sm hover:bg-blue-500 disabled:opacity-40 transition-colors flex items-center gap-1.5 shrink-0"
            >
              {askingQuery ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Ask</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
