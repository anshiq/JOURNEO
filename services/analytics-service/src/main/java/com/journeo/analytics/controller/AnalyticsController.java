package com.journeo.analytics.controller;
import com.journeo.analytics.entity.*;
import com.journeo.analytics.logging.RequestContextHolder;
import com.journeo.analytics.repository.*;
import com.journeo.analytics.logging.RequestLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;
@RestController
public class AnalyticsController {
    private final DeliveryEventRepository deliveryRepo;
    private final LlmUsageRepository llmRepo;
    private final MetricDefinitionRepository metricRepo;
    private final RequestLogRepository logRepo;
    private final ClickEventRepository clickRepo;
    public AnalyticsController(DeliveryEventRepository d, LlmUsageRepository l, MetricDefinitionRepository m, RequestLogRepository lr, ClickEventRepository cr){this.deliveryRepo=d;this.llmRepo=l;this.metricRepo=m;this.logRepo=lr;this.clickRepo=cr;}
    @GetMapping("/api/analytics/campaigns/{id}/reach")
    public Map<String,Object> reach(@PathVariable String id, @RequestParam(required=false) String from, @RequestParam(required=false) String to){
        LocalDate f=from!=null?LocalDate.parse(from):LocalDate.now().minusDays(30);
        LocalDate t=to!=null?LocalDate.parse(to):LocalDate.now();
        var events=deliveryRepo.findByCampaignIdAndDateBetween(id,f,t);
        long totalImp=events.stream().mapToLong(DeliveryEvent::getImpressions).sum();
        long totalClicks=events.stream().mapToLong(DeliveryEvent::getClicks).sum();
        double totalSpend=events.stream().mapToDouble(DeliveryEvent::getSpend).sum();
        long totalConv=events.stream().mapToLong(DeliveryEvent::getConversions).sum();
        double avgCtr=totalImp>0? (double)totalClicks/totalImp*100:0;
        double avgCpa=totalConv>0? totalSpend/totalConv:0;
        List<Map<String,Object>> series=events.stream().map(e->{Map<String,Object> m=new HashMap<>(); m.put("date",e.getDate().toString()); m.put("impressions",e.getImpressions()); m.put("clicks",e.getClicks()); m.put("ctr",e.getCtr()); m.put("cpa",e.getCpa()); m.put("spend",e.getSpend()); m.put("frequency",e.getFrequency()); m.put("reach",e.getReach()); return m;}).toList();
        return Map.of("campaignId",id,"window",Map.of("from",f.toString(),"to",t.toString()),"totals",Map.of("impressions",totalImp,"clicks",totalClicks,"spend",totalSpend,"conversions",totalConv,"ctr",avgCtr,"cpa",avgCpa),"series",series);
    }
    @GetMapping("/api/analytics/campaigns/{id}/metrics")
    public Map<String,Object> metrics(@PathVariable String id, @RequestParam(required=false) String from, @RequestParam(required=false) String to){
        return reach(id,from,to);
    }
    @PostMapping("/api/analytics/llm-usage")
    public LlmUsageEvent logUsage(@RequestBody Map<String,Object> b){
        LlmUsageEvent e=new LlmUsageEvent();
        e.setRequestId((String)b.get("requestId")); e.setAgentType((String)b.getOrDefault("agentType","unknown"));
        e.setModel((String)b.getOrDefault("model","unknown"));
        e.setPromptTokens(((Number)b.getOrDefault("promptTokens",0)).intValue());
        e.setCompletionTokens(((Number)b.getOrDefault("completionTokens",0)).intValue());
        e.setCostUsd(((Number)b.getOrDefault("costUsd",0)).doubleValue());
        RequestContextHolder.put("llmUsage",e.getAgentType());
        return llmRepo.save(e);
    }
    @PostMapping("/api/analytics/click")
    public ClickEvent logClick(@RequestBody Map<String,Object> b){
        ClickEvent e=new ClickEvent();
        e.setCampaignId((String)b.get("campaignId")); e.setEventName((String)b.getOrDefault("eventName","unknown"));
        e.setSessionId((String)b.get("sessionId"));
        return clickRepo.save(e);
    }
    @GetMapping("/api/analytics/llm-cost")
    public Map<String,Object> llmCost(@RequestParam(required=false) String campaignId){
        var all=llmRepo.findAll();
        double total=all.stream().mapToDouble(LlmUsageEvent::getCostUsd).sum();
        long totalTokens=all.stream().mapToLong(e->e.getPromptTokens()+e.getCompletionTokens()).sum();
        Map<String,Double> byAgent=new HashMap<>();
        for(var e: all) byAgent.merge(e.getAgentType(), e.getCostUsd(), Double::sum);
        return Map.of("totalCostUsd",total,"totalTokens",totalTokens,"byAgent",byAgent,"count",all.size());
    }
    @GetMapping("/catalog/metrics/definitions")
    public List<MetricDefinition> defs(){ return metricRepo.findAll(); }
    @GetMapping("/catalog/metrics/{campaignId}")
    public Map<String,Object> catalog(@PathVariable String campaignId, @RequestParam(required=false) String metrics, @RequestParam(required=false) String from, @RequestParam(required=false) String to){
        LocalDate f=from!=null?LocalDate.parse(from):LocalDate.now().minusDays(7);
        LocalDate t=to!=null?LocalDate.parse(to):LocalDate.now();
        var events=deliveryRepo.findByCampaignIdAndDateBetween(campaignId,f,t);
        if(events.isEmpty()) events=deliveryRepo.findByCampaignId(campaignId).stream().sorted(Comparator.comparing(DeliveryEvent::getDate).reversed()).limit(7).toList();
        double avgCtr=events.stream().mapToDouble(DeliveryEvent::getCtr).average().orElse(0);
        double avgCpa=events.stream().mapToDouble(DeliveryEvent::getCpa).average().orElse(0);
        double avgRoas=events.stream().mapToDouble(DeliveryEvent::getRoas).average().orElse(0);
        double avgReach=events.stream().mapToDouble(DeliveryEvent::getReach).average().orElse(0);
        double avgFreq=events.stream().mapToDouble(DeliveryEvent::getFrequency).average().orElse(0);
        double avgView=events.stream().mapToDouble(DeliveryEvent::getViewability).average().orElse(0);
        // previous window for delta
        LocalDate pf=f.minusDays(7); LocalDate pt=f.minusDays(1);
        var prev=deliveryRepo.findByCampaignIdAndDateBetween(campaignId,pf,pt);
        double prevCtr=prev.stream().mapToDouble(DeliveryEvent::getCtr).average().orElse(avgCtr);
        double prevCpa=prev.stream().mapToDouble(DeliveryEvent::getCpa).average().orElse(avgCpa);
        Set<String> wanted=metrics!=null?Set.of(metrics.split(",")):Set.of("ctr","cpa","roas","reach","frequency","viewability");
        List<Map<String,Object>> out=new ArrayList<>();
        var defs=metricRepo.findAll().stream().collect(java.util.stream.Collectors.toMap(MetricDefinition::getKey, d->d));
        if(wanted.contains("ctr")) out.add(metricMap("ctr",defs,avgCtr,prevCtr,"meta"));
        if(wanted.contains("cpa")) out.add(metricMap("cpa",defs,avgCpa,prevCpa,"meta"));
        if(wanted.contains("roas")) out.add(metricMap("roas",defs,avgRoas,avgRoas,"google"));
        if(wanted.contains("reach")) out.add(metricMap("reach",defs,avgReach,avgReach,"meta"));
        if(wanted.contains("frequency")) out.add(metricMap("frequency",defs,avgFreq,avgFreq,"meta"));
        if(wanted.contains("viewability")) out.add(metricMap("viewability",defs,avgView,avgView,"google"));
        return Map.of("campaign_id",campaignId,"window",Map.of("from",f.toString(),"to",t.toString()),"metrics",out);
    }
    private Map<String,Object> metricMap(String key, Map<String,MetricDefinition> defs, double val, double prev, String plat){
        var d=defs.get(key);
        Map<String,Object> m=new HashMap<>();
        m.put("key",key); m.put("label",d!=null?d.getLabel():key); m.put("definition",d!=null?d.getDefinition():""); m.put("unit",d!=null?d.getUnit():""); m.put("value",Math.round(val*100.0)/100.0); m.put("previous_value",Math.round(prev*100.0)/100.0); m.put("platform",plat);
        if(d!=null && d.getFormula()!=null) m.put("formula",d.getFormula());
        return m;
    }
    @GetMapping("/internal/logs")
    public List<Map<String,Object>> logs(@RequestParam String requestId){
        return logRepo.findByRequestId(requestId).stream().map(e->{Map<String,Object> m=new HashMap<>(); m.put("service","analytics-service"); m.put("requestId",e.getRequestId()); m.put("method",e.getMethod()); m.put("path",e.getPath()); m.put("status",e.getStatus()); m.put("durationMs",e.getDurationMs()); m.put("factsJson",e.getFactsJson()); m.put("createdAt",e.getCreatedAt()!=null?e.getCreatedAt().toString():null); return m;}).toList();
    }
}
