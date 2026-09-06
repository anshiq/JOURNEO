package com.journeo.journey.validation;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Map;
public class GraphSerializer {
    private GraphSerializer(){}
    public static String serialize(Object graph, ObjectMapper mapper){
        if(!(graph instanceof Map)) throw new BadGraphException("graph must be an object");
        Map<?,?> g=(Map<?,?>)graph;
        if(!(g.get("nodes") instanceof java.util.List)) throw new BadGraphException("graph.nodes must be an array");
        if(!(g.get("edges") instanceof java.util.List)) throw new BadGraphException("graph.edges must be an array");
        try{ return mapper.writeValueAsString(g); }catch(Exception e){ throw new BadGraphException(e.getMessage()); }
    }
    public static boolean isStyleOnlyDiff(String oldJson, String newJson, ObjectMapper mapper){
        if(oldJson==null || newJson==null) return false;
        try{
            JsonNode oldRoot=stripStyle(mapper.readTree(oldJson), mapper);
            JsonNode newRoot=stripStyle(mapper.readTree(newJson), mapper);
            return oldRoot.equals(newRoot);
        }catch(Exception e){ return false; }
    }
    private static JsonNode stripStyle(JsonNode root, ObjectMapper mapper){
        ObjectNode clone=(ObjectNode) root.deepCopy();
        clone.remove("theme");
        JsonNode nodes=clone.get("nodes");
        if(nodes!=null && nodes.isArray()){
            ArrayNode strippedNodes=mapper.createArrayNode();
            for(JsonNode n: nodes){
                ObjectNode nn=(ObjectNode) n.deepCopy();
                JsonNode cfg=nn.get("config");
                if(cfg!=null && cfg.isObject()){
                    ObjectNode cc=(ObjectNode) cfg.deepCopy();
                    cc.remove("style");
                    cc.remove("theme");
                    nn.set("config", cc);
                }
                strippedNodes.add(nn);
            }
            clone.set("nodes", strippedNodes);
        }
        return clone;
    }
}
