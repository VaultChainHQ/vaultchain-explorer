// GET-only, whitelisted pass-through to the node REST, used by the one client-side widget (live height).
const ADDR = "vault1[0-9a-z]{20,80}";
const HEX = "[0-9a-fA-F]{64}";
const ALLOWED = [
  /^cosmos\/base\/tendermint\/v1beta1\/node_info$/,
  new RegExp(`^cosmos/bank/v1beta1/balances/${ADDR}$`),
  /^vaultchain\/storage\/(params|providers|deals|manifests|proofs|plans)$/,
  new RegExp(`^vaultchain/storage/(providers/${ADDR}|deals/[0-9]{1,12}|manifests/${HEX})$`),
  /^vaultchain\/access\/grants$/,
  new RegExp(`^vaultchain/auth/accounts/${ADDR}$`),
  new RegExp(`^vaultchain/txs/${HEX}$`),
];

export function isAllowedNodePath(path: string): boolean {
  return ALLOWED.some((re) => re.test(path));
}
