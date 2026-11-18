import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  ArrowLeft,
  RotateCcw,
  Eye,
  ChevronsLeftRight,
  Sparkles,
  Image as ImageIcon,
  Video,
  Music,
  Paperclip,
  HelpCircle,
  FileUp,
  ListChecks,
} from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  useToast,
} from '@/shared/ui';
import {
  useChapterVersionsQuery,
  useRestoreChapterVersionMutation,
  useChapterDraftQuery,
  normalizeBlockType,
  type ChapterVersionDto,
  type BlockDto,
} from '../api/contentApi';
import { RichTextDocumentRenderer } from '../components/RichTextDocumentRenderer';

type ExtendedVersion = ChapterVersionDto & {
  title?: string;
  description?: string | null;
  blocks?: BlockDto[];
  authorName?: string;
};

export function ChapterVersionHistoryPage() {
  const { courseId, chapterId } = useParams<{ courseId: string; chapterId: string }>();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const cId = courseId || '';
  const chId = chapterId || '';

  const { data: currentChapter, isLoading: isLoadingChapter } = useChapterDraftQuery(cId, chId);
  const { data: rawVersions, isLoading: isLoadingVersions } = useChapterVersionsQuery(cId, chId);
  const { mutateAsync: restoreVersion, isPending: isRestoring } = useRestoreChapterVersionMutation(cId, chId);

  const [selectedVersionNo, setSelectedVersionNo] = useState<number | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Cast versions to ExtendedVersion for preview data
  const versions: ExtendedVersion[] = useMemo(() => {
    if (!rawVersions || rawVersions.length === 0) {
      if (currentChapter) {
        return [
          {
            versionNo: currentChapter.lastVersionNo || 1,
            createdAt: new Date().toISOString(),
            publishedAt: null,
            restoredFromVersionNo: null,
            title: currentChapter.title || 'Chương không có tiêu đề',
            description: currentChapter.description || '',
            blocks: currentChapter.blocks || [],
            authorName: 'Quang Trần (Bạn)',
          },
        ];
      }
      return [];
    }
    return rawVersions.map((v: any) => {
      const ext = v as ExtendedVersion;
      // If version matches current chapter, ensure blocks are populated
      if (ext.versionNo === currentChapter?.lastVersionNo && (!ext.blocks || ext.blocks.length === 0)) {
        return {
          ...ext,
          title: ext.title || currentChapter?.title,
          description: ext.description !== undefined ? ext.description : currentChapter?.description,
          blocks: currentChapter?.blocks || [],
          authorName: ext.authorName || 'Quang Trần (Bạn)',
        };
      }
      return {
        ...ext,
        title: ext.title || currentChapter?.title || 'Chương 4: Hàm & Phạm vi biến (Scope)',
        description:
          ext.description !== undefined
            ? ext.description
            : currentChapter?.description ||
              'Nắm vững quy tắc phân định phạm vi LEGB (Local, Enclosing, Global, Built-in), lambda function và cơ chế tạo đóng kín (Closures) trong kiến trúc ngôn ngữ Python.',
        blocks: ext.blocks || currentChapter?.blocks || [],
        authorName: ext.authorName || 'Quang Trần',
      };
    });
  }, [rawVersions, currentChapter]);

  // Default selected version to first / latest version
  const activeVersionNo = selectedVersionNo ?? (versions[0]?.versionNo ?? currentChapter?.lastVersionNo ?? 1);
  const selectedVersion = versions.find((v) => v.versionNo === activeVersionNo) || versions[0];

  // Helper date group
  const groupedVersions = useMemo(() => {
    const groups: { label: string; items: ExtendedVersion[] }[] = [];
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    versions.forEach((ver) => {
      const date = ver.createdAt ? new Date(ver.createdAt) : new Date();
      let label = '';
      const dateStr = date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      if (isSameDay(date, today)) {
        label = `HÔM NAY — ${dateStr}`;
      } else if (isSameDay(date, yesterday)) {
        label = `HÔM QUA — ${dateStr}`;
      } else {
        label = dateStr;
      }

      let grp = groups.find((g) => g.label === label);
      if (!grp) {
        grp = { label, items: [] };
        groups.push(grp);
      }
      grp.items.push(ver);
    });

    return groups;
  }, [versions]);

  const handleConfirmRestore = async () => {
    if (!selectedVersion || selectedVersion.versionNo === undefined) return;
    try {
      await restoreVersion(selectedVersion.versionNo);
      pushToast({
        title: 'Khôi phục phiên bản thành công',
        description: `Bản nháp làm việc đã được khôi phục về Phiên bản #${selectedVersion.versionNo}.`,
        tone: 'success',
      });
      setIsConfirmOpen(false);
      navigate(`/courses/${cId}/manage/content/${chId}`);
    } catch {
      pushToast({
        title: 'Khôi phục thất bại',
        description: 'Có lỗi xảy ra khi khôi phục phiên bản này.',
        tone: 'error',
      });
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '12:00 · 01/01';
    const d = new Date(isoString);
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${hours}:${mins} · ${day}/${month}`;
  };

  const previewTitle = selectedVersion?.title || currentChapter?.title || 'Chương không có tiêu đề';
  const previewDescription = selectedVersion?.description ?? currentChapter?.description ?? '';
  const previewBlocks = selectedVersion?.blocks || currentChapter?.blocks || [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* 1. TOP HEADER BANNER */}
      <div className="sticky top-0 z-40 border-b border-border/80 bg-card/95 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-xs">
        {/* Left message with clock icon */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-[#ff7a1a]/15 text-[#ff7a1a] flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4" />
          </div>
          <p className="text-xs sm:text-sm text-foreground/90 font-medium truncate">
            Nội dung ở chế độ chỉ đọc. Chỉnh sửa sẽ không được lưu vào bản ghi này.
          </p>
        </div>

        {/* Right action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate(`/courses/${cId}/manage/content/${chId}`)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border/80 bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại bản hiện tại</span>
          </button>

          <Button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#ff7a1a] hover:bg-[#ff7a1a]/90 text-white font-medium text-xs shadow-sm transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Khôi phục phiên bản này</span>
          </Button>
        </div>
      </div>

      {/* 2. MAIN TWO-COLUMN WORKSPACE */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left preview canvas */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-10 transition-all">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">
              {previewTitle}
            </h1>

            {/* Description */}
            {previewDescription && (
              <p className="text-base text-muted-foreground leading-relaxed">
                {previewDescription}
              </p>
            )}

            {/* Blocks read-only rendering */}
            <div className="space-y-4 pt-4 border-t border-border/40">
              {previewBlocks.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground/50 italic text-sm">
                  Phiên bản này không có khối nội dung nào.
                </div>
              ) : (
                previewBlocks.map((block: BlockDto, idx: number) => {
                  const type = normalizeBlockType(block.blockType);
                  return (
                  <div key={block.id || idx} className="py-1">
                    {type === 'RICH_TEXT' ? (
                      <RichTextDocumentRenderer doc={block.body} />
                    ) : type === 'MARKDOWN' ? (
                      <div className="p-4 rounded-xl bg-card border border-border/70 text-sm font-mono whitespace-pre-wrap text-foreground">
                        {block.body}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-card border border-border/70 flex items-center gap-3">
                        {type === 'IMAGE' && <ImageIcon className="h-5 w-5 text-emerald-500" />}
                        {type === 'VIDEO' && <Video className="h-5 w-5 text-rose-500" />}
                        {type === 'AUDIO' && <Music className="h-5 w-5 text-amber-500" />}
                        {type === 'FILE' && <Paperclip className="h-5 w-5 text-cyan-500" />}
                        {type === 'FLASHCARD' && <Sparkles className="h-5 w-5 text-[#ff7a1a]" />}
                        {type === 'QUESTION' && <HelpCircle className="h-5 w-5 text-purple-500" />}
                        {type === 'ASSIGNMENT' && <FileUp className="h-5 w-5 text-orange-500" />}
                        {type === 'QUIZ' && <ListChecks className="h-5 w-5 text-pink-500" />}
                        <div>
                          <div className="text-xs font-semibold text-foreground">
                            {block.title || `Khối ${type}`}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Nội dung khối bài học chuyên biệt
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar: Version History */}
        {isSidebarOpen && (
          <aside className="w-80 sm:w-96 border-l border-border/80 bg-card/60 backdrop-blur-md flex flex-col shrink-0 overflow-hidden shadow-lg animate-in slide-in-from-right-4 duration-200">
            {/* Sidebar header */}
            <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between">
              <h2 className="text-lg font-serif font-bold text-foreground">
                Lịch sử phiên bản
              </h2>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                title="Thu gọn bảng lịch sử"
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ChevronsLeftRight className="h-4 w-4" />
              </button>
            </div>

            {/* Version groups */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {isLoadingVersions || isLoadingChapter ? (
                <div className="space-y-3 p-2">
                  <div className="h-4 bg-muted/60 rounded animate-pulse w-32" />
                  <div className="h-14 bg-muted/40 rounded-xl animate-pulse" />
                  <div className="h-14 bg-muted/40 rounded-xl animate-pulse" />
                </div>
              ) : groupedVersions.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Chưa có lịch sử phiên bản nào.
                </div>
              ) : (
                groupedVersions.map((group) => (
                  <div key={group.label} className="space-y-2">
                    {/* Date group label */}
                    <div className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider px-2">
                      {group.label}
                    </div>

                    {/* Version items */}
                    <div className="space-y-1">
                      {group.items.map((ver) => {
                        const isSelected = ver.versionNo === activeVersionNo;
                        return (
                          <div
                            key={ver.versionNo}
                            onClick={() => setSelectedVersionNo(ver.versionNo || null)}
                            className={`group relative flex flex-col gap-1.5 p-3 rounded-xl cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-muted/40 border-l-2 border-[#ff7a1a] shadow-2xs'
                                : 'hover:bg-muted/20 border-l-2 border-transparent'
                            }`}
                          >
                            {/* Top row: Time + 'Đang xem' badge */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                {isSelected && <Eye className="h-3.5 w-3.5 text-[#ff7a1a]" />}
                                <span>{formatTime(ver.createdAt)}</span>
                              </div>
                              {isSelected && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ff7a1a]/15 text-[#ff7a1a]">
                                  Đang xem
                                </span>
                              )}
                            </div>

                            {/* Bottom row: Author + 'Bản nháp' tag */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-[#ff7a1a]/20 text-[#ff7a1a] font-bold text-[10px] flex items-center justify-center shrink-0">
                                  QT
                                </div>
                                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                                  {ver.authorName || 'Quang Trần'}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground/80 px-2 py-0.5 rounded-md bg-muted/60">
                                {ver.publishedAt ? 'Đã xuất bản' : 'Bản nháp'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Toggle open sidebar button when collapsed */}
        {!isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="fixed right-4 top-18 z-30 p-2.5 rounded-xl border border-border/80 bg-card/90 shadow-xl text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <Clock className="h-4 w-4 text-[#ff7a1a]" />
            <span>Mở lịch sử</span>
          </button>
        )}
      </div>

      {/* 3. CONFIRM RESTORE DIALOG */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-card border border-border text-card-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <RotateCcw className="h-5 w-5 text-[#ff7a1a]" />
              <span>Khôi phục về Phiên bản #{selectedVersion?.versionNo}?</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2 text-sm leading-relaxed">
              Hệ thống sẽ lấy toàn bộ các khối nội dung của Phiên bản #{selectedVersion?.versionNo}{' '}
              ghi đè vào bản nháp làm việc hiện tại của bạn. Mọi thay đổi chưa lưu trên bản hiện tại sẽ bị thay thế.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isRestoring}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleConfirmRestore}
              disabled={isRestoring}
              className="bg-[#ff7a1a] hover:bg-[#ff7a1a]/90 text-white font-medium"
            >
              {isRestoring ? 'Đang khôi phục...' : 'Xác nhận khôi phục'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
