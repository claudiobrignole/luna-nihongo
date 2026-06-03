export function normalizeSpeechText(value: string): string {
  return value.trim().toLowerCase().replace(/[\s\u3000\u3001\u3002]/g, '');
}

export function matchesJapaneseSpeech(
  transcript: string,
  targetJa: string,
  targetRomaji: string
): boolean {
  const tClean = normalizeSpeechText(transcript);
  const jaClean = normalizeSpeechText(targetJa);
  const romClean = targetRomaji.trim().toLowerCase();

  return (
    tClean === jaClean ||
    tClean === romClean ||
    (targetJa === 'あ' && (tClean.includes('a') || tClean === 'あ' || tClean === 'ア')) ||
    (targetJa === 'い' && (tClean.includes('i') || tClean.includes('ee') || tClean === 'い' || tClean === 'イ')) ||
    (targetJa === 'う' && (tClean.includes('u') || tClean === 'う' || tClean === 'ウ')) ||
    (targetJa === 'え' && (tClean.includes('e') || tClean === 'eh' || tClean === 'え' || tClean === 'エ')) ||
    (targetJa === 'お' && (tClean.includes('o') || tClean === 'oh' || tClean === 'お' || tClean === 'オ')) ||
    (targetJa === '一' && (tClean === 'いち' || tClean === '1' || tClean === 'ichi')) ||
    (targetJa === '二' && (tClean === 'ni' || tClean === '2')) ||
    (targetJa === '三' && (tClean === 'san' || tClean === '3')) ||
    (targetJa === '日' && (tClean === 'nichi' || tClean === 'hi')) ||
    (targetJa === '月' && (tClean === 'tsuki' || tClean === 'getsu')) ||
    (targetJa === '木' && (tClean === 'ki' || tClean === 'moku')) ||
    tClean.includes(jaClean) ||
    jaClean.includes(tClean)
  );
}
