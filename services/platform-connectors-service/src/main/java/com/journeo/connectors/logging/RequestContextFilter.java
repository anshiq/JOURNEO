package com.journeo.connectors.logging;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import com.journeo.connectors.logging.RequestLogEntity;
import com.journeo.connectors.logging.RequestLogRepository;
import java.util.*;
@Component("journeoRequestContextFilter")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestContextFilter extends OncePerRequestFilter {
    private static final ObjectMapper M = new ObjectMapper();
    @Autowired(required=false) private RequestLogRepository logRepo;
    @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        String rid = req.getHeader("X-Request-Id");
        if(rid==null||rid.isBlank()) rid=UUID.randomUUID().toString();
        RequestContextHolder.init(rid);
        res.setHeader("X-Request-Id", rid);
        long start=System.currentTimeMillis();
        try{ chain.doFilter(req,res); } finally {
            long dur=System.currentTimeMillis()-start;
            Map<String,Object> line=new LinkedHashMap<>();
            line.put("requestId",rid); line.put("method",req.getMethod()); line.put("path",req.getRequestURI());
            line.put("status",res.getStatus()); line.put("durationMs",dur); line.putAll(RequestContextHolder.getFacts());
            try{ System.out.println(M.writeValueAsString(line)); } catch(Exception ignored){}
            try{
                if(logRepo!=null){
                    RequestLogEntity e=new RequestLogEntity();
                    e.setRequestId(rid);
                    e.setMethod(req.getMethod());
                    e.setPath(req.getRequestURI());
                    e.setStatus(res.getStatus());
                    e.setDurationMs(dur);
                    try{ e.setFactsJson(M.writeValueAsString(RequestContextHolder.getFacts())); }catch(Exception ex){ e.setFactsJson("{}"); }
                    logRepo.save(e);
                }
            }catch(Exception ignored){}
            RequestContextHolder.clear();
        }
    }
}
