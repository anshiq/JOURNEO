package com.journeo.analytics.entity;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="llm_usage_events")
public class LlmUsageEvent {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    private String requestId; private String agentType; private String model;
    private int promptTokens; private int completionTokens; private double costUsd;
    private Instant createdAt=Instant.now();
    public Long getId(){return id;} public void setId(Long v){this.id=v;}
    public String getRequestId(){return requestId;} public void setRequestId(String v){this.requestId=v;}
    public String getAgentType(){return agentType;} public void setAgentType(String v){this.agentType=v;}
    public String getModel(){return model;} public void setModel(String v){this.model=v;}
    public int getPromptTokens(){return promptTokens;} public void setPromptTokens(int v){this.promptTokens=v;}
    public int getCompletionTokens(){return completionTokens;} public void setCompletionTokens(int v){this.completionTokens=v;}
    public double getCostUsd(){return costUsd;} public void setCostUsd(double v){this.costUsd=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){this.createdAt=v;}
}
