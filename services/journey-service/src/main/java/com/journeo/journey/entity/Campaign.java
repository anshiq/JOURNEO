package com.journeo.journey.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="campaigns")
public class Campaign {
    @Id private String id=UUID.randomUUID().toString();
    private String name; @Column(columnDefinition="TEXT") private String description;
    @Column(columnDefinition="TEXT") private String objective;
    @Column(columnDefinition="TEXT") private String audience;
    private String status="ACTIVE"; private Instant createdAt=Instant.now(); private Instant updatedAt=Instant.now();
    private Instant deletedAt;
    @Column(unique=true) private String devToken=UUID.randomUUID().toString();
    private Instant devTokenCreatedAt=Instant.now();
    @Transient public String getDevLink(){ return "/d/"+devToken; }
    public String getId(){return id;} public void setId(String id){this.id=id;}
    public String getName(){return name;} public void setName(String v){this.name=v;}
    public String getDescription(){return description;} public void setDescription(String v){this.description=v;}
    public String getObjective(){return objective;} public void setObjective(String v){this.objective=v;}
    public String getAudience(){return audience;} public void setAudience(String v){this.audience=v;}
    public String getStatus(){return status;} public void setStatus(String v){this.status=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){this.createdAt=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){this.updatedAt=v;}
    public Instant getDeletedAt(){return deletedAt;} public void setDeletedAt(Instant v){this.deletedAt=v;}
    public String getDevToken(){return devToken;} public void setDevToken(String v){this.devToken=v;}
    public Instant getDevTokenCreatedAt(){return devTokenCreatedAt;} public void setDevTokenCreatedAt(Instant v){this.devTokenCreatedAt=v;}
}
