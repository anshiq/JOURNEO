package com.journeo.journey.config;

import com.journeo.journey.logging.RequestIdPropagatingInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class RestTemplateConfig {

    @Bean
    public RequestIdPropagatingInterceptor requestIdPropagatingInterceptor() {
        return new RequestIdPropagatingInterceptor();
    }

    @Bean
    @Primary
    public RestTemplate restTemplate(RequestIdPropagatingInterceptor interceptor) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(2000);
        RestTemplate rt = new RestTemplate(factory);
        List<ClientHttpRequestInterceptor> interceptors = new ArrayList<>(rt.getInterceptors());
        interceptors.add(interceptor);
        rt.setInterceptors(interceptors);
        return rt;
    }

    @Bean
    public RestTemplate traceRestTemplate() {
        // without interceptor for trace fan-out internal (still want propagation)
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(2000);
        return new RestTemplate(factory);
    }
}
