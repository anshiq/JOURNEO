package com.journeo.connectors.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="mock_campaigns")
public class MockCampaign {
    @Id private String id=UUID.randomUUID().toString();
    private String platform; private String externalId;
    private String name; @Column(columnDefinition="TEXT") private String rawJson;
    private String status="ACTIVE"; private double dailyBudget;
    private Instant createdAt=Instant.now(); private Instant updatedAt=Instant.now();
    public String getId(){return id;} public void setId(String v){this.id=v;}
    public String getPlatform(){return platform;} public void setPlatform(String v){this.platform=v;}
    public String getExternalId(){return externalId;} public void setExternalId(String v){this.externalId=v;}
    public String getName(){return name;} public void setName(String v){this.name=v;}
    public String getRawJson(){return rawJson;} public void setRawJson(String v){this.rawJson=v;}
    public String getStatus(){return status;} public void setStatus(String v){this.status=v;}
    public double getDailyBudget(){return dailyBudget;} public void setDailyBudget(double v){this.dailyBudget=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){this.createdAt=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){this.updatedAt=v;}
}
