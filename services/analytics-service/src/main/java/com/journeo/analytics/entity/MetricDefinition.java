package com.journeo.analytics.entity;
import jakarta.persistence.*;
@Entity @Table(name="metric_definitions")
public class MetricDefinition {
    @Id private String key;
    private String label; @Column(columnDefinition="TEXT") private String definition; private String unit; private String formula;
    public MetricDefinition(){}
    public MetricDefinition(String k,String l,String d,String u,String f){key=k;label=l;definition=d;unit=u;formula=f;}
    public String getKey(){return key;} public void setKey(String v){this.key=v;}
    public String getLabel(){return label;} public void setLabel(String v){this.label=v;}
    public String getDefinition(){return definition;} public void setDefinition(String v){this.definition=v;}
    public String getUnit(){return unit;} public void setUnit(String v){this.unit=v;}
    public String getFormula(){return formula;} public void setFormula(String v){this.formula=v;}
}
