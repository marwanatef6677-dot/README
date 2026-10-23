import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetConfigQueryKey, getGetProfileQueryKey, getListRidesQueryKey, getListAvailableRidesQueryKey,
  getGetRideQueryKey, getGetSummaryQueryKey,
  useGetConfig, useGetProfile, useListRides, useListAvailableRides, useGetRide, useGetSummary,
} from "@workspace/api-client-react";

const POLL = 5000;

export function useSignedIn() {
  const { isSignedIn, isLoaded } = useAuth();
  return { signedIn: !!isSignedIn, loaded: isLoaded };
}

export function useConfig() {
  return useGetConfig({ query: { queryKey: getGetConfigQueryKey(), staleTime: 10 * 60 * 1000 } });
}

export function useProfile() {
  const { signedIn } = useSignedIn();
  return useGetProfile({ query: { enabled: signedIn, queryKey: getGetProfileQueryKey(), retry: 1 } });
}

export function useMyRides() {
  const { signedIn } = useSignedIn();
  return useListRides({ query: { enabled: signedIn, queryKey: getListRidesQueryKey(), refetchInterval: signedIn ? POLL : false } });
}

export function useQueue(enabled: boolean) {
  const { signedIn } = useSignedIn();
  return useListAvailableRides({ query: { enabled: signedIn && enabled, queryKey: getListAvailableRidesQueryKey(), refetchInterval: signedIn && enabled ? POLL : false } });
}

export function useRide(id: number) {
  const { signedIn } = useSignedIn();
  const ok = signedIn && Number.isFinite(id) && id > 0;
  return useGetRide(id, { query: { enabled: ok, queryKey: getGetRideQueryKey(id), refetchInterval: ok ? POLL : false, retry: 1 } });
}

export function useSummary() {
  const { signedIn } = useSignedIn();
  return useGetSummary({ query: { enabled: signedIn, queryKey: getGetSummaryQueryKey(), refetchInterval: signedIn ? POLL : false } });
}

export function useInvalidateRides() {
  const qc = useQueryClient();
  return (id?: number) => {
    qc.invalidateQueries({ queryKey: getListRidesQueryKey() });
    qc.invalidateQueries({ queryKey: getListAvailableRidesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
    qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
    if (id) qc.invalidateQueries({ queryKey: getGetRideQueryKey(id) });
  };
}
