import stringify from "json-stringify-deterministic";
import { NostrQuery, NostrRequestFilter, RelayQueryMap } from "../../types/nostr-query";
import { LOCAL_CACHE_RELAY, LOCAL_CACHE_RELAY_ENABLED } from "../../services/local-relay";

export function addQueryToFilter(filter: NostrRequestFilter, query: NostrQuery) {
  if (Array.isArray(filter)) {
    return filter.map((f) => ({ ...f, ...query }));
  }
  return { ...filter, ...query };
}

export function stringifyFilter(filter: NostrRequestFilter) {
  return stringify(filter);
}
export function isFilterEqual(a: NostrRequestFilter, b: NostrRequestFilter) {
  return stringifyFilter(a) === stringifyFilter(b);
}

export function isQueryMapEqual(a: RelayQueryMap, b: RelayQueryMap) {
  return stringify(a) === stringify(b);
}

export function mapQueryMap(queryMap: RelayQueryMap, fn: (filter: NostrRequestFilter) => NostrRequestFilter) {
  const newMap: RelayQueryMap = {};
  for (const [relay, filter] of Object.entries(queryMap)) newMap[relay] = fn(filter);
  return newMap;
}

export function createSimpleQueryMap(relays: string[], filter: NostrRequestFilter) {
  const map: RelayQueryMap = {};

  // if the local cache relay is enabled, also ask it
  if (LOCAL_CACHE_RELAY_ENABLED) {
    map[LOCAL_CACHE_RELAY] = filter;
  }

  for (const relay of relays) map[relay] = filter;

  return map;
}
