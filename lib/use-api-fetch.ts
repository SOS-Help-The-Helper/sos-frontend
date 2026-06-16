'use client';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

export function useApiFetch<T>(
  fetcher: () => Promise<T>,
  errorMsg: string,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Monotonic token guards against out-of-order responses: when deps change
  // (e.g. orgId resolves from null -> Harmony) an earlier in-flight fetch can
  // resolve AFTER a later one and clobber the correct data. Only the latest
  // invocation is allowed to commit state.
  const callId = useRef(0);

  const run = () => {
    const myCall = ++callId.current;
    setLoading(true);
    setError(false);
    fetcher()
      .then((res) => { if (myCall === callId.current) setData(res); })
      .catch(() => { if (myCall === callId.current) { setError(true); toast.error(errorMsg); } })
      .finally(() => { if (myCall === callId.current) setLoading(false); });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, deps);

  return { data, loading, error, refetch: run };
}
