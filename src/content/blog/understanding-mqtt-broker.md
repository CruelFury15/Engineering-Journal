---
title: "Understanding MQTT Broker"
description: "Learning real-time communication using the publish-subscribe model."
pubDate: 2026-11-06
topics:
  - system-design
tags:
  - MQTT
  - IoT
  - Backend
draft: false
featured: true
updatedDate: 2026-11-07
---

# Understanding MQTT Broker

MQTT is a lightweight messaging protocol
based on the publish-subscribe architecture.

## Core Components

1. Publisher
2. Subscriber
3. MQTT Broker

## How It Works

A publisher sends messages to a topic.
The broker receives those messages and
forwards them to subscribed clients.

### Example: MQTT Publisher

```javascript
const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
    client.publish("sensors/temperature", "28.5");
});
```