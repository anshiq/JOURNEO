package com.journeo.journey;
import com.journeo.journey.validation.BadGraphException;
import com.journeo.journey.validation.GraphSerializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
class GraphSerializerTest {
  private final ObjectMapper mapper = new ObjectMapper();
  @Test void rejectsNonObjectGraph() {
    assertThrows(BadGraphException.class, () -> GraphSerializer.serialize("not-a-graph", mapper));
  }
  @Test void rejectsMissingNodesArray() {
    Map<String,Object> g = new HashMap<>();
    g.put("edges", List.of());
    g.put("screens", List.of());
    assertThrows(BadGraphException.class, () -> GraphSerializer.serialize(g, mapper));
  }
  @Test void rejectsMissingEdgesArray() {
    Map<String,Object> g = new HashMap<>();
    g.put("nodes", List.of());
    g.put("screens", List.of());
    assertThrows(BadGraphException.class, () -> GraphSerializer.serialize(g, mapper));
  }
  @Test void serializesValidGraph() {
    Map<String,Object> g = new HashMap<>();
    g.put("nodes", List.of(Map.of("id","n1","type","trigger")));
    g.put("edges", List.of());
    g.put("screens", List.of());
    String json = GraphSerializer.serialize(g, mapper);
    assertTrue(json.contains("\"n1\""));
  }
  @Test void styleOnlyDiffIgnoresStyleAndTheme() {
    String oldJson = "{\"theme\":{\"primary\":\"#000\"},\"screens\":[{\"id\":\"s1\",\"blocks\":[\"n1\"],\"theme\":{\"primary\":\"#000\"}}],\"nodes\":[{\"id\":\"n1\",\"type\":\"text\",\"config\":{\"label\":\"hi\",\"style\":{\"color\":\"red\"}}}],\"edges\":[]}";
    String newJson = "{\"theme\":{\"primary\":\"#fff\"},\"screens\":[{\"id\":\"s1\",\"blocks\":[\"n1\"],\"theme\":{\"primary\":\"#fff\"}}],\"nodes\":[{\"id\":\"n1\",\"type\":\"text\",\"config\":{\"label\":\"hi\",\"style\":{\"color\":\"blue\"}}}],\"edges\":[]}";
    assertTrue(GraphSerializer.isStyleOnlyDiff(oldJson, newJson, mapper));
  }
  @Test void styleOnlyDiffFalseWhenStructureChanges() {
    String oldJson = "{\"screens\":[],\"nodes\":[{\"id\":\"n1\",\"type\":\"text\",\"config\":{\"label\":\"hi\"}}],\"edges\":[]}";
    String newJson = "{\"screens\":[],\"nodes\":[{\"id\":\"n1\",\"type\":\"text\",\"config\":{\"label\":\"changed\"}}],\"edges\":[]}";
    assertFalse(GraphSerializer.isStyleOnlyDiff(oldJson, newJson, mapper));
  }
}
