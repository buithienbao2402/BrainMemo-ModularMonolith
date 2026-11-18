import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';

export function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-[#0e0e12] text-foreground">
      <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        {/* 4 Columns Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Slogan */}
          <div className="space-y-3">
            <BrandLogo to="/" compact showSubtitle={false} />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Nền tảng ghi nhớ và quản lý kiến thức dành riêng cho người học và chuyên gia học thuật Việt Nam.
            </p>
          </div>

          {/* Col 1: Học tập */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-sm text-foreground">Học tập</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link to="/courses" className="hover:text-brand-orange transition-colors">
                  Khóa học hiện có
                </Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-brand-orange transition-colors">
                  Bộ thẻ ghi nhớ
                </Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-brand-orange transition-colors">
                  Lộ trình đề xuất
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: Cộng đồng */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-sm text-foreground">Cộng đồng</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link to="/courses" className="hover:text-brand-orange transition-colors">
                  Diễn đàn trao đổi
                </Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-brand-orange transition-colors">
                  Chia sẻ tài liệu
                </Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-brand-orange transition-colors">
                  Không gian thảo luận
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Hỗ trợ */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-sm text-foreground">Hỗ trợ</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link to="/courses" className="hover:text-brand-orange transition-colors">
                  Trung tâm trợ giúp
                </Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-brand-orange transition-colors">
                  Quy chuẩn học thuật
                </Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-brand-orange transition-colors">
                  Liên hệ ban quản trị
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>{t('brand.copyright')}</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-brand-orange transition-colors">
              Điều khoản sử dụng
            </Link>
            <Link to="/privacy" className="hover:text-brand-orange transition-colors">
              Chính sách bảo mật
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
