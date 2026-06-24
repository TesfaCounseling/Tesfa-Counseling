import Link from "next/link";

const audiences = [
  {
    id: "individuals",
    label: "Individuals",
    icon: "🧑",
    blurb: "Personal growth, stress, grief, and life transitions — on your terms.",
    tone: "audience-tile--green",
    iconTone: "audience-icon--green",
  },
  {
    id: "couples",
    label: "Couples",
    icon: "💑",
    blurb: "Rebuild trust, improve communication, and navigate conflict together.",
    tone: "audience-tile--gold",
    iconTone: "audience-icon--gold",
  },
  {
    id: "families",
    label: "Families",
    icon: "👨‍👩‍👧‍👦",
    blurb: "Parenting, generational tension, and healing as a household.",
    tone: "audience-tile--red",
    iconTone: "audience-icon--red",
  },
  {
    id: "young-adults",
    label: "Young adults",
    icon: "🌱",
    blurb: "Identity, school, relationships, and finding your footing abroad.",
    tone: "audience-tile--mint",
    iconTone: "audience-icon--mint",
  },
] as const;

export default function WhoWeServe() {
  return (
    <section className="mx-auto max-w-5xl page-pad py-8 sm:py-12">
      <div className="card-vibrant p-6 sm:p-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ethio-green">
          Who we serve
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {audiences.map((item, index) => (
            <Link
              key={item.id}
              href="/counselors"
              className={`group audience-tile ${item.tone}`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <span className="audience-tile-glow" aria-hidden />
              <span className={`audience-icon ${item.iconTone}`} aria-hidden>
                {item.icon}
              </span>
              <span className="audience-label">{item.label}</span>
              <span className="audience-blurb">{item.blurb}</span>
              <span className="audience-cta">
                Find support
                <span className="audience-cta-arrow" aria-hidden>
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
