import { useParams } from 'react-router-dom';
import { GlobalResourceManagementPage } from './GlobalResourceManagementPage';
import { CourseResourceDetailPage } from './CourseResourceDetailPage';

export function ResourceManagementPage() {
  const { courseId } = useParams<{ courseId?: string }>();

  if (courseId) {
    return <CourseResourceDetailPage courseId={courseId} />;
  }

  return <GlobalResourceManagementPage />;
}
