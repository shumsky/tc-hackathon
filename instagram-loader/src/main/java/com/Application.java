package com;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.SpringApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {

    static final String exchangeConfirmPhotoPublish = "exchange-confirm-publish";
    static final String queueConfirmPhotoPublish = "queue-confirm-publish";

    static final String exchangeDataToPublish = "exchange-instagram-data";

    @Bean
    Queue queueConfirm() {
        return new Queue(queueConfirmPhotoPublish, true);
    }

    @Bean
    FanoutExchange exchangeConfirm() {
        return new FanoutExchange(exchangeConfirmPhotoPublish);
    }

    @Bean
    FanoutExchange exchangeInstagram() {
        return new FanoutExchange(exchangeDataToPublish);
    }

    @Bean
    Binding binding() {
        return BindingBuilder.bind(queueConfirm()).to(exchangeConfirm());
    }


    @Bean
    public ConnectionFactory connectionFactory() {
        CachingConnectionFactory cachingConnectionFactory = new CachingConnectionFactory();
        // cachingConnectionFactory.setHost(config.getRabbitConfig().getHost());
        // cachingConnectionFactory.setVirtualHost(config.getRabbitConfig().getVirtualHost());
        // cachingConnectionFactory.setUsername(config.getRabbitConfig().getUsername());
        // cachingConnectionFactory.setPassword(config.getRabbitConfig().getPassword());
        return cachingConnectionFactory;
    }

    @Bean
    public RabbitTemplate rabbitTemplate() {
        return new RabbitTemplate(connectionFactory());
    }


    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}