package com.journeo.journey.service;

import com.journeo.journey.entity.Campaign;
import com.journeo.journey.entity.Journey;
import com.journeo.journey.repository.CampaignRepository;
import com.journeo.journey.repository.JourneyRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class RealWorldCampaignSeeder implements CommandLineRunner {
    private final CampaignRepository campaignRepository;
    private final JourneyRepository journeyRepository;
    @Value("${demo-data-seed:false}") private boolean enabled;
    @Value("${demo-data-reset:false}") private boolean reset;

    public RealWorldCampaignSeeder(CampaignRepository campaignRepository, JourneyRepository journeyRepository) {
        this.campaignRepository = campaignRepository;
        this.journeyRepository = journeyRepository;
    }

    @Override
    public void run(String... args) {
        if (!enabled) return;
        if (reset) {
            journeyRepository.deleteAll();
            campaignRepository.deleteAll();
        }
        seed("samsung-galaxy-s24-ultra", "Samsung — Galaxy S24 Ultra", "Galaxy S24 Ultra — 200MP camera, titanium frame, Snapdragon 8 Gen 3 for Galaxy and S Pen included.", "Galaxy S24 Ultra", "200MP camera, titanium build, Galaxy AI and S Pen included.");
        seed("adidas-ultraboost-22", "adidas — Ultraboost 22", "Ultraboost 22 running shoes — responsive BOOST midsole, PRIMEKNIT upper and Continental Rubber outsole.", "Ultraboost 22", "Responsive BOOST midsole, PRIMEKNIT upper and Continental Rubber grip for daily miles.");
        seed("rivian-r1t", "Rivian — R1T", "Rivian R1T electric adventure truck — up to 420 miles of range, 3.4s 0-60 mph, Quad-Motor AWD and Gear Tunnel storage.", "R1T", "Up to 420 miles of range, 3.4s 0-60 mph, Quad-Motor AWD and Gear Tunnel storage.");
    }

    private void seed(String id, String name, String description, String headline, String content) {
        Campaign campaign = campaignRepository.findById(id).orElseGet(() -> {
            Campaign created = new Campaign();
            created.setId(id);
            return created;
        });
        campaign.setName(name);
        campaign.setDescription(description);
        campaign.setStatus("ACTIVE");
        campaignRepository.save(campaign);

        String graphJson = graph(headline, content);
        Journey journey = journeyRepository.findFirstByCampaignIdOrderByCreatedAtAsc(id).orElseGet(Journey::new);
        journey.setCampaignId(id);
        journey.setName(name + " Journey");
        journey.setStatus("PUBLISHED");
        if (!graphJson.equals(journey.getGraphJson())) {
            journey.setGraphJson(graphJson);
            journey.setVersion(Math.max(1, journey.getVersion()) + 1);
        }
        journeyRepository.save(journey);
    }

    private String graph(String headline, String content) {
        String safeHeadline = json(headline);
        String safeContent = json(content);
        return "{\"schemaVersion\":3,\"theme\":{\"primary\":\"#4f46e5\",\"accent\":\"#f97316\",\"surface\":\"#ffffff\",\"foreground\":\"#111827\",\"font\":\"Inter\",\"radius\":16,\"cta\":\"Continue\"},\"askAi\":{\"id\":\"ask-ai\",\"placeholder\":\"Ask about this product...\",\"buttonLabel\":\"Ask\",\"refusalMessage\":\"This question is out of context.\",\"ragK\":8,\"allowJourneyJump\":true,\"allowRag\":true,\"answerStyle\":\"thread\",\"persistence\":\"session\",\"scope\":\"global\",\"pinnedPanel\":true,\"allowPin\":true,\"allowAdjust\":true,\"maxConcurrentQueries\":3,\"historyLimit\":100},\"screens\":[{\"id\":\"s1\",\"name\":\"Overview\",\"position\":{\"x\":120,\"y\":100},\"size\":{\"width\":420,\"height\":560},\"blocks\":[\"b1\",\"b2\"],\"layout\":{\"mode\":\"stack\",\"direction\":\"column\",\"gap\":\"16px\",\"padding\":\"16px\",\"align\":\"stretch\",\"justify\":\"start\",\"scroll\":\"auto\"},\"advance\":{\"mode\":\"button\",\"handle\":\"default\",\"label\":\"Continue\",\"position\":\"bottom-sticky\",\"variant\":\"solid\",\"fullWidth\":true,\"requireValid\":false,\"requireBlocks\":[]},\"back\":{\"show\":false,\"label\":\"Back\"}}],\"nodes\":[{\"id\":\"trigger\",\"type\":\"trigger\",\"position\":{\"x\":0,\"y\":0},\"config\":{}},{\"id\":\"b1\",\"type\":\"hero_section\",\"position\":{\"x\":0,\"y\":0},\"config\":{\"headline\":\"" + safeHeadline + "\",\"subheadline\":\"Explore the details and find the right fit.\",\"ctas\":[]}}, {\"id\":\"b2\",\"type\":\"text\",\"position\":{\"x\":0,\"y\":1},\"config\":{\"content\":\"" + safeContent + "\"}}, {\"id\":\"end\",\"type\":\"end\",\"position\":{\"x\":600,\"y\":100},\"config\":{}}],\"edges\":[{\"id\":\"start\",\"source\":\"trigger\",\"target\":\"s1\"},{\"id\":\"finish\",\"source\":\"s1\",\"target\":\"end\",\"sourceHandle\":\"default\"}]}";
    }

    private String json(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
