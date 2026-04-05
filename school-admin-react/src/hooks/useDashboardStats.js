import { useMemo } from 'react';

/** Memoized stat tiles for the overview grid — stable references when `data` unchanged */
export function useDashboardStatItems(data) {
  return useMemo(() => {
    if (!data) return [];
    const mc = Number(data.monthCollection) || 0;
    return [
      { variant: 's1', icon: '👥', label: 'Active Students', value: data.activeStudents, sub: 'Enrolled' },
      { variant: 's2', icon: '👨‍🏫', label: 'Teachers', value: data.activeTeachers, sub: 'Staff' },
      { variant: 's3', icon: '✅', label: 'Present Today', value: data.presentToday, sub: 'Attendance' },
      { variant: 's4', icon: '⚠️', label: 'Pending Fees', value: data.pendingFees, sub: 'Records' },
      { variant: 's5', icon: '💰', label: 'Month Collection', value: '₹' + mc.toLocaleString('en-IN'), sub: 'Paid (mock)' },
      { variant: 's6', icon: '📝', label: 'Total Exams', value: data.totalExams, sub: 'Scheduled' },
    ];
  }, [data]);
}
