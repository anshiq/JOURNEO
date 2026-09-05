package com.journeo.analytics.service;
import com.journeo.analytics.entity.*;
import com.journeo.analytics.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.util.Random;
@Component
public class DemoDataSeeder implements CommandLineRunner {
    private final DeliveryEventRepository deliveryRepo;
    private final MetricDefinitionRepository metricRepo;
    @Value("${demo-data-seed:true}") private boolean enabled;
    public DemoDataSeeder(DeliveryEventRepository d, MetricDefinitionRepository m){ this.deliveryRepo=d; this.metricRepo=m; }
    @Override public void run(String... args){
        if(metricRepo.count()==0){
            metricRepo.save(new MetricDefinition("ctr","Click-Through Rate","clicks / impressions, as a percentage","percent","(clicks/impressions)*100"));
            metricRepo.save(new MetricDefinition("cpa","Cost Per Acquisition","spend / conversions","USD","spend/conversions"));
            metricRepo.save(new MetricDefinition("roas","Return on Ad Spend","revenue / spend","ratio","revenue/spend"));
            metricRepo.save(new MetricDefinition("reach","Reach","unique users reached","users","count(distinct user)"));
            metricRepo.save(new MetricDefinition("frequency","Frequency","average impressions per user","impressions/user","impressions/reach"));
            metricRepo.save(new MetricDefinition("viewability","Viewability","viewable impressions / total impressions","percent","viewable/impressions*100"));
        }
        if(!enabled) return;
        deliveryRepo.deleteAll();
        Random rnd=new Random(42);
        String[] cids={"apple-iphone-15-pro","nike-air-jordan-1-retro","tesla-model-y-2024","sony-wh1000xm5"};
        LocalDate today=LocalDate.now();
        for(String cid: cids){
            for(int i=90;i>=0;i--){
                LocalDate d=today.minusDays(i);
                DeliveryEvent e=new DeliveryEvent();
                e.setCampaignId(cid); e.setPlatform(i%2==0?"meta":"google");
                long imp=8000+rnd.nextInt(4000);
                double ctrBase=1.5 + (cid.equals("apple-iphone-15-pro")?0.4:0) + (cid.equals("tesla-model-y-2024")?0.2:0);
                double freqBase=1.8;
                if(cid.equals("nike-air-jordan-1-retro") && i<14){
                    double prog=(14 - i)/14.0;
                    imp=(long)(imp*(1+prog*0.8));
                    ctrBase=2.2+prog*1.1;
                } else if(cid.equals("sony-wh1000xm5") && i<7){
                    double prog=(7 - i)/7.0;
                    ctrBase=2.8+prog*1.2;
                }
                long clicks=Math.round(imp*ctrBase/100);
                long conv=Math.max(1, Math.round(clicks*(cid.equals("tesla-model-y-2024")?0.06:0.11)));
                double spend=conv * (18 + rnd.nextDouble()*5);
                double cpa=spend/conv;
                double roas= 3.5 + rnd.nextDouble() + (cid.equals("apple-iphone-15-pro")?1.2:0);
                e.setImpressions(imp); e.setClicks(clicks); e.setConversions(conv);
                e.setSpend(spend); e.setCtr(ctrBase); e.setCpa(cpa); e.setRoas(roas);
                e.setFrequency(freqBase + rnd.nextDouble()*0.3);
                e.setViewability(68+rnd.nextDouble()*10);
                e.setReach(Math.round(imp / e.getFrequency()));
                e.setDate(d);
                deliveryRepo.save(e);
            }
        }
        System.out.println("Demo data seeded for 4 real-world campaigns");
    }
}
