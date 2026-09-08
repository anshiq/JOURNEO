package com.journeo.journey.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

public class JourneyGraphValidator {
    public static class ValidationError {
        public String nodeId;
        public String field;
        public String message;
        public String severity;
        public ValidationError(String nodeId, String field, String message) {
            this(nodeId, field, message, "error");
        }
        public ValidationError(String nodeId, String field, String message, String severity) {
            this.nodeId = nodeId;
            this.field = field;
            this.message = message;
            this.severity = severity;
        }
    }

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Set<String> FLOW_TYPES = Set.of("trigger", "condition", "end");
    private static final Set<String> VALUE_TYPES = Set.of("input", "select", "checkbox", "rating");
    private static final Set<String> KNOWN_TYPES = Set.of("trigger", "condition", "end", "text", "image", "video", "button", "input", "select", "checkbox", "rating", "divider", "card", "hero_section", "quiz", "form", "countdown", "alert", "badge");
    private static final Set<String> OPERATORS = Set.of("eq", "neq", "contains", "gt", "lt", "gte", "lte");

    public List<ValidationError> validate(String graphJson) {
        List<ValidationError> errors = new ArrayList<>();
        if (graphJson == null || graphJson.isBlank()) {
            errors.add(new ValidationError("graph", "schemaVersion", "Unsupported graph schema, rebuild the journey"));
            return errors;
        }
        try {
            JsonNode root = MAPPER.readTree(graphJson);
            if (!root.isObject() || root.path("schemaVersion").asInt(-1) != 3) {
                errors.add(new ValidationError("graph", "schemaVersion", "Unsupported graph schema, rebuild the journey"));
                return errors;
            }
            JsonNode nodes = root.get("nodes");
            JsonNode screens = root.get("screens");
            JsonNode edges = root.get("edges");
            if (nodes == null || !nodes.isArray()) errors.add(new ValidationError("graph", "nodes", "graph.nodes must be an array"));
            if (screens == null || !screens.isArray()) errors.add(new ValidationError("graph", "screens", "graph.screens must be an array"));
            if (edges == null || !edges.isArray()) errors.add(new ValidationError("graph", "edges", "graph.edges must be an array"));
            if (!errors.isEmpty()) return errors;

            Map<String, JsonNode> nodeById = new LinkedHashMap<>();
            Map<String, JsonNode> screenById = new LinkedHashMap<>();
            Map<String, String> ownerByBlock = new HashMap<>();
            Set<String> vertexIds = new HashSet<>();
            List<String> triggerIds = new ArrayList<>();

            for (JsonNode node : nodes) {
                String id = node.path("id").asText();
                String type = node.path("type").asText();
                if (id.isBlank()) errors.add(new ValidationError("graph", "nodes", "Every node requires an id"));
                if (nodeById.put(id, node) != null) errors.add(new ValidationError(id, "id", "Duplicate node id"));
                if (!KNOWN_TYPES.contains(type)) errors.add(new ValidationError(id, "type", "Unknown node type: " + type));
                if ("trigger".equals(type)) triggerIds.add(id);
                if (FLOW_TYPES.contains(type)) vertexIds.add(id);
                validateNodeConfig(errors, id, type, node.path("config"));
                if (VALUE_TYPES.contains(type) && node.path("config").path("blockKey").asText().isBlank()) errors.add(new ValidationError(id, "config.blockKey", type + " requires blockKey"));
            }

            for (JsonNode screen : screens) {
                String id = screen.path("id").asText();
                if (id.isBlank()) errors.add(new ValidationError("graph", "screens", "Every screen requires an id"));
                if (screenById.put(id, screen) != null) errors.add(new ValidationError(id, "id", "Duplicate screen id"));
                vertexIds.add(id);
                JsonNode blocks = screen.get("blocks");
                if (blocks == null || !blocks.isArray()) {
                    errors.add(new ValidationError(id, "blocks", "Screen blocks must be an array"));
                    continue;
                }
                if (blocks.isEmpty()) errors.add(new ValidationError(id, "blocks", "Screen has no blocks"));
                Set<String> blockKeys = new HashSet<>();
                for (JsonNode blockIdNode : blocks) {
                    String blockId = blockIdNode.asText();
                    String previous = ownerByBlock.putIfAbsent(blockId, id);
                    if (previous != null) errors.add(new ValidationError(blockId, "blocks", "Block belongs to multiple screens"));
                    JsonNode block = nodeById.get(blockId);
                    if (block == null) {
                        errors.add(new ValidationError(id, "blocks", "Screen references missing block " + blockId));
                        continue;
                    }
                    if (FLOW_TYPES.contains(block.path("type").asText())) errors.add(new ValidationError(blockId, "blocks", "Flow node cannot be inside a screen"));
                    String key = block.path("config").path("blockKey").asText();
                    if (!key.isBlank() && !blockKeys.add(key)) errors.add(new ValidationError(blockId, "config.blockKey", "Duplicate blockKey in screen"));
                }
                validateScreen(errors, screen, blocks, nodeById, screenById, edges);
            }

            for (Map.Entry<String, JsonNode> entry : nodeById.entrySet()) {
                if (!FLOW_TYPES.contains(entry.getValue().path("type").asText()) && !ownerByBlock.containsKey(entry.getKey())) errors.add(new ValidationError(entry.getKey(), "blocks", "Renderable block is not in any screen"));
            }
            if (triggerIds.size() != 1) errors.add(new ValidationError("graph", "trigger", "Exactly one trigger required, found " + triggerIds.size()));

            Map<String, List<JsonNode>> adjacency = new HashMap<>();
            for (JsonNode edge : edges) {
                String source = edge.path("source").asText();
                String target = edge.path("target").asText();
                if (!vertexIds.contains(source) || !vertexIds.contains(target)) errors.add(new ValidationError(edge.path("id").asText("edge"), "edges", "Edge references missing vertex"));
                adjacency.computeIfAbsent(source, ignored -> new ArrayList<>()).add(edge);
                String handle = edge.path("sourceHandle").asText();
                if (handle.contains(":")) {
                    String blockId = handle.substring(0, handle.indexOf(':'));
                    JsonNode sourceScreen = screenById.get(source);
                    if (sourceScreen == null || !containsText(sourceScreen.path("blocks"), blockId)) errors.add(new ValidationError(edge.path("id").asText("edge"), "edges", "Edge handle references block outside source screen"));
                }
            }

            if (triggerIds.size() == 1) {
                Set<String> visited = reachable(triggerIds.get(0), adjacency, vertexIds);
                for (String screenId : screenById.keySet()) if (!visited.contains(screenId)) errors.add(new ValidationError(screenId, "graph", "Unreachable screen"));
                if (hasCycle(adjacency, vertexIds)) errors.add(new ValidationError("graph", "edges", "Cycle detected outside subflow boundary"));
            }
            JsonNode askAi = root.get("askAi");
            if (askAi != null && askAi.isObject() && "per-screen".equals(askAi.path("scope").asText())) {
                boolean enabled = false;
                for (JsonNode screen : screens) enabled |= screen.path("askAi").path("enabled").asBoolean(false);
                if (!enabled) errors.add(new ValidationError("graph", "askAi.scope", "per-screen scope has no enabled screen", "warning"));
            }
        } catch (Exception exception) {
            errors.add(new ValidationError("graph", "json", "Invalid JSON: " + exception.getMessage()));
        }
        return errors;
    }

    private void validateNodeConfig(List<ValidationError> errors, String id, String type, JsonNode config) {
        if ("condition".equals(type)) {
            if (config.path("field").asText().isBlank()) errors.add(new ValidationError(id, "config.field", "Condition node requires field"));
            if (!OPERATORS.contains(config.path("operator").asText())) errors.add(new ValidationError(id, "config.operator", "Condition requires a valid operator"));
        } else if ("image".equals(type) && config.path("src").asText().isBlank()) errors.add(new ValidationError(id, "config.src", "image requires src"));
        else if ("button".equals(type) && config.path("label").asText().isBlank()) errors.add(new ValidationError(id, "config.label", "button requires label"));
        else if ("select".equals(type) && (!config.path("options").isArray() || config.path("options").isEmpty())) errors.add(new ValidationError(id, "config.options", "select requires at least 1 option"));
        else if ("hero_section".equals(type) && config.path("headline").asText().isBlank()) errors.add(new ValidationError(id, "config.headline", "hero_section requires headline"));
        else if ("quiz".equals(type) && config.path("question").asText().isBlank()) errors.add(new ValidationError(id, "config.question", "quiz requires question"));
        else if ("quiz".equals(type) && (!config.path("options").isArray() || config.path("options").isEmpty())) errors.add(new ValidationError(id, "config.options", "quiz requires at least 1 option"));
        else if ("form".equals(type) && (!config.path("fields").isArray() || config.path("fields").isEmpty())) errors.add(new ValidationError(id, "config.fields", "form requires at least one field"));
        else if ("countdown".equals(type) && config.path("endTime").asText().isBlank()) errors.add(new ValidationError(id, "config.endTime", "countdown requires endTime"));
        else if ("alert".equals(type) && config.path("message").asText().isBlank()) errors.add(new ValidationError(id, "config.message", "alert requires message"));
        else if ("badge".equals(type) && config.path("label").asText().isBlank()) errors.add(new ValidationError(id, "config.label", "badge requires label"));
    }

    private void validateScreen(List<ValidationError> errors, JsonNode screen, JsonNode blocks, Map<String, JsonNode> nodeById, Map<String, JsonNode> screenById, JsonNode edges) {
        String id = screen.path("id").asText();
        JsonNode advance = screen.path("advance");
        String mode = advance.path("mode").asText("button");
        boolean hasOwnedExit = false;
        for (JsonNode blockId : blocks) {
            JsonNode block = nodeById.get(blockId.asText());
            if (block != null) hasOwnedExit |= block.path("config").path("blockOwnsExit").asBoolean(false);
        }
        if ("button".equals(mode) && !screenById.isEmpty()) {
            boolean outgoing = false;
            for (JsonNode edge : edges) outgoing |= id.equals(edge.path("source").asText());
            if (!outgoing) errors.add(new ValidationError(id, "advance.mode", "Button advance requires an outgoing edge"));
        }
        if ("block".equals(mode) && !hasOwnedExit) errors.add(new ValidationError(id, "advance.mode", "Block advance requires a block with blockOwnsExit"));
        if ("none".equals(mode)) {
            for (JsonNode edge : edges) if (id.equals(edge.path("source").asText())) {
                errors.add(new ValidationError(id, "advance.mode", "Advance mode none should not have outgoing edges", "warning"));
                break;
            }
        }
        JsonNode required = advance.path("requireBlocks");
        if (required.isArray()) for (JsonNode entry : required) {
            String blockId = entry.asText();
            if (!containsText(blocks, blockId)) errors.add(new ValidationError(id, "advance.requireBlocks", "requireBlocks references missing block " + blockId));
            else if (nodeById.get(blockId).path("config").path("blockKey").asText().isBlank()) errors.add(new ValidationError(id, "advance.requireBlocks", "requireBlocks entry has no blockKey"));
        }
    }


    private boolean containsText(JsonNode values, String wanted) {
        if (values == null || !values.isArray()) return false;
        for (JsonNode value : values) if (wanted.equals(value.asText())) return true;
        return false;
    }

    private Set<String> reachable(String start, Map<String, List<JsonNode>> adjacency, Set<String> vertices) {
        Set<String> visited = new HashSet<>();
        ArrayDeque<String> queue = new ArrayDeque<>();
        queue.add(start);
        visited.add(start);
        while (!queue.isEmpty()) {
            String current = queue.removeFirst();
            for (JsonNode edge : adjacency.getOrDefault(current, List.of())) {
                String target = edge.path("target").asText();
                if (vertices.contains(target) && visited.add(target)) queue.addLast(target);
            }
        }
        return visited;
    }

    private boolean hasCycle(Map<String, List<JsonNode>> adjacency, Set<String> vertices) {
        Map<String, Integer> state = new HashMap<>();
        for (String vertex : vertices) state.put(vertex, 0);
        for (String vertex : vertices) if (state.get(vertex) == 0 && visit(vertex, adjacency, state)) return true;
        return false;
    }

    private boolean visit(String current, Map<String, List<JsonNode>> adjacency, Map<String, Integer> state) {
        state.put(current, 1);
        for (JsonNode edge : adjacency.getOrDefault(current, List.of())) {
            String target = edge.path("target").asText();
            if (!state.containsKey(target)) continue;
            if (state.get(target) == 1 || state.get(target) == 0 && visit(target, adjacency, state)) return true;
        }
        state.put(current, 2);
        return false;
    }
}
