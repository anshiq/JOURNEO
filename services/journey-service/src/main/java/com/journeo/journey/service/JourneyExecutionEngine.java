package com.journeo.journey.service;
import com.fasterxml.jackson.databind.*;
import com.journeo.journey.entity.*;
import com.journeo.journey.logging.RequestContextHolder;
import com.journeo.journey.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.time.Instant;
import java.util.*;
@Service
public class JourneyExecutionEngine {
    private final JourneySessionRepository sessionRepo;
    private final NodeExecutionRepository nodeRepo;
    private final ActivityEventRepository activityRepo;
    private final RestTemplate restTemplate;
    private final SimpMessagingTemplate ws;
    private final ObjectMapper mapper=new ObjectMapper();
    @Value("${ai-service-url:http://localhost:8084}") String aiUrl;
    @Value("${connectors-service-url:http://localhost:8083}") String connUrl;
    public JourneyExecutionEngine(JourneySessionRepository sr, NodeExecutionRepository nr, ActivityEventRepository ar, RestTemplate rt, SimpMessagingTemplate ws){ this.sessionRepo=sr; this.nodeRepo=nr; this.activityRepo=ar; this.restTemplate=rt; this.ws=ws; }
    @Async
    public void executeAsync(String journeyId, String campaignId, String graphJson, List<String> sessionIds, String requestId){
        RequestContextHolder.init(requestId);
        for(String sid: sessionIds){
            try{ executeSession(sid, journeyId, campaignId, graphJson, requestId); } catch(Exception e){ e.printStackTrace(); }
        }
        RequestContextHolder.clear();
    }
    private void executeSession(String sessionId, String journeyId, String campaignId, String graphJson, String requestId) throws Exception {
        JsonNode root=mapper.readTree(graphJson);
        JsonNode nodes=root.path("nodes"); JsonNode edges=root.path("edges");
        Map<String,JsonNode> nodeMap=new HashMap<>();
        Map<String,List<JsonNode>> adj=new HashMap<>();
        for(JsonNode n: nodes) nodeMap.put(n.path("id").asText(), n);
        for(JsonNode e: edges) adj.computeIfAbsent(e.path("source").asText(), k->new ArrayList<>()).add(e);
        String triggerId=nodeMap.entrySet().stream().filter(e->"trigger".equals(e.getValue().path("type").asText())).map(Map.Entry::getKey).findFirst().orElse(null);
        if(triggerId==null) return;
        Map<String,Object> profile=new HashMap<>();
        Random rnd=new Random(sessionId.hashCode());
        profile.put("age", 18+rnd.nextInt(50)); profile.put("location", List.of("US","IN","UK","DE").get(rnd.nextInt(4)));
        profile.put("interest", List.of("tech","fashion","sports","finance").get(rnd.nextInt(4)));
        profile.put("sessionId", sessionId);
        String cur=triggerId;
        Set<String> visited=new HashSet<>();
        int depth=0;
        while(cur!=null && depth<50){
            if(visited.contains(cur) && !cur.equals(triggerId)) break;
            visited.add(cur);
            JsonNode node=nodeMap.get(cur);
            if(node==null) break;
            String type=node.path("type").asText();
            if("end".equals(type)){
                NodeExecution ne=new NodeExecution(); ne.setSessionId(sessionId); ne.setNodeId(cur); ne.setNodeType(type); ne.setStatus("COMPLETED"); ne.setInputJson(mapper.writeValueAsString(profile)); nodeRepo.save(ne);
                send(sessionId,"NODE_COMPLETED",cur,type);
                break;
            }
            NodeExecution ne=new NodeExecution(); ne.setSessionId(sessionId); ne.setNodeId(cur); ne.setNodeType(type); ne.setStatus("STARTED"); ne.setInputJson(mapper.writeValueAsString(profile)); nodeRepo.save(ne);
            send(sessionId,"NODE_STARTED",cur,type);
            String next=null;
            try{
                if("trigger".equals(type) || "text".equals(type) || "image".equals(type) || "hero_section".equals(type) || "card".equals(type) || "button".equals(type) || "input".equals(type) || "select".equals(type) || "checkbox".equals(type) || "rating".equals(type) || "container".equals(type) || "divider".equals(type) || "alert".equals(type) || "badge".equals(type) || "form".equals(type) || "countdown".equals(type) || "message".equals(type)){
                    Thread.sleep(80);
                    next=nextNode(cur, adj, null);
                    ne.setStatus("COMPLETED"); ne.setCompletedAt(Instant.now());
                } else if("video".equals(type)){
                    Thread.sleep(60);
                    String handle = rnd.nextBoolean() ? "watched" : "skipped";
                    List<JsonNode> outs=adj.getOrDefault(cur,List.of());
                    for(JsonNode e: outs){ String h=e.path("sourceHandle").asText(""); String lbl=e.path("label").asText(""); if(handle.equals(h)||handle.equals(lbl)){ next=e.path("target").asText(); break; } }
                    if(next==null) next=nextNode(cur, adj, null);
                    ne.setOutputJson("{\"handle\":\""+handle+"\"}"); ne.setStatus("COMPLETED"); ne.setCompletedAt(Instant.now());
                } else if("quiz".equals(type)){
                    Thread.sleep(60);
                    String handle = rnd.nextBoolean() ? "answered" : "skipped";
                    List<JsonNode> outs=adj.getOrDefault(cur,List.of());
                    for(JsonNode e: outs){ String h=e.path("sourceHandle").asText(""); String lbl=e.path("label").asText(""); if(handle.equals(h)||handle.equals(lbl)){ next=e.path("target").asText(); break; } }
                    if(next==null) next=nextNode(cur, adj, null);
                    ne.setOutputJson("{\"handle\":\""+handle+"\"}"); ne.setStatus("COMPLETED"); ne.setCompletedAt(Instant.now());
                } else if("condition".equals(type)){
                    JsonNode cfg=node.path("config");
                    String field=cfg.path("field").asText("interest");
                    String op=cfg.path("operator").asText("eq");
                    String val=cfg.path("value").asText("");
                    Object pv=profile.get(field);
                    boolean res=evaluate(pv!=null?pv.toString():"", op, val);
                    List<JsonNode> outs=adj.getOrDefault(cur,List.of());
                    for(JsonNode e: outs){ String h=e.path("sourceHandle").asText(""); String lbl=e.path("label").asText(""); if(res && ("true".equals(h)||"true".equals(lbl))) {next=e.path("target").asText(); break;} if(!res && ("false".equals(h)||"false".equals(lbl))) {next=e.path("target").asText(); break;} }
                    if(next==null){ for(JsonNode e: outs) if("default".equals(e.path("label").asText())||e.path("sourceHandle").asText().contains("default")){next=e.path("target").asText(); break;} if(next==null && !outs.isEmpty()) next=outs.get(0).path("target").asText(); }
                    ne.setOutputJson("{\"result\":"+res+"}"); ne.setStatus("COMPLETED"); ne.setCompletedAt(Instant.now());
                } else if("ai_decision".equals(type)){
                    String subtype=node.path("config").path("subtype").asText("categorize");
                    Map<String,Object> payload=new HashMap<>();
                    payload.put("journey_id", journeyId); payload.put("node_id", cur); payload.put("subtype", subtype); payload.put("campaign_id", campaignId); payload.put("context", profile);
                    String branch="default"; double conf=0.8;
                    try{
                        Map resp=restTemplate.postForObject(aiUrl+"/v1/decision-nodes/execute", payload, Map.class);
                        if(resp!=null){ branch=(String)resp.getOrDefault("branch","default"); Object c=resp.get("confidence"); if(c instanceof Number) conf=((Number)c).doubleValue(); ne.setOutputJson(mapper.writeValueAsString(resp)); }
                    } catch(Exception ex){ ne.setOutputJson("{\"error\":\""+ex.getMessage().replace("\"","")+ "\",\"fallback\":true}"); branch="default"; }
                    ne.setStatus("COMPLETED"); ne.setCompletedAt(Instant.now());
                    List<JsonNode> outs=adj.getOrDefault(cur,List.of());
                    for(JsonNode e: outs){ if(branch.equals(e.path("sourceHandle").asText())||branch.equals(e.path("label").asText())){next=e.path("target").asText(); break;} }
                    if(next==null){ for(JsonNode e: outs) if("default".equals(e.path("label").asText())||e.path("sourceHandle").asText().contains("default")){next=e.path("target").asText(); break;} if(next==null && !outs.isEmpty()) next=outs.get(0).path("target").asText(); }
                } else if("action".equals(type)){
                    JsonNode cfg=node.path("config");
                    String sub=cfg.path("subtype").asText("pause_campaign"); String plat=cfg.path("platform").asText("meta");
                    Map<String,Object> p=new HashMap<>(); p.put("campaignId", campaignId); p.put("action", sub); p.put("platform", plat); p.put("params", cfg.path("params"));
                    try{
                        if("pause_campaign".equals(sub)) restTemplate.postForObject(connUrl+"/mock/"+plat+"/campaigns/"+campaignId+"/pause", p, Map.class);
                        else if("create_campaign".equals(sub)) restTemplate.postForObject(connUrl+"/mock/"+plat+"/campaigns", Map.of("name","Journey "+journeyId,"objective","REACH","daily_budget",100), Map.class);
                        else if("reallocate_budget".equals(sub)) restTemplate.postForObject(connUrl+"/mock/"+plat+"/budget-reallocate", p, Map.class);
                        ne.setOutputJson("{\"platform\":\""+plat+"\",\"action\":\""+sub+"\"}");
                    } catch(Exception ex){ ne.setOutputJson("{\"error\":\""+ex.getMessage().replace("\"","")+"\"}"); }
                    ne.setStatus("COMPLETED"); ne.setCompletedAt(Instant.now());
                    next=nextNode(cur, adj, null);
                    recordActivity(campaignId,"action_executed","{\"node\":\""+cur+"\",\"platform\":\""+plat+"\"}",requestId);
                } else {
                    next=nextNode(cur, adj, null);
                    ne.setStatus("COMPLETED"); ne.setCompletedAt(Instant.now());
                }
            } catch(Exception ex){ ne.setStatus("FAILED"); ne.setOutputJson("{\"error\":\""+ex.getMessage()+"\"}"); send(sessionId,"NODE_FAILED",cur,type); }
            nodeRepo.save(ne);
            if("COMPLETED".equals(ne.getStatus())) send(sessionId,"NODE_COMPLETED",cur,type);
            cur=next; depth++;
            Thread.sleep(60);
        }
        JourneySession s=sessionRepo.findById(sessionId).orElse(null);
        if(s!=null){ s.setStatus("COMPLETED"); s.setCompletedAt(Instant.now()); sessionRepo.save(s); }
        send(sessionId,"SESSION_COMPLETED",null,null);
        recordActivity(campaignId,"session_completed","{\"sessionId\":\""+sessionId+"\"}",requestId);
    }
    private String nextNode(String cur, Map<String,List<JsonNode>> adj, String branch){
        List<JsonNode> outs=adj.getOrDefault(cur,List.of());
        if(outs.isEmpty()) return null;
        if(branch!=null) for(JsonNode e: outs) if(branch.equals(e.path("sourceHandle").asText())||branch.equals(e.path("label").asText())) return e.path("target").asText();
        return outs.get(0).path("target").asText();
    }
    private boolean evaluate(String pv, String op, String val){
        return switch(op){ case "eq"->pv.equals(val); case "neq"->!pv.equals(val); case "contains"->pv.contains(val); case "gt"->{ try{ yield Double.parseDouble(pv)>Double.parseDouble(val);}catch(Exception e){yield false;}} case "lt"->{ try{ yield Double.parseDouble(pv)<Double.parseDouble(val);}catch(Exception e){yield false;}} case "gte"->{ try{ yield Double.parseDouble(pv)>=Double.parseDouble(val);}catch(Exception e){yield false;}} case "lte"->{ try{ yield Double.parseDouble(pv)<=Double.parseDouble(val);}catch(Exception e){yield false;}} default->false; };
    }
    private void send(String sid,String ev,String nid,String ntype){
        Map<String,Object> msg=new HashMap<>(); msg.put("event",ev); msg.put("sessionId",sid); msg.put("nodeId",nid); msg.put("nodeType",ntype); msg.put("timestamp",Instant.now().toString());
        try{ ws.convertAndSend("/topic/sessions/"+sid, msg); }catch(Exception ignored){}
    }
    private void recordActivity(String cid,String type,String payload,String rid){
        try{ ActivityEvent e=new ActivityEvent(); e.setCampaignId(cid); e.setType(type); e.setPayloadJson(payload); e.setRequestId(rid); activityRepo.save(e);}catch(Exception ignored){}
    }
}
