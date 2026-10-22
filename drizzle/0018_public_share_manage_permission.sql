ALTER TABLE "identity_membership_permissions" DROP CONSTRAINT "identity_membership_permissions_known_code";--> statement-breakpoint
ALTER TABLE "identity_membership_permissions" ADD CONSTRAINT "identity_membership_permissions_known_code" CHECK ("identity_membership_permissions"."permission_code" IN (
      'catalog.referenceData.view','catalog.referenceData.manage',
      'catalog.product.create','catalog.product.edit','catalog.product-entry-submission.read',
      'catalog.product-entry-media.upload','catalog.product.reference-cost.read','catalog.products.view',
      'catalog.products.create','catalog.products.edit','catalog.products.archive','catalog.productEntry.submit',
      'catalog.productMedia.upload','catalog.productMedia.retry','catalog.productMedia.reconciliation.manage',
      'catalog.productMedia.source.replace','catalog.sharing.publicLink.manage','catalog.sharing.create','catalog.sharing.aiRecommendation.generate',
      'pricing.view','pricing.manage','pricing.wholesale.view','pricing.branchOverride.manage',
      'referenceCost.view','referenceCost.manage','referenceCost.branchOverride.manage',
      'inventory.availability.view','inventory.quantity.view','inventory.receive','inventory.issue',
      'inventory.reserve','inventory.transfer','inventory.damage','inventory.adjust',
      'workspace.settings.view','workspace.settings.manage','workspace.audit.view','workspace.branches.view'
    ));