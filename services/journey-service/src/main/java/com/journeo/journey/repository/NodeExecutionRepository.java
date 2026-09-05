package com.journeo.journey.repository;
import com.journeo.journey.entity.NodeExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface NodeExecutionRepository extends JpaRepository<NodeExecution,String>{ List<NodeExecution> findBySessionId(String sid); }
