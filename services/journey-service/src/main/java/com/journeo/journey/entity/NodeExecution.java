package com.journeo.journey.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="node_executions")
public class NodeExecution {
    @Id private String id=UUID.randomUUID().toString();
    private String sessionId; private String nodeId; private String nodeType; private String status;
    @Column(columnDefinition="TEXT") private String inputJson; @Column(columnDefinition="TEXT") private String outputJson;
    private Instant startedAt=Instant.now(); private Instant completedAt;
    public String getId(){return id;} public void setId(String v){this.id=v;}
    public String getSessionId(){return sessionId;} public void setSessionId(String v){this.sessionId=v;}
    public String getNodeId(){return nodeId;} public void setNodeId(String v){this.nodeId=v;}
    public String getNodeType(){return nodeType;} public void setNodeType(String v){this.nodeType=v;}
    public String getStatus(){return status;} public void setStatus(String v){this.status=v;}
    public String getInputJson(){return inputJson;} public void setInputJson(String v){this.inputJson=v;}
    public String getOutputJson(){return outputJson;} public void setOutputJson(String v){this.outputJson=v;}
    public Instant getStartedAt(){return startedAt;} public void setStartedAt(Instant v){this.startedAt=v;}
    public Instant getCompletedAt(){return completedAt;} public void setCompletedAt(Instant v){this.completedAt=v;}
}
