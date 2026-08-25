<?php
/**
 * =========================================================================
 * ELTHERA PRO - API & BANCO DE DADOS AUTOMÁTICO (PHP / MySQL / PDO)
 * Suporte completo a Checklists, Cadastros, Agendamentos, Financeiro, Auditoria e Imagens
 * =========================================================================
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configurações do MySQL (HomeHost / cPanel / Localhost / GoDaddy Node.js Hosting)
// O GoDaddy injeta automaticamente as variáveis DB_HOST, DB_PORT, DB_NAME, DB_USER e DB_PASSWORD
$db_host    = getenv('DB_HOST') ?: 'localhost';
$db_port    = getenv('DB_PORT') ?: 3306;
$db_name    = getenv('DB_NAME') ?: 'elthera_db';
$db_usuario = getenv('DB_USER') ?: 'elthera_user';
// Compatibilidade: aceita DB_PASSWORD (recomendado) ou DB_PASS (antigo)
$db_senha   = getenv('DB_PASSWORD') ?: getenv('DB_PASS') ?: 'elthera_senha_segura_2026';

// Diretório de Uploads de Imagens (com ID único)
$uploadDir = __DIR__ . '/uploads';
if (!file_exists($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}

function conectarBanco($host, $port, $dbname, $usuario, $senha) {
    try {
        $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        $pdo = new PDO($dsn, $usuario, $senha, $options);
    } catch (Exception $e) {
        // Fallback local (SQLite) para permitir funcionamento offline em ambiente sem MySQL
        $sqlitePath = __DIR__ . '/elthera_local.sqlite';
        $pdo = new PDO("sqlite:" . $sqlitePath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }

    verificarECriarTabelas($pdo);
    return $pdo;
}

function verificarECriarTabelas($pdo) {
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

    if ($driver === 'sqlite') {
        // Tabela central de sincronização
        $pdo->exec("CREATE TABLE IF NOT EXISTS registros_sincronizacao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guid VARCHAR(64) UNIQUE NOT NULL,
            tipo_entidade VARCHAR(50) DEFAULT 'geral',
            usuario_id INT DEFAULT 1,
            dados_json LONGTEXT NOT NULL,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // Tabela de Checklists Técnicos
        $pdo->exec("CREATE TABLE IF NOT EXISTS checklists_laudos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guid VARCHAR(64) UNIQUE NOT NULL,
            protocol_number VARCHAR(50) NOT NULL,
            customer_id VARCHAR(64),
            technician_id VARCHAR(64),
            status VARCHAR(30) DEFAULT 'rascunho',
            service_value DECIMAL(10,2) DEFAULT 0.00,
            dados_json LONGTEXT NOT NULL,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // Tabela de Cadastros (Clientes e Técnicos)
        $pdo->exec("CREATE TABLE IF NOT EXISTS cadastros_contatos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guid VARCHAR(64) UNIQUE NOT NULL,
            tipo VARCHAR(20) DEFAULT 'cliente',
            nome VARCHAR(255) NOT NULL,
            documento VARCHAR(50),
            telefone VARCHAR(50),
            email VARCHAR(150),
            cidade VARCHAR(100),
            uf VARCHAR(10),
            dados_json LONGTEXT NOT NULL,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // Tabela de Agendamentos
        $pdo->exec("CREATE TABLE IF NOT EXISTS agendamentos_ordens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guid VARCHAR(64) UNIQUE NOT NULL,
            customer_id VARCHAR(64),
            technician_id VARCHAR(64),
            data_agendamento VARCHAR(20),
            hora_agendamento VARCHAR(10),
            status VARCHAR(30) DEFAULT 'agendado',
            valor_total DECIMAL(10,2) DEFAULT 0.00,
            dados_json LONGTEXT NOT NULL,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // Tabela de Financeiro
        $pdo->exec("CREATE TABLE IF NOT EXISTS financeiro_lancamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guid VARCHAR(64) UNIQUE NOT NULL,
            customer_id VARCHAR(64),
            technician_id VARCHAR(64),
            checklist_id VARCHAR(64),
            mes_referencia VARCHAR(10),
            valor_bruto DECIMAL(10,2) DEFAULT 0.00,
            valor_liquido DECIMAL(10,2) DEFAULT 0.00,
            comissao_tecnico DECIMAL(10,2) DEFAULT 0.00,
            status_pagamento VARCHAR(30) DEFAULT 'pendente',
            dados_json LONGTEXT NOT NULL,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // Tabela de Auditoria
        $pdo->exec("CREATE TABLE IF NOT EXISTS auditoria_historico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guid VARCHAR(64) UNIQUE NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id VARCHAR(64) NOT NULL,
            acao VARCHAR(50) NOT NULL,
            usuario VARCHAR(150) NOT NULL,
            resumo TEXT,
            dados_json LONGTEXT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // Tabela de Imagens Armazenadas no Servidor
        $pdo->exec("CREATE TABLE IF NOT EXISTS imagens_arquivos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guid VARCHAR(64) UNIQUE NOT NULL,
            nome_original VARCHAR(255),
            nome_arquivo VARCHAR(255) NOT NULL,
            caminho_servidor VARCHAR(500) NOT NULL,
            url_publica VARCHAR(500) NOT NULL,
            tipo_mime VARCHAR(100),
            tamanho_bytes INT DEFAULT 0,
            usuario_id INT DEFAULT 1,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

    } else {
        // MySQL / MariaDB
        $pdo->exec("CREATE TABLE IF NOT EXISTS registros_sincronizacao (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guid VARCHAR(64) UNIQUE NOT NULL,
            tipo_entidade VARCHAR(50) DEFAULT 'geral',
            usuario_id INT DEFAULT 1,
            dados_json LONGTEXT NOT NULL,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_tipo (tipo_entidade),
            INDEX idx_guid (guid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $pdo->exec("CREATE TABLE IF NOT EXISTS checklists_laudos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guid VARCHAR(64) UNIQUE NOT NULL,
            protocol_number VARCHAR(50) NOT NULL,
            customer_id VARCHAR(64),
            technician_id VARCHAR(64),
            status VARCHAR(30) DEFAULT 'rascunho',
            service_value DECIMAL(10,2) DEFAULT 0.00,
            dados_json LONGTEXT NOT NULL,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_customer (customer_id),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $pdo->exec("CREATE TABLE IF NOT EXISTS cadastros_contatos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guid VARCHAR(64) UNIQUE NOT NULL,
            tipo VARCHAR(20) DEFAULT 'cliente',
            nome VARCHAR(255) NOT NULL,
            documento VARCHAR(50),
            telefone VARCHAR(50),
            email VARCHAR(150),
            cidade VARCHAR(100),
            uf VARCHAR(10),
            dados_json LONGTEXT NOT NULL,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_telefone (telefone),
            INDEX idx_tipo (tipo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $pdo->exec("CREATE TABLE IF NOT EXISTS agendamentos_ordens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guid VARCHAR(64) UNIQUE NOT NULL,
            customer_id VARCHAR(64),
            technician_id VARCHAR(64),
            data_agendamento VARCHAR(20),
            hora_agendamento VARCHAR(10),
            status VARCHAR(30) DEFAULT 'agendado',
            valor_total DECIMAL(10,2) DEFAULT 0.00,
            dados_json LONGTEXT NOT NULL,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_data (data_agendamento)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $pdo->exec("CREATE TABLE IF NOT EXISTS financeiro_lancamentos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guid VARCHAR(64) UNIQUE NOT NULL,
            customer_id VARCHAR(64),
            technician_id VARCHAR(64),
            checklist_id VARCHAR(64),
            mes_referencia VARCHAR(10),
            valor_bruto DECIMAL(10,2) DEFAULT 0.00,
            valor_liquido DECIMAL(10,2) DEFAULT 0.00,
            comissao_tecnico DECIMAL(10,2) DEFAULT 0.00,
            status_pagamento VARCHAR(30) DEFAULT 'pendente',
            dados_json LONGTEXT NOT NULL,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_mes (mes_referencia)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $pdo->exec("CREATE TABLE IF NOT EXISTS auditoria_historico (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guid VARCHAR(64) UNIQUE NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id VARCHAR(64) NOT NULL,
            acao VARCHAR(50) NOT NULL,
            usuario VARCHAR(150) NOT NULL,
            usuario_id INT DEFAULT NULL,
            ip_origem VARCHAR(45) DEFAULT NULL,
            resumo TEXT,
            dados_json LONGTEXT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_entity (entity_type, entity_id),
            INDEX idx_usuario (usuario),
            INDEX idx_acao (acao),
            INDEX idx_criado_em (criado_em),
            INDEX idx_guid (guid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $pdo->exec("CREATE TABLE IF NOT EXISTS usuarios_auth (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guid VARCHAR(64) UNIQUE NOT NULL,
            nome VARCHAR(255) NOT NULL,
            login_ou_telefone VARCHAR(100) NOT NULL,
            email VARCHAR(191) DEFAULT NULL,
            senha_hash VARCHAR(255) NOT NULL,
            role ENUM('admin', 'tecnico', 'cliente') NOT NULL DEFAULT 'tecnico',
            contato_id VARCHAR(64) DEFAULT NULL,
            permissoes_json JSON DEFAULT NULL,
            ativo TINYINT(1) NOT NULL DEFAULT 1,
            ultimo_login DATETIME DEFAULT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE INDEX idx_usuario_guid (guid),
            UNIQUE INDEX idx_usuario_login (login_ou_telefone),
            INDEX idx_usuario_email (email),
            INDEX idx_usuario_role_ativo (role, ativo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $pdo->exec("CREATE TABLE IF NOT EXISTS imagens_arquivos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guid VARCHAR(64) UNIQUE NOT NULL,
            nome_original VARCHAR(255),
            nome_arquivo VARCHAR(255) NOT NULL,
            caminho_servidor VARCHAR(500) NOT NULL,
            url_publica VARCHAR(500) NOT NULL,
            tipo_mime VARCHAR(100),
            tamanho_bytes INT DEFAULT 0,
            usuario_id INT DEFAULT 1,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_guid (guid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }
}

try {
    $pdo = conectarBanco($db_host, $db_port, $db_name, $db_usuario, $db_senha);
    $metodo = $_SERVER['REQUEST_METHOD'];

    // Tratamento de Imagens Servidas / Visualizadas
    if ($metodo === 'GET' && isset($_GET['view_image'])) {
        $imgName = basename($_GET['view_image']);
        $filePath = $uploadDir . '/' . $imgName;
        if (file_exists($filePath)) {
            $mime = mime_content_type($filePath) ?: 'image/jpeg';
            header("Content-Type: " . $mime);
            header("Content-Length: " . filesize($filePath));
            readfile($filePath);
            exit;
        } else {
            http_response_code(404);
            header("Content-Type: application/json; charset=UTF-8");
            echo json_encode(['success' => false, 'message' => 'Imagem não encontrada no servidor']);
            exit;
        }
    }

    header("Content-Type: application/json; charset=UTF-8");

    // Upload direto de imagem (Multipart ou Base64)
    if ($metodo === 'POST' && (isset($_GET['action']) && $_GET['action'] === 'upload_image' || isset($_FILES['imagem']) || isset($_FILES['file']))) {
        $file = $_FILES['imagem'] ?? $_FILES['file'] ?? null;
        $guid = $_POST['guid'] ?? $_POST['id'] ?? ('img_' . date('Ymd_His') . '_' . bin2hex(random_bytes(6)));
        $usuario_id = (int)($_POST['usuario_id'] ?? 1);
        $originalName = 'foto.jpg';
        $ext = 'jpg';

        if ($file && isset($file['tmp_name']) && is_uploaded_file($file['tmp_name'])) {
            $originalName = basename($file['name']);
            $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION)) ?: 'jpg';
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'])) {
                $ext = 'jpg';
            }
            $uniqueFilename = $guid . '.' . $ext;
            $destination = $uploadDir . '/' . $uniqueFilename;

            if (move_uploaded_file($file['tmp_name'], $destination)) {
                $size = filesize($destination);
                $mime = mime_content_type($destination) ?: 'image/' . $ext;
                $publicUrl = 'api.php?view_image=' . urlencode($uniqueFilename);

                // Salva no banco de dados
                $stmt = $pdo->prepare(""
                    INSERT INTO imagens_arquivos (guid, nome_original, nome_arquivo, caminho_servidor, url_publica, tipo_mime, tamanho_bytes, usuario_id)
                    VALUES (:guid, :original, :arquivo, :caminho, :url, :mime, :tamanho, :usuario)
                """);
                $stmt->execute([
                    ':guid' => $guid,
                    ':original' => $originalName,
                    ':arquivo' => $uniqueFilename,
                    ':caminho' => $destination,
                    ':url' => $publicUrl,
                    ':mime' => $mime,
                    ':tamanho' => $size,
                    ':usuario' => $usuario_id
                ]);

                echo json_encode([
                    'success' => true,
                    'message' => 'Imagem salva no servidor com ID único e registrada no banco.',
                    'imageId' => $guid,
                    'filename' => $uniqueFilename,
                    'url' => $publicUrl,
                    'size' => $size
                ]);
                exit;
            }
        }
    }

    // Processamento POST (Sincronização em lote ou snapshot)
    if ($metodo === 'POST') {
        $rawInput = file_get_contents('php://input');
        $payload = json_decode($rawInput, true);

        if (!$payload) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'JSON inválido enviado ao servidor PHP']);
            exit;
        }

        // Suporte a upload de imagem em formato Base64 via JSON
        if (isset($payload['action']) && $payload['action'] === 'upload_image' && !empty($payload['imagem_base64'])) {
            $base64 = $payload['imagem_base64'];
            $guid = $payload['guid'] ?? ('img_' . date('Ymd_His') . '_' . bin2hex(random_bytes(6)));
            $originalName = $payload['nome_original'] ?? 'foto.jpg';
            $ext = 'jpg';

            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $typeMatch)) {
                $ext = strtolower($typeMatch[1]) === 'jpeg' ? 'jpg' : strtolower($typeMatch[1]);
                $base64 = substr($base64, strpos($base64, ',') + 1);
            }

            $imgData = base64_decode($base64);
            if ($imgData !== false) {
                $uniqueFilename = $guid . '.' . $ext;
                $destination = $uploadDir . '/' . $uniqueFilename;
                file_put_contents($destination, $imgData);
                $size = strlen($imgData);
                $mime = 'image/' . ($ext === 'jpg' ? 'jpeg' : $ext);
                $publicUrl = 'api.php?view_image=' . urlencode($uniqueFilename);

                $stmt = $pdo->prepare(""
                    INSERT INTO imagens_arquivos (guid, nome_original, nome_arquivo, caminho_servidor, url_publica, tipo_mime, tamanho_bytes, usuario_id)
                    VALUES (:guid, :original, :arquivo, :caminho, :url, :mime, :tamanho, :usuario)
                """);
                $stmt->execute([
                    ':guid' => $guid,
                    ':original' => $originalName,
                    ':arquivo' => $uniqueFilename,
                    ':caminho' => $destination,
                    ':url' => $publicUrl,
                    ':mime' => $mime,
                    ':tamanho' => $size,
                    ':usuario' => (int)($payload['usuario_id'] ?? 1)
                ]);

                echo json_encode([
                    'success' => true,
                    'message' => 'Imagem Base64 convertida e gravada fisicamente no servidor com ID único.',
                    'imageId' => $guid,
                    'filename' => $uniqueFilename,
                    'url' => $publicUrl,
                    'size' => $size
                ]);
                exit;
            }
        }

        $itens = $payload['lote'] ?? $payload['itens'] ?? $payload['queue'] ?? $payload['items'] ?? null;

        // Se for snapshot completo enviado
        if (!$itens && isset($payload['snapshot'])) {
            $snap = $payload['snapshot'];
            $itens = [];
            if (!empty($snap['contacts'])) {
                foreach ($snap['contacts'] as $c) $itens[] = ['tipo_entidade' => 'contact', 'dados' => $c, 'guid' => $c['guid'] ?? $c['id']];
            }
            if (!empty($snap['checklists'])) {
                foreach ($snap['checklists'] as $k) $itens[] = ['tipo_entidade' => 'checklist', 'dados' => $k, 'guid' => $k['guid'] ?? $k['id']];
            }
            if (!empty($snap['appointments'])) {
                foreach ($snap['appointments'] as $a) $itens[] = ['tipo_entidade' => 'appointment', 'dados' => $a, 'guid' => $a['guid'] ?? $a['id']];
            }
            if (!empty($snap['financials'])) {
                foreach ($snap['financials'] as $f) $itens[] = ['tipo_entidade' => 'financial', 'dados' => $f, 'guid' => $f['guid'] ?? $f['id']];
            }
        }

        if (!is_array($itens)) {
            $itens = [$payload];
        }

        $usuario_id = $payload['usuario_id'] ?? $payload['userId'] ?? 1;
        $mapeamento = [];

        $pdo->beginTransaction();

        foreach ($itens as $item) {
            $guid = $item['guid'] ?? $item['id'] ?? ($item['dados']['guid'] ?? $item['dados']['id'] ?? null);
            if (!$guid) continue;

            $tipo_entidade = $item['tipo_entidade'] ?? $item['type'] ?? 'geral';
            $dados = $item['dados'] ?? $item['data'] ?? $item;
            $dados_json = is_string($item['dados_json'] ?? null) 
                ? $item['dados_json'] 
                : json_encode($dados, JSON_UNESCAPED_UNICODE);

            $itemUsuarioId = $item['usuario_id'] ?? $usuario_id;

            // 1. Tabela central de sincronização
            $checkStmt = $pdo->prepare("SELECT id FROM registros_sincronizacao WHERE guid = :guid LIMIT 1");
            $checkStmt->execute([':guid' => $guid]);
            $registroExistente = $checkStmt->fetch();

            if ($registroExistente) {
                $idBanco = (int)$registroExistente['id'];
                $updateStmt = $pdo->prepare(""
                    UPDATE registros_sincronizacao 
                    SET dados_json = :dados_json, tipo_entidade = :tipo, usuario_id = :usuario_id, atualizado_em = CURRENT_TIMESTAMP
                    WHERE id = :id
                """);
                $updateStmt->execute([
                    ':dados_json' => $dados_json,
                    ':tipo' => $tipo_entidade,
                    ':usuario_id' => $itemUsuarioId,
                    ':id' => $idBanco
                ]);

                $mapeamento[] = ['guid' => $guid, 'id_banco' => $idBanco, 'tipo' => $tipo_entidade, 'status' => 'atualizado'];
            } else {
                $insertStmt = $pdo->prepare(""
                    INSERT INTO registros_sincronizacao (guid, tipo_entidade, usuario_id, dados_json, atualizado_em)
                    VALUES (:guid, :tipo, :usuario_id, :dados_json, CURRENT_TIMESTAMP)
                """);
                $insertStmt->execute([
                    ':guid' => $guid,
                    ':tipo' => $tipo_entidade,
                    ':usuario_id' => $itemUsuarioId,
                    ':dados_json' => $dados_json
                ]);

                $idBanco = (int)$pdo->lastInsertId();
                $mapeamento[] = ['guid' => $guid, 'id_banco' => $idBanco, 'tipo' => $tipo_entidade, 'status' => 'inserido'];
            }

            // 2. Persistência especializada por tipo de entidade
            $d = is_array($dados) ? $dados : json_decode($dados_json, true);

            if ($tipo_entidade === 'checklist' && is_array($d)) {
                $chkStmt = $pdo->prepare(""
                    INSERT INTO checklists_laudos (guid, protocol_number, customer_id, technician_id, status, service_value, dados_json)
                    VALUES (:guid, :proto, :cust, :tech, :stat, :val, :dados)
                    ON DUPLICATE KEY UPDATE protocol_number = :proto, customer_id = :cust, technician_id = :tech, status = :stat, service_value = :val, dados_json = :dados
                """);
                try {
                    $chkStmt->execute([
                        ':guid' => $guid,
                        ':proto' => $d['protocolNumber'] ?? 'SOL-AUTO',
                        ':cust' => $d['customerId'] ?? '',
                        ':tech' => $d['technicianId'] ?? '',
                        ':stat' => $d['status'] ?? 'rascunho',
                        ':val' => (float)($d['serviceValue'] ?? 0),
                        ':dados' => $dados_json
                    ]);
                } catch (Exception $e) {
                    // Fallback para SQLite
                    $delStmt = $pdo->prepare("DELETE FROM checklists_laudos WHERE guid = :guid");
                    $delStmt->execute([':guid' => $guid]);
                    $insStmt = $pdo->prepare("INSERT INTO checklists_laudos (guid, protocol_number, customer_id, technician_id, status, service_value, dados_json) VALUES (:guid, :proto, :cust, :tech, :stat, :val, :dados)");
                    $insStmt->execute([
                        ':guid' => $guid,
                        ':proto' => $d['protocolNumber'] ?? 'SOL-AUTO',
                        ':cust' => $d['customerId'] ?? '',
                        ':tech' => $d['technicianId'] ?? '',
                        ':stat' => $d['status'] ?? 'rascunho',
                        ':val' => (float)($d['serviceValue'] ?? 0),
                        ':dados' => $dados_json
                    ]);
                }
            } elseif ($tipo_entidade === 'contact' && is_array($d)) {
                $tipoContato = !empty($d['isTechnician']) ? 'tecnico' : 'cliente';
                $conStmt = $pdo->prepare(""
                    INSERT INTO cadastros_contatos (guid, tipo, nome, documento, telefone, email, cidade, uf, dados_json)
                    VALUES (:guid, :tipo, :nome, :doc, :tel, :email, :cidade, :uf, :dados)
                    ON DUPLICATE KEY UPDATE tipo = :tipo, nome = :nome, documento = :doc, telefone = :tel, email = :email, cidade = :cidade, uf = :uf, dados_json = :dados
                """);
                try {
                    $conStmt->execute([
                        ':guid' => $guid,
                        ':tipo' => $tipoContato,
                        ':nome' => $d['name'] ?? '',
                        ':doc' => $d['document'] ?? '',
                        ':tel' => $d['phone'] ?? '',
                        ':email' => $d['email'] ?? '',
                        ':cidade' => $d['address']['city'] ?? '',
                        ':uf' => $d['address']['state'] ?? '',
                        ':dados' => $dados_json
                    ]);
                } catch (Exception $e) {
                    $delStmt = $pdo->prepare("DELETE FROM cadastros_contatos WHERE guid = :guid");
                    $delStmt->execute([':guid' => $guid]);
                    $insStmt = $pdo->prepare("INSERT INTO cadastros_contatos (guid, tipo, nome, documento, telefone, email, cidade, uf, dados_json) VALUES (:guid, :tipo, :nome, :doc, :tel, :email, :cidade, :uf, :dados)");
                    $insStmt->execute([
                        ':guid' => $guid,
                        ':tipo' => $tipoContato,
                        ':nome' => $d['name'] ?? '',
                        ':doc' => $d['document'] ?? '',
                        ':tel' => $d['phone'] ?? '',
                        ':email' => $d['email'] ?? '',
                        ':cidade' => $d['address']['city'] ?? '',
                        ':uf' => $d['address']['state'] ?? '',
                        ':dados' => $dados_json
                    ]);
                }
            } elseif ($tipo_entidade === 'appointment' && is_array($d)) {
                $aptStmt = $pdo->prepare(""
                    INSERT INTO agendamentos_ordens (guid, customer_id, technician_id, data_agendamento, hora_agendamento, status, valor_total, dados_json)
                    VALUES (:guid, :cust, :tech, :data, :hora, :stat, :val, :dados)
                    ON DUPLICATE KEY UPDATE customer_id = :cust, technician_id = :tech, data_agendamento = :data, hora_agendamento = :hora, status = :stat, valor_total = :val, dados_json = :dados
                """);
                try {
                    $aptStmt->execute([
                        ':guid' => $guid,
                        ':cust' => $d['customerId'] ?? '',
                        ':tech' => $d['technicianId'] ?? '',
                        ':data' => $d['scheduledDate'] ?? '',
                        ':hora' => $d['scheduledTime'] ?? '',
                        ':stat' => $d['status'] ?? 'agendado',
                        ':val' => (float)($d['totalAmount'] ?? 0),
                        ':dados' => $dados_json
                    ]);
                } catch (Exception $e) {
                    $delStmt = $pdo->prepare("DELETE FROM agendamentos_ordens WHERE guid = :guid");
                    $delStmt->execute([':guid' => $guid]);
                    $insStmt = $pdo->prepare("INSERT INTO agendamentos_ordens (guid, customer_id, technician_id, data_agendamento, hora_agendamento, status, valor_total, dados_json) VALUES (:guid, :cust, :tech, :data, :hora, :stat, :val, :dados)");
                    $insStmt->execute([
                        ':guid' => $guid,
                        ':cust' => $d['customerId'] ?? '',
                        ':tech' => $d['technicianId'] ?? '',
                        ':data' => $d['scheduledDate'] ?? '',
                        ':hora' => $d['scheduledTime'] ?? '',
                        ':stat' => $d['status'] ?? 'agendado',
                        ':val' => (float)($d['totalAmount'] ?? 0),
                        ':dados' => $dados_json
                    ]);
                }
            } elseif ($tipo_entidade === 'financial' && is_array($d)) {
                $finStmt = $pdo->prepare(""
                    INSERT INTO financeiro_lancamentos (guid, customer_id, technician_id, checklist_id, mes_referencia, valor_bruto, valor_liquido, comissao_tecnico, status_pagamento, dados_json)
                    VALUES (:guid, :cust, :tech, :chk, :mes, :vbruto, :vliq, :comissao, :stat, :dados)
                    ON DUPLICATE KEY UPDATE customer_id = :cust, technician_id = :tech, checklist_id = :chk, mes_referencia = :mes, valor_bruto = :vbruto, valor_liquido = :vliq, comissao_tecnico = :comissao, status_pagamento = :stat, dados_json = :dados
                """);
                try {
                    $finStmt->execute([
                        ':guid' => $guid,
                        ':cust' => $d['customerId'] ?? '',
                        ':tech' => $d['technicianId'] ?? '',
                        ':chk' => $d['checklistId'] ?? '',
                        ':mes' => $d['month'] ?? date('Y-m'),
                        ':vbruto' => (float)($d['grossAmount'] ?? 0),
                        ':vliq' => (float)($d['netAmount'] ?? 0),
                        ':comissao' => (float)($d['technicianCommission'] ?? 0),
                        ':stat' => $d['paymentStatus'] ?? 'pendente',
                        ':dados' => $dados_json
                    ]);
                } catch (Exception $e) {
                    $delStmt = $pdo->prepare("DELETE FROM financeiro_lancamentos WHERE guid = :guid");
                    $delStmt->execute([':guid' => $guid]);
                    $insStmt = $pdo->prepare("INSERT INTO financeiro_lancamentos (guid, customer_id, technician_id, checklist_id, mes_referencia, valor_bruto, valor_liquido, comissao_tecnico, status_pagamento, dados_json) VALUES (:guid, :cust, :tech, :chk, :mes, :vbruto, :vliq, :comissao, :stat, :dados)");
                    $insStmt->execute([
                        ':guid' => $guid,
                        ':cust' => $d['customerId'] ?? '',
                        ':tech' => $d['technicianId'] ?? '',
                        ':chk' => $d['checklistId'] ?? '',
                        ':mes' => $d['month'] ?? date('Y-m'),
                        ':vbruto' => (float)($d['grossAmount'] ?? 0),
                        ':vliq' => (float)($d['netAmount'] ?? 0),
                        ':comissao' => (float)($d['technicianCommission'] ?? 0),
                        ':stat' => $d['paymentStatus'] ?? 'pendente',
                        ':dados' => $dados_json
                    ]);
                }
            } elseif ($tipo_entidade === 'audit_log' && is_array($d)) {
                $audStmt = $pdo->prepare(""
                    INSERT INTO auditoria_historico (guid, entity_type, entity_id, acao, usuario, resumo, dados_json)
                    VALUES (:guid, :ent_type, :ent_id, :acao, :usuario, :resumo, :dados)
                """);
                $audStmt->execute([
                    ':guid' => $guid,
                    ':ent_type' => $d['entityType'] ?? 'geral',
                    ':ent_id' => $d['entityId'] ?? '',
                    ':acao' => $d['action'] ?? 'Edição',
                    ':usuario' => $d['user'] ?? 'Sistema',
                    ':resumo' => $d['summary'] ?? '',
                    ':dados' => $dados_json
                ]);
            }
        }

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Lote com Checklists, Cadastros, Agenda, Financeiro e Auditoria consolidado no Banco de Dados.',
            'total_processados' => count($mapeamento),
            'itemsProcessed' => count($mapeamento),
            'mapeamento' => $mapeamento,
            'servidor_timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }

    // Consulta GET - Estatísticas e Dados Consolidados
    if ($metodo === 'GET') {
        $stats = [
            'total_checklists' => (int)$pdo->query("SELECT COUNT(*) FROM checklists_laudos")->fetchColumn(),
            'total_cadastros' => (int)$pdo->query("SELECT COUNT(*) FROM cadastros_contatos")->fetchColumn(),
            'total_agendamentos' => (int)$pdo->query("SELECT COUNT(*) FROM agendamentos_ordens")->fetchColumn(),
            'total_financeiro' => (int)$pdo->query("SELECT COUNT(*) FROM financeiro_lancamentos")->fetchColumn(),
            'total_auditoria' => (int)$pdo->query("SELECT COUNT(*) FROM auditoria_historico")->fetchColumn(),
            'total_imagens' => (int)$pdo->query("SELECT COUNT(*) FROM imagens_arquivos")->fetchColumn(),
        ];

        $stmt = $pdo->query("SELECT id as id_banco, guid, tipo_entidade, usuario_id, dados_json, atualizado_em FROM registros_sincronizacao ORDER BY id DESC LIMIT 100");
        $registros = $stmt->fetchAll();

        foreach ($registros as &$reg) {
            $reg['dados'] = json_decode($reg['dados_json'], true);
        }

        echo json_encode([
            'success' => true,
            'banco_instalado' => true,
            'driver' => $pdo->getAttribute(PDO::ATTR_DRIVER_NAME),
            'estatisticas' => $stats,
            'total' => count($registros),
            'registros' => $registros
        ]);
        exit;
    }

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Erro na API PHP: ' . $e->getMessage()
    ]);
}
