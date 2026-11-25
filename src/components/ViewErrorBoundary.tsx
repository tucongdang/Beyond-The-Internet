import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { isDynamicImportError } from '../utils/lazyWithRetry';

interface ViewErrorBoundaryProps {
  children: React.ReactNode;
  viewName?: string;
  language?: string;
  onGoHome?: () => void;
}

interface ViewErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ViewErrorBoundary extends React.Component<
  ViewErrorBoundaryProps,
  ViewErrorBoundaryState
> {
  constructor(props: ViewErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ViewErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ViewErrorBoundary] Caught view render/import error:', error, info);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReloadPage = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isVi = (this.props.language || 'vi') === 'vi';
    const isChunkErr = isDynamicImportError(this.state.error);

    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[60vh]">
        <div
          role="alert"
          className="fluent-box max-w-md w-full rounded-[4px] border border-amber-400/40 bg-[#190839]/90 p-6 text-center space-y-4 shadow-2xl"
        >
          <div className="w-12 h-12 rounded-[3px] mx-auto bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-extrabold text-white">
              {isChunkErr
                ? isVi
                  ? 'Không thể tải giao diện lúc này'
                  : 'Unable to load view right now'
                : isVi
                ? 'Đã xảy ra sự cố hiển thị'
                : 'Something went wrong'}
            </h2>
            <p className="text-xs text-[#B6A6D8] leading-relaxed">
              {isChunkErr
                ? isVi
                  ? `Kết nối tạm gián đoạn hoặc hệ thống vừa cập nhật phiên bản mới khi tải ${this.props.viewName || 'trang'}. Hãy thử tải lại.`
                  : `Network was interrupted or a new app version was deployed while loading ${this.props.viewName || 'this view'}.`
                : this.state.error?.message ||
                  (isVi ? 'Vui lòng thử tải lại giao diện.' : 'Please try reloading the view.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-3.5 py-2 rounded-[2px] bg-[#F7CAC9] hover:bg-white text-[#190839] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isVi ? 'Thử lại' : 'Retry'}</span>
            </button>

            <button
              type="button"
              onClick={this.handleReloadPage}
              className="px-3.5 py-2 rounded-[2px] bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 cursor-pointer transition"
            >
              {isVi ? 'Tải lại trang' : 'Reload Page'}
            </button>

            {this.props.onGoHome && (
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  this.props.onGoHome?.();
                }}
                className="px-3.5 py-2 rounded-[2px] bg-white/5 hover:bg-white/15 text-[#B6A6D8] hover:text-white font-semibold text-xs border border-white/10 flex items-center gap-1.5 cursor-pointer transition"
              >
                <Home className="w-3.5 h-3.5" />
                <span>{isVi ? 'Trang chủ' : 'Home'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
