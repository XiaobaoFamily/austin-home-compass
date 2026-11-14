/** Scheduler scaffold. No data-source adapter has been validated yet. */
interface Env { SUPABASE_URL:string; SUPABASE_SERVICE_ROLE_KEY:string; INGESTION_ENABLED:string }
export default {
 fetch():Response { return Response.json({service:'home-compass-ingest',status:'not_configured',automaticCollection:false}); },
 async scheduled(_event:unknown,env:Env):Promise<void> {
  if(env.INGESTION_ENABLED !== 'true') {console.log('Ingestion disabled: source adapters pending validation.');return;}
  if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Missing Supabase server configuration.');
  const response=await fetch(new URL('/rest/v1/ingestion_runs',env.SUPABASE_URL),{
   method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json'},
   body:JSON.stringify({source:'scheduler',status:'failed',message:'No validated source adapters configured. No market data was modified.'})
  });
  if(!response.ok)throw new Error(`Ingestion log write failed: ${response.status}`);
  throw new Error('Source adapters are not implemented. Keep scheduling disabled.');
 }
};
