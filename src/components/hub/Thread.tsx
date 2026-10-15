import { useState } from "react";
import { Send, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatWhen, sendMessage, type HubComplaint, type HubMessage, type HubSession } from "@/lib/hub";

const BUBBLE: Record<HubMessage["from"], string> = {
  citizen: "bg-emerald-100 text-emerald-950 border-emerald-200",
  mayor: "bg-violet-100 text-violet-950 border-violet-200",
  system: "bg-slate-100 text-slate-700 border-slate-200",
};
const KIND: Record<HubMessage["kind"], string> = { submitted: "Complaint", message: "Message", decision: "Decision", progress: "Progress", feedback: "Feedback" };

export function Conversation({ messages }: { messages: HubMessage[] }) {
  if (!messages.length) return <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No messages yet.</p>;
  return (
    <ul className="space-y-2">
      {messages.map((m) => (
        <li key={m.id} className={`rounded-xl border p-3 text-sm ${BUBBLE[m.from]}`}>
          <div className="flex items-center justify-between gap-2 text-xs font-semibold">
            <span>{m.author} <span className="font-normal opacity-70">· {KIND[m.kind]}</span></span>
            <span className="font-normal opacity-70">{formatWhen(m.at)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap">{m.text}</p>
        </li>
      ))}
    </ul>
  );
}

export function Composer({ session, complaint, placeholder }: { session: HubSession; complaint: HubComplaint; placeholder: string }) {
  const [text, setText] = useState("");
  return (
    <div className="mt-3 flex gap-2">
      <Textarea aria-label="Write a message" rows={2} value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} className="bg-white" />
      <Button disabled={!text.trim()} onClick={() => { try { sendMessage(session, complaint, text); setText(""); } catch (e) { toast.error((e as Error).message); } }} aria-label="Send message"><Send className="h-4 w-4" /></Button>
    </div>
  );
}

export function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <span className="inline-flex gap-0.5" role={onChange ? "radiogroup" : "img"} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} className="disabled:cursor-default">
          <Star className={`h-5 w-5 ${n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
        </button>
      ))}
    </span>
  );
}
