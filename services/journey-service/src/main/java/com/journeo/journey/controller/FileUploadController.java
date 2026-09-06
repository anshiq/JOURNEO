package com.journeo.journey.controller;

import com.journeo.journey.service.FileStorageService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/files")
public class FileUploadController {
    private final FileStorageService files;

    public FileUploadController(FileStorageService files) {
        this.files = files;
    }

    @PostMapping("/presign")
    public ResponseEntity<Map<String, Object>> presignPost(@RequestBody Map<String, Object> body) {
        String filename = body.get("filename") != null ? String.valueOf(body.get("filename")) : (body.get("fileName") != null ? String.valueOf(body.get("fileName")) : null);
        String contentType = body.get("contentType") != null ? String.valueOf(body.get("contentType")) : (body.get("fileType") != null ? String.valueOf(body.get("fileType")) : null);
        Long size = body.get("size") instanceof Number n ? n.longValue() : (body.get("size") != null ? Long.parseLong(String.valueOf(body.get("size"))) : null);
        return ResponseEntity.ok(files.presign(filename, contentType, size));
    }

    @GetMapping("/presign")
    public ResponseEntity<Map<String, Object>> presignGet(@RequestParam(required = false) String filename, @RequestParam(required = false) String fileName, @RequestParam(required = false) String contentType, @RequestParam(required = false) String fileType, @RequestParam(required = false) Long size) {
        String fn = filename != null ? filename : fileName;
        String ct = contentType != null ? contentType : fileType;
        return ResponseEntity.ok(files.presign(fn, ct, size));
    }
}
