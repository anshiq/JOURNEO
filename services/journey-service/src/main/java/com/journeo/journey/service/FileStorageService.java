package com.journeo.journey.service;

import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
public class FileStorageService {
    private final S3Client s3;
    private final S3Presigner presigner;
    @Value("${s3.bucket:journey-files}") String bucket;
    @Value("${s3.public-endpoint:http://localhost:4566}") String publicEndpoint;
    @Value("${s3.presign-expiry-seconds:600}") long expirySeconds;
    @Value("${s3.max-image-mb:25}") long maxImageMb;
    @Value("${s3.max-video-mb:200}") long maxVideoMb;
    private static final Set<String> ALLOWED_IMAGE = Set.of("image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml", "image/avif");
    private static final Set<String> ALLOWED_VIDEO = Set.of("video/mp4", "video/webm", "video/quicktime");

    public FileStorageService(S3Client s3, S3Presigner presigner) {
        this.s3 = s3;
        this.presigner = presigner;
    }

    public Map<String, Object> presign(String filename, String contentType, Long size) {
        if (filename == null || filename.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "filename is required");
        if (contentType == null || contentType.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "contentType is required");
        boolean isImage = contentType.startsWith("image/");
        boolean isVideo = contentType.startsWith("video/");
        if (!isImage && !isVideo) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "only image and video uploads are allowed");
        if (isImage && !ALLOWED_IMAGE.contains(contentType)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "unsupported image type");
        if (isVideo && !ALLOWED_VIDEO.contains(contentType)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "unsupported video type");
        long maxBytes = (isImage ? maxImageMb : maxVideoMb) * 1024 * 1024;
        if (size == null || size <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "size is required");
        if (size > maxBytes) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file too large");
        String safe = filename.replaceAll("^.*[\\\\/]", "").replaceAll("[^A-Za-z0-9._-]", "_");
        if (safe.length() > 128) safe = safe.substring(safe.length() - 128);
        if (safe.isBlank()) safe = "file";
        String key = "uploads/" + UUID.randomUUID() + "-" + safe;
        ensureBucket();
        PutObjectRequest put = PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).contentLength(size).build();
        PutObjectPresignRequest req = PutObjectPresignRequest.builder().putObjectRequest(put).signatureDuration(Duration.ofSeconds(expirySeconds)).build();
        String uploadUrl = presigner.presignPutObject(req).url().toString();
        String base = publicEndpoint.endsWith("/") ? publicEndpoint.substring(0, publicEndpoint.length() - 1) : publicEndpoint;
        String publicUrl = base + "/" + bucket + "/" + key;
        return Map.of("uploadUrl", uploadUrl, "publicUrl", publicUrl, "key", key, "bucket", bucket, "expiresIn", expirySeconds);
    }

    private void ensureBucket() {
        try {
            s3.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
        } catch (Exception e) {
            try {
                s3.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
            } catch (Exception ignored) {
            }
        }
    }
}
