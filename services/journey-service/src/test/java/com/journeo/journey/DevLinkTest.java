package com.journeo.journey;
import com.journeo.journey.entity.Campaign;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.util.UUID;
class DevLinkTest {
  @Test void devTokenGenerated() {
    Campaign c=new Campaign();
    assertNotNull(c.getDevToken());
    assertTrue(c.getDevToken().length()>=36);
    assertNotNull(c.getDevLink());
    assertTrue(c.getDevLink().startsWith("/d/"));
  }
  @Test void devLinkForToken() {
    Campaign c=new Campaign();
    c.setDevToken(UUID.randomUUID().toString());
    assertEquals("/d/"+c.getDevToken(), c.getDevLink());
  }
  @Test void rotateInvalidates() {
    Campaign c=new Campaign();
    String old=c.getDevToken();
    c.setDevToken(UUID.randomUUID().toString());
    assertNotEquals(old,c.getDevToken());
  }
}
