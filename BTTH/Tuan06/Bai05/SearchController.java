package com.example.demo.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Cho phép FE gọi API
public class SearchController {
    
    private final JdbcTemplate jdbcTemplate;

    public SearchController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/search")
    public List<Map<String, Object>> search(@RequestParam String q) {
        String sql = "EXEC sp_SearchItem ?";
        return jdbcTemplate.queryForList(sql, q);
    }
}
