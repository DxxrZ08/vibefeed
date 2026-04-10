import { subscribeDashboardStats } from '../services/firebase/dashboardService';
import { isAdminRole } from '../utils/roleUtils';

export const watchDashboardStats = ({ userData }, onNext, onError) => {
  if (!isAdminRole(userData?.role)) {
    throw new Error('Only admins can access dashboard stats.');
  }

  return subscribeDashboardStats(onNext, onError);
};
