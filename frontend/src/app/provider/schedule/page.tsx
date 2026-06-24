"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { getBrowserTimezone } from "@/lib/format";
import {
  createAvailabilityRule,
  deleteAvailabilityRule,
  listAvailabilityRules,
  listSessionPricing,
  upsertPricing,
  type AvailabilityRule,
  type SessionPricing,
} from "@/lib/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatPrice(amountCents: number, currency: string) {
  if (amountCents === 0) return "Free (pro bono)";
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountCents / 100);
}

function formatPricingType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProviderSchedulePage() {
  const router = useRouter();
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [pricing, setPricing] = useState<SessionPricing[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [timezone, setTimezone] = useState("");

  useEffect(() => {
    setTimezone(getBrowserTimezone());
  }, []);

  async function loadAll() {
    const [rulesData, pricingData] = await Promise.all([listAvailabilityRules(), listSessionPricing()]);
    setRules(rulesData.rules);
    setPricing(pricingData.pricing);
  }

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      router.push("/login");
      return;
    }
    loadAll().catch((err) => setError(err instanceof Error ? err.message : "Failed to load schedule"));
  }, [router]);

  async function handleAddRule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      await createAvailabilityRule({
        day_of_week: Number(form.get("day_of_week")),
        start_time: String(form.get("start_time")),
        end_time: String(form.get("end_time")),
        timezone: String(form.get("timezone") || timezone || getBrowserTimezone()),
      });
      formEl.reset();
      setTimezone(getBrowserTimezone());
      await loadAll();
      setMessage("Availability saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save availability");
    }
  }

  async function handlePricing(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const dollars = Number(form.get("price_dollars"));
    if (Number.isNaN(dollars) || dollars < 0) {
      setError("Enter a valid price in dollars (0 for free sessions).");
      return;
    }
    try {
      await upsertPricing(
        Number(form.get("duration_minutes")),
        Math.round(dollars * 100),
        String(form.get("pricing_type")),
        String(form.get("currency") || "USD")
      );
      await loadAll();
      setMessage("Pricing saved. Clients will see this amount when they book that session length.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save pricing");
    }
  }

  return (
    <div className="page-shell">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-lg page-pad py-8">
        <Link href="/dashboard" className="text-sm font-semibold text-ethio-green-dark">
          ← Dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold text-ethio-ink">Your schedule</h1>
        <p className="mt-2 text-ethio-ink-muted">Set weekly hours and what you charge per session length.</p>

        {message && <p className="mt-4 alert-success">{message}</p>}
        {error && <p className="mt-4 alert-error">{error}</p>}

        <form onSubmit={handleAddRule} className="card-vibrant mt-6 space-y-4 p-5">
          <h2 className="font-bold text-ethio-ink">Weekly availability</h2>
          <label className="block text-sm font-medium">
            Day
            <select name="day_of_week" className="input-field" required>
              {DAYS.map((day, i) => (
                <option key={day} value={i}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              From
              <input name="start_time" type="time" defaultValue="09:00" required className="input-field" />
            </label>
            <label className="block text-sm font-medium">
              To
              <input name="end_time" type="time" defaultValue="17:00" required className="input-field" />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Timezone
            <input
              name="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Detecting your timezone…"
              className="input-field"
              required
            />
            <span className="mt-1 block text-xs font-normal text-ethio-ink-muted">
              Defaults to your device timezone. Change this if your practice hours are in a different region.
            </span>
          </label>
          <button type="submit" className="btn-primary">
            Add hours
          </button>
        </form>

        <div className="mt-6 space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className="card flex items-center justify-between p-4">
              <span className="text-sm text-ethio-ink">
                {DAYS[rule.day_of_week]} · {rule.start_time}–{rule.end_time} ({rule.timezone})
              </span>
              <button
                type="button"
                className="text-sm font-semibold text-ethio-red"
                onClick={() => deleteAvailabilityRule(rule.id).then(loadAll)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handlePricing} className="card-vibrant mt-8 space-y-4 p-5">
          <h2 className="font-bold text-ethio-ink">Session pricing</h2>
          <p className="text-sm text-ethio-ink-muted">
            Set your fee for each session length. When a client books, that price is attached to the appointment.
            Online card payment (Stripe) is coming next — for now this records what you charge.
          </p>

          {pricing.length > 0 && (
            <div className="rounded-xl bg-ethio-surface p-3 text-sm">
              <p className="font-semibold text-ethio-ink">Your current rates</p>
              <ul className="mt-2 space-y-1 text-ethio-ink-muted">
                {pricing.map((p) => (
                  <li key={p.id}>
                    {p.duration_minutes} min · {formatPrice(p.amount_cents, p.currency)} ·{" "}
                    {formatPricingType(p.pricing_type)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <label className="block text-sm font-medium">
            Session length
            <select name="duration_minutes" className="input-field">
              <option value={50}>50 minutes</option>
              <option value={90}>90 minutes</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Currency
            <select name="currency" className="input-field" defaultValue="USD">
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="ETB">ETB — Ethiopian Birr</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Price
            <div className="relative mt-1">
              <input
                name="price_dollars"
                type="number"
                min={0}
                step={0.01}
                defaultValue={50}
                required
                className="input-field"
              />
            </div>
            <span className="mt-1 block text-xs font-normal text-ethio-ink-muted">
              Enter 0 for free / pro bono sessions. For sliding scale, enter your full standard rate — clients choose a tier at booking.
            </span>
          </label>
          <label className="block text-sm font-medium">
            Pricing type
            <select name="pricing_type" className="input-field">
              <option value="standard">Standard rate</option>
              <option value="pro_bono">Pro bono (free)</option>
              <option value="sliding_scale">Sliding scale</option>
              <option value="trainee_rate">Trainee rate</option>
            </select>
          </label>
          <button type="submit" className="btn-secondary">
            Save pricing
          </button>
        </form>
      </main>
    </div>
  );
}
