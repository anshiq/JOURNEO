package com.journeo.journey.controller;
import com.journeo.journey.logging.RequestLogRepository;
import com.journeo.journey.logging.RequestLogEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.*;
@RestController
public class TraceController {
    private final RequestLogRepository repo; private final RestTemplate rest;
    @Value("${analytics-service-url:http://localhost:8082}") String analyticsUrl;
    @Value("${connectors-service-url:http://localhost:8083}") String connUrl;
    @Value("${ai-service-url:http://localhost:8084}") String aiUrl;
    public TraceController(RequestLogRepository r, RestTemplate rt){this.repo=r;this.rest=rt;}
    @GetMapping("/internal/logs") public List<Map<String,Object>> internal(@RequestParam String requestId){ return repo.findByRequestId(requestId).stream().map(e->{Map<String,Object> m=new HashMap<>(); m.put("service","journey-service"); m.put("requestId",e.getRequestId()); m.put("method",e.getMethod()); m.put("path",e.getPath()); m.put("status",e.getStatus()); m.put("durationMs",e.getDurationMs()); m.put("factsJson",e.getFactsJson()); m.put("createdAt",e.getCreatedAt()!=null?e.getCreatedAt().toString():null); return m;}).toList(); }
    @GetMapping("/api/trace/{requestId}") public Map<String,Object> trace(@PathVariable String requestId){
        List<Map<String,Object>> all=new ArrayList<>();
        all.addAll(fetch(analyticsUrl+"/internal/logs?requestId="+requestId));
        all.addAll(fetch(connUrl+"/internal/logs?requestId="+requestId));
        all.addAll(fetch(aiUrl+"/internal/logs?requestId="+requestId));
        // local
        all.addAll(internal(requestId));
        all.sort(Comparator.comparing(m->String.valueOf(m.getOrDefault("createdAt",""))));
        return Map.of("requestId",requestId,"spans",all);
    }
    private List<Map<String,Object>> fetch(String url){
        try{ var resp=rest.getForObject(url, List.class); if(resp!=null) return resp; }catch(Exception e){ Map<String,Object> err=new HashMap<>(); err.put("error",e.getMessage()); err.put("url",url); return List.of(err); }
        return List.of();
    }
}
