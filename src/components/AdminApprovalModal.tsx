import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Check, X, Ban, Trash2, RefreshCw, UserCheck, Clock, AlertTriangle, Search, Filter, ShieldAlert } from 'lucide-react';
import { AdminUser, AdminStatus, TechnicalRole, TECHNICAL_ROLES } from '../types';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess, vibrateError } from '../utils/hapticUtils';

interface AdminApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AdminUser | null;
  onUserApproved?: (user: AdminUser) => void;
}

export const AdminApprovalModal: React.FC<AdminApprovalModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserApproved
}) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filter, setFilter] = useState<'ALL' | AdminStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const token = sessionStorage.getItem('BTI2026_ADMIN_TOKEN') || '';
      const res = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        setActionError('Không thể tải danh sách tài khoản. Vui lòng kiểm tra quyền hạn.');
      }
    } catch (err: any) {
      console.error('Error fetching admin users:', err);
      setActionError('Lỗi kết nối máy chủ quản lý.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  if (!isOpen) return null;

  const handleUpdateStatus = async (userId: string, newStatus: AdminStatus) => {
    vibrateTap();
    soundFx.playClick();
    setProcessingId(userId);
    setActionError(null);
    try {
      const token = sessionStorage.getItem('BTI2026_ADMIN_TOKEN') || '';
      const res = await fetch('/api/admin/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          status: newStatus,
          approvedBy: currentUser?.fullName || 'Trưởng Ban Kỹ Thuật',
          callerRole: currentUser?.role || 'OPERATOR'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        vibrateSuccess();
        soundFx.playPacingChime('complete');
        setUsers(prev => prev.map(u => u.id === userId ? data.user : u));
        if (newStatus === 'APPROVED' && onUserApproved) {
          onUserApproved(data.user);
        }
      } else {
        vibrateError();
        soundFx.playError();
        setActionError(data.error || 'Cập nhật trạng thái thất bại.');
      }
    } catch {
      vibrateError();
      soundFx.playError();
      setActionError('Lỗi kết nối máy chủ.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn hồ sơ của kỹ thuật viên "${userName}"?`)) {
      return;
    }

    vibrateTap();
    soundFx.playClick();
    setProcessingId(userId);
    setActionError(null);
    try {
      const token = sessionStorage.getItem('BTI2026_ADMIN_TOKEN') || '';
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, callerRole: currentUser?.role || 'OPERATOR' })
      });

      if (res.ok) {
        vibrateSuccess();
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        const data = await res.json();
        vibrateError();
        soundFx.playError();
        setActionError(data.error || 'Xóa hồ sơ thất bại.');
      }
    } catch {
      vibrateError();
      soundFx.playError();
      setActionError('Lỗi kết nối máy chủ.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = users.filter(u => u.status === 'PENDING').length;
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const filteredUsers = users.filter(u => {
    if (filter !== 'ALL' && u.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-md animate-fadeIn cursor-pointer"
        onClick={() => {
          vibrateTap();
          onClose();
        }}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-3xl bg-[#0D0420]/95 backdrop-blur-2xl border border-white/20 rounded-[4px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slideUpFade">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-sky-950/40 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[2px] bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase font-mono">
                  Phê Duyệt Ban Kỹ Thuật
                </h2>
                {pendingCount > 0 && (
                  <span className="animate-pulse px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {pendingCount} chờ duyệt
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/50 font-mono">
                Quản trị nhân sự & cấp quyền vận hành hệ thống phần mềm BTI 2026
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchUsers}
              disabled={isLoading}
              className="p-2 rounded-[2px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer border border-white/10"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onClose();
              }}
              className="p-2 rounded-[2px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer border border-white/10"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Alert if any */}
        {actionError && (
          <div className="px-4 py-2 bg-rose-950/60 border-b border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Controls: Search & Tabs */}
        <div className="p-3 sm:p-4 border-b border-white/10 bg-white/2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => { vibrateTap(); setFilter('ALL'); }}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-mono font-bold transition whitespace-nowrap cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-white/70'
              }`}
            >
              Tất Cả ({users.length})
            </button>
            <button
              type="button"
              onClick={() => { vibrateTap(); setFilter('PENDING'); }}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-mono font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                filter === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-amber-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Chờ Duyệt ({pendingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => { vibrateTap(); setFilter('APPROVED'); }}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-mono font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                filter === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-emerald-300'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Đã Duyệt ({users.filter(u => u.status === 'APPROVED').length})</span>
            </button>
            <button
              type="button"
              onClick={() => { vibrateTap(); setFilter('REVOKED'); }}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-mono font-bold transition whitespace-nowrap cursor-pointer ${
                filter === 'REVOKED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-rose-300'
              }`}
            >
              Khóa / Từ Chối ({users.filter(u => u.status === 'REVOKED' || u.status === 'REJECTED').length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Tìm theo tên, username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-56 pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-[2px] text-xs text-white placeholder:text-white/40 focus:border-sky-400 outline-none font-mono"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {isLoading ? (
            <div className="py-12 text-center text-white/50 text-xs font-mono flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
              <span>Đang tải danh sách tài khoản...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-white/40 text-xs font-mono">
              Không có tài khoản nào phù hợp với bộ lọc.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const roleInfo = TECHNICAL_ROLES[u.technicalRole] || {
                label: u.technicalRole,
                badgeColor: 'text-white/70 bg-white/5 border-white/10'
              };

              const isProcessing = processingId === u.id;

              return (
                <div
                  key={u.id}
                  className={`p-3 sm:p-3.5 rounded-[2px] border transition-all ${
                    u.status === 'PENDING'
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                      : u.status === 'APPROVED'
                      ? 'bg-white/4 border-white/10 hover:border-white/20'
                      : 'bg-rose-950/10 border-rose-500/20 opacity-75'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* User info */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">
                          {u.fullName}
                        </span>
                        <span className="text-[11px] font-mono text-sky-300 bg-sky-950/50 px-2 py-0.5 rounded-[2px] border border-sky-500/30">
                          @{u.username}
                        </span>
                        {u.authProvider === 'google' && (
                          <span className="text-[10px] font-mono text-white/60 bg-white/10 px-1.5 py-0.5 rounded-[2px]">
                            Google
                          </span>
                        )}
                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-[2px] border ${
                            u.status === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                              : u.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {u.status === 'PENDING'
                            ? 'Chờ Duyệt'
                            : u.status === 'APPROVED'
                            ? 'Đã Duyệt'
                            : u.status === 'REJECTED'
                            ? 'Đã Từ Chối'
                            : 'Đã Thu Hồi'}
                        </span>
                      </div>

                      {/* Technical Role Badge */}
                      <div className="flex items-center gap-2 text-xs flex-wrap pt-0.5">
                        <span className={`px-2 py-0.5 rounded-[2px] border text-[11px] font-bold ${roleInfo.badgeColor}`}>
                          {roleInfo.label}
                        </span>
                        {u.email && (
                          <span className="text-[11px] text-white/50 font-mono">
                            {u.email}
                          </span>
                        )}
                      </div>

                      {/* Registration Note if any */}
                      {u.note && (
                        <p className="text-[11px] text-white/60 italic font-sans bg-black/20 p-1.5 rounded-[2px] border border-white/5">
                          "{u.note}"
                        </p>
                      )}

                      {/* Metadata */}
                      <div className="text-[10px] font-mono text-white/40 flex items-center gap-3 pt-0.5">
                        <span>Đăng ký: {new Date(u.createdAt).toLocaleDateString('vi-VN')} {new Date(u.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        {u.approvedAt && (
                          <span className="text-emerald-400/80">
                            • Duyệt bởi: {u.approvedBy || 'Master'} ({new Date(u.approvedAt).toLocaleDateString('vi-VN')})
                          </span>
                        )}
                        {u.lastLoginAt && (
                          <span>
                            • Đăng nhập gần nhất: {new Date(u.lastLoginAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {u.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(u.id, 'APPROVED')}
                            disabled={isProcessing}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-[2px] flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Phê Duyệt</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(u.id, 'REJECTED')}
                            disabled={isProcessing}
                            className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 text-xs rounded-[2px] flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Từ Chối</span>
                          </button>
                        </>
                      )}

                      {u.status === 'APPROVED' && isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(u.id, 'REVOKED')}
                          disabled={isProcessing}
                          className="px-2.5 py-1.5 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/30 text-xs rounded-[2px] flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                          title="Tạm ngưng quyền truy cập (chỉ Super Admin)"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Thu Hồi Quyền</span>
                        </button>
                      )}

                      {u.status === 'REJECTED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(u.id, 'APPROVED')}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs rounded-[2px] flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Kích Hoạt Lại</span>
                        </button>
                      )}

                      {u.status === 'REVOKED' && isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(u.id, 'APPROVED')}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs rounded-[2px] flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                          title="Khôi phục quyền truy cập (chỉ Super Admin)"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Kích Hoạt Lại</span>
                        </button>
                      )}

                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.fullName)}
                          disabled={isProcessing}
                          className="p-1.5 text-white/40 hover:text-rose-400 hover:bg-rose-950/30 rounded-[2px] transition cursor-pointer disabled:opacity-30 border border-transparent hover:border-rose-500/30"
                          title="Xóa vĩnh viễn hồ sơ (chỉ Super Admin)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-[11px] font-mono text-white/50">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Chỉ thành viên có trạng thái <strong>ĐÃ DUYỆT</strong> mới có thể đăng nhập màn hình Admin</span>
          </div>
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-[2px] text-xs transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
