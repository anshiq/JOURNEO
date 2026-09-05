package com.journeo.analytics.entity;
import jakarta.persistence.*;
import java.time.LocalDate;
@Entity @Table(name="delivery_events")
public class DeliveryEvent {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    private String campaignId; private String platform;
    private LocalDate date;
    private long impressions; private long clicks; private long conversions;
    private double spend; private double ctr; private double cpa; private double roas;
    private double frequency; private double viewability; private double reach;
    public Long getId(){return id;} public void setId(Long v){this.id=v;}
    public String getCampaignId(){return campaignId;} public void setCampaignId(String v){this.campaignId=v;}
    public String getPlatform(){return platform;} public void setPlatform(String v){this.platform=v;}
    public LocalDate getDate(){return date;} public void setDate(LocalDate v){this.date=v;}
    public long getImpressions(){return impressions;} public void setImpressions(long v){this.impressions=v;}
    public long getClicks(){return clicks;} public void setClicks(long v){this.clicks=v;}
    public long getConversions(){return conversions;} public void setConversions(long v){this.conversions=v;}
    public double getSpend(){return spend;} public void setSpend(double v){this.spend=v;}
    public double getCtr(){return ctr;} public void setCtr(double v){this.ctr=v;}
    public double getCpa(){return cpa;} public void setCpa(double v){this.cpa=v;}
    public double getRoas(){return roas;} public void setRoas(double v){this.roas=v;}
    public double getFrequency(){return frequency;} public void setFrequency(double v){this.frequency=v;}
    public double getViewability(){return viewability;} public void setViewability(double v){this.viewability=v;}
    public double getReach(){return reach;} public void setReach(double v){this.reach=v;}
}
