package com.journeo.journey.validation;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
public class JourneyGraphValidator {
    public static class ValidationError { public String nodeId; public String field; public String message;
        public ValidationError(String n,String f,String m){nodeId=n;field=f;message=m;}}
    private static final ObjectMapper M=new ObjectMapper();
    private static final Set<String> KEPT_TYPES = Set.of("trigger","condition","end","text","image","video","button","input","select","checkbox","rating","container","divider","card","hero_section","quiz","form","countdown","alert","badge","ask_ai");
    private static final Set<String> BRANCH_TYPES = Set.of("condition","quiz","video");
    private static final Map<String,String> PRUNED_MAP = Map.ofEntries(
        Map.entry("gallery","image"), Map.entry("poll","quiz"), Map.entry("media_carousel","image"), Map.entry("stats_card","card"),
        Map.entry("product_card","card"), Map.entry("profile_card","card"), Map.entry("testimonial","text"), Map.entry("pricing_card","card"),
        Map.entry("comparison","text"), Map.entry("chat_thread","text"), Map.entry("chat_bubble","text"), Map.entry("carousel_base","image"),
        Map.entry("progress","text"), Map.entry("slider","rating"), Map.entry("radio","select"), Map.entry("toggle","checkbox"),
        Map.entry("chip","badge"), Map.entry("icon","text"), Map.entry("avatar","image"), Map.entry("file_uploader","form"),
        Map.entry("tooltip","text"), Map.entry("header","text"), Map.entry("footer","text"), Map.entry("dialog","card"),
        Map.entry("sidebar","container"), Map.entry("tabs","container"), Map.entry("accordion","text"), Map.entry("spacer","divider"),
        Map.entry("newsletter","form"), Map.entry("faq_section","text"), Map.entry("timeline","text"), Map.entry("progress_stepper","text"),
        Map.entry("cta_section","hero_section"), Map.entry("textarea","input"), Map.entry("message","text"), Map.entry("action","button"),
        Map.entry("carousel","image"), Map.entry("video_player","video"), Map.entry("slider_scale","rating"), Map.entry("form_capture","form"),
        Map.entry("countdown_timer","countdown"), Map.entry("ai_decision","condition"), Map.entry("subflow_ref","text")
    );
    public List<ValidationError> validate(String graphJson){
        List<ValidationError> errs=new ArrayList<>();
        if(graphJson==null||graphJson.isBlank()){ errs.add(new ValidationError("graph","graph","Graph is empty")); return errs; }
        try{
            JsonNode root=M.readTree(graphJson);
            JsonNode nodes=root.get("nodes"); JsonNode edges=root.get("edges");
            if(nodes==null||!nodes.isArray()||nodes.size()==0){ errs.add(new ValidationError("graph","nodes","At least one node required")); return errs; }
            Map<String,JsonNode> nodeMap=new HashMap<>();
            int triggerCount=0; String triggerId=null;
            int askAiCount=0;
            for(JsonNode n: nodes){
                String id=n.path("id").asText(); String type=n.path("type").asText(); nodeMap.put(id,n);
                if("trigger".equals(type)){triggerCount++; triggerId=id;}
                if("ask_ai".equals(type)){askAiCount++;}
                if(!KEPT_TYPES.contains(type)){
                    String migrated = PRUNED_MAP.get(type);
                    if(migrated!=null) errs.add(new ValidationError(id,"type","Unknown node type: "+type+" (migrated to "+migrated+")"));
                    else if(!type.isBlank()) errs.add(new ValidationError(id,"type","Unknown node type: "+type));
                    continue;
                }
                JsonNode cfg=n.path("config");
                if("condition".equals(type)){ if(cfg.isMissingNode()||cfg.path("field").asText().isBlank()) errs.add(new ValidationError(id,"config.field","Condition node requires field")); if(cfg.path("operator").asText().isBlank()) errs.add(new ValidationError(id,"config.operator","Condition requires operator")); }
                if("text".equals(type)){ }
                if("image".equals(type)){ if(cfg.path("src").asText().isBlank()) errs.add(new ValidationError(id,"config.src","image requires src")); }
                if("video".equals(type)){ }
                if("button".equals(type)){ if(cfg.path("label").asText().isBlank()) errs.add(new ValidationError(id,"config.label","button requires label")); }
                if("input".equals(type)){ }
                if("select".equals(type)){ JsonNode opts=cfg.path("options"); if(!opts.isArray()||opts.size()<1) errs.add(new ValidationError(id,"config.options","select requires at least 1 option")); }
                if("checkbox".equals(type)){ }
                if("rating".equals(type)){ if(!cfg.path("max").isNumber() && !cfg.path("max").isMissingNode()) {} }
                if("container".equals(type)){ }
                if("divider".equals(type)){ }
                if("card".equals(type)){ }
                if("hero_section".equals(type)){ if(cfg.path("headline").asText().isBlank()) errs.add(new ValidationError(id,"config.headline","hero_section requires headline")); JsonNode ctas=cfg.path("ctas"); if(!ctas.isArray()||ctas.size()<1) errs.add(new ValidationError(id,"config.ctas","hero_section requires at least 1 cta")); }
                if("quiz".equals(type)){ if(cfg.path("question").asText().isBlank()) errs.add(new ValidationError(id,"config.question","quiz requires question")); JsonNode opts=cfg.path("options"); if(!opts.isArray()||opts.size()<1) errs.add(new ValidationError(id,"config.options","quiz requires at least 1 option")); }
                if("form".equals(type)){ JsonNode fields=cfg.path("fields"); if(!fields.isArray()||fields.size()<1) errs.add(new ValidationError(id,"config.fields","form requires at least one field")); }
                if("countdown".equals(type)){ if(cfg.path("endTime").asText().isBlank()) errs.add(new ValidationError(id,"config.endTime","countdown requires endTime")); }
                if("alert".equals(type)){ if(cfg.path("message").asText().isBlank()) errs.add(new ValidationError(id,"config.message","alert requires message")); }
                if("badge".equals(type)){ if(cfg.path("label").asText().isBlank()) errs.add(new ValidationError(id,"config.label","badge requires label")); }
            }
            if(triggerCount!=1) errs.add(new ValidationError("graph","trigger","Exactly one trigger required, found "+triggerCount));
            if(askAiCount>1) errs.add(new ValidationError("graph","ask_ai","At most one ask_ai floating node is allowed"));
            if(edges!=null && triggerId!=null){
                Map<String,List<JsonNode>> adj=new HashMap<>();
                for(JsonNode e: edges){ String src=e.path("source").asText(); String tgt=e.path("target").asText(); adj.computeIfAbsent(src,k->new ArrayList<>()).add(e); }
                for(JsonNode n: nodes){ String id=n.path("id").asText(); String type=n.path("type").asText(); if(BRANCH_TYPES.contains(type)){ List<JsonNode> out=adj.getOrDefault(id,List.of()); boolean hasDefault=out.stream().anyMatch(e->"default".equals(e.path("label").asText())||"default".equals(e.path("sourceHandle").asText())||e.path("sourceHandle").asText().contains("default")); if(!out.isEmpty() && !hasDefault && out.size()<2) errs.add(new ValidationError(id,"edges",type+" should route via labeled outgoing edges, not a single implicit edge")); } }
                Set<String> visited=new HashSet<>(); Queue<String> q=new LinkedList<>(); q.add(triggerId); visited.add(triggerId);
                while(!q.isEmpty()){ String cur=q.poll(); for(JsonNode e: adj.getOrDefault(cur,List.of())){ String t=e.path("target").asText(); if(!visited.contains(t)){visited.add(t); q.add(t);} } }
                for(String nid: nodeMap.keySet()){ JsonNode nn=nodeMap.get(nid); if(nn!=null && "ask_ai".equals(nn.path("type").asText())) continue; if(!visited.contains(nid)) errs.add(new ValidationError(nid,"graph","Unreachable node")); }
                if(hasCycle(adj, nodeMap.keySet())) errs.add(new ValidationError("graph","edges","Cycle detected outside subflow boundary"));
            }
        }catch(Exception e){ errs.add(new ValidationError("graph","json","Invalid JSON: "+e.getMessage())); }
        return errs;
    }
    private boolean hasCycle(Map<String,List<JsonNode>> adj, Set<String> nodes){
        Map<String,Integer> state=new HashMap<>(); for(String n: nodes) state.put(n,0);
        for(String n: nodes) if(state.get(n)==0 && dfs(n, adj, state)) return true;
        return false;
    }
    private boolean dfs(String u, Map<String,List<JsonNode>> adj, Map<String,Integer> state){
        state.put(u,1);
        for(JsonNode e: adj.getOrDefault(u,List.of())){ String v=e.path("target").asText(); Integer s=state.get(v); if(s==null) continue; if(s==1) return true; if(s==0 && dfs(v,adj,state)) return true; }
        state.put(u,2); return false;
    }
}
