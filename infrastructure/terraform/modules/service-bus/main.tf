# ============================================
# Azure Service Bus Module
# ============================================
# 마이크로서비스 간 이벤트 기반 통신을 위한 Service Bus
#
# 참고: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/servicebus_namespace
# ============================================

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# ============================================
# Variables
# ============================================

variable "resource_group_name" {
  description = "리소스 그룹 이름"
  type        = string
}

variable "location" {
  description = "Azure 지역"
  type        = string
  default     = "koreacentral"
}

variable "namespace_name" {
  description = "Service Bus 네임스페이스 이름"
  type        = string
}

variable "sku" {
  description = "Service Bus SKU (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"
}

variable "tags" {
  description = "리소스 태그"
  type        = map(string)
  default     = {}
}

variable "topics" {
  description = "생성할 토픽 목록"
  type = list(object({
    name                = string
    subscriptions       = list(string)
    max_size_in_mb      = optional(number, 1024)
    default_message_ttl = optional(string, "P14D") # 14일
  }))
  default = []
}

# ============================================
# Service Bus Namespace
# ============================================

resource "azurerm_servicebus_namespace" "main" {
  name                = var.namespace_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.sku

  tags = merge(var.tags, {
    service = "service-bus"
  })
}

# ============================================
# Topics
# ============================================

resource "azurerm_servicebus_topic" "topics" {
  for_each = { for topic in var.topics : topic.name => topic }

  name                = each.value.name
  namespace_id        = azurerm_servicebus_namespace.main.id
  max_size_in_megabytes = each.value.max_size_in_mb
  default_message_ttl = each.value.default_message_ttl

  # 중복 감지 활성화
  requires_duplicate_detection = true
  duplicate_detection_history_time_window = "PT10M" # 10분
}

# ============================================
# Subscriptions
# ============================================

resource "azurerm_servicebus_subscription" "subscriptions" {
  for_each = {
    for item in flatten([
      for topic in var.topics : [
        for sub in topic.subscriptions : {
          key        = "${topic.name}-${sub}"
          topic_name = topic.name
          sub_name   = sub
        }
      ]
    ]) : item.key => item
  }

  name               = each.value.sub_name
  topic_id           = azurerm_servicebus_topic.topics[each.value.topic_name].id
  max_delivery_count = 10

  # Dead Letter Queue 활성화
  dead_lettering_on_message_expiration = true
}

# ============================================
# Shared Access Policies
# ============================================

# 발행자용 (Send 권한)
resource "azurerm_servicebus_namespace_authorization_rule" "sender" {
  name         = "sender"
  namespace_id = azurerm_servicebus_namespace.main.id

  listen = false
  send   = true
  manage = false
}

# 구독자용 (Listen 권한)
resource "azurerm_servicebus_namespace_authorization_rule" "listener" {
  name         = "listener"
  namespace_id = azurerm_servicebus_namespace.main.id

  listen = true
  send   = false
  manage = false
}

# 관리자용 (모든 권한)
resource "azurerm_servicebus_namespace_authorization_rule" "admin" {
  name         = "admin"
  namespace_id = azurerm_servicebus_namespace.main.id

  listen = true
  send   = true
  manage = true
}

# ============================================
# Outputs
# ============================================

output "namespace_id" {
  description = "Service Bus 네임스페이스 ID"
  value       = azurerm_servicebus_namespace.main.id
}

output "namespace_name" {
  description = "Service Bus 네임스페이스 이름"
  value       = azurerm_servicebus_namespace.main.name
}

output "primary_connection_string" {
  description = "기본 연결 문자열 (관리자)"
  value       = azurerm_servicebus_namespace.main.default_primary_connection_string
  sensitive   = true
}

output "sender_connection_string" {
  description = "발행자 연결 문자열"
  value       = azurerm_servicebus_namespace_authorization_rule.sender.primary_connection_string
  sensitive   = true
}

output "listener_connection_string" {
  description = "구독자 연결 문자열"
  value       = azurerm_servicebus_namespace_authorization_rule.listener.primary_connection_string
  sensitive   = true
}

output "topic_ids" {
  description = "생성된 토픽 ID 맵"
  value = {
    for name, topic in azurerm_servicebus_topic.topics : name => topic.id
  }
}
