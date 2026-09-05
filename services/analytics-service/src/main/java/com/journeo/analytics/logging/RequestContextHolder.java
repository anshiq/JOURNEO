package com.journeo.analytics.logging;
import java.util.*;
public class RequestContextHolder {
    private static final ThreadLocal<Map<String,Object>> CONTEXT = ThreadLocal.withInitial(LinkedHashMap::new);
    private static final ThreadLocal<String> RID = new ThreadLocal<>();
    private static final ThreadLocal<Long> START = new ThreadLocal<>();
    public static void init(String r){ RID.set(r); START.set(System.currentTimeMillis()); CONTEXT.set(new LinkedHashMap<>()); }
    public static String getRequestId(){return RID.get();}
    public static void put(String k,Object v){CONTEXT.get().put(k,v);}
    public static Map<String,Object> getFacts(){return CONTEXT.get();}
    public static void clear(){ CONTEXT.remove(); RID.remove(); START.remove(); }
}
