import { useCallback, useMemo, useState } from 'react';
import type { UserAnalytics, UserAnalyticsParams } from '../domain/models';
import { UserAnalyticsRepository } from '../data';
import { useAdminQuery } from './useAdminQuery';

export function useUserAnalytics(userId: string, params: UserAnalyticsParams = {}) {
  const { from, to, pageSize, pageToken } = params;
  const key = JSON.stringify({ userId, from: from ?? '', to: to ?? '', pageSize: pageSize ?? null, pageToken: pageToken ?? '' });
  const [paging, setPaging] = useState<{
    key: string;
    pageToken?: string;
    previousTokens: Array<string | undefined>;
  }>({ key, pageToken, previousTokens: [] });
  const activePaging = useMemo(
    () => paging.key === key ? paging : { key, pageToken, previousTokens: [] },
    [key, pageToken, paging],
  );
  const loadKey = `${key}:${activePaging.pageToken ?? ''}`;
  const loader = useCallback(async (signal: AbortSignal): Promise<{ key: string; value: UserAnalytics | null }> => {
    if (!userId) return { key: loadKey, value: null };
    const value = await UserAnalyticsRepository.get(userId, {
      from,
      to,
      pageSize,
      pageToken: activePaging.pageToken,
    }, signal);
    return { key: loadKey, value };
  }, [activePaging.pageToken, from, loadKey, pageSize, to, userId]);
  const query = useAdminQuery(loader);
  const data = query.data?.key === loadKey ? query.data.value : undefined;
  const nextPageToken = data?.nextPageToken;

  const nextPage = useCallback(() => {
    if (!nextPageToken) return;
    setPaging((current) => {
      const active = current.key === key ? current : { key, pageToken, previousTokens: [] };
      return {
        key,
        pageToken: nextPageToken,
        previousTokens: [...active.previousTokens, active.pageToken],
      };
    });
  }, [key, nextPageToken, pageToken]);

  const previousPage = useCallback(() => {
    setPaging((current) => {
      const active = current.key === key ? current : { key, pageToken, previousTokens: [] };
      if (active.previousTokens.length === 0) return active;
      return {
        key,
        pageToken: active.previousTokens.at(-1),
        previousTokens: active.previousTokens.slice(0, -1),
      };
    });
  }, [key, pageToken]);

  const resetPagination = useCallback(() => {
    setPaging({ key, pageToken, previousTokens: [] });
  }, [key, pageToken]);

  return {
    ...query,
    data,
    isLoading: Boolean(userId) && (query.isLoading || query.data?.key !== loadKey),
    page: activePaging.previousTokens.length + 1,
    canNextPage: Boolean(data?.nextPageToken),
    canPreviousPage: activePaging.previousTokens.length > 0,
    nextPage,
    previousPage,
    resetPagination,
  };
}
