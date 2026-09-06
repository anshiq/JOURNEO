package com.journeo.journey.controller;
import com.journeo.journey.entity.*;
import com.journeo.journey.logging.RequestContextHolder;
import com.journeo.journey.repository.*;
import com.journeo.journey.validation.BadGraphException;
import com.journeo.journey.validation.GraphSerializer;
import com.journeo.journey.validation.JourneyGraphValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import com.journeo.journey.service.DevLinkService;
import java.time.Instant;
import java.util.*;
@RestController @RequestMapping("/api")
public class CampaignController {
    private final CampaignRepository campRepo; private final JourneyRepository jourRepo;
    private final ActivityEventRepository actRepo;
    private final RestTemplate rest; private final DevLinkService devLinkService; private final ObjectMapper mapper=new ObjectMapper();
    @org.springframework.beans.factory.annotation.Value("${analytics-service-url:http://localhost:8082}") String analyticsUrl;
    @org.springframework.beans.factory.annotation.Value("${connectors-service-url:http://localhost:8083}") String connUrl;
    @org.springframework.beans.factory.annotation.Value("${ai-service-url:http://localhost:8084}") String aiUrl;
    public CampaignController(CampaignRepository cr, JourneyRepository jr, ActivityEventRepository ar, RestTemplate rt, DevLinkService dls){this.campRepo=cr;this.jourRepo=jr;this.actRepo=ar;this.rest=rt;this.devLinkService=dls;}
    @PostMapping("/campaigns") public Campaign create(@RequestBody Map<String,Object> b){ Campaign c=new Campaign(); c.setName((String)b.getOrDefault("name","Untitled")); c.setDescription((String)b.getOrDefault("description","")); c.setObjective((String)b.getOrDefault("objective","")); c.setAudience((String)b.getOrDefault("audience","")); c.setStatus("ACTIVE"); devLinkService.ensureDevToken(c); campRepo.save(c); RequestContextHolder.put("campaignId",c.getId()); return c; }
    @GetMapping("/campaigns") public List<Campaign> list(){ return campRepo.findAll(); }
    @GetMapping("/campaigns/{id}") public ResponseEntity<Campaign> get(@PathVariable String id){ return campRepo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/campaigns/{id}") public ResponseEntity<Campaign> update(@PathVariable String id, @RequestBody Map<String,Object> b){
        return campRepo.findById(id).map(c->{
            if(b.containsKey("name")) c.setName((String)b.get("name"));
            if(b.containsKey("description")) c.setDescription((String)b.get("description"));
            if(b.containsKey("objective")) c.setObjective((String)b.get("objective"));
            if(b.containsKey("audience")) c.setAudience((String)b.get("audience"));
            c.setUpdatedAt(Instant.now());
            return ResponseEntity.ok(campRepo.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }
    @GetMapping("/campaigns/{id}/journeys") public List<Journey> listJ(@PathVariable String id){ return jourRepo.findByCampaignIdOrderByCreatedAtAsc(id); }
    @GetMapping("/campaigns/{id}/journey") public ResponseEntity<Journey> getJourney(@PathVariable String id){
        return jourRepo.findFirstByCampaignIdOrderByCreatedAtAsc(id).map(ResponseEntity::ok).orElse(ResponseEntity.noContent().build());
    }
    @PutMapping("/campaigns/{id}/journey") public ResponseEntity<?> upsertJourney(@PathVariable String id,@RequestBody Map<String,Object> b){
        if(!campRepo.existsById(id)) return ResponseEntity.notFound().build();
        Object graph=b.getOrDefault("graph", b);
        String newGraphJson=GraphSerializer.serialize(graph, mapper);
        Optional<Journey> existing=jourRepo.findFirstByCampaignIdOrderByCreatedAtAsc(id);
        Journey j;
        boolean isNew=existing.isEmpty();
        String oldGraphJson=existing.map(Journey::getGraphJson).orElse(null);
        if(isNew){
            j=new Journey();
            j.setCampaignId(id);
            j.setName((String)b.getOrDefault("name","Journey"));
            j.setGraphJson(newGraphJson);
            try{ j=jourRepo.save(j); }
            catch(DataIntegrityViolationException dup){
                j=jourRepo.findFirstByCampaignIdOrderByCreatedAtAsc(id).orElseThrow(()->dup);
                j.setGraphJson(newGraphJson);
                j.setVersion(j.getVersion()+1);
                j.setUpdatedAt(Instant.now());
                j=jourRepo.save(j);
            }
        } else {
            j=existing.get();
            if(b.containsKey("name")) j.setName((String)b.get("name"));
            j.setGraphJson(newGraphJson);
            j.setVersion(j.getVersion()+1);
            j.setUpdatedAt(Instant.now());
            j=jourRepo.save(j);
        }
        if(isNew || !GraphSerializer.isStyleOnlyDiff(oldGraphJson, newGraphJson, mapper)) notifyGraphChanged(id, j);
        return ResponseEntity.ok(j);
    }
    @PostMapping("/campaigns/{id}/journey/validate") public Map<String,Object> validateJourney(@PathVariable String id, @RequestBody(required=false) Map<String,Object> b){
        String gj;
        if(b!=null && (b.containsKey("graph")||b.containsKey("nodes"))){
            gj=GraphSerializer.serialize(b.getOrDefault("graph", b), mapper);
        } else {
            gj=jourRepo.findFirstByCampaignIdOrderByCreatedAtAsc(id).map(Journey::getGraphJson).orElse("{}");
        }
        var errs=new JourneyGraphValidator().validate(gj);
        List<Map<String,String>> out=errs.stream().map(e->{Map<String,String> m=new HashMap<>(); m.put("nodeId",e.nodeId); m.put("field",e.field); m.put("message",e.message); return m;}).toList();
        return Map.of("valid",errs.isEmpty(),"errors",out);
    }
    @PostMapping("/campaigns/{id}/journey/publish") public ResponseEntity<?> publishJourney(@PathVariable String id){
        var opt=jourRepo.findFirstByCampaignIdOrderByCreatedAtAsc(id);
        if(opt.isEmpty()) return ResponseEntity.notFound().build();
        Journey j=opt.get();
        var errs=new JourneyGraphValidator().validate(j.getGraphJson());
        if(!errs.isEmpty()) return ResponseEntity.badRequest().body(Map.of("valid",false,"errors",errs.stream().map(e->Map.of("nodeId",e.nodeId,"message",e.message)).toList()));
        j.setStatus("PUBLISHED");
        j.setVersion(j.getVersion()+1);
        j.setUpdatedAt(Instant.now());
        jourRepo.save(j);
        notifyGraphChanged(id, j);
        return ResponseEntity.ok(j);
    }
    @GetMapping("/campaigns/{id}/journey/graph-version") public ResponseEntity<Map<String,Object>> journeyGraphVersion(@PathVariable String id){
        var opt=jourRepo.findFirstByCampaignIdOrderByCreatedAtAsc(id);
        if(opt.isEmpty()) return ResponseEntity.notFound().build();
        Journey j=opt.get();
        Map<String,Object> out=new HashMap<>(); out.put("journeyId",j.getId()); out.put("campaignId",id); out.put("version",j.getVersion()); out.put("status",j.getStatus()); out.put("updatedAt",j.getUpdatedAt()!=null?j.getUpdatedAt().toString():"");
        return ResponseEntity.ok(out);
    }
    @DeleteMapping("/campaigns/{id}/journeys/{jid}") public ResponseEntity<?> deleteJourney(@PathVariable String id,@PathVariable String jid){
        var opt=jourRepo.findById(jid);
        if(opt.isEmpty() || !id.equals(opt.get().getCampaignId())) return ResponseEntity.notFound().build();
        jourRepo.deleteById(jid);
        return ResponseEntity.noContent().build();
    }
    @ExceptionHandler(BadGraphException.class) public ResponseEntity<Map<String,String>> badGraph(BadGraphException e){ return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage())); }
    private void notifyGraphChanged(String campaignId, Journey journey){ try{ Map<String,Object> payload=new HashMap<>(); payload.put("journeyId",journey.getId()); payload.put("campaignId",campaignId); payload.put("version",journey.getVersion()); rest.postForObject(aiUrl+"/v1/sessions/graph-changed", payload, Map.class); }catch(Exception ignored){} }
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
}
