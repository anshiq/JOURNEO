package com.journeo.common.logging;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class RequestContextFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(RequestContextFilter.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String requestId = request.getHeader("X-Request-Id");
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        RequestContextHolder.init(requestId);
        response.setHeader("X-Request-Id", requestId);
        long start = System.currentTimeMillis();
        try {
            chain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - start;
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("requestId", requestId);
            line.put("method", request.getMethod());
            line.put("path", request.getRequestURI());
            line.put("status", response.getStatus());
            line.put("durationMs", duration);
            line.putAll(RequestContextHolder.getFacts());
            try {
                String json = MAPPER.writeValueAsString(line);
                // canonical log line to stdout
                System.out.println(json);
                log.info(json);
            } catch (Exception e) {
                log.warn("Failed to serialize canonical log", e);
            }
            // also persist if repository is available - handled by service layer
            RequestContextHolder.clear();
        }
    }
}
