// Optional real neural embeddings for discovery. API calls require explicit opt-in.
// Cache is keyed by market ID and text fingerprint; stale vectors are regenerated.
import {marketId,marketText,fingerprintText} from "./semantic-retrieval.js";
export function selectEmbeddingInputs(kalshi,polymarket,cache={},limitPerVenue=300){
 const entries=[];
 for(const [venue,events] of [["kalshi",kalshi],["polymarket",polymarket]]){
  let count=0;
  for(const event of events)for(const market of event.markets??[]){
   if(count>=limitPerVenue)break;
   if(!market.ticker&&!market.id)continue;
   const id=marketId(venue,market),text=marketText(market,event),hash=fingerprintText(text);
   if(text.length<8)continue;
   count++;
   if(cache[id]?.hash===hash&&Array.isArray(cache[id]?.vector)&&cache[id].vector.length)continue;
   entries.push({id,text,hash});
  }
 }
 return entries;
}
export async function generateEmbeddings(inputs,{apiKey=process.env.OPENAI_API_KEY,model=process.env.ARB_EMBEDDING_MODEL??"text-embedding-3-small",fetcher=fetch,batchSize=100}={}){
 if(!apiKey)throw Error("Embedding API key required; never silently use lexical vectors");
 const result={};let calls=0;
 for(let i=0;i<inputs.length;i+=batchSize){
  const batch=inputs.slice(i,i+batchSize),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{
   const response=await fetcher("https://api.openai.com/v1/embeddings",{method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json",Authorization:"Bearer "+apiKey},body:JSON.stringify({model,input:batch.map(x=>x.text)})});
   if(!response.ok)throw Error("EMBEDDING_HTTP_"+response.status);
   const payload=await response.json();
   if(payload.data?.length!==batch.length)throw Error("Embedding count mismatch");
   for(const entry of payload.data){
    const item=batch[entry.index];
    if(!item||!Array.isArray(entry.embedding)||!entry.embedding.length||!entry.embedding.every(Number.isFinite))throw Error("Invalid embedding payload");
    result[item.id]={hash:item.hash,vector:entry.embedding,model};
   }
   calls++;
  }finally{clearTimeout(timer)}
 }
 return {vectors:result,calls};
}
