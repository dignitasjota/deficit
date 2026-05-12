import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import type {
  BillingState,
  SubscriptionPeriod,
  SubscriptionStatus,
} from '@perdida-peso/schemas';
import { and, eq, isNull } from 'drizzle-orm';
import Stripe from 'stripe';
import { AppConfigService } from '../config/app-config.service.js';
import { DATABASE, type Database } from '../db/database.module.js';
import { billingEvents } from '../db/schema/billing_events.js';
import { subscriptions } from '../db/schema/subscriptions.js';
import { users } from '../db/schema/users.js';

const MS_DAY = 24 * 60 * 60 * 1000;

const ACTIVE_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  'active',
  'trialing',
]);

@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);
  private stripeClient: Stripe | null = null;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    const cfg = this.config.stripe;
    if (!cfg.enabled) {
      this.logger.warn(
        'Stripe sin configurar. Los endpoints de billing fallarán hasta que se definan STRIPE_SECRET_KEY y precios.',
      );
      return;
    }
    this.stripeClient = new Stripe(cfg.secretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }

  /** Para tests: inyectar un mock. */
  setStripeClient(client: Stripe | null): void {
    this.stripeClient = client;
  }

  private requireStripe(): Stripe {
    if (!this.stripeClient) {
      throw new BadRequestException(
        'Billing no está configurado. Define STRIPE_SECRET_KEY y precios.',
      );
    }
    return this.stripeClient;
  }

  async getMyBilling(userId: string): Promise<BillingState> {
    const [user] = await this.db
      .select({ plan: users.plan, trialEndsAt: users.trialEndsAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException();

    const now = new Date();
    const trialEndsAt = user.trialEndsAt;
    const trialActive = trialEndsAt !== null && trialEndsAt > now;
    const trialDaysLeft = trialActive
      ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / MS_DAY)
      : 0;
    const effectivePlan: 'free' | 'premium' =
      user.plan === 'premium' || trialActive ? 'premium' : 'free';

    const [sub] = await this.db
      .select({
        status: subscriptions.status,
        period: subscriptions.period,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        canceledAt: subscriptions.canceledAt,
        createdAt: subscriptions.createdAt,
      })
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), isNull(subscriptions.canceledAt)))
      .orderBy(subscriptions.createdAt)
      .limit(1);

    return {
      plan: user.plan,
      effectivePlan,
      trialEndsAt: trialEndsAt?.toISOString() ?? null,
      trialActive,
      trialDaysLeft,
      subscription: sub
        ? {
            status: sub.status,
            period: sub.period,
            currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            canceledAt: sub.canceledAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  async createCheckoutSession(userId: string, period: SubscriptionPeriod): Promise<string> {
    const stripe = this.requireStripe();
    const cfg = this.config.stripe;
    const priceId = period === 'month' ? cfg.priceMonthly : cfg.priceYearly;
    if (!priceId) {
      throw new BadRequestException(`Precio Stripe ${period} no configurado.`);
    }

    const customerId = await this.getOrCreateCustomer(userId);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto' },
      success_url: `${this.config.appUrl}/settings?billing=ok`,
      cancel_url: `${this.config.appUrl}/pricing?canceled=1`,
      allow_promotion_codes: true,
      // El trial server-side ya está activo via `users.trial_ends_at`.
      // No pasamos `trial_period_days` aquí: la suscripción se activa
      // en cuanto se completa el pago.
      metadata: { userId },
    });

    if (!session.url) {
      throw new Error('Stripe no devolvió URL de Checkout.');
    }
    return session.url;
  }

  async createPortalSession(userId: string): Promise<string> {
    const stripe = this.requireStripe();
    const [user] = await this.db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user?.stripeCustomerId) {
      throw new BadRequestException('Aún no tienes datos de pago. Suscríbete primero.');
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${this.config.appUrl}/settings`,
    });
    return session.url;
  }

  private async getOrCreateCustomer(userId: string): Promise<string> {
    const stripe = this.requireStripe();
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        stripeCustomerId: users.stripeCustomerId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException();
    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    await this.db
      .update(users)
      .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    return customer.id;
  }

  /**
   * Procesa un evento Stripe ya verificado por firma. Idempotente vía
   * UNIQUE en `billing_events.stripe_event_id`.
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<{ duplicate: boolean }> {
    const duplicate = await this.db
      .insert(billingEvents)
      .values({
        stripeEventId: event.id,
        type: event.type,
        payload: event as unknown as Record<string, unknown>,
      })
      .onConflictDoNothing({ target: billingEvents.stripeEventId })
      .returning({ id: billingEvents.id });

    if (duplicate.length === 0) {
      return { duplicate: true };
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.onSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        // Otros eventos se almacenan en billing_events para audit pero
        // no requieren acción. Stripe entregará otros tipos como
        // `invoice.payment_succeeded` que afectan al status de la sub
        // y se reflejan vía `customer.subscription.updated`.
        break;
    }

    return { duplicate: false };
  }

  private async onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    if (!userId || !customerId) return;
    await this.db
      .update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  private async onSubscriptionUpsert(sub: Stripe.Subscription): Promise<void> {
    const userId = await this.resolveUserIdFromCustomer(sub.customer);
    if (!userId) {
      this.logger.warn(`Webhook sub ${sub.id} sin user resoluble; ignorado.`);
      return;
    }

    const period = this.detectPeriod(sub);
    const status = sub.status as SubscriptionStatus;
    const priceId = sub.items.data[0]?.price.id ?? '';
    const currentPeriodEnd = new Date(sub.current_period_end * 1000);
    const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000) : null;

    await this.db
      .insert(subscriptions)
      .values({
        userId,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        status,
        period,
        currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
        trialEndsAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: subscriptions.stripeSubscriptionId,
        set: {
          status,
          period,
          stripePriceId: priceId,
          currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
          trialEndsAt,
          updatedAt: new Date(),
        },
      });

    // Sincronizar plan en users.
    const newPlan: 'free' | 'premium' = ACTIVE_STATUSES.has(status) ? 'premium' : 'free';
    await this.db
      .update(users)
      .set({ plan: newPlan, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  private async onSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
    const userId = await this.resolveUserIdFromCustomer(sub.customer);
    if (!userId) return;
    const now = new Date();
    await this.db
      .update(subscriptions)
      .set({
        status: 'canceled',
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : now,
        updatedAt: now,
      })
      .where(eq(subscriptions.stripeSubscriptionId, sub.id));
    await this.db
      .update(users)
      .set({ plan: 'free', updatedAt: now })
      .where(eq(users.id, userId));
  }

  private async resolveUserIdFromCustomer(
    customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
  ): Promise<string | null> {
    const customerId = typeof customer === 'string' ? customer : customer?.id;
    if (!customerId) return null;
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.stripeCustomerId, customerId))
      .limit(1);
    return row?.id ?? null;
  }

  private detectPeriod(sub: Stripe.Subscription): SubscriptionPeriod {
    const interval = sub.items.data[0]?.price.recurring?.interval;
    return interval === 'year' ? 'year' : 'month';
  }
}
