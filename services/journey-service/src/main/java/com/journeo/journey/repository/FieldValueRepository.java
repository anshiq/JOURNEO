package com.journeo.journey.repository;
import com.journeo.journey.entity.FieldValue;
import org.springframework.data.jpa.repository.JpaRepository;
public interface FieldValueRepository extends JpaRepository<FieldValue,Long>{
    boolean existsByCampaignIdAndFieldKeyAndValue(String campaignId, String fieldKey, String value);
}
