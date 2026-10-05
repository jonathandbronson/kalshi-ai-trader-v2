import {config} from "./config.js";
import {readdirSync,readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const root=new URL("./",import.meta.url);
export const codeFingerprint=createHash("sha256").update(readdirSync(root).filter(n=>n.endsWith(".js")).sort().map(n=>n+"\n"+readFileSync(new URL(n,root),"utf8")).join("\n")).digest("hex");

export const strategyMetadata={version:config.version,minEdge:config.minEdge,strongEdge:config.strongEdge,maxFractionPerTrade:config.maxFractionPerTrade,bankroll:config.simulatedBankroll,model:process.env.OPENAI_MODEL??"gpt-6-luna"};
export const strategyFingerprint=createHash("sha256").update(JSON.stringify({codeFingerprint,strategyMetadata})).digest("hex");
