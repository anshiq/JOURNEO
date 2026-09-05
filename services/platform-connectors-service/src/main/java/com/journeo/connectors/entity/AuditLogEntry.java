package com.journeo.connectors.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="audit_log")
public class AuditLogEntry {
    @Id private String id=UUID.randomUUID().toString();
    private String actor; private String platform; private String actionType; private String campaignId;
    @Column(columnDefinition="TEXT") private String beforeState; @Column(columnDefinition="TEXT") private String afterState;
    private String requestId; private Instant createdAt=Instant.now();
    public String getId(){return id;} public void setId(String v){this.id=v;}
    public String getActor(){return actor;} public void setActor(String v){this.actor=v;}
    public String getPlatform(){return platform;} public void setPlatform(String v){this.platform=v;}
    public String getActionType(){return actionType;} public void setActionType(String v){this.actionType=v;}
    public String getCampaignId(){return campaignId;} public void setCampaignId(String v){this.campaignId=v;}
    public String getBeforeState(){return beforeState;} public void setBeforeState(String v){this.beforeState=v;}
    public String getAfterState(){return afterState;} public void setAfterState(String v){this.afterState=v;}
    public String getRequestId(){return requestId;} public void setRequestId(String v){this.requestId=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){this.createdAt=v;}
}
