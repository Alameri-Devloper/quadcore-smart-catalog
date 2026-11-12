-- Independent operational migration namespace; never part of drizzle Catalog lineage.
-- Apply only to a newly guarded QA database, in one transaction with checksum ledger.
CREATE SCHEMA qsc_public_admission;
CREATE TABLE qsc_public_admission.policy (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 version text NOT NULL, source_key_fingerprint text NOT NULL,
 ready boolean NOT NULL DEFAULT false,
 pending_operation uuid,
 last_cleanup_ms bigint NOT NULL DEFAULT 0
);
CREATE TABLE qsc_public_admission.buckets (
 key text PRIMARY KEY, tokens numeric(30,0) NOT NULL CHECK(tokens >= 0),
 sampled_ms bigint NOT NULL, touched_ms bigint NOT NULL
);
CREATE INDEX buckets_cleanup ON qsc_public_admission.buckets(touched_ms);
CREATE TABLE qsc_public_admission.leases (
 lease_id uuid PRIMARY KEY, owner_id uuid NOT NULL,
 source_id text NOT NULL, workspace_id text NOT NULL, grant_id text NOT NULL,
 created_ms bigint NOT NULL
);
CREATE INDEX leases_owner ON qsc_public_admission.leases(owner_id);
CREATE INDEX leases_source ON qsc_public_admission.leases(source_id);
CREATE INDEX leases_workspace ON qsc_public_admission.leases(workspace_id);
CREATE INDEX leases_grant ON qsc_public_admission.leases(grant_id);
CREATE TABLE qsc_public_admission.migrations (
 version integer PRIMARY KEY CHECK(version = 1), sha256 text NOT NULL CHECK(length(sha256)=64)
);

-- Three driver round trips: durable intent, atomic decision, definitive finalization.
-- Functions are SECURITY INVOKER and do not change Catalog/Identity data.
CREATE FUNCTION qsc_public_admission.prepare_operation(op uuid, fingerprint text)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE p qsc_public_admission.policy%ROWTYPE;
BEGIN
 PERFORM set_config('lock_timeout','50ms',true);
 PERFORM pg_advisory_lock(3230601);
 SELECT * INTO p FROM qsc_public_admission.policy WHERE singleton FOR UPDATE;
 IF NOT FOUND OR NOT p.ready OR p.pending_operation IS NOT NULL
  OR p.version <> 'p6-local-qa-a-o-v1' OR p.source_key_fingerprint <> fingerprint THEN RETURN false; END IF;
 UPDATE qsc_public_admission.policy SET pending_operation=op WHERE singleton;
 RETURN true;
END $$;

CREATE FUNCTION qsc_public_admission.decide_operation(
 op uuid, fingerprint text, specs jsonb, phase text, owner uuid, source text, workspace text, grant_key text)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
 p qsc_public_admission.policy%ROWTYPE;
 spec jsonb; b qsc_public_admission.buckets%ROWTYPE;
 now_ms bigint; available numeric; rate numeric; capacity numeric; cost numeric;
 wait_seconds integer := 0; missing_count integer; row_count integer;
 lease uuid; total integer; workspace_count integer; source_count integer; grant_count integer;
BEGIN
 PERFORM set_config('lock_timeout','50ms',true);
 -- Session lock ownership is required, not merely the presence of an intent UUID.
 IF NOT EXISTS (SELECT 1 FROM pg_locks WHERE pid=pg_backend_pid() AND locktype='advisory'
  AND classid=0 AND objid=3230601 AND objsubid=1 AND mode='ExclusiveLock' AND granted) THEN RAISE EXCEPTION 'AdmissionCoordinationUnavailable'; END IF;
 SELECT * INTO p FROM qsc_public_admission.policy WHERE singleton FOR UPDATE;
 IF NOT FOUND OR NOT p.ready OR p.pending_operation IS DISTINCT FROM op
  OR p.version <> 'p6-local-qa-a-o-v1' OR p.source_key_fingerprint <> fingerprint THEN RAISE EXCEPTION 'AdmissionStateUnreconciled'; END IF;
 -- Acquire all existing bucket locks in a total server order, then sample DB time.
 PERFORM key FROM qsc_public_admission.buckets
 WHERE key IN (SELECT value->>'key' FROM jsonb_array_elements(specs)) ORDER BY key COLLATE "C" FOR UPDATE;
 now_ms := floor(extract(epoch FROM clock_timestamp())*1000)::bigint;
 IF now_ms-p.last_cleanup_ms >= 60000 THEN
  DELETE FROM qsc_public_admission.buckets WHERE key IN (
   SELECT x.key FROM qsc_public_admission.buckets x WHERE x.touched_ms < now_ms-300000
    AND NOT EXISTS(SELECT 1 FROM qsc_public_admission.leases l WHERE
     x.key IN ('bytes:global','bytes:workspace:'||l.workspace_id,'bytes:source:'||l.source_id))
   ORDER BY x.touched_ms,x.key LIMIT 500);
  UPDATE qsc_public_admission.policy SET last_cleanup_ms=now_ms WHERE singleton;
 END IF;
 SELECT count(*) INTO row_count FROM qsc_public_admission.buckets;
 SELECT count(*) INTO missing_count FROM jsonb_array_elements(specs) s
  WHERE NOT EXISTS(SELECT 1 FROM qsc_public_admission.buckets x WHERE x.key=s.value->>'key');
 IF row_count+missing_count>50000 THEN RETURN jsonb_build_object('type','Unavailable'); END IF;
 FOR spec IN SELECT value FROM jsonb_array_elements(specs) ORDER BY value->>'key' COLLATE "C" LOOP
  rate := (spec->>'rate')::numeric; capacity := (spec->>'capacity')::numeric; cost := (spec->>'cost')::numeric;
  SELECT * INTO b FROM qsc_public_admission.buckets WHERE key=spec->>'key';
  IF NOT FOUND OR now_ms-b.touched_ms>300000 THEN available := capacity*1000;
  ELSE available := least(capacity*1000,b.tokens+greatest(0,now_ms-b.sampled_ms)*rate); END IF;
  IF available<cost*1000 THEN wait_seconds:=greatest(wait_seconds,least(60,greatest(1,ceil((cost*1000-available)/(rate*1000))::integer))); END IF;
 END LOOP;
 IF phase='MediaRead' THEN
  SELECT count(*),count(*) FILTER(WHERE workspace_id=workspace),count(*) FILTER(WHERE source_id=source),
   count(*) FILTER(WHERE workspace_id=workspace AND grant_id=grant_key)
  INTO total,workspace_count,source_count,grant_count FROM qsc_public_admission.leases;
  IF total>=4 OR workspace_count>=2 OR source_count>=2 OR grant_count>=2 THEN wait_seconds:=greatest(wait_seconds,1); END IF;
 END IF;
 IF wait_seconds>0 THEN RETURN jsonb_build_object('type','Denied','retryAfterSeconds',wait_seconds); END IF;
 FOR spec IN SELECT value FROM jsonb_array_elements(specs) ORDER BY value->>'key' COLLATE "C" LOOP
  rate := (spec->>'rate')::numeric; capacity := (spec->>'capacity')::numeric; cost := (spec->>'cost')::numeric;
  SELECT * INTO b FROM qsc_public_admission.buckets WHERE key=spec->>'key';
  IF NOT FOUND OR now_ms-b.touched_ms>300000 THEN available := capacity*1000;b.sampled_ms:=now_ms;
  ELSE available := least(capacity*1000,b.tokens+greatest(0,now_ms-b.sampled_ms)*rate); END IF;
  INSERT INTO qsc_public_admission.buckets(key,tokens,sampled_ms,touched_ms)
   VALUES(spec->>'key',available-cost*1000,greatest(now_ms,b.sampled_ms),now_ms)
   ON CONFLICT(key) DO UPDATE SET tokens=excluded.tokens,sampled_ms=excluded.sampled_ms,touched_ms=excluded.touched_ms;
 END LOOP;
 IF phase='MediaRead' THEN
  -- Random UUID supplied by pgcrypto is deliberately not required: use a client-random
  -- operation UUID as the unique exact lease ID. One operation can issue at most one lease.
  lease:=op;
  INSERT INTO qsc_public_admission.leases VALUES(lease,owner,source,workspace,grant_key,now_ms);
 END IF;
 RETURN jsonb_build_object('type','Allowed','leaseId',lease);
END $$;

CREATE FUNCTION qsc_public_admission.finalize_operation(op uuid, fingerprint text)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE changed integer;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_locks WHERE pid=pg_backend_pid() AND locktype='advisory'
  AND classid=0 AND objid=3230601 AND objsubid=1 AND mode='ExclusiveLock' AND granted) THEN RAISE EXCEPTION 'AdmissionCoordinationUnavailable'; END IF;
 UPDATE qsc_public_admission.policy SET pending_operation=NULL WHERE singleton AND ready AND pending_operation=op AND version='p6-local-qa-a-o-v1' AND source_key_fingerprint=fingerprint;
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>1 THEN RAISE EXCEPTION 'AdmissionStateUnreconciled'; END IF;
 PERFORM pg_advisory_unlock(3230601);
 RETURN true;
END $$;
