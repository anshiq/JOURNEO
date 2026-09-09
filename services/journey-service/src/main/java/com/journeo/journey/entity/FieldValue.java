package com.journeo.journey.entity;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="field_values", uniqueConstraints=@UniqueConstraint(columnNames={"campaignId","fieldKey","value"}))
public class FieldValue {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    private String campaignId; private String fieldKey; private String value;
    private Instant createdAt=Instant.now();
    public Long getId(){return id;} public void setId(Long v){this.id=v;}
    public String getCampaignId(){return campaignId;} public void setCampaignId(String v){this.campaignId=v;}
    public String getFieldKey(){return fieldKey;} public void setFieldKey(String v){this.fieldKey=v;}
    public String getValue(){return value;} public void setValue(String v){this.value=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){this.createdAt=v;}
}
