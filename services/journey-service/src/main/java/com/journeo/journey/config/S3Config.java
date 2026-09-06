package com.journeo.journey.config;

import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.http.apache.ApacheHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class S3Config {
    @Value("${aws.endpoint-url:http://localhost:4566}") String endpointUrl;
    @Value("${s3.public-endpoint:http://localhost:4566}") String publicEndpoint;
    @Value("${aws.region:us-east-1}") String region;
    @Value("${aws.access-key-id:test}") String accessKey;
    @Value("${aws.secret-access-key:test}") String secretKey;

    private StaticCredentialsProvider credentials() {
        return StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey));
    }

    private S3Configuration pathStyle(boolean enabled) {
        return S3Configuration.builder().pathStyleAccessEnabled(enabled).build();
    }

    @Bean
    public S3Client s3Client() {
        var builder = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(credentials())
                .httpClient(ApacheHttpClient.create());
        if (endpointUrl != null && !endpointUrl.isBlank()) {
            builder.endpointOverride(URI.create(endpointUrl)).serviceConfiguration(pathStyle(true));
        } else {
            builder.serviceConfiguration(pathStyle(false));
        }
        return builder.build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        var builder = S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(credentials());
        if (publicEndpoint != null && !publicEndpoint.isBlank()) {
            builder.endpointOverride(URI.create(publicEndpoint)).serviceConfiguration(pathStyle(true));
        } else {
            builder.serviceConfiguration(pathStyle(false));
        }
        return builder.build();
    }
}
