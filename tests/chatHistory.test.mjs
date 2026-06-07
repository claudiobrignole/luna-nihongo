import test from 'node:test';
import assert from 'node:assert/strict';

const RETENTION_DAYS = 90;

function premiumHistoryPurgeDate(premiumEndedAt) {
  const ended = new Date(premiumEndedAt);
  return new Date(ended.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

test('premium history purge is 90 days after end', () => {
  const ended = '2026-01-01T00:00:00.000Z';
  const purge = premiumHistoryPurgeDate(ended);
  assert.equal(purge.toISOString().slice(0, 10), '2026-04-01');
});

test('list live sessions groups by divider', () => {
  const history = [
    { sessionDivider: true, liveSessionId: 'a', content: 'Live', createdAt: '2026-01-01T00:00:00.000Z' },
    { liveSessionId: 'a', content: 'hello' },
    { liveSessionId: 'a', content: 'world' },
  ];
  const dividers = history.filter((m) => m.sessionDivider);
  const messages = history.filter((m) => m.liveSessionId === 'a' && !m.sessionDivider);
  assert.equal(dividers.length, 1);
  assert.equal(messages.length, 2);
});
