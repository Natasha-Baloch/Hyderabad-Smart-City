import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Map, MessageSquareWarning, BarChart3, MapPin, ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero-hyderabad.jpg";
import { landmarks } from "@/data/landmarks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hyderabad Smart City Digital Twin — Sindh, Pakistan" },
      { name: "description", content: "Monitor, map and improve Hyderabad, Sindh: citizen complaints, municipal response and governance oversight in one platform." },
      { property: "og:title", content: "Hyderabad Smart City Digital Twin" },
      { property: "og:description", content: "A digital twin platform for Hyderabad, Sindh, Pakistan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const features: { icon: typeof Activity; title: string; text: string; grad: string }[] = [
  { icon: Activity, title: "City monitoring", text: "Follow infrastructure status and municipal response times from stored records.", grad: "from-emerald-400 to-teal-500" },
  { icon: Map, title: "Interactive mapping", text: "Explore assets and complaints on an OpenStreetMap-based map of Hyderabad.", grad: "from-sky-400 to-indigo-500" },
  { icon: MessageSquareWarning, title: "Citizen complaints", text: "Report an issue, pin its location and track it until it is resolved.", grad: "from-pink-400 to-rose-500" },
  { icon: BarChart3, title: "Infrastructure analytics", text: "Backlogs, categories and trends for the Mayor and provincial oversight.", grad: "from-amber-400 to-orange-500" },
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden bg-indigo-950 text-white">
        <img src={hero} alt="Traffic on a Hyderabad, Sindh road at dusk" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/90 via-fuchsia-800/60 to-orange-500/20" />
        <div className="glow absolute -right-24 top-10 h-96 w-96 rounded-full bg-pink-500/50 blur-3xl" aria-hidden />
        <div className="glow absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-amber-300/40 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-6">
          <div className="rise-in flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-pink-500 to-orange-400 text-white"><Building2 className="h-5 w-5" /></span>
            <span className="font-bold">Hyderabad <span className="font-normal text-white/85">Digital Twin</span></span>
          </div>
          <div className="max-w-2xl py-20 sm:py-28">
            <h1 className="rise-in text-4xl font-extrabold leading-tight sm:text-5xl">
              Hyderabad <span className="bg-gradient-to-r from-amber-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent">Smart City Digital Twin</span>
            </h1>
            <p className="rise-in-2 mt-5 text-base text-white/95">
              A virtual model of Hyderabad, Sindh that joins maps, infrastructure records and citizen complaints, so residents can report problems, the Mayor can act on them, and provincial leadership can oversee results.
            </p>
            <p className="rise-in-2 mt-4 inline-flex items-center gap-2 rounded-md bg-white/20 backdrop-blur px-3 py-1.5 text-sm"><MapPin className="h-4 w-4" /> Hyderabad, Sindh, Pakistan</p>
            <div className="rise-in-3 mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-lg hover:opacity-90"><Link to="/start">Get Started <ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline" className="border-white/60 bg-white/10 text-white hover:bg-white/25 hover:text-white"><Link to="/dashboard">Explore the demo</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14" aria-labelledby="landmarks">
        <h2 id="landmarks" className="text-2xl font-bold">Hyderabad landmarks</h2>
        <p className="mt-1 text-sm text-muted-foreground">Photographs supplied for this project.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {landmarks.map((l) => (
            <figure key={l.id} className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-lg">
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img src={l.image} alt={l.name} loading="lazy" onError={(e) => { if (e.currentTarget.src !== l.fallback) e.currentTarget.src = l.fallback; }}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <figcaption className="p-4">
                <p className="font-semibold">{l.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{l.description}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="border-t border-white/60 bg-white/40 backdrop-blur">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="hub-card rounded-2xl border bg-card p-5 transition-transform hover:-translate-y-1">
              <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${f.grad} text-white shadow`}><f.icon className="h-5 w-5" /></span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
      <p className="flex items-center justify-center gap-1.5 py-8 text-center text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Records labelled “sample” are demonstration data, not official figures.</p>
    </div>
  );
}
