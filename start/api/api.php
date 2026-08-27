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

// Flag para rastrear se estamos usando MySQL real ou SQLite fallback
$usando_mysql_real = false;

function conectarBanco($host, $port, $dbname, $usuario, $senha) {
    global $usando_mysql_real;
    
    try {
        $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        $pdo = new PDO($dsn, $usuario, $senha, $options);
        $usando_mysql_real = true;
    } catch (Exception $e) {
        // Fallback local (SQLite) para permitir funcionamento offline em ambiente sem MySQL
        $usando_mysql_real = false;
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

// ===== NOVO: HEALTH CHECK ENDPOINT =====
// Verifica se o banco está conectado e respondendo corretamente
function handleHealthCheck($pdo) {
    global $usando_mysql_real;
    
    header("Content-Type: application/json; charset=UTF-8");
    
    try {
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        
        if ($driver === 'mysql') {
            // Testa conexão real com MySQL
            $result = $pdo->query("SELECT 1")->fetch();
            if (!$result) {
                throw new Exception("MySQL respondeu mas sem resultado válido");
            }
            
            echo json_encode([
                'success' => true,
                'status' => 'connected',
                'driver' => 'MySQL',
                'usando_mysql_real' => true,
                'host' => getenv('DB_HOST') ?: 'localhost',
                'database' => getenv('DB_NAME') ?: 'elthera_db',
                'timestamp' => date('Y-m-d H:i:s'),
                'message' => 'Conexão MySQL ativa e sincronização pronta'
            ]);
        } else {
            // SQLite fallback
            echo json_encode([
                'success' => true,
                'status' => 'fallback',
                'driver' => 'SQLite',
                'usando_mysql_real' => false,
                'database' => __DIR__ . '/elthera_local.sqlite',
                'timestamp' => date('Y-m-d H:i:s'),
                'message' => 'Usando SQLite offline. MySQL não está disponível. Configure DB_HOST, DB_USER e DB_PASSWORD.'
            ]);
        }
    } catch (Exception $e) {
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'status' => 'error',
            'message' => 'Banco de dados indisponível: ' . $e->getMessage(),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    exit;
}

try {
    $pdo = conectarBanco($db_host, $db_port, $db_name, $db_usuario, $db_senha);
    $metodo = $_SERVER['REQUEST_METHOD'];

    // ===== NOVO: ROTA DE HEALTH CHECK =====
    if ($metodo === 'GET' && (isset($_GET['health']) || isset($_GET['check']) || isset($_GET['status']))) {
        handleHealthCheck($pdo);
    }

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
                $stmt = $pdo->prepare("
                    INSERT INTO imagens_arquivos (guid, nome_original, nome_arquivo, caminho_servidor, url_publica, tipo_mime, tamanho_bytes, usuario_id)
                    VALUES (:guid, :original, :arquivo, :caminho, :url, :mime, :tamanho, :usuario)
                ");
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

                // ===== NOVO: Validação pós-inserção =====
                $verifyStmt = $pdo->prepare("SELECT id FROM imagens_arquivos WHERE guid = :guid LIMIT 1");
                $verifyStmt->execute([':guid' => $guid]);
                $verificacao = $verifyStmt->fetch();

                if ($verificacao) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'Imagem salva no servidor com ID único e registrada no banco.',
                        'imageId' => $guid,
                        'filename' => $uniqueFilename,
                        'url' => $publicUrl,
                        'size' => $size,
                        'database_confirmed' => true,
                        'db_id' => $verificacao['id'],
                        'banco_tipo' => $usando_mysql_real ? 'MySQL Real' : 'SQLite Fallback'
                    ]);
                } else {
                    throw new Exception('Falha na validação pós-inserção: imagem não foi confirmada no banco');
                }
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

        // ===== NOVO: Endpoint de Login e Autenticação no PHP / MySQL =====
        if ((isset($_GET['action']) && $_GET['action'] === 'login') || (isset($payload['action']) && $payload['action'] === 'login') || isset($payload['phone']) || isset($payload['telefone'])) {
            $inputPhone = $payload['phone'] ?? $payload['telefone'] ?? $payload['login'] ?? '';
            $inputPass  = $payload['password'] ?? $payload['senha'] ?? '';
            $cleanPhone = preg_replace('/\D/', '', $inputPhone);
            $cleanPass  = trim($inputPass);

            // 1. Verificação do Usuário Master / Administrador Geral (Exclusivo do Servidor)
            $masterPhoneClean = '47988638516';
            $masterPassword = getenv('ADMIN_PASSWORD') ?: 'ELT2026A';

            if (($cleanPhone === $masterPhoneClean || strtolower($inputPhone) === 'admin' || $inputPhone === '(47) 98863-8516' || $inputPhone === '(47)98863-8516') && $cleanPass === $masterPassword) {
                $session = [
                    'id' => 'usr-admin-master',
                    'name' => 'Administrador Geral Elthera',
                    'phone' => '(47) 98863-8516',
                    'role' => 'admin',
                    'isAdmin' => true,
                    'isPartner' => false,
                    'isTechnician' => false,
                    'allowedNavTabs' => ['geral', 'cliente', 'checklist', 'agenda', 'financeiro', 'contatos'],
                    'loginTimestamp' => date('c'),
                    'token' => 'auth_php_master_' . bin2hex(random_bytes(8))
                ];

                echo json_encode([
                    'success' => true,
                    'message' => 'Autenticado com privilégios de Administrador Geral.',
                    'session' => $session,
                    'banco_tipo' => $usando_mysql_real ? 'MySQL Real' : 'SQLite Fallback'
                ]);
                exit;
            }

            // 2. Consulta no Banco de Dados (cadastros_contatos ou registros_sincronizacao)
            $matchedContact = null;
            $contactData = null;

            try {
                $stmt = $pdo->prepare("SELECT guid, tipo, nome, documento, telefone, email, dados_json FROM cadastros_contatos WHERE telefone LIKE :phone OR telefone = :rawPhone LIMIT 10");
                $stmt->execute([
                    ':phone' => '%' . substr($cleanPhone, -8),
                    ':rawPhone' => $inputPhone
                ]);
                $contatos = $stmt->fetchAll();

                foreach ($contatos as $c) {
                    $dados = json_decode($c['dados_json'], true) ?: [];
                    $phoneClean = preg_replace('/\D/', '', $c['telefone'] ?: ($dados['phone'] ?? ''));
                    if ($phoneClean === $cleanPhone || (strlen($cleanPhone) >= 8 && substr($phoneClean, -8) === substr($cleanPhone, -8))) {
                        $matchedContact = $c;
                        $contactData = $dados;
                        break;
                    }
                }

                if (!$matchedContact) {
                    $stmtSync = $pdo->prepare("SELECT guid, dados_json FROM registros_sincronizacao WHERE tipo_entidade = 'contact' ORDER BY id DESC LIMIT 100");
                    $stmtSync->execute();
                    $syncRows = $stmtSync->fetchAll();
                    foreach ($syncRows as $sr) {
                        $dados = json_decode($sr['dados_json'], true) ?: [];
                        $phoneClean = preg_replace('/\D/', '', $dados['phone'] ?? $dados['telefone'] ?? '');
                        if ($phoneClean === $cleanPhone || (strlen($cleanPhone) >= 8 && substr($phoneClean, -8) === substr($cleanPhone, -8))) {
                            $matchedContact = ['guid' => $sr['guid'], 'nome' => $dados['name'] ?? 'Contato', 'telefone' => $dados['phone'] ?? $cleanPhone];
                            $contactData = $dados;
                            break;
                        }
                    }
                }
            } catch (Exception $e) {
                // Erro de consulta
            }

            if (!$matchedContact) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'message' => 'Telefone não localizado no cadastro. Verifique o número informado ou contate o administrador.'
                ]);
                exit;
            }

            $contactPassword = $contactData['password'] ?? $matchedContact['password'] ?? '';
            if (empty($contactPassword)) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'message' => 'Este usuário ainda não possui senha cadastrada. Solicite o cadastro de senha ao administrador.'
                ]);
                exit;
            }

            if ($contactPassword !== $cleanPass) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'message' => 'Senha incorreta. A senha é composta por 8 dígitos alfanuméricos.'
                ]);
                exit;
            }

            $isAdmin = !empty($contactData['isAdmin']) || !empty($matchedContact['isAdmin']);
            $isPartner = !empty($contactData['isPartner']) || !empty($matchedContact['isPartner']);
            $isTechnician = !empty($contactData['isTechnician']) || ($matchedContact['tipo'] ?? '') === 'tecnico';

            $defaultTabs = $isAdmin 
                ? ['geral', 'cliente', 'checklist', 'agenda', 'financeiro', 'contatos']
                : ($isTechnician ? ['checklist', 'agenda', 'cliente'] : ['cliente']);

            $allowedTabs = $isAdmin
                ? ['geral', 'cliente', 'checklist', 'agenda', 'financeiro', 'contatos']
                : ((!empty($contactData['allowedNavTabs']) && is_array($contactData['allowedNavTabs']))
                    ? $contactData['allowedNavTabs']
                    : $defaultTabs);

            $role = $isAdmin ? 'admin' : ($isTechnician ? 'technician' : 'client');

            $session = [
                'id' => $matchedContact['guid'] ?? $matchedContact['id'] ?? ('usr_' . time()),
                'name' => $contactData['name'] ?? $matchedContact['nome'] ?? 'Usuário Cadastrado',
                'phone' => $contactData['phone'] ?? $matchedContact['telefone'] ?? $inputPhone,
                'role' => $role,
                'isTechnician' => $isTechnician,
                'isAdmin' => $isAdmin,
                'isPartner' => $isPartner,
                'contactId' => $matchedContact['guid'] ?? $matchedContact['id'] ?? null,
                'allowedNavTabs' => $allowedTabs,
                'loginTimestamp' => date('c'),
                'token' => 'auth_php_' . bin2hex(random_bytes(8))
            ];

            echo json_encode([
                'success' => true,
                'message' => 'Login realizado com sucesso via banco de dados!',
                'session' => $session,
                'banco_tipo' => $usando_mysql_real ? 'MySQL Real' : 'SQLite Fallback'
            ]);
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

                $stmt = $pdo->prepare("
                    INSERT INTO imagens_arquivos (guid, nome_original, nome_arquivo, caminho_servidor, url_publica, tipo_mime, tamanho_bytes, usuario_id)
                    VALUES (:guid, :original, :arquivo, :caminho, :url, :mime, :tamanho, :usuario)
                ");
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

                // ===== NOVO: Validação pós-inserção =====
                $verifyStmt = $pdo->prepare("SELECT id FROM imagens_arquivos WHERE guid = :guid LIMIT 1");
                $verifyStmt->execute([':guid' => $guid]);
                $verificacao = $verifyStmt->fetch();

                if ($verificacao) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'Imagem Base64 convertida e gravada fisicamente no servidor com ID único.',
                        'imageId' => $guid,
                        'filename' => $uniqueFilename,
                        'url' => $publicUrl,
                        'size' => $size,
                        'database_confirmed' => true,
                        'db_id' => $verificacao['id'],
                        'banco_tipo' => $usando_mysql_real ? 'MySQL Real' : 'SQLite Fallback'
                    ]);
                } else {
                    throw new Exception('Falha na validação pós-inserção: imagem Base64 não foi confirmada no banco');
                }
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
        $itens_confirmados = 0;

        $pdo->beginTransaction();

        foreach ($itens as $item) {
            $guid = $item['guid'] ?? $item['id'] ?? ($item['dados']['guid'] ?? $item['dados']['id'] ?? null);
            if (!$guid) continue;

            $tipo_entidade = $item['tipo_entidade'] ?? $item['type'] ?? 'geral';
            
            // Decodificação robusta do objeto de dados
            $d = null;
            if (isset($item['dados']) && is_array($item['dados'])) {
                $d = $item['dados'];
            } elseif (isset($item['data']) && is_array($item['data'])) {
                $d = $item['data'];
            } elseif (!empty($item['dados_json'])) {
                $decoded = is_string($item['dados_json']) ? json_decode($item['dados_json'], true) : $item['dados_json'];
                if (is_array($decoded)) {
                    $d = $decoded;
                }
            }
            if (!$d || !is_array($d)) {
                $d = $item;
            }

            $dados_json = !empty($item['dados_json']) && is_string($item['dados_json'])
                ? $item['dados_json'] 
                : json_encode($d, JSON_UNESCAPED_UNICODE);

            $itemUsuarioId = $item['usuario_id'] ?? $usuario_id;

            // 1. Tabela central de sincronização
            $checkStmt = $pdo->prepare("SELECT id FROM registros_sincronizacao WHERE guid = :guid LIMIT 1");
            $checkStmt->execute([':guid' => $guid]);
            $registroExistente = $checkStmt->fetch();

            if ($registroExistente) {
                $idBanco = (int)$registroExistente['id'];
                $updateStmt = $pdo->prepare("
                    UPDATE registros_sincronizacao 
                    SET dados_json = :dados_json, tipo_entidade = :tipo, usuario_id = :usuario_id, atualizado_em = CURRENT_TIMESTAMP
                    WHERE id = :id
                ");
                $updateStmt->execute([
                    ':dados_json' => $dados_json,
                    ':tipo' => $tipo_entidade,
                    ':usuario_id' => $itemUsuarioId,
                    ':id' => $idBanco
                ]);

                $mapeamento[] = ['guid' => $guid, 'id_banco' => $idBanco, 'tipo' => $tipo_entidade, 'status' => 'atualizado'];
                $itens_confirmados++;
            } else {
                $insertStmt = $pdo->prepare("
                    INSERT INTO registros_sincronizacao (guid, tipo_entidade, usuario_id, dados_json, atualizado_em)
                    VALUES (:guid, :tipo, :usuario_id, :dados_json, CURRENT_TIMESTAMP)
                ");
                $insertStmt->execute([
                    ':guid' => $guid,
                    ':tipo' => $tipo_entidade,
                    ':usuario_id' => $itemUsuarioId,
                    ':dados_json' => $dados_json
                ]);

                $idBanco = (int)$pdo->lastInsertId();
                $mapeamento[] = ['guid' => $guid, 'id_banco' => $idBanco, 'tipo' => $tipo_entidade, 'status' => 'inserido'];
                $itens_confirmados++;
            }

            // 2. Persistência especializada por tipo de entidade
            if ($tipo_entidade === 'checklist') {
                $proto = $d['protocolNumber'] ?? $d['protocolo'] ?? ('SOL-' . substr(time(), -6));
                $chkStmt = $pdo->prepare("
                    INSERT INTO checklists_laudos (guid, protocol_number, customer_id, technician_id, status, service_value, dados_json)
                    VALUES (:guid, :proto, :cust, :tech, :stat, :val, :dados)
                    ON DUPLICATE KEY UPDATE protocol_number = :proto, customer_id = :cust, technician_id = :tech, status = :stat, service_value = :val, dados_json = :dados
                ");
                try {
                    $chkStmt->execute([
                        ':guid' => $guid,
                        ':proto' => $proto,
                        ':cust' => $d['customerId'] ?? $d['customer_id'] ?? '',
                        ':tech' => $d['technicianId'] ?? $d['technician_id'] ?? '',
                        ':stat' => $d['status'] ?? 'rascunho',
                        ':val' => (float)($d['serviceValue'] ?? $d['valor_servico'] ?? 0),
                        ':dados' => $dados_json
                    ]);
                } catch (Exception $e) {
                    // Fallback para SQLite
                    $delStmt = $pdo->prepare("DELETE FROM checklists_laudos WHERE guid = :guid");
                    $delStmt->execute([':guid' => $guid]);
                    $insStmt = $pdo->prepare("INSERT INTO checklists_laudos (guid, protocol_number, customer_id, technician_id, status, service_value, dados_json) VALUES (:guid, :proto, :cust, :tech, :stat, :val, :dados)");
                    $insStmt->execute([
                        ':guid' => $guid,
                        ':proto' => $proto,
                        ':cust' => $d['customerId'] ?? $d['customer_id'] ?? '',
                        ':tech' => $d['technicianId'] ?? $d['technician_id'] ?? '',
                        ':stat' => $d['status'] ?? 'rascunho',
                        ':val' => (float)($d['serviceValue'] ?? $d['valor_servico'] ?? 0),
                        ':dados' => $dados_json
                    ]);
                }
            } elseif ($tipo_entidade === 'contact') {
                $tipoContato = (!empty($d['isTechnician']) || ($d['tipo'] ?? '') === 'tecnico') ? 'tecnico' : 'cliente';
                $nome = $d['name'] ?? $d['nome'] ?? 'Contato Sem Nome';
                $doc = $d['document'] ?? $d['documento'] ?? '';
                $tel = $d['phone'] ?? $d['telefone'] ?? '';
                $email = $d['email'] ?? '';
                $cidade = $d['address']['city'] ?? $d['cidade'] ?? '';
                $uf = $d['address']['state'] ?? $d['uf'] ?? '';

                $conStmt = $pdo->prepare("
                    INSERT INTO cadastros_contatos (guid, tipo, nome, documento, telefone, email, cidade, uf, dados_json)
                    VALUES (:guid, :tipo, :nome, :doc, :tel, :email, :cidade, :uf, :dados)
                    ON DUPLICATE KEY UPDATE tipo = :tipo, nome = :nome, documento = :doc, telefone = :tel, email = :email, cidade = :cidade, uf = :uf, dados_json = :dados
                ");
                try {
                    $conStmt->execute([
                        ':guid' => $guid,
                        ':tipo' => $tipoContato,
                        ':nome' => $nome,
                        ':doc' => $doc,
                        ':tel' => $tel,
                        ':email' => $email,
                        ':cidade' => $cidade,
                        ':uf' => $uf,
                        ':dados' => $dados_json
                    ]);
                } catch (Exception $e) {
                    $delStmt = $pdo->prepare("DELETE FROM cadastros_contatos WHERE guid = :guid");
                    $delStmt->execute([':guid' => $guid]);
                    $insStmt = $pdo->prepare("INSERT INTO cadastros_contatos (guid, tipo, nome, documento, telefone, email, cidade, uf, dados_json) VALUES (:guid, :tipo, :nome, :doc, :tel, :email, :cidade, :uf, :dados)");
                    $insStmt->execute([
                        ':guid' => $guid,
                        ':tipo' => $tipoContato,
                        ':nome' => $nome,
                        ':doc' => $doc,
                        ':tel' => $tel,
                        ':email' => $email,
                        ':cidade' => $cidade,
                        ':uf' => $uf,
                        ':dados' => $dados_json
                    ]);
                }
            } elseif ($tipo_entidade === 'appointment') {
                $dataAg = $d['scheduledDate'] ?? $d['data_agendamento'] ?? date('Y-m-d');
                $horaAg = $d['scheduledTime'] ?? $d['hora_agendamento'] ?? '';
                $statAg = $d['status'] ?? 'agendado';
                $valAg = (float)($d['totalAmount'] ?? $d['valor_total'] ?? 0);

                $aptStmt = $pdo->prepare("
                    INSERT INTO agendamentos_ordens (guid, customer_id, technician_id, data_agendamento, hora_agendamento, status, valor_total, dados_json)
                    VALUES (:guid, :cust, :tech, :data, :hora, :stat, :val, :dados)
                    ON DUPLICATE KEY UPDATE customer_id = :cust, technician_id = :tech, data_agendamento = :data, hora_agendamento = :hora, status = :stat, valor_total = :val, dados_json = :dados
                ");
                try {
                    $aptStmt->execute([
                        ':guid' => $guid,
                        ':cust' => $d['customerId'] ?? $d['customer_id'] ?? '',
                        ':tech' => $d['technicianId'] ?? $d['technician_id'] ?? '',
                        ':data' => $dataAg,
                        ':hora' => $horaAg,
                        ':stat' => $statAg,
                        ':val' => $valAg,
                        ':dados' => $dados_json
                    ]);
                } catch (Exception $e) {
                    $delStmt = $pdo->prepare("DELETE FROM agendamentos_ordens WHERE guid = :guid");
                    $delStmt->execute([':guid' => $guid]);
                    $insStmt = $pdo->prepare("INSERT INTO agendamentos_ordens (guid, customer_id, technician_id, data_agendamento, hora_agendamento, status, valor_total, dados_json) VALUES (:guid, :cust, :tech, :data, :hora, :stat, :val, :dados)");
                    $insStmt->execute([
                        ':guid' => $guid,
                        ':cust' => $d['customerId'] ?? $d['customer_id'] ?? '',
                        ':tech' => $d['technicianId'] ?? $d['technician_id'] ?? '',
                        ':data' => $dataAg,
                        ':hora' => $horaAg,
                        ':stat' => $statAg,
                        ':val' => $valAg,
                        ':dados' => $dados_json
                    ]);
                }
            } elseif ($tipo_entidade === 'financial') {
                $mesRef = $d['month'] ?? $d['mes_referencia'] ?? date('Y-m');
                $vBruto = (float)($d['grossAmount'] ?? $d['valor_bruto'] ?? 0);
                $vLiq = (float)($d['netAmount'] ?? $d['valor_liquido'] ?? 0);
                $vComissao = (float)($d['technicianCommission'] ?? $d['comissao_tecnico'] ?? 0);
                $statPag = $d['paymentStatus'] ?? $d['status_pagamento'] ?? 'pendente';

                $finStmt = $pdo->prepare("
                    INSERT INTO financeiro_lancamentos (guid, customer_id, technician_id, checklist_id, mes_referencia, valor_bruto, valor_liquido, comissao_tecnico, status_pagamento, dados_json)
                    VALUES (:guid, :cust, :tech, :chk, :mes, :vbruto, :vliq, :comissao, :stat, :dados)
                    ON DUPLICATE KEY UPDATE customer_id = :cust, technician_id = :tech, checklist_id = :chk, mes_referencia = :mes, valor_bruto = :vbruto, valor_liquido = :vliq, comissao_tecnico = :comissao, status_pagamento = :stat, dados_json = :dados
                ");
                try {
                    $finStmt->execute([
                        ':guid' => $guid,
                        ':cust' => $d['customerId'] ?? $d['customer_id'] ?? '',
                        ':tech' => $d['technicianId'] ?? $d['technician_id'] ?? '',
                        ':chk' => $d['checklistId'] ?? $d['checklist_id'] ?? '',
                        ':mes' => $mesRef,
                        ':vbruto' => $vBruto,
                        ':vliq' => $vLiq,
                        ':comissao' => $vComissao,
                        ':stat' => $statPag,
                        ':dados' => $dados_json
                    ]);
                } catch (Exception $e) {
                    $delStmt = $pdo->prepare("DELETE FROM financeiro_lancamentos WHERE guid = :guid");
                    $delStmt->execute([':guid' => $guid]);
                    $insStmt = $pdo->prepare("INSERT INTO financeiro_lancamentos (guid, customer_id, technician_id, checklist_id, mes_referencia, valor_bruto, valor_liquido, comissao_tecnico, status_pagamento, dados_json) VALUES (:guid, :cust, :tech, :chk, :mes, :vbruto, :vliq, :comissao, :stat, :dados)");
                    $insStmt->execute([
                        ':guid' => $guid,
                        ':cust' => $d['customerId'] ?? $d['customer_id'] ?? '',
                        ':tech' => $d['technicianId'] ?? $d['technician_id'] ?? '',
                        ':chk' => $d['checklistId'] ?? $d['checklist_id'] ?? '',
                        ':mes' => $mesRef,
                        ':vbruto' => $vBruto,
                        ':vliq' => $vLiq,
                        ':comissao' => $vComissao,
                        ':stat' => $statPag,
                        ':dados' => $dados_json
                    ]);
                }
            } elseif ($tipo_entidade === 'audit_log') {
                $entType = $d['entityType'] ?? $d['entity_type'] ?? 'geral';
                $entId = $d['entityId'] ?? $d['entity_id'] ?? '';
                $acao = $d['action'] ?? $d['acao'] ?? 'Edição';
                $usuario = $d['user'] ?? $d['usuario'] ?? 'Sistema';
                $resumo = $d['summary'] ?? $d['resumo'] ?? '';

                $audStmt = $pdo->prepare("
                    INSERT INTO auditoria_historico (guid, entity_type, entity_id, acao, usuario, resumo, dados_json)
                    VALUES (:guid, :ent_type, :ent_id, :acao, :usuario, :resumo, :dados)
                ");
                $audStmt->execute([
                    ':guid' => $guid,
                    ':ent_type' => $entType,
                    ':ent_id' => $entId,
                    ':acao' => $acao,
                    ':usuario' => $usuario,
                    ':resumo' => $resumo,
                    ':dados' => $dados_json
                ]);
            }
        }

        $pdo->commit();

        // Busca registros remotos para sincronização híbrida (Pull)
        $syncOptions = $payload['sync_options'] ?? [];
        $limite = min(max((int)($syncOptions['limit'] ?? $payload['limit'] ?? 50), 10), 200);
        $estrategia = $syncOptions['strategy'] ?? $payload['strategy'] ?? 'hybrid_my_and_recent';
        
        $registrosRemotos = [];
        if ($estrategia === 'my_recent') {
            $pullStmt = $pdo->prepare("SELECT id as id_banco, guid, tipo_entidade, usuario_id, dados_json, atualizado_em FROM registros_sincronizacao WHERE usuario_id = :uid ORDER BY atualizado_em DESC, id DESC LIMIT :lim");
            $pullStmt->bindValue(':uid', $usuario_id);
            $pullStmt->bindValue(':lim', $limite, PDO::PARAM_INT);
            $pullStmt->execute();
            $registrosRemotos = $pullStmt->fetchAll(PDO::FETCH_ASSOC);
        } elseif ($estrategia === 'all_recent') {
            $pullStmt = $pdo->prepare("SELECT id as id_banco, guid, tipo_entidade, usuario_id, dados_json, atualizado_em FROM registros_sincronizacao ORDER BY atualizado_em DESC, id DESC LIMIT :lim");
            $pullStmt->bindValue(':lim', $limite, PDO::PARAM_INT);
            $pullStmt->execute();
            $registrosRemotos = $pullStmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            // hybrid_my_and_recent
            $meuLimite = (int)floor($limite / 2);
            $pullStmt1 = $pdo->prepare("SELECT id as id_banco, guid, tipo_entidade, usuario_id, dados_json, atualizado_em FROM registros_sincronizacao WHERE usuario_id = :uid ORDER BY atualizado_em DESC, id DESC LIMIT :lim");
            $pullStmt1->bindValue(':uid', $usuario_id);
            $pullStmt1->bindValue(':lim', $meuLimite, PDO::PARAM_INT);
            $pullStmt1->execute();
            $meus = $pullStmt1->fetchAll(PDO::FETCH_ASSOC);

            $pullStmt2 = $pdo->prepare("SELECT id as id_banco, guid, tipo_entidade, usuario_id, dados_json, atualizado_em FROM registros_sincronizacao ORDER BY atualizado_em DESC, id DESC LIMIT :lim");
            $pullStmt2->bindValue(':lim', $limite, PDO::PARAM_INT);
            $pullStmt2->execute();
            $gerais = $pullStmt2->fetchAll(PDO::FETCH_ASSOC);

            $seen = [];
            foreach ($meus as $m) {
                $seen[$m['id_banco']] = true;
                $registrosRemotos[] = $m;
            }
            foreach ($gerais as $g) {
                if (!isset($seen[$g['id_banco']]) && count($registrosRemotos) < $limite) {
                    $seen[$g['id_banco']] = true;
                    $registrosRemotos[] = $g;
                }
            }
        }

        $registrosRemotosSanitizados = [];
        foreach ($registrosRemotos as &$r) {
            if ($r['guid'] === 'usr-admin-master' || $r['guid'] === 'admin' || $r['tipo_entidade'] === 'master') {
                continue;
            }
            $dados = json_decode($r['dados_json'], true);
            if (is_array($dados)) {
                if (isset($dados['id']) && $dados['id'] === 'usr-admin-master') {
                    continue;
                }
                unset($dados['password']);
                unset($dados['senha']);
            }
            $r['dados'] = $dados;
            $registrosRemotosSanitizados[] = $r;
        }

        echo json_encode([
            'success' => true,
            'message' => 'Lote com Checklists, Cadastros, Agenda, Financeiro e Auditoria consolidado no Banco de Dados.',
            'total_processados' => count($mapeamento),
            'itemsProcessed' => $itens_confirmados,
            'mapeamento' => $mapeamento,
            'registros_remotos' => $registrosRemotosSanitizados,
            'total_remotos' => count($registrosRemotosSanitizados),
            'banco_tipo' => $usando_mysql_real ? 'MySQL Real' : 'SQLite Fallback',
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

        $limiteGet = min(max((int)($_GET['limit'] ?? 50), 10), 200);
        $stmt = $pdo->prepare("SELECT id as id_banco, guid, tipo_entidade, usuario_id, dados_json, atualizado_em FROM registros_sincronizacao ORDER BY id DESC LIMIT :lim");
        $stmt->bindValue(':lim', $limiteGet, PDO::PARAM_INT);
        $stmt->execute();
        $registros = $stmt->fetchAll();

        $registrosSanitizados = [];
        foreach ($registros as &$reg) {
            if ($reg['guid'] === 'usr-admin-master' || $reg['guid'] === 'admin' || $reg['tipo_entidade'] === 'master') {
                continue;
            }
            $dados = json_decode($reg['dados_json'], true);
            if (is_array($dados)) {
                if (isset($dados['id']) && $dados['id'] === 'usr-admin-master') {
                    continue;
                }
                unset($dados['password']);
                unset($dados['senha']);
            }
            $reg['dados'] = $dados;
            $registrosSanitizados[] = $reg;
        }

        echo json_encode([
            'success' => true,
            'banco_instalado' => true,
            'driver' => $pdo->getAttribute(PDO::ATTR_DRIVER_NAME),
            'usando_mysql_real' => $usando_mysql_real,
            'estatisticas' => $stats,
            'total' => count($registrosSanitizados),
            'registros' => $registrosSanitizados,
            'registros_remotos' => $registrosSanitizados,
            'total_remotos' => count($registrosSanitizados),
            'servidor_timestamp' => date('Y-m-d H:i:s')
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
        'message' => 'Erro na API PHP: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
