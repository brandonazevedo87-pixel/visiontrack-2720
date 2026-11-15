import { useQuery } from '@tanstack/react-query';
import { orpc } from '../lib/api';
export const useMe = (enabled: boolean) => useQuery(orpc.vision.me.queryOptions({ enabled, retry: false }));
export const usePlan = () => useQuery(orpc.vision.plan.queryOptions());
export const useRecordings = (enabled: boolean) => useQuery(orpc.vision.list.queryOptions({ enabled }));
export const useMembers = (enabled: boolean) => useQuery(orpc.vision.members.queryOptions({ enabled }));
export const useVideo = (token: string) => useQuery(orpc.vision.watch.queryOptions({ input: { token }, retry: false, refetchOnWindowFocus: false }));