package com.journeo.journey.repository;
import com.journeo.journey.entity.JourneySession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface JourneySessionRepository extends JpaRepository<JourneySession,String>{ List<JourneySession> findByJourneyId(String jid); List<JourneySession> findByCampaignId(String cid); }
