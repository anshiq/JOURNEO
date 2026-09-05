package com.journeo.analytics.repository;
import com.journeo.analytics.entity.DeliveryEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
public interface DeliveryEventRepository extends JpaRepository<DeliveryEvent,Long>{
    List<DeliveryEvent> findByCampaignIdAndDateBetween(String cid, LocalDate from, LocalDate to);
    List<DeliveryEvent> findByCampaignId(String cid);
    long countByCampaignId(String cid);
}
