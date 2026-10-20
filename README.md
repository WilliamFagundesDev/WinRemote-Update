# Remote-Update-Trigger

Aplicação completa para disparo remoto e em lote da verificação online do **Microsoft Update** em computadores Windows da rede local, com validação prévia de conectividade via **Ping (ICMP)** no PowerShell.

---

## 🛠️ Tecnologias Utilizadas

- **Backend:** Node.js (v18+), Express, CORS, PowerShell Child Process com `-EncodedCommand` (UTF-16LE Base64)
- **Frontend:** Vue.js 3 (Composition API, `<script setup>`, JavaScript puro sem TypeScript), Vite
- **Automação Windows:**
  - Teste de Ping: `Test-Connection -ComputerName '<host>' -Count 1 -Quiet`
  - Disparo de Atualização: `Invoke-Command` + COM Object `Microsoft.Update.Session` com `ServerSelection = 2` (Microsoft Update Online)

---

## 📁 Estrutura do Projeto

```
remote-update-trigger/
├── server/
│   ├── package.json
│   └── index.js
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.js
│       └── App.vue
├── package.json
└── README.md
```

---

## 🚀 Como Executar

### 1. Instalação das dependências
Execute na raiz do projeto:
```bash
npm run install:all
```
*Esse script instala as dependências da raiz (`concurrently`), da pasta `server` (Express, CORS) e da pasta `client` (Vue, Vite).*

### 2. Inicialização em Modo de Desenvolvimento
Execute na raiz do projeto:
```bash
npm run dev
```
O comando iniciará simultaneamente:
- **Backend API:** `http://localhost:3001`
- **Frontend Vite:** `http://localhost:5173`

---

## 🔌 Endpoints da API REST (Backend)

### 1. `POST /api/ping`
- **Body:** `{ "host": "192.168.1.100" }`
- **Ação:** Executa `Test-Connection -ComputerName '<host>' -Count 1 -Quiet`
- **Retorno:**
  ```json
  {
    "host": "192.168.1.100",
    "online": true
  }
  ```

### 2. `POST /api/trigger-update`
- **Body:** `{ "host": "192.168.1.100" }`
- **Ação:** Executa remotamente via `Invoke-Command`:
  ```powershell
  Invoke-Command -ComputerName '<host>' -ScriptBlock {
      $Session = New-Object -ComObject Microsoft.Update.Session
      $Searcher = $Session.CreateUpdateSearcher()
      $Searcher.ServerSelection = 2
      $Searcher.BeginSearch("IsInstalled=0 and Type='Software'", $null, $null)
  }
  ```
- **Retorno de Sucesso:**
  ```json
  {
    "success": true,
    "message": "Verificação de atualizações online (Microsoft Update - ServerSelection = 2) disparada com êxito no host 192.168.1.100."
  }
  ```
- **Retorno de Erro (WinRM / Permissão):**
  ```json
  {
    "success": false,
    "message": "Falha de conexão WinRM: O host não respondeu ou a porta 5985 está inacessível."
  }
  ```

### 3. `GET /api/health`
- Retorna o status de integridade do serviço backend.

---

## ⚙️ Pré-requisitos e Configurações de Rede (WinRM)

Para que o comando remoto funcione nas máquinas clientes:

1. **Habilitar o WinRM nos computadores de destino:**
   No PowerShell como Administrador nas máquinas da rede:
   ```powershell
   Enable-PSRemoting -Force
   ```

2. **Liberar o Firewall:**
   A porta TCP padrão do WinRM (`5985` HTTP ou `5986` HTTPS) e o protocolo ICMP (Ping) devem estar liberados no Firewall do Windows na rede local.

3. **Ambiente de Grupo de Trabalho (Workgroup - sem Active Directory):**
   Se as máquinas não estiverem em um domínio Active Directory, configure o `TrustedHosts` na máquina que executa o sistema:
   ```powershell
   Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force
   ```
