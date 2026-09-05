package com.journeo.journey.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="activity_events")
public class ActivityEvent {
    @Id private String id=UUID.randomUUID().toString();
    private String campaignId; private String type;
    @Column(columnDefinition="TEXT") private String payloadJson;
    private String requestId; private Instant createdAt=Instant.now();
    public String getId(){return id;} public void setId(String v){this.id=v;}
    public String getCampaignId(){return campaignId;} public void setCampaignId(String v){this.campaignId=v;}
    public String getType(){return type;} public void setType(String v){this.type=v;}
    public String getPayloadJson(){return payloadJson;} public void setPayloadJson(String v){this.payloadJson=v;}
    public String getRequestId(){return requestId;} public void setRequestId(String v){this.requestId=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){this.createdAt=v;}
}
