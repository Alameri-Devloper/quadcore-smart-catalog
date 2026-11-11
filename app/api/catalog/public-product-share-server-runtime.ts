import { createPublicProductShareServerApplication } from "../../../domains/catalog/sharing/infrastructure/public-product-share-server-runtime";
/** P5 candidate only: approved admission is mandatory and missing policy/schema fails closed.
 * Production deployment and employee availability remain separate acceptance/release gates.
 */
export const openPublicProductShareServerApplication = createPublicProductShareServerApplication;
