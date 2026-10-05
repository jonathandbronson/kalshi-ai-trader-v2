export function brierScore(predictions){
 if(!predictions.length) return null;
 return predictions.reduce((s,p)=>s+(Number(p.probability)-Number(p.outcome))**2,0)/predictions.length;
}
export function calibrationBins(predictions,bins=10){
 const out=Array.from({length:bins},(_,i)=>({low:i/bins,high:(i+1)/bins,count:0,predicted:0,actual:0}));
 for(const p of predictions){const pr=Math.max(0,Math.min(.999999,Number(p.probability)));const b=out[Math.floor(pr*bins)];b.count++;b.predicted+=pr;b.actual+=Number(p.outcome);}
 return out.filter(x=>x.count).map(x=>({...x,predicted:x.predicted/x.count,actual:x.actual/x.count}));
}
