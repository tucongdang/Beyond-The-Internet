import React, { useState, useEffect, useRef } from 'react';
import { Search, User, FileText, Loader2, X, Filter, Clock, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs, limit, Firestore } from 'firebase/firestore';
import { QuestionItem, UserResponse } from '../types';

interface FluentSearchBarProps {
  db: Firestore | null;
  questionBank: QuestionItem[];
  allResponses: any;
  onSelectResult: (type: 'USER' | 'QUESTION' | 'FILTER', id: string, name?: string) => void;
}

export const FluentSearchBar: React.FC<FluentSearchBarProps> = ({ db, questionBank, allResponses, onSelectResult }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<{type: 'USER' | 'QUESTION' | 'FILTER', id: string, title: string, subtitle: string, icon?: React.ReactNode}[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim().length === 0) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      const lowerQuery = searchTerm.toLowerCase();
      const newResults: typeof results = [];
      
      // Quick Filter Handling
      if (lowerQuery === '#new') {
        const sortedUsers = (Object.values(allResponses || {}).flatMap((q: any) => Object.values(q || {})) as any[])
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          .slice(0, 5);
        sortedUsers.forEach(u => {
          newResults.push({
            type: 'USER',
            id: u.user_info?.uid || '',
            title: u.user_info?.name || '' || 'Khán giả ẩn danh',
            subtitle: `ID: ${u.user_info?.uid || ''.substring(0, 8)}... | Mới tham gia`,
            icon: <User className="w-4 h-4 text-emerald-400" />
          });
        });
        setResults(newResults);
        setIsSearching(false);
        return;
      }
      
      if (lowerQuery === '#pending') {
         // Simulate pending answers by finding users with recent responses
         const pendingUsers = (Object.values(allResponses || {}).flatMap((q: any) => Object.values(q || {})) as any[])
          .filter(u => u.choice || '' !== '')
          .slice(0, 5);
         pendingUsers.forEach(u => {
          newResults.push({
            type: 'USER',
            id: u.user_info?.uid || '',
            title: u.user_info?.name || '' || 'Khán giả',
            subtitle: `Câu trả lời: ${u.choice || ''} - Cần duyệt`,
            icon: <AlertCircle className="w-4 h-4 text-amber-400" />
          });
        });
        setResults(newResults);
        setIsSearching(false);
        return;
      }

      // 1. Search Questions
      const matchedQuestions = questionBank.filter(q => 
        q.id.toLowerCase().includes(lowerQuery) || 
        (q.question_text && q.question_text.toLowerCase().includes(lowerQuery)) ||
        (q.round_name && q.round_name.toLowerCase().includes(lowerQuery))
      ).slice(0, 5);

      matchedQuestions.forEach(q => {
        newResults.push({
          type: 'QUESTION',
          id: q.id,
          title: (q.question_text || '').substring(0, 50) + (q.question_text && q.question_text.length > 50 ? '...' : '') || 'Câu hỏi không có nội dung',
          subtitle: `[${q.id}] ${q.round_name}`,
          icon: <FileText className="w-4 h-4 text-sky-400" />
        });
      });

      // 2. Search Users
      const matchedUsers = (Object.values(allResponses || {}).flatMap((q: any) => Object.values(q || {})) as any[]).filter(r => 
        r.device_id.toLowerCase().includes(lowerQuery) ||
        (r.display_name && r.display_name.toLowerCase().includes(lowerQuery))
      );
      
      const uniqueUsers = Array.from(new Set(matchedUsers.map(u => u.user_info?.uid || '')))
        .map(id => matchedUsers.find(u => u.user_info?.uid || '' === id)!)
        .slice(0, 5);

      uniqueUsers.forEach(u => {
        newResults.push({
          type: 'USER',
          id: u.user_info?.uid || '',
          title: u.user_info?.name || '' || 'Khán giả ẩn danh',
          subtitle: `ID: ${u.user_info?.uid || ''.substring(0, 8)}... | Điểm: ${0 || 0}`,
          icon: <User className="w-4 h-4 text-amber-400" />
        });
      });

      setResults(newResults);
      setIsSearching(false);
      setIsOpen(true);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, questionBank, allResponses]);

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <Loader2 className="w-4 h-4 text-[#F7CAC9] animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-[#F7CAC9]" />
          )}
        </div>
        <input
          type="text"
          className="fluent-input w-full text-white text-sm rounded-[2px] pl-9 pr-8 py-1.5 transition-all outline-none placeholder:text-white/30"
          placeholder="Tìm khán giả, câu hỏi (vd: ID, Tên)..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {searchTerm && (
          <button 
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white/80 transition-colors"
            onClick={() => {
              setSearchTerm('');
              setResults([]);
              setIsOpen(true); // Keep open to show quick filters
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 fluent-box shadow-2xl shadow-black/50 overflow-hidden z-50 animate-fadeIn">
          
          {/* Quick Filters Section - Always show when open and search term is empty or small */}
          {searchTerm.length === 0 && (
            <div className="p-3 border-b border-white/5 bg-white/[0.02]">
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Filter className="w-3 h-3" />
                Bộ lọc nhanh
              </div>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setSearchTerm('#new')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs border border-emerald-500/20 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Người dùng mới
                </button>
                <button 
                  onClick={() => setSearchTerm('#pending')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs border border-amber-500/20 transition-colors"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Câu trả lời chưa duyệt
                </button>
              </div>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {searchTerm.length > 0 && results.length > 0 ? (
              <div className="py-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest bg-white/5 border-b border-white/5">
                  Kết quả tìm kiếm ({results.length})
                </div>
                {results.map((res, idx) => (
                  <button
                    key={`${res.type}-${res.id}-${idx}`}
                    className="w-full text-left px-3 py-2.5 hover:bg-white/10 transition-colors flex items-start gap-3 border-b border-white/5 last:border-0"
                    onClick={() => {
                      onSelectResult(res.type, res.id, res.title);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="mt-0.5 p-1.5 rounded-[2px] bg-white/5">
                      {res.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{res.title}</p>
                      <p className="text-[11px] text-white/50 truncate font-mono mt-0.5">{res.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : searchTerm.length > 0 && !isSearching ? (
              <div className="px-4 py-8 text-center text-white/40 text-sm flex flex-col items-center justify-center">
                <Search className="w-8 h-8 opacity-20 mb-2" />
                <p>Không tìm thấy kết quả nào phù hợp.</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
