import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Landmark, Users } from "lucide-react";

export const Route = createFileRoute("/start")({
  head: () => ({ meta: [{ title: "Choose your login — Hyderabad Digital Twin" }, { name: "description", content: "Log in as a citizen, the Mayor of Hyderabad, or the Government of Sindh." }] }),
  component: Start,
});

const CARDS = [
  { role: "citizen", title: "People", text: "Report problems with a photo and map pin, then read the Mayor's reply.", icon: Users, grad: "from-emerald-400 via-teal-500 to-sky-500" },
  { role: "mayor", title: "Mayor of Hyderabad", text: "Receive complaints, accept or reject them, update the work and read feedback.", icon: Building2, grad: "from-indigo-500 via-violet-500 to-fuchsia-500" },
  { role: "chief_minister", title: "Government of Sindh", text: "See every conversation between the people and the mayor.", icon: Landmark, grad: "from-amber-400 via-orange-500 to-rose-500" },
] as const;

function Start() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-300 via-violet-300 to-pink-300 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-sm font-semibold text-violet-900 hover:underline">← Hyderabad Smart City Digital Twin</Link>
        <h1 className="mt-6 text-4xl font-extrabold text-slate-900">Who is logging in?</h1>
        <p className="mt-2 max-w-2xl text-slate-800">Pick your login. Each one opens its own form and its own dashboard.</p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {CARDS.map((c) => (
            <Link key={c.role} to="/login" search={{ role: c.role }} className={`group flex flex-col rounded-3xl bg-gradient-to-br ${c.grad} p-6 text-white shadow-xl transition hover:-translate-y-2 hover:shadow-2xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-white`}>
              <span className="float-y grid h-14 w-14 place-items-center rounded-2xl bg-white/25"><c.icon className="h-7 w-7" /></span>
              <h2 className="mt-5 text-xl font-extrabold">{c.title}</h2>
              <p className="mt-2 flex-1 text-sm text-white/95">{c.text}</p>
              <span className="mt-5 inline-flex items-center gap-1 font-bold">Log in <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
