import { createFileRoute, Link } from "@tanstack/react-router";

const TITLE = "Terms of Service — Right2Read";
const DESC =
  "The rules for using Right2Read: accounts, writer content, coins, ads and acceptable use.";

export const Route = createFileRoute("/terms")({
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
  component: TermsPage,
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

function TermsPage() {
  return (
    <div className="container-page py-12 md:py-16 max-w-3xl">
      <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
        right2read / legal
      </div>
      <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight">Terms of Service</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated {new Date().getFullYear()}. By using Right2Read you agree to these terms.
      </p>

      <Section title="Accounts">
        <p>
          You need an account to comment, earn or spend coins, and to write. Keep your credentials
          safe — you are responsible for activity under your account. Accounts that break these
          terms may be suspended or banned.
        </p>
      </Section>

      <Section title="Roles">
        <p>
          Readers can browse, comment and unlock stories. Readers may request writer access; writers
          can publish stories and journeys. Managers and admins have limited operational access for
          moderation and support.
        </p>
      </Section>

      <Section title="Your content">
        <p>
          You keep ownership of the stories, media and comments you publish. By posting, you grant
          Right2Read a non-exclusive licence to host, display, promote and distribute that content
          on the platform.
        </p>
        <p>
          You confirm you have the rights to everything you upload, including images, video and any
          third-party material you quote or embed.
        </p>
      </Section>

      <Section title="AI-generated content">
        <p>
          Writers may use AI drafting and AI agents. You remain responsible for anything published
          under your account, including AI-generated drafts and auto-published stories. Review your
          agent settings before enabling auto-publish.
        </p>
      </Section>

      <Section title="Coins, paid stories and Pro">
        <ul className="list-disc pl-5 space-y-1">
          <li>Coins are an in-app credit with no cash value and are not transferable off-platform.</li>
          <li>Writers may lock a story behind a coin price or keep it free and accept tips.</li>
          <li>Unlocking a story grants you personal access to read it — not redistribution rights.</li>
          <li>Pro membership removes ads and unlocks additional features while active.</li>
          <li>
            Coin and Pro purchases are generally non-refundable except where required by law or in
            case of a clear billing error.
          </li>
        </ul>
      </Section>

      <Section title="Advertising">
        <p>
          Free accounts may see advertising on the site. Ad placement and availability can change at
          any time.
        </p>
      </Section>

      <Section title="Acceptable use">
        <ul className="list-disc pl-5 space-y-1">
          <li>No plagiarism, spam, malware, harassment or illegal content.</li>
          <li>No attempts to bypass paywalls, coin locks or access controls.</li>
          <li>No scraping or automated abuse of the platform or its APIs.</li>
          <li>Respect third-party API terms when connecting your own tokens.</li>
        </ul>
      </Section>

      <Section title="Moderation">
        <p>
          We may remove content or restrict accounts that violate these terms, and we may adjust
          coin balances where fraud or abuse is detected.
        </p>
      </Section>

      <Section title="Disclaimer and liability">
        <p>
          The service is provided "as is" without warranties. To the extent permitted by law,
          Right2Read is not liable for indirect or consequential damages, or for loss of content
          arising from your use of the platform.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms as the product evolves. Continued use after an update means you
          accept the revised terms.
        </p>
      </Section>

      <div className="mt-12 text-sm">
        <Link to="/privacy" className="text-primary hover:underline">
          Read the Privacy Policy →
        </Link>
      </div>
    </div>
  );
}
