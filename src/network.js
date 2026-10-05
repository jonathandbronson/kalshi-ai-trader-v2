async function failureDetails(response){
 const reader=response.body?.getReader();if(!reader)return {};
 const parts=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>65536)return {};parts.push(value);}
  const error=JSON.parse(Buffer.concat(parts).toString("utf8")).error??{};
  const safe=value=>typeof value==="string"&&/^[a-z][a-z0-9_.]{0,60}$/.test(value)?value:undefined;
  const diagnostic=/input.*contain.*json|must.*contain.*word.*json/i.test(error.message??"")?"JSON_MODE_REQUIRES_JSON_INPUT":undefined;
  return {code:safe(error.code),type:safe(error.type),param:safe(error.param),...(diagnostic?{diagnostic}:{})};
 }catch{return {};}finally{await reader.cancel();}
}
export async function fetchJson(url,options={}){
 for(let attempt=0;attempt<3;attempt++){
  try{await options.onAttempt?.(attempt+1);const {onAttempt,...requestOptions}=options;const r=await fetch(url,{...requestOptions,redirect:"error",signal:AbortSignal.timeout(15000)});if(!r.ok){
   const details=await failureDetails(r);
   if(options.method!=="POST"&&[429,502,503,504].includes(r.status)&&attempt<2){
    const header=r.headers.get("retry-after"),delay=header==null?250*(attempt+1):/^\d+$/.test(header)?Number(header)*1000:Math.max(0,Date.parse(header)-Date.now());
    if(!Number.isFinite(delay)||delay>30000)throw Object.assign(new Error(`Provider HTTP ${r.status}; cooldown exceeds bounded retry budget`),{status:r.status,details});
    await new Promise(r=>setTimeout(r,delay));continue;
   }throw Object.assign(new Error(`Provider HTTP ${r.status}${details.code?` (${details.code})`:""}`),{status:r.status,details});
  }return await r.json();}
  catch(e){if(attempt===2||options.method==="POST"||!/timeout|fetch failed/i.test(e.message))throw new Error("Provider request failed",{cause:e});}
 }
}
