import type {
  OperationalManagementCapabilitiesView,
  OperationalManagementCapabilityResult,
  OperationalManagementCapabilityState,
  OperationalManagementSection,
} from "./operational-management-capabilities.types";

export const operationalManagementSections = (
  value: OperationalManagementCapabilitiesView,
): readonly OperationalManagementSection[] => {
  const sections: OperationalManagementSection[] = [];
  if (value.branches.canView || value.branches.canManage || value.listing.canManage) sections.push("Branches");
  if (value.inventory.canViewAvailability || value.inventory.canViewQuantities || value.inventory.canReceive
    || value.inventory.canIssue || value.inventory.canReserve || value.inventory.canTransfer
    || value.inventory.canManageDamage || value.inventory.canAdjust) sections.push("Inventory");
  if (value.pricing.canView || value.pricing.canViewWholesale || value.pricing.canManageWorkspace
    || value.pricing.canManageBranchOverrides || value.referenceCost.canView
    || value.referenceCost.canManageWorkspace || value.referenceCost.canManageBranchOverrides) sections.push("Pricing");
  return Object.freeze(sections);
};

export const hasOperationalManagementCapability = (value: OperationalManagementCapabilitiesView): boolean =>
  operationalManagementSections(value).length > 0;

/** No destination exists in P1.1. A visible section is never write authority. */
export const operationalManagementNavigationStatus = (
  state: OperationalManagementCapabilityState,
): "Hidden" | "NavigationLinkBlockedUntilP1.2" =>
  state.type === "Ready" && hasOperationalManagementCapability(state.value)
    ? "NavigationLinkBlockedUntilP1.2"
    : "Hidden";

interface CapabilityPort {
  load(signal?: AbortSignal): Promise<OperationalManagementCapabilityResult>;
}

interface CapabilityEvents {
  readonly onChange: (state: OperationalManagementCapabilityState) => void;
  /** The authenticated caller supplies its existing useSessionExpiryRedirect callback. */
  readonly onAuthenticationRequired: () => void;
}

/** One instance per authenticated lifecycle; dispose before replacing that lifecycle. */
export class OperationalManagementCapabilitiesCoordinator {
  private state: OperationalManagementCapabilityState = { type: "Idle" };
  private disposed = false;
  private generation = 0;
  private controller: AbortController | null = null;
  private pending: Promise<void> | null = null;

  constructor(private readonly port: CapabilityPort, private readonly events: CapabilityEvents) {}

  getState(): OperationalManagementCapabilityState { return this.state; }

  load(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (this.pending) return this.pending;
    const generation = ++this.generation;
    const controller = new AbortController();
    this.controller = controller;
    this.publish({ type: "Loading" });
    const pending = this.read(generation, controller.signal).finally(() => {
      if (this.generation === generation) { this.pending = null; this.controller = null; }
    });
    this.pending = pending;
    return pending;
  }

  refresh(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.generation++;
    this.controller?.abort();
    this.pending = null;
    return this.load();
  }

  dispose(): void {
    this.disposed = true;
    this.generation++;
    this.controller?.abort();
    this.controller = null;
    this.pending = null;
    this.state = { type: "Idle" };
  }

  private publish(state: OperationalManagementCapabilityState): void {
    this.state = Object.freeze(state);
    this.events.onChange(this.state);
  }

  private async read(generation: number, signal: AbortSignal): Promise<void> {
    let result: OperationalManagementCapabilityResult;
    try { result = await this.port.load(signal); }
    catch { result = { ok: false, kind: "Unavailable" }; }
    if (this.disposed || generation !== this.generation || signal.aborted) return;
    this.publish(result.ok ? { type: "Ready", value: result.value } : { type: "Failed", kind: result.kind });
    if (!result.ok && result.kind === "AuthenticationRequired" && !this.disposed && generation === this.generation) {
      this.events.onAuthenticationRequired();
    }
  }
}
