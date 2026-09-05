package com.journeo.connectors.controller;
import com.journeo.connectors.entity.*;
import com.journeo.connectors.logging.RequestContextHolder;
import com.journeo.connectors.logging.RequestLogRepository;
import com.journeo.connectors.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.*;
@RestController
public class ConnectorsController {
    private final MockCampaignRepository campRepo; private final AuditLogRepository auditRepo;
    private final RequestLogRepository logRepo; private final ObjectMapper mapper=new ObjectMapper();
    public ConnectorsController(MockCampaignRepository c, AuditLogRepository a, RequestLogRepository l){this.campRepo=c;this.auditRepo=a;this.logRepo=l;}
    // META
    @PostMapping("/mock/meta/campaigns")
    public Map<String,Object> createMeta(@RequestBody Map<String,Object> body, @RequestHeader(value="X-Request-Id",required=false) String rid){
        String reqId=rid!=null?rid:RequestContextHolder.getRequestId();
        MockCampaign mc=new MockCampaign(); mc.setPlatform("meta");
        mc.setName((String)body.getOrDefault("name","Untitled")); mc.setDailyBudget(((Number)body.getOrDefault("daily_budget",100)).doubleValue());
        mc.setExternalId("act_"+UUID.randomUUID().toString().substring(0,6)+"/campaigns/"+UUID.randomUUID().toString().substring(0,8));
        try{mc.setRawJson(mapper.writeValueAsString(body));}catch(Exception e){}
        campRepo.save(mc);
        audit("studio_ai_chat:user","meta","create_campaign",mc.getExternalId(),null,mc.getRawJson(),reqId);
        Map<String,Object> resp=new HashMap<>();
        resp.put("id",mc.getExternalId()); resp.put("status",mc.getStatus()); resp.put("mocked",true); resp.put("platform","meta"); resp.put("note","Mocked facebook-business SDK: POST /act_{adaccount}/campaigns");
        return resp;
    }
    @PostMapping("/mock/meta/campaigns/{id}/pause")
    public Map<String,Object> pauseMeta(@PathVariable String id, @RequestBody(required=false) Map<String,Object> body, @RequestHeader(value="X-Request-Id",required=false) String rid){
        String reqId=rid!=null?rid:RequestContextHolder.getRequestId();
        var opt=campRepo.findAll().stream().filter(c->id.equals(c.getExternalId())||id.equals(c.getId())).findFirst();
        String before=null; if(opt.isPresent()) before=opt.get().getStatus();
        if(opt.isPresent()){ opt.get().setStatus("PAUSED"); opt.get().setUpdatedAt(Instant.now()); campRepo.save(opt.get()); }
        audit(body!=null && body.get("actor")!=null? body.get("actor").toString():"system:anomaly_detector","meta","pause_campaign",id,before,"PAUSED",reqId);
        return Map.of("id",id,"status","PAUSED","mocked",true,"platform","meta");
    }
    @PostMapping("/mock/meta/budget-reallocate")
    public Map<String,Object> reallocateMeta(@RequestBody Map<String,Object> body, @RequestHeader(value="X-Request-Id",required=false) String rid){
        String reqId=rid!=null?rid:RequestContextHolder.getRequestId();
        audit("system:optimizer","meta","reallocate_budget",String.valueOf(body.get("campaignId")),null,body.toString(),reqId);
        return Map.of("status","reallocated","mocked",true,"platform","meta","details",body);
    }
    // GOOGLE
    @PostMapping("/mock/google/campaigns")
    public Map<String,Object> createGoogle(@RequestBody Map<String,Object> body, @RequestHeader(value="X-Request-Id",required=false) String rid){
        String reqId=rid!=null?rid:RequestContextHolder.getRequestId();
        MockCampaign mc=new MockCampaign(); mc.setPlatform("google");
        mc.setName((String)body.getOrDefault("campaignName",body.getOrDefault("name","Untitled")));
        Object b=body.get("budgetMicros"); if(b instanceof Number) mc.setDailyBudget(((Number)b).doubleValue()/1_000_000);
        else mc.setDailyBudget(((Number)body.getOrDefault("daily_budget",100)).doubleValue());
        mc.setExternalId("customers/"+UUID.randomUUID().toString().substring(0,6)+"/campaigns/"+UUID.randomUUID().toString().substring(0,8));
        try{mc.setRawJson(mapper.writeValueAsString(body));}catch(Exception e){}
        campRepo.save(mc);
        audit("studio_ai_chat:user","google","create_campaign",mc.getExternalId(),null,mc.getRawJson(),reqId);
        return Map.of("resourceName",mc.getExternalId(),"status",mc.getStatus(),"mocked",true,"platform","google","note","Mocked google-ads SDK: CampaignService.MutateCampaigns");
    }
    @PostMapping("/mock/google/campaigns/{id}/pause")
    public Map<String,Object> pauseGoogle(@PathVariable String id, @RequestHeader(value="X-Request-Id",required=false) String rid){
        String reqId=rid!=null?rid:RequestContextHolder.getRequestId();
        audit("system:anomaly_detector","google","pause_campaign",id,"ACTIVE","PAUSED",reqId);
        return Map.of("resourceName",id,"status","PAUSED","mocked",true);
    }
    @PostMapping("/mock/whatsapp/broadcasts")
    public Map<String,Object> createWhatsapp(@RequestBody Map<String,Object> body, @RequestHeader(value="X-Request-Id",required=false) String rid){
        String reqId=rid!=null?rid:RequestContextHolder.getRequestId();
        MockCampaign mc=new MockCampaign(); mc.setPlatform("whatsapp"); mc.setName((String)body.getOrDefault("templateName",body.getOrDefault("name","broadcast")));
        mc.setExternalId("waba_"+UUID.randomUUID().toString().substring(0,8)); try{mc.setRawJson(mapper.writeValueAsString(body));}catch(Exception e){}
        campRepo.save(mc);
        audit("journey_node:broadcast","whatsapp","create_broadcast",mc.getExternalId(),null,mc.getRawJson(),reqId);
        return Map.of("id",mc.getExternalId(),"status","SENT","mocked",true,"platform","whatsapp","note","Mocked WhatsApp Cloud API: POST /{phone-number-id}/messages (template)");
    }
    @GetMapping("/mock/{platform}/campaigns/{id}")
    public Map<String,Object> getCamp(@PathVariable String platform,@PathVariable String id){
        var opt=campRepo.findAll().stream().filter(c->id.equals(c.getExternalId())||id.equals(c.getId())).findFirst();
        if(opt.isEmpty()) return Map.of("error","not found","mocked",true);
        MockCampaign c=opt.get();
        return Map.of("id",c.getExternalId(),"platform",c.getPlatform(),"name",c.getName(),"status",c.getStatus(),"dailyBudget",c.getDailyBudget(),"mocked",true);
    }
    @GetMapping("/audit-log")
    public List<AuditLogEntry> auditLog(@RequestParam(required=false) String campaignId, @RequestParam(required=false) String actor){
        if(campaignId!=null) return auditRepo.findByCampaignId(campaignId);
        if(actor!=null) return auditRepo.findByActor(actor);
        return auditRepo.findAll();
    }
    @GetMapping("/internal/logs")
    public List<Map<String,Object>> logs(@RequestParam String requestId){
        return logRepo.findByRequestId(requestId).stream().map(e->{Map<String,Object> m=new HashMap<>(); m.put("service","platform-connectors-service"); m.put("requestId",e.getRequestId()); m.put("method",e.getMethod()); m.put("path",e.getPath()); m.put("status",e.getStatus()); m.put("durationMs",e.getDurationMs()); m.put("factsJson",e.getFactsJson()); m.put("createdAt",e.getCreatedAt()!=null?e.getCreatedAt().toString():null); return m;}).toList();
    }
    private void audit(String actor,String plat,String action,String cid,String before,String after,String rid){
        AuditLogEntry e=new AuditLogEntry(); e.setActor(actor); e.setPlatform(plat); e.setActionType(action); e.setCampaignId(cid); e.setBeforeState(before); e.setAfterState(after); e.setRequestId(rid); auditRepo.save(e);
        RequestContextHolder.put("audit_"+action,cid);
    }
}
