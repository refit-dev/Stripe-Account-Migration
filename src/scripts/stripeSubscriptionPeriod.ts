type PeriodItem = { price?: { id?: string } | null };
type PeriodField = 'current_period_start' | 'current_period_end';
type PlanItem = (items: PeriodItem[]) => PeriodItem | undefined;

// Typed like the removed field, which was also absent at runtime when Stripe omitted it.
function subscriptionPeriod(subscription: object, field: PeriodField, planItem?: PlanItem): number {
  const legacy: unknown = Reflect.get(subscription, field);
  if (typeof legacy === 'number') return legacy;
  const list: unknown = Reflect.get(subscription, 'items');
  const data: unknown = list && typeof list === 'object' ? Reflect.get(list, 'data') : undefined;
  const items = (Array.isArray(data) ? data : []).filter(
    (item): item is PeriodItem => typeof item === 'object' && item !== null,
  );
  const periods = new Set(items.map((item) => Reflect.get(item, field)));
  const chosen = periods.size === 1 ? items[0] : planItem?.(items);
  const value: unknown = chosen ? Reflect.get(chosen, field) : undefined;
  return (typeof value === 'number' ? value : undefined) as number;
}

export function getSubscriptionPeriodEnd(subscription: object, planItem?: PlanItem): number {
  return subscriptionPeriod(subscription, 'current_period_end', planItem);
}

// The old auto-expanded Coupon's ID when present (old-version payloads), otherwise the coupon a
// promotion code's promotion or a discount's source holds: an ID, or a Coupon when expanded.
export function getCouponId(value: object): string | undefined {
  const legacy: unknown = Reflect.get(value, 'coupon');
  const holder: unknown =
    legacy === undefined ? (Reflect.get(value, 'promotion') ?? Reflect.get(value, 'source')) : undefined;
  const moved: unknown =
    holder && typeof holder === 'object' && Reflect.get(holder, 'type') === 'coupon'
      ? Reflect.get(holder, 'coupon')
      : undefined;
  const coupon: unknown = legacy !== undefined ? legacy : moved;
  const id: unknown = coupon && typeof coupon === 'object' ? Reflect.get(coupon, 'id') : coupon;
  return typeof id === 'string' ? id : undefined;
}

// Typed like the removed field under old stripe types, like the new name under new ones.
type ProductMarketingFeatures<T> = T extends { features: infer F }
  ? F
  : T extends { marketing_features: infer M }
    ? M
    : { name?: string }[];

// The old features list when present (old-version payloads), otherwise marketing_features.
export function getProductMarketingFeatures<T extends object>(product: T): ProductMarketingFeatures<T> {
  const legacy: unknown = Reflect.get(product, 'features');
  return (legacy !== undefined ? legacy : Reflect.get(product, 'marketing_features')) as ProductMarketingFeatures<T>;
}
