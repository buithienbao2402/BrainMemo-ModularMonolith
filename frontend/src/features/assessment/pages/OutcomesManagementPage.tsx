import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Layers,
  BookOpen,
  AlertCircle,
  Grid,
} from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
} from '@/shared/ui';
import { useToast } from '@/shared/ui/toastContext';
import {
  useClos,
  useCreateClo,
  useUpdateClo,
  useDeleteClo,
  usePlos,
  useCreatePlo,
  useUpdatePlo,
  useDeletePlo,
  type CloDto,
  type PloDto,
} from '../api/assessmentApi';

const BLOOM_LEVELS = [
  { code: 'REMEMBER', label: '1. Nhớ (Remember)' },
  { code: 'UNDERSTAND', label: '2. Hiểu (Understand)' },
  { code: 'APPLY', label: '3. Vận dụng (Apply)' },
  { code: 'ANALYZE', label: '4. Phân tích (Analyze)' },
  { code: 'EVALUATE', label: '5. Đánh giá (Evaluate)' },
  { code: 'CREATE', label: '6. Sáng tạo (Create)' },
];

export function OutcomesManagementPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const { pushToast } = useToast();

  const { data: clos = [], isLoading: isClosLoading } = useClos(courseId);
  const { data: plos = [], isLoading: isPlosLoading } = usePlos(courseId);

  const createCloMutation = useCreateClo(courseId);
  const updateCloMutation = useUpdateClo(courseId);
  const deleteCloMutation = useDeleteClo(courseId);

  const createPloMutation = useCreatePlo(courseId);
  const updatePloMutation = useUpdatePlo(courseId);
  const deletePloMutation = useDeletePlo(courseId);

  // CLO Modal state
  const [isCloModalOpen, setIsCloModalOpen] = useState(false);
  const [editingClo, setEditingClo] = useState<CloDto | null>(null);
  const [cloCode, setCloCode] = useState('');
  const [cloDescription, setCloDescription] = useState('');
  const [cloBloomLevel, setCloBloomLevel] = useState('APPLY');
  const [cloSelectedPlos, setCloSelectedPlos] = useState<string[]>([]);

  // PLO Modal state
  const [isPloModalOpen, setIsPloModalOpen] = useState(false);
  const [editingPlo, setEditingPlo] = useState<PloDto | null>(null);
  const [ploCode, setPloCode] = useState('');
  const [ploDescription, setPloDescription] = useState('');

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<{ type: 'CLO' | 'PLO'; id: string; code: string } | null>(null);

  const openCreateCloModal = () => {
    setEditingClo(null);
    setCloCode(`CLO${clos.length + 1}`);
    setCloDescription('');
    setCloBloomLevel('APPLY');
    setCloSelectedPlos([]);
    setIsCloModalOpen(true);
  };

  const openEditCloModal = (clo: CloDto) => {
    setEditingClo(clo);
    setCloCode(clo.code);
    setCloDescription(clo.description);
    setCloBloomLevel(clo.bloomLevelCode || 'APPLY');
    setCloSelectedPlos(clo.linkedPloIds || []);
    setIsCloModalOpen(true);
  };

  const handleSaveClo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloCode.trim() || !cloDescription.trim()) {
      pushToast({ title: 'Lỗi', description: 'Vui lòng điền mã và mô tả CLO.', tone: 'error' });
      return;
    }

    try {
      if (editingClo) {
        await updateCloMutation.mutateAsync({
          id: editingClo.id,
          payload: {
            code: cloCode.trim(),
            description: cloDescription.trim(),
            bloomLevelCode: cloBloomLevel,
            linkedPloIds: cloSelectedPlos,
          },
        });
        pushToast({ title: 'Thành công', description: `Đã cập nhật chuẩn ${cloCode}.`, tone: 'success' });
      } else {
        await createCloMutation.mutateAsync({
          code: cloCode.trim(),
          description: cloDescription.trim(),
          bloomLevelCode: cloBloomLevel,
          linkedPloIds: cloSelectedPlos,
        });
        pushToast({ title: 'Thành công', description: `Đã tạo chuẩn ${cloCode}.`, tone: 'success' });
      }
      setIsCloModalOpen(false);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu CLO.';
      pushToast({ title: 'Lỗi lưu CLO', description: msg, tone: 'error' });
    }
  };

  const openCreatePloModal = () => {
    setEditingPlo(null);
    setPloCode(`PLO${plos.length + 1}`);
    setPloDescription('');
    setIsPloModalOpen(true);
  };

  const openEditPloModal = (plo: PloDto) => {
    setEditingPlo(plo);
    setPloCode(plo.code);
    setPloDescription(plo.description);
    setIsPloModalOpen(true);
  };

  const handleSavePlo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ploCode.trim() || !ploDescription.trim()) {
      pushToast({ title: 'Lỗi', description: 'Vui lòng điền mã và mô tả PLO.', tone: 'error' });
      return;
    }

    try {
      if (editingPlo) {
        await updatePloMutation.mutateAsync({
          id: editingPlo.id,
          payload: { code: ploCode.trim(), description: ploDescription.trim() },
        });
        pushToast({ title: 'Thành công', description: `Đã cập nhật PLO ${ploCode}.`, tone: 'success' });
      } else {
        await createPloMutation.mutateAsync({
          code: ploCode.trim(),
          description: ploDescription.trim(),
        });
        pushToast({ title: 'Thành công', description: `Đã tạo PLO ${ploCode}.`, tone: 'success' });
      }
      setIsPloModalOpen(false);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu PLO.';
      pushToast({ title: 'Lỗi lưu PLO', description: msg, tone: 'error' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'CLO') {
        await deleteCloMutation.mutateAsync(itemToDelete.id);
        pushToast({ title: 'Thành công', description: `Đã xóa ${itemToDelete.code}.`, tone: 'success' });
      } else {
        await deletePloMutation.mutateAsync(itemToDelete.id);
        pushToast({ title: 'Thành công', description: `Đã xóa ${itemToDelete.code}.`, tone: 'success' });
      }
      setItemToDelete(null);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Không thể xóa do chuẩn đầu ra này đang được sử dụng trong ma trận bài đánh giá.';
      pushToast({ title: 'Lỗi xóa', description: msg, tone: 'error' });
      setItemToDelete(null);
    }
  };

  const togglePloLink = (ploId: string) => {
    setCloSelectedPlos((prev) =>
      prev.includes(ploId) ? prev.filter((id) => id !== ploId) : [...prev, ploId]
    );
  };

  const isLoading = isClosLoading || isPlosLoading;

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link
                to={`/courses/${courseId}`}
                className="hover:text-foreground inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Khóa học
              </Link>
              <span>/</span>
              <span>Quản trị</span>
              <span>/</span>
              <span>Chuẩn đầu ra</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-primary" />
              Chuẩn đầu ra học phần (CLO & PLO)
            </h1>
            <p className="text-sm text-muted-foreground">
              Thiết lập các chuẩn đầu ra khóa học (CLO), mức độ nhận thức theo Bloom và ánh xạ tới chuẩn đầu ra chương trình (PLO).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to={`/courses/${courseId}/manage/outcomes/mapping`}>
              <Button variant="outline" className="gap-2">
                <Grid className="w-4 h-4" />
                Ma trận đánh giá
              </Button>
            </Link>
            <Button onClick={openCreateCloModal} className="gap-2">
              <Plus className="w-4 h-4" />
              Thêm CLO mới
            </Button>
          </div>
        </div>

        {/* Section 1: Course Learning Outcomes (CLO) */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Danh sách Chuẩn đầu ra học phần (CLO)
              </h2>
              <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                {clos.length} chuẩn
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : clos.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Layers className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-base font-medium">Chưa có chuẩn đầu ra CLO nào</p>
              <p className="text-xs mt-1">Bấm "Thêm CLO mới" để tạo chuẩn đầu ra cho khóa học.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="py-3 px-4 font-semibold text-muted-foreground w-28">Mã CLO</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground w-36">Cấp độ Bloom</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground">Mô tả mục tiêu</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground w-48">Ánh xạ PLO</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground text-right w-28">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clos.map((clo) => {
                    const bloomInfo = BLOOM_LEVELS.find((b) => b.code === clo.bloomLevelCode);
                    const linkedPlosList = plos.filter((p) => clo.linkedPloIds?.includes(p.id));

                    return (
                      <tr key={clo.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-primary">
                          {clo.code}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            {bloomInfo ? bloomInfo.label.split(' ')[1] : clo.bloomLevelCode || 'Chưa chọn'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-foreground leading-relaxed">
                          {clo.description}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {linkedPlosList.length > 0 ? (
                              linkedPlosList.map((p) => (
                                <span
                                  key={p.id}
                                  className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono font-semibold"
                                  title={p.description}
                                >
                                  {p.code}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Chưa ánh xạ</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditCloModal(clo)}
                              aria-label={`Sửa ${clo.code}`}
                            >
                              <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setItemToDelete({ type: 'CLO', id: clo.id, code: clo.code })}
                              aria-label={`Xóa ${clo.code}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Program Learning Outcomes (PLO) */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-foreground">
                Chuẩn đầu ra chương trình đào tạo (PLO)
              </h2>
              <span className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium px-2 py-0.5 rounded-full">
                {plos.length} chuẩn
              </span>
            </div>

            <Button variant="outline" size="sm" onClick={openCreatePloModal} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Thêm PLO
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
            </div>
          ) : plos.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-1.5 opacity-30" />
              <p className="text-sm font-medium">Chưa có chuẩn đầu ra PLO nào</p>
              <p className="text-xs mt-0.5">Bấm "Thêm PLO" nếu khóa học cần liên kết với chuẩn đầu ra chung của trường.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="py-3 px-4 font-semibold text-muted-foreground w-28">Mã PLO</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground">Mô tả chuẩn chương trình</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground text-right w-28">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {plos.map((plo) => (
                    <tr key={plo.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {plo.code}
                      </td>
                      <td className="py-3.5 px-4 text-foreground leading-relaxed">
                        {plo.description}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditPloModal(plo)}
                            aria-label={`Sửa ${plo.code}`}
                          >
                            <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setItemToDelete({ type: 'PLO', id: plo.id, code: plo.code })}
                            aria-label={`Xóa ${plo.code}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CLO Create/Edit Modal */}
      <Dialog open={isCloModalOpen} onOpenChange={setIsCloModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveClo}>
            <DialogHeader>
              <DialogTitle>
                {editingClo ? `Chỉnh sửa chuẩn đầu ra ${editingClo.code}` : 'Thêm Chuẩn đầu ra học phần (CLO)'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Mã CLO <span className="text-destructive">*</span>
                </label>
                <Input
                  value={cloCode}
                  onChange={(e) => setCloCode(e.target.value)}
                  placeholder="VD: CLO1, CLO2..."
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Cấp độ nhận thức (Thang Bloom)
                </label>
                <select
                  value={cloBloomLevel}
                  onChange={(e) => setCloBloomLevel(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {BLOOM_LEVELS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Mô tả chuẩn đầu ra <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={cloDescription}
                  onChange={(e) => setCloDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="VD: Sinh viên có khả năng phân tích và thiết kế mô hình CSDL quan hệ chuẩn 3NF..."
                  required
                />
              </div>

              {plos.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    Ánh xạ tới Chuẩn đầu ra chương trình (PLO)
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 border border-border rounded-md p-2 bg-muted/20">
                    {plos.map((plo) => (
                      <label
                        key={plo.id}
                        className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:bg-muted/50 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={cloSelectedPlos.includes(plo.id)}
                          onChange={() => togglePloLink(plo.id)}
                          className="rounded border-input text-primary focus:ring-primary"
                        />
                        <span className="font-mono font-bold text-primary">{plo.code}:</span>
                        <span className="truncate">{plo.description}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCloModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={createCloMutation.isPending || updateCloMutation.isPending}
              >
                {editingClo ? 'Lưu thay đổi' : 'Tạo CLO'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PLO Create/Edit Modal */}
      <Dialog open={isPloModalOpen} onOpenChange={setIsPloModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSavePlo}>
            <DialogHeader>
              <DialogTitle>
                {editingPlo ? `Chỉnh sửa chuẩn ${editingPlo.code}` : 'Thêm Chuẩn chương trình (PLO)'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Mã PLO <span className="text-destructive">*</span>
                </label>
                <Input
                  value={ploCode}
                  onChange={(e) => setPloCode(e.target.value)}
                  placeholder="VD: PLO1, PLO2..."
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Mô tả chuẩn chương trình <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={ploDescription}
                  onChange={(e) => setPloDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="VD: Áp dụng kiến thức toán học và khoa học cơ bản vào giải quyết bài toán kỹ thuật..."
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPloModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={createPloMutation.isPending || updatePloMutation.isPending}
              >
                {editingPlo ? 'Lưu thay đổi' : 'Tạo PLO'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(itemToDelete)} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Xác nhận xóa {itemToDelete?.type}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground py-2">
            Bạn có chắc chắn muốn xóa {itemToDelete?.type}{' '}
            <span className="font-mono font-bold text-foreground">{itemToDelete?.code}</span>?
            {itemToDelete?.type === 'CLO' &&
              ' Nếu chuẩn này đã được gán trọng số trong các bài đánh giá, thao tác sẽ bị từ chối.'}
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setItemToDelete(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteCloMutation.isPending || deletePloMutation.isPending}
            >
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
