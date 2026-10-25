export const DEFAULT_REST = "https://vaultl1-devnet.fly.dev";
export const DEFAULT_PROVIDER = "https://vaultl1-provider.fly.dev";

/** Node REST base. Read on the server only (the browser goes through /api/node). */
export function restBase(): string {
  return (process.env.NEXT_PUBLIC_VAULT_REST || DEFAULT_REST).replace(/\/+$/, "");
}

export function providerBase(): string {
  return (process.env.NEXT_PUBLIC_VAULT_PROVIDER || DEFAULT_PROVIDER).replace(/\/+$/, "");
}
