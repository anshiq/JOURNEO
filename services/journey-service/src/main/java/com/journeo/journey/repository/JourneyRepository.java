package com.journeo.journey.repository;
import com.journeo.journey.entity.Journey;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface JourneyRepository extends JpaRepository<Journey,String>{
    List<Journey> findByCampaignIdOrderByCreatedAtAsc(String cid);
    Optional<Journey> findFirstByCampaignIdOrderByCreatedAtAsc(String cid);
    long countByCampaignId(String cid);
    void deleteByCampaignIdAndIdNot(String cid, String id);
}
