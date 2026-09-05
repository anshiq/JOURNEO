package com.journeo.analytics.logging;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="request_logs")
public class RequestLogEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    private String requestId; private String method; private String path; private Integer status; private Long durationMs;
    @Column(columnDefinition="TEXT") private String factsJson;
    private Instant createdAt=Instant.now();
    public Long getId(){return id;} public void setId(Long id){this.id=id;}
    public String getRequestId(){return requestId;} public void setRequestId(String v){this.requestId=v;}
    public String getMethod(){return method;} public void setMethod(String v){this.method=v;}
    public String getPath(){return path;} public void setPath(String v){this.path=v;}
    public Integer getStatus(){return status;} public void setStatus(Integer v){this.status=v;}
    public Long getDurationMs(){return durationMs;} public void setDurationMs(Long v){this.durationMs=v;}
    public String getFactsJson(){return factsJson;} public void setFactsJson(String v){this.factsJson=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){this.createdAt=v;}
}
