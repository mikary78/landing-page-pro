/**
 * Azure Service Bus 클라이언트
 * 
 * 마이크로서비스 간 이벤트 기반 통신을 위한 Service Bus 클라이언트입니다.
 * 
 * @see https://learn.microsoft.com/azure/service-bus-messaging/service-bus-nodejs-how-to-use-topics-subscriptions
 */

import { ServiceBusClient, ServiceBusSender, ServiceBusReceiver, ServiceBusReceivedMessage } from '@azure/service-bus';
import { DomainEvent, EventTopic, getTopicForEvent } from '../events';

// ============================================
// Types
// ============================================

export interface ServiceBusConfig {
  connectionString: string;
}

export interface EventHandler<T extends DomainEvent = DomainEvent> {
  (event: T, message: ServiceBusReceivedMessage): Promise<void>;
}

export interface SubscriptionOptions {
  subscriptionName: string;
  maxConcurrentCalls?: number;
  autoCompleteMessages?: boolean;
}

// ============================================
// Service Bus Client Singleton
// ============================================

let serviceBusClient: ServiceBusClient | null = null;
const senders: Map<EventTopic, ServiceBusSender> = new Map();
const receivers: Map<string, ServiceBusReceiver> = new Map();

/**
 * Service Bus 클라이언트 초기화
 */
export function initializeServiceBus(config: ServiceBusConfig): ServiceBusClient {
  if (!serviceBusClient) {
    serviceBusClient = new ServiceBusClient(config.connectionString);
    console.log('[ServiceBus] Client initialized');
  }
  return serviceBusClient;
}

/**
 * Service Bus 클라이언트 가져오기
 */
export function getServiceBusClient(): ServiceBusClient {
  if (!serviceBusClient) {
    const connectionString = process.env.SERVICE_BUS_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('SERVICE_BUS_CONNECTION_STRING environment variable is not set');
    }
    serviceBusClient = new ServiceBusClient(connectionString);
  }
  return serviceBusClient;
}

/**
 * Service Bus 연결 종료
 */
export async function closeServiceBus(): Promise<void> {
  // 모든 sender 닫기
  for (const sender of senders.values()) {
    await sender.close();
  }
  senders.clear();

  // 모든 receiver 닫기
  for (const receiver of receivers.values()) {
    await receiver.close();
  }
  receivers.clear();

  // 클라이언트 닫기
  if (serviceBusClient) {
    await serviceBusClient.close();
    serviceBusClient = null;
    console.log('[ServiceBus] Client closed');
  }
}

// ============================================
// Event Publishing
// ============================================

/**
 * 토픽에 대한 Sender 가져오기 (캐싱)
 */
function getSender(topic: EventTopic): ServiceBusSender {
  if (!senders.has(topic)) {
    const client = getServiceBusClient();
    const sender = client.createSender(topic);
    senders.set(topic, sender);
  }
  return senders.get(topic)!;
}

/**
 * 이벤트 발행
 */
export async function publishEvent(event: DomainEvent): Promise<void> {
  const topic = getTopicForEvent(event);
  const sender = getSender(topic);

  try {
    await sender.sendMessages({
      body: event,
      contentType: 'application/json',
      messageId: event.id,
      correlationId: event.correlationId,
      subject: event.type,
      applicationProperties: {
        eventType: event.type,
        eventVersion: event.version,
        source: event.source,
      },
    });

    console.log(`[ServiceBus] Event published: ${event.type} to ${topic}`);
  } catch (error) {
    console.error(`[ServiceBus] Failed to publish event: ${event.type}`, error);
    throw error;
  }
}

/**
 * 여러 이벤트 배치 발행
 */
export async function publishEvents(events: DomainEvent[]): Promise<void> {
  // 토픽별로 그룹화
  const eventsByTopic = new Map<EventTopic, DomainEvent[]>();
  
  for (const event of events) {
    const topic = getTopicForEvent(event);
    if (!eventsByTopic.has(topic)) {
      eventsByTopic.set(topic, []);
    }
    eventsByTopic.get(topic)!.push(event);
  }

  // 각 토픽에 배치 발행
  const promises = Array.from(eventsByTopic.entries()).map(async ([topic, topicEvents]) => {
    const sender = getSender(topic);
    const messages = topicEvents.map(event => ({
      body: event,
      contentType: 'application/json',
      messageId: event.id,
      correlationId: event.correlationId,
      subject: event.type,
      applicationProperties: {
        eventType: event.type,
        eventVersion: event.version,
        source: event.source,
      },
    }));

    await sender.sendMessages(messages);
    console.log(`[ServiceBus] ${topicEvents.length} events published to ${topic}`);
  });

  await Promise.all(promises);
}

// ============================================
// Event Subscribing
// ============================================

/**
 * 구독 키 생성
 */
function getSubscriptionKey(topic: EventTopic, subscriptionName: string): string {
  return `${topic}:${subscriptionName}`;
}

/**
 * 이벤트 구독 시작
 */
export function subscribeToEvents<T extends DomainEvent>(
  topic: EventTopic,
  options: SubscriptionOptions,
  handler: EventHandler<T>
): void {
  const key = getSubscriptionKey(topic, options.subscriptionName);
  
  if (receivers.has(key)) {
    console.warn(`[ServiceBus] Already subscribed to ${topic}:${options.subscriptionName}`);
    return;
  }

  const client = getServiceBusClient();
  const receiver = client.createReceiver(topic, options.subscriptionName, {
    receiveMode: options.autoCompleteMessages !== false ? 'receiveAndDelete' : 'peekLock',
  });

  receivers.set(key, receiver);

  // 메시지 핸들러 등록
  receiver.subscribe({
    processMessage: async (message) => {
      const event = message.body as T;
      console.log(`[ServiceBus] Received event: ${event.type} from ${topic}`);
      
      try {
        await handler(event, message);
        
        // peekLock 모드에서 수동 완료
        if (options.autoCompleteMessages === false) {
          await receiver.completeMessage(message);
        }
      } catch (error) {
        console.error(`[ServiceBus] Error processing event: ${event.type}`, error);
        
        // peekLock 모드에서 메시지 포기 (재시도 대상)
        if (options.autoCompleteMessages === false) {
          await receiver.abandonMessage(message);
        }
        
        throw error;
      }
    },
    processError: async (args) => {
      console.error(`[ServiceBus] Error in subscription ${topic}:${options.subscriptionName}:`, args.error);
    },
  }, {
    maxConcurrentCalls: options.maxConcurrentCalls ?? 1,
  });

  console.log(`[ServiceBus] Subscribed to ${topic}:${options.subscriptionName}`);
}

/**
 * 이벤트 구독 중지
 */
export async function unsubscribeFromEvents(
  topic: EventTopic,
  subscriptionName: string
): Promise<void> {
  const key = getSubscriptionKey(topic, subscriptionName);
  const receiver = receivers.get(key);
  
  if (receiver) {
    await receiver.close();
    receivers.delete(key);
    console.log(`[ServiceBus] Unsubscribed from ${topic}:${subscriptionName}`);
  }
}

// ============================================
// Health Check
// ============================================

/**
 * Service Bus 연결 상태 확인
 */
export async function checkServiceBusHealth(): Promise<boolean> {
  try {
    const client = getServiceBusClient();
    // 간단한 연결 테스트
    const sender = client.createSender('health-check');
    await sender.close();
    return true;
  } catch (error) {
    console.error('[ServiceBus] Health check failed:', error);
    return false;
  }
}

export default {
  initializeServiceBus,
  getServiceBusClient,
  closeServiceBus,
  publishEvent,
  publishEvents,
  subscribeToEvents,
  unsubscribeFromEvents,
  checkServiceBusHealth,
};
