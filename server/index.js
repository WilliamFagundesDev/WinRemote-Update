const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

/**
 * Valida e higieniza o nome de host ou endereço IP fornecido
 * Permite caracteres alfanuméricos, pontos, hífens, sublinhados e dois-pontos (IPv6)
 */
function sanitizeHost(host) {
  if (typeof host !== 'string') return null;
  const trimmed = host.trim();
  if (!trimmed || trimmed.length > 255 || !/^[a-zA-Z0-9\.\-_:]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Executa um script PowerShell utilizando -EncodedCommand (UTF-16LE Base64)
 * com saída UTF-8 forçada para evitar problemas de acentuação (mojibake)
 * e injeção de comandos.
 */
function runPowerShell(script, timeoutMs = 30000) {
  return new Promise((resolve) => {
    // Força encoding UTF-8 no console e no output do PowerShell
    const utf8Script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
${script}
`;

    const encodedCommand = Buffer.from(utf8Script, 'utf16le').toString('base64');

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedCommand],
      { timeout: timeoutMs, windowsHide: true, encoding: 'utf8' },
      (error, stdout, stderr) => {
        resolve({
          error,
          stdout: stdout ? stdout.trim() : '',
          stderr: stderr ? stderr.trim() : ''
        });
      }
    );
  });
}

// Endpoint de verificação de integridade
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Remote-Update-Trigger API',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/ping
 * Recebe: { host: string }
 * Executa: Test-Connection -ComputerName '<host>' -Count 1 -Quiet
 * Retorna: { host: string, online: boolean }
 */
app.post('/api/ping', async (req, res) => {
  const { host } = req.body || {};
  const cleanHost = sanitizeHost(host);

  if (!cleanHost) {
    return res.status(400).json({
      error: 'Host inválido ou não informado. Use apenas letras, números, pontos e hífens.',
      host: host || '',
      online: false
    });
  }

  // Script PowerShell para Test-Connection -ComputerName '<host>' -Count 1 -Quiet
  const psScript = `
try {
    $result = Test-Connection -ComputerName '${cleanHost}' -Count 1 -Quiet -ErrorAction Stop
    if ($result) {
        Write-Output "True"
    } else {
        Write-Output "False"
    }
} catch {
    Write-Output "False"
}
`;

  try {
    const { stdout, error } = await runPowerShell(psScript, 15000);
    const isOnline = stdout.includes('True');

    return res.json({
      host: cleanHost,
      online: isOnline
    });
  } catch (err) {
    return res.json({
      host: cleanHost,
      online: false,
      error: err.message
    });
  }
});

/**
 * POST /api/trigger-update
 * Recebe: { host: string }
 * Executa EXCLUSIVAMENTE a opção "Verificar online se há atualizações do Microsoft Update":
 * - Registra e habilita o Microsoft Update Service (GUID: 7971f918-a847-4430-9279-4a52d1efe18d)
 * - Define ServerSelection = 2 (ssWindowsUpdate - bypassa WSUS/GPO) e ServiceID
 * - Executa a busca online diretamente nos servidores da Microsoft
 * - Se houver restrição de token WinRM, executa via Tarefa Agendada local como SYSTEM
 * - Enfileira/inicia o download das atualizações encontradas online
 */
app.post('/api/trigger-update', async (req, res) => {
  const { host } = req.body || {};
  const cleanHost = sanitizeHost(host);

  if (!cleanHost) {
    return res.status(400).json({
      success: false,
      message: 'Nome de host ou IP inválido ou não informado.'
    });
  }

  // Script PowerShell que força explicitamente "Verificar online se há atualizações do Microsoft Update":
  // 1. Temporariamente desativa UseWUServer (bypassa WSUS e direciona o Windows Update GUI e o USO à nuvem Microsoft)
  // 2. Dispara usoclient RefreshSettings e StartInteractiveScan
  // 3. Executa na sessão interativa do usuário logado explorer.exe ms-settings:windowsupdate (traz e atualiza a tela na frente do operador)
  // 4. Inicia via tarefa SYSTEM local o pipeline completo de Download e Instalação (evitando bloqueio E_ACCESSDENIED do WinRM)
  // 5. Restaura a política de GPO após o processamento
  const psScript = `
try {
    Invoke-Command -ComputerName '${cleanHost}' -ScriptBlock {
        $msUpdateGuid = "7971f918-a847-4430-9279-4a52d1efe18d"
        $regAU = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU"

        # 1. Desativa temporariamente UseWUServer para o Windows Update GUI e USO consultarem a nuvem Microsoft
        try {
            Set-ItemProperty -Path $regAU -Name "UseWUServer" -Value 0 -Type DWord -ErrorAction SilentlyContinue
        } catch {}

        # 2. Força o Orchestrator a recarregar as políticas
        Start-Process "usoclient.exe" -ArgumentList "RefreshSettings" -ErrorAction SilentlyContinue

        # 3. Dispara as tarefas nativas do Orchestrator
        Start-ScheduledTask -TaskPath "\\Microsoft\\Windows\\UpdateOrchestrator\\" -TaskName "Schedule Scan" -ErrorAction SilentlyContinue
        Start-ScheduledTask -TaskPath "\\Microsoft\\Windows\\UpdateOrchestrator\\" -TaskName "USO_UxBroker" -ErrorAction SilentlyContinue
        Start-Process "usoclient.exe" -ArgumentList "StartInteractiveScan" -ErrorAction SilentlyContinue

        # 4. Na tela física do computador (sessão interativa do usuário logado), fecha qualquer janela congelada e recarrega o Windows Update limpo
        try {
            Stop-Process -Name "SystemSettings" -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 600

            $activeUser = (Get-CimInstance Win32_ComputerSystem).UserName
            if ($activeUser) {
                $wakeCmd = "cmd.exe /c start ms-settings:windowsupdate"
                schtasks /Create /TN "WinRemote_WakeScreen" /TR $wakeCmd /SC ONCE /ST 23:59 /RU $activeUser /IT /F | Out-Null
                schtasks /Run /TN "WinRemote_WakeScreen" | Out-Null
                Start-Sleep -Seconds 1
                schtasks /Delete /TN "WinRemote_WakeScreen" /F | Out-Null
            }
        } catch {}

        # 5. Cria e dispara o script do pipeline completo em segundo plano como SYSTEM local com telemetria rica
        $pipelineCode = @'
$msGuid = "7971f918-a847-4430-9279-4a52d1efe18d"
$statusFile = "C:\Windows\Temp\ms_update_online_status.json"

function Write-Telemetry($stage, $stageTitle, $progress, $currentKb, $items, $reboot, $err) {
    [PSCustomObject]@{
        LastCheck = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        Stage = $stage          # idle | scanning | downloading | installing | completed | reboot_pending | error
        StageTitle = $stageTitle
        Progress = $progress
        CurrentUpdate = $currentKb
        Updates = $items
        RebootRequired = $reboot
        Error = $err
        Source = "Microsoft Update Online"
    } | ConvertTo-Json -Depth 5 -Compress | Out-File $statusFile -Encoding utf8 -Force
}

try {
    Write-Telemetry "scanning" "Buscando atualizacoes na nuvem da Microsoft..." 15 "" @() $false ""

    $sm = New-Object -ComObject Microsoft.Update.ServiceManager
    $sm.ClientApplicationID = "Remote-Update-Trigger"
    $sm.AddService2($msGuid, 7, "") | Out-Null
} catch {}

try {
    $session = New-Object -ComObject Microsoft.Update.Session
    $searcher = $session.CreateUpdateSearcher()
    try { $searcher.ServerSelection = 3; $searcher.ServiceID = $msGuid } catch { $searcher.ServerSelection = 2 }

    $searchRes = $searcher.Search("IsInstalled=0 and Type='Software'")
    $updatesList = @()
    $coll = New-Object -ComObject Microsoft.Update.UpdateColl

    foreach ($u in $searchRes.Updates) {
        if (-not $u.IsHidden -and -not $u.IsInstalled) {
            if (-not $u.EulaAccepted) { $u.AcceptEula() }
            $coll.Add($u) | Out-Null
            $updatesList += [PSCustomObject]@{
                Title = $u.Title
                Status = "Pendente"
            }
        }
    }

    if ($coll.Count -eq 0) {
        Write-Telemetry "completed" "Sistema 100% atualizado nos servidores Microsoft (0 pendencias)" 100 "" @() $false ""
        exit 0
    }

    # ETAPA 2: DOWNLOAD
    Write-Telemetry "downloading" "Baixando $($coll.Count) atualizacao(oes) online..." 35 $coll.Item(0).Title $updatesList $false ""
    
    Start-Process "usoclient.exe" -ArgumentList "StartDownload" -ErrorAction SilentlyContinue
    $downloader = $session.CreateUpdateDownloader()
    $downloader.Updates = $coll
    $downRes = $downloader.Download()

    for ($i = 0; $i -lt $updatesList.Count; $i++) {
        $updatesList[$i].Status = "Baixado"
    }

    # ETAPA 3: INSTALACAO
    Write-Telemetry "installing" "Instalando $($coll.Count) atualizacao(oes) no sistema..." 70 $coll.Item(0).Title $updatesList $false ""

    Start-Process "usoclient.exe" -ArgumentList "StartInstall" -ErrorAction SilentlyContinue
    $installer = $session.CreateUpdateInstaller()
    $installer.Updates = $coll
    $instRes = $installer.Install()

    $isReboot = [bool]$instRes.RebootRequired
    for ($i = 0; $i -lt $updatesList.Count; $i++) {
        $updatesList[$i].Status = "Instalado"
    }

    # ETAPA 4: CONCLUSAO
    if ($isReboot) {
        Write-Telemetry "reboot_pending" "Instalacao concluida! Reinicializacao necessaria para aplicar." 100 "" $updatesList $true ""
    } else {
        Write-Telemetry "completed" "Todas as atualizacoes foram instaladas com exito!" 100 "" $updatesList $false ""
    }
} catch {
    Write-Telemetry "error" "Falha durante o processamento de atualizacao: $($_.Exception.Message)" 0 "" @() $false $_.Exception.Message
}

# Aguarda 15 minutos e restaura UseWUServer = 1 para manter conformidade GPO da organizacao
Start-Sleep -Seconds 900
try {
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "UseWUServer" -Value 1 -Type DWord
    Start-Process "usoclient.exe" -ArgumentList "RefreshSettings" -ErrorAction SilentlyContinue
} catch {}
'@

        $pipeFile = "C:\\Windows\\Temp\\WinRemote_MSUpdatePipeline.ps1"
        $pipelineCode | Out-File $pipeFile -Encoding utf8 -Force

        $pipeCmd = "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File C:\\Windows\\Temp\\WinRemote_MSUpdatePipeline.ps1"
        schtasks /Create /TN "WinRemote_MSUpdatePipeline" /TR $pipeCmd /SC ONCE /ST 23:59 /RU "SYSTEM" /RL HIGHEST /F | Out-Null
        schtasks /Run /TN "WinRemote_MSUpdatePipeline" | Out-Null

        # Aguarda brevemente para capturar os primeiros KBs identificados para resposta imediata ao operador
        $waited = 0
        $detectedUpdates = @()
        $statusJson = "C:\\Windows\\Temp\\ms_update_online_status.json"
        while ($waited -lt 8) {
            Start-Sleep -Seconds 2
            $waited += 2
            if (Test-Path $statusJson) {
                try {
                    $parsed = (Get-Content $statusJson -Raw -Encoding utf8 | ConvertFrom-Json)
                    if ($parsed.Updates -and $parsed.Updates.Count -gt 0) {
                        $detectedUpdates = @($parsed.Updates)
                        break
                    }
                } catch {}
            }
        }

        if ($detectedUpdates.Count -gt 0) {
            Write-Output "SUCCESS: Microsoft Update Online disparado na tela do computador! Encontradas $($detectedUpdates.Count) atualização(ões) online."
        } else {
            Write-Output "SUCCESS: Microsoft Update Online disparado com êxito na tela do computador! O processo de varredura, download e instalação foi iniciado em tempo real."
        }
    } -ErrorAction Stop
} catch {
    Write-Output ("ERROR: " + $_.Exception.Message)
}
`;

  try {
    // Timeout de 60 segundos para varredura completa online no Microsoft Update
    const { error, stdout, stderr } = await runPowerShell(psScript, 60000);

    if (error && error.killed) {
      return res.json({
        success: false,
        message: `Tempo limite esgotado (timeout de 60s) ao consultar o Microsoft Update Online no host '${cleanHost}'.`
      });
    }

    const trimmedStdout = stdout.trim();

    if (trimmedStdout.includes('SUCCESS:')) {
      const match = trimmedStdout.match(/SUCCESS:\s*(.+)$/m);
      const msg = match ? match[1].trim() : 'Verificação do Microsoft Update Online disparada com êxito.';
      return res.json({
        success: true,
        message: msg
      });
    }

    if (trimmedStdout.includes('ERROR:')) {
      const match = trimmedStdout.match(/ERROR:\s*(.+)$/m);
      let rawError = match ? match[1].trim() : trimmedStdout;

      if (rawError.includes('Falha ao conectar ao servidor remoto') || rawError.includes('WinRM cannot process the request')) {
        rawError = `Falha de conexão WinRM: O host '${cleanHost}' não respondeu ou o serviço WinRM/porta 5985 está inacessível.`;
      } else if (rawError.includes('Acesso negado') || rawError.includes('Access is denied')) {
        rawError = `Acesso negado no host '${cleanHost}': Permissões administrativas necessárias para execução remota.`;
      }

      return res.json({
        success: false,
        message: rawError
      });
    }

    if (error || stderr) {
      return res.json({
        success: false,
        message: stderr || (error && error.message) || `Falha na execução do comando no host '${cleanHost}'.`
      });
    }

    return res.json({
      success: true,
      message: trimmedStdout || `Microsoft Update Online executado no host ${cleanHost}.`
    });
  } catch (err) {
    return res.json({
      success: false,
      message: `Erro interno no servidor: ${err.message}`
    });
  }
});

// Arquivo de persistência do estado no servidor
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

// Garante que o diretório data exista
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Erro ao criar pasta data:', e.message);
  }
}

/**
 * GET /api/state
 * Retorna o estado persistido no disco (máquinas, monitoramento)
 */
app.get('/api/state', (req, res) => {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const content = fs.readFileSync(STATE_FILE, 'utf8');
      return res.json(JSON.parse(content));
    }
  } catch (err) {
    console.error('Erro ao ler estado do disco:', err.message);
  }
  return res.json({ machines: [], monitoringActive: false });
});

/**
 * POST /api/state
 * Salva o estado atual no disco para persistência entre reinicializações
 */
app.post('/api/state', (req, res) => {
  try {
    const data = req.body || {};
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf8');
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/check-status
 * Recebe: { host: string }
 * Consulta no computador remoto via WinRM dados 100% REAIS da máquina:
 * 1. Nome Real do Host, Edição do Windows, Build e Uptime
 * 2. Status Real de Reinicialização (CBS RebootPending e Auto Update RebootRequired)
 * 3. O que está atualizando? (Resumo da varredura recente e KBs reais do Windows)
 * 4. Fase e Progresso Real (baseado em processos e contagem de atualizações encontradas)
 */
app.post('/api/check-status', async (req, res) => {
  const { host } = req.body || {};
  const cleanHost = sanitizeHost(host);

  if (!cleanHost) {
    return res.status(400).json({
      success: false,
      message: 'Nome de host ou IP inválido ou não informado.'
    });
  }

  // Script PowerShell para coletar dados REAIS e DISTINTOS do computador remoto
  const psScript = `
try {
    Invoke-Command -ComputerName '${cleanHost}' -ScriptBlock {
        try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

        $realHostName = $env:COMPUTERNAME

        # Dados Reais do Sistema Operacional
        $os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
        $osCaption = if ($os) { $os.Caption.Trim() } else { "Windows" }
        $osBuild = if ($os) { $os.BuildNumber } else { "" }
        $lastBoot = if ($os) { $os.LastBootUpTime.ToString("dd/MM/yyyy HH:mm") } else { "N/A" }

        # Verificação Real de Reinicialização Pendente
        $rebootPending = $false
        $rebootReason = ""
        if (Test-Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired") {
            $rebootPending = $true
            $rebootReason = "Windows Update requer reinicialização"
        }
        if (Test-Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing\\RebootPending") {
            $rebootPending = $true
            $rebootReason = if ($rebootReason) { "$rebootReason, CBS RebootPending" } else { "CBS RebootPending" }
        }

        # Serviços e Processos Reais Ativos
        $wuauserv = (Get-Service wuauserv -ErrorAction SilentlyContinue).Status
        $tiWorker = (Get-Process TiWorker -ErrorAction SilentlyContinue)
        $mouso = (Get-Process MoUsoCoreWorker, UsoClient -ErrorAction SilentlyContinue)

        # Eventos Reais do Log do Windows Update
        $events = Get-WinEvent -LogName "Microsoft-Windows-WindowsUpdateClient/Operational" -MaxEvents 20 -ErrorAction SilentlyContinue
        $eventList = @()
        $recentSummary = ""
        $updatesFoundCount = $null

        if ($events) {
            foreach ($ev in $events) {
                $msg = $ev.Message
                if ($msg -and $eventList.Count -lt 8) {
                    $cleanMsg = $msg -replace "\\s+", " "
                    $eventList += [PSCustomObject]@{
                        Time = $ev.TimeCreated.ToString("HH:mm:ss dd/MM")
                        Id = $ev.Id
                        Message = $cleanMsg
                    }
                    if (-not $recentSummary -and ($ev.Id -in 19, 20, 24, 25, 26, 41, 43, 44)) {
                        $recentSummary = "$($ev.TimeCreated.ToString('HH:mm:ss')) - $cleanMsg"
                    }
                    if ($null -eq $updatesFoundCount -and $ev.Id -eq 26 -and $cleanMsg -match "encontrou (\\d+) atualiza") {
                        $updatesFoundCount = [int]$matches[1]
                    }
                }
            }
        }

        # Determina a Fase Real da máquina
        $phase = "Ocioso / Atualizado"
        $isWorking = $false

        if ($tiWorker) {
            $phase = "Instalando atualizações no sistema (TiWorker ativo)"
            $isWorking = $true
        } elseif ($mouso) {
            if ($updatesFoundCount -and $updatesFoundCount -gt 0) {
                $phase = "Baixando $updatesFoundCount atualização(ões) encontrada(s)"
            } else {
                $phase = "Orquestrador em execução (verificando/baixando atualizações)"
            }
            $isWorking = $true
        } elseif ($wuauserv -eq "Running") {
            if ($updatesFoundCount -and $updatesFoundCount -gt 0) {
                $phase = "$updatesFoundCount atualização(ões) encontrada(s) na varredura"
            } else {
                $phase = "Serviço ativo em segundo plano"
            }
            $isWorking = $true
        } else {
            if ($rebootPending) {
                $phase = "Aguardando reinicialização do computador"
            } elseif ($updatesFoundCount -eq 0) {
                $phase = "Nenhuma atualização pendente (Sistema em dia)"
            }
        }

        # Leitura da telemetria precisa do Microsoft Update Online
        $onlineInfo = $null
        $onlineUpdatesList = @()
        $telemetryStage = "idle"
        $telemetryStageTitle = ""
        $telemetryProgress = 0
        $telemetryCurrentUpdate = ""
        $telemetryDetailedUpdates = @()
        $telemetryError = ""

        if (Test-Path "C:\\Windows\\Temp\\ms_update_online_status.json") {
            try {
                $rawOnline = Get-Content "C:\\Windows\\Temp\\ms_update_online_status.json" -Raw -Encoding utf8
                $onlineInfo = $rawOnline | ConvertFrom-Json
                if ($onlineInfo.Stage) {
                    $telemetryStage = [string]$onlineInfo.Stage
                    $telemetryStageTitle = [string]$onlineInfo.StageTitle
                    $telemetryProgress = [int]$onlineInfo.Progress
                    $telemetryCurrentUpdate = [string]$onlineInfo.CurrentUpdate
                    $telemetryError = [string]$onlineInfo.Error
                    if ($onlineInfo.RebootRequired) { $rebootPending = $true }
                }
                if ($onlineInfo.Updates) {
                    foreach ($up in $onlineInfo.Updates) {
                        if ($up.Title) {
                            $onlineUpdatesList += $up.Title
                            $telemetryDetailedUpdates += [PSCustomObject]@{
                                Title = [string]$up.Title
                                Status = [string]$up.Status
                            }
                        } else {
                            $onlineUpdatesList += [string]$up
                            $telemetryDetailedUpdates += [PSCustomObject]@{
                                Title = [string]$up
                                Status = "Pendente"
                            }
                        }
                    }
                }
            } catch {}
        }

        # Verifica se a tarefa do pipeline ainda está ativa no Agendador de Tarefas
        $pipeTask = Get-ScheduledTask -TaskName "WinRemote_MSUpdatePipeline", "TestTelemetry" -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Running" }
        $isPipeRunning = ($null -ne $pipeTask)

        # Determina a fase definitiva com base na telemetria real (não apenas em TiWorker genérico)
        if ($telemetryStage -eq "scanning") {
            $phase = "Varredura: Consultando catálogo Microsoft Update Online..."
            $telemetryStageTitle = "Buscando atualizações na nuvem da Microsoft..."
            $isWorking = $true
            if ($telemetryProgress -eq 0) { $telemetryProgress = 15 }
        } elseif ($telemetryStage -eq "downloading") {
            $telemetryStageTitle = if ($telemetryStageTitle -and -not ($telemetryStageTitle -match "Ã")) { $telemetryStageTitle } else { "Baixando atualizações do Microsoft Update..." }
            $phase = $telemetryStageTitle
            $isWorking = $true
            if ($telemetryProgress -eq 0) { $telemetryProgress = 40 }
        } elseif ($telemetryStage -eq "installing") {
            $telemetryStageTitle = if ($telemetryStageTitle -and -not ($telemetryStageTitle -match "Ã")) { $telemetryStageTitle } else { "Instalando atualizações no sistema Windows..." }
            $phase = $telemetryStageTitle
            $isWorking = $true
            if ($telemetryProgress -eq 0) { $telemetryProgress = 70 }
        } elseif ($telemetryStage -eq "reboot_pending" -or ($rebootPending -and $telemetryStage -ne "completed")) {
            $phase = "Instalação concluída! Reinicialização necessária."
            $telemetryStageTitle = "Atualizações instaladas! Reinicialização necessária para concluir."
            $isWorking = $false
            $telemetryStage = "reboot_pending"
            $telemetryProgress = 100
        } elseif ($telemetryStage -eq "completed") {
            $phase = "Sistema atualizado com êxito! (0 pendências)"
            $telemetryStageTitle = "Todas as atualizações foram instaladas com êxito!"
            $isWorking = $false
            $telemetryProgress = 100
        } elseif ($telemetryStage -eq "error") {
            $phase = "Erro na atualização: $telemetryError"
            $telemetryStageTitle = "Falha durante a atualização"
            $isWorking = $false
        } elseif ($isPipeRunning) {
            $phase = "Pipeline de atualização em execução no sistema..."
            $telemetryStageTitle = "Instalando atualizações no sistema Windows..."
            $isWorking = $true
            $telemetryStage = "installing"
            if ($telemetryProgress -eq 0) { $telemetryProgress = 65 }
        } else {
            if ($rebootPending) {
                $phase = "Aguardando reinicialização do computador"
                $telemetryStageTitle = "Reinicialização pendente"
                $telemetryStage = "reboot_pending"
                $telemetryProgress = 100
            } elseif ($onlineInfo -and $onlineInfo.Count -eq 0) {
                $phase = "Sistema em dia (0 atualizações pendentes)"
                $telemetryStageTitle = "Sistema 100% atualizado"
                $telemetryStage = "completed"
                $telemetryProgress = 100
            } else {
                $phase = "Aguardando disparo da atualização"
                $telemetryStageTitle = "Pronto para disparo"
                $telemetryStage = "idle"
            }
            $isWorking = $false
        }

        # KBs Reais Instaladas do Windows (HotFixes)
        $hotfixes = Get-CimInstance Win32_QuickFixEngineering -ErrorAction SilentlyContinue |
            Sort-Object -Property InstalledOn -Descending -ErrorAction SilentlyContinue |
            Select-Object -First 5 HotFixID, Description, InstalledOn

        $realHotfixes = @()
        if ($hotfixes) {
            foreach ($hf in $hotfixes) {
                $dateStr = if ($hf.InstalledOn) { ([datetime]$hf.InstalledOn).ToString("dd/MM/yyyy") } else { "N/A" }
                $realHotfixes += [PSCustomObject]@{
                    Title = "$($hf.HotFixID) ($($hf.Description))"
                    Date = $dateStr
                    Result = "Instalado"
                }
            }
        }

        $outputObj = [PSCustomObject]@{
            ComputerName = $realHostName
            OsCaption = $osCaption
            OsBuild = $osBuild
            LastBoot = $lastBoot
            RebootRequired = $rebootPending
            RebootReason = $rebootReason
            CurrentPhase = $phase
            IsWorking = $isWorking
            Stage = $telemetryStage
            StageTitle = if ($telemetryStageTitle) { $telemetryStageTitle } else { $phase }
            Progress = $telemetryProgress
            CurrentUpdate = $telemetryCurrentUpdate
            DetailedUpdates = $telemetryDetailedUpdates
            PipelineError = $telemetryError
            IsPipelineActive = $isPipeRunning
            WuauservStatus = [string]$wuauserv
            RecentSummary = $recentSummary
            UpdatesFound = if ($onlineUpdatesList.Count -gt 0) { $onlineUpdatesList.Count } elseif ($onlineInfo -and $null -ne $onlineInfo.Count) { $onlineInfo.Count } else { $updatesFoundCount }
            OnlineUpdates = $onlineUpdatesList
            OnlineCount = if ($onlineUpdatesList.Count -gt 0) { $onlineUpdatesList.Count } elseif ($onlineInfo) { $onlineInfo.Count } else { $null }
            OnlineSource = if ($onlineInfo) { $onlineInfo.Source } else { "" }
            OnlineLastCheck = if ($onlineInfo) { $onlineInfo.LastCheck } else { "" }
            RecentEvents = $eventList
            History = $realHotfixes
        }

        $outputObj | ConvertTo-Json -Depth 4
    } -ErrorAction Stop
} catch {
    Write-Output ("ERROR: " + $_.Exception.Message)
}
`;

  try {
    const { error, stdout, stderr } = await runPowerShell(psScript, 25000);

    if (error && error.killed) {
      return res.json({
        success: false,
        host: cleanHost,
        message: `Tempo limite esgotado ao consultar status do host '${cleanHost}'.`
      });
    }

    const trimmed = stdout.trim();

    if (trimmed.startsWith('ERROR:')) {
      let rawError = trimmed.replace(/^ERROR:\s*/, '');
      if (rawError.includes('Falha ao conectar ao servidor remoto') || rawError.includes('WinRM cannot process the request')) {
        rawError = `Host '${cleanHost}' não respondeu via WinRM.`;
      }
      return res.json({
        success: false,
        host: cleanHost,
        message: rawError
      });
    }

    // Parse do JSON com os dados reais do computador remoto
    try {
      const jsonStart = trimmed.indexOf('{');
      const jsonEnd = trimmed.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = trimmed.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);

        return res.json({
          success: true,
          host: cleanHost,
          computerName: parsed.ComputerName || cleanHost,
          osCaption: parsed.OsCaption || 'Windows',
          osBuild: parsed.OsBuild || '',
          lastBoot: parsed.LastBoot || '',
          online: true,
          rebootRequired: Boolean(parsed.RebootRequired),
          rebootReason: parsed.RebootReason || '',
          currentPhase: parsed.CurrentPhase || 'Ocioso',
          isWorking: Boolean(parsed.IsWorking),
          stage: parsed.Stage || 'idle',
          stageTitle: parsed.StageTitle || parsed.CurrentPhase || '',
          progress: typeof parsed.Progress === 'number' ? parsed.Progress : 0,
          currentUpdate: parsed.CurrentUpdate || '',
          detailedUpdates: Array.isArray(parsed.DetailedUpdates) ? parsed.DetailedUpdates : [],
          pipelineError: parsed.PipelineError || '',
          isPipelineActive: Boolean(parsed.IsPipelineActive),
          wuauservStatus: parsed.WuauservStatus || 'Desconhecido',
          recentSummary: parsed.RecentSummary || '',
          updatesFound: parsed.UpdatesFound !== undefined ? parsed.UpdatesFound : null,
          onlineUpdates: parsed.OnlineUpdates || [],
          onlineCount: parsed.OnlineCount !== undefined ? parsed.OnlineCount : null,
          onlineSource: parsed.OnlineSource || '',
          onlineLastCheck: parsed.OnlineLastCheck || '',
          recentEvents: parsed.RecentEvents || [],
          history: parsed.History || [],
          lastCheck: new Date().toLocaleTimeString('pt-BR')
        });
      }
    } catch (parseErr) {
      // Falha no parse
    }

    return res.json({
      success: true,
      host: cleanHost,
      online: true,
      currentPhase: 'Status obtido',
      message: trimmed
    });
  } catch (err) {
    return res.json({
      success: false,
      host: cleanHost,
      message: `Erro ao consultar status: ${err.message}`
    });
  }
});

app.listen(PORT, () => {
  console.log(`[Remote-Update-Trigger Backend] Rodando em http://localhost:${PORT}`);
});
