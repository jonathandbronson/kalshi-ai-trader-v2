export async function fetchJson(url,options={}){
 for(let attempt=0;attempt<3;attempt++){
  try{await options.onAttempt?.(attempt+1);const {onAttempt,...requestOptions}=options;const r=await fetch(url,{...requestOptions,signal:AbortSignal.timeout(15000)});if(!r.ok){if(options.method!=="POST"&&[429,502,503,504].includes(r.status)&&attempt<2){await new Promise(r=>setTimeout(r,250*(attempt+1)));continue;}throw new Error(`Provider HTTP ${r.status}`);}return await r.json();}
  catch(e){if(attempt===2||options.method==="POST"||!/timeout|fetch failed/i.test(e.message))throw new Error("Provider request failed",{cause:e});}
 }
}
