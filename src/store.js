import {mkdir,readFile,writeFile} from "node:fs/promises";
import {dirname} from "node:path";
const PATH=process.env.DATA_PATH??"./data/state.json";
const blank=()=>({research:{},analyses:{},paperTrades:[]});
export async function loadState(){try{return JSON.parse(await readFile(PATH,"utf8"));}catch(e){if(e.code==="ENOENT")return blank();throw e;}}
export async function saveState(state){await mkdir(dirname(PATH),{recursive:true});await writeFile(PATH,JSON.stringify(state,null,2));return state;}
export async function saveResearch(packet){const s=await loadState();s.research[packet.ticker]=packet;await saveState(s);return packet;}
export async function saveAnalysis(a){const s=await loadState();s.analyses[a.ticker]={...a,savedAt:new Date().toISOString()};await saveState(s);return a;}
