import { Card } from "@/components/ui";

export default function AccountLookup() {
  return (
    <Card title="Account balance lookup">
      <form action="/search" className="lookup">
        <input name="q" placeholder="vault1…" aria-label="Account address" size={52} />
        <button type="submit">Look up</button>
      </form>
      <p className="muted small">Shows the balance, nonce, files and deals of any address. Addresses are public; there is nothing to log in to.</p>
    </Card>
  );
}
