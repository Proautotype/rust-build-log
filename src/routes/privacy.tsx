import { createFileRoute, Link } from "@tanstack/react-router";

const TITLE = "Privacy Policy — Right2Read";
const DESC =
  "How Right2Read collects, uses and protects your account, reading and creator data.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-display tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <div className="container-page py-12 md:py-16 max-w-3xl">
      <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
        right2read / legal
      </div>
      <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated {new Date().getFullYear()}. This page is maintained by the Right2Read team and
        describes how we handle data in this app. It is not a legal certification or audit result.
      </p>

      <Section title="What we collect">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <span className="text-foreground">Account data</span> — email, display name, avatar and
            bio you provide when you sign up (email or Google).
          </li>
          <li>
            <span className="text-foreground">Reading preferences</span> — the topics you select
            during onboarding, used to personalise your feed.
          </li>
          <li>
            <span className="text-foreground">Usage data</span> — story views, searches, comments
            and coin transactions tied to your account.
          </li>
          <li>
            <span className="text-foreground">Creator data</span> — stories, journeys, media uploads
            and AI agent configurations you create.
          </li>
        </ul>
      </Section>

      <Section title="How we use it">
        <p>
          We use your data to operate the platform: authenticating you, showing and personalising
          stories, attributing content to writers, running the coin wallet, and giving writers
          analytics about their own stories.
        </p>
        <p>
          Analytics shown to writers are aggregated per story (views, searches, engagement) and do
          not expose other readers' identities.
        </p>
      </Section>

      <Section title="Third-party services">
        <ul className="list-disc pl-5 space-y-1">
          <li>Authentication, database and file storage are provided by our cloud backend.</li>
          <li>
            Advertising may be served by Google AdSense on pages where ads are enabled. Pro members
            do not see ads.
          </li>
          <li>
            AI drafting and agent features send the prompts and topics you supply to our AI provider
            to generate text.
          </li>
          <li>
            If you connect an X (Twitter) API token, it is encrypted before storage and used only to
            fetch trends for your own agents.
          </li>
        </ul>
      </Section>

      <Section title="Cookies and local storage">
        <p>
          We use browser storage to keep you signed in and remember interface preferences. Ad
          providers may set their own cookies when ads are enabled.
        </p>
      </Section>

      <Section title="Your choices">
        <ul className="list-disc pl-5 space-y-1">
          <li>Edit or delete your profile details from your profile page.</li>
          <li>Disconnect an X token at any time from the agents page.</li>
          <li>Upgrade to Pro to turn off advertising.</li>
          <li>Request account deletion by contacting us — we remove your account data.</li>
        </ul>
      </Section>

      <Section title="Security">
        <p>
          Access to data is enforced with row-level security so users can only read and write their
          own records, and secrets such as API tokens are encrypted at rest. No system is perfectly
          secure — please report any issue you find to us.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy or your data? Reach out through the contact channel listed on
          our site, or open an issue in our public repository.
        </p>
      </Section>

      <div className="mt-12 text-sm">
        <Link to="/terms" className="text-primary hover:underline">
          Read the Terms of Service →
        </Link>
      </div>
    </div>
  );
}
