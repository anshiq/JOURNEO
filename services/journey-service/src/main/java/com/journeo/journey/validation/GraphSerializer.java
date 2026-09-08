package com.journeo.journey.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Map;

public class GraphSerializer {
    private GraphSerializer() {}

    public static String serialize(Object graph, ObjectMapper mapper) {
        if (!(graph instanceof Map)) throw new BadGraphException("graph must be an object");
        Map<?, ?> value = (Map<?, ?>) graph;
        if (!(value.get("screens") instanceof java.util.List)) throw new BadGraphException("graph.screens must be an array");
        if (!(value.get("nodes") instanceof java.util.List)) throw new BadGraphException("graph.nodes must be an array");
        if (!(value.get("edges") instanceof java.util.List)) throw new BadGraphException("graph.edges must be an array");
        try {
            return mapper.writeValueAsString(value);
        } catch (Exception exception) {
            throw new BadGraphException(exception.getMessage());
        }
    }

    public static boolean isStyleOnlyDiff(String oldJson, String newJson, ObjectMapper mapper) {
        if (oldJson == null || newJson == null) return false;
        try {
            return stripStyle(mapper.readTree(oldJson), mapper).equals(stripStyle(mapper.readTree(newJson), mapper));
        } catch (Exception exception) {
            return false;
        }
    }

    private static JsonNode stripStyle(JsonNode root, ObjectMapper mapper) {
        if (!root.isObject()) return root;
        ObjectNode clone = (ObjectNode) root.deepCopy();
        clone.remove("theme");
        JsonNode nodes = clone.get("nodes");
        if (nodes != null && nodes.isArray()) {
            ArrayNode stripped = mapper.createArrayNode();
            for (JsonNode node : nodes) {
                ObjectNode copy = (ObjectNode) node.deepCopy();
                JsonNode config = copy.get("config");
                if (config != null && config.isObject()) {
                    ObjectNode configCopy = (ObjectNode) config.deepCopy();
                    configCopy.remove("style");
                    configCopy.remove("theme");
                    copy.set("config", configCopy);
                }
                stripped.add(copy);
            }
            clone.set("nodes", stripped);
        }
        JsonNode screens = clone.get("screens");
        if (screens != null && screens.isArray()) {
            ArrayNode stripped = mapper.createArrayNode();
            for (JsonNode screen : screens) {
                ObjectNode copy = (ObjectNode) screen.deepCopy();
                copy.remove("style");
                copy.remove("theme");
                stripped.add(copy);
            }
            clone.set("screens", stripped);
        }
        return clone;
    }
}
