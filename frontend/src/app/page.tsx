import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";
import WhoWeServe from "@/components/WhoWeServe";
import { APP_NAME, MISSION, TAGLINE, TESFA_GEEZ, TESFA_MEANING } from "@/lib/brand";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5050/api/v1";

async function getHealth() {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const features = [
  {
    icon: "🌍",
    tone: "bg-ethio-green/10 text-ethio-green-dark",
    title: "Diaspora-focused",
    desc: "Serving Ethiopians and Ethiopian families wherever you live — across time zones and continents",
  },
  {
    icon: "🗣️",
    tone: "bg-ethio-gold-warm text-ethio-green-dark",
    title: "Culturally informed",
    desc: "Counseling in your language and with respect for Ethiopian cultural and spiritual values",
  },
  {
    icon: "👨‍👩‍👧",
    tone: "bg-ethio-red/10 text-ethio-red",
    title: "For every chapter of life",
    desc: "Individuals, couples, families, and young adults — support tailored to your needs",
  },
];

export default async function HomePage() {
  const health = await getHealth();

  return (
    <div className="page-shell">
      <SiteHeader />

      <PageHero
        centered
        eyebrow="Virtual counseling · Ethiopian diaspora"
        title={
          <>
            <span className="brand-text">{TESFA_GEEZ}</span> — hope and healing,{" "}
            <span className="brand-text">wherever you are</span>
          </>
        }
        subtitle="Professional, compassionate counseling for Ethiopians and Ethiopian families around the world — secure online sessions in a space that understands your culture."
      >
        <div className="mx-auto mt-9 flex max-w-sm flex-col items-center gap-4 sm:mt-11">
          <a href="/counselors" className="btn-primary sm:w-auto sm:min-w-[220px]">
            Find a counselor
          </a>
          <p className="text-sm text-ethio-ink-muted">
            Counselors &amp; trainees —{" "}
            <a href="/register" className="link-inline">
              apply to join our team
            </a>
          </p>
        </div>
        {health && (
          <p className="mt-8 hidden text-xs text-ethio-ink-muted/60 sm:block">
            API status: {health.status}
          </p>
        )}
      </PageHero>

      <section className="mx-auto max-w-3xl page-pad pb-4 text-center">
        <div className="card-vibrant p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ethio-green">
            Our mission
          </p>
          <p className="mt-4 text-sm leading-relaxed text-ethio-ink-muted sm:text-base">{MISSION}</p>
          <p className="mt-4 text-sm font-medium text-ethio-green-dark">{TESFA_MEANING}</p>
        </div>
      </section>

      <WhoWeServe />

      <section className="pb-10 sm:pb-16">
        <div className="mx-auto grid max-w-5xl gap-4 page-pad sm:grid-cols-3 sm:gap-6">
          {features.map((item) => (
            <div key={item.title} className="card-vibrant p-5 sm:p-6">
              <div className={`feature-icon ${item.tone}`}>{item.icon}</div>
              <h3 className="text-base font-bold text-ethio-ink sm:text-lg">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ethio-ink-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="site-footer border-t page-pad py-8 text-center">
        <div className="mx-auto mb-3 h-1 max-w-[120px] rounded-full bg-ethio-stripe" />
        <p className="text-sm text-ethio-ink-muted">
          Not for emergencies. If you are in crisis, contact local emergency services or a crisis line.
        </p>
        <p className="mt-2 text-xs font-medium text-ethio-green">
          {APP_NAME} · {TAGLINE}
        </p>
      </footer>
    </div>
  );
}
