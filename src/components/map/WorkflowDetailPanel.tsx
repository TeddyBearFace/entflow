import { useEffect, useState } from "react";
import { scoreWorkflow, type LocalScore } from "@/lib/local-scorer";
import { usePlan } from "@/hooks/usePlan";
import type { AnalysisResult } from "@/lib/analyst-types";

// Types
interface WorkflowDetail {
  id: string; name: string; hubspotFlowId: string; objectType: string; status: string;
  flowType: string; actionCount: number; enrollmentCriteria: any; actions: any; dataSources?: any[];
  hubspotCreatedAt: string; hubspotUpdatedAt: string; hubspotPortalId?: string;
  sourceDependencies: Array<{ id: string; type: string; severity: string; description: string; targetWorkflow: { id: string; name: string; status: string } | null }>;
  targetDependencies: Array<{ id: string; type: string; severity: string; description: string; sourceWorkflow: { id: string; name: string; status: string } }>;
  conflictWorkflows: Array<{ conflict: { id: string; type: string; severity: string; description: string } }>;
}
interface ParsedAction {
  stepNumber: number; icon: string; label: string; bg: string; text: string; border: string;
  summary: string; details: Array<{ label: string; value: string; section?: string }>; rawType: string;
}
interface WorkflowDetailPanelProps { portalId: string; workflowId: string; onClose: () => void }

// Config
const ATM: Record<string, { icon: string; label: string; bg: string; text: string; border: string }> = {
  "0-1": { icon:"\u23f1\ufe0f", label:"Delay", bg:"#F9FAFB", text:"#4B5563", border:"#E5E7EB" },
  "0-2": { icon:"\ud83d\udd00", label:"If/then branch", bg:"#FFFBEB", text:"#B45309", border:"#FDE68A" },
  "0-3": { icon:"\ud83d\udccc", label:"Create task", bg:"#ECFDF5", text:"#047857", border:"#A7F3D0" },
  "0-4": { icon:"\ud83d\udce7", label:"Send email", bg:"#FAF5FF", text:"#7C3AED", border:"#DDD6FE" },
  "0-5": { icon:"\u270f\ufe0f", label:"Set property", bg:"#EFF6FF", text:"#1D4ED8", border:"#BFDBFE" },
  "0-6": { icon:"\ud83d\udccb", label:"Copy property", bg:"#EFF6FF", text:"#1D4ED8", border:"#BFDBFE" },
  "0-7": { icon:"\ud83d\udd14", label:"Send notification", bg:"#FEFCE8", text:"#A16207", border:"#FEF08A" },
  "0-8": { icon:"\ud83d\udd14", label:"In-app notification", bg:"#FEFCE8", text:"#A16207", border:"#FEF08A" },
  "0-9": { icon:"\u27a1\ufe0f", label:"Enroll in workflow", bg:"#FFF7ED", text:"#C2410C", border:"#FED7AA" },
  "0-10":{ icon:"\ud83d\udd17", label:"Webhook", bg:"#EEF2FF", text:"#4338CA", border:"#C7D2FE" },
  "0-11":{ icon:"\ud83d\udcdd", label:"Add to list", bg:"#ECFDF5", text:"#047857", border:"#A7F3D0" },
  "0-12":{ icon:"\ud83d\udcdd", label:"Remove from list", bg:"#F9FAFB", text:"#4B5563", border:"#E5E7EB" },
  "0-13":{ icon:"\ud83d\udcb0", label:"Create deal", bg:"#ECFDF5", text:"#047857", border:"#A7F3D0" },
  "0-14":{ icon:"\ud83d\uddd1\ufe0f", label:"Clear property", bg:"#F9FAFB", text:"#4B5563", border:"#E5E7EB" },
  "0-15":{ icon:"\ud83d\udd04", label:"Rotate owner", bg:"#EFF6FF", text:"#1D4ED8", border:"#BFDBFE" },
  "0-16":{ icon:"\ud83c\udfab", label:"Create ticket", bg:"#ECFDF5", text:"#047857", border:"#A7F3D0" },
  "0-17":{ icon:"\ud83d\udd00", label:"Branch", bg:"#FFFBEB", text:"#B45309", border:"#FDE68A" },
  "0-18":{ icon:"\ud83c\udfe2", label:"Create company", bg:"#ECFDF5", text:"#047857", border:"#A7F3D0" },
  "0-19":{ icon:"\ud83d\udcbb", label:"Custom code", bg:"#EEF2FF", text:"#4338CA", border:"#C7D2FE" },
  "0-20":{ icon:"\u2139\ufe0f", label:"Unenroll from workflow", bg:"#FFF7ED", text:"#C2410C", border:"#FED7AA" },
  "0-35":{ icon:"\ud83d\udce7", label:"Format data", bg:"#F9FAFB", text:"#4B5563", border:"#E5E7EB" },
};
const OTC: Record<string, string> = { CONTACT:"#2E75B6", COMPANY:"#8E44AD", DEAL:"#27AE60", TICKET:"#E67E22", CUSTOM:"#95A5A6", UNKNOWN:"#95A5A6" };
const SS: Record<string, string> = { CRITICAL:"bg-red-100 text-red-800", WARNING:"bg-amber-100 text-amber-800", INFO:"bg-blue-100 text-blue-700" };
const DL: Record<string, string> = { PROPERTY_WRITE:"Property", PROPERTY_READ:"Property", CROSS_ENROLLMENT:"Enrollment", LIST_REFERENCE:"List", EMAIL_SEND:"Email", WEBHOOK:"Webhook", DELAY_CHAIN:"Delay", PROPERTY_WRITE_COLLISION:"Write Collision", CIRCULAR_DEPENDENCY:"Circular", INACTIVE_REFERENCE:"Inactive Ref", EMAIL_OVERLAP:"Email Overlap", ORPHANED_ENROLLMENT:"Orphaned" };
const KP: Record<string, string> = { hs_pipeline_stage:"Pipeline Stage", hs_pipeline:"Pipeline", lifecyclestage:"Lifecycle Stage", dealstage:"Deal Stage", hs_lead_status:"Lead Status", hubspot_owner_id:"Owner", email:"Email", firstname:"First Name", lastname:"Last Name", company:"Company", jobtitle:"Job Title", hs_analytics_source:"Original Source", hs_object_source_type:"Source Type", closedate:"Close Date", amount:"Amount", dealname:"Deal Name", subject:"Subject", hs_ticket_priority:"Ticket Priority", hs_ticket_category:"Ticket Category" };

function fp(p: string): string { return KP[p] || p.replace(/^hs_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }
function rv(v: string, p: string, sl: any, sol: any, pl: any): string {
  const isPS = /pipeline.?stage|dealstage/i.test(p), isPL = /^(hs_)?pipeline$/i.test(p), isLC = /lifecyclestage/i.test(p);
  const lcs: any = { subscriber:"Subscriber", lead:"Lead", marketingqualifiedlead:"MQL", salesqualifiedlead:"SQL", opportunity:"Opportunity", customer:"Customer" };
  function one(v: string) { const t = v.trim(); if (isPS && sl[t]) return sl[t]; if (isPS && sol[t]) return sol[t]; if (isPL && pl[t]) return pl[t]; if (isLC && lcs[t.toLowerCase()]) return lcs[t.toLowerCase()]; return t; }
  if (v.includes(";")) return v.split(";").map(one).join(", "); return one(v);
}
function fd(ms: number): string { const m = ms/60000; if (m<60) return `${Math.round(m)} min`; const h = m/60; if (h<24) return `${Math.round(h)} hr`; return `${Math.round(h/24)} day(s)`; }

// Parse actions
function parseActions(raw: any, sl: any, sol: any, pl: any, el: Record<string, { name: string; subject: string; fromName: string; fromEmail: string; replyTo: string; previewText: string }>, ll: Record<string, string>, dataSources?: any[]): ParsedAction[] {
  if (!raw || !Array.isArray(raw)) return [];
  const am = new Map<string, any>(); for (const a of raw) { if (a.actionId) am.set(a.actionId, a); }
  const refs = new Set<string>(); for (const a of raw) { if (a.connection?.nextActionId) refs.add(a.connection.nextActionId); }
  let sid: string|null = null; for (const a of raw) { if (a.actionId && !refs.has(a.actionId)) { sid = a.actionId; break; } }
  const ord: any[] = []; const vis = new Set<string>(); let cur = sid || raw[0]?.actionId;
  while (cur && am.has(cur) && !vis.has(cur)) { vis.add(cur); ord.push(am.get(cur)!); cur = am.get(cur)!.connection?.nextActionId; }
  for (const a of raw) { if (a.actionId && !vis.has(a.actionId)) ord.push(a); }

  const OBJ_TYPE_NAMES: Record<string, string> = {
    "0-1":"Contact","0-2":"Company","0-3":"Deal","0-5":"Ticket",
    "0-4":"Engagement","0-6":"Product","0-7":"Task","0-8":"Line Item",
    "0-11":"Marketing Event","0-14":"Feedback Submission","0-18":"Campaign",
    "0-19":"Form Submission","0-27":"Task","0-46":"Communication",
    "0-47":"Quote","0-48":"Call","0-49":"Email Activity","0-51":"Meeting",
    "0-52":"Postal Mail","0-54":"Cart","0-68":"Invoice","0-69":"Subscription",
    "0-101":"Payment","0-116":"Order",
    "CONTACT":"Contact","COMPANY":"Company","DEAL":"Deal","TICKET":"Ticket",
    "LINE_ITEM":"Line Item","PRODUCT":"Product","QUOTE":"Quote",
    "CALL":"Call","EMAIL":"Email","MEETING":"Meeting","TASK":"Task",
    "NOTE":"Note","INVOICE":"Invoice","ORDER":"Order",
    "SUBSCRIPTION":"Subscription","PAYMENT":"Payment",
    "contact":"Contact","company":"Company","deal":"Deal","ticket":"Ticket",
    "line_item":"Line Item","product":"Product","quote":"Quote",
  };
  const fetchedObjTypes = new Map<string, string>();
  if (dataSources && Array.isArray(dataSources)) {
    for (const ds of dataSources) {
      if (ds.name && ds.objectTypeId) {
        const idMatch = ds.name.match(/fetched_object_(\w+)/);
        const key = idMatch ? idMatch[1] : ds.name;
        let objName = OBJ_TYPE_NAMES[ds.objectTypeId];
        if (!objName) {
          if (/^2-\d+$/.test(ds.objectTypeId)) objName = "Custom Object";
          else objName = ds.objectTypeId.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        }
        fetchedObjTypes.set(key, objName);
      }
    }
  }
  for (const a of raw) {
    if (!a?.actionId) continue;
    const af = a.fields || {};
    const candidates = [af.targetObject, af.objectTypeId, af.target_object_type, a.objectTypeId].filter(Boolean);
    for (const to of candidates) {
      let objName = OBJ_TYPE_NAMES[String(to)];
      if (!objName) {
        const s = String(to);
        if (/^2-\d+$/.test(s)) objName = "Custom Object";
        else if (s === "SINGLE_CONNECTION" || s === "BRANCH") continue;
        else objName = s.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
      }
      fetchedObjTypes.set(String(a.actionId), objName);
      break;
    }
  }

  return ord.map((action, idx) => {
    const atid = action.actionTypeId || ""; const f = action.fields || {};
    const m = ATM[atid]; let icon = m?.icon||"\u2699\ufe0f", label = m?.label||"Action", bg = m?.bg||"#F9FAFB", text = m?.text||"#4B5563", border = m?.border||"#E5E7EB";
    if (!m) {
      if (f.listId||f.list_id||f.staticListId) { icon="\ud83d\udcdd"; label="Add to list"; bg="#ECFDF5"; text="#047857"; border="#A7F3D0"; }
      else if (f.content_id && f.content_id!=="0") { icon="\ud83d\udce7"; label="Send email"; bg="#FAF5FF"; text="#7C3AED"; border="#DDD6FE"; }
      else if (f.property_name) { icon="\u270f\ufe0f"; label="Set property"; bg="#EFF6FF"; text="#1D4ED8"; border="#BFDBFE"; }
      else if (f.flow_id) { icon="\u27a1\ufe0f"; label="Enroll in workflow"; bg="#FFF7ED"; text="#C2410C"; border="#FED7AA"; }
      else if (f.associations) { icon="\ud83d\udd17"; label="Set association"; bg="#EFF6FF"; text="#1D4ED8"; border="#BFDBFE"; }
      else if (f.targetObject) { icon="\ud83d\udcdd"; label="Fetch data"; bg="#EEF2FF"; text="#4338CA"; border="#C7D2FE"; }
    }
    let summary = label;
    const d: Array<{ label: string; value: string; section?: string }> = [];
    const hk = new Set<string>();

    function tv(val: string): string {
      const templates: Record<string, string> = {
        "{{ enrolled_object }}": "Enrolled record",
        "{{ enrolled_object.hubspot_owner_id }}": "Record owner",
        "{{ enrolled_object.hs_object_id }}": "Record ID",
        "{{ enrolled_object.email }}": "Contact email",
        "{{ enrolled_object.firstname }}": "Contact first name",
        "{{ enrolled_object.lastname }}": "Contact last name",
        "{{ enrolled_object.company }}": "Contact company",
        "{{ enrolled_object.phone }}": "Contact phone",
        "{{ enrolled_object.jobtitle }}": "Contact job title",
        "{{ enrolled_object.lifecyclestage }}": "Lifecycle stage",
        "{{ enrolled_object.hs_lead_status }}": "Lead status",
      };
      if (templates[val.trim()]) return templates[val.trim()];
      const fetchedMatch = val.match(/\{\{\s*fetched_objects\.fetched_object_(\w+)\.(\w+)\s*\}\}/);
      if (fetchedMatch) { const objType = fetchedObjTypes.get(fetchedMatch[1]) || "Object"; return `${objType} ${fp(fetchedMatch[2])}`; }
      const fetchedGeneric = val.match(/\{\{\s*fetched_objects\.[\w]+\.(\w+)\s*\}\}/);
      if (fetchedGeneric) return `${fp(fetchedGeneric[1])}`;
      const fetchedDeep = val.match(/\{\{\s*fetched_objects\.[^}]+\.(\w+)\s*\}\}/);
      if (fetchedDeep) return `${fp(fetchedDeep[1])}`;
      if (/\{\{\s*fetched_objects\./.test(val)) return "Associated object value";
      if (/^\{\{\s*enrolled_object\./.test(val)) { const prop = val.match(/enrolled_object\.(\w+)/)?.[1]; return prop ? `Record ${fp(prop)}` : "Record property"; }
      const objectPropMatch = val.match(/\{\{\s*(contact|deal|company|ticket|owner)\.(\w+)\s*\}\}/);
      if (objectPropMatch) { const obj = objectPropMatch[1].charAt(0).toUpperCase() + objectPropMatch[1].slice(1); return `${obj} ${fp(objectPropMatch[2])}`; }
      if (/^\{\{.*\}\}$/.test(val.trim())) { const inner = val.replace(/\{\{|\}\}/g, "").trim(); const cleaned = inner.replace(/fetched_objects?\.\w+\./g, "").replace(/enrolled_object\./g, ""); return cleaned ? `Dynamic: ${fp(cleaned)}` : "Dynamic value"; }
      return val;
    }
    function isTemplateVar(val: string): boolean { return /\{\{.*\}\}/.test(val); }
    function af(k: string, l: string, s?: string) {
      const v = f[k]; hk.add(k);
      if (!v || v==="" || v==="0") return;
      if (typeof v==="string") { const translated = isTemplateVar(v) ? tv(v) : v; d.push({label:l, value:translated, section:s}); }
      else if (typeof v==="number"||typeof v==="boolean") { d.push({label:l, value:String(v), section:s}); }
      else if (v?.staticValue!==undefined) { const sv = String(v.staticValue); d.push({label:l, value:isTemplateVar(sv)?tv(sv):sv, section:s}); }
    }

    switch (atid) {
      case "0-5": case "0-14": {
        const pn = f.property_name||f.propertyName; hk.add("property_name"); hk.add("propertyName"); hk.add("value");
        if (pn) { const dn = fp(pn); let rv2=""; const v=f.value; if (v?.staticValue) rv2=String(v.staticValue); else if (typeof v==="string") rv2=v;
          const isTV = isTemplateVar(rv2); const res = isTV ? tv(rv2) : rv2 ? rv(rv2,pn,sl,sol,pl) : "";
          summary=res?`${dn} → ${res}`:dn;
          d.push({label:"Property",value:dn,section:"Configuration"}); if(res) d.push({label:"New value",value:res,section:"Configuration"});
          if(rv2&&rv2!==res) d.push({label:"Raw value",value:rv2,section:"Technical"}); d.push({label:"Internal name",value:pn,section:"Technical"});
        } break;
      }
      case "0-6": {
        const s2=f.source_property, t2=f.target_property||f.property_name; hk.add("source_property"); hk.add("target_property"); hk.add("property_name");
        summary=s2&&t2?`${fp(s2)} → ${fp(t2)}`:label;
        if(s2) { d.push({label:"Source property",value:fp(s2),section:"Configuration"}); d.push({label:"Source (internal)",value:s2,section:"Technical"}); }
        if(t2) { d.push({label:"Target property",value:fp(t2),section:"Configuration"}); d.push({label:"Target (internal)",value:t2,section:"Technical"}); }
        break;
      }
      case "0-4": {
        const cid=f.content_id||f.contentId; hk.add("content_id"); hk.add("contentId");
        if(cid&&cid!=="0") { const ei=el[String(cid)]; summary=ei?.name||`Email #${cid}`;
          if(ei?.name) d.push({label:"Email name",value:ei.name,section:"Email Details"});
          if(ei?.subject) d.push({label:"Subject line",value:ei.subject,section:"Email Details"});
          if(ei?.previewText) d.push({label:"Email body",value:ei.previewText.slice(0, 200) + (ei.previewText.length > 200 ? "..." : ""),section:"Email Details"});
          if(ei?.fromName) d.push({label:"Sender name",value:ei.fromName,section:"Sender"});
          if(ei?.fromEmail) d.push({label:"Sender email",value:ei.fromEmail,section:"Sender"});
          if(ei?.replyTo) d.push({label:"Reply-to",value:ei.replyTo,section:"Sender"});
          d.push({label:"Email ID",value:String(cid),section:"Technical"});
        }
        hk.add("from_name"); hk.add("from_email"); hk.add("reply_to"); hk.add("reply_to_name");
        hk.add("subscription_id"); hk.add("subscription_name"); hk.add("campaignId"); hk.add("campaign_name");
        af("from_name","Sender name (override)","Sender"); af("from_email","Sender email (override)","Sender");
        af("reply_to","Reply-to (override)","Sender"); af("reply_to_name","Reply-to name","Sender");
        af("subscription_id","Subscription type","Settings"); af("subscription_name","Subscription name","Settings");
        af("campaignId","Campaign ID","Settings"); af("campaign_name","Campaign name","Settings");
        break;
      }
      case "0-9": case "0-20": {
        const fid=f.flow_id||f.flowId; hk.add("flow_id"); hk.add("flowId");
        if(fid) { summary=`Workflow ${fid}`; d.push({label:"Target workflow ID",value:String(fid),section:"Configuration"}); }
        break;
      }
      case "0-3": {
        const pts: string[] = []; hk.add("task_type"); hk.add("subject"); hk.add("body"); hk.add("due_time"); hk.add("priority"); hk.add("associations"); hk.add("use_explicit_associations"); hk.add("queue_id"); hk.add("for_object_type"); hk.add("owner_id"); hk.add("owner_assignment"); hk.add("send_default_reminder"); hk.add("reminder_minutes_before"); hk.add("notes");
        if(f.task_type) { const tm:any={TODO:"To-do",CALL:"Call",EMAIL:"Email"}; const tl=tm[f.task_type]||f.task_type; pts.push(tl.toLowerCase()); d.push({label:"Type",value:tl,section:"Task Details"}); }
        if(f.subject) { pts.push(`"${f.subject}"`); d.push({label:"Title",value:f.subject,section:"Task Details"}); }
        if(f.body) d.push({label:"Notes",value:f.body,section:"Task Details"});
        if(f.notes) d.push({label:"Notes",value:f.notes,section:"Task Details"});
        if(f.priority) { const pm:any={NONE:"None",LOW:"Low",MEDIUM:"Medium",HIGH:"High"}; d.push({label:"Priority",value:pm[f.priority]||f.priority,section:"Task Details"}); }
        if(f.owner_id) { const ownerVal = isTemplateVar(String(f.owner_id)) ? tv(String(f.owner_id)) : `Owner ID: ${f.owner_id}`; d.push({label:"Assigned to",value:ownerVal,section:"Assignment"}); }
        if(f.owner_assignment) {
          const oa = f.owner_assignment;
          const assignTypes: Record<string, string> = { CUSTOM: "Custom assignment", RECORD_OWNER: "Record owner", SPECIFIC_USER: "Specific user", ROUND_ROBIN: "Round robin" };
          const assignLabel = assignTypes[oa.type] || oa.type || "Assignment";
          let assignValue = assignLabel;
          if (oa.value) {
            if (oa.value.type === "OBJECT_PROPERTY") assignValue = `Record ${fp(oa.value.propertyName || "owner")}`;
            else if (oa.value.type === "SPECIFIC_USER" || oa.value.userId) assignValue = `User ID: ${oa.value.userId || oa.value.id || "unknown"}`;
            else if (oa.value.type === "TEAM") assignValue = `Team ID: ${oa.value.teamId || "unknown"}`;
            else if (typeof oa.value === "string") assignValue = isTemplateVar(oa.value) ? tv(oa.value) : oa.value;
          }
          d.push({label:"Assigned to", value:assignValue, section:"Assignment"});
          d.push({label:"Assignment type", value:assignLabel, section:"Assignment"});
        }
        if(f.for_object_type) d.push({label:"For object type",value:f.for_object_type,section:"Assignment"});
        if(f.queue_id) d.push({label:"Queue",value:`Queue ID: ${f.queue_id}`,section:"Assignment"});
        if(f.due_time) { const dt=f.due_time;
          if(dt.delta&&dt.timeUnit) { const ds=`${dt.delta} ${dt.timeUnit.toLowerCase()}`; pts.push(`due in ${ds}`); d.push({label:"Due in",value:ds,section:"Scheduling"}); }
          if(dt.timeOfDay) { const h=dt.timeOfDay.hour, mn=String(dt.timeOfDay.minute).padStart(2,"0"), ap=h>=12?"PM":"AM", h12=h>12?h-12:h===0?12:h; d.push({label:"Time",value:`${h12}:${mn} ${ap}`,section:"Scheduling"}); }
          if(dt.daysOfWeek) { const dn:any={MONDAY:"Mon",TUESDAY:"Tue",WEDNESDAY:"Wed",THURSDAY:"Thu",FRIDAY:"Fri",SATURDAY:"Sat",SUNDAY:"Sun"}; d.push({label:"Business days",value:dt.daysOfWeek.map((x:string)=>dn[x]||x).join(", "),section:"Scheduling"}); }
          if(dt.zoneId) d.push({label:"Timezone",value:dt.zoneId,section:"Scheduling"});
        }
        if(f.send_default_reminder!==undefined) d.push({label:"Send reminder",value:f.send_default_reminder==="true"||f.send_default_reminder===true?"Yes":"No",section:"Reminders"});
        if(f.reminder_minutes_before) { const rm=Number(f.reminder_minutes_before); d.push({label:"Reminder",value:rm>=1440?`${Math.round(rm/1440)} day(s) before`:rm>=60?`${Math.round(rm/60)} hour(s) before`:`${rm} min before`,section:"Reminders"}); }
        if(f.associations&&Array.isArray(f.associations)) { for(const a of f.associations) { const t=a.target, v=a.value;
          let al="Association"; if(t?.associationCategory) al=t.associationCategory==="HUBSPOT_DEFINED"?"HubSpot defined":t.associationCategory; if(t?.associationTypeId) al+=` (Type ${t.associationTypeId})`;
          d.push({label:al,value:v?.type==="ENROLLED_OBJECT"?"Enrolled record":v?.type||"Linked record",section:"Associations"});
        }}
        summary=pts.length>0?pts.join(" · "):"Create task"; break;
      }
      case "0-1": {
        hk.add("delayMillis"); hk.add("delay_millis"); hk.add("delta"); hk.add("timeUnit");
        const ms=f.delayMillis||f.delay_millis; if(ms) { const fmt=fd(Number(ms)); summary=`Wait ${fmt}`; d.push({label:"Duration",value:fmt,section:"Configuration"}); d.push({label:"Milliseconds",value:String(ms),section:"Technical"}); }
        else if(f.delta&&f.timeUnit) { summary=`Wait ${f.delta} ${f.timeUnit.toLowerCase()}`; d.push({label:"Duration",value:`${f.delta} ${f.timeUnit.toLowerCase()}`,section:"Configuration"}); }
        break;
      }
      case "0-10": {
        hk.add("url"); hk.add("method"); hk.add("webhook_url"); hk.add("requestBody"); hk.add("headers"); hk.add("authentication");
        if(f.url) { summary=f.url; d.push({label:"URL",value:f.url,section:"Request"}); }
        af("webhook_url","URL","Request"); af("method","Method","Request");
        if(f.requestBody) d.push({label:"Body",value:(typeof f.requestBody==="string"?f.requestBody:JSON.stringify(f.requestBody)).slice(0,300),section:"Request"});
        if(f.headers) d.push({label:"Headers",value:(typeof f.headers==="string"?f.headers:JSON.stringify(f.headers)).slice(0,200),section:"Request"});
        if(f.authentication) d.push({label:"Auth",value:(typeof f.authentication==="string"?f.authentication:JSON.stringify(f.authentication)).slice(0,200),section:"Request"});
        break;
      }
      case "0-11": case "0-12": {
        const lid=f.list_id||f.listId||f.staticListId; hk.add("list_id"); hk.add("listId"); hk.add("staticListId");
        if(lid) { const ln=ll[String(lid)]; summary=ln||`List #${lid}`; if(ln) d.push({label:"List name",value:ln,section:"Configuration"}); d.push({label:"List ID",value:String(lid),section:"Technical"}); }
        break;
      }
      case "0-7": case "0-8": {
        hk.add("subject"); hk.add("body"); hk.add("recipient"); hk.add("recipients"); hk.add("owner_property"); hk.add("team_id"); hk.add("user_id");
        if(f.subject) { summary=`Notify: ${f.subject}`; d.push({label:"Subject",value:f.subject,section:"Notification"}); }
        if(f.body) d.push({label:"Body",value:f.body,section:"Notification"});
        af("recipient","Recipient","Recipient"); af("recipients","Recipients","Recipient"); af("owner_property","Owner property","Recipient"); af("team_id","Team","Recipient"); af("user_id","User","Recipient");
        break;
      }
      case "0-13": {
        hk.add("pipeline"); hk.add("dealstage"); hk.add("dealname"); hk.add("amount"); hk.add("closedate"); hk.add("hubspot_owner_id");
        if(f.pipeline) d.push({label:"Pipeline",value:pl[f.pipeline]||f.pipeline,section:"Deal Details"});
        if(f.dealstage) d.push({label:"Stage",value:sl[f.dealstage]||sol[f.dealstage]||f.dealstage,section:"Deal Details"});
        af("dealname","Deal name","Deal Details"); af("amount","Amount","Deal Details"); af("closedate","Close date","Deal Details"); af("hubspot_owner_id","Owner","Deal Details");
        summary="Create deal"; break;
      }
      case "0-16": {
        hk.add("hs_pipeline"); hk.add("hs_pipeline_stage"); hk.add("subject"); hk.add("content"); hk.add("hs_ticket_priority"); hk.add("hs_ticket_category"); hk.add("hubspot_owner_id");
        af("subject","Subject","Ticket Details"); af("content","Description","Ticket Details"); af("hs_pipeline","Pipeline","Ticket Details"); af("hs_pipeline_stage","Stage","Ticket Details");
        af("hs_ticket_priority","Priority","Ticket Details"); af("hs_ticket_category","Category","Ticket Details"); af("hubspot_owner_id","Owner","Ticket Details");
        summary="Create ticket"; break;
      }
      case "0-18": { hk.add("name"); hk.add("domain"); hk.add("hubspot_owner_id"); af("name","Name","Company Details"); af("domain","Domain","Company Details"); af("hubspot_owner_id","Owner","Company Details"); summary="Create company"; break; }
      case "0-19": { hk.add("language"); hk.add("code"); hk.add("secretNames"); af("language","Language","Code"); if(f.code) { d.push({label:"Code",value:f.code.slice(0,500)+(f.code.length>500?"...":""),section:"Code"}); hk.add("code"); } summary="Custom code"; break; }
      case "0-15": { hk.add("owner_ids"); hk.add("property_name"); af("property_name","Owner property","Configuration"); if(f.owner_ids) { d.push({label:"Owner IDs",value:Array.isArray(f.owner_ids)?f.owner_ids.join(", "):String(f.owner_ids),section:"Configuration"}); hk.add("owner_ids"); } summary="Rotate owner"; break; }
      case "0-2": case "0-17": { summary="Branch logic"; break; }
      case "0-35": { af("formula","Formula","Configuration"); af("output_type","Output type","Configuration"); af("output_property","Output property","Configuration"); summary="Format data"; break; }
      default: {
        const lid=f.listId||f.list_id||f.staticListId; if(lid) { hk.add("listId"); hk.add("list_id"); hk.add("staticListId"); const ln=ll[String(lid)]; summary=ln||`List #${lid}`; if(ln) d.push({label:"List name",value:ln,section:"Configuration"}); d.push({label:"List ID",value:String(lid),section:"Technical"}); }
        const cid=f.content_id||f.contentId; if(cid&&cid!=="0") { hk.add("content_id"); hk.add("contentId"); const ei=el[String(cid)]; if(ei) { summary=ei.name; d.push({label:"Email",value:ei.name,section:"Configuration"}); if(ei.subject) d.push({label:"Subject",value:ei.subject,section:"Configuration"}); } }
        break;
      }
    }
    for (const [k, v] of Object.entries(f)) {
      if (hk.has(k)||v===null||v===undefined) continue;
      const sv = typeof v==="string"?v : typeof v==="number"||typeof v==="boolean"?String(v) : v?.staticValue!==undefined?String(v.staticValue) : null;
      if (sv!==null) { if (sv===""||sv==="0"||sv.length>200) continue; const displayVal = isTemplateVar(sv) ? tv(sv) : sv; d.push({label:fp(k),value:displayVal,section:"Other"}); }
    }
    d.push({label:"Action type ID",value:atid,section:"Technical"}); if(action.actionId) d.push({label:"Action ID",value:action.actionId,section:"Technical"});
    return { stepNumber:idx+1, icon, label, bg, text, border, summary, details:d, rawType:atid };
  });
}

// Enrollment
function parseEnrollment(c: any, sl: any, sol: any, pl: any): string[] {
  if (!c) return []; const l: string[] = [];
  const tl:any = { LIST_BASED:"Filter-based enrollment", EVENT_BASED:"Event-based", FORM_SUBMISSION:"Form submission", MANUAL:"Manual enrollment" };
  if (c.type) l.push(tl[c.type]||c.type.replace(/_/g," ").toLowerCase());
  if (c.shouldReEnroll) l.push("Re-enrollment: enabled");
  if (c.listFilterBranch) l.push(...wb(c.listFilterBranch,sl,sol,pl));
  if (c.unEnrollObjectsNotMeetingCriteria) l.push("Un-enroll when criteria no longer met");
  return l;
}
function wb(b:any,sl:any,sol:any,pl:any): string[] {
  const l:string[]=[]; if(b.filters) for(const f of b.filters) if(f.property&&f.operation) { l.push(`${fp(f.property)} ${dop(f.operation,f.property,sl,sol,pl)}`); }
  if(b.filterBranches) for(const c of b.filterBranches) { if(c.filterBranchType==="ASSOCIATION") { const ot:any={"0-1":"Contact","0-2":"Company","0-3":"Deal","0-5":"Ticket","0-8":"Note"}; l.push(`Associated ${(ot[c.objectTypeId]||"object").toLowerCase()}:`); } l.push(...wb(c,sl,sol,pl)); }
  return l;
}
function dop(o:any,p:string,sl:any,sol:any,pl:any): string {
  const op=o.operator||o.operationType||"",tp=o.type||"";
  const om:any={EQ:"equals",NEQ:"does not equal",IS_ANY_OF:"is any of",IS_NONE_OF:"is none of",IS_KNOWN:"is known",IS_NOT_KNOWN:"is unknown",CONTAINS:"contains",IS_BETWEEN:"is between",IS_AFTER:"is after",IS_BEFORE:"is before",GT:"greater than",LT:"less than"};
  const ol=om[op.toUpperCase()]||op.toLowerCase().replace(/_/g," ");
  if(tp==="TIME_RANGED") { const lo=dtp(o.lowerBoundTimePoint),up=dtp(o.upperBoundTimePoint); if(lo&&up) return `is between ${lo} and ${up}`; return `${ol} ${lo||up||""}`.trim(); }
  const vs=o.values||o.value; const rs=rvs(vs,p,sl,sol,pl); return rs?`${ol}: ${rs}`:ol;
}
function rvs(v:any,p:string,sl:any,sol:any,pl:any):string|null {
  if(v===undefined||v===null||v==="") return null;
  const isPS=/pipeline.?stage|dealstage/i.test(p),isPL=/^(hs_)?pipeline$/i.test(p),isLC=/lifecyclestage/i.test(p);
  const lcs:any={subscriber:"Subscriber",lead:"Lead",marketingqualifiedlead:"MQL",salesqualifiedlead:"SQL",opportunity:"Opportunity",customer:"Customer"};
  function one(v:string){const t=v.trim();if(isPS&&sl[t])return sl[t];if(isPS&&sol[t])return sol[t];if(isPL&&pl[t])return pl[t];if(isLC&&lcs[t.toLowerCase()])return lcs[t.toLowerCase()];return t;}
  if(Array.isArray(v)) return v.map((x:any)=>one(String(x))).join(", "); const s=String(v); if(s.includes(";")) return s.split(";").map(one).join(", "); return one(s);
}
function dtp(tp:any):string|null { if(!tp) return null; const r=tp.indexReference; if(r) { const m:any={TODAY:"today",NOW:"now"}; let b=m[r.referenceType]||r.referenceType?.toLowerCase().replace(/_/g," ")||""; if(tp.offset) { const p:string[]=[]; if(tp.offset.days)p.push(`${tp.offset.days}d`); if(tp.offset.hours)p.push(`${tp.offset.hours}h`); if(p.length)return`${b} + ${p.join(" ")}`; } return b; } return null; }

function parseDynRef(text: string): { obj: string; prop: string } | null {
  if (!text) return null;
  const match = text.match(/^(Line Item|Contact|Company|Deal|Ticket|Product|Quote|Invoice|Order|Meeting|Call|Task|Note|Custom Object|Object|Record) (.+)$/i);
  if (match) return { obj: match[1], prop: match[2] };
  const recordMatch = text.match(/^Record (owner|ID)$/i);
  if (recordMatch) return { obj: "Record", prop: recordMatch[1] };
  return null;
}
function isDynRef(text: string): boolean { return parseDynRef(text) !== null || /^Dynamic:/i.test(text) || /^Associated /i.test(text); }

const OBJ_TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Contact":       { bg: "#EFF6FF", text: "#2E75B6", border: "#BFDBFE" },
  "Company":       { bg: "#F5F3FF", text: "#8E44AD", border: "#DDD6FE" },
  "Deal":          { bg: "#ECFDF5", text: "#27AE60", border: "#A7F3D0" },
  "Ticket":        { bg: "#FFF7ED", text: "#E67E22", border: "#FED7AA" },
  "Line Item":     { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  "Product":       { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  "Quote":         { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  "Invoice":       { bg: "#FFF1F2", text: "#E11D48", border: "#FECDD3" },
  "Order":         { bg: "#FFF1F2", text: "#E11D48", border: "#FECDD3" },
  "Meeting":       { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" },
  "Call":          { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" },
  "Task":          { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
  "Email Activity":{ bg: "#FAF5FF", text: "#7C3AED", border: "#DDD6FE" },
  "Record":        { bg: "#F9FAFB", text: "#4B5563", border: "#E5E7EB" },
  "Custom Object": { bg: "#F9FAFB", text: "#4B5563", border: "#E5E7EB" },
};
const DEFAULT_TAG_COLOR = { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" };

function ObjTag({ name }: { name: string }) {
  const c = OBJ_TAG_COLORS[name] || DEFAULT_TAG_COLOR;
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-medium"
      style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      <svg className="w-3 h-3 opacity-50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101"/></svg>
      {name}
    </span>
  );
}

function ValueDisplay({ value }: { value: string }) {
  const parsed = parseDynRef(value);
  if (parsed) return <span className="flex-1 flex items-center gap-1"><ObjTag name={parsed.obj} /><span className="text-gray-700"> {parsed.prop}</span></span>;
  if (!isDynRef(value)) return <span className="text-gray-700 break-words flex-1">{value}</span>;
  return <span className="flex-1"><ObjTag name={value} /></span>;
}

function ActionStep({ action, isExpanded, onToggle }: { action: ParsedAction; isExpanded: boolean; onToggle: () => void }) {
  const hasDetails = action.details.length > 0;
  const sections = new Map<string, Array<{ label: string; value: string }>>();
  for (const d of action.details) { const sec = d.section || "Details"; if (!sections.has(sec)) sections.set(sec, []); sections.get(sec)!.push(d); }
  const mainSections = [...sections.entries()].filter(([s]) => s !== "Technical" && s !== "Other");
  const techSection = sections.get("Technical");
  const otherSection = sections.get("Other");

  return (
    <div className="flex items-start gap-3 relative">
      <div className="w-[30px] h-[30px] rounded-full bg-white border-2 border-gray-200 flex items-center justify-center flex-shrink-0 z-10">
        <span className="text-[10px] font-bold text-gray-500">{action.stepNumber}</span>
      </div>
      <div className="flex-1">
        <button onClick={hasDetails ? onToggle : undefined}
          className={`w-full text-left rounded-lg border p-2.5 transition-all ${hasDetails ? "cursor-pointer hover:shadow-sm" : "cursor-default"}`}
          style={{ backgroundColor: action.bg, color: action.text, borderColor: action.border }}>
          <div className="flex items-center gap-1.5">
            <span className="text-sm flex-shrink-0">{action.icon}</span>
            <span className="text-xs font-semibold">{action.label}</span>
            {hasDetails && <svg className={`w-3 h-3 ml-auto transition-transform flex-shrink-0 ${isExpanded?"rotate-180":""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{opacity:0.5}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>}
          </div>
          <p className="text-[11px] mt-1 opacity-80 leading-snug break-words flex flex-wrap items-center gap-0.5">
            {(() => {
              if (action.summary.includes(" → ")) {
                const [left, right] = [action.summary.split(" ? ")[0], action.summary.split(" → ").slice(1).join(" ? ")];
                const parsed = parseDynRef(right);
                if (parsed) return <>{left} ? <ObjTag name={parsed.obj} /><span> {parsed.prop}</span></>;
              }
              const parsed = parseDynRef(action.summary);
              if (parsed) return <><ObjTag name={parsed.obj} /><span> {parsed.prop}</span></>;
              return action.summary;
            })()}
          </p>
        </button>
        {isExpanded && hasDetails && (
          <div className="mt-1.5 ml-1 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            {mainSections.map(([sectionName, items]) => (
              <div key={sectionName} className="border-b border-gray-100 last:border-0">
                <div className="px-3 py-1.5 bg-gray-50"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{sectionName}</span></div>
                <div className="px-3 py-2 space-y-1.5">{items.map((d, i) => (<div key={i} className="flex items-start gap-2 text-[11px]"><span className="text-gray-400 font-medium min-w-[90px] flex-shrink-0">{d.label}</span><ValueDisplay value={d.value} /></div>))}</div>
              </div>
            ))}
            {otherSection && otherSection.length > 0 && (
              <div className="border-b border-gray-100 last:border-0">
                <div className="px-3 py-1.5 bg-gray-50"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Other</span></div>
                <div className="px-3 py-2 space-y-1.5">{otherSection.map((d,i) => (<div key={i} className="flex items-start gap-2 text-[11px]"><span className="text-gray-400 font-medium min-w-[90px] flex-shrink-0">{d.label}</span><ValueDisplay value={d.value} /></div>))}</div>
              </div>
            )}
            {techSection && techSection.length > 0 && (
              <details className="group">
                <summary className="px-3 py-1.5 bg-gray-50 cursor-pointer text-[10px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-500 flex items-center gap-1">
                  <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  Technical
                </summary>
                <div className="px-3 py-2 space-y-1.5 bg-gray-50/50">{techSection.map((d,i) => (<div key={i} className="flex items-start gap-2 text-[10px]"><span className="text-gray-400 font-medium min-w-[90px] flex-shrink-0">{d.label}</span><span className="text-gray-500 break-words flex-1 font-mono">{d.value}</span></div>))}</div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Main component
export default function WorkflowDetailPanel({ portalId, workflowId, onClose }: WorkflowDetailPanelProps) {
  const [wf, setWf] = useState<WorkflowDetail|null>(null);
  const [loading, setLoading] = useState(true);
  const [sl, setSl] = useState<any>({}); const [sol, setSol] = useState<any>({}); const [pl, setPl] = useState<any>({});
  const [el, setEl] = useState<Record<string,{name:string;subject:string;fromName:string;fromEmail:string;replyTo:string;previewText:string}>>({}); const [ll, setLl] = useState<Record<string,string>>({});
  const [exp, setExp] = useState<Set<number>>(new Set());
  const [impact, setImpact] = useState<any>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactOpen, setImpactOpen] = useState(false);
  const [allTags, setAllTags] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [assignedTagIds, setAssignedTagIds] = useState<Set<string>>(new Set());
  const [newTagInput, setNewTagInput] = useState("");

  // AI Analysis state
  const [localScore, setLocalScore] = useState<LocalScore | null>(null);
  const [aiResult, setAiResult] = useState<AnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const { canUse, isFree } = usePlan(portalId);

  useEffect(() => {
    (async () => {
      setLoading(true); setExp(new Set()); setImpact(null); setImpactOpen(false);
      const [r1,r2,r3] = await Promise.all([
        fetch(`/api/workflows?portalId=${portalId}&workflowId=${workflowId}`),
        fetch(`/api/pipelines?portalId=${portalId}`),
        fetch(`/api/tags?portalId=${portalId}`),
      ]);
      if(r1.ok) setWf(await r1.json());
      if(r2.ok) { const d=await r2.json(); setSl(d.stageLookup||{}); setSol(d.stageOrderLookup||{}); setPl(d.pipelineLookup||{}); setEl(d.emailLookup||{}); setLl(d.listLookup||{}); }
      if(r3.ok) {
        const td = await r3.json();
        setAllTags(td.tags || []);
        const assigned = (td.assignments || []).filter((a: any) => a.workflowId === workflowId).map((a: any) => a.tagId);
        setAssignedTagIds(new Set(assigned));
      }
      setLoading(false);
    })();
  }, [portalId, workflowId]);

  // Run local scoring when workflow loads
  useEffect(() => {
    if (!wf) { setLocalScore(null); return; }
    const score = scoreWorkflow({
      name: wf.name,
      objectType: wf.objectType,
      enrollmentCriteria: wf.enrollmentCriteria,
      steps: wf.actions,
    });
    setLocalScore(score);
    setAiResult(null);
    setAiError(null);
  }, [wf]);

  const toggleWorkflowTag = async (tagId: string) => {
    const isAssigned = assignedTagIds.has(tagId);
    const action = isAssigned ? "unassign" : "assign";
    try {
      await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portalId, action, workflowId, tagId }) });
      setAssignedTagIds(prev => { const next = new Set(prev); if (isAssigned) next.delete(tagId); else next.add(tagId); return next; });
    } catch {}
  };

  const createAndAssignTag = async () => {
    if (!newTagInput.trim()) return;
    const TAG_COLORS = ["#6366f1", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#8B5CF6", "#14B8A6"];
    const color = TAG_COLORS[allTags.length % TAG_COLORS.length];
    try {
      const res = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portalId, action: "create", name: newTagInput.trim(), color }) });
      if (res.ok) {
        const tag = await res.json();
        setAllTags(prev => [...prev, { ...tag, _count: { workflowTags: 0 } }]);
        await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portalId, action: "assign", workflowId, tagId: tag.id }) });
        setAssignedTagIds(prev => new Set([...prev, tag.id]));
        setNewTagInput("");
      }
    } catch {}
  };

  // AI deep analysis handler
  const runAiAnalysis = async () => {
    if (!wf || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wf.name,
          objectType: wf.objectType,
          enrollmentCriteria: wf.enrollmentCriteria ? JSON.stringify(wf.enrollmentCriteria) : undefined,
          rawJson: JSON.stringify({ name: wf.name, objectType: wf.objectType, enrollmentCriteria: wf.enrollmentCriteria, actions: wf.actions }),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error || "Analysis failed"); return; }
      setAiResult(data.analysis);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Network error");
    } finally {
      setAiLoading(false);
    }
  };

  const pa = wf ? parseActions(wf.actions, sl, sol, pl, el, ll, wf.dataSources as any[]) : [];
  const et = wf ? parseEnrollment(wf.enrollmentCriteria, sl, sol, pl) : [];
  const hc = wf ? OTC[wf.objectType] || "#95A5A6" : "#95A5A6";
  const hu = wf?.hubspotPortalId ? `https://app-eu1.hubspot.com/workflows/${wf.hubspotPortalId}/platform/flow/${wf.hubspotFlowId}/edit` : null;

  return (
    <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <h3 className="font-semibold text-sm text-gray-900">Workflow Detail</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
      </div>
      {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"/></div>
      : !wf ? <div className="px-4 py-8 text-center text-gray-500 text-sm">Workflow not found</div>
      : <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-start gap-2">
            <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{backgroundColor:hc}}/>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{wf.name}</h4>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${wf.status==="ACTIVE"?"bg-emerald-50 text-emerald-700":wf.status==="ERRORING"?"bg-red-50 text-red-700":"bg-gray-100 text-gray-600"}`}>{wf.status.toLowerCase()}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{backgroundColor:`${hc}15`,color:hc}}>{wf.objectType.toLowerCase()}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{pa.length} action{pa.length!==1?"s":""}</span>
                {localScore && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${localScore.bgColor} ${localScore.color}`} title={`Health: ${localScore.overall}/100`}>
                    {localScore.grade} {localScore.overall}
                  </span>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-400 space-y-0.5">
                {wf.hubspotUpdatedAt && <p>Modified: {new Date(wf.hubspotUpdatedAt).toLocaleDateString()}</p>}
                {wf.hubspotCreatedAt && <p>Created: {new Date(wf.hubspotCreatedAt).toLocaleDateString()}</p>}
              </div>
              {hu && <a href={hu} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:shadow-md hover:brightness-110" style={{backgroundColor:"#ff7a59"}}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.16 3.68v4.3a2.42 2.42 0 00-1.39-.44 2.47 2.47 0 00-2.47 2.47c0 .53.17 1.03.47 1.44l-2.63 2.63a2.42 2.42 0 00-1.44-.47c-.53 0-1.03.17-1.44.47l-1.12-1.12A2.47 2.47 0 008.6 11.5a2.47 2.47 0 10.55 4.89l1.12-1.12c.3.3.66.47 1.03.47A2.47 2.47 0 0013.77 13.27c0-.37-.12-.72-.33-1.03l2.63-2.63c.31.21.66.33 1.03.33a2.47 2.47 0 002.47-2.47V3.68h-1.41z"/></svg>
                Open in HubSpot <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              </a>}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="px-4 py-2.5 border-b border-gray-100">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map(tag => {
              const isAssigned = assignedTagIds.has(tag.id);
              return (
                <button key={tag.id} onClick={() => toggleWorkflowTag(tag.id)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all"
                  style={{ backgroundColor: isAssigned ? tag.color : `${tag.color}12`, color: isAssigned ? "white" : `${tag.color}80`, border: `1.5px solid ${isAssigned ? tag.color : `${tag.color}25`}` }}>
                  {isAssigned && "✓ "}{tag.name}
                </button>
              );
            })}
            <div className="flex items-center">
              <input type="text" value={newTagInput} onChange={e => setNewTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") createAndAssignTag(); }}
                placeholder="+ new tag"
                className="text-[10px] px-1.5 py-0.5 w-16 focus:w-24 transition-all border border-dashed border-gray-200 rounded-md focus:outline-none focus:border-indigo-400 bg-transparent placeholder-gray-300" />
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              \ud83d\udd2c AI Analysis
            </h5>
            {localScore && (
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${localScore.bgColor} ${localScore.color}`} title={`Health score: ${localScore.overall}/100`}>
                  {localScore.grade}
                </div>
                <span className={`text-xs font-bold tabular-nums ${localScore.color}`}>{localScore.overall}</span>
              </div>
            )}
          </div>

          {/* Local score flags */}
          {localScore && localScore.flags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {localScore.flags.map((flag, i) => (
                <span key={i} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{flag}</span>
              ))}
            </div>
          )}

          {/* Local issues */}
          {localScore && localScore.issues.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {localScore.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px]">
                  <span className="flex-shrink-0 mt-px">
                    {issue.severity === "critical" ? "\u26d4" : issue.severity === "warning" ? "\u26a0\ufe0f" : "\u2139\ufe0f"}
                  </span>
                  <span className="text-gray-600 leading-relaxed">{issue.title}</span>
                </div>
              ))}
            </div>
          )}

          {localScore && localScore.issues.length === 0 && (
            <p className="text-[11px] text-emerald-600 mb-3">No issues in quick scan ✓</p>
          )}

          {/* AI deep analysis */}
          {isFree ? (
            <a href={`/pricing?portal=${portalId}`}
              className="block w-full text-center px-3 py-2 rounded-lg text-[11px] font-semibold border-2 border-dashed border-violet-200 text-violet-500 hover:bg-violet-50 transition-colors">
              Upgrade for AI deep analysis →
            </a>
          ) : !aiResult ? (
            <div>
              <button onClick={runAiAnalysis} disabled={aiLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50 hover:shadow-md"
                style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>
                {aiLoading ? (
                  <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white" /> Analysing...</>
                ) : (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" /><path d="m14 7 3 3" /></svg> Deep Analyse</>
                )}
              </button>
              {aiError && <p className="text-[10px] text-red-600 mt-1.5">{aiError}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-gray-600 leading-relaxed">{aiResult.summary}</p>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-gray-50 rounded-md px-2 py-1.5 text-center">
                  <div className="text-xs font-bold text-gray-900">{aiResult.metrics.complexityScore}/10</div>
                  <div className="text-[9px] text-gray-400">Complexity</div>
                </div>
                <div className="bg-gray-50 rounded-md px-2 py-1.5 text-center">
                  <div className="text-xs font-bold text-gray-900">{aiResult.metrics.estimatedRuntime}</div>
                  <div className="text-[9px] text-gray-400">Runtime</div>
                </div>
                <div className={`rounded-md px-2 py-1.5 text-center ${aiResult.metrics.enrollmentRisk === "high" ? "bg-red-50" : aiResult.metrics.enrollmentRisk === "medium" ? "bg-amber-50" : "bg-emerald-50"}`}>
                  <div className={`text-xs font-bold ${aiResult.metrics.enrollmentRisk === "high" ? "text-red-700" : aiResult.metrics.enrollmentRisk === "medium" ? "text-amber-700" : "text-emerald-700"}`}>{aiResult.metrics.enrollmentRisk}</div>
                  <div className="text-[9px] text-gray-400">Enroll risk</div>
                </div>
              </div>
              {aiResult.issues && aiResult.issues.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Issues</p>
                  <div className="space-y-2">
                    {aiResult.issues.map((issue, i) => (
                      <div key={i} className={`rounded-md border px-2.5 py-2 ${issue.severity === "critical" ? "border-red-200 bg-red-50/50" : issue.severity === "warning" ? "border-amber-200 bg-amber-50/50" : "border-blue-200 bg-blue-50/50"}`}>
                        <div className="flex items-start gap-1.5">
                          <span className="text-[10px] mt-px flex-shrink-0">{issue.severity === "critical" ? "\u26d4" : issue.severity === "warning" ? "\u26a0\ufe0f" : "\u2139\ufe0f"}</span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-gray-900">{issue.title}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{issue.detail}</p>
                            <p className="text-[10px] text-violet-600 mt-1 font-medium">Fix → {issue.suggestion}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {aiResult.optimizations && aiResult.optimizations.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Optimizations</p>
                  <div className="space-y-1">
                    {aiResult.optimizations.map((opt, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[11px]">
                        <span className="text-violet-500 mt-px flex-shrink-0">◆</span>
                        <span className="text-gray-600 leading-relaxed">{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={runAiAnalysis} disabled={aiLoading} className="text-[10px] text-violet-600 hover:text-violet-700 font-medium disabled:opacity-50">
                {aiLoading ? "Analysing..." : "Re-analyse ↻"}
              </button>
            </div>
          )}
        </div>

        {/* Impact Simulator */}
        <div className="px-4 py-3 border-b border-gray-100">
          <button
            onClick={async () => {
              if (impact) { setImpactOpen(!impactOpen); return; }
              setImpactLoading(true); setImpactOpen(true);
              try { const res = await fetch(`/api/impact-simulator?portalId=${portalId}&workflowId=${workflowId}`); if (res.ok) setImpact(await res.json()); } catch {} finally { setImpactLoading(false); }
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-400 transition-all group">
            <span className="text-lg">\ud83d\udd2e</span>
            <div className="flex-1 text-left">
              <p className="text-xs font-bold text-amber-900">What if I deactivate this?</p>
              <p className="text-[10px] text-amber-600">Simulate the impact on other workflows</p>
            </div>
            {impactLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-300 border-t-amber-600" />
            ) : impact ? (
              <svg className={`w-4 h-4 text-amber-500 transition-transform ${impactOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            ) : (
              <svg className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            )}
          </button>
          {impactOpen && impact && (
            <div className="mt-3 space-y-3">
              <div className={`rounded-lg px-3 py-2.5 ${impact.summary.safe ? "bg-emerald-50 border border-emerald-200" : impact.summary.criticalCount > 0 ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
                {impact.summary.safe ? (
                  <div className="flex items-center gap-2"><span className="text-lg">\u2705</span><div><p className="text-xs font-bold text-emerald-800">Safe to deactivate</p><p className="text-[10px] text-emerald-600">No other workflows depend on this one.</p></div></div>
                ) : (
                  <div className="flex items-center gap-2"><span className="text-lg">{impact.summary.criticalCount > 0 ? "\ud83d\udea8" : "\u26a0\ufe0f"}</span><div>
                    <p className="text-xs font-bold" style={{ color: impact.summary.criticalCount > 0 ? "#991B1B" : "#92400E" }}>{impact.summary.totalAffected} workflow{impact.summary.totalAffected !== 1 ? "s" : ""} will be affected</p>
                    <p className="text-[10px]" style={{ color: impact.summary.criticalCount > 0 ? "#B91C1C" : "#A16207" }}>
                      {impact.summary.criticalCount > 0 && `${impact.summary.criticalCount} critical issue${impact.summary.criticalCount > 1 ? "s" : ""}. `}
                      {impact.summary.propertiesAffected > 0 && `${impact.summary.propertiesAffected} propert${impact.summary.propertiesAffected > 1 ? "ies" : "y"} affected. `}
                      {impact.summary.emailsAffected > 0 && `${impact.summary.emailsAffected} email${impact.summary.emailsAffected > 1 ? "s" : ""} will stop.`}
                    </p>
                  </div></div>
                )}
              </div>
              {impact.impacts.map((item: any, idx: number) => (
                <div key={idx} className={`rounded-lg border px-3 py-2.5 ${item.severity === "critical" ? "border-red-200 bg-red-50/50" : item.severity === "warning" ? "border-amber-200 bg-amber-50/50" : "border-blue-200 bg-blue-50/50"}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-xs mt-0.5 flex-shrink-0">{item.type === "property_stops" ? "\u270f\ufe0f" : item.type === "enrollment_lost" ? "\u27a1\ufe0f" : item.type === "list_orphaned" ? "\ud83d\udcdd" : item.type === "email_stops" ? "\ud83d\udce7" : item.type === "cascade" ? "\ud83d\udd17" : "\u26a0\ufe0f"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900">{item.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{item.detail}</p>
                      {item.affectedWorkflows.length > 0 && (
                        <div className="mt-2 space-y-1">{item.affectedWorkflows.map((aw: any) => (
                          <div key={aw.id} className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${aw.status === "ACTIVE" ? "bg-emerald-500" : "bg-gray-400"}`} /><span className="text-[10px] text-gray-700 break-words">{aw.name}</span></div>
                        ))}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enrollment */}
        {et.length>0 && <div className="px-4 py-3 border-b border-gray-100">
          <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">\ud83d\udce5 Enrollment Trigger</h5>
          <div className="space-y-1">{et.map((l,i) => <div key={i} className="flex items-start gap-2"><span className="text-gray-300 mt-px">•</span><p className="text-xs text-gray-700 leading-relaxed">{l}</p></div>)}</div>
        </div>}
        {/* Actions */}
        {pa.length>0 && <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">\u26a1 Actions ({pa.length})</h5>
            {pa.some(a=>a.details.length>0) && <button onClick={()=>{if(exp.size>0)setExp(new Set());else setExp(new Set(pa.map(a=>a.stepNumber)));}} className="text-[10px] text-blue-600 hover:text-blue-700 font-medium">{exp.size>0?"Collapse all":"Expand all"}</button>}
          </div>
          <div className="relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-200"/>
            <div className="space-y-3">{pa.map(a => <ActionStep key={a.stepNumber} action={a} isExpanded={exp.has(a.stepNumber)} onToggle={()=>setExp(p=>{const n=new Set(p);if(n.has(a.stepNumber))n.delete(a.stepNumber);else n.add(a.stepNumber);return n;})}/>)}</div>
          </div>
        </div>}
        {/* Conflicts */}
        {wf.conflictWorkflows.length>0 && <div className="px-4 py-3 border-b border-gray-100">
          <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">\u26a0\ufe0f Conflicts ({wf.conflictWorkflows.length})</h5>
          <div className="space-y-2">{wf.conflictWorkflows.map(cw => <div key={cw.conflict.id} className="rounded-md border border-gray-100 p-2.5"><div className="flex items-center gap-1.5 mb-1"><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${SS[cw.conflict.severity]||""}`}>{cw.conflict.severity.toLowerCase()}</span><span className="text-xs text-gray-500">{DL[cw.conflict.type]||cw.conflict.type}</span></div><p className="text-xs text-gray-600 leading-relaxed">{cw.conflict.description}</p></div>)}</div>
        </div>}
        {/* Deps */}
        {wf.sourceDependencies.length>0 && <div className="px-4 py-3 border-b border-gray-100"><h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">\u27a1\ufe0f Affects ({wf.sourceDependencies.length})</h5><div className="space-y-1.5">{wf.sourceDependencies.map(d=><div key={d.id} className="flex items-center gap-2 text-xs"><span className={`px-1.5 py-0.5 rounded font-medium ${SS[d.severity]||"bg-gray-100 text-gray-600"}`}>{DL[d.type]||d.type}</span><span className="text-gray-600 truncate flex-1">{d.targetWorkflow?.name||"Unknown"}</span></div>)}</div></div>}
        {wf.targetDependencies.length>0 && <div className="px-4 py-3"><h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">\u2b05\ufe0f Affected by ({wf.targetDependencies.length})</h5><div className="space-y-1.5">{wf.targetDependencies.map(d=><div key={d.id} className="flex items-center gap-2 text-xs"><span className={`px-1.5 py-0.5 rounded font-medium ${SS[d.severity]||"bg-gray-100 text-gray-600"}`}>{DL[d.type]||d.type}</span><span className="text-gray-600 truncate flex-1">{d.sourceWorkflow?.name||"Unknown"}</span></div>)}</div></div>}
      </div>}
    </div>
  );
}
