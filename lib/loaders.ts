import { NotFound, getDeal, getDeals, getManifest, getManifests, getProviders, getTx } from "./api";
import type { Loaders } from "./search";

const nf = <T,>(p: Promise<T>): Promise<T | undefined> =>
  p.catch((e) => {
    if (e instanceof NotFound) return undefined;
    throw e;
  });

/** Search loaders backed by the live node. */
export const liveLoaders: Loaders = {
  manifest: (root) => nf(getManifest(root)),
  tx: (hash) => nf(getTx(hash)),
  deal: (id) => nf(getDeal(id)),
  manifests: () => getManifests(),
  providers: () => getProviders(),
  latestDealId: async () => (await getDeals()).reduce((m, d) => Math.max(m, d.id), 0) || undefined,
};
