"use client";

import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { XMC } from "@sitecore-marketplace-sdk/xmc";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";

export interface MarketplaceClientState {
  client: ClientSDK | null;
  error: Error | null;
  isLoading: boolean;
  isInitialized: boolean;
}

const DEFAULT_OPTIONS = { retryAttempts: 3, retryDelay: 1000, autoInit: true };

let cachedClient: ClientSDK | undefined = undefined;

function isSetupRequiredError(error: Error): boolean {
  const errorWithCode = error as Error & { code?: string };
  const code = errorWithCode.code?.toUpperCase();
  const message = error.message.toLowerCase();

  return (
    code === "INVALID_ORIGIN" ||
    code === "TIMEOUT" ||
    code === "HANDSHAKE_FAILED" ||
    code === "CONNECTION_ERROR" ||
    message.includes("invalid message origin") ||
    message.includes("request timed out") ||
    message.includes("failed to establish connection")
  );
}

async function getMarketplaceClient(): Promise<ClientSDK> {
  if (cachedClient) return cachedClient;

  if (typeof window === "undefined") {
    throw new Error("Marketplace SDK can only initialize in the browser.");
  }

  cachedClient = await ClientSDK.init({ target: window.parent, modules: [XMC] });
  return cachedClient;
}

export function useMarketplaceClient(options: { retryAttempts?: number; retryDelay?: number; autoInit?: boolean } = {}) {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  const [state, setState] = useState<MarketplaceClientState>({ client: null, error: null, isLoading: false, isInitialized: false });
  const isInitializingRef = useRef(false);

  const initializeClient = useCallback(async (attempt = 1): Promise<void> => {
    let shouldProceed = false;
    setState((prev) => {
      if (prev.isLoading || prev.isInitialized || isInitializingRef.current) return prev;
      shouldProceed = true;
      isInitializingRef.current = true;
      return { ...prev, isLoading: true, error: null };
    });
    if (!shouldProceed) return;

    try {
      const client = await getMarketplaceClient();
      setState({ client, error: null, isLoading: false, isInitialized: true });
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error("Failed to initialize MarketplaceClient");

      if (!isSetupRequiredError(normalizedError) && attempt < opts.retryAttempts) {
        await new Promise((r) => setTimeout(r, opts.retryDelay));
        isInitializingRef.current = false;
        return initializeClient(attempt + 1);
      }
      setState({ client: null, error: normalizedError, isLoading: false, isInitialized: false });
    } finally {
      isInitializingRef.current = false;
    }
  }, [opts.retryAttempts, opts.retryDelay]);

  useEffect(() => {
    if (opts.autoInit && typeof window !== "undefined") initializeClient();
    return () => { isInitializingRef.current = false; };
  }, [opts.autoInit, initializeClient]);

  return useMemo(() => ({ ...state, initialize: initializeClient }), [state, initializeClient]);
}
