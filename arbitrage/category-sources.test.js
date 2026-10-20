import test from "node:test";
import assert from "node:assert/strict";
import {collectCategoryEvents,CATEGORIES} from "./category-sources.js";
test("category sources use filtered series and tags and deduplicate events",async()=>{
 const seen=[];
 const fetcher=async url=>{
  const u=new URL(url);seen.push(u);
  let data=[];
  if(u.pathname==="/tags")data=[{id:42,slug:"crypto",label:"Crypto"}];
  else if(u.pathname.endsWith("/series"))data={series:[{ticker:"KXBTC"}]};
  else if(u.hostname.includes("kalshi"))data={events:[{event_ticker:"KXBTC-1",title:"Bitcoin above 100k?",markets:[]}],cursor:""};
  else if(u.searchParams.has("tag_id"))data=[{id:7,title:"Bitcoin above 100k?",markets:[]}];
  return {ok:true,status:200,json:async()=>data};
 };
 const result=await collectCategoryEvents({fetcher,seriesPerCategory:1,tagsPerCategory:1,pagesPerSource:1});
 assert.equal(result.kalshi.length,1);assert.equal(result.poly.length,1);
 assert.ok(seen.some(u=>u.searchParams.get("series_ticker")==="KXBTC"));
 assert.ok(seen.some(u=>u.searchParams.get("tag_id")==="42"));
 assert.deepEqual(Object.keys(result.coverage),CATEGORIES);
});
test("source failures are visible without inventing events",async()=>{
 const fetcher=async()=>({ok:false,status:403});
 const result=await collectCategoryEvents({fetcher,seriesPerCategory:1,tagsPerCategory:1,pagesPerSource:1});
 assert.equal(result.kalshi.length,0);assert.equal(result.poly.length,0);
 assert.ok(result.errors.length>0);
});
