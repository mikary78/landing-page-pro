# ============================================
# Azure Kubernetes Service (AKS) Module
# ============================================
# 마이크로서비스 배포를 위한 Kubernetes 클러스터
#
# 참고: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
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

variable "cluster_name" {
  description = "AKS 클러스터 이름"
  type        = string
}

variable "dns_prefix" {
  description = "DNS 접두사"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes 버전"
  type        = string
  default     = "1.28"
}

variable "default_node_pool" {
  description = "기본 노드 풀 설정"
  type = object({
    name                = optional(string, "default")
    node_count          = optional(number, 2)
    vm_size             = optional(string, "Standard_D2s_v3")
    os_disk_size_gb     = optional(number, 30)
    max_pods            = optional(number, 110)
    enable_auto_scaling = optional(bool, true)
    min_count           = optional(number, 1)
    max_count           = optional(number, 5)
  })
  default = {}
}

variable "additional_node_pools" {
  description = "추가 노드 풀 목록"
  type = list(object({
    name                = string
    node_count          = optional(number, 1)
    vm_size             = optional(string, "Standard_D2s_v3")
    os_disk_size_gb     = optional(number, 30)
    max_pods            = optional(number, 110)
    enable_auto_scaling = optional(bool, true)
    min_count           = optional(number, 1)
    max_count           = optional(number, 3)
    node_labels         = optional(map(string), {})
    node_taints         = optional(list(string), [])
  }))
  default = []
}

variable "network_profile" {
  description = "네트워크 프로필"
  type = object({
    network_plugin     = optional(string, "azure")
    network_policy     = optional(string, "calico")
    load_balancer_sku  = optional(string, "standard")
    service_cidr       = optional(string, "10.0.0.0/16")
    dns_service_ip     = optional(string, "10.0.0.10")
  })
  default = {}
}

variable "tags" {
  description = "리소스 태그"
  type        = map(string)
  default     = {}
}

variable "acr_id" {
  description = "Azure Container Registry ID (AKS에서 이미지 풀 권한 부여)"
  type        = string
  default     = null
}

# ============================================
# AKS Cluster
# ============================================

resource "azurerm_kubernetes_cluster" "main" {
  name                = var.cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.dns_prefix
  kubernetes_version  = var.kubernetes_version

  # 기본 노드 풀
  default_node_pool {
    name                = var.default_node_pool.name
    node_count          = var.default_node_pool.enable_auto_scaling ? null : var.default_node_pool.node_count
    vm_size             = var.default_node_pool.vm_size
    os_disk_size_gb     = var.default_node_pool.os_disk_size_gb
    max_pods            = var.default_node_pool.max_pods
    enable_auto_scaling = var.default_node_pool.enable_auto_scaling
    min_count           = var.default_node_pool.enable_auto_scaling ? var.default_node_pool.min_count : null
    max_count           = var.default_node_pool.enable_auto_scaling ? var.default_node_pool.max_count : null

    # 가용성 영역
    zones = ["1", "2", "3"]
  }

  # Managed Identity
  identity {
    type = "SystemAssigned"
  }

  # 네트워크 프로필
  network_profile {
    network_plugin     = var.network_profile.network_plugin
    network_policy     = var.network_profile.network_policy
    load_balancer_sku  = var.network_profile.load_balancer_sku
    service_cidr       = var.network_profile.service_cidr
    dns_service_ip     = var.network_profile.dns_service_ip
  }

  # 모니터링 (Azure Monitor)
  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  # Azure Policy 활성화
  azure_policy_enabled = true

  # RBAC 활성화
  role_based_access_control_enabled = true

  # Azure AD 통합
  azure_active_directory_role_based_access_control {
    managed            = true
    azure_rbac_enabled = true
  }

  tags = merge(var.tags, {
    service = "aks"
  })
}

# ============================================
# Additional Node Pools
# ============================================

resource "azurerm_kubernetes_cluster_node_pool" "additional" {
  for_each = { for pool in var.additional_node_pools : pool.name => pool }

  name                  = each.value.name
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = each.value.vm_size
  node_count            = each.value.enable_auto_scaling ? null : each.value.node_count
  os_disk_size_gb       = each.value.os_disk_size_gb
  max_pods              = each.value.max_pods
  enable_auto_scaling   = each.value.enable_auto_scaling
  min_count             = each.value.enable_auto_scaling ? each.value.min_count : null
  max_count             = each.value.enable_auto_scaling ? each.value.max_count : null
  node_labels           = each.value.node_labels
  node_taints           = each.value.node_taints

  zones = ["1", "2", "3"]
}

# ============================================
# Log Analytics Workspace
# ============================================

resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.cluster_name}-logs"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = var.tags
}

# ============================================
# ACR Pull Permission
# ============================================

resource "azurerm_role_assignment" "acr_pull" {
  count = var.acr_id != null ? 1 : 0

  principal_id                     = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = var.acr_id
  skip_service_principal_aad_check = true
}

# ============================================
# Outputs
# ============================================

output "cluster_id" {
  description = "AKS 클러스터 ID"
  value       = azurerm_kubernetes_cluster.main.id
}

output "cluster_name" {
  description = "AKS 클러스터 이름"
  value       = azurerm_kubernetes_cluster.main.name
}

output "kube_config" {
  description = "Kubernetes 설정"
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
}

output "kube_config_host" {
  description = "Kubernetes API 서버 호스트"
  value       = azurerm_kubernetes_cluster.main.kube_config[0].host
  sensitive   = true
}

output "client_certificate" {
  description = "클라이언트 인증서"
  value       = azurerm_kubernetes_cluster.main.kube_config[0].client_certificate
  sensitive   = true
}

output "client_key" {
  description = "클라이언트 키"
  value       = azurerm_kubernetes_cluster.main.kube_config[0].client_key
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "클러스터 CA 인증서"
  value       = azurerm_kubernetes_cluster.main.kube_config[0].cluster_ca_certificate
  sensitive   = true
}

output "kubelet_identity" {
  description = "Kubelet Managed Identity"
  value       = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

output "node_resource_group" {
  description = "노드 리소스 그룹"
  value       = azurerm_kubernetes_cluster.main.node_resource_group
}
