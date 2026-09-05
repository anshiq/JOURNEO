package com.journeo.analytics.repository;
import com.journeo.analytics.entity.LlmUsageEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface LlmUsageRepository extends JpaRepository<LlmUsageEvent,Long>{ List<LlmUsageEvent> findByRequestId(String rid); }
