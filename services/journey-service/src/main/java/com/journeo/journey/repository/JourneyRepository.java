package com.journeo.journey.repository;
import com.journeo.journey.entity.Journey;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface JourneyRepository extends JpaRepository<Journey,String>{ List<Journey> findByCampaignId(String cid); }
