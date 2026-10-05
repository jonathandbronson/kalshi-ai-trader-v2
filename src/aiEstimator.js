const ENDPOINT=process.env.OPENAI_API_URL??"https://api.openai.com/v1/responses";
const MODEL=process.env.OPENAI_MODEL??"gpt-6-luna";

function extractText(data){
 if(typeof data.output_text==="string")return data.output_text;
 return (data.output??[]).flatMap(x=>x.content??[]).filter(x=>x.type==="output_text").map(x=>x.text).join("");
}
function parseJson(text){
 const cleaned=String(text).trim().replace(/^\`\`\`(?:json)?/i,"").replace(/\`\`\`$/,"").trim();
 return JSON.parse(cleaned);
}
export function aiConfigured(){return Boolean(process.env.OPENAI_API_KEY);}
export async function estimateFromEvidence({market,packet}){
 if(!aiConfigured())throw new Error("AI estimator is not configured. Set OPENAI_API_KEY in the runtime environment.");
 const evidence=packet.evidence.map((e,i)=>({id:i+1,source:e.source,claim:e.claim,publishedAt:e.publishedAt,reliability:e.reliability,url:e.url}));
 const instructions=`You are a calibrated forecasting engine. Estimate the probability that the event resolves YES using ONLY the supplied resolution criteria and evidence. Never infer or use prediction-market prices, betting odds, Kalshi prices, or crowd probabilities. Distinguish facts from weak signals, account for base rates when possible, seek disconfirming evidence, and widen uncertainty when evidence is thin. Return JSON only with keys probability (0-1), confidence (0-1), low (0-1), high (0-1), rationale (string <= 900 chars), evidence_assessment (array of {id,impact:"yes"|"no"|"neutral",strength:0-1}), and caveats (array of strings). Do not include markdown.`;
 const input=JSON.stringify({question:market.title,resolutionCriteria:packet.resolutionCriteria||market.rulesPrimary,category:packet.category,evidence});
 const r=await fetch(ENDPOINT,{method:"POST",headers:{"authorization":`Bearer ${process.env.OPENAI_API_KEY}`,"content-type":"application/json"},body:JSON.stringify({model:MODEL,instructions,input,store:false})});
 if(!r.ok)throw new Error(`AI estimator failed (${r.status}): ${(await r.text()).slice(0,300)}`);
 const parsed=parseJson(extractText(await r.json()));
 const p=Number(parsed.probability),confidence=Number(parsed.confidence),low=Number(parsed.low),high=Number(parsed.high);
 for(const [k,v] of Object.entries({probability:p,confidence,low,high}))if(!Number.isFinite(v)||v<0||v>1)throw new Error(`AI estimator returned invalid ${k}`);
 if(low>p||high<p)throw new Error("AI estimator returned invalid probability interval");
 return {...parsed,probability:p,confidence,low,high,model:MODEL,estimatedAt:new Date().toISOString()};
}
