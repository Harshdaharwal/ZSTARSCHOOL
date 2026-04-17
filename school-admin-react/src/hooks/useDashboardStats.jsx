import { useMemo } from 'react';
import { IconStudents, IconTeachers, IconCheck, IconWarning, IconMoney, IconExams } from '../components/common/Icons.jsx';

const S = { size: 24, strokeWidth: 1.8 };

/** Memoized stat tiles for the overview grid — stable references when `data` unchanged */
export function useDashboardStatItems(data) {
  return useMemo(() => {
    if (!data) return [];
    const mc = Number(data.monthCollection) || 0;
    return [
      { variant: 's1', icon: <IconStudents {...S} />, label: 'Active Students', value: data.activeStudents, sub: 'Enrolled' },
      { variant: 's2', icon: <IconTeachers {...S} />, label: 'Teachers', value: data.activeTeachers, sub: 'Staff' },
      { variant: 's3', icon: <IconCheck {...S} />, label: 'Present Today', value: data.presentToday, sub: 'Attendance' },
      { variant: 's4', icon: <IconWarning {...S} />, label: 'Pending Fees', value: data.pendingFees, sub: 'Records' },
      { variant: 's5', icon: <IconMoney {...S} />, label: 'Month Collection', value: '₹' + mc.toLocaleString('en-IN'), sub: 'Paid (mock)' },
      { variant: 's6', icon: <IconExams {...S} />, label: 'Total Exams', value: data.totalExams, sub: 'Scheduled' },
    ];
  }, [data]);
}
