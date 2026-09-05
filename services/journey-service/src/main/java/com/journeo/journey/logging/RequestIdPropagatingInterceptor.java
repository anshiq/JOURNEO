package com.journeo.journey.logging;

import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;

import java.io.IOException;
import java.util.Map;

public class RequestIdPropagatingInterceptor implements ClientHttpRequestInterceptor {
    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
        String rid = RequestContextHolder.getRequestId();
        if (rid != null) {
            request.getHeaders().set("X-Request-Id", rid);
        }
        long start = System.currentTimeMillis();
        ClientHttpResponse resp = execution.execute(request, body);
        long dur = System.currentTimeMillis() - start;
        try {
            RequestContextHolder.put("downstream_" + request.getURI().getPath().replaceAll("[^a-zA-Z0-9]", "_"),
                    Map.of("service", request.getURI().toString(), "status", resp.getStatusCode().value(), "durationMs", dur));
        } catch (Exception ignored) {}
        return resp;
    }
}
