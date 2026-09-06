package com.journeo.analytics.config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.web.servlet.config.annotation.*;
@Configuration
public class AppConfig {
    @Value("${CORS_ALLOWED_ORIGINS:http://localhost:5173,http://localhost:3000}")
    private String corsAllowedOrigins;

    @Bean public org.springframework.web.servlet.config.annotation.WebMvcConfigurer corsConfigurer(){
        String[] origins = corsAllowedOrigins.split(",");
        return new WebMvcConfigurer(){ @Override public void addCorsMappings(CorsRegistry reg){ reg.addMapping("/**").allowedOrigins(origins).allowedMethods("*").allowedHeaders("*").allowCredentials(true); } };
    }
    @Bean public org.springframework.web.client.RestTemplate restTemplate(){ return new org.springframework.web.client.RestTemplate(); }
}
