package com.journeo.connectors.repository;
import com.journeo.connectors.entity.MockCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface MockCampaignRepository extends JpaRepository<MockCampaign,String>{ List<MockCampaign> findByPlatform(String p); }
