package com.journeo.analytics.config;
import org.springframework.context.annotation.*;
import org.springframework.web.servlet.config.annotation.*;
@Configuration
public class AppConfig {
    @Bean public org.springframework.web.servlet.config.annotation.WebMvcConfigurer corsConfigurer(){
        return new WebMvcConfigurer(){ @Override public void addCorsMappings(CorsRegistry reg){ reg.addMapping("/**").allowedOrigins("http://localhost:5173","http://localhost:3000").allowedMethods("*").allowedHeaders("*").allowCredentials(true); } };
    }
    @Bean public org.springframework.web.client.RestTemplate restTemplate(){ return new org.springframework.web.client.RestTemplate(); }
}
