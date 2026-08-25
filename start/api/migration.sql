-- =========================================================================
-- ELTHERA PRO - MYSQL DATABASE MIGRATION & INDEXING SCRIPT
-- Environment: GoDaddy Node.js Hosting / cPanel MySQL 8.0+ / MariaDB 10.4+
-- Charset: utf8mb4 / utf8mb4_unicode_ci
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- 1. TABELA DE AUTENTICAÇÃO E USUÁRIOS MULTI-ROLE (usuarios_auth)
CREATE TABLE IF NOT EXISTS `usuarios_auth` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `guid` VARCHAR(64) UNIQUE NOT NULL,
  `nome` VARCHAR(255) NOT NULL,
  `login_ou_telefone` VARCHAR(100) NOT NULL,
  `email` VARCHAR(191) DEFAULT NULL,
  `senha_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'tecnico', 'cliente') NOT NULL DEFAULT 'tecnico',
  `contato_id` VARCHAR(64) DEFAULT NULL COMMENT 'Vínculo com ID da tabela cadastros_contatos',
  `permissoes_json` JSON DEFAULT NULL COMMENT 'Permissões específicas de abas e recursos',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `ultimo_login` DATETIME DEFAULT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE INDEX `idx_usuario_guid` (`guid`),
  UNIQUE INDEX `idx_usuario_login` (`login_ou_telefone`),
  INDEX `idx_usuario_email` (`email`),
  INDEX `idx_usuario_role_ativo` (`role`, `ativo`),
  INDEX `idx_usuario_contato` (`contato_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABELA DE LOGS DE AUDITORIA (auditoria_historico)
CREATE TABLE IF NOT EXISTS `auditoria_historico` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `guid` VARCHAR(64) UNIQUE NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` VARCHAR(64) NOT NULL,
  `acao` VARCHAR(50) NOT NULL,
  `usuario` VARCHAR(150) NOT NULL,
  `usuario_id` INT DEFAULT NULL,
  `ip_origem` VARCHAR(45) DEFAULT NULL,
  `resumo` TEXT,
  `dados_json` LONGTEXT,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE INDEX `idx_audit_guid` (`guid`),
  INDEX `idx_audit_entity` (`entity_type`, `entity_id`),
  INDEX `idx_audit_usuario` (`usuario`),
  INDEX `idx_audit_acao` (`acao`),
  INDEX `idx_audit_criado_em` (`criado_em` DESC),
  INDEX `idx_audit_composite` (`entity_type`, `acao`, `criado_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABELA CENTRAL DE BUFFER E SINCRONIZAÇÃO (registros_sincronizacao)
CREATE TABLE IF NOT EXISTS `registros_sincronizacao` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `guid` VARCHAR(64) UNIQUE NOT NULL,
  `tipo_entidade` VARCHAR(50) DEFAULT 'geral',
  `usuario_id` INT DEFAULT 1,
  `dados_json` LONGTEXT NOT NULL,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE INDEX `idx_sync_guid` (`guid`),
  INDEX `idx_sync_tipo` (`tipo_entidade`),
  INDEX `idx_sync_usuario` (`usuario_id`),
  INDEX `idx_sync_atualizado` (`atualizado_em` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABELA DE CADASTROS: CLIENTES E TÉCNICOS (cadastros_contatos)
CREATE TABLE IF NOT EXISTS `cadastros_contatos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `guid` VARCHAR(64) UNIQUE NOT NULL,
  `tipo` ENUM('cliente', 'tecnico', 'parceiro') DEFAULT 'cliente',
  `nome` VARCHAR(255) NOT NULL,
  `documento` VARCHAR(50) DEFAULT NULL,
  `telefone` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `cidade` VARCHAR(100) DEFAULT NULL,
  `uf` VARCHAR(10) DEFAULT NULL,
  `dados_json` LONGTEXT NOT NULL,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE INDEX `idx_contato_guid` (`guid`),
  INDEX `idx_contato_tipo` (`tipo`),
  INDEX `idx_contato_telefone` (`telefone`),
  INDEX `idx_contato_doc` (`documento`),
  INDEX `idx_contato_email` (`email`),
  INDEX `idx_contato_cidade_uf` (`cidade`, `uf`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABELA DE CHECKLISTS E LAUDOS TÉCNICOS (checklists_laudos)
CREATE TABLE IF NOT EXISTS `checklists_laudos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `guid` VARCHAR(64) UNIQUE NOT NULL,
  `protocol_number` VARCHAR(50) NOT NULL,
  `customer_id` VARCHAR(64) DEFAULT NULL,
  `technician_id` VARCHAR(64) DEFAULT NULL,
  `status` VARCHAR(30) DEFAULT 'rascunho',
  `service_value` DECIMAL(10,2) DEFAULT 0.00,
  `dados_json` LONGTEXT NOT NULL,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE INDEX `idx_chk_guid` (`guid`),
  INDEX `idx_chk_protocol` (`protocol_number`),
  INDEX `idx_chk_customer` (`customer_id`),
  INDEX `idx_chk_technician` (`technician_id`),
  INDEX `idx_chk_status` (`status`),
  INDEX `idx_chk_atualizado` (`atualizado_em` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABELA DE AGENDAMENTOS E ORDENS DE SERVIÇO (agendamentos_ordens)
CREATE TABLE IF NOT EXISTS `agendamentos_ordens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `guid` VARCHAR(64) UNIQUE NOT NULL,
  `customer_id` VARCHAR(64) DEFAULT NULL,
  `technician_id` VARCHAR(64) DEFAULT NULL,
  `data_agendamento` VARCHAR(20) DEFAULT NULL,
  `hora_agendamento` VARCHAR(10) DEFAULT NULL,
  `status` VARCHAR(30) DEFAULT 'agendado',
  `valor_total` DECIMAL(10,2) DEFAULT 0.00,
  `dados_json` LONGTEXT NOT NULL,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE INDEX `idx_apt_guid` (`guid`),
  INDEX `idx_apt_customer` (`customer_id`),
  INDEX `idx_apt_technician` (`technician_id`),
  INDEX `idx_apt_data` (`data_agendamento`),
  INDEX `idx_apt_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABELA DE LANÇAMENTOS FINANCEIROS (financeiro_lancamentos)
CREATE TABLE IF NOT EXISTS `financeiro_lancamentos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `guid` VARCHAR(64) UNIQUE NOT NULL,
  `customer_id` VARCHAR(64) DEFAULT NULL,
  `technician_id` VARCHAR(64) DEFAULT NULL,
  `checklist_id` VARCHAR(64) DEFAULT NULL,
  `mes_referencia` VARCHAR(10) DEFAULT NULL,
  `valor_bruto` DECIMAL(10,2) DEFAULT 0.00,
  `valor_liquido` DECIMAL(10,2) DEFAULT 0.00,
  `comissao_tecnico` DECIMAL(10,2) DEFAULT 0.00,
  `status_pagamento` VARCHAR(30) DEFAULT 'pendente',
  `dados_json` LONGTEXT NOT NULL,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE INDEX `idx_fin_guid` (`guid`),
  INDEX `idx_fin_customer` (`customer_id`),
  INDEX `idx_fin_technician` (`technician_id`),
  INDEX `idx_fin_checklist` (`checklist_id`),
  INDEX `idx_fin_mes` (`mes_referencia`),
  INDEX `idx_fin_status` (`status_pagamento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABELA DE IMAGENS E ARQUIVOS FÍSICOS (imagens_arquivos)
CREATE TABLE IF NOT EXISTS `imagens_arquivos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `guid` VARCHAR(64) UNIQUE NOT NULL,
  `nome_original` VARCHAR(255) DEFAULT NULL,
  `nome_arquivo` VARCHAR(255) NOT NULL,
  `caminho_servidor` VARCHAR(500) NOT NULL,
  `url_publica` VARCHAR(500) NOT NULL,
  `tipo_mime` VARCHAR(100) DEFAULT NULL,
  `tamanho_bytes` INT DEFAULT 0,
  `usuario_id` INT DEFAULT 1,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE INDEX `idx_img_guid` (`guid`),
  INDEX `idx_img_usuario` (`usuario_id`),
  INDEX `idx_img_criado_em` (`criado_em` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SEED INICIAL: Administrador Geral Padrão
INSERT INTO `usuarios_auth` (`guid`, `nome`, `login_ou_telefone`, `email`, `senha_hash`, `role`, `ativo`)
VALUES (
  'usr_admin_master_2026',
  'Administrador Geral Elthera',
  '(47)98863-8516',
  'contato@elthera.com.br',
  'ELT2026A',
  'admin',
  1
) ON DUPLICATE KEY UPDATE `ativo` = 1;

SET FOREIGN_KEY_CHECKS = 1;
