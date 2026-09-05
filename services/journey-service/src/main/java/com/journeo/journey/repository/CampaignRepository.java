package com.journeo.journey.repository;
import com.journeo.journey.entity.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface CampaignRepository extends JpaRepository<Campaign,String>{
    Optional<Campaign> findByDevToken(String devToken);
}
