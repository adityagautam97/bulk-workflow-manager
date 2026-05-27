"use client";

import { useEffect, useState } from "react";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";

interface PageContext {
  pageInfo?: { id: string; name: string; path: string; language?: string; route?: string };
  siteInfo?: { id: string; name: string; language: string };
}

interface UsePageContextReturn {
  pageContext: PageContext | null;
  isLoading: boolean;
  error: string | null;
}

export function usePageContext(client: ClientSDK | null): UsePageContextReturn {
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      try {
        const { data } = await client.query("pages.context");
        setPageContext(data);
        setIsLoading(false);
        unsubscribe = client.subscribe("pages.context", {
          onUpdate: (newData) => setPageContext(newData),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get page context");
        setIsLoading(false);
      }
    };

    init();
    return () => { unsubscribe?.(); };
  }, [client]);

  return { pageContext, isLoading, error };
}
