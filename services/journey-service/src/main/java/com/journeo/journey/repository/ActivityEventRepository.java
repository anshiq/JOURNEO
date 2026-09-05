package com.journeo.journey.repository;
import com.journeo.journey.entity.ActivityEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ActivityEventRepository extends JpaRepository<ActivityEvent,String>{ List<ActivityEvent> findByCampaignIdOrderByCreatedAtDesc(String cid); }
