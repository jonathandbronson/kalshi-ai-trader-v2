import {config} from "./config.js";
export function suggestedPaperFraction({edge,evidenceQuality=.5,confidence=.5}){
 if(![edge,evidenceQuality,confidence].every(Number.isFinite)||edge<config.minEdge||evidenceQuality<.55||confidence<=0)return 0;
 const edgeScale=Math.min(1,(edge-config.minEdge)/.12);
 const quality=Math.max(0,Math.min(1,(evidenceQuality+confidence)/2));
 return Math.min(config.maxFractionPerTrade,.005+.025*edgeScale*quality);
}
export function riskFlags({closeTime,volume=0,spread=null,evidenceQuality=.5}){
 const flags=[];
 if(Number(volume)<100)flags.push("LOW_LIQUIDITY");
 if(spread==null)flags.push("MISSING_SPREAD");
 if(spread!=null&&Number(spread)>.08)flags.push("WIDE_SPREAD");
 if(Number(evidenceQuality)<.55)flags.push("WEAK_EVIDENCE");
 if(closeTime&&new Date(closeTime).getTime()-Date.now()<60*60*1000)flags.push("CLOSE_TO_RESOLUTION");
 return flags;
}
