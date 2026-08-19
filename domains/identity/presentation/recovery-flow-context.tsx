"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface RecoveryFlowState {
  readonly recoveryReference: string;
  readonly resendAvailableAt: number;
}

interface RecoveryFlowContextValue {
  readonly flow: RecoveryFlowState | null;
  setFlow(flow: RecoveryFlowState): void;
  clearFlow(): void;
}

const RecoveryFlowContext = createContext<RecoveryFlowContextValue | null>(null);

export const RecoveryFlowProvider = ({ children }: { readonly children: ReactNode }) => {
  const [flow, setFlowValue] = useState<RecoveryFlowState | null>(null);
  const value = useMemo<RecoveryFlowContextValue>(() => ({
    flow,
    setFlow: (next) => setFlowValue(Object.freeze({ ...next })),
    clearFlow: () => setFlowValue(null),
  }), [flow]);
  return <RecoveryFlowContext.Provider value={value}>{children}</RecoveryFlowContext.Provider>;
};

export const useRecoveryFlow = (): RecoveryFlowContextValue => {
  const value = useContext(RecoveryFlowContext);
  if (!value) throw new Error("RecoveryFlowProviderMissing");
  return value;
};
