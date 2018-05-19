package com;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.SpringApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {

    static final String exchangeName = "fetch-photos";
    static final String queueName = "fetch-photos:q";

    static final String publishExchangeName = "insta-photos";

    @Bean
    FanoutExchange exchange() {
        return new FanoutExchange(exchangeName);
    }

    @Bean
    Queue queue() {
        return new Queue(queueName, true);
    }

    @Bean
    Binding binding() {
        return BindingBuilder.bind(queue()).to(exchange());
    }

    @Bean
    FanoutExchange publishExchange() {
        return new FanoutExchange(publishExchangeName);
    }

    @Bean
    public RabbitTemplate rabbitTemplate() {
        return new RabbitTemplate(new CachingConnectionFactory());
    }

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
