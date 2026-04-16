import { deleteUserDoc } from '../services/firebase/userService';
import { isAdminRole } from '../utils/roleUtils';

export const deleteManagedUser = async ({ userId, userData }) => {
  if (!isAdminRole(userData?.role)) {
    throw new Error('Only admins can delete users.');
  }

  return deleteUserDoc({ userId });
};
