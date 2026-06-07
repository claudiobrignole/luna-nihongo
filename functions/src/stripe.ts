import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import Stripe from 'stripe';
import { bookSlotForUser } from './scheduling';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
const stripePriceId = defineString('STRIPE_PRICE_ID', { default: '' });
const stripeExtraLessonPriceId = defineString('STRIPE_EXTRA_LESSON_PRICE_ID', {
  default: 'price_1TfeSxQaxCx8KSVpKs4U0W4M',
});

function getStripe(secret: string): Stripe {
  return new Stripe(secret, { apiVersion: '2025-02-24.acacia' });
}

function appOrigin(): string {
  const fromEnv = process.env.STRIPE_SUCCESS_URL ?? '';
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      /* fall through */
    }
  }
  return 'https://lunanihongo.it';
}

async function userRef(uid: string) {
  const db = getFirestore();
  return db.collection('users').doc(uid);
}

function subscriptionPeriodFields(subscription: Stripe.Subscription) {
  return {
    subscriptionPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
  };
}

export const createStripeCheckout = onCall(
  {
    region: 'europe-west1',
    secrets: [stripeSecretKey],
    invoker: 'public',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const priceId = stripePriceId.value();
    if (!priceId) {
      throw new HttpsError('failed-precondition', 'STRIPE_PRICE_ID is not configured.');
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email ?? '';
    const stripe = getStripe(stripeSecretKey.value());
    const ref = await userRef(uid);
    const snap = await ref.get();
    const user = snap.data() ?? {};

    let customerId = user.stripeCustomerId as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { firebaseUid: uid },
      });
      customerId = customer.id;
      await ref.set({ stripeCustomerId: customerId, updatedAt: new Date().toISOString() }, { merge: true });
    }

    const origin = appOrigin();
    const language = request.data?.language === 'en' ? 'en' : 'it';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success&lang=${language}&book=1`,
      cancel_url: `${origin}/?checkout=cancel&lang=${language}`,
      metadata: { firebaseUid: uid, checkoutType: 'subscription' },
      subscription_data: {
        metadata: { firebaseUid: uid },
      },
    });

    if (!session.url) {
      throw new HttpsError('internal', 'Could not create checkout session.');
    }

    return { url: session.url };
  },
);

export const createExtraLessonCheckout = onCall(
  {
    region: 'europe-west1',
    secrets: [stripeSecretKey],
    invoker: 'public',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const slotId = typeof request.data?.slotId === 'string' ? request.data.slotId.trim() : '';
    const name = typeof request.data?.name === 'string' ? request.data.name.trim() : '';
    const email = typeof request.data?.email === 'string' ? request.data.email.trim() : '';
    const level = typeof request.data?.level === 'string' ? request.data.level : 'beginner';
    const notes = typeof request.data?.notes === 'string' ? request.data.notes.trim() : '';

    if (!slotId || !name || !email) {
      throw new HttpsError('invalid-argument', 'slotId, name and email are required.');
    }

    const priceId = stripeExtraLessonPriceId.value();
    if (!priceId) {
      throw new HttpsError('failed-precondition', 'STRIPE_EXTRA_LESSON_PRICE_ID is not configured.');
    }

    const uid = request.auth.uid;
    const stripe = getStripe(stripeSecretKey.value());
    const ref = await userRef(uid);
    const snap = await ref.get();
    const user = snap.data() ?? {};

    if (user.tier !== 'premium') {
      throw new HttpsError('failed-precondition', 'Active subscription required for extra lessons.');
    }

    let customerId = user.stripeCustomerId as string | undefined;
    if (!customerId) {
      throw new HttpsError('failed-precondition', 'No Stripe customer on file.');
    }

    const origin = appOrigin();
    const language = request.data?.language === 'en' ? 'en' : 'it';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=extra&lang=${language}&slotId=${encodeURIComponent(slotId)}`,
      cancel_url: `${origin}/?checkout=cancel&lang=${language}`,
      metadata: {
        firebaseUid: uid,
        checkoutType: 'extra_lesson',
        slotId,
        name,
        email,
        level,
        notes,
      },
    });

    if (!session.url) {
      throw new HttpsError('internal', 'Could not create checkout session.');
    }

    return { url: session.url };
  },
);

export const createStripePortal = onCall(
  {
    region: 'europe-west1',
    secrets: [stripeSecretKey],
    invoker: 'public',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const uid = request.auth.uid;
    const snap = await (await userRef(uid)).get();
    const customerId = snap.data()?.stripeCustomerId as string | undefined;

    if (!customerId) {
      throw new HttpsError('failed-precondition', 'No Stripe customer on file.');
    }

    const stripe = getStripe(stripeSecretKey.value());
    const origin = appOrigin();
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/?portal=return`,
    });

    return { url: portal.url };
  },
);

async function setPremiumFromSubscription(
  uid: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const ref = await userRef(uid);
  const active = subscription.status === 'active' || subscription.status === 'trialing';
  const periods = subscriptionPeriodFields(subscription);

  if (active) {
    const snap = await ref.get();
    const prevStart = snap.data()?.subscriptionPeriodStart as string | undefined;
    const periodRenewed = prevStart && prevStart !== periods.subscriptionPeriodStart;

    await ref.set(
      {
        tier: 'premium',
        subscriptionStatus: subscription.status,
        stripeSubscriptionId: subscription.id,
        premiumEndedAt: null,
        ...periods,
        includedLessonsUsed: periodRenewed ? 0 : (snap.data()?.includedLessonsUsed ?? 0),
        liveMinutesUsed: periodRenewed ? 0 : (snap.data()?.liveMinutesUsed ?? 0),
        liveMinutesWindowStart: periodRenewed ? null : (snap.data()?.liveMinutesWindowStart ?? null),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return;
  }

  const snap = await ref.get();
  const wasPremium = snap.data()?.tier === 'premium';

  await ref.set(
    {
      tier: 'free',
      subscriptionStatus: subscription.status,
      stripeSubscriptionId: subscription.id,
      ...(wasPremium ? { premiumEndedAt: new Date().toISOString() } : {}),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export const stripeWebhook = onRequest(
  {
    region: 'europe-west1',
    secrets: [stripeSecretKey, stripeWebhookSecret],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    const stripe = getStripe(stripeSecretKey.value());
    const sig = req.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') {
      res.status(400).send('Missing stripe-signature');
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        stripeWebhookSecret.value(),
      );
    } catch (err) {
      console.error('Stripe webhook signature failed', err);
      res.status(400).send('Invalid signature');
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const uid = session.metadata?.firebaseUid;
          if (!uid) break;

          if (session.mode === 'subscription' && session.subscription && typeof session.subscription === 'string') {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            await setPremiumFromSubscription(uid, sub);
            break;
          }

          if (session.mode === 'payment' && session.metadata?.checkoutType === 'extra_lesson') {
            const slotId = session.metadata.slotId ?? '';
            await bookSlotForUser({
              uid,
              slotId,
              name: session.metadata.name ?? '',
              email: session.metadata.email ?? '',
              level: session.metadata.level ?? 'beginner',
              notes: session.metadata.notes ?? '',
              plan: 'extra',
            });
          }
          break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const uid = subscription.metadata?.firebaseUid;
          if (uid) {
            await setPremiumFromSubscription(uid, subscription);
          }
          break;
        }
        default:
          break;
      }
      res.status(200).json({ received: true });
    } catch (err) {
      console.error('Stripe webhook handler error', err);
      res.status(500).send('Webhook handler failed');
    }
  },
);
