import assert from 'node:assert/strict';
import { it } from 'node:test';
import { evaluatePublicShareEligibility } from './public-product-share-eligibility';
import { publicShareResource } from '../mock/public-share-lifecycle.fixture';
import { ProductSpecificationValue } from '../../types/product-specification-value.value-object';
import type { PublicProductShareResourceState } from '../ports/public-product-share-unit-of-work.port';

const eligible = (resource: PublicProductShareResourceState) => evaluatePublicShareEligibility('p4-workspace', resource);
const mutations: Record<string,(r: PublicProductShareResourceState) => PublicProductShareResourceState> = {
  Draft: (r) => ({ ...r, productLifecycle: 'Draft' }), Archived: (r) => ({ ...r, productLifecycle: 'Archived' }),
  InactiveBranch: (r) => ({ ...r, branchStatus: 'Inactive' }), Unlisted: (r) => ({ ...r, listed: false }),
  MissingRetail: (r) => ({ ...r, workspaceRetail: null }), UnsupportedOverride: (r) => ({ ...r, branchRetail: { amountMinor: BigInt(1), currency: 'XXX' } }),
  NegativeOverride: (r) => ({ ...r, branchRetail: { amountMinor: BigInt(-1), currency: 'USD' } }),
  BlankName: (r) => ({ ...r, productName: '  ' }), UnsafeName: (r) => ({ ...r, productName: 'bad\u0000' }),
  SurrogateName: (r) => ({ ...r, productName: '\uD800' }), OversizeName: (r) => ({ ...r, productName: 'a'.repeat(513) }),
  NoTemplate: (r) => ({ ...r, template: null }), InternalEntry: (r) => ({ ...r, template: { ...r.template!, entries: r.template!.entries.map((e) => ({ ...e, publicVisibility: 'internal' })) } }),
  InactiveDefinition: (r) => ({ ...r, definitions: r.definitions.map((d) => ({ ...d, status: 'Inactive' })) }),
  ForeignDefinition: (r) => ({ ...r, definitions: r.definitions.map((d) => ({ ...d, workspaceId: 'foreign' })) }),
  MissingValue: (r) => ({ ...r, specificationValues: [] }), WrongType: (r) => ({ ...r, specificationValues: [ProductSpecificationValue.create({ specificationFieldId: 'p4-spec', value: 1 })] }),
  BlankValue: (r) => ({ ...r, specificationValues: [ProductSpecificationValue.create({ specificationFieldId: 'p4-spec', value: ' ' })] }),
  LongValue: (r) => ({ ...r, specificationValues: [ProductSpecificationValue.create({ specificationFieldId: 'p4-spec', value: 'x'.repeat(2049) })] }),
  UnsafeLabel: (r) => ({ ...r, definitions: r.definitions.map((d) => ({ ...d, displayName: 'bad\nlabel' })) }),
  BlankLabel: (r) => ({ ...r, definitions: r.definitions.map((d) => ({ ...d, displayName: '' })) }),
  UnsafeUnit: (r) => ({ ...r, definitions: r.definitions.map((d) => ({ ...d, unit: 'unsafe<unit>' })) }),
};
for (const [name, mutate] of Object.entries(mutations)) it(`Issuance eligibility rejects ${name} without internal fallback`, () => assert.equal(eligible(mutate(publicShareResource())), 'Ineligible'));
it('Zero Retail, zero number and false Boolean are eligible', () => {
  for (const [value,valueType] of [[0,'Number'],[false,'Boolean']] as const) {
    const r = publicShareResource(); assert.equal(eligible({ ...r, definitions: r.definitions.map((d) => ({ ...d, valueType })),
      specificationValues: [ProductSpecificationValue.create({ specificationFieldId: 'p4-spec', value })] }), 'Eligible');
  }
});
it('Current template alone selects specs; duplicate entries/order/values fail integrity', () => {
  const r = publicShareResource();
  assert.equal(eligible({ ...r, template: { ...r.template!, entries: [] } }), 'Ineligible');
  assert.equal(eligible({ ...r, template: { ...r.template!, entries: [...r.template!.entries,...r.template!.entries] } }), 'IntegrityFailure');
  assert.equal(eligible({ ...r, specificationValues: [...r.specificationValues,...r.specificationValues] }), 'IntegrityFailure');
});
it('NaN/infinity and unsafe text are omitted; legitimate Arabic and multiline text remain', () => {
  const r = publicShareResource();
  for (const value of [NaN, Infinity]) assert.equal(eligible({ ...r, definitions: r.definitions.map((d) => ({ ...d, valueType: 'Number' })),
    specificationValues: [ProductSpecificationValue.create({ specificationFieldId: 'p4-spec', value })] }), 'Ineligible');
  assert.equal(eligible({ ...r, specificationValues: [ProductSpecificationValue.create({ specificationFieldId: 'p4-spec', value: 'عربي\nنص\tآخر' })] }), 'Eligible');
});
it('Count and serialized aggregate limits never select an arbitrary first N', () => {
  const r = publicShareResource();
  const expand = (count: number, text: string) => ({ ...r, template: { ...r.template!, entries: Array.from({ length: count }, (_,i) => ({ ...r.template!.entries[0], specificationDefinitionId: `s-${i}`, sortOrder: i })) },
    definitions: Array.from({ length: count }, (_,i) => ({ ...r.definitions[0], id: `s-${i}` })),
    specificationValues: Array.from({ length: count }, (_,i) => ProductSpecificationValue.create({ specificationFieldId: `s-${i}`, value: text })) });
  assert.equal(eligible(expand(64,'value')), 'Eligible'); assert.equal(eligible(expand(65,'value')), 'Ineligible');
  assert.equal(eligible(expand(64,'x'.repeat(2048))), 'Ineligible');
});
