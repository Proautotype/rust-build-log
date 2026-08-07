import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Heart, Loader2, Mail, Phone, Landmark, Send } from "lucide-react";
import { toast } from "sonner";
import { sendSupportMessage } from "@/lib/support.functions";
import {
  SUPPORT_BANK,
  SUPPORT_CONTACT_EMAIL,
  SUPPORT_MOBILE_MONEY,
  hasBank,
  hasMobileMoney,
} from "@/lib/support-config";

const TITLE = "Support Right2Read — Donate & Contact Us";
const DESC =
  "Back Right2Read with mobile money or a bank transfer, or message our customer service team for help with your account, coins or stories.";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupportPage,
});

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/40 px-3 py-2">
      <div className="min-w-0">
        <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-sm font-medium">{value}</div>
      </div>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            toast.error("Couldn't copy — long-press to copy manually.");
          }
        }}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function SupportPage() {
  const send = useServerFn(sendSupportMessage);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    category: "support" as "support" | "billing" | "content" | "donation" | "other",
  });

  const mutation = useMutation({
    mutationFn: () => send({ data: form }),
    onSuccess: () => {
      toast.success("Message sent — customer service will get back to you.");
      setForm({ name: "", email: "", subject: "", message: "", category: "support" });
    },
    onError: (e: Error) => toast.error(e.message || "Could not send your message."),
  });

  const configured = hasMobileMoney || hasBank;

  return (
    <div className="container-page py-12 md:py-16 max-w-3xl">
      <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
        right2read / support
      </div>
      <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight">
        Support the project
      </h1>
      <p className="mt-3 text-muted-foreground">
        Right2Read is built in public. Hosting, AI drafting, audio narration and coin bonuses all
        cost money — every contribution keeps stories free for readers.
      </p>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        {hasMobileMoney && (
          <div className="rounded-xl border border-border/70 bg-surface p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Phone className="h-4 w-4 text-primary" /> Mobile money
            </div>
            <div className="mt-4 space-y-2">
              <CopyRow label="Number" value={SUPPORT_MOBILE_MONEY.number} />
              {SUPPORT_MOBILE_MONEY.name && (
                <CopyRow label="Account name" value={SUPPORT_MOBILE_MONEY.name} />
              )}
              {SUPPORT_MOBILE_MONEY.network && (
                <CopyRow label="Network" value={SUPPORT_MOBILE_MONEY.network} />
              )}
            </div>
          </div>
        )}

        {hasBank && (
          <div className="rounded-xl border border-border/70 bg-surface p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Landmark className="h-4 w-4 text-primary" /> Bank transfer
            </div>
            <div className="mt-4 space-y-2">
              <CopyRow label="Account number" value={SUPPORT_BANK.accountNumber} />
              {SUPPORT_BANK.accountName && (
                <CopyRow label="Account name" value={SUPPORT_BANK.accountName} />
              )}
              {SUPPORT_BANK.bank && <CopyRow label="Bank" value={SUPPORT_BANK.bank} />}
              {SUPPORT_BANK.branch && <CopyRow label="Branch" value={SUPPORT_BANK.branch} />}
            </div>
          </div>
        )}

        {!configured && (
          <div className="sm:col-span-2 rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
            <Heart className="h-4 w-4 text-primary mb-2" />
            Donation details aren&apos;t published yet. Reach us at{" "}
            <a className="text-primary hover:underline" href={`mailto:${SUPPORT_CONTACT_EMAIL}`}>
              {SUPPORT_CONTACT_EMAIL}
            </a>{" "}
            and we&apos;ll share how to give.
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-border/70 bg-surface p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Mail className="h-4 w-4 text-primary" /> Contact
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Prefer email? Write to{" "}
          <a className="text-primary hover:underline" href={`mailto:${SUPPORT_CONTACT_EMAIL}`}>
            {SUPPORT_CONTACT_EMAIL}
          </a>
          . Include your account email so we can find you faster.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-display tracking-tight">Message customer service</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Our customer service team reads every message inside the app and replies by email.
        </p>

        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (mutation.isPending) return;
            mutation.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              maxLength={120}
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              required
              type="email"
              maxLength={255}
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <input
              required
              maxLength={160}
              placeholder="Subject"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value as typeof f.category }))
              }
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="support">General support</option>
              <option value="billing">Coins & billing</option>
              <option value="content">Story or content</option>
              <option value="donation">Donation</option>
              <option value="other">Other</option>
            </select>
          </div>
          <textarea
            required
            minLength={5}
            maxLength={4000}
            rows={6}
            placeholder="How can we help?"
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send message
          </button>
        </form>
      </section>
    </div>
  );
}
