package com.journeo.journey;

import com.journeo.journey.service.FileStorageService;
import java.lang.reflect.Field;
import java.net.URL;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class FileStorageServiceTest {
  private FileStorageService service(S3Client s3, S3Presigner p) throws Exception {
    FileStorageService s = new FileStorageService(s3, p);
    set(s, "bucket", "journey-files");
    set(s, "publicEndpoint", "http://localhost:4566/journey-files");
    set(s, "region", "us-east-1");
    set(s, "expirySeconds", 600L);
    set(s, "maxImageMb", 25L);
    set(s, "maxVideoMb", 200L);
    return s;
  }

  private void set(Object o, String f, Object v) throws Exception {
    Field field = o.getClass().getDeclaredField(f);
    field.setAccessible(true);
    field.set(o, v);
  }

  @Test void rejectsNonMediaType() throws Exception {
    FileStorageService s = service(mock(S3Client.class), mock(S3Presigner.class));
    assertThrows(ResponseStatusException.class, () -> s.presign("a.pdf", "application/pdf", 100L));
  }

  @Test void rejectsOversizeImage() throws Exception {
    FileStorageService s = service(mock(S3Client.class), mock(S3Presigner.class));
    assertThrows(ResponseStatusException.class, () -> s.presign("a.png", "image/png", 26L * 1024 * 1024));
  }

  @Test void presignsImage() throws Exception {
    S3Client s3 = mock(S3Client.class);
    S3Presigner p = mock(S3Presigner.class);
    var presigned = mock(software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest.class);
    when(presigned.url()).thenReturn(new URL("http://localhost:4566/journey-files/uploads/x.png?sig=1"));
    when(p.presignPutObject(any(software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest.class))).thenReturn(presigned);
    FileStorageService s = service(s3, p);
    var out = s.presign("x.png", "image/png", 1024L);
    assertTrue(String.valueOf(out.get("uploadUrl")).contains("localhost:4566"));
    assertTrue(String.valueOf(out.get("publicUrl")).startsWith("http://localhost:4566/journey-files/uploads/"));
  }
}
