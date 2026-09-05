package com.journeo.journey.controller;
import com.journeo.journey.entity.*;
import com.journeo.journey.logging.RequestContextHolder;
import com.journeo.journey.repository.*;
import com.journeo.journey.validation.JourneyGraphValidator;
import com.journeo.journey.service.JourneyExecutionEngine;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import com.journeo.journey.service.DevLinkService;
import java.time.Instant;
import java.util.*;
@RestController @RequestMapping("/api")
public class CampaignController {
    private final CampaignRepository campRepo; private final JourneyRepository jourRepo;
    private final JourneySessionRepository sessRepo; private final NodeExecutionRepository nodeRepo;
    private final ActivityEventRepository actRepo; private final JourneyExecutionEngine engine;
    private final RestTemplate rest; private final DevLinkService devLinkService; private final ObjectMapper mapper=new ObjectMapper();
    @org.springframework.beans.factory.annotation.Value("${analytics-service-url:http://localhost:8082}") String analyticsUrl;
    @org.springframework.beans.factory.annotation.Value("${connectors-service-url:http://localhost:8083}") String connUrl;
    @org.springframework.beans.factory.annotation.Value("${ai-service-url:http://localhost:8084}") String aiUrl;
    public CampaignController(CampaignRepository cr, JourneyRepository jr, JourneySessionRepository sr, NodeExecutionRepository nr, ActivityEventRepository ar, JourneyExecutionEngine eng, RestTemplate rt, DevLinkService dls){this.campRepo=cr;this.jourRepo=jr;this.sessRepo=sr;this.nodeRepo=nr;this.actRepo=ar;this.engine=eng;this.rest=rt;this.devLinkService=dls;}
    @PostMapping("/campaigns") public Campaign create(@RequestBody Map<String,Object> b){ Campaign c=new Campaign(); c.setName((String)b.getOrDefault("name","Untitled")); c.setDescription((String)b.getOrDefault("description","")); c.setStatus("ACTIVE"); devLinkService.ensureDevToken(c); campRepo.save(c); RequestContextHolder.put("campaignId",c.getId()); return c; }
    @GetMapping("/campaigns") public List<Campaign> list(){ return campRepo.findAll(); }
    @GetMapping("/campaigns/{id}") public ResponseEntity<Campaign> get(@PathVariable String id){ return campRepo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/campaigns/{id}") public ResponseEntity<Campaign> update(@PathVariable String id, @RequestBody Map<String,Object> b){
        return campRepo.findById(id).map(c->{
            if(b.containsKey("name")) c.setName((String)b.get("name"));
            if(b.containsKey("description")) c.setDescription((String)b.get("description"));
            c.setUpdatedAt(Instant.now());
            return ResponseEntity.ok(campRepo.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }
    @PostMapping("/campaigns/{id}/journeys") public ResponseEntity<?> createJ(@PathVariable String id, @RequestBody Map<String,Object> b){ if(!campRepo.existsById(id)) return ResponseEntity.notFound().build(); Journey j=new Journey(); j.setCampaignId(id); j.setName((String)b.getOrDefault("name","Journey")); try{j.setGraphJson(mapper.writeValueAsString(b.getOrDefault("graph",b)));}catch(Exception e){j.setGraphJson("{}");} jourRepo.save(j); return ResponseEntity.ok(j); }
    @GetMapping("/campaigns/{id}/journeys") public List<Journey> listJ(@PathVariable String id){ return jourRepo.findByCampaignId(id); }
    @GetMapping("/campaigns/{id}/journeys/{jid}") public ResponseEntity<Journey> getJ(@PathVariable String id,@PathVariable String jid){ return jourRepo.findById(jid).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/campaigns/{id}/journeys/{jid}") public ResponseEntity<?> updJ(@PathVariable String id,@PathVariable String jid,@RequestBody Map<String,Object> b){ var opt=jourRepo.findById(jid); if(opt.isEmpty()) return ResponseEntity.notFound().build(); Journey j=opt.get(); if(b.containsKey("name")) j.setName((String)b.get("name")); try{ if(b.containsKey("graph")) j.setGraphJson(mapper.writeValueAsString(b.get("graph"))); else if(b.containsKey("nodes")) j.setGraphJson(mapper.writeValueAsString(b)); }catch(Exception e){} j.setUpdatedAt(Instant.now()); jourRepo.save(j); return ResponseEntity.ok(j); }
    @PostMapping("/campaigns/{id}/journeys/{jid}/validate") public Map<String,Object> validate(@PathVariable String id,@PathVariable String jid, @RequestBody(required=false) Map<String,Object> b){ Journey j=jourRepo.findById(jid).orElse(null); String gj=j!=null?j.getGraphJson():"{}"; if(b!=null && b.containsKey("graph")) try{gj=mapper.writeValueAsString(b.get("graph"));}catch(Exception e){} else if(b!=null && b.containsKey("nodes")) try{gj=mapper.writeValueAsString(b);}catch(Exception e){} var errs=new JourneyGraphValidator().validate(gj); List<Map<String,String>> out=errs.stream().map(e->{Map<String,String> m=new HashMap<>(); m.put("nodeId",e.nodeId); m.put("field",e.field); m.put("message",e.message); return m;}).toList(); return Map.of("valid",errs.isEmpty(),"errors",out); }
    @PostMapping("/campaigns/{id}/journeys/{jid}/publish") public ResponseEntity<?> publish(@PathVariable String id,@PathVariable String jid){ var opt=jourRepo.findById(jid); if(opt.isEmpty()) return ResponseEntity.notFound().build(); Journey j=opt.get(); var errs=new JourneyGraphValidator().validate(j.getGraphJson()); if(!errs.isEmpty()) return ResponseEntity.badRequest().body(Map.of("valid",false,"errors",errs.stream().map(e->Map.of("nodeId",e.nodeId,"message",e.message)).toList())); j.setStatus("PUBLISHED"); j.setUpdatedAt(Instant.now()); jourRepo.save(j); return ResponseEntity.ok(j); }
    @PostMapping("/campaigns/{id}/journeys/{jid}/simulate") public Map<String,Object> simulate(@PathVariable String id,@PathVariable String jid,@RequestBody Map<String,Object> b){ Journey j=jourRepo.findById(jid).orElse(null); if(j==null) return Map.of("error","journey not found"); int count=((Number)b.getOrDefault("sessionCount",1)).intValue(); count=Math.min(Math.max(count,1),50); String rid=RequestContextHolder.getRequestId(); if(rid==null) rid=UUID.randomUUID().toString(); List<String> sids=new ArrayList<>(); for(int i=0;i<count;i++){ JourneySession s=new JourneySession(); s.setJourneyId(jid); s.setCampaignId(id); s.setRequestId(rid); sessRepo.save(s); sids.add(s.getId()); } engine.executeAsync(jid,id,j.getGraphJson(),sids,rid); RequestContextHolder.put("simulateCount",count); return Map.of("requestId",rid,"sessionIds",sids); }
    @GetMapping("/sessions/{sid}") public ResponseEntity<JourneySession> getS(@PathVariable String sid){ return sessRepo.findById(sid).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @GetMapping("/sessions/{sid}/executions") public List<NodeExecution> execs(@PathVariable String sid){ return nodeRepo.findBySessionId(sid); }
    @PostMapping("/journey-engine/events/ai-actions") public Map<String,Object> aiWebhook(@RequestBody Map<String,Object> b){ String cid=(String)b.get("campaignId"); String type=(String)b.getOrDefault("type","ai_action"); String rid=(String)b.get("requestId"); try{ ActivityEvent e=new ActivityEvent(); e.setCampaignId(cid!=null?cid:"unknown"); e.setType(type); e.setPayloadJson(mapper.writeValueAsString(b)); e.setRequestId(rid); actRepo.save(e);}catch(Exception ignored){} return Map.of("ok",true); }
    @GetMapping("/campaigns/{id}/activity") public List<ActivityEvent> activity(@PathVariable String id){ return actRepo.findByCampaignIdOrderByCreatedAtDesc(id); }
    @GetMapping("/campaigns/dev/{token}") public ResponseEntity<Campaign> byDevToken(@PathVariable String token){ return devLinkService.findByDevToken(token).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @GetMapping("/campaigns/{id}/dev-link") public ResponseEntity<Map<String,Object>> devLink(@PathVariable String id){
        var opt=campRepo.findById(id);
        if(opt.isEmpty()) return ResponseEntity.notFound().build();
        Campaign c=opt.get();
        devLinkService.ensureDevToken(c);
        if(c.getDevToken()!=null && campRepo.findByDevToken(c.getDevToken()).isEmpty()) campRepo.save(c);
        return ResponseEntity.ok(Map.of("devToken",c.getDevToken(),"devLink",c.getDevLink(),"createdAt",c.getDevTokenCreatedAt()!=null?c.getDevTokenCreatedAt().toString():"","campaignId",c.getId()));
    }
    @PostMapping("/campaigns/{id}/dev-link/rotate") public ResponseEntity<Map<String,Object>> rotateDevLink(@PathVariable String id){
        if(!campRepo.existsById(id)) return ResponseEntity.notFound().build();
        Campaign c=devLinkService.rotate(id);
        return ResponseEntity.ok(Map.of("devToken",c.getDevToken(),"devLink",c.getDevLink(),"createdAt",c.getDevTokenCreatedAt().toString(),"campaignId",c.getId()));
    }
    @PostMapping("/campaigns/{id}/track") public ResponseEntity<Map<String,Object>> track(@PathVariable String id, @RequestBody Map<String,Object> b){
        if(!campRepo.existsById(id)) return ResponseEntity.notFound().build();
        try{
            ActivityEvent e=new ActivityEvent();
            e.setCampaignId(id);
            e.setType((String)b.getOrDefault("type","node:track"));
            e.setPayloadJson(mapper.writeValueAsString(b));
            e.setRequestId((String)b.getOrDefault("devToken", RequestContextHolder.getRequestId()));
            actRepo.save(e);
        }catch(Exception ignored){}
        return ResponseEntity.ok(Map.of("ok",true));
    }
}
