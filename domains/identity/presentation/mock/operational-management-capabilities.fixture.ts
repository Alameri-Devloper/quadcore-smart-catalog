export const operationalManagementCapabilitiesFixture = () => ({
  branches: { canView: false, canManage: false },
  listing: { canManage: false },
  inventory: {
    canViewAvailability: false, canViewQuantities: false, canReceive: false, canIssue: false,
    canReserve: false, canTransfer: false, canManageDamage: false, canAdjust: false,
  },
  pricing: { canView: false, canViewWholesale: false, canManageWorkspace: false, canManageBranchOverrides: false },
  referenceCost: { canView: false, canManageWorkspace: false, canManageBranchOverrides: false },
});
