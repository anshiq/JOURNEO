package com.journeo.common.logging;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class RequestContextHolder {
    private static final ThreadLocal<Map<String, Object>> CONTEXT = ThreadLocal.withInitial(LinkedHashMap::new);
    private static final ThreadLocal<String> REQUEST_ID = new ThreadLocal<>();
    private static final ThreadLocal<Long> START_MS = new ThreadLocal<>();

    public static void init(String requestId) {
        REQUEST_ID.set(requestId);
        START_MS.set(System.currentTimeMillis());
        CONTEXT.set(new LinkedHashMap<>());
    }

    public static String getRequestId() { return REQUEST_ID.get(); }
    public static Long getStartMs() { return START_MS.get(); }

    public static void put(String key, Object value) {
        CONTEXT.get().put(key, value);
    }

    public static Map<String, Object> getFacts() { return CONTEXT.get(); }

    public static void clear() {
        CONTEXT.remove();
        REQUEST_ID.remove();
        START_MS.remove();
    }
}
