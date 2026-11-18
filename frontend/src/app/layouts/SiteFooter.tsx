import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-[#f8f9fa] dark:bg-[#0e0e12] text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
        {/* Hàng 1: 2 cột - Liên hệ (email) và Thông tin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8">
          {/* Cột 1: Liên hệ (email) */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm tracking-wide text-foreground uppercase">
              Liên hệ
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-4 w-4 text-brand-orange shrink-0" />
              <span>Email:</span>
              <a
                href="mailto:tranquocanh11122005@gmail.com"
                className="font-medium text-foreground hover:text-brand-orange transition-colors"
              >
                tranquocanh11122005@gmail.com
              </a>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
              Mọi thắc mắc, hỗ trợ kỹ thuật hoặc đóng góp ý kiến về nền tảng học tập BrainMemo, xin
              vui lòng liên hệ với chúng tôi qua email.
            </p>
          </div>

          {/* Cột 2: Thông tin */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm tracking-wide text-foreground uppercase">
              Thông tin
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link to="/courses" className="hover:text-brand-orange transition-colors">
                  Kiến Thức Cơ Bản
                </Link>
              </li>
              <li>
                <Link to="/policies" className="hover:text-brand-orange transition-colors">
                  Chính Sách
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-brand-orange transition-colors">
                  Chính Sách Bảo Mật
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-brand-orange transition-colors">
                  Điều Khoản Sử Dụng
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Hàng 2: Logo web và Bản quyền */}
        <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo to="/" showSubtitle={false} />
          <p className="text-xs text-muted-foreground text-center sm:text-right">
            © 2026 | Toàn bộ bản quyền thuộc BrainMemo
          </p>
        </div>
      </div>
    </footer>
  );
}
