import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import {
  DepartmentStorageSegment,
  ProductMediaFinalKey,
  ProductMediaStagingKey,
  ProductMediaStorageRootKey,
  ProductMediaTrashKey,
} from "./product-media-keys";
import { ProductMediaRoot } from "./product-media-root";
import { ProductMediaOperationId } from "./product-media-operation-id";
import { ProductMediaSlots } from "./product-media-slot";
import { ProductMediaPathPolicy } from "../services/product-media-path-policy";

const validRoot = (workspace = "ws", department = "phones", suffix = "0123456789abcdef"): ProductMediaStorageRootKey =>
  ProductMediaStorageRootKey.create(`workspaces/${workspace}/${department}/product--${suffix}`);

describe("Product Media root shape and immutable registry model", () => {
  it("accepts only the exact approved root shape and provides value equality", () => {
    const left = validRoot();
    const right = ProductMediaStorageRootKey.rehydrate(left.value);
    assert.equal(left.equals(right), true);
  });

  it("rejects arbitrary, nested, overlapping, traversal, reserved, and missing-collision roots", () => {
    const invalid = [
      "short/root",
      "other/ws/phones/product--0123456789abcdef",
      "workspaces/ws/phones/product--0123456789abcdef/nested",
      "workspaces/ws/phones",
      "workspaces/ws/_staging/product--0123456789abcdef",
      "workspaces/ws/phones/_trash--0123456789abcdef",
      "workspaces/ws/phones/product",
      "workspaces/ws/../product--0123456789abcdef",
      "workspaces/con/phones/product--0123456789abcdef",
    ];
    for (const key of invalid) assert.throws(() => ProductMediaStorageRootKey.create(key));
  });

  it("bounds Department segments and rejects reserved namespaces", () => {
    assert.equal(DepartmentStorageSegment.unclassified().value, "unclassified");
    assert.equal(DepartmentStorageSegment.create("mobile-phones").value, "mobile-phones");
    assert.throws(() => DepartmentStorageSegment.create("d".repeat(65)));
    for (const reserved of ["_staging", "_trash", "_variants", "con"]) {
      assert.throws(() => DepartmentStorageSegment.create(reserved));
    }
  });

  it("creates new roots only from identity inputs and defensively preserves timestamps", async () => {
    const source = new Date("2026-07-23T00:00:00.000Z");
    const root = await ProductMediaRoot.createNew({
      workspaceId: WorkspaceId.create("workspace-a"),
      productId: ProductId.create("product-a"),
      departmentSegment: DepartmentStorageSegment.unclassified(),
      productName: "Product",
      createdAt: source,
    });
    source.setUTCFullYear(2030);
    const exposed = root.createdAt;
    exposed.setUTCFullYear(2031);
    assert.equal(root.createdAt.toISOString(), "2026-07-23T00:00:00.000Z");
    assert.equal(Object.isFrozen(root), true);
  });

  it("strictly rehydrates only roots bound to the supplied WorkspaceId and ProductId", async () => {
    const workspaceId = WorkspaceId.create("workspace-a");
    const productId = ProductId.create("product-a");
    const created = await ProductMediaRoot.createNew({
      workspaceId,
      productId,
      departmentSegment: DepartmentStorageSegment.create("phones"),
      productCode: "PHONE 1",
      createdAt: new Date("2026-07-23T00:00:00.000Z"),
    });
    const input = { workspaceId, productId, storageRootKey: created.storageRootKey, createdAt: created.createdAt };
    assert.equal((await ProductMediaRoot.rehydrate(input)).storageRootKey.value, created.storageRootKey.value);
    await assert.rejects(ProductMediaRoot.rehydrate({ ...input, workspaceId: WorkspaceId.create("workspace-b") }));
    await assert.rejects(ProductMediaRoot.rehydrate({ ...input, productId: ProductId.create("product-b") }));
  });
});

describe("Product Media typed operation keys and deterministic root policy", () => {
  it("uses one canonical ProductMediaOperationId policy for commands, storage keys, and rehydration", () => {
    for (const value of ["a", "operation-1", "a.b_c-9", `a${"b".repeat(79)}`]) {
      assert.equal(ProductMediaOperationId.create(value).value, value);
      assert.equal(ProductMediaOperationId.rehydrate(value).value, value);
    }
    for (const value of ["", "A", "_staging", "_trash", "_variants", "con", "con.txt", "ends.", "../trash", "é", `a${"b".repeat(80)}`]) {
      assert.throws(() => ProductMediaOperationId.create(value));
    }
  });

  it("maps stable Main and Gallery slots to final keys", () => {
    const root = validRoot();
    assert.equal(ProductMediaSlots.fileName(ProductMediaSlots.main()), "main.webp");
    assert.equal(ProductMediaSlots.fileName(ProductMediaSlots.gallery(1)), "gallery-01.webp");
    assert.equal(ProductMediaSlots.fileName(ProductMediaSlots.gallery(99)), "gallery-99.webp");
    assert.equal(ProductMediaFinalKey.fromSlot(root, ProductMediaSlots.main()).value, `${root.value}/main.webp`);
    for (const value of [0, 100, 1.5]) assert.throws(() => ProductMediaSlots.gallery(value));
  });

  it("separates staging and trash namespaces under one explicit Product root", () => {
    const root = validRoot();
    const staging = ProductMediaStagingKey.create(root, "operation-1");
    const trash = ProductMediaTrashKey.create(root, "operation-1");
    assert.equal(staging.value, `${root.value}/_staging/operation-1.webp`);
    assert.equal(trash.value, `${root.value}/_trash/operation-1.webp`);
    assert.equal(staging.belongsTo(root), true);
    assert.equal(trash.belongsTo(root), true);
    assert.throws(() => ProductMediaStagingKey.create(root, "../trash"));
  });

  it("uses safe workspace IDs directly and hashes unsafe IDs deterministically", async () => {
    assert.equal(await ProductMediaPathPolicy.workspaceSegment(WorkspaceId.create("workspace-01")), "workspace-01");
    const first = await ProductMediaPathPolicy.workspaceSegment(WorkspaceId.create("مساحة العمل"));
    const second = await ProductMediaPathPolicy.workspaceSegment(WorkspaceId.create("مساحة العمل"));
    assert.match(first, /^workspace-[a-f0-9]{20}$/);
    assert.equal(first, second);
  });

  it("prevents case, normalization, and punctuation transformations from colliding", async () => {
    const values = ["ws-001", "WS-001", "é", "e\u0301", "workspace.one", "workspace one"];
    const segments = await Promise.all(values.map((value) => ProductMediaPathPolicy.workspaceSegment(WorkspaceId.create(value))));
    assert.equal(segments[0], "ws-001");
    assert.match(segments[1], /^workspace-[a-f0-9]{20}$/);
    assert.equal(new Set(segments).size, values.length);
    assert.equal(segments[1], await ProductMediaPathPolicy.workspaceSegment(WorkspaceId.create("WS-001")));
  });

  it("prefers ProductCode and always appends collision-resistant ProductId material", async () => {
    const common = { workspaceId: WorkspaceId.create("ws"), departmentSegment: DepartmentStorageSegment.create("phones") };
    const coded = await ProductMediaPathPolicy.storageRoot({ ...common, productId: ProductId.create("id-1"), productCode: "ABC 100", productName: "Ignored" });
    const other = await ProductMediaPathPolicy.storageRoot({ ...common, productId: ProductId.create("id-2"), productCode: "ABC 100", productName: "Ignored" });
    assert.match(coded.value, /\/abc-100--[a-f0-9]{16}$/);
    assert.notEqual(coded.value, other.value);
  });

  it("uses product for Arabic-only, unusable, and Windows-reserved readable names", async () => {
    for (const productName of ["هاتف عربي", "...", "CON"]) {
      const folder = await ProductMediaPathPolicy.productFolder({ productId: ProductId.create(`id-${productName}`), productName });
      assert.match(folder, /^product--[a-f0-9]{16}$/);
    }
  });

  it("preserves department or unclassified and remains deterministic within the root bound", async () => {
    const input = {
      workspaceId: WorkspaceId.create("unsafe workspace/with separators"),
      departmentSegment: DepartmentStorageSegment.unclassified(),
      productId: ProductId.create("p".repeat(200)),
      productName: "n".repeat(500),
    };
    const root = await ProductMediaPathPolicy.storageRoot(input);
    assert.equal(root.value, (await ProductMediaPathPolicy.storageRoot(input)).value);
    assert.match(root.value, /^workspaces\/workspace-[a-f0-9]{20}\/unclassified\//);
    assert.ok(root.value.length <= 512);
  });
});
