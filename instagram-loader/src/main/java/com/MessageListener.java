package com;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.Iterator;


@Component
public class MessageListener {

    private RestTemplate restTemplate = new RestTemplate();
    private ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = "queue-confirm-publish")
    public void receive(byte[] msg) throws Exception {

        JsonNode message = objectMapper.readTree(msg);

        // Build header with cookie=session_id(...)
        HttpHeaders headers = new HttpHeaders();
        headers.add("cookie", message.get("cookie").textValue());

        // Build api url
        String url = String.format(
                "https://api.instagram.com/v1/tags/%s/media/recent.json?access_token=%s%s",
                message.get("tag").textValue(),
                message.get("token").textValue(),
                message.get("signature").textValue()
        );

        ResponseEntity<JsonNode> responseData = requestInstagram(headers, url, true);

        if (Integer.parseInt(responseData.getStatusCode().toString()) == 200){

            // Send instagram response to rabbit_mq
            rabbitTemplate.convertAndSend(
                    "exchange-instagram-data",
                    "",
                    parseResponse(responseData, message.get("userId").textValue()));
        }
    }

    private ResponseEntity<JsonNode> requestInstagram(HttpHeaders headers, String url, boolean fake) {
        if (!fake) {
            // Get data from instagram
            return restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    JsonNode.class
            );
        } else {
            try {
                JsonNode fakeResponse = objectMapper.readTree(MessageListener.class.getResourceAsStream("/instagram_response.json"));
                return new ResponseEntity<>(fakeResponse, HttpStatus.OK);
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }
    }

    private String parseResponse(ResponseEntity<JsonNode> responseData, String userId){

        ArrayNode photoLinks = objectMapper.createArrayNode();
        ObjectNode payload = objectMapper.createObjectNode();

        payload.put("userId", userId);

        for (Iterator<JsonNode> it = responseData.getBody().get("data").iterator(); it.hasNext();){
            JsonNode element = it.next();
            photoLinks.add(element.get("images").get("thumbnail").get("url").asText());
        }

        payload.put("photoLinks", photoLinks);
        return payload.toString();
    }
}
