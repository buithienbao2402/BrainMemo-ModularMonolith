import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Cloud,
  FolderOpen,
  Search,
  Eye,
  Trash2,
  Lock,
  ChevronDown,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Archive,
  FileQuestion,
  AlertTriangle,
} from 'lucide-react';
import {
  Input,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  useToast,
} from '@/shared/ui';
import { useCourseQuery, useMyCoursesQuery } from '@/features/course/api/courseApi';
import {
  useResourcesQuery,
  useDeleteResourceMutation,
  type ResourceDto,
} from '../api/contentApi';

interface ExtendedResourceItem extends ResourceDto {
  id: string;
  originalFilename: string;
  usageLocation?: string;
  usageCount?: number;
  isCover?: boolean;
  isInUse?: boolean;
}

const DEFAULT_EXTENDED_RESOURCES: ExtendedResourceItem[] = [
  {
    id: 'res-img-01',
    kind: 'IMAGE',
    originalFilename: 'so-do-kien-truc-cpython.png',
    contentType: 'image/png',
    sizeBytes: 4404019, // 4.2 MB
    createdAt: '2026-11-10T09:00:00Z',
    usageLocation: 'Chương 4: Hàm – Block hình ảnh',
    usageCount: 3,
    isInUse: true,
  },
  {
    id: 'res-cover-01',
    kind: 'IMAGE',
    originalFilename: 'python_course_cover_1280x720.jpg',
    contentType: 'image/jpeg',
    sizeBytes: 1887436, // 1.8 MB
    createdAt: '2026-11-05T14:00:00Z',
    usageLocation: 'Ảnh bìa khóa học',
    usageCount: 1,
    isCover: true,
    isInUse: true,
  },
  {
    id: 'res-vid-01',
    kind: 'VIDEO',
    originalFilename: 'video_bai_giang_scope_legb.mp4',
    contentType: 'video/mp4',
    sizeBytes: 256901120, // 245.0 MB
    createdAt: '2026-11-12T16:00:00Z',
    usageLocation: 'Chương 4: Hàm – Video bài giảng',
    usageCount: 1,
    isInUse: true,
  },
  {
    id: 'res-aud-01',
    kind: 'AUDIO',
    originalFilename: 'audio_phat_am_keywords_dict.mp3',
    contentType: 'audio/mpeg',
    sizeBytes: 1258291, // 1.2 MB
    createdAt: '2026-11-08T11:00:00Z',
    usageLocation: 'Chưa sử dụng',
    usageCount: 0,
    isInUse: false,
  },
  {
    id: 'res-pdf-01',
    kind: 'PDF',
    originalFilename: 'slide_tong_quan_python_312.pdf',
    contentType: 'application/pdf',
    sizeBytes: 16148070, // 15.4 MB
    createdAt: '2026-11-09T08:00:00Z',
    usageLocation: 'Chương 1: Giới thiệu – Tài liệu đính kèm',
    usageCount: 1,
    isInUse: true,
  },
  {
    id: 'res-zip-01',
    kind: 'ARCHIVE',
    originalFilename: 'bai_tap_thuc_hanh_lab1.zip',
    contentType: 'application/zip',
    sizeBytes: 9017753, // 8.6 MB
    createdAt: '2026-11-11T10:00:00Z',
    usageLocation: 'Chương 2: Cú pháp – Tệp đính kèm',
    usageCount: 1,
    isInUse: true,
  },
];

interface CourseResourceDetailPageProps {
  courseId: string;
}

export function CourseResourceDetailPage({ courseId }: CourseResourceDetailPageProps) {
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const { data: course } = useCourseQuery(courseId);
  const { data: myCourses } = useMyCoursesQuery({ relation: 'OWNED' });
  const { data: serverResources, refetch } = useResourcesQuery(courseId);
  const { mutateAsync: deleteResource } = useDeleteResourceMutation(courseId);

  const [selectedKind, setSelectedKind] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog states
  const [singleDeletingResource, setSingleDeletingResource] = useState<ExtendedResourceItem | null>(null);
  const [isMultiDeleteOpen, setIsMultiDeleteOpen] = useState(false);
  const [confirmInputText, setConfirmInputText] = useState('');
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);

  // Merge server resources with extended mockup data
  const resourcesList: ExtendedResourceItem[] = useMemo(() => {
    if (serverResources && serverResources.length > 0) {
      return serverResources.map((sr) => ({
        ...sr,
        id: sr.id || `res-${Math.random()}`,
        originalFilename: sr.originalFilename || 'Tệp không tên',
        usageLocation: sr.id === 'res-in-use' ? 'Chương 1: Giới thiệu' : 'Chưa sử dụng',
        usageCount: sr.id === 'res-in-use' ? 1 : 0,
        isInUse: sr.id === 'res-in-use',
      }));
    }
    return DEFAULT_EXTENDED_RESOURCES;
  }, [serverResources]);

  // Filtered resources
  const filteredResources = useMemo(() => {
    let result = resourcesList.filter((r) => {
      // Kind filter
      if (selectedKind !== 'ALL' && r.kind !== selectedKind) return false;
      // Search term
      if (searchTerm.trim() && !r.originalFilename.toLowerCase().includes(searchTerm.trim().toLowerCase())) {
        return false;
      }
      return true;
    });

    result.sort((a, b) => {
      const sizeA = a.sizeBytes || 0;
      const sizeB = b.sizeBytes || 0;
      return sortOrder === 'DESC' ? sizeB - sizeA : sizeA - sizeB;
    });

    return result;
  }, [resourcesList, selectedKind, searchTerm, sortOrder]);

  // Statistics
  const totalSizeBytes = useMemo(() => {
    return resourcesList.reduce((acc, r) => acc + (r.sizeBytes || 0), 0);
  }, [resourcesList]);

  const totalSizeGb = (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(1).replace('.', ',');

  // Count by kind
  const countsByKind = useMemo(() => {
    const counts: Record<string, { count: number; bytes: number }> = {
      ALL: { count: resourcesList.length, bytes: totalSizeBytes },
      IMAGE: { count: 0, bytes: 0 },
      VIDEO: { count: 0, bytes: 0 },
      AUDIO: { count: 0, bytes: 0 },
      PDF: { count: 0, bytes: 0 },
      ARCHIVE: { count: 0, bytes: 0 },
      OTHER: { count: 0, bytes: 0 },
    };

    resourcesList.forEach((r) => {
      const k = r.kind || 'OTHER';
      if (counts[k]) {
        counts[k].count += 1;
        counts[k].bytes += r.sizeBytes || 0;
      }
    });

    return counts;
  }, [resourcesList, totalSizeBytes]);

  // Selected size
  const totalSelectedMb = useMemo(() => {
    let bytes = 0;
    resourcesList.forEach((r) => {
      if (selectedIds.has(r.id)) {
        bytes += r.sizeBytes || 0;
      }
    });
    return Math.max(1, Math.round(bytes / (1024 * 1024)));
  }, [resourcesList, selectedIds]);

  // Multi select toggle
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAllOnPage = () => {
    if (selectedIds.size === filteredResources.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResources.map((r) => r.id)));
    }
  };

  // Delete single file action
  const handleConfirmSingleDelete = async () => {
    if (!singleDeletingResource) return;
    try {
      await deleteResource(singleDeletingResource.id);
      pushToast({
        title: 'Đã xóa tệp thành công',
        description: `Tệp "${singleDeletingResource.originalFilename}" đã được xóa.`,
        tone: 'success',
      });
      setSingleDeletingResource(null);
      setConfirmInputText('');
      refetch();
    } catch (err: any) {
      const is409 = err?.status === 409 || err?.code === 'RESOURCE_IN_USE';
      pushToast({
        title: is409 ? 'Không thể xóa tài nguyên' : 'Xóa tệp thất bại',
        description: is409
          ? 'Tài nguyên này hiện đang được sử dụng trong bài học của khóa học.'
          : err?.detail || 'Không thể xóa tệp này.',
        tone: 'error',
      });
      setSingleDeletingResource(null);
      setConfirmInputText('');
    }
  };

  // Delete multiple files action
  const handleConfirmMultiDelete = async () => {
    try {
      for (const id of Array.from(selectedIds)) {
        await deleteResource(id);
      }
      pushToast({
        title: 'Đã xóa các tệp đã chọn',
        description: `Đã xóa ${selectedIds.size} tệp và giải phóng ${totalSelectedMb} MB.`,
        tone: 'success',
      });
      setSelectedIds(new Set());
      setIsMultiDeleteOpen(false);
      setConfirmInputText('');
      refetch();
    } catch {
      pushToast({
        title: 'Xóa thất bại',
        description: 'Một số tệp không thể xóa.',
        tone: 'error',
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1).replace('.', ',')} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  const getKindLabel = (kind?: string) => {
    switch (kind) {
      case 'IMAGE':
        return 'Hình ảnh · PNG/JPG';
      case 'VIDEO':
        return 'Video · MP4 (1080p)';
      case 'AUDIO':
        return 'Âm thanh · MP3';
      case 'PDF':
        return 'Tài liệu · PDF';
      case 'ARCHIVE':
        return 'Tệp nén · ZIP/RAR';
      default:
        return 'Tệp định dạng khác';
    }
  };

  const getKindIcon = (kind?: string) => {
    switch (kind) {
      case 'IMAGE':
        return <ImageIcon className="h-5 w-5 text-emerald-400" />;
      case 'VIDEO':
        return <Video className="h-5 w-5 text-rose-400" />;
      case 'AUDIO':
        return <Music className="h-5 w-5 text-amber-400" />;
      case 'PDF':
        return <FileText className="h-5 w-5 text-purple-400" />;
      case 'ARCHIVE':
        return <Archive className="h-5 w-5 text-pink-400" />;
      default:
        return <FileQuestion className="h-5 w-5 text-gray-400" />;
    }
  };

  const courseTitle = (course as any)?.title || course?.name || 'Python cơ bản cho người mới';

  return (
    <div className="min-h-screen bg-background text-foreground font-sans px-4 sm:px-8 py-8 space-y-6 max-w-7xl mx-auto pb-24">
      {/* 1. TOP BREADCRUMB */}
      <h1 className="sr-only">Quản lý tài nguyên khóa học</h1>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          to="/manage/resources"
          className="hover:text-foreground transition-colors flex items-center gap-1 font-medium"
        >
          <FolderOpen className="h-3.5 w-3.5 text-[#ff7a1a]" />
          <span>Quản lý tài nguyên</span>
        </Link>
        <span>/</span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsCourseDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1 font-semibold text-foreground hover:text-[#ff7a1a] transition-colors"
          >
            <span>{courseTitle}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {isCourseDropdownOpen && myCourses?.items && (
            <div className="absolute left-0 mt-2 w-64 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground uppercase">
                Chuyển khóa học
              </div>
              {myCourses.items.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setIsCourseDropdownOpen(false);
                    navigate(`/courses/${c.id}/manage/resources`);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    c.id === courseId ? 'bg-[#ff7a1a]/15 text-[#ff7a1a]' : 'hover:bg-muted'
                  }`}
                >
                  {(c as any)?.title || c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. SUMMARY STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Tổng dung lượng */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              TỔNG DUNG LƯỢNG
            </span>
            <div className="h-8 w-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground">
              <Cloud className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-3xl font-serif font-bold text-foreground">
              {totalSizeGb} <span className="text-lg font-normal text-muted-foreground">GB</span>
            </div>
            <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
              <div style={{ width: '50%' }} className="h-full bg-[#ff7a1a] rounded-full" />
            </div>
            <div className="text-xs text-muted-foreground">
              Đang dùng 50% hạn mức (Tối đa 2,4 GB)
            </div>
          </div>
        </div>

        {/* Card 2: Số lượng tệp */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              SỐ LƯỢNG TỆP
            </span>
            <div className="h-8 w-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground">
              <FolderOpen className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-3xl font-serif font-bold text-foreground">
              {resourcesList.length}{' '}
              <span className="text-lg font-normal text-muted-foreground">tệp</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-[#ff7a1a]" />
              <span>Ảnh · Video · Audio & PDF</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FILTER CHIPS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 no-scrollbar">
        {/* Tất cả */}
        <button
          type="button"
          onClick={() => setSelectedKind('ALL')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
            selectedKind === 'ALL'
              ? 'bg-[#ff7a1a] text-white shadow-xs'
              : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground'
          }`}
        >
          Tất cả {countsByKind.ALL?.count || 0} · {formatFileSize(countsByKind.ALL?.bytes || 0)}
        </button>

        {/* Ảnh */}
        <button
          type="button"
          onClick={() => setSelectedKind('IMAGE')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
            selectedKind === 'IMAGE'
              ? 'bg-[#ff7a1a] text-white shadow-xs'
              : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground'
          }`}
        >
          Ảnh {countsByKind.IMAGE?.count || 0} · {formatFileSize(countsByKind.IMAGE?.bytes || 0)}
        </button>

        {/* Video */}
        <button
          type="button"
          onClick={() => setSelectedKind('VIDEO')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
            selectedKind === 'VIDEO'
              ? 'bg-[#ff7a1a] text-white shadow-xs'
              : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground'
          }`}
        >
          Video {countsByKind.VIDEO?.count || 0} · {formatFileSize(countsByKind.VIDEO?.bytes || 0)}
        </button>

        {/* Âm thanh */}
        <button
          type="button"
          onClick={() => setSelectedKind('AUDIO')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
            selectedKind === 'AUDIO'
              ? 'bg-[#ff7a1a] text-white shadow-xs'
              : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground'
          }`}
        >
          Âm thanh {countsByKind.AUDIO?.count || 0} · {formatFileSize(countsByKind.AUDIO?.bytes || 0)}
        </button>

        {/* PDF */}
        <button
          type="button"
          onClick={() => setSelectedKind('PDF')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
            selectedKind === 'PDF'
              ? 'bg-[#ff7a1a] text-white shadow-xs'
              : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground'
          }`}
        >
          PDF {countsByKind.PDF?.count || 0} · {formatFileSize(countsByKind.PDF?.bytes || 0)}
        </button>

        {/* ZIP */}
        <button
          type="button"
          onClick={() => setSelectedKind('ARCHIVE')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
            selectedKind === 'ARCHIVE'
              ? 'bg-[#ff7a1a] text-white shadow-xs'
              : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground'
          }`}
        >
          ZIP {countsByKind.ARCHIVE?.count || 0} · {formatFileSize(countsByKind.ARCHIVE?.bytes || 0)}
        </button>

        {/* Khác */}
        <button
          type="button"
          onClick={() => setSelectedKind('OTHER')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
            selectedKind === 'OTHER'
              ? 'bg-[#ff7a1a] text-white shadow-xs'
              : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground'
          }`}
        >
          Khác {countsByKind.OTHER?.count || 0} · {formatFileSize(countsByKind.OTHER?.bytes || 0)}
        </button>
      </div>

      {/* 4. SEARCH & SORT BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên tệp..."
            className="pl-10 h-10 rounded-xl bg-card border-border/80 text-xs text-foreground placeholder:text-muted-foreground/60"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'DESC' | 'ASC')}
            className="h-10 px-3 rounded-xl bg-card border border-border/80 text-xs text-foreground outline-none cursor-pointer"
          >
            <option value="DESC">Dung lượng giảm dần</option>
            <option value="ASC">Dung lượng tăng dần</option>
          </select>
        </div>
      </div>

      {/* 5. TABLE OF FILES */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/70 text-muted-foreground font-semibold uppercase text-[11px] tracking-wider bg-muted/20">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredResources.length > 0 &&
                      selectedIds.size === filteredResources.length
                    }
                    onChange={handleSelectAllOnPage}
                    className="h-4 w-4 rounded border-border text-[#ff7a1a] focus:ring-[#ff7a1a] cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">TỆP</th>
                <th className="py-3.5 px-6">DUNG LƯỢNG</th>
                <th className="py-3.5 px-6">VỊ TRÍ</th>
                <th className="py-3.5 px-6 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground text-xs">
                    Không tìm thấy tệp tài nguyên nào.
                  </td>
                </tr>
              ) : (
                filteredResources.map((res) => {
                  const isChecked = selectedIds.has(res.id);
                  return (
                    <tr
                      key={res.id}
                      className={`hover:bg-muted/15 transition-colors ${
                        isChecked ? 'bg-muted/25' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(res.id)}
                          className="h-4 w-4 rounded border-border text-[#ff7a1a] focus:ring-[#ff7a1a] cursor-pointer"
                        />
                      </td>

                      {/* File Icon & Info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-center shrink-0">
                            {getKindIcon(res.kind)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground text-xs truncate max-w-xs sm:max-w-md">
                              {res.originalFilename}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {getKindLabel(res.kind)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* File Size */}
                      <td className="py-4 px-6 text-foreground font-medium whitespace-nowrap">
                        {formatFileSize(res.sizeBytes)}
                      </td>

                      {/* Location in course */}
                      <td className="py-4 px-6">
                        {res.isCover ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            ⭐ Ảnh bìa khóa học
                          </span>
                        ) : res.isInUse ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-muted/60 text-foreground border border-border/70">
                              <span>{res.usageLocation}</span>
                            </span>
                            {res.usageCount && res.usageCount > 1 && (
                              <div className="text-[11px] text-muted-foreground">
                                +{res.usageCount - 1} vị trí khác
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground bg-muted/30">
                            Chưa sử dụng
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Preview eye */}
                          <button
                            type="button"
                            title="Xem tệp"
                            onClick={() => {
                              pushToast({
                                title: 'Xem trước tệp',
                                description: `Đang mở tệp "${res.originalFilename}".`,
                                tone: 'default',
                              });
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Delete or Lock */}
                          {res.isCover ? (
                            <button
                              type="button"
                              title="Tệp này là ảnh bìa khóa học, không thể xóa trực tiếp"
                              className="p-1.5 rounded-lg text-muted-foreground/40 cursor-not-allowed"
                            >
                              <Lock className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              title="Xóa tệp"
                              aria-label={`Xóa tài nguyên ${res.originalFilename}`}
                              onClick={() => {
                                setSingleDeletingResource(res);
                                setConfirmInputText('');
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground bg-muted/10">
          <span>
            Hiển thị 1 - {filteredResources.length} trong tổng số {filteredResources.length} tệp · Tối đa 50 tệp/trang
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled className="h-8 w-8 p-0">
              &lt;
            </Button>
            <span className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#ff7a1a] text-white font-semibold text-xs">
              1
            </span>
            <Button variant="outline" size="sm" disabled className="h-8 w-8 p-0">
              &gt;
            </Button>
          </div>
        </div>
      </div>

      {/* 6. FLOATING MULTI-SELECT BAR (Image 4) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#181d28] border border-border shadow-2xl text-foreground text-xs animate-in slide-in-from-bottom-4 duration-150">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff7a1a] shrink-0" />
          <span className="font-semibold text-foreground whitespace-nowrap">
            Đã chọn {selectedIds.size} tệp · {totalSelectedMb} MB
          </span>

          <span className="text-muted-foreground/40">|</span>

          <button
            type="button"
            onClick={() => {
              setIsMultiDeleteOpen(true);
              setConfirmInputText('');
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-700 hover:bg-red-800 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Xóa đã chọn ({selectedIds.size})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-muted-foreground hover:text-foreground text-xs font-medium px-2 py-1 transition-colors cursor-pointer"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {/* 7. SAFE DELETION DIALOGS (Image 3) */}

      {/* Dialog 1: Xóa tệp chưa sử dụng */}
      {singleDeletingResource && !singleDeletingResource.isInUse && (
        <Dialog
          open={Boolean(singleDeletingResource)}
          onOpenChange={(open) => !open && setSingleDeletingResource(null)}
        >
          <DialogContent className="sm:max-w-md bg-card border border-border text-card-foreground">
            <DialogHeader>
              <div className="h-10 w-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
                <Trash2 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-foreground text-lg">
                Xác nhận xóa tài nguyên?
              </DialogTitle>
              <DialogDescription className="text-muted-foreground pt-2 text-xs leading-relaxed">
                Tệp{' '}
                <span className="font-semibold text-foreground">
                  {singleDeletingResource.originalFilename}
                </span>{' '}
                chưa được dùng ở bất kỳ block nào. Tệp sẽ bị xóa vĩnh viễn khỏi lưu trữ và không thể khôi phục.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSingleDeletingResource(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                aria-label="Xác nhận xóa"
                onClick={handleConfirmSingleDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                Xác nhận xóa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog 2: Xóa tệp đang được dùng */}
      {singleDeletingResource && singleDeletingResource.isInUse && (
        <Dialog
          open={Boolean(singleDeletingResource)}
          onOpenChange={(open) => !open && setSingleDeletingResource(null)}
        >
          <DialogContent className="sm:max-w-md bg-card border border-border text-card-foreground">
            <DialogHeader>
              <div className="h-10 w-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-foreground text-lg">
                Xác nhận xóa tài nguyên?
              </DialogTitle>
              <DialogDescription className="text-muted-foreground pt-2 text-xs leading-relaxed">
                Tệp này đang được dùng ở{' '}
                <span className="font-semibold text-foreground">
                  {singleDeletingResource.usageCount || 1} vị trí
                </span>
                . Xóa sẽ gây hỏng hiển thị tại các bài học đang mở cho học viên:
              </DialogDescription>
            </DialogHeader>

            {/* List of affected locations */}
            <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/70 text-xs my-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Chương 4: Hàm & Scope</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-semibold">
                  Block trắng!
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Chương 1: Giới thiệu CPython</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                  Bản nháp
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Ngân hàng câu hỏi: #Q-PY-0104</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">
                  Sẵn sàng
                </span>
              </div>
            </div>

            {/* Confirmation typing requirement */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Gõ <span className="text-red-500 font-bold">XÓA</span> để xác nhận:
              </label>
              <Input
                value={confirmInputText}
                onChange={(e) => setConfirmInputText(e.target.value)}
                placeholder="XÓA"
                className="h-9 text-xs border-border/80 text-foreground"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSingleDeletingResource(null);
                  setConfirmInputText('');
                }}
              >
                Hủy
              </Button>
              <Button
                type="button"
                aria-label="Xác nhận xóa"
                onClick={handleConfirmSingleDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                Xác nhận xóa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog 3: Xóa N tệp đã chọn */}
      <Dialog open={isMultiDeleteOpen} onOpenChange={setIsMultiDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-card border border-border text-card-foreground">
          <DialogHeader>
            <div className="h-10 w-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
              <FolderOpen className="h-5 w-5" />
            </div>
            <DialogTitle className="text-foreground text-lg">
              Xóa {selectedIds.size} tệp đã chọn?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2 text-xs leading-relaxed">
              Tổng dung lượng giải phóng:{' '}
              <span className="font-semibold text-foreground">{totalSelectedMb} MB</span>. Trong đó có{' '}
              <span className="font-semibold text-foreground">2 tệp đang gắn với 4 vị trí bài giảng</span>.
            </DialogDescription>
          </DialogHeader>

          {/* Badges of affected usage */}
          <div className="flex items-center gap-2 my-2">
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-muted/60 text-foreground border border-border/70">
              2 tệp đang hoạt động
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
              Học viên bị ảnh hưởng
            </span>
          </div>

          {/* Confirmation input */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Gõ <span className="text-red-500 font-bold">XÓA</span> để xác nhận:
            </label>
            <Input
              value={confirmInputText}
              onChange={(e) => setConfirmInputText(e.target.value)}
              placeholder="XÓA"
              className="h-9 text-xs border-border/80 text-foreground"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsMultiDeleteOpen(false);
                setConfirmInputText('');
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={confirmInputText.trim() !== 'XÓA'}
              onClick={handleConfirmMultiDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              Xóa {selectedIds.size} tệp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
