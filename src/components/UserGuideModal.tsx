import React from 'react';
import { X, Download, FileText, CheckCircle2, Globe2, Link2, Shield, AlertCircle } from 'lucide-react';
import { generateUserGuidePdf } from '../utils/pdfGuideGenerator';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose, isDark }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={
        isDark
          ? "bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs"
          : "bg-white border border-slate-200 text-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs"
      }>
        {/* Modal Header */}
        <div className={isDark ? "flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50" : "flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50"}>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <FileText className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className={isDark ? "text-base font-bold text-zinc-100" : "text-base font-bold text-slate-900"}>
                دليل استخدام Webpage Keyword Search Engine
              </h3>
              <p className={isDark ? "text-xs text-zinc-400 mt-0.5" : "text-xs text-slate-500 mt-0.5"}>
                الدليل الشامل لفحص الروابط، الكلمات المفتاحية، واستخراج التقارير والملفات.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={
              isDark
                ? "p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                : "p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            }
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {/* Download PDF Action Banner */}
          <div className={
            isDark
              ? "p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-blue-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4"
              : "p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-300/60 flex flex-col sm:flex-row items-center justify-between gap-4"
          }>
            <div className="space-y-1 text-center sm:text-left">
              <h4 className={isDark ? "font-bold text-zinc-100 text-sm" : "font-bold text-slate-900 text-sm"}>
                تحميل الدليل الرسمي بصيغة PDF
              </h4>
              <p className={isDark ? "text-zinc-400 text-xs" : "text-slate-600 text-xs"}>
                احصل على نسخة PDF مرتبة وخالية من التداخل للطباعة أو المشاركة.
              </p>
            </div>
            <button
              onClick={generateUserGuidePdf}
              className="px-4 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all flex items-center gap-2 shrink-0 text-xs"
            >
              <Download className="w-4 h-4" />
              <span>تحميل ملف PDF الآن</span>
            </button>
          </div>

          {/* Section 1 */}
          <div className={isDark ? "p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-2" : "p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"}>
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-500">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xs">1</span>
              <span>الوضع العام (Global Keywords Mode)</span>
            </div>
            <p className={isDark ? "text-zinc-300 leading-relaxed pl-8" : "text-slate-700 leading-relaxed pl-8"}>
              قم بلصق قائمة الروابط في الصندوق الأول وقائمة الكلمات المفتاحية في الصندوق الثاني. التطبيق سيفحص كل رابط بحثاً عن جميع الكلمات المفتاحية في نفس الوقت.
              يمكنك أيضاً <strong>رفع ملف (TXT أو CSV)</strong> يحتوي في العمود الأول على الروابط وفي العمود الثاني على الكلمات المفتاحية ليتم دمجها تلقائياً.
            </p>
          </div>

          {/* Section 2 */}
          <div className={isDark ? "p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-2" : "p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"}>
            <div className="flex items-center gap-2 font-bold text-sm text-blue-500">
              <span className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-xs">2</span>
              <span>ربط الروابط المخصص (URL-Keyword Mapping Mode)</span>
            </div>
            <p className={isDark ? "text-zinc-300 leading-relaxed pl-8" : "text-slate-700 leading-relaxed pl-8"}>
              يسمح بتخصيص كلمات مفتاحية دقيقة لكل رابط على حدة. يمكنك تحويل المدخلات من الوضع العام إلى هذا النظام بضغطة زر دون الحاجة لإعادة الكتابة.
            </p>
          </div>

          {/* Section 3 */}
          <div className={isDark ? "p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-2" : "p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"}>
            <div className="flex items-center gap-2 font-bold text-sm text-purple-500">
              <span className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-xs">3</span>
              <span>تتبع الحالات والأخطاء في التقارير (Error Tracking)</span>
            </div>
            <p className={isDark ? "text-zinc-300 leading-relaxed pl-8" : "text-slate-700 leading-relaxed pl-8"}>
              الروابط الفاشلة أو الفارغة (مثل 403 Forbidden أو 404 Not Found أو أخطاء الشبكة) تظهر بوضوح في الجدول وفي تقارير التصدير (CSV, Markdown, JSON) مع حالة الخطأ وسبب الفشل لضمان الشفافية التامة.
            </p>
          </div>

          {/* Section 4 */}
          <div className={isDark ? "p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-2" : "p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"}>
            <div className="flex items-center gap-2 font-bold text-sm text-amber-500">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs">4</span>
              <span>الميزات المتقدمة (AI & Context Snippets)</span>
            </div>
            <p className={isDark ? "text-zinc-300 leading-relaxed pl-8" : "text-slate-700 leading-relaxed pl-8"}>
              اضغط على أي كلمة مطابقة لرؤية الجملة أو السياق الذي ظهرت فيه بالضبط داخل الصفحة (Visible Page أو Raw Code). كما يمكنك استخدام الذكاء الاصطناعي (Gemini AI) لتحليل محتوى الصفحات وملخصاتها.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={isDark ? "flex items-center justify-end px-6 py-4 border-t border-zinc-800 bg-zinc-950/50" : "flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50"}>
          <button
            onClick={onClose}
            className={
              isDark
                ? "px-5 py-2 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors text-xs"
                : "px-5 py-2 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors text-xs"
            }
          >
            فهمت، إغلاق الدليل
          </button>
        </div>
      </div>
    </div>
  );
};
