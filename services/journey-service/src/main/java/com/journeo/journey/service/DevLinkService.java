package com.journeo.journey.service;
import com.journeo.journey.entity.Campaign;
import com.journeo.journey.repository.CampaignRepository;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
@Service
public class DevLinkService {
    private final CampaignRepository campRepo;
    public DevLinkService(CampaignRepository campRepo){ this.campRepo=campRepo; }
    public Campaign ensureDevToken(Campaign c){
        if(c.getDevToken()==null || c.getDevToken().isBlank()){
            c.setDevToken(UUID.randomUUID().toString());
            c.setDevTokenCreatedAt(Instant.now());
        }
        return c;
    }
    public Optional<Campaign> findByDevToken(String token){ return campRepo.findByDevToken(token); }
    public Campaign rotate(String campaignId){
        Campaign c=campRepo.findById(campaignId).orElseThrow(()->new IllegalArgumentException("campaign not found"));
        c.setDevToken(UUID.randomUUID().toString());
        c.setDevTokenCreatedAt(Instant.now());
        return campRepo.save(c);
    }
}
