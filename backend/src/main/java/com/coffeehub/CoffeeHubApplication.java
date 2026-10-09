package com.coffeehub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
// Repositories are grouped as nested interfaces per module (e.g. VendorRepositories).
@EnableJpaRepositories(considerNestedRepositories = true)
@EnableAsync
public class CoffeeHubApplication {

    public static void main(String[] args) {
        SpringApplication.run(CoffeeHubApplication.class, args);
    }
}
