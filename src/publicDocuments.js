// Public retrieval only: no credentials, redirects, challenge solving or cookies.
export async function publicDocument(url,accept="text/html"){
 const r=await fetch(url,{signal:AbortSignal.timeout(12000),redirect:"error",headers:{accept}});
 if(!r.ok){await r.body?.cancel();const e=new Error(`Public document HTTP ${r.status}`);e.status=r.status;throw e;}
 const type=r.headers.get("content-type")??"";
 if(!/(?:html|xml|rss|atom|text\/plain)/i.test(type)){await r.body?.cancel();throw new Error("Unsupported document format");}
 const reader=r.body.getReader();let size=0;const parts=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>500000)throw new Error("Public document too large");parts.push(value);}}
 finally{await reader.cancel();}
 return {text:Buffer.concat(parts).toString("utf8"),type};
}
export function decodeText(s=""){
 return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&#(?:x([a-f0-9]+)|(\d+));/gi,(_,hex,decimal)=>{
  const n=parseInt(hex??decimal,hex?16:10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):" ";
 }).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,name)=>({amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" "})[name]);
}
export function plainText(html){
 return decodeText(html.replace(/<(script|style|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi," ").replace(/<!--[\s\S]*?-->/g," ").replace(/<[^>]*>/g," ")).replace(/&[^; ]+;/g," ").replace(/\s+/g," ").trim();
}
export function attributes(tag){
 return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m=>[m[1].toLowerCase(),decodeText(m[2]??m[3]??m[4])]));
}
// Balance the selected element, rather than stopping at its first nested </div>.
export function elementBody(html,predicate){
 const clean=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi," ").replace(/<!--[\s\S]*?-->/g," ");
 let name=null,start=0,depth=0;
 for(const t of clean.matchAll(/<\/?([a-z][\w:-]*)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)){
  if(!name){if(t[0].startsWith("</")||!predicate(t[1].toLowerCase(),attributes(t[0])))continue;
   name=t[1].toLowerCase();start=t.index+t[0].length;depth=1;continue;
  }
  if(t[1].toLowerCase()===name){depth+=t[0].startsWith("</")?-1:t[0].endsWith("/>")?0:1;if(!depth)return clean.slice(start,t.index);}
 }
 return null;
}
