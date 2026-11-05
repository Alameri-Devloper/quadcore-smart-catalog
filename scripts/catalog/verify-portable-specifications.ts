import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";

/** Disposable verification only. No application configuration is read. No operational apply. */
async function main(): Promise<void> {
  const root = process.cwd();
  const args = process.argv.slice(2);
  if (args.length !== 1 || !args[0].startsWith("--output=")) throw Error("Use --output=artifacts/task-reviews/NEW_DIRECTORY");
  const output = resolve(root, args[0].slice(9)), rel = relative(root, output).replaceAll("\\", "/");
  if (isAbsolute(rel) || !rel.startsWith("artifacts/task-reviews/") || rel.includes("..") || existsSync(output)) throw Error("A new task-owned evidence directory is required");
  mkdirSync(output, { recursive: true });
  const suffix = randomBytes(8).toString("hex"), name = "qsc-spec-config-test-" + suffix;
  const database = "qsc_spec_config_test_" + suffix, password = randomBytes(32).toString("hex");
  const clean = (text: string) => text.replaceAll(password, "[redacted]").replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[redacted-database-url]");
  function docker(args: string[]): string {
    const r = spawnSync("docker", args, { encoding: "utf8", windowsHide: true, timeout: 30000 });
    if (r.status !== 0) throw Error("DisposableDockerOperationFailed");
    return r.stdout.trim();
  }
  let id: string | undefined, verified = false, testsPassed = false;
  try {
    // --pull=never: use only the existing local compatible image.
    docker(["image", "inspect", "postgres:17-alpine", "--format", "{{.Id}}"]);
    id = docker(["run", "--detach", "--pull=never", "--name", name, "--label", "qsc.task=staff-portable-spec-config", "--memory", "512m", "--cpus", "1", "--publish", "127.0.0.1::5432", "--mount", "type=tmpfs,destination=/var/lib/postgresql/data", "--env", "POSTGRES_USER=qsc_portable_test", "--env", "POSTGRES_PASSWORD=" + password, "--env", "POSTGRES_DB=" + database, "postgres:17-alpine"]);
    if (!/^[a-f0-9]{64}$/.test(id)) throw Error("InvalidDisposableIdentity");
    const info = JSON.parse(docker(["inspect", id]))[0];
    const port = info.NetworkSettings.Ports["5432/tcp"];
    if (info.Id !== id || info.Name !== "/" + name || info.Config.Labels["qsc.task"] !== "staff-portable-spec-config" ||
      port?.length !== 1 || port[0].HostIp !== "127.0.0.1" ||
      !info.Mounts.some((m: { Type: string; Destination: string }) => m.Type === "tmpfs" && m.Destination === "/var/lib/postgresql/data") ||
      info.Mounts.some((m: { Type: string }) => m.Type === "bind" || m.Type === "volume")) throw Error("UnsafeDisposableConfiguration");
    verified = true;
    writeFileSync(resolve(output, "identity.json"), JSON.stringify({ name, id, database, image: info.Image, host: "127.0.0.1", port: port[0].HostPort, memoryBytes: info.HostConfig.Memory, nanoCpus: info.HostConfig.NanoCpus, mounts: info.Mounts.map((m: { Type: string; Destination: string }) => ({ type: m.Type, destination: m.Destination })) }, null, 2), { flag: "wx" });
    let ready = false;
    for (let n = 0; n < 40; n++) {
      const r = spawnSync("docker", ["exec", id, "pg_isready", "-U", "qsc_portable_test", "-d", database], { encoding: "utf8", windowsHide: true, timeout: 3000 });
      if (r.status === 0) { ready = true; break; }
      await new Promise<void>(resolve => setTimeout(resolve, 500));
    }
    if (!ready) throw Error("DisposablePostgreSQLNotReady");
    const url = "postgresql://qsc_portable_test:" + password + "@127.0.0.1:" + port[0].HostPort + "/" + database;
    const r = spawnSync(process.execPath, [resolve(root, "node_modules/tsx/dist/cli.mjs"), "--test", "domains/catalog/query/infrastructure/persistence/portable-specification-configuration.integration.test.ts"], {
      cwd: root, encoding: "utf8", windowsHide: true, timeout: 180000, maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, DATABASE_URL: "", DATABASE_SSL: "false", PORTABLE_SPEC_TEST_DATABASE_URL: url, PORTABLE_SPEC_TEST_CONTAINER_ID: id },
    });
    writeFileSync(resolve(output, "integration.log"), clean((r.stdout ?? "") + (r.stderr ?? "")), { flag: "wx" });
    testsPassed = r.status === 0 && !r.error;
    writeFileSync(resolve(output, "execution.json"), JSON.stringify({ exitCode: r.status, timedOutOrSpawnError: Boolean(r.error), testsPassed }, null, 2), { flag: "wx" });
    if (!testsPassed) throw Error("IsolatedQualificationFailedSeeRetainedLog");
  } finally {
    // Remove only this invocation's verified task-created disposable container.
    // Failed verification retains its container for inspection; no protected resource touched.
    if (id && verified && testsPassed) {
      const info = JSON.parse(docker(["inspect", id]))[0];
      if (info.Id !== id || info.Name !== "/" + name || info.Config.Labels["qsc.task"] !== "staff-portable-spec-config") throw Error("CleanupIdentityMismatch");
      docker(["rm", "--force", id]);
      writeFileSync(resolve(output, "cleanup.json"), JSON.stringify({ removedTaskCreatedContainer: id, sharedResourcesModified: false }), { flag: "wx" });
    }
    console.log(JSON.stringify({ output: rel, testsPassed, retainedContainer: testsPassed ? null : id ?? null }));
  }
}
void main().catch(() => { console.error("Portable verification stopped; inspect task-owned evidence. Credentials omitted."); process.exitCode = 1; });
