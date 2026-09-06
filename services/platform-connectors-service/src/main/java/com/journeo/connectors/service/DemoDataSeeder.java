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
        save("act_samsung_s24_meta","meta","act_samsung_s24_meta","Samsung — Galaxy S24 Ultra (Meta Reels + Advantage+)","ACTIVE",540.0,"{\"objective\":\"SALES\",\"placements\":[\"instagram_reels\",\"facebook_feed\"],\"creative\":\"Galaxy S24 Ultra Circle to Search film\",\"targeting\":{\"age_min\":20,\"age_max\":55,\"interests\":[\"Samsung\",\"Galaxy\",\"Android\",\"mobile photography\"]}}");
        save("customers_555_5005","google","customers/555/campaigns/5005","Samsung — Galaxy S24 Ultra (YouTube + Search)","ACTIVE",400.0,"{\"objective\":\"CONVERSIONS\",\"placements\":[\"youtube_instream\",\"search\"],\"keywords\":[\"galaxy s24 ultra\",\"buy galaxy s24 ultra\"]}");
        save("act_adidas_ultraboost_meta","meta","act_adidas_ultraboost_meta","adidas — Ultraboost 22 (Meta Feed + Stories)","ACTIVE",380.0,"{\"objective\":\"SALES\",\"placements\":[\"instagram_feed\",\"instagram_stories\"],\"creative\":\"Ultraboost 22 BOOST film\",\"targeting\":{\"age_min\":18,\"age_max\":40,\"interests\":[\"running\",\"adidas\",\"sneakers\"]}}");
        save("customers_666_6006","google","customers/666/campaigns/6006","adidas — Ultraboost 22 (YouTube Shorts)","ACTIVE",240.0,"{\"objective\":\"AWARENESS\",\"placements\":[\"youtube_shorts\"],\"keywords\":[\"ultraboost 22\",\"adidas boost\"]}");
        save("act_rivian_r1t_meta","meta","act_rivian_r1t_meta","Rivian — R1T (Meta Lead)","ACTIVE",620.0,"{\"objective\":\"LEADS\",\"placements\":[\"facebook_feed\",\"instagram_reels\"],\"creative\":\"R1T Gear Tunnel adventure film\",\"targeting\":{\"age_min\":25,\"age_max\":60,\"interests\":[\"Rivian\",\"electric trucks\",\"overlanding\"]}}");
        save("customers_777_7007","google","customers/777/campaigns/7007","Rivian — R1T (Search + YouTube)","ACTIVE",520.0,"{\"objective\":\"LEADS\",\"placements\":[\"search\",\"youtube_instream\"],\"keywords\":[\"rivian r1t\",\"electric truck\"]}");
        System.out.println("Mock campaigns seeded for 3 real-world brands");
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
