package com.journeo.journey;
import com.journeo.journey.controller.CampaignController;
import com.journeo.journey.entity.Campaign;
import com.journeo.journey.entity.Journey;
import com.journeo.journey.repository.ActivityEventRepository;
import com.journeo.journey.repository.CampaignRepository;
import com.journeo.journey.repository.JourneyRepository;
import com.journeo.journey.service.DevLinkService;
import com.journeo.journey.validation.BadGraphException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CampaignControllerTest {
  private CampaignRepository campRepo;
  private JourneyRepository jourRepo;
  private CampaignController controller;

  @BeforeEach void setUp() {
    campRepo = mock(CampaignRepository.class);
    jourRepo = mock(JourneyRepository.class);
    ActivityEventRepository actRepo = mock(ActivityEventRepository.class);
    RestTemplate rest = mock(RestTemplate.class);
    DevLinkService devLinkService = mock(DevLinkService.class);
    controller = new CampaignController(campRepo, jourRepo, actRepo, rest, devLinkService);
    when(campRepo.existsById("c1")).thenReturn(true);
    when(jourRepo.save(any(Journey.class))).thenAnswer(inv -> inv.getArgument(0));
  }

  private Map<String,Object> graphBody(String nodeId) {
    Map<String,Object> graph = new HashMap<>();
    graph.put("schemaVersion", 3);
    graph.put("nodes", List.of(Map.of("id", nodeId, "type", "trigger")));
    graph.put("screens", List.of());
    graph.put("edges", List.of());
    Map<String,Object> body = new HashMap<>();
    body.put("graph", graph);
    return body;
  }

  @Test void upsertCreatesJourneyWhenNoneExists() {
    when(jourRepo.findFirstByCampaignIdOrderByCreatedAtAsc("c1")).thenReturn(Optional.empty());
    ResponseEntity<?> res = controller.upsertJourney("c1", graphBody("n1"));
    assertEquals(200, res.getStatusCode().value());
    verify(jourRepo, times(1)).save(any(Journey.class));
    Journey saved = (Journey) res.getBody();
    assertNotNull(saved);
    assertTrue(saved.getGraphJson().contains("n1"));
  }

  @Test void upsertUpdatesExistingJourneyWithoutCreatingDuplicate() {
    Journey existing = new Journey();
    existing.setCampaignId("c1");
    existing.setGraphJson("{\"schemaVersion\":3,\"screens\":[],\"nodes\":[],\"edges\":[]}");
    when(jourRepo.findFirstByCampaignIdOrderByCreatedAtAsc("c1")).thenReturn(Optional.of(existing));
    ResponseEntity<?> res = controller.upsertJourney("c1", graphBody("n2"));
    assertEquals(200, res.getStatusCode().value());
    verify(jourRepo, times(1)).save(any(Journey.class));
    Journey saved = (Journey) res.getBody();
    assertEquals(existing.getId(), saved.getId());
    assertTrue(saved.getGraphJson().contains("n2"));
    assertEquals(2, saved.getVersion());
  }

  @Test void upsertRejectsMalformedGraph() {
    Map<String,Object> body = new HashMap<>();
    body.put("graph", "not-an-object");
    when(jourRepo.findFirstByCampaignIdOrderByCreatedAtAsc("c1")).thenReturn(Optional.empty());
    assertThrows(BadGraphException.class, () -> controller.upsertJourney("c1", body));
    verify(jourRepo, never()).save(any(Journey.class));
  }

  @Test void publishBumpsVersionAndSetsStatus() {
    Journey existing = new Journey();
    existing.setCampaignId("c1");
    existing.setVersion(1);
    existing.setGraphJson("{\"schemaVersion\":3,\"screens\":[{\"id\":\"s1\",\"blocks\":[\"b1\"],\"layout\":{},\"advance\":{\"mode\":\"button\",\"handle\":\"default\"},\"back\":{\"show\":false}}],\"nodes\":[{\"id\":\"t1\",\"type\":\"trigger\"},{\"id\":\"b1\",\"type\":\"text\",\"config\":{\"content\":\"hello\"}},{\"id\":\"e1\",\"type\":\"end\"}],\"edges\":[{\"id\":\"e1\",\"source\":\"t1\",\"target\":\"s1\"},{\"id\":\"e2\",\"source\":\"s1\",\"target\":\"e1\",\"sourceHandle\":\"default\"}]}");
    when(jourRepo.findFirstByCampaignIdOrderByCreatedAtAsc("c1")).thenReturn(Optional.of(existing));
    ResponseEntity<?> res = controller.publishJourney("c1");
    assertEquals(200, res.getStatusCode().value());
    Journey published = (Journey) res.getBody();
    assertEquals("PUBLISHED", published.getStatus());
    assertEquals(2, published.getVersion());
  }

  @Test void publishFailsValidationOnEmptyGraph() {
    Journey existing = new Journey();
    existing.setCampaignId("c1");
    existing.setGraphJson("{\"schemaVersion\":3,\"screens\":[],\"nodes\":[],\"edges\":[]}");
    when(jourRepo.findFirstByCampaignIdOrderByCreatedAtAsc("c1")).thenReturn(Optional.of(existing));
    ResponseEntity<?> res = controller.publishJourney("c1");
    assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
    verify(jourRepo, never()).save(any(Journey.class));
  }
}
