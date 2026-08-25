# Elthera Pro - MySQL Database Architecture & Migration Guide

## 1. Visão Geral da Arquitetura de Dados

O banco de dados do **Elthera Pro** foi projetado para ambientes de alta performance e resiliência (**GoDaddy Node.js Hosting**, **cPanel MySQL 8.0+**, **MariaDB 10.4+** e **Offline-First PWA**).

A estrutura combina tabelas relacionais especializadas com armazenamento flexível em JSON, permitindo sincronização em lote sem bloqueios e indexação em campos de busca frequente (autenticação, auditoria, protocolos, clientes e datas).

---

## 2. Estrutura das Tabelas e Índices

### 2.1. `usuarios_auth` (Autenticação Multi-Role e Controle de Acesso)
Gerencia os usuários do sistema com suporte a 3 perfis principais (**Admin**, **Técnico** e **Cliente**).

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `INT AUTO_INCREMENT PRIMARY KEY` | Identificador interno sequencial |
| `guid` | `VARCHAR(64) UNIQUE NOT NULL` | Identificador único universal (UUID v4) |
| `nome` | `VARCHAR(255) NOT NULL` | Nome completo do usuário |
| `login_ou_telefone` | `VARCHAR(100) UNIQUE NOT NULL` | Login, telefone formatado ou WhatsApp |
| `email` | `VARCHAR(191) NULL` | E-mail do usuário |
| `senha_hash` | `VARCHAR(255) NOT NULL` | Hash da senha de acesso |
| `role` | `ENUM('admin', 'tecnico', 'cliente')` | Papel de acesso no sistema |
| `contato_id` | `VARCHAR(64) NULL` | Vínculo com registro em `cadastros_contatos` |
| `permissoes_json` | `JSON NULL` | Permissões customizadas de abas e botões |
| `ativo` | `TINYINT(1) DEFAULT 1` | 1 para ativo, 0 para inativo/bloqueado |
| `ultimo_login` | `DATETIME NULL` | Data/hora do último acesso registrado |
| `criado_em` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` | Data de criação |
| `atualizado_em` | `TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Data da última atualização |

**Índices Aplicados:**
* `UNIQUE INDEX idx_usuario_guid (guid)`: Busca rápida por UUID.
* `UNIQUE INDEX idx_usuario_login (login_ou_telefone)`: Autenticação instantânea por login/telefone.
* `INDEX idx_usuario_email (email)`: Recuperação de senha e busca por e-mail.
* `INDEX idx_usuario_role_ativo (role, ativo)`: Filtragem rápida de usuários ativos por papel.

---

### 2.2. `auditoria_historico` (Trilha de Auditoria e Segurança)
Registra todas as ações críticas executadas no aplicativo (criação, edição, exclusão, visualização, assinaturas digitais e sincronizações).

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `INT AUTO_INCREMENT PRIMARY KEY` | Identificador sequencial do log |
| `guid` | `VARCHAR(64) UNIQUE NOT NULL` | UUID único do evento |
| `entity_type` | `VARCHAR(50) NOT NULL` | Tipo da entidade (`checklist`, `contact`, `financial`, `auth`, `settings`) |
| `entity_id` | `VARCHAR(64) NOT NULL` | ID da entidade afetada |
| `acao` | `VARCHAR(50) NOT NULL` | Ação executada (`Criação`, `Edição`, `Exclusão`, `Assinatura`, etc.) |
| `usuario` | `VARCHAR(150) NOT NULL` | Nome ou login do usuário responsável |
| `usuario_id` | `INT NULL` | ID numérico do usuário |
| `ip_origem` | `VARCHAR(45) NULL` | Endereço IP do cliente |
| `resumo` | `TEXT NULL` | Descrição resumida da operação |
| `dados_json` | `LONGTEXT NULL` | Snapshot dos dados anteriores/posteriores à alteração |
| `criado_em` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` | Data/hora exata do evento |

**Índices Aplicados:**
* `INDEX idx_audit_entity (entity_type, entity_id)`: Histórico completo de um checklist ou cliente específico.
* `INDEX idx_audit_usuario (usuario)`: Rastreamento de atividades por operador.
* `INDEX idx_audit_acao (acao)`: Filtro por tipo de operação (ex: exclusões ou assinaturas).
* `INDEX idx_audit_criado_em (criado_em DESC)`: Ordenação cronológica invertida de alta velocidade.
* `INDEX idx_audit_composite (entity_type, acao, criado_em)`: Consultas avançadas de filtros combinados.

---

### 2.3. `checklists_laudos` (Laudos Técnicos e Vistorias Solares)
Armazena os dados técnicos completos de inspeção, medições elétricas (kW/kWh), sujidade, fotos e assinaturas digitais.

**Índices Aplicados:**
* `INDEX idx_chk_protocol (protocol_number)`: Localização imediata por número de protocolo (ex: `SOL-2026-0042`).
* `INDEX idx_chk_customer (customer_id)`: Consulta de laudos por cliente.
* `INDEX idx_chk_technician (technician_id)`: Consulta de laudos por técnico responsável.
* `INDEX idx_chk_status (status)`: Filtro por status (`rascunho`, `concluido`, `cancelado`).
* `INDEX idx_chk_atualizado (atualizado_em DESC)`: Listagem dos laudos mais recentes.

---

### 2.4. `cadastros_contatos` (Clientes e Equipe Técnica)
Armazena dados cadastrais, endereço com geolocalização e especificações da usina solar.

**Índices Aplicados:**
* `INDEX idx_contato_tipo (tipo)`: Separação rápida entre clientes e técnicos.
* `INDEX idx_contato_telefone (telefone)`: Busca rápida por número de WhatsApp.
* `INDEX idx_contato_doc (documento)`: Busca por CPF ou CNPJ.
* `INDEX idx_contato_cidade_uf (cidade, uf)`: Relatórios e agrupamento regional.

---

### 2.5. `agendamentos_ordens` (Agendamentos e Ordens de Serviço)
Controla o calendário e visitas em campo.

**Índices Aplicados:**
* `INDEX idx_apt_customer (customer_id)`
* `INDEX idx_apt_technician (technician_id)`
* `INDEX idx_apt_data (data_agendamento)`: Filtro por dia, semana ou mês na agenda.
* `INDEX idx_apt_status (status)`

---

### 2.6. `financeiro_lancamentos` (Fluxo de Caixa, Despesas e Comissões)
Controla os valores brutos, comissões técnicas, materiais/despesas e status de pagamento.

**Índices Aplicados:**
* `INDEX idx_fin_customer (customer_id)`
* `INDEX idx_fin_technician (technician_id)`
* `INDEX idx_fin_checklist (checklist_id)`: Vínculo direto com o laudo técnico.
* `INDEX idx_fin_mes (mes_referencia)`: Agrupamento mensal de faturamento (ex: `2026-08`).
* `INDEX idx_fin_status (status_pagamento)`: Filtro de pendentes vs pagos.

---

### 2.7. `imagens_arquivos` (Fotos e Arquivos Físicos com ID Único)
Mapeia os arquivos salvos fisicamente na pasta `uploads/` do servidor.

**Índices Aplicados:**
* `UNIQUE INDEX idx_img_guid (guid)`: Localização da foto pelo identificador exclusivo.
* `INDEX idx_img_usuario (usuario_id)`: Rastreamento de quem enviou o arquivo.
* `INDEX idx_img_criado_em (criado_em DESC)`

---

### 2.8. `registros_sincronizacao` (Fila Offline-First PWA)
Buffer central para consolidação em lote e resolução de concorrência.

**Índices Aplicados:**
* `UNIQUE INDEX idx_sync_guid (guid)`
* `INDEX idx_sync_tipo (tipo_entidade)`
* `INDEX idx_sync_usuario (usuario_id)`

---

## 3. Como Executar a Migração no GoDaddy / cPanel

### Método 1: Execução Automática (Recomendado)
Ao acessar o aplicativo ou disparar uma chamada para `/start/api/api.php`, o sistema verifica a existência de todas as tabelas e cria automaticamente os schemas e índices faltantes sem necessidade de intervenção manual.

### Método 2: Execução Manual via phpMyAdmin no GoDaddy
1. Acesse o **cPanel** do GoDaddy e clique em **phpMyAdmin**.
2. Selecione o banco de dados do projeto (ex: `elthera_db`).
3. Clique na aba **SQL** (ou **Importar**).
4. Copie e cole todo o conteúdo do arquivo `database/schema_migration.sql` (ou `start/api/migration.sql`).
5. Clique em **Executar** (*Go*).

### Método 3: Execução via Linha de Comando (SSH)
```bash
mysql -u seu_usuario -p seubanco_db < database/schema_migration.sql
```

---

## 4. Verificação de Integridade

Para verificar se todos os índices foram criados corretamente no MySQL:

```sql
SHOW INDEX FROM usuarios_auth;
SHOW INDEX FROM auditoria_historico;
SHOW INDEX FROM checklists_laudos;
```
