/** Read-only staging billing table check for GET /health.
 * Never report account/subscription records. The caller must guard it behind
 * STAGING_HEALTH_ONLY or STAGING_BILLING_ONLY, never production.
 */
export async function stagingBillingSchemaReady(db){
 if(!db||typeof db.prepare!=='function')return false;
 try{
  const result=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('billing_accounts','billing_events')").all();
  const names=new Set((result?.results||[]).map(row=>row?.name));
  return names.has('billing_accounts')&&names.has('billing_events');
 }catch{return false}
}
