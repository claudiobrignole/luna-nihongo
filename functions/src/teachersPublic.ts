import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

export interface PublicTeacherRecord {
  id: string;
  username: string;
  teacherDisplayName: string;
  role: 'teacher';
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
    const snap = await db.collection('users').where('role', '==', 'teacher').get();
    const teachers: PublicTeacherRecord[] = snap.docs.map((doc) => {
      const data = doc.data();
      const username = String(data.username ?? 'Teacher');
      const nick = String(data.teacherDisplayName ?? '').trim();
      return {
        id: doc.id,
        username,
        teacherDisplayName: nick || username,
        role: 'teacher' as const,
      };
    });

    teachers.sort((a, b) =>
      a.teacherDisplayName.localeCompare(b.teacherDisplayName, 'it', { sensitivity: 'base' }),
    );

    return { teachers };
  },
);
