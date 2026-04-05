import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import MarksResultsPage from './MarksResultsPage.jsx';

/** Teacher-facing student results; admins use /marks instead. */
export default function TeacherResultsPage() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/marks" replace />;
  if (user?.role !== 'teacher') return <Navigate to="/" replace />;
  return <MarksResultsPage teacherAccess />;
}
