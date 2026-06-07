import type {
  WritingGradeRequest,
  WritingGradeResponse,
  WritingGradeResult,
} from '../types/writingGrading';

const GRADE_TIMEOUT_MS = 35_000;

export class WritingGradeError extends Error {
  kind: 'network' | 'server' | 'parse';

  constructor(message: string, kind: 'network' | 'server' | 'parse' = 'server') {
    super(message);
    this.name = 'WritingGradeError';
    this.kind = kind;
  }
}

export async function gradeWritingSubmission(
  payload: WritingGradeRequest,
): Promise<WritingGradeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GRADE_TIMEOUT_MS);

  try {
    const response = await fetch('/api/writing-grade.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let data: WritingGradeResponse = {};
    try {
      data = (await response.json()) as WritingGradeResponse;
    } catch {
      throw new WritingGradeError('Invalid server response.', 'parse');
    }

    if (!response.ok || data.error) {
      throw new WritingGradeError(data.error ?? `Grading failed (${response.status}).`, 'server');
    }

    if (!data.grade) {
      throw new WritingGradeError('Missing grading result.', 'parse');
    }

    return data.grade;
  } catch (err) {
    if (err instanceof WritingGradeError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new WritingGradeError('Grading timed out.', 'network');
    }
    if (err instanceof TypeError) {
      throw new WritingGradeError('Network error while grading.', 'network');
    }
    throw new WritingGradeError('Network error while grading.', 'network');
  } finally {
    clearTimeout(timer);
  }
}
