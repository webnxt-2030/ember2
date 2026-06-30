"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StellarProvider } from "./stellar-provider";

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <StellarProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </StellarProvider>
  );
}
