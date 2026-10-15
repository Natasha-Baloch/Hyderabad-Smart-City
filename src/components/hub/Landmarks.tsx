import { landmarks } from "@/data/landmarks";

export function LandmarkStrip({ title = "Hyderabad landmarks" }: { title?: string }) {
  return (
    <div>
      <h3 className="mb-2 font-bold">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {landmarks.map((l) => (
          <figure key={l.id} className="group overflow-hidden rounded-xl border-2 border-white bg-white shadow-md">
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              <img src={l.image} alt={l.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            </div>
            <figcaption className="bg-gradient-to-r from-fuchsia-500 to-orange-400 px-3 py-1.5 text-xs font-semibold text-white">{l.name}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
