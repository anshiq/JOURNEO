package com.journeo.journey.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="journey_sessions")
public class JourneySession {
    @Id private String id=UUID.randomUUID().toString();
    private String journeyId; private String campaignId; private String status="RUNNING";
    private String requestId; private Instant createdAt=Instant.now(); private Instant completedAt;
    public String getId(){return id;} public void setId(String v){this.id=v;}
    public String getJourneyId(){return journeyId;} public void setJourneyId(String v){this.journeyId=v;}
    public String getCampaignId(){return campaignId;} public void setCampaignId(String v){this.campaignId=v;}
    public String getStatus(){return status;} public void setStatus(String v){this.status=v;}
    public String getRequestId(){return requestId;} public void setRequestId(String v){this.requestId=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){this.createdAt=v;}
    public Instant getCompletedAt(){return completedAt;} public void setCompletedAt(Instant v){this.completedAt=v;}
}
