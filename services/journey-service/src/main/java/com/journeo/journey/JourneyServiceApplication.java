package com.journeo.journey;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
@SpringBootApplication
@EnableAsync
public class JourneyServiceApplication {
    public static void main(String[] args) { SpringApplication.run(JourneyServiceApplication.class, args); }
}
