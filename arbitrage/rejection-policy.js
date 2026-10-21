// Reject-cache decisions are advisory and never constitute settlement approval.
const HARD=new Set(["interim_appointment_treatment","different_meeting_deadline_year","different_senate_election_cycle","subregion_vs_statewide_result"]);
export function canReuseRejection(record,{ruleHash,now=Date.now(),maxAgeDays=14}={}){
 if(!record||!HARD.has(record.reason)||!ruleHash||record.rulesHash!==ruleHash)return false;
 const seen=Date.parse(record.lastSeen??"");
 return Number.isFinite(seen)&&now>=seen&&now-seen<=maxAgeDays*86400000;
}
export function pruneRejections(rejections,{now=Date.now(),retentionDays=60}={}){
 const kept={};let expired=0;
 for(const [key,record] of Object.entries(rejections??{})){
  const seen=Date.parse(record?.lastSeen??"");
  if(!Number.isFinite(seen)||now-seen>retentionDays*86400000||now<seen){expired++;continue}
  kept[key]=record;
 }
 return {rejections:kept,expired};
}
