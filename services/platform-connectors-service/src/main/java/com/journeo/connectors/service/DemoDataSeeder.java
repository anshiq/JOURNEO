package com.journeo.connectors.service;
import com.journeo.connectors.entity.MockCampaign;
import com.journeo.connectors.repository.MockCampaignRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
@Component
public class DemoDataSeeder implements CommandLineRunner {
    private final MockCampaignRepository repo;
    @Value("${demo-data-seed:true}") private boolean enabled;
    public DemoDataSeeder(MockCampaignRepository r){ this.repo=r; }
    @Override public void run(String... args){
        if(!enabled) return;
        repo.deleteAll();
        save("act_apple_iphone_meta","meta","act_apple_iphone_meta","Apple — iPhone 15 Pro (Meta Reels + Advantage+)","ACTIVE",520.0,"{\"objective\":\"SALES\",\"placements\":[\"instagram_reels\",\"facebook_feed\"],\"creative\":\"iPhone 15 Pro titanium film\",\"targeting\":{\"age_min\":22,\"age_max\":54,\"interests\":[\"Apple\",\"iPhone\",\"mobile photography\"]}}");
        save("customers_111_1001","google","customers/111/campaigns/1001","Apple — iPhone 15 Pro (YouTube + Search)","ACTIVE",380.0,"{\"objective\":\"CONVERSIONS\",\"placements\":[\"youtube_instream\",\"search\"],\"keywords\":[\"iphone 15 pro\",\"buy iphone 15 pro\"]}");
        save("act_nike_jordan_meta","meta","act_nike_jordan_meta","Nike — Air Jordan 1 (Meta Feed + Stories)","ACTIVE",450.0,"{\"objective\":\"SALES\",\"placements\":[\"instagram_feed\",\"instagram_stories\"],\"creative\":\"Air Jordan 1 Chicago\",\"targeting\":{\"age_min\":18,\"age_max\":34,\"interests\":[\"sneakers\",\"Jordan\",\"streetwear\"]}}");
        save("customers_222_2002","google","customers/222/campaigns/2002","Nike — Air Jordan 1 (YouTube Shorts)","ACTIVE",280.0,"{\"objective\":\"AWARENESS\",\"placements\":[\"youtube_shorts\"],\"keywords\":[\"air jordan 1\",\"nike chicago\"]}");
        save("act_tesla_y_meta","meta","act_tesla_y_meta","Tesla — Model Y (Meta Lead)","ACTIVE",600.0,"{\"objective\":\"LEADS\",\"placements\":[\"facebook_feed\",\"instagram_reels\"],\"creative\":\"Model Y test drive\",\"targeting\":{\"age_min\":25,\"age_max\":60,\"interests\":[\"Tesla\",\"electric vehicles\"]}}");
        save("customers_333_3003","google","customers/333/campaigns/3003","Tesla — Model Y (Search + YouTube)","ACTIVE",500.0,"{\"objective\":\"LEADS\",\"placements\":[\"search\",\"youtube_instream\"],\"keywords\":[\"tesla model y\",\"electric suv\"]}");
        save("act_sony_xm5_meta","meta","act_sony_xm5_meta","Sony — WH-1000XM5 (Meta)","ACTIVE",320.0,"{\"objective\":\"SALES\",\"placements\":[\"instagram_reels\",\"facebook_feed\"],\"creative\":\"WH-1000XM5 film\",\"targeting\":{\"age_min\":20,\"age_max\":45,\"interests\":[\"headphones\",\"Sony\"]}}");
        save("customers_444_4004","google","customers/444/campaigns/4004","Sony — WH-1000XM5 (YouTube)","ACTIVE",260.0,"{\"objective\":\"SALES\",\"placements\":[\"youtube_instream\"],\"keywords\":[\"sony wh1000xm5\",\"noise canceling headphones\"]}");
        System.out.println("Mock campaigns seeded for 4 real-world brands");
    }
    private void save(String id, String platform, String externalId, String name, String status, double budget, String rawJson){
        MockCampaign c=new MockCampaign();
        c.setId(id);
        c.setPlatform(platform);
        c.setExternalId(externalId);
        c.setName(name);
        c.setStatus(status);
        c.setDailyBudget(budget);
        c.setRawJson(rawJson);
        repo.save(c);
    }
}
