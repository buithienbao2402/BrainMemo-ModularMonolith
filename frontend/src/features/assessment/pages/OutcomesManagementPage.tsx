import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Home,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Button, Skeleton, useToast } from '@/shared/ui';
import { useCourseQuery } from '@/features/course/api/courseApi';
import { CourseManageSubNav } from '@/features/course/components/CourseManageSubNav';
import {
  useClos,
  useCreateClo,
  useUpdateClo,
  useDeleteClo,
  useAssessableBlocks,
  type CloDto,
} from '../api/assessmentApi';
import { OutcomesSubNav } from '../components/OutcomesSubNav';
import { BloomBadge } from '../components/BloomBadge';
import { CloFormModal, type CloFormData } from '../components/CloFormModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { DEFAULT_CLOS, type MockCloItem } from '../components/outcomesMockData';

type BloomScaleType = 'BLOOM_6' | 'SCALE_1_5' | 'CUSTOM';

export function OutcomesManagementPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const { pushToast } = useToast();

  const { data: course } = useCourseQuery(courseId);
  const { data: apiClos = [], isLoading: isClosLoading } = useClos(courseId);
  const { data: assessableBlocks = [] } = useAssessableBlocks(courseId);

  const createCloMutation = useCreateClo(courseId);
  const updateCloMutation = useUpdateClo(courseId);
  const deleteCloMutation = useDeleteClo(courseId);

  // Selected Bloom scale type
  const [bloomScaleType, setBloomScaleType] = useState<BloomScaleType>('BLOOM_6');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClo, setEditingClo] = useState<CloFormData | null>(null);
  const [cloToDelete, setCloToDelete] = useState<{ id: string; code: string } | null>(null);

  // Local overrides for added/edited weights and methods if not in standard CloDto
  const [extraCloData, setExtraCloData] = useState<Record<string, { weight?: number; assessmentMethod?: string }>>({});

  const courseTitle = course?.name || 'Khóa học';

  // Merge API CLOs with default demonstration items if list is empty or minimal
  const displayClos: MockCloItem[] =
    apiClos.length > 0
      ? apiClos.map((c: CloDto, index: number) => {
          const fallback = DEFAULT_CLOS[index % DEFAULT_CLOS.length] ?? DEFAULT_CLOS[0]!;
          const extra = extraCloData[c.id] || {};
          return {
            id: c.id,
            code: c.code || fallback.code,
            description: c.description || fallback.description,
            bloomLevelCode: c.bloomLevelCode || fallback.bloomLevelCode,
            weight: extra.weight ?? fallback.weight,
            assessmentMethod: extra.assessmentMethod ?? fallback.assessmentMethod,
          };
        })
      : DEFAULT_CLOS;

  const handleOpenCreate = () => {
    setEditingClo(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (item: MockCloItem) => {
    setEditingClo({
      id: item.id,
      code: item.code,
      description: item.description,
      bloomLevelCode: item.bloomLevelCode,
      weight: item.weight,
      assessmentMethod: item.assessmentMethod,
    });
    setIsFormModalOpen(true);
  };

  const handleSaveClo = async (formData: CloFormData) => {
    try {
      if (formData.id) {
        // Update existing CLO
        await updateCloMutation.mutateAsync({
          id: formData.id,
          payload: {
            code: formData.code,
            description: formData.description,
            bloomLevelCode: formData.bloomLevelCode,
            linkedPloIds: [],
          },
        });
        setExtraCloData((prev) => ({
          ...prev,
          [formData.id!]: {
            weight: formData.weight,
            assessmentMethod: formData.assessmentMethod,
          },
        }));
        pushToast({
          title: 'Cập nhật thành công',
          description: `Đã cập nhật thông tin chuẩn đầu ra ${formData.code}.`,
          tone: 'success',
        });
      } else {
        // Create new CLO
        const created = await createCloMutation.mutateAsync({
          code: formData.code,
          description: formData.description,
          bloomLevelCode: formData.bloomLevelCode,
          linkedPloIds: [],
        });
        if (created?.id) {
          setExtraCloData((prev) => ({
            ...prev,
            [created.id]: {
              weight: formData.weight,
              assessmentMethod: formData.assessmentMethod,
            },
          }));
        }
        pushToast({
          title: 'Tạo CLO thành công',
          description: `Đã thêm mới chuẩn đầu ra ${formData.code}.`,
          tone: 'success',
        });
      }
    } catch {
      pushToast({
        title: 'Thao tác thất bại',
        description: 'Không thể lưu chuẩn đầu ra lúc này.',
        tone: 'error',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!cloToDelete) return;
    try {
      await deleteCloMutation.mutateAsync(cloToDelete.id);
      pushToast({
        title: 'Đã xóa CLO',
        description: `Đã xóa chuẩn đầu ra ${cloToDelete.code} khỏi khóa học.`,
        tone: 'default',
      });
      setCloToDelete(null);
    } catch {
      pushToast({
        title: 'Không thể xóa CLO',
        description: 'Chuẩn đầu ra này đang được gán trong ma trận bài đánh giá.',
        tone: 'error',
      });
    }
  };

  if (isClosLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-10 w-full rounded-full" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 text-foreground">
      {/* 1. TOP BREADCRUMB */}
      <nav aria-label="Đường dẫn điều hướng" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/manage/courses" className="hover:text-foreground transition-colors flex items-center gap-1.5">
          <Home className="h-3.5 w-3.5" />
          <span>Trang chủ</span>
        </Link>
        <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
        <Link
          to={`/courses/${courseId}/manage/overview`}
          className="hover:text-foreground transition-colors truncate max-w-[200px] sm:max-w-xs"
        >
          Khóa học {courseTitle}
        </Link>
        <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Chuẩn đầu ra</span>
      </nav>

      {/* 2. COURSE MANAGEMENT PRIMARY HORIZONTAL TABS */}
      <CourseManageSubNav courseId={courseId} activeTab="outcomes" />

      {/* 3. INNER CHUẨN ĐẦU RA SUB-TABS (CLO, Ma trận, Quy tắc) */}
      <OutcomesSubNav
        courseId={courseId}
        activeTab="clos"
        matrixCount={assessableBlocks.length || 6}
      />

      {/* 4. SECTION 1: THANG MỨC BLOOM ÁP DỤNG */}
      <section
        aria-labelledby="bloom-scale-heading"
        className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5"
      >
        <div className="flex items-center gap-2.5">
          <span className="h-4 w-1.5 rounded-full bg-[#ff7a1a]" aria-hidden="true" />
          <h2 id="bloom-scale-heading" className="text-sm sm:text-base font-bold uppercase tracking-wider text-foreground">
            Thang mức Bloom áp dụng
          </h2>
        </div>

        {/* 3 Option Radio Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Option 1: Bloom 6 mức chuẩn */}
          <button
            type="button"
            onClick={() => setBloomScaleType('BLOOM_6')}
            className={`flex items-start justify-between p-4 rounded-xl border text-left transition-all ${
              bloomScaleType === 'BLOOM_6'
                ? 'border-[#ff7a1a] bg-[#ff7a1a]/5 ring-1 ring-[#ff7a1a]/30'
                : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40'
            }`}
          >
            <div className="space-y-1 pr-2">
              <span className={`text-sm font-bold block ${bloomScaleType === 'BLOOM_6' ? 'text-[#ff7a1a]' : 'text-foreground'}`}>
                Bloom 6 mức chuẩn
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nhớ, Hiểu, Vận dụng, Phân tích, Đánh giá, Sáng tạo.
              </p>
            </div>
            {bloomScaleType === 'BLOOM_6' ? (
              <CheckCircle2 className="h-5 w-5 text-[#ff7a1a] shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
            )}
          </button>

          {/* Option 2: Thang số 1 - 5 */}
          <button
            type="button"
            onClick={() => setBloomScaleType('SCALE_1_5')}
            className={`flex items-start justify-between p-4 rounded-xl border text-left transition-all ${
              bloomScaleType === 'SCALE_1_5'
                ? 'border-[#ff7a1a] bg-[#ff7a1a]/5 ring-1 ring-[#ff7a1a]/30'
                : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40'
            }`}
          >
            <div className="space-y-1 pr-2">
              <span className={`text-sm font-bold block ${bloomScaleType === 'SCALE_1_5' ? 'text-[#ff7a1a]' : 'text-foreground'}`}>
                Thang số 1 - 5
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Beginner → Foundation → Competent → Advanced → Mastery.
              </p>
            </div>
            {bloomScaleType === 'SCALE_1_5' ? (
              <CheckCircle2 className="h-5 w-5 text-[#ff7a1a] shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
            )}
          </button>

          {/* Option 3: Tự đặt thang đo */}
          <button
            type="button"
            onClick={() => setBloomScaleType('CUSTOM')}
            className={`flex items-start justify-between p-4 rounded-xl border text-left transition-all ${
              bloomScaleType === 'CUSTOM'
                ? 'border-[#ff7a1a] bg-[#ff7a1a]/5 ring-1 ring-[#ff7a1a]/30'
                : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40'
            }`}
          >
            <div className="space-y-1 pr-2">
              <span className={`text-sm font-bold block ${bloomScaleType === 'CUSTOM' ? 'text-[#ff7a1a]' : 'text-foreground'}`}>
                Tự đặt thang đo
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tùy biến tiêu chí nhận thức riêng theo đề cương môn học viện.
              </p>
            </div>
            {bloomScaleType === 'CUSTOM' ? (
              <CheckCircle2 className="h-5 w-5 text-[#ff7a1a] shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
            )}
          </button>
        </div>

        {/* 6 Bloom Levels Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          {[
            { code: 'C1', vi: 'Nhớ', en: 'Remember', color: 'text-sky-500 dark:text-sky-400' },
            { code: 'C2', vi: 'Hiểu', en: 'Understand', color: 'text-teal-600 dark:text-teal-400' },
            { code: 'C3', vi: 'Vận dụng', en: 'Apply', color: 'text-emerald-600 dark:text-emerald-400' },
            { code: 'C4', vi: 'Phân tích', en: 'Analyze', color: 'text-amber-600 dark:text-amber-400' },
            { code: 'C5', vi: 'Đánh giá', en: 'Evaluate', color: 'text-violet-600 dark:text-violet-400' },
            { code: 'C6', vi: 'Sáng tạo', en: 'Create', color: 'text-purple-600 dark:text-purple-400' },
          ].map((item) => (
            <div
              key={item.code}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-border/80 bg-card/60 hover:bg-muted/20 transition-colors"
            >
              <span className={`text-xs font-bold ${item.color}`}>
                {item.code} - {item.vi}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                {item.en}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. SECTION 2: DANH SÁCH CLO CỦA KHÓA HỌC */}
      <section
        aria-labelledby="clo-list-heading"
        className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden"
      >
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-1.5 rounded-full bg-[#ff7a1a]" aria-hidden="true" />
            <h2 id="clo-list-heading" className="text-sm sm:text-base font-bold uppercase tracking-wider text-foreground">
              Danh sách CLO của khóa học
            </h2>
          </div>

          <Button
            type="button"
            onClick={handleOpenCreate}
            aria-label="Thêm CLO"
            className="bg-[#ff7a1a] hover:bg-[#e86f17] text-white font-semibold flex items-center gap-2 px-4 py-2 rounded-xl shadow-xs shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>+ Thêm CLO</span>
          </Button>
        </div>

        {/* CLO Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/70 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/20">
                <th scope="col" className="py-3 px-4 sm:px-6 w-20">Mã</th>
                <th scope="col" className="py-3 px-4 sm:px-6">Mô tả chuẩn đầu ra</th>
                <th scope="col" className="py-3 px-4 sm:px-6 w-36">Mức Bloom</th>
                <th scope="col" className="py-3 px-4 sm:px-6 w-36">Tỷ trọng</th>
                <th scope="col" className="py-3 px-4 sm:px-6 w-28 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {displayClos.map((clo) => {
                return (
                  <tr
                    key={clo.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* Mã */}
                    <td className="py-4 px-4 sm:px-6 font-bold text-[#ff7a1a] whitespace-nowrap">
                      {clo.code}
                    </td>

                    {/* Mô tả */}
                    <td className="py-4 px-4 sm:px-6 space-y-1">
                      <p className="font-medium text-foreground leading-relaxed">
                        {clo.description}
                      </p>
                      {clo.assessmentMethod && (
                        <p className="text-xs text-muted-foreground">
                          Đánh giá qua: <span className="text-foreground/80">{clo.assessmentMethod}</span>
                        </p>
                      )}
                    </td>

                    {/* Mức Bloom */}
                    <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                      <BloomBadge levelCode={clo.bloomLevelCode} />
                    </td>

                    {/* Tỷ trọng */}
                    <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-foreground block">
                          {clo.weight}%
                        </span>
                        <div className="w-24 sm:w-28 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="bg-[#ff7a1a] h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, clo.weight)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Thao tác */}
                    <td className="py-4 px-4 sm:px-6 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            pushToast({
                              title: `Chi tiết ${clo.code}`,
                              description: `${clo.description} • Đánh giá qua: ${clo.assessmentMethod || 'Quizzes / Lab'}`,
                              tone: 'default',
                            });
                          }}
                          title="Xem chi tiết CLO"
                          aria-label={`Xem chi tiết ${clo.code}`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(clo)}
                          title="Chỉnh sửa CLO"
                          aria-label={`Chỉnh sửa ${clo.code}`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCloToDelete({ id: clo.id, code: clo.code })}
                          title="Xóa CLO"
                          aria-label={`Xóa ${clo.code}`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* CLO Create / Edit Modal Dialog */}
      <CloFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveClo}
        initialData={editingClo}
        defaultCode={`CL0${displayClos.length + 1}`}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(cloToDelete)}
        onClose={() => setCloToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title={`Xóa chuẩn đầu ra ${cloToDelete?.code}`}
        description={`Bạn có chắc chắn muốn xóa ${cloToDelete?.code}? Nếu chuẩn này đã liên kết với ma trận bài đánh giá, thao tác này có thể ảnh hưởng đến bảng điểm.`}
        confirmLabel="Xác nhận xóa"
      />
    </div>
  );
}
