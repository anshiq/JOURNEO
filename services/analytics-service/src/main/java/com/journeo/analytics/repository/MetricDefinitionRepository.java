package com.journeo.analytics.repository;
import com.journeo.analytics.entity.MetricDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
public interface MetricDefinitionRepository extends JpaRepository<MetricDefinition,String>{}
