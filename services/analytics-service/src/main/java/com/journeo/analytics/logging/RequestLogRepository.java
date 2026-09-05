package com.journeo.analytics.logging;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface RequestLogRepository extends JpaRepository<RequestLogEntity,Long>{ List<RequestLogEntity> findByRequestId(String rid); }
