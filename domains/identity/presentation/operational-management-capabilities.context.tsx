"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { OperationalManagementCapabilitiesClient } from "./operational-management-capabilities.client";
import { mountOperationalManagementCapabilities, type OperationalManagementCapabilitiesCoordinator } from "./operational-management-capabilities.coordinator";
import type { OperationalManagementCapabilityState } from "./operational-management-capabilities.types";

interface CapabilityContextValue {
  readonly state: OperationalManagementCapabilityState;
  readonly refresh: () => void;
}

const loading: OperationalManagementCapabilityState = Object.freeze({ type: "Loading" });
const CapabilityContext = createContext<CapabilityContextValue>({ state: { type: "Idle" }, refresh: () => undefined });

export const OperationalManagementCapabilitiesProvider = ({ lifecycle, onAuthenticationRequired, children }: {
  /** Opaque authenticated view identity; no actor fields are inspected. */
  readonly lifecycle: object;
  readonly onAuthenticationRequired: () => void;
  readonly children: ReactNode;
}) => {
  const [snapshot, setSnapshot] = useState<{ lifecycle: object; state: OperationalManagementCapabilityState } | null>(null);
  const mounted = useRef<{ lifecycle: object; coordinator: OperationalManagementCapabilitiesCoordinator } | null>(null);

  useEffect(() => {
    const coordinator = mountOperationalManagementCapabilities(new OperationalManagementCapabilitiesClient(), {
      onChange: (state) => setSnapshot({ lifecycle, state }),
      onAuthenticationRequired,
    });
    mounted.current = { lifecycle, coordinator };
    return () => {
      coordinator.dispose();
      if (mounted.current?.coordinator === coordinator) mounted.current = null;
    };
  }, [lifecycle, onAuthenticationRequired]);

  const refresh = useCallback(() => {
    if (mounted.current?.lifecycle === lifecycle) void mounted.current.coordinator.refresh();
  }, [lifecycle]);
  // Hide an earlier authenticated snapshot immediately, before replacement effects run.
  const state = snapshot?.lifecycle === lifecycle ? snapshot.state : loading;
  return <CapabilityContext.Provider value={{ state, refresh }}>{children}</CapabilityContext.Provider>;
};

export const useOperationalManagementCapabilities = (): CapabilityContextValue => useContext(CapabilityContext);
