import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

export interface PublicTeacherRecord {
  id: string;
  username: string;
  teacherDisplayName: string;
  role: 'teacher' | 'super_admin';
}

export const listPublicTeachers = onCall(
  {
    region: 'europe-west1',
    invoker: 'public',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const db = getFirestore();
    const teachers: PublicTeacherRecord[] = [];

    for (const role of ['teacher', 'super_admin'] as const) {
      const snap = await db.collection('users').where('role', '==', role).get();
      for (const doc of snap.docs) {
        const data = doc.data();
        const username = String(data.username ?? 'Teacher');
        const nick = String(data.teacherDisplayName ?? '').trim();
        teachers.push({
          id: doc.id,
          username,
          teacherDisplayName: nick || username,
          role,
        });
      }
    }

    teachers.sort((a, b) =>
      a.teacherDisplayName.localeCompare(b.teacherDisplayName, 'it', { sensitivity: 'base' }),
    );

    return { teachers };
  },
);
