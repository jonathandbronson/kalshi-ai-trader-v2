import {createHash} from "node:crypto";
import {publicDocument,decodeText,plainText,attributes} from "./publicDocuments.js";
import {assertIndependent} from "./contamination.js";
export const BLS_CPI_FEED="https://www.bls.gov/feed/cpi.rss";
export const FED_FEED="https://www.federalreserve.gov/feeds/press_monetary.xml";
export const BBC_BUSINESS_FEED="https://feeds.bbci.co.uk/news/business/rss.xml";
const feeds=new Set([BLS_CPI_FEED,FED_FEED,BBC_BUSINESS_FEED]);
const value=(body,name)=>decodeText(body.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`,"i"))?.[1]??"").trim();
export function parseFeed(text,feedUrl){
 if(!feeds.has(feedUrl)||/<!DOCTYPE|<!ENTITY/i.test(text)||! /^\s*(?:<\?xml[^>]*>\s*)?<(?:rss|feed)\b/i.test(text))throw new Error("Unsupported public feed");
 return [...text.matchAll(/<(entry|item)\b[^>]*>([\s\S]*?)<\/\1>/gi)].slice(0,50).map(m=>{
  const body=m[2],atom=m[1].toLowerCase()==="entry";
  const url=atom?attributes(body.match(/<link\b[^>]*>/i)?.[0]??"").href:value(body,"link");
  return {source:new URL(feedUrl).hostname,title:plainText(value(body,"title")),claim:plainText(value(body,"description")||value(body,"title")),url,
   publishedAt:value(body,atom?"published":"pubDate")||undefined,feedUrl,feedBody:atom?value(body,"content"):null,headlineOnly:true};
 }).filter(e=>e.url?.startsWith("https://"));
}
export async function readFeed(url){
 if(!feeds.has(url))throw new Error("Unsupported public feed destination");
 return parseFeed((await publicDocument(url,"application/atom+xml, application/rss+xml, application/xml, text/xml")).text,url);
}
export function blsFeedReport(entry){
 if(entry.feedUrl!==BLS_CPI_FEED||new URL(entry.url).hostname!=="www.bls.gov")throw new Error("Unsupported official feed report");
 const body=plainText(entry.feedBody??"");assertIndependent(body);
 if(body.length<200||!Number.isFinite(Date.parse(entry.publishedAt)))throw new Error("Insufficient dated official feed content");
 const claim=[entry.title,body].filter(Boolean).join(". ");assertIndependent(claim);
 return {source:"bls.gov",url:BLS_CPI_FEED,canonicalUrl:entry.url,originId:entry.url,claim,publishedAt:entry.publishedAt,
  retrievedAt:new Date().toISOString(),sourceType:"PRIMARY",headlineOnly:false,contentHash:createHash("sha256").update(claim).digest("hex"),
  provenance:{format:"OFFICIAL_ATOM_RELEASE_EXCERPT",feedUrl:BLS_CPI_FEED,canonicalUrl:entry.url,publicationField:"entry.published",excerpt:true}};
}
