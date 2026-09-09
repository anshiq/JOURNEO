package com.journeo.analytics.repository;
import com.journeo.analytics.entity.ClickEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ClickEventRepository extends JpaRepository<ClickEvent,Long>{ List<ClickEvent> findByCampaignId(String campaignId); }
