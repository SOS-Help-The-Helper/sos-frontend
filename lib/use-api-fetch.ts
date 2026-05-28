'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function useApiFetch<T>(
  fetcher: () => Promise<T>,
  errorMsg: string,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const run = () => {
    setLoading(true);
    setError(false);
    fetcher()
      .then(setData)
      .catch(() => { setError(true); toast.error(errorMsg); })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, deps);

  return { data, loading, error, refetch: run };
}
