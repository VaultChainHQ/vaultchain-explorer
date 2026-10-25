import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import { GLOSSARY, GLOSSARY_ORDER } from "@/lib/glossary";

export const metadata: Metadata = { title: "Glossary", description: "Plain-language meanings of the words used on VaultChain." };

export default function Glossary() {
  return (
    <>
      <PageHead title="Glossary" sub="The words you will meet in the explorer, in plain language. Hover or tap a dotted word anywhere on the site for a short version." />
      <dl className="glossary card">
        {GLOSSARY_ORDER.map((k) => (
          <div key={k}>
            <dt id={k}>{GLOSSARY[k].label}</dt>
            <dd>
              <strong style={{ color: "var(--text)", fontWeight: 600 }}>{GLOSSARY[k].short}</strong> {GLOSSARY[k].long}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
