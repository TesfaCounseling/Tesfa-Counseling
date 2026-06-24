"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";
import { ProviderAvatar } from "@/components/ProviderCard";
import SlotPicker, { SlotPickerSkeleton } from "@/components/SlotPicker";
import {
  bookAppointment,
  getAppointment,
  getProvider,
  getProviderPricing,
  getProviderSlots,
  getTraineeIntakeStatus,
  rescheduleAppointment,
  type Provider,
  type ProviderPricing,
  type Slot,
} from "@/lib/api";
import { formatMoney, formatPricingType, getBrowserTimezone } from "@/lib/format";

const DURATIONS = [
  { minutes: 50, label: "50 min", desc: "Standard session" },
  { minutes: 90, label: "90 min", desc: "Extended session" },
];

type PriceTier = { label: string; amount_cents: number; pricing_type: string };

function buildTiers(pricing: ProviderPricing | undefined): PriceTier[] {
  if (!pricing) return [{ label: "Standard rate", amount_cents: 0, pricing_type: "standard" }];
  if (pricing.pricing_type === "pro_bono" || pricing.amount_cents === 0) {
    return [{ label: "Pro bono (free)", amount_cents: 0, pricing_type: "pro_bono" }];
  }
  if (pricing.pricing_type === "sliding_scale") {
    return [
      { label: `Full rate — ${formatMoney(pricing.amount_cents, pricing.currency)}`, amount_cents: pricing.amount_cents, pricing_type: "standard" },
      { label: `Reduced — ${formatMoney(Math.round(pricing.amount_cents / 2), pricing.currency)}`, amount_cents: Math.round(pricing.amount_cents / 2), pricing_type: "sliding_scale" },
      { label: "Pro bono (free)", amount_cents: 0, pricing_type: "pro_bono" },
    ];
  }
  return [{
    label: `${formatPricingType(pricing.pricing_type)} — ${formatMoney(pricing.amount_cents, pricing.currency)}`,
    amount_cents: pricing.amount_cents,
    pricing_type: pricing.pricing_type,
  }];
}

export default function BookCounselorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rescheduleId = searchParams.get("reschedule");
  const providerId = String(params.id);
  const clientTz = getBrowserTimezone();
  const isReschedule = Boolean(rescheduleId);

  const [provider, setProvider] = useState<Provider | null>(null);
  const [pricingList, setPricingList] = useState<ProviderPricing[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [duration, setDuration] = useState(50);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [tierIndex, setTierIndex] = useState(0);
  const [sessionMode, setSessionMode] = useState<"video" | "audio_only">("video");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null);

  const currentPricing = useMemo(
    () => pricingList.find((p) => p.duration_minutes === duration),
    [pricingList, duration]
  );
  const tiers = useMemo(() => buildTiers(currentPricing), [currentPricing]);
  const selectedTier = tiers[tierIndex] || tiers[0];

  useEffect(() => {
    setTierIndex(0);
  }, [duration, pricingList]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setSelected(null);
    setError("");

    Promise.all([
      getProvider(providerId),
      getProviderPricing(providerId),
      getProviderSlots(providerId, duration, clientTz),
      isReschedule && rescheduleId ? getAppointment(rescheduleId) : Promise.resolve(null),
    ])
      .then(async ([providerData, pricingData, slotsData, apptData]) => {
        setProvider(providerData.provider);
        setPricingList(pricingData.pricing);
        setSlots(slotsData.slots);
        if (apptData?.appointment.duration_minutes) {
          setDuration(apptData.appointment.duration_minutes);
        }
        if (!isReschedule && providerData.provider.type === "trainee") {
          const status = await getTraineeIntakeStatus(providerId);
          if (!status.completed) {
            router.replace(`/counselors/${providerId}/intake`);
            return;
          }
          if (status.intake?.preferred_session_mode) {
            setSessionMode(status.intake.preferred_session_mode);
          }
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load availability"))
      .finally(() => setLoading(false));
  }, [providerId, duration, router, clientTz, isReschedule, rescheduleId]);

  async function handleConfirm() {
    if (!selected) return;
    setBooking(selected.starts_at);
    setError("");
    try {
      if (isReschedule && rescheduleId) {
        await rescheduleAppointment(rescheduleId, {
          starts_at: selected.starts_at,
          duration_minutes: duration,
        });
      } else {
        await bookAppointment({
          provider_id: providerId,
          starts_at: selected.starts_at,
          duration_minutes: duration,
          client_timezone: clientTz,
          pricing_type: selectedTier.pricing_type,
          amount_cents: selectedTier.amount_cents,
          session_mode: sessionMode,
        });
      }
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : isReschedule ? "Reschedule failed" : "Booking failed";
      if (message.toLowerCase().includes("intake")) {
        router.push(`/counselors/${providerId}/intake`);
        return;
      }
      setError(message);
    } finally {
      setBooking(null);
    }
  }

  return (
    <div className="page-shell">
      <SiteHeader />

      <PageHero
        backHref={isReschedule ? "/dashboard" : "/counselors"}
        backLabel={isReschedule ? "Back to dashboard" : "Back to counselors"}
        eyebrow={isReschedule ? "Reschedule" : "Book your session"}
        title={isReschedule ? "Pick a new time" : "Choose a time that works for you"}
        subtitle={
          isReschedule
            ? "Select a new slot. We'll email you and your counselor with the updated time."
            : "Select a slot and confirm your session fee. Payment processing coming soon — your rate is recorded at booking."
        }
      />

      <main className="mx-auto max-w-5xl page-pad pb-28 pt-6 sm:pb-10">
        <div className="grid gap-6 lg:grid-cols-[300px_1fr] lg:gap-8">
          <aside className="booking-sidebar lg:sticky lg:top-24 lg:self-start">
            {provider ? (
              <>
                <div className="flex items-center gap-4">
                  <ProviderAvatar name={provider.full_name} />
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-ethio-ink">{provider.full_name}</h2>
                    <p className="text-sm font-medium capitalize text-ethio-green">
                      {provider.type === "trainee" ? "Supervised trainee" : "Licensed counselor"}
                    </p>
                  </div>
                </div>

                {provider.languages && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-ethio-ink-muted">
                    <span aria-hidden>🗣️</span>
                    {provider.languages}
                  </p>
                )}

                {currentPricing && !isReschedule && (
                  <div className="mt-5 rounded-xl bg-ethio-surface-warm px-4 py-3 text-sm">
                    <p className="font-semibold text-ethio-ink">Session fee</p>
                    <p className="mt-1 text-ethio-ink-muted">
                      {selectedTier.amount_cents === 0
                        ? "Pro bono — no charge recorded"
                        : formatMoney(selectedTier.amount_cents, currentPricing.currency)}
                    </p>
                  </div>
                )}

                <ul className="trust-list mt-5">
                  <li>End-to-end encrypted video</li>
                  <li>Cancel from your dashboard</li>
                  <li>Times in your timezone</li>
                </ul>

                <div className="mt-5 rounded-xl bg-ethio-surface-warm px-4 py-3 text-xs leading-relaxed text-ethio-ink-muted">
                  <span className="font-semibold text-ethio-green-dark">Your timezone:</span> {clientTz}
                </div>
              </>
            ) : (
              <div className="animate-pulse space-y-3">
                <div className="h-16 w-16 rounded-2xl bg-ethio-surface-warm" />
                <div className="h-5 w-40 rounded bg-ethio-surface-warm" />
              </div>
            )}
          </aside>

          <section className="booking-panel">
            <div className="booking-panel-header">
              <div>
                <h2 className="text-lg font-bold text-ethio-ink">Available times</h2>
                <p className="mt-1 text-sm text-ethio-ink-muted">Next 2 weeks · updated live</p>
              </div>
              {!loading && slots.length > 0 && (
                <span className="slot-count-badge">{slots.length} open</span>
              )}
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ethio-ink-muted">Session length</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DURATIONS.map((opt) => (
                  <button
                    key={opt.minutes}
                    type="button"
                    onClick={() => setDuration(opt.minutes)}
                    className={`duration-pill ${duration === opt.minutes ? "duration-pill-active" : ""}`}
                  >
                    <span className="block font-bold">{opt.label}</span>
                    <span className="block text-xs opacity-80">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {!isReschedule && tiers.length > 1 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-ethio-ink-muted">Fee option</p>
                <div className="mt-2 space-y-2">
                  {tiers.map((tier, idx) => (
                    <label
                      key={tier.label}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                        tierIndex === idx ? "border-ethio-green bg-ethio-green/5" : "border-ethio-border"
                      }`}
                    >
                      <input
                        type="radio"
                        name="price_tier"
                        checked={tierIndex === idx}
                        onChange={() => setTierIndex(idx)}
                        className="text-ethio-green"
                      />
                      <span className="text-sm font-medium text-ethio-ink">{tier.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {!isReschedule && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-ethio-ink-muted">Session format</p>
                <div className="mt-2 space-y-2">
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                      sessionMode === "video" ? "border-ethio-green bg-ethio-green/5" : "border-ethio-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="session_mode"
                      checked={sessionMode === "video"}
                      onChange={() => setSessionMode("video")}
                    />
                    <span className="text-sm font-medium text-ethio-ink">Video (camera on)</span>
                  </label>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                      sessionMode === "audio_only" ? "border-ethio-green bg-ethio-green/5" : "border-ethio-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="session_mode"
                      checked={sessionMode === "audio_only"}
                      onChange={() => setSessionMode("audio_only")}
                    />
                    <span className="text-sm font-medium text-ethio-ink">Audio only (no camera)</span>
                  </label>
                </div>
              </div>
            )}

            {error && <p className="mt-5 alert-error">{error}</p>}

            <div className="mt-6">
              {loading ? (
                <SlotPickerSkeleton />
              ) : slots.length > 0 ? (
                <SlotPicker slots={slots} selected={selected} onSelect={setSelected} booking={booking} />
              ) : !error ? (
                <div className="empty-state">
                  <span className="text-3xl" aria-hidden>📅</span>
                  <p className="mt-3 font-semibold text-ethio-ink">No open slots right now</p>
                  <p className="mt-1 text-sm text-ethio-ink-muted">Try another counselor or check back later.</p>
                  <a href="/counselors" className="btn-secondary mt-5 sm:w-auto">Browse counselors</a>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      {selected && (
        <div className="booking-confirm-bar">
          <div className="ethio-stripe-bar" />
          <div className="mx-auto flex max-w-5xl flex-col gap-3 page-pad py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ethio-ink-muted">Your selection</p>
              <p className="mt-0.5 font-bold text-ethio-ink">{selected.client_local}</p>
              <p className="text-sm text-ethio-ink-muted">
                {duration} min
                {!isReschedule && selectedTier && (
                  <>
                    {" · "}
                    {selectedTier.amount_cents === 0 ? "Pro bono" : formatMoney(selectedTier.amount_cents, currentPricing?.currency || "USD")}
                    {" · "}
                    {sessionMode === "audio_only" ? "Audio" : "Video"}
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={Boolean(booking)}
              className="btn-primary sm:min-w-[220px] sm:w-auto"
            >
              {booking ? "Confirming…" : isReschedule ? "Confirm new time" : "Confirm booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
