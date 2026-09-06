package com.journeo.journey.service;
import com.journeo.journey.entity.*;
import com.journeo.journey.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
@Component
public class RealWorldCampaignSeeder implements CommandLineRunner {
    private final CampaignRepository campRepo;
    private final JourneyRepository jourRepo;
    @Value("${demo-data-seed:false}") private boolean enabled;
    @Value("${demo-data-reset:false}") private boolean reset;
    public RealWorldCampaignSeeder(CampaignRepository c, JourneyRepository j){ this.campRepo=c; this.jourRepo=j; }
    @Override public void run(String... args){
        if(!enabled) return;
        if(reset){
            campRepo.deleteAll();
            jourRepo.deleteAll();
        } else if(campRepo.count()>0){
            return;
        }
        seedAppleIPhone15Pro();
        seedNikeAirJordan1();
        seedTeslaModelY();
        seedSonyWH1000XM5();
        System.out.println("Real-world campaigns seeded: Apple iPhone 15 Pro, Nike Air Jordan 1, Tesla Model Y, Sony WH-1000XM5");
    }
    private void seedAppleIPhone15Pro() {
        Campaign c = new Campaign();
        c.setId("apple-iphone-15-pro");
        c.setName("Apple — iPhone 15 Pro");
        c.setDescription("Apple iPhone 15 Pro with A17 Pro chip, titanium design, Action button and pro camera system. Official product: https://www.apple.com/iphone-15-pro/");
        c.setStatus("ACTIVE");
        campRepo.save(c);
        Journey j = new Journey();
        j.setCampaignId(c.getId());
        j.setName("iPhone 15 Pro Launch Funnel");
        j.setStatus("PUBLISHED");
        j.setGraphJson("""
            {"nodes":[
                {"id":"n1","type":"trigger","config":{"entryPoint":true},"position":{"x":0,"y":200}},
                {"id":"n2","type":"hero_section","config":{"badge":"Titanium","headline":"iPhone 15 Pro","subheadline":"Titanium design. A17 Pro chip. Action button. 48MP Pro camera.","image":"https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=1200&q=80","imagePosition":"right","ctas":[{"label":"Buy from $999","variant":"solid"},{"label":"Watch the film","variant":"outline"}]},"position":{"x":220,"y":200}},
                {"id":"n3","type":"video","config":{"url":"https://www.youtube.com/watch?v=xqyUdNxWazA","poster":"https://images.unsplash.com/photo-1592899677977-9bb10ba128a1?w=800&q=80","autoplay":false,"controls":true,"showWatchedButton":true,"showSkipButton":true,"watchedLabel":"I watched it","skipLabel":"Skip"},"position":{"x":440,"y":200}},
                {"id":"n4","type":"image","config":{"src":"https://images.unsplash.com/photo-1592899677977-9bb10ba128a1?w=800&q=80","alt":"iPhone 15 Pro closeup"},"position":{"x":660,"y":200}},
                {"id":"n5","type":"text","config":{"content":"A17 Pro unlocks next-level gaming and pro performance. Titanium is lighter, stronger, and built for endurance. The 48MP main camera captures super-high resolution for pro workflows."},"position":{"x":880,"y":200}},
                {"id":"n6","type":"condition","config":{"field":"user_intent","operator":"eq","value":"creator"},"position":{"x":1100,"y":200}},
                {"id":"n7","type":"quiz","config":{"question":"Which finish speaks to you?","type":"mcq","options":[{"id":"natural","label":"Natural Titanium"},{"id":"blue","label":"Blue Titanium"},{"id":"white","label":"White Titanium"},{"id":"black","label":"Black Titanium"}],"allowSkip":true,"skipLabel":"Skip"},"position":{"x":1320,"y":80}},
                {"id":"n8","type":"rating","config":{"label":"How likely are you to upgrade this year?","value":7,"max":10},"position":{"x":1320,"y":320}},
                {"id":"n9","type":"form","config":{"fields":[{"id":"email","type":"input","label":"Email","placeholder":"you@apple.com","required":true},{"id":"storage","type":"select","label":"Storage","options":[{"value":"128","label":"128GB"},{"value":"256","label":"256GB"},{"value":"512","label":"512GB"},{"value":"1tb","label":"1TB"}]},{"id":"tradein","type":"checkbox","label":"I have a device to trade in"}],"submitLabel":"Get Pre-order Access"},"position":{"x":1540,"y":200}},
                {"id":"n10","type":"countdown","config":{"endTime":"2026-11-20T09:00:00Z","label":"Pre-order opens in","size":"md"},"position":{"x":1760,"y":200}},
                {"id":"n11","type":"alert","config":{"variant":"success","title":"You're on the list","message":"We'll notify you the moment pre-orders go live on apple.com."},"position":{"x":1980,"y":200}},
                {"id":"n12","type":"badge","config":{"label":"A17 Pro","variant":"soft","color":"#4f46e5"},"position":{"x":2200,"y":200}},
                {"id":"n13","type":"end","config":{"message":"Thanks for exploring iPhone 15 Pro at apple.com/iphone-15-pro"},"position":{"x":2420,"y":200}}
            ],"edges":[
                {"id":"e1","source":"n1","target":"n2"},
                {"id":"e2","source":"n2","target":"n3"},
                {"id":"e3","source":"n3","target":"n4","sourceHandle":"watched","label":"watched"},
                {"id":"e3s","source":"n3","target":"n4","sourceHandle":"skipped","label":"skipped"},
                {"id":"e4","source":"n4","target":"n5"},
                {"id":"e5","source":"n5","target":"n6"},
                {"id":"e6","source":"n6","target":"n7","sourceHandle":"true","label":"creator"},
                {"id":"e7","source":"n6","target":"n8","sourceHandle":"false","label":"everyday"},
                {"id":"e8","source":"n7","target":"n9","sourceHandle":"answered"},
                {"id":"e9","source":"n7","target":"n9","sourceHandle":"skipped"},
                {"id":"e10","source":"n8","target":"n9"},
                {"id":"e11","source":"n9","target":"n10"},
                {"id":"e12","source":"n10","target":"n11"},
                {"id":"e13","source":"n11","target":"n12"},
                {"id":"e14","source":"n12","target":"n13"}
            ]}
            """);
        jourRepo.save(j);
    }
    private void seedNikeAirJordan1() {
        Campaign c = new Campaign();
        c.setId("nike-air-jordan-1-retro");
        c.setName("Nike — Air Jordan 1 Retro High OG");
        c.setDescription("Nike Air Jordan 1 Retro High OG 'Chicago' — iconic leather, Nike Air, Wings logo. Official: https://www.nike.com/jordan");
        c.setStatus("ACTIVE");
        campRepo.save(c);
        Journey j = new Journey();
        j.setCampaignId(c.getId());
        j.setName("Air Jordan 1 Drop Funnel");
        j.setStatus("PUBLISHED");
        j.setGraphJson("""
            {"nodes":[
                {"id":"n1","type":"trigger","config":{"entryPoint":true},"position":{"x":0,"y":200}},
                {"id":"n2","type":"hero_section","config":{"badge":"Icon Since 1985","headline":"Air Jordan 1 Retro High OG","subheadline":"Chicago colorway. Premium leather. Nike Air cushioning. The one that started it all.","image":"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80","imagePosition":"right","ctas":[{"label":"Shop $180","variant":"solid"},{"label":"Story","variant":"outline"}]},"position":{"x":220,"y":200}},
                {"id":"n3","type":"video","config":{"url":"https://www.youtube.com/watch?v=5i3yF3VkC7Q","poster":"https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&q=80","autoplay":false,"controls":true,"showWatchedButton":true,"showSkipButton":true,"watchedLabel":"Watched","skipLabel":"Skip"},"position":{"x":440,"y":200}},
                {"id":"n4","type":"image","config":{"src":"https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800&q=80","alt":"Air Jordan 1 side"},"position":{"x":660,"y":200}},
                {"id":"n5","type":"card","config":{"layout":"vertical","image":{"src":"https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80"},"badge":"Bestseller","title":"Why Chicago?","description":"Varsity Red and white leather with black Swoosh — the original 1985 color blocking worn by MJ."},"position":{"x":880,"y":200}},
                {"id":"n6","type":"text","config":{"content":"Nike Air in the heel, solid rubber outsole, Wings logo on collar. Built for the hardwood, adopted by street culture worldwide. nike.com/jordan"},"position":{"x":1100,"y":200}},
                {"id":"n7","type":"condition","config":{"field":"sneakerhead","operator":"eq","value":"collector"},"position":{"x":1320,"y":200}},
                {"id":"n8","type":"select","config":{"label":"Size","placeholder":"Choose size","options":[{"value":"8","label":"US 8"},{"value":"9","label":"US 9"},{"value":"10","label":"US 10"},{"value":"11","label":"US 11"},{"value":"12","label":"US 12"}]},"position":{"x":1540,"y":80}},
                {"id":"n9","type":"input","config":{"type":"email","label":"Email","placeholder":"you@nike.com","helperText":"For SNKRS draw notification"},"position":{"x":1540,"y":320}},
                {"id":"n10","type":"checkbox","config":{"label":"Notify me on SNKRS","checked":false},"position":{"x":1760,"y":200}},
                {"id":"n11","type":"button","config":{"label":"Enter Draw — SNKRS","variant":"solid","size":"lg"},"position":{"x":1980,"y":200}},
                {"id":"n12","type":"countdown","config":{"endTime":"2026-11-10T10:00:00Z","label":"Draw closes in","size":"md"},"position":{"x":2200,"y":200}},
                {"id":"n13","type":"end","config":{"message":"Good luck on SNKRS. nike.com/launch"},"position":{"x":2420,"y":200}}
            ],"edges":[
                {"id":"e1","source":"n1","target":"n2"},
                {"id":"e2","source":"n2","target":"n3"},
                {"id":"e3","source":"n3","target":"n4","sourceHandle":"watched","label":"watched"},
                {"id":"e3s","source":"n3","target":"n4","sourceHandle":"skipped","label":"skipped"},
                {"id":"e4","source":"n4","target":"n5"},
                {"id":"e5","source":"n5","target":"n6"},
                {"id":"e6","source":"n6","target":"n7"},
                {"id":"e7","source":"n7","target":"n8","sourceHandle":"true","label":"collector"},
                {"id":"e8","source":"n7","target":"n9","sourceHandle":"false","label":"casual"},
                {"id":"e9","source":"n8","target":"n10"},
                {"id":"e10","source":"n9","target":"n10"},
                {"id":"e11","source":"n10","target":"n11"},
                {"id":"e12","source":"n11","target":"n12"},
                {"id":"e13","source":"n12","target":"n13"}
            ]}
            """);
        jourRepo.save(j);
    }
    private void seedTeslaModelY() {
        Campaign c = new Campaign();
        c.setId("tesla-model-y-2024");
        c.setName("Tesla — Model Y");
        c.setDescription("Tesla Model Y — 330 mi range, 0-60 3.5s, Autopilot, Supercharger network. Official: https://www.tesla.com/modely");
        c.setStatus("ACTIVE");
        campRepo.save(c);
        Journey j = new Journey();
        j.setCampaignId(c.getId());
        j.setName("Model Y Experience Funnel");
        j.setStatus("PUBLISHED");
        j.setGraphJson("""
            {"nodes":[
                {"id":"n1","type":"trigger","config":{"entryPoint":true},"position":{"x":0,"y":200}},
                {"id":"n2","type":"hero_section","config":{"badge":"Top Safety Pick+","headline":"Model Y","subheadline":"Long Range AWD. 330 miles. 135 mph. All-wheel drive dual motor.","image":"https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1200&q=80","imagePosition":"left","ctas":[{"label":"Order $44,990","variant":"solid"},{"label":"Demo Drive","variant":"outline"}]},"position":{"x":220,"y":200}},
                {"id":"n3","type":"video","config":{"url":"https://www.youtube.com/watch?v=ijX5EPLM2_A","poster":"https://images.unsplash.com/photo-1617704548623-340376564e68?w=800&q=80","autoplay":false,"controls":true,"showWatchedButton":true,"showSkipButton":true,"watchedLabel":"Watched","skipLabel":"Skip"},"position":{"x":440,"y":200}},
                {"id":"n4","type":"image","config":{"src":"https://images.unsplash.com/photo-1617704548623-340376564e68?w=800&q=80","alt":"Tesla Model Y interior"},"position":{"x":660,"y":200}},
                {"id":"n5","type":"card","config":{"layout":"horizontal","badge":"Long Range","title":"330-mile Range","description":"Go anywhere with up to 330 miles on a single charge. Supercharger adds 162 miles in 15 minutes."},"position":{"x":880,"y":200}},
                {"id":"n6","type":"container","config":{"direction":"column","gap":"12px","align":"stretch","justify":"start"},"position":{"x":1100,"y":200}},
                {"id":"n7","type":"divider","config":{"orientation":"horizontal"},"position":{"x":1320,"y":200}},
                {"id":"n8","type":"text","config":{"content":"Dual Motor AWD, Autopilot included, 68 cu ft cargo with seats folded. tesla.com/modely"},"position":{"x":1540,"y":200}},
                {"id":"n9","type":"condition","config":{"field":"has_home_charging","operator":"eq","value":"yes"},"position":{"x":1760,"y":200}},
                {"id":"n10","type":"form","config":{"fields":[{"id":"zip","type":"input","label":"ZIP","placeholder":"90210","required":true},{"id":"trim","type":"select","label":"Trim","options":[{"value":"lr","label":"Long Range"},{"value":"perf","label":"Performance"}]},{"id":"trade","type":"checkbox","label":"Trade-in estimate"}],"submitLabel":"Check Delivery"},"position":{"x":1980,"y":80}},
                {"id":"n11","type":"alert","config":{"variant":"info","title":"Delivery","message":"Delivery estimate: 2-4 weeks for your area. Home charging recommended."},"position":{"x":1980,"y":320}},
                {"id":"n12","type":"countdown","config":{"endTime":"2026-12-31T23:59:00Z","label":"Federal credit ends in","size":"md","expiredMessage":"Credit expired — price updated."},"position":{"x":2200,"y":200}},
                {"id":"n13","type":"end","config":{"message":"Thanks for exploring Model Y at tesla.com"},"position":{"x":2420,"y":200}}
            ],"edges":[
                {"id":"e1","source":"n1","target":"n2"},
                {"id":"e2","source":"n2","target":"n3"},
                {"id":"e3","source":"n3","target":"n4","sourceHandle":"watched","label":"watched"},
                {"id":"e3s","source":"n3","target":"n4","sourceHandle":"skipped","label":"skipped"},
                {"id":"e4","source":"n4","target":"n5"},
                {"id":"e5","source":"n5","target":"n6"},
                {"id":"e6","source":"n6","target":"n7"},
                {"id":"e7","source":"n7","target":"n8"},
                {"id":"e8","source":"n8","target":"n9"},
                {"id":"e9","source":"n9","target":"n10","sourceHandle":"true","label":"yes"},
                {"id":"e10","source":"n9","target":"n11","sourceHandle":"false","label":"no"},
                {"id":"e11","source":"n10","target":"n12"},
                {"id":"e12","source":"n11","target":"n12"},
                {"id":"e13","source":"n12","target":"n13"}
            ]}
            """);
        jourRepo.save(j);
    }
    private void seedSonyWH1000XM5() {
        Campaign c = new Campaign();
        c.setId("sony-wh1000xm5");
        c.setName("Sony — WH-1000XM5 Headphones");
        c.setDescription("Sony WH-1000XM5 wireless noise canceling headphones — 8 mics, 30h battery, Speak-to-Chat. Official: https://electronics.sony.com/wh1000xm5");
        c.setStatus("ACTIVE");
        campRepo.save(c);
        Journey j = new Journey();
        j.setCampaignId(c.getId());
        j.setName("WH-1000XM5 Discovery Funnel");
        j.setStatus("PUBLISHED");
        j.setGraphJson("""
            {"nodes":[
                {"id":"n1","type":"trigger","config":{"entryPoint":true},"position":{"x":0,"y":200}},
                {"id":"n2","type":"hero_section","config":{"badge":"Editor's Choice","headline":"WH-1000XM5","subheadline":"Industry-leading noise canceling with Auto NC Optimizer. Crystal clear hands-free calling.","image":"https://images.unsplash.com/photo-1545127398-14699f92334b?w=1200&q=80","imagePosition":"right","ctas":[{"label":"Buy $348","variant":"solid"},{"label":"Tech Specs","variant":"outline"}]},"position":{"x":220,"y":200}},
                {"id":"n3","type":"video","config":{"url":"https://www.youtube.com/watch?v=Sex2y_Wq2j4","poster":"https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80","autoplay":false,"controls":true,"showWatchedButton":true,"showSkipButton":true,"watchedLabel":"Watched","skipLabel":"Skip"},"position":{"x":440,"y":200}},
                {"id":"n4","type":"image","config":{"src":"https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80","alt":"Sony WH-1000XM5"},"position":{"x":660,"y":200}},
                {"id":"n5","type":"text","config":{"content":"8 microphones, HD Noise Canceling Processor QN1, 30-hour battery with quick charge (3 min = 3 hours). Multipoint, Speak-to-Chat, Adaptive Sound Control."},"position":{"x":880,"y":200}},
                {"id":"n6","type":"quiz","config":{"question":"What matters most for your commute?","type":"mcq","options":[{"id":"anc","label":"Silence"},{"id":"call","label":"Calls"},{"id":"battery","label":"Battery"},{"id":"comfort","label":"Comfort"}],"allowSkip":true,"skipLabel":"Skip"},"position":{"x":1100,"y":80}},
                {"id":"n7","type":"select","config":{"label":"Color","placeholder":"Pick color","options":[{"value":"black","label":"Black"},{"value":"silver","label":"Silver"},{"value":"blue","label":"Midnight Blue"}]},"position":{"x":1100,"y":320}},
                {"id":"n8","type":"input","config":{"type":"email","label":"Email","placeholder":"you@sony.com"},"position":{"x":1320,"y":200}},
                {"id":"n9","type":"checkbox","config":{"label":"I want 10% off via Sony Rewards","checked":false},"position":{"x":1540,"y":200}},
                {"id":"n10","type":"button","config":{"label":"Add to Cart — $348","variant":"solid","size":"lg"},"position":{"x":1760,"y":200}},
                {"id":"n11","type":"badge","config":{"label":"30h Battery","variant":"soft","color":"#0ea5e9"},"position":{"x":1980,"y":200}},
                {"id":"n12","type":"countdown","config":{"endTime":"2026-11-25T23:59:00Z","label":"Black Friday deal ends in","size":"md"},"position":{"x":2200,"y":200}},
                {"id":"n13","type":"end","config":{"message":"Thanks for exploring WH-1000XM5 at sony.com"},"position":{"x":2420,"y":200}}
            ],"edges":[
                {"id":"e1","source":"n1","target":"n2"},
                {"id":"e2","source":"n2","target":"n3"},
                {"id":"e3","source":"n3","target":"n4","sourceHandle":"watched","label":"watched"},
                {"id":"e3s","source":"n3","target":"n4","sourceHandle":"skipped","label":"skipped"},
                {"id":"e4","source":"n4","target":"n5"},
                {"id":"e5","source":"n5","target":"n6"},
                {"id":"e6","source":"n6","target":"n7","sourceHandle":"answered"},
                {"id":"e7","source":"n6","target":"n7","sourceHandle":"skipped"},
                {"id":"e8","source":"n7","target":"n8"},
                {"id":"e9","source":"n8","target":"n9"},
                {"id":"e10","source":"n9","target":"n10"},
                {"id":"e11","source":"n10","target":"n11"},
                {"id":"e12","source":"n11","target":"n12"},
                {"id":"e13","source":"n12","target":"n13"}
            ]}
            """);
        jourRepo.save(j);
    }
}
