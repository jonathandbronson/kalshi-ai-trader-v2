// Human-readable review dashboard, not an approval mechanism.
import {readFile,writeFile} from "node:fs/promises";
const source=process.env.ARB_REVIEW_QUEUE_OUTPUT??"arbitrage-review-queue.json";
const destination=process.env.ARB_REVIEW_DASHBOARD_OUTPUT??"arbitrage-review-dashboard.md";
const queue=JSON.parse(await readFile(source,"utf8"));
const safe=s=>String(s??"").replace(/\|/g,"\\|").replace(/[\r\n]+/g," ").slice(0,180);
const rows=(queue.candidates??[]).map((c,i)=>{
 const flags=[...(c.ruleConflicts??[]),...(c.ruleEvidence?.warnings??[])];
 const k=c.kalshiTicker,p=c.polymarketId;
 const kLink=k?"[Kalshi](https://kalshi.com/markets/"+encodeURIComponent(k)+")":"n/a";
 const pLink=p?"[Polymarket](https://polymarket.com/market/"+encodeURIComponent(p)+")":"n/a";
 return "| "+[i+1,safe(c.category),safe(c.reviewScore),safe(c.kalshiTitle),safe(c.polymarketTitle),kLink,pLink,safe(c.evidenceRefreshStatus??"NOT_REFRESHED"),safe(flags.join("; ")||"Manual rule comparison required")].join(" | ")+" |";
});
const content=[
 "# Cross-exchange arbitrage: manual settlement review",
 "",
 "Generated: "+new Date().toISOString(),
 "",
 "**Research only. Zero contracts auto-approved. Similar market titles are not settlement evidence.**",
 "",
 "Discovery status: "+safe(queue.sourceStatus??"unknown")+"; candidate rows: "+rows.length+
 "; official detail refreshes: "+(queue.evidenceRefresh?.successful??0)+"/"+(queue.evidenceRefresh?.attempted??0)+".",
 "",
 "| # | Category | Rank score | Kalshi contract | Polymarket contract | Kalshi | Polymarket | Rule fetch | Review flags |",
 "| --- | --- | ---: | --- | --- | --- | --- | --- | --- |",
 ...rows,
 "",
 "## Reviewer checklist",
 "",
 "Confirm exact payout event, settlement authority, cutoff and timezone, cancellation and postponement clauses, contract eligibility, fees, and available liquidity on **both** venues. A listed closing time may differ from the resolution deadline. Record evidence and obtain explicit manual approval before moving any pair to the verified watchlist.",
 "",
 "Missing or stale rule details must block approval. Re-review if the official contract rules or dates change."
].join("\n")+"\n";
await writeFile(destination,content);
console.log(JSON.stringify({dashboardRows:rows.length,destination}));
