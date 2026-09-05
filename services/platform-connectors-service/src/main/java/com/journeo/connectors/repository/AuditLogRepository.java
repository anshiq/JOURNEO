package com.journeo.connectors.repository;
import com.journeo.connectors.entity.AuditLogEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface AuditLogRepository extends JpaRepository<AuditLogEntry,String>{ List<AuditLogEntry> findByCampaignId(String cid); List<AuditLogEntry> findByActor(String a); }
