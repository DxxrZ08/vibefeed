import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC-I06FDKE5kUYpwmbRVQvxCTVUE2YRGok",
  authDomain: "vibefeed01.firebaseapp.com",
  projectId: "vibefeed01"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const KNOWN_EMAILS = [
  'formegemini83@gmail.com',
  'luciferusernotfound@gmail.com',
  'zaladaxrajsinh07@gmail.com'
];

async function run() {
  const querySnapshot = await getDocs(collection(db, "users"));
  const users = [];
  querySnapshot.forEach((doc) => {
    users.push({ id: doc.id, email: doc.data().email });
  });
  
  console.log("All Firestore users:");
  console.log(users);
  
  const orphaned = users.filter(u => !KNOWN_EMAILS.includes(u.email));
  console.log("Orphaned users (not in Auth list):");
  console.log(orphaned);
  
  process.exit(0);
}
run().catch(console.error);
