import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const deleteUserDoc = async ({ userId }) => {
  if (!userId) throw new Error('User ID is required');
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);
};
