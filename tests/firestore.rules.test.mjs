import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rules = readFileSync(join(root, 'firestore.rules'), 'utf8');

test('firestore rules allow owner chat updates without live quota fields', () => {
  assert.match(rules, /ownerLiveQuotaChangeOk/);
  assert.match(rules, /ownerCannotChangeStripeFields/);
  assert.doesNotMatch(rules, /ownerCannotChangeLiveQuota/);
});

test('firestore rules block client stripe field writes', () => {
  assert.match(rules, /stripeCustomerId.*stripeSubscriptionId.*subscriptionStatus/s);
});

test('firestore indexes enable premiumEndedAt via single-field controls', () => {
  const indexes = JSON.parse(readFileSync(join(root, 'firestore.indexes.json'), 'utf8'));
  const redundantComposite = indexes.indexes?.find(
    (idx) => idx.collectionGroup === 'users'
      && idx.fields?.length === 1
      && idx.fields[0]?.fieldPath === 'premiumEndedAt',
  );
  assert.equal(redundantComposite, undefined, 'single-field indexes belong in fieldOverrides');

  const override = indexes.fieldOverrides?.find(
    (entry) => entry.collectionGroup === 'users' && entry.fieldPath === 'premiumEndedAt',
  );
  assert.ok(override, 'expected users.premiumEndedAt fieldOverride for purge query');
});
