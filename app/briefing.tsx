'use client';
import{Lightbulb,ArrowUpRight}from'lucide-react';
import{SOURCES}from'@/lib/sources.mjs';
import type{Dataset,RecordItem}from'@/lib/types';
export default function DailyBrief({data,onOpen}:{data:Dataset|null;onOpen:(r:RecordItem)=>void}){
 if(!data?.brief)return null;const brief=data.brief;const stamp=new Intl.DateTimeFormat('en-NZ',{timeZone:'Pacific/Auckland',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(brief.generatedAt));
 return <section className="daily-brief"><div className="daily-brief-heading"><div><span className="pill"><Lightbulb size={14}/> SAVED AI RESEARCH BRIEFING</span><h2>The bigger picture</h2></div><span>Generated {stamp} NZ · {brief.recordCount} records considered</span></div><p className="muted">AI interpretation of publisher metadata. Verify the linked evidence before acting. Archived briefing; automatic AI generation is disabled. Independent of the filters below.</p><div className="daily-brief-grid">{brief.takeaways.map((item,i)=><article key={i}><span className="index-number">0{i+1}</span><h3>{item.title}</h3><p>{item.summary}</p><div className="brief-question">{item.question}</div><div className="brief-citations">{item.evidenceIds.map((id,j)=>{const row=data.records.find(r=>r.id===id);return row?<button key={id} onClick={()=>onOpen(row)}>[{j+1}] {SOURCES.find(s=>s.id===row.sourceId)?.name}<ArrowUpRight size={12}/></button>:null})}</div></article>)}</div></section>
}
