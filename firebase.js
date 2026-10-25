// ZERO X — Firebase layer (Auth + Firestore). ES module, loaded by app.js via import().
// Static site (GitHub Pages): no server. Security is enforced by firestore.rules.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import * as A from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import * as F from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: "AIzaSyBltmHOkTLghwv4LjiulZQHQ80Cij2EGgI",
  authDomain: "zero-x-academy.firebaseapp.com",
  projectId: "zero-x-academy",
  storageBucket: "zero-x-academy.firebasestorage.app",
  messagingSenderId: "324877473032",
  appId: "1:324877473032:web:bb0ef50ad1390b310e08bd"
};

const app = initializeApp(firebaseConfig);
const auth = A.getAuth(app);
const db = F.getFirestore(app);
try { auth.languageCode = 'ar'; } catch (e) {}

// Firestore keeps retrying silently when the database is missing or offline; give the UI an answer.
const T = (p, ms = 15000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'zx/timeout' })), ms))]);
const tsToMs = t => (t && typeof t.toMillis === 'function') ? t.toMillis() : (typeof t === 'number' ? t : 0);
const norm = d => { const x = { id: d.id, ...d.data() }; x.createdAt = tsToMs(x.createdAt); if (x.reviewedAt) x.reviewedAt = tsToMs(x.reviewedAt); return x; };

// Resolves once with the first auth state, then calls cb on every change.
export function onAuth(cb) { return A.onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, email: u.email } : null)); }
export async function authReady() { await auth.authStateReady(); return currentUser(); }
export function currentUser() { const u = auth.currentUser; return u ? { uid: u.uid, email: u.email } : null; }

export async function getProfile(uid) {
  const s = await T(F.getDoc(F.doc(db, 'users', uid)));
  return s.exists() ? norm(s) : null;
}

export async function saveProfile(uid, p) {
  // Fields allowed by firestore.rules on create. role is always 'student' here.
  await T(F.setDoc(F.doc(db, 'users', uid), {
    name: p.name, phone: p.phone, city: p.city, email: p.email,
    createdAt: F.serverTimestamp(), role: 'student'
  }));
}

export async function register({ name, phone, city, email, password }) {
  const cred = await A.createUserWithEmailAndPassword(auth, email, password);
  try { await A.updateProfile(cred.user, { displayName: name }); } catch (e) {}
  await saveProfile(cred.user.uid, { name, phone, city, email: cred.user.email || email });
  return { uid: cred.user.uid, email: cred.user.email };
}

export async function login(email, password) { const c = await A.signInWithEmailAndPassword(auth, email, password); return { uid: c.user.uid, email: c.user.email }; }
export async function logout() { await A.signOut(auth); }
export async function resetPassword(email) { await A.sendPasswordResetEmail(auth, email); }

export async function myPayments(uid) {
  const q = F.query(F.collection(db, 'payments'), F.where('uid', '==', uid));
  const s = await T(F.getDocs(q));
  return s.docs.map(norm).sort((a, b) => b.createdAt - a.createdAt);
}

export async function createPayment(p) {
  const ref = await T(F.addDoc(F.collection(db, 'payments'), {
    uid: p.uid, name: p.name, phone: p.phone, city: p.city || '', email: p.email || '',
    course: p.course, courseTitle: p.courseTitle, price: p.price,
    method: p.method, note: p.note || '',
    status: 'pending', txId: '', createdAt: F.serverTimestamp()
  }));
  return ref.id;
}

// ---- admin (allowed only when users/{uid}.role == 'admin', enforced by rules) ----
export async function allUsers() { const s = await T(F.getDocs(F.collection(db, 'users'))); return s.docs.map(norm); }
export async function allPayments() { const s = await T(F.getDocs(F.collection(db, 'payments'))); return s.docs.map(norm).sort((a, b) => b.createdAt - a.createdAt); }
export async function updatePayment(id, patch) {
  const data = { ...patch };
  if ('status' in patch) { data.reviewedAt = F.serverTimestamp(); data.reviewedBy = auth.currentUser ? auth.currentUser.email : ''; }
  await T(F.updateDoc(F.doc(db, 'payments', id), data));
}
export async function deleteAccountSelf() { if (auth.currentUser) await A.deleteUser(auth.currentUser); }
