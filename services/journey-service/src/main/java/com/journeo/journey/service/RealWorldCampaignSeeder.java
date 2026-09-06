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
        }
        if(!campRepo.existsById("samsung-galaxy-s24-ultra")) seedSamsungGalaxyS24Ultra();
        if(!campRepo.existsById("adidas-ultraboost-22")) seedAdidasUltraboost22();
        if(!campRepo.existsById("rivian-r1t")) seedRivianR1T();
        System.out.println("Real-world campaigns seeded: Samsung Galaxy S24 Ultra, adidas Ultraboost 22, Rivian R1T");
    }
    private void seedSamsungGalaxyS24Ultra() {
        Campaign c = new Campaign();
        c.setId("samsung-galaxy-s24-ultra");
        c.setName("Samsung — Galaxy S24 Ultra");
        c.setDescription("Samsung Galaxy S24 Ultra — 200MP camera, titanium frame, Snapdragon 8 Gen 3 for Galaxy, S Pen included, Galaxy AI with Circle to Search. Official: https://www.samsung.com/global/galaxy/galaxy-s24-ultra/");
        c.setStatus("ACTIVE");
        campRepo.save(c);
        Journey j = new Journey();
        j.setCampaignId(c.getId());
        j.setName("Galaxy S24 Ultra Galaxy AI Funnel");
        j.setStatus("PUBLISHED");
        j.setGraphJson("""
            {"nodes":[
                {"id":"n1","type":"trigger","config":{"entryPoint":true},"position":{"x":0,"y":200}},
                {"id":"n2","type":"hero_section","config":{"badge":"Galaxy AI","headline":"Galaxy S24 Ultra","subheadline":"200MP camera. Titanium build. S Pen included. The first Galaxy AI phone.","image":"https://images.unsplash.com/photo-1705585174953-9b2aa8afc174?w=1200&q=80","imagePosition":"right","ctas":[{"label":"Buy from $1,299.99","variant":"solid"},{"label":"Watch Circle to Search","variant":"outline"}]},"position":{"x":220,"y":200}},
                {"id":"n3","type":"video","config":{"url":"https://www.youtube.com/watch?v=CYqOnILg8N4","poster":"https://images.unsplash.com/photo-1705530292519-ec81f2ace70d?w=800&q=80","autoplay":false,"controls":true,"showWatchedButton":true,"showSkipButton":true,"watchedLabel":"Watched","skipLabel":"Skip"},"position":{"x":440,"y":200}},
                {"id":"n4","type":"image","config":{"src":"https://images.unsplash.com/photo-1705530292519-ec81f2ace70d?w=800&q=80","alt":"Galaxy S24 Ultra titanium in hand"},"position":{"x":660,"y":200}},
                {"id":"n5","type":"text","config":{"content":"Snapdragon 8 Gen 3 for Galaxy, 200MP main camera with 5x optical zoom, 6.8-inch Dynamic AMOLED 2X at 2600 nits, Corning Gorilla Armor, titanium frame, IP68 rating, 5000mAh battery with 45W charging."},"position":{"x":880,"y":200}},
                {"id":"n6","type":"condition","config":{"field":"user_intent","operator":"eq","value":"photographer"},"position":{"x":1100,"y":200}},
                {"id":"n7","type":"quiz","config":{"question":"Which Galaxy AI feature excites you most?","type":"mcq","options":[{"id":"circle","label":"Circle to Search"},{"id":"translate","label":"Live Translate"},{"id":"chat","label":"Chat Assist"},{"id":"photo","label":"Photo Assist"}],"allowSkip":true,"skipLabel":"Skip"},"position":{"x":1320,"y":80}},
                {"id":"n8","type":"rating","config":{"label":"How likely are you to upgrade this year?","value":7,"max":10},"position":{"x":1320,"y":320}},
                {"id":"n9","type":"form","config":{"fields":[{"id":"email","type":"input","label":"Email","placeholder":"you@samsung.com","required":true},{"id":"storage","type":"select","label":"Storage","options":[{"value":"256","label":"256GB"},{"value":"512","label":"512GB"},{"value":"1tb","label":"1TB"}]},{"id":"tradein","type":"checkbox","label":"I have a device to trade in"}],"submitLabel":"Get Pre-order Access"},"position":{"x":1540,"y":200}},
                {"id":"n10","type":"countdown","config":{"endTime":"2026-12-15T09:00:00Z","label":"Trade-in bonus ends in","size":"md"},"position":{"x":1760,"y":200}},
                {"id":"n11","type":"alert","config":{"variant":"success","title":"You're on the list","message":"We'll notify you the moment the trade-in bonus goes live on samsung.com."},"position":{"x":1980,"y":200}},
                {"id":"n12","type":"badge","config":{"label":"Galaxy AI","variant":"soft","color":"#1428A0"},"position":{"x":2200,"y":200}},
                {"id":"n13","type":"end","config":{"message":"Thanks for exploring Galaxy S24 Ultra at samsung.com/galaxy-s24-ultra"},"position":{"x":2420,"y":200}}
            ],"edges":[
                {"id":"e1","source":"n1","target":"n2"},
                {"id":"e2","source":"n2","target":"n3"},
                {"id":"e3","source":"n3","target":"n4","sourceHandle":"watched","label":"watched"},
                {"id":"e3s","source":"n3","target":"n4","sourceHandle":"skipped","label":"skipped"},
                {"id":"e4","source":"n4","target":"n5"},
                {"id":"e5","source":"n5","target":"n6"},
                {"id":"e6","source":"n6","target":"n7","sourceHandle":"true","label":"photographer"},
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
    private void seedAdidasUltraboost22() {
        Campaign c = new Campaign();
        c.setId("adidas-ultraboost-22");
        c.setName("adidas — Ultraboost 22");
        c.setDescription("adidas Ultraboost 22 running shoes — responsive BOOST midsole, PRIMEKNIT upper, Linear Energy Push System, Continental Rubber outsole. Official: https://www.adidas.com/us/ultraboost_22-shoes");
        c.setStatus("ACTIVE");
        campRepo.save(c);
        Journey j = new Journey();
        j.setCampaignId(c.getId());
        j.setName("Ultraboost 22 Performance Funnel");
        j.setStatus("PUBLISHED");
        j.setGraphJson("""
            {"nodes":[
                {"id":"n1","type":"trigger","config":{"entryPoint":true},"position":{"x":0,"y":200}},
                {"id":"n2","type":"hero_section","config":{"badge":"BOOST Technology","headline":"Ultraboost 22","subheadline":"Responsive BOOST midsole. PRIMEKNIT upper. Built to go the distance.","image":"https://images.unsplash.com/photo-1519861297062-a1eec154f81a?w=1200&q=80","imagePosition":"left","ctas":[{"label":"Shop $190","variant":"solid"},{"label":"Watch the Process","variant":"outline"}]},"position":{"x":220,"y":200}},
                {"id":"n3","type":"video","config":{"url":"https://www.youtube.com/watch?v=4J_kxwT9zX4","poster":"https://images.unsplash.com/photo-1466229700857-454be534948a?w=800&q=80","autoplay":false,"controls":true,"showWatchedButton":true,"showSkipButton":true,"watchedLabel":"Watched","skipLabel":"Skip"},"position":{"x":440,"y":200}},
                {"id":"n4","type":"image","config":{"src":"https://images.unsplash.com/photo-1466229700857-454be534948a?w=800&q=80","alt":"Ultraboost 22 on wet pavement"},"position":{"x":660,"y":200}},
                {"id":"n5","type":"card","config":{"layout":"vertical","badge":"Runner's Choice","title":"Why BOOST?","description":"Thousands of fused thermoplastic polyurethane energy capsules return more energy with every stride, in any weather."},"position":{"x":880,"y":200}},
                {"id":"n6","type":"text","config":{"content":"adidas PRIMEKNIT upper hugs the foot, Linear Energy Push System increases forefoot stiffness for a propulsive toe-off, Stretchweb outsole with Continental Rubber grips wet and dry roads. Weight: 333g."},"position":{"x":1100,"y":200}},
                {"id":"n7","type":"condition","config":{"field":"runner_type","operator":"eq","value":"daily"},"position":{"x":1320,"y":200}},
                {"id":"n8","type":"select","config":{"label":"Size","placeholder":"Choose size","options":[{"value":"8","label":"US 8"},{"value":"9","label":"US 9"},{"value":"10","label":"US 10"},{"value":"11","label":"US 11"},{"value":"12","label":"US 12"}]},"position":{"x":1540,"y":80}},
                {"id":"n9","type":"input","config":{"type":"email","label":"Email","placeholder":"you@adidas.com","helperText":"For adiClub rewards"},"position":{"x":1540,"y":320}},
                {"id":"n10","type":"checkbox","config":{"label":"Join adiClub for 15% off","checked":false},"position":{"x":1760,"y":200}},
                {"id":"n11","type":"button","config":{"label":"Add to Cart — $190","variant":"solid","size":"lg"},"position":{"x":1980,"y":200}},
                {"id":"n12","type":"countdown","config":{"endTime":"2026-11-30T23:59:00Z","label":"Member sale ends in","size":"md"},"position":{"x":2200,"y":200}},
                {"id":"n13","type":"end","config":{"message":"Thanks for exploring Ultraboost 22 at adidas.com"},"position":{"x":2420,"y":200}}
            ],"edges":[
                {"id":"e1","source":"n1","target":"n2"},
                {"id":"e2","source":"n2","target":"n3"},
                {"id":"e3","source":"n3","target":"n4","sourceHandle":"watched","label":"watched"},
                {"id":"e3s","source":"n3","target":"n4","sourceHandle":"skipped","label":"skipped"},
                {"id":"e4","source":"n4","target":"n5"},
                {"id":"e5","source":"n5","target":"n6"},
                {"id":"e6","source":"n6","target":"n7"},
                {"id":"e7","source":"n7","target":"n8","sourceHandle":"true","label":"daily"},
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
    private void seedRivianR1T() {
        Campaign c = new Campaign();
        c.setId("rivian-r1t");
        c.setName("Rivian — R1T");
        c.setDescription("Rivian R1T electric adventure truck — up to 420 mi EPA estimated range, 3.4s 0-60 mph, Quad-Motor AWD, Gear Tunnel storage. Official: https://rivian.com/r1t");
        c.setStatus("ACTIVE");
        campRepo.save(c);
        Journey j = new Journey();
        j.setCampaignId(c.getId());
        j.setName("R1T Adventure Funnel");
        j.setStatus("PUBLISHED");
        j.setGraphJson("""
            {"nodes":[
                {"id":"n1","type":"trigger","config":{"entryPoint":true},"position":{"x":0,"y":200}},
                {"id":"n2","type":"hero_section","config":{"badge":"Electric Adventure","headline":"R1T","subheadline":"Up to 420 miles of range. 3.4s 0-60 mph. Quad-Motor AWD built for on-road and off.","image":"https://images.unsplash.com/photo-1667137091780-93956688d39a?w=1200&q=80","imagePosition":"left","ctas":[{"label":"Build Yours from $79,990","variant":"solid"},{"label":"Watch the Adventure","variant":"outline"}]},"position":{"x":220,"y":200}},
                {"id":"n3","type":"video","config":{"url":"https://www.youtube.com/watch?v=cmdsKHTRViA","poster":"https://images.unsplash.com/photo-1667137092038-27612b7233d1?w=800&q=80","autoplay":false,"controls":true,"showWatchedButton":true,"showSkipButton":true,"watchedLabel":"Watched","skipLabel":"Skip"},"position":{"x":440,"y":200}},
                {"id":"n4","type":"image","config":{"src":"https://images.unsplash.com/photo-1667137092038-27612b7233d1?w=800&q=80","alt":"Rivian R1T in the forest"},"position":{"x":660,"y":200}},
                {"id":"n5","type":"card","config":{"layout":"horizontal","badge":"Gear Tunnel","title":"Storage Built In","description":"A lockable through-body Gear Tunnel stores gear from surfboards to camp kitchens without eating into bed or cabin space."},"position":{"x":880,"y":200}},
                {"id":"n6","type":"container","config":{"direction":"column","gap":"12px","align":"stretch","justify":"start"},"position":{"x":1100,"y":200}},
                {"id":"n7","type":"divider","config":{"orientation":"horizontal"},"position":{"x":1320,"y":200}},
                {"id":"n8","type":"text","config":{"content":"Quad-Motor AWD delivers up to 665 hp and 3.4s 0-60 mph. Skateboard platform battery architecture. Up to 11,000 lb towing capacity. Adaptive air suspension for on-road comfort and off-road clearance. rivian.com/r1t"},"position":{"x":1540,"y":200}},
                {"id":"n9","type":"condition","config":{"field":"has_home_charging","operator":"eq","value":"yes"},"position":{"x":1760,"y":200}},
                {"id":"n10","type":"form","config":{"fields":[{"id":"zip","type":"input","label":"ZIP","placeholder":"90210","required":true},{"id":"trim","type":"select","label":"Trim","options":[{"value":"adventure","label":"Adventure"},{"value":"ascend","label":"Ascend"}]},{"id":"towing","type":"checkbox","label":"I plan to tow with it"}],"submitLabel":"Check Build & Delivery"},"position":{"x":1980,"y":80}},
                {"id":"n11","type":"alert","config":{"variant":"info","title":"Charging","message":"Home charging is recommended. The Rivian Adventure Network adds up to 140 miles in about 20 minutes."},"position":{"x":1980,"y":320}},
                {"id":"n12","type":"countdown","config":{"endTime":"2026-12-31T23:59:00Z","label":"Current configurator pricing locks in","size":"md","expiredMessage":"Pricing updated — check rivian.com for current configuration."},"position":{"x":2200,"y":200}},
                {"id":"n13","type":"end","config":{"message":"Thanks for exploring R1T at rivian.com"},"position":{"x":2420,"y":200}}
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
}
