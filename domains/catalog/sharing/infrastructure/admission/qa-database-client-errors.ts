import type { PoolClient } from "pg";
const observed=new WeakSet<object>();
/** pg may emit a second Client error after the active query rejects. Consume that
 * transport event without serializing its secret-bearing driver object. Query and
 * pool failure paths still reject; this never turns a failed operation into Allow. */
export function observeQaDatabaseClient(client:PoolClient):void {
 if(observed.has(client))return;
 observed.add(client);client.on("error",()=>{});
}
