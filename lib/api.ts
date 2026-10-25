import { providerBase, restBase } from "./config";

export interface Coin {
  denom: string;
  amount: string;
}
export interface NodeInfo {
  chainId: string;
  height: number;
  appVersion: string;
}
export interface Replica {
  slot: number;
  provider: string;
  status: string;
  assigned_height?: number;
  accept_deadline_height?: number;
  accepted_height?: number;
  last_proven_height?: number;
  last_proven_epoch?: number;
  missed_proofs?: number;
}
export interface Deal {
  id: number;
  class: string;
  owner: string;
  cid: string;
  size: number;
  start_height: number;
  expire_height: number;
  payment: Coin;
  per_replica_payment?: Coin;
  replication: number;
  min_replicas: number;
  replicas: Replica[] | null;
  status: string;
}
export interface Provider {
  address: string;
  endpoint: string;
  capacity: number;
  free_bytes: number;
  collateral?: Coin;
  status: string;
}
export interface Manifest {
  root: string;
  size: number;
  chunk_size: number;
  mime: string;
  name: string;
  owner: string;
  height: number;
  encryption?: string;
  key_envelope?: string;
}
export interface Proof {
  id: number;
  deal_id: number;
  cid: string;
  provider: string;
  height: number;
  epoch: number;
  chunk_index: number;
}
export interface Grant {
  id: number;
  cid: string;
  owner: string;
  grantee: string;
  capability: string;
  expiry_height: number;
}
export interface StorageParams {
  price_per_gb_uvault: number;
  proof_interval_blocks: number;
  max_object_bytes: number;
  max_missed_proofs: number;
  accept_timeout_blocks: number;
  payment_denom_whitelist: string[];
}
export interface TxRecord {
  hash: string;
  height: number;
  index: number;
  ok: boolean;
  result: string;
  raw: string;
}
export interface ProviderStatus {
  status: string;
  version: string;
  address: string;
  chain_id: string;
  objects: number;
}

export class NotFound extends Error {}

async function get<T>(base: string, path: string): Promise<T> {
  const res = await fetch(base + path, { next: { revalidate: 5 }, signal: AbortSignal.timeout(8000) });
  if (res.status === 404) throw new NotFound(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

const node = <T>(path: string) => get<T>(restBase(), path);

export async function getNodeInfo(): Promise<NodeInfo> {
  const r = await node<{ height: number; default_node_info: { network: string }; application_version?: unknown }>("/cosmos/base/tendermint/v1beta1/node_info");
  const v = r.application_version as { version?: string } | string | undefined;
  return { chainId: r.default_node_info.network, height: r.height, appVersion: typeof v === "string" ? v : (v?.version ?? "") };
}
export const getParams = async () => (await node<{ params: StorageParams }>("/vaultchain/storage/params")).params;
export const getProviders = async () => (await node<{ providers: Provider[] | null }>("/vaultchain/storage/providers")).providers ?? [];
export const getProvider = async (addr: string) => {
  const r = await node<{ provider?: Provider } & Partial<Provider>>(`/vaultchain/storage/providers/${addr}`);
  return (r.provider ?? (r as Provider)) as Provider;
};
export async function getDeals(f: { cid?: string; provider?: string; owner?: string } = {}): Promise<Deal[]> {
  const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
  return (await node<{ deals: Deal[] | null }>(`/vaultchain/storage/deals${q ? "?" + q : ""}`)).deals ?? [];
}
export const getDeal = async (id: string) => (await node<{ deal: Deal }>(`/vaultchain/storage/deals/${id}`)).deal;
export async function getManifests(owner?: string): Promise<Manifest[]> {
  const q = owner ? `?owner=${encodeURIComponent(owner)}` : "";
  return (await node<{ manifests: Manifest[] | null }>(`/vaultchain/storage/manifests${q}`)).manifests ?? [];
}
export const getManifest = async (root: string) => (await node<{ manifest: Manifest }>(`/vaultchain/storage/manifests/${root}`)).manifest;
export const getProofs = async () => (await node<{ proofs: Proof[] | null }>("/vaultchain/storage/proofs")).proofs ?? [];
export const getGrants = async (cid?: string) => (await node<{ grants: Grant[] | null }>(`/vaultchain/access/grants${cid ? "?cid=" + cid : ""}`)).grants ?? [];
export const getBalances = async (addr: string) => (await node<{ balances: Coin[] | null }>(`/cosmos/bank/v1beta1/balances/${addr}`)).balances ?? [];
export const getAccount = async (addr: string) => node<{ address: string; nonce: number; pending_nonce: number }>(`/vaultchain/auth/accounts/${addr}`);
export const getTx = async (hash: string) => (await node<{ tx: TxRecord }>(`/vaultchain/txs/${hash}`)).tx;

export async function getProviderStatus(): Promise<ProviderStatus | undefined> {
  try {
    return await get<ProviderStatus>(providerBase(), "/status");
  } catch {
    return undefined;
  }
}

/** Runs a loader and turns any failure (except not-found, which propagates) into a message. */
export async function settle<T>(p: Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await p };
  } catch (e) {
    if (e instanceof NotFound) throw e;
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
