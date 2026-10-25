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
// V18 referral code (marketer link ?ref=CODE). Same pattern as firestore.rules.
const REF_OK = v => typeof v === 'string' && /^[a-z0-9-]{2,20}$/.test(v);
const withRef = (data, ref) => (REF_OK(ref) ? { ...data, ref } : data);
// If the published rules don't know `ref` yet, save the record without it instead of losing the customer.
async function refSafe(write, data) {
  try { return await write(data); }
  catch (e) { if (e && e.code === 'permission-denied' && 'ref' in data) { const { ref, ...rest } = data; return await write(rest); } throw e; }
}
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
  // ref (optional) = the marketer code from the visitor's first referral link; rules make it immutable for students.
  const r = F.doc(db, 'users', uid);
  await refSafe(d => T(F.setDoc(r, d)), withRef({
    name: p.name, phone: p.phone, city: p.city, email: p.email,
    createdAt: F.serverTimestamp(), role: 'student'
  }, p.ref));
}

export async function register({ name, phone, city, email, password, ref }) {
  const cred = await A.createUserWithEmailAndPassword(auth, email, password);
  try { await A.updateProfile(cred.user, { displayName: name }); } catch (e) {}
  await saveProfile(cred.user.uid, { name, phone, city, email: cred.user.email || email, ref });
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
  const col = F.collection(db, 'payments');
  const ref = await refSafe(d => T(F.addDoc(col, d)), withRef({
    uid: p.uid, name: p.name, phone: p.phone, city: p.city || '', email: p.email || '',
    course: p.course, courseTitle: p.courseTitle, price: p.price,
    method: p.method, note: p.note || '',
    ...(p.course === 'consultation' ? { consultType: String(p.consultType || '').slice(0, 80), contactMethod: String(p.contactMethod || '').slice(0, 40) } : {}),
    status: 'pending', txId: '', createdAt: F.serverTimestamp()
  }, p.ref));
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
// ---- leads: the academies inquiry form. Anyone (even not signed in) may create; only admins read/update.
// (Paid consultations are not leads: they are payments with course 'consultation'.) ----
const cut = (v, n) => String(v ?? '').trim().slice(0, n);
export async function createLead(l) {
  const col = F.collection(db, 'leads');
  const ref = await refSafe(d => T(F.addDoc(col, d)), withRef({
    type: 'inquiry',
    name: cut(l.name, 80), contact: cut(l.contact, 120), contactMethod: cut(l.contactMethod, 40),
    city: cut(l.city, 60), interest: cut(l.interest, 80), message: cut(l.message, 500),
    status: 'new', createdAt: F.serverTimestamp()
  }, l.ref));
  return ref.id;
}
export async function allLeads() { const s = await T(F.getDocs(F.collection(db, 'leads'))); return s.docs.map(norm).sort((a, b) => b.createdAt - a.createdAt); }
export async function updateLead(id, patch) { await T(F.updateDoc(F.doc(db, 'leads', id), patch)); }
export async function deleteAccountSelf() { if (auth.currentUser) await A.deleteUser(auth.currentUser); }
// ---- V18 marketers (admin only, enforced by rules). Doc id = the referral code. ----
export async function allMarketers() { const s = await T(F.getDocs(F.collection(db, 'marketers'))); return s.docs.map(norm); }
export async function addMarketer(code, m) {
  if (!REF_OK(code)) throw Object.assign(new Error('bad code'), { code: 'zx/bad-ref' });
  const r = F.doc(db, 'marketers', code);
  if ((await T(F.getDoc(r))).exists()) throw Object.assign(new Error('exists'), { code: 'zx/ref-exists' });
  await T(F.setDoc(r, { name: cut(m.name, 60), phone: cut(m.phone, 25), commission: +m.commission || 0, active: true, createdAt: F.serverTimestamp() }));
}
export async function updateMarketer(code, patch) { await T(F.updateDoc(F.doc(db, 'marketers', code), patch)); }
// Admin fixes a student's attribution (ref). Students can never change it themselves (rules).
export async function updateUser(uid, patch) { await T(F.updateDoc(F.doc(db, 'users', uid), patch)); }
