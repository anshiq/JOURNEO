package com.journeo.journey.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="journeys")
public class Journey {
    @Id private String id=UUID.randomUUID().toString();
    private String campaignId; private String name;
    @Column(columnDefinition="TEXT") private String graphJson;
    private String status="DRAFT"; private int version=1;
    private Instant createdAt=Instant.now(); private Instant updatedAt=Instant.now();
    public String getId(){return id;} public void setId(String v){this.id=v;}
    public String getCampaignId(){return campaignId;} public void setCampaignId(String v){this.campaignId=v;}
    public String getName(){return name;} public void setName(String v){this.name=v;}
    public String getGraphJson(){return graphJson;} public void setGraphJson(String v){this.graphJson=v;}
    public String getStatus(){return status;} public void setStatus(String v){this.status=v;}
    public int getVersion(){return version;} public void setVersion(int v){this.version=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){this.createdAt=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){this.updatedAt=v;}
}
