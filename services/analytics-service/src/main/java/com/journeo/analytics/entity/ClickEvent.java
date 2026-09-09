package com.journeo.analytics.entity;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="click_events")
public class ClickEvent {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    private String campaignId; private String eventName; private String sessionId;
    private Instant createdAt=Instant.now();
    public Long getId(){return id;} public void setId(Long v){this.id=v;}
    public String getCampaignId(){return campaignId;} public void setCampaignId(String v){this.campaignId=v;}
    public String getEventName(){return eventName;} public void setEventName(String v){this.eventName=v;}
    public String getSessionId(){return sessionId;} public void setSessionId(String v){this.sessionId=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){this.createdAt=v;}
}
