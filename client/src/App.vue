<template>
  <div class="app-layout">
    <!-- Header Principal -->
    <header class="app-header">
      <div class="header-inner">
        <div class="brand-group">
          <div class="brand-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <div class="brand-title-line">
              <h1 class="brand-title">Remote-Update-Trigger</h1>
              <span class="badge-version">v1.3 Dados Reais</span>
            </div>
            <p class="brand-tagline">Disparo e telemetria 100% real do Windows Update via WinRM (sem dados fictícios ou misturados)</p>
          </div>
        </div>

        <div class="header-status-box">
          <div class="status-indicator" :class="{ 'is-online': serverOnline, 'is-offline': !serverOnline }">
            <span class="status-indicator-dot"></span>
            <span class="status-indicator-text">
              {{ serverOnline ? 'Backend Conectado (Porta 3001)' : 'Aguardando Backend...' }}
            </span>
          </div>
        </div>
      </div>
    </header>

    <!-- Barra de Monitoramento Ativo (1 em 1 minuto) -->
    <section v-if="machines.length > 0" class="card monitor-banner">
      <div class="monitor-banner-content">
        <div class="monitor-status-col">
          <div class="monitor-title-group">
            <div class="monitor-pulse-badge" :class="{ 'active': monitoringActive, 'paused': !monitoringActive }">
              <span class="pulse-core"></span>
              <span class="pulse-label">
                {{ monitoringActive ? 'Monitoramento Contínuo Ativo (1 em 1 min)' : 'Monitoramento Pausado' }}
              </span>
            </div>
            <p class="monitor-subtext">
              Consultando telemetria real de cada computador: <strong>Eventos reais de varredura</strong>, <strong>Processos ativos</strong>, <strong>KBs do Windows</strong> e <strong>Reinicialização necessária</strong>.
            </p>
          </div>
        </div>

        <div class="monitor-timer-col">
          <div v-if="monitoringActive" class="countdown-badge">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span v-if="!isPollingNow">Próxima consulta em: <strong>{{ countdownSeconds }}s</strong></span>
            <span v-else class="text-blue font-bold">Consultando telemetria agora...</span>
          </div>

          <div class="monitor-actions">
            <button
              class="btn btn-outline btn-sm"
              :class="{ 'is-loading': isPollingNow }"
              @click="pollAllMachinesNow"
              :disabled="isPollingNow"
              title="Executar verificação imediata de todas as máquinas"
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                :class="{ 'spin-infinite': isPollingNow }"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{{ isPollingNow ? 'Consultando...' : 'Consultar Agora' }}</span>
            </button>

            <button
              v-if="monitoringActive"
              class="btn btn-danger-action btn-sm"
              @click="toggleMonitoring(false)"
              title="Pausar o ciclo automático de 1 minuto"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="6" width="12" height="12"></rect>
              </svg>
              Encerrar Consulta Manualmente
            </button>

            <button
              v-else
              class="btn btn-primary-action btn-sm"
              @click="toggleMonitoring(true)"
              title="Ativar o ciclo automático de 1 minuto"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Ativar Monitoramento (1 min)
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Corpo Principal com Respiros Generosos -->
    <main class="main-content">
      <!-- Cards de Métricas e Estatísticas -->
      <section class="stats-row" aria-label="Estatísticas">
        <div class="stat-card">
          <div class="stat-icon-wrapper bg-blue-subtle text-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div class="stat-details">
            <span class="stat-label">Total de Máquinas</span>
            <span class="stat-number">{{ machines.length }}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper bg-emerald-subtle text-emerald">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="stat-details">
            <span class="stat-label">Online (Ping OK)</span>
            <span class="stat-number text-emerald">{{ stats.online }}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper bg-rose-subtle text-rose">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div class="stat-details">
            <span class="stat-label">Offline (Sem Ping)</span>
            <span class="stat-number text-rose">{{ stats.offline }}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper bg-sky-subtle text-sky">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="stat-details">
            <span class="stat-label">Disparo Efetuado</span>
            <span class="stat-number text-sky">{{ stats.completed }}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper bg-amber-subtle text-amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="stat-details">
            <span class="stat-label">Requer Reinicialização</span>
            <span class="stat-number text-rose">{{ stats.rebootRequired }}</span>
          </div>
        </div>
      </section>

      <!-- Painel de Entrada de Hosts -->
      <section class="card panel-entry">
        <div class="panel-heading">
          <div>
            <h2 class="section-title">Gerenciador de Computadores</h2>
            <p class="section-subtitle">Informe os computadores da rede (ex: rioce03, rioinf05). Os dados de cada máquina são isolados e persistidos.</p>
          </div>
          <div class="panel-quick-actions">
            <button class="btn btn-outline" @click="loadSampleList" :disabled="isRunning">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Exemplo
            </button>
            <button class="btn btn-outline" @click="clearAll" :disabled="isRunning">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Limpar Lista
            </button>
          </div>
        </div>

        <div class="entry-box">
          <div class="textarea-container">
            <textarea
              v-model="rawHostList"
              placeholder="Cole os computadores aqui (um por linha):&#10;rioce03&#10;rioinf05&#10;PC-FINANCEIRO-01"
              rows="3"
              class="clear-textarea font-mono"
              :disabled="isRunning"
            ></textarea>
            <div class="textarea-badge">
              <strong>{{ parsedHostCount }}</strong> máquina(s) no campo
            </div>
          </div>

          <div class="actions-bar">
            <button class="btn btn-secondary" @click="loadList" :disabled="isRunning || !rawHostList.trim()">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Adicionar à Lista
            </button>

            <button
              class="btn btn-primary-action"
              @click="startScanAndUpdate"
              :disabled="isRunning || machines.length === 0"
            >
              <template v-if="!isRunning">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Disparar Verificação Online (Microsoft Update)
              </template>
              <template v-else>
                <span class="btn-spinner"></span>
                Disparando no host {{ currentIndex + 1 }} de {{ machines.length }}...
              </template>
            </button>

            <button
              v-if="isRunning"
              class="btn btn-danger-action"
              @click="cancelExecution"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="6" width="12" height="12"></rect>
              </svg>
              Interromper
            </button>
          </div>
        </div>

        <!-- Progresso do Disparo Inicial -->
        <div v-if="machines.length > 0 && (isRunning || progressPercent > 0)" class="progress-container">
          <div class="progress-labels">
            <span class="progress-status-text">
              {{ isRunning ? 'Executando disparo sequencial...' : 'Disparo concluído' }}
            </span>
            <span class="progress-numbers font-mono">{{ progressPercent }}% ({{ processedCount }} de {{ machines.length }})</span>
          </div>
          <div class="progress-rail">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
        </div>
      </section>

      <!-- Painel de Acompanhamento Moderno e Minimalista -->
      <section class="card panel-results">
        <div class="panel-header-toolbar">
          <div class="panel-title-group">
            <h3 class="section-title">Computadores da Rede</h3>
            <span class="badge-count">{{ filteredMachines.length }} computadores</span>
          </div>

          <div class="panel-controls-group">
            <!-- Filtros Segmentados -->
            <div class="segmented-filters">
              <button
                v-for="filter in filters"
                :key="filter.id"
                class="filter-button"
                :class="{ active: currentFilter === filter.id }"
                @click="currentFilter = filter.id"
              >
                {{ filter.label }}
                <span class="filter-qty">{{ getFilterCount(filter.id) }}</span>
              </button>
            </div>

            <!-- Busca Rápida -->
            <div class="search-field">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                v-model="searchQuery"
                placeholder="Filtrar por nome, KB ou status..."
                class="search-input"
              />
            </div>

            <!-- Alternador de Visualização: Cards ou Tabela -->
            <div class="view-switcher">
              <button
                class="view-switch-btn"
                :class="{ active: viewMode === 'cards' }"
                @click="viewMode = 'cards'"
                title="Visualização em Cards Espaçosos"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
                  <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
                  <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
                  <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
                </svg>
                <span>Cards</span>
              </button>
              <button
                class="view-switch-btn"
                :class="{ active: viewMode === 'table' }"
                @click="viewMode = 'table'"
                title="Visualização em Tabela Detalhada"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                <span>Tabela</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Estado Vazio -->
        <div v-if="filteredMachines.length === 0" class="empty-state-box">
          <div class="empty-icon-circle">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <h4 class="empty-heading">Nenhum computador encontrado</h4>
          <p class="empty-text">Adicione os computadores no gerenciador acima ou ajuste os filtros da pesquisa.</p>
        </div>

        <!-- 1. MODO CARDS ESPAÇOSOS (Moderna e Minimalista com Alto Respiro) -->
        <div v-else-if="viewMode === 'cards'" class="machines-grid">
          <div
            v-for="item in filteredMachines"
            :key="item.id"
            class="machine-card"
            :class="{ 'card-running': isRunning && currentIndex === item.originalIndex, 'card-querying': item.isQuerying }"
          >
            <!-- Topo do Card: Identificação e Status de Rede -->
            <div class="machine-card-header">
              <div class="machine-id-col">
                <div class="machine-host-title">
                  <span class="machine-host-name font-mono">{{ item.host }}</span>
                  <button class="btn-copy-icon" @click="copyText(item.host)" title="Copiar Hostname">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                    </svg>
                  </button>
                  <span v-if="item.computerName && item.computerName.toLowerCase() !== item.host.toLowerCase()" class="netbios-pill font-mono">
                    {{ item.computerName }}
                  </span>
                </div>
                <div class="machine-os-info">
                  <span class="os-text">{{ item.osCaption || 'Windows' }}</span>
                  <span v-if="item.osBuild" class="build-tag font-mono">Build {{ item.osBuild }}</span>
                </div>
              </div>

              <div class="machine-ping-col">
                <span v-if="item.pingStatus === 'online'" class="status-pill pill-online">
                  <span class="status-dot"></span> Online
                </span>
                <span v-else-if="item.pingStatus === 'offline'" class="status-pill pill-offline">
                  <span class="status-dot"></span> Offline
                </span>
                <span v-else-if="item.pingStatus === 'testing'" class="status-pill pill-testing">
                  <span class="status-dot dot-pulse"></span> Testando...
                </span>
                <span v-else class="status-pill pill-pending">
                  <span class="status-dot"></span> Pendente
                </span>
              </div>
            </div>

            <!-- Corpo do Card: Fase e Indicadores -->
            <div class="machine-card-body">
              <!-- 1. HERO STATUS BANNER: Destaque visual inconfundível do estado atual -->
              <div class="status-hero-card" :class="getStageHero(item).cardClass">
                <div class="hero-top-row">
                  <div class="hero-icon-title">
                    <span class="hero-icon" :class="'icon-' + getStageHero(item).type">
                      <svg v-if="getStageHero(item).type === 'scanning'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" class="spin-infinite">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      <svg v-else-if="getStageHero(item).type === 'downloading'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" class="bounce-subtle">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      <svg v-else-if="getStageHero(item).type === 'installing'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" class="spin-infinite">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                      </svg>
                      <svg v-else-if="getStageHero(item).type === 'completed'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <svg v-else-if="getStageHero(item).type === 'reboot_pending'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <svg v-else-if="getStageHero(item).type === 'error'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      </svg>
                      <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </span>
                    <div class="hero-titles">
                      <h4 class="hero-headline">{{ getStageHero(item).title }}</h4>
                      <p class="hero-desc">{{ getStageHero(item).description }}</p>
                    </div>
                  </div>
                  <span class="hero-badge" :class="getStageHero(item).badgeClass">
                    <span v-if="['scanning', 'downloading', 'installing'].includes(item.stage)" class="hero-dot-pulse"></span>
                    {{ getStageHero(item).badge }}
                  </span>
                </div>

                <!-- 2. STEPPER VISUAL HORIZONTAL: 1. Varredura ──▶ 2. Download ──▶ 3. Instalação ──▶ 4. Conclusão -->
                <div class="stepper-horizontal">
                  <div
                    v-for="(step, sIdx) in getMachineSteps(item)"
                    :key="sIdx"
                    class="stepper-step"
                    :class="['step-' + step.status]"
                  >
                    <div class="step-indicator">
                      <span v-if="step.status === 'done'" class="step-check">✔</span>
                      <span v-else-if="step.status === 'active'" class="step-active-dot"></span>
                      <span v-else-if="step.status === 'error'" class="step-error-x">✖</span>
                      <span v-else-if="step.status === 'reboot'" class="step-reboot-icon">⚠️</span>
                      <span v-else class="step-num">{{ sIdx + 1 }}</span>
                    </div>
                    <span class="step-label">{{ step.label }}</span>
                    <div v-if="sIdx < 3" class="step-connector" :class="{ 'connector-done': step.status === 'done' }"></div>
                  </div>
                </div>

                <!-- 3. BARRA DE PROGRESSO ANIMADA -->
                <div v-if="item.stage && item.stage !== 'idle'" class="hero-progress-section">
                  <div class="hero-progress-header">
                    <span class="hero-progress-label">
                      {{ item.stageTitle || item.currentPhase || 'Progresso da Operação' }}
                    </span>
                    <span class="hero-progress-pct font-mono">{{ item.progress || 0 }}%</span>
                  </div>
                  <div class="hero-progress-track">
                    <div
                      class="hero-progress-fill"
                      :class="{
                        'fill-active': ['scanning', 'downloading', 'installing'].includes(item.stage),
                        'fill-completed': item.stage === 'completed',
                        'fill-reboot': item.stage === 'reboot_pending',
                        'fill-error': item.stage === 'error'
                      }"
                      :style="{ width: Math.max(item.progress || 0, 5) + '%' }"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- ALERTA DE REINICIALIZAÇÃO (Se pendente) -->
              <div v-if="item.rebootRequired === true" class="alert-box alert-reboot">
                <div class="alert-icon-col text-rose">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div class="alert-text-col">
                  <div class="alert-headline text-rose">Reinicialização Necessária</div>
                  <div class="alert-description">{{ item.rebootReason || 'O Windows Update concluiu a instalação e requer reinício da máquina.' }}</div>
                </div>
              </div>

              <!-- 4. LISTA DE ATUALIZAÇÕES DETALHADA COM STATUS INDIVIDUAL (Baixado, Instalado, etc.) -->
              <div v-if="getNormalizedUpdates(item).length > 0" class="detailed-updates-card">
                <div class="updates-card-header">
                  <div class="updates-header-left">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    <span class="updates-header-title">Microsoft Update Online</span>
                  </div>
                  <span class="updates-count-badge font-mono">{{ getNormalizedUpdates(item).length }} pacotes</span>
                </div>

                <div class="updates-list-body">
                  <div
                    v-for="(up, upIdx) in getNormalizedUpdates(item).slice(0, 4)"
                    :key="upIdx"
                    class="update-row-item"
                  >
                    <div class="update-title-col font-mono" :title="up.Title">
                      <span class="update-bullet">›</span>
                      <span class="update-text">{{ up.Title }}</span>
                    </div>
                    <span class="update-status-tag" :class="getUpdateTagClass(up.Status)">
                      <span v-if="up.Status === 'Instalado'" class="tag-icon">✔</span>
                      <span v-else-if="up.Status === 'Baixado'" class="tag-icon">⬇</span>
                      <span v-else-if="up.Status && up.Status.includes('Instalando')" class="tag-icon spin-infinite">⚙</span>
                      <span v-else-if="up.Status && up.Status.includes('Falha')" class="tag-icon">✖</span>
                      {{ up.Status }}
                    </span>
                  </div>
                  <div v-if="getNormalizedUpdates(item).length > 4" class="updates-more-row">
                    <button class="btn-more-link" @click="openDetailsModal(item)">
                      + {{ getNormalizedUpdates(item).length - 4 }} outra(s) atualização(ões)... (Ver Detalhes)
                    </button>
                  </div>
                </div>
              </div>

              <!-- Resumo Operacional Recente / Log (Quando não houver atualizações na nuvem) -->
              <div v-else-if="item.recentSummary" class="alert-box alert-info">
                <div class="alert-icon-col text-blue">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </div>
                <div class="alert-text-col">
                  <div class="alert-headline text-blue">Telemetria Recente</div>
                  <div class="alert-description font-mono">{{ item.recentSummary }}</div>
                </div>
              </div>

              <div v-else-if="item.log" class="simple-log-strip font-mono">
                {{ item.log }}
              </div>
            </div>

            <!-- Rodapé do Card: Horário e Ações com Respiro -->
            <div class="machine-card-footer">
              <div class="card-timestamp">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Última consulta: <strong>{{ item.lastCheck || 'Agora' }}</strong></span>
              </div>

              <div class="card-actions-group">
                <button
                  class="btn-action-minimal"
                  :class="{ 'is-loading': item.isQuerying, 'is-success': item.justUpdated }"
                  @click="checkSingleHostStatus(item.originalIndex)"
                  :disabled="isRunning || item.isQuerying"
                  title="Consultar status deste computador agora"
                >
                  <svg
                    v-if="!item.justUpdated"
                    viewBox="0 0 24 24"
                    width="13"
                    height="13"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                    :class="{ 'spin-infinite': item.isQuerying }"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#16a34a" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>{{ item.isQuerying ? 'Consultando...' : (item.justUpdated ? 'Atualizado!' : 'Consultar') }}</span>
                </button>

                <button
                  class="btn-action-primary-sm"
                  @click="openDetailsModal(item)"
                  title="Abrir telemetria detalhada e histórico"
                >
                  Ver Detalhes
                </button>

                <button
                  class="btn-action-delete"
                  @click="removeMachine(item.originalIndex)"
                  :disabled="isRunning"
                  title="Remover máquina da lista"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. MODO TABELA ESPAÇOSA (Com rolagem horizontal para nunca amassar os dados) -->
        <div v-else class="table-wrapper-spacious">
          <table class="clear-table">
            <thead>
              <tr>
                <th style="width: 46px;">#</th>
                <th style="width: 220px;">Computador / Sistema</th>
                <th style="width: 120px;">Status Ping</th>
                <th style="width: 220px;">Progresso / Fase Atual</th>
                <th style="width: 170px;">Reinicialização?</th>
                <th style="min-width: 320px;">O que está atualizando / Telemetria Real</th>
                <th style="width: 140px; text-align: center;">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in filteredMachines"
                :key="item.id"
                class="table-row"
                :class="{ 'row-active': isRunning && currentIndex === item.originalIndex }"
              >
                <!-- Índice -->
                <td class="col-seq font-mono">{{ item.originalIndex + 1 }}</td>

                <!-- Hostname / IP com Identidade Real -->
                <td class="col-host">
                  <div class="host-pill-group">
                    <div class="host-title-line">
                      <span class="host-tag font-mono">{{ item.host }}</span>
                      <button class="btn-copy-icon" @click="copyText(item.host)" title="Copiar host">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                        </svg>
                      </button>
                    </div>
                    <div v-if="item.osCaption" class="os-mini-caption">
                      {{ item.osCaption }} {{ item.osBuild ? `(Build ${item.osBuild})` : '' }}
                    </div>
                  </div>
                </td>

                <!-- Status Ping -->
                <td class="col-status">
                  <span v-if="item.pingStatus === 'online'" class="status-badge badge-success">
                    <span class="badge-dot"></span> Online
                  </span>
                  <span v-else-if="item.pingStatus === 'offline'" class="status-badge badge-danger">
                    <span class="badge-dot"></span> Offline
                  </span>
                  <span v-else-if="item.pingStatus === 'testing'" class="status-badge badge-running">
                    <span class="badge-dot dot-pulse"></span> Pingando...
                  </span>
                  <span v-else class="status-badge badge-pending">
                    <span class="badge-dot"></span> Pendente
                  </span>
                </td>

                <!-- Progresso / Fase Real -->
                <td class="col-phase">
                  <div class="table-phase-cell">
                    <span class="hero-badge" :class="getStageHero(item).badgeClass">
                      <span v-if="['scanning', 'downloading', 'installing'].includes(item.stage)" class="hero-dot-pulse"></span>
                      {{ getStageHero(item).badge }}
                    </span>
                    <div v-if="item.stage && item.stage !== 'idle'" class="table-mini-progress">
                      <div
                        class="table-mini-fill"
                        :class="item.stage"
                        :style="{ width: Math.max(item.progress || 0, 8) + '%' }"
                      ></div>
                    </div>
                  </div>
                </td>

                <!-- Precisa de Reinicialização? -->
                <td class="col-reboot">
                  <span v-if="item.rebootRequired === true" class="status-badge badge-reboot-required" :title="item.rebootReason || 'Reinicialização pendente'">
                    <span class="badge-dot dot-pulse"></span>
                    ⚠️ Reinício Necessário
                  </span>
                  <span v-else-if="item.rebootRequired === false" class="status-badge badge-reboot-ok">
                    <span class="badge-dot"></span>
                    Não Necessária
                  </span>
                  <span v-else class="status-badge badge-pending">
                    <span class="badge-dot"></span>
                    Não Verificado
                  </span>
                </td>

                <!-- O que está atualizando / Telemetria Real -->
                <td class="col-details">
                  <div
                    class="table-telemetry-box clickable"
                    @click="openDetailsModal(item)"
                    title="Clique para ver detalhes completos"
                  >
                    <!-- Alerta inline para Microsoft Update Online com tags de status -->
                    <div v-if="getNormalizedUpdates(item).length > 0" class="table-online-strip">
                      <div class="table-online-badge-line">
                        <span class="online-pill-tag">🌐 Microsoft Update Online</span>
                        <span class="online-pill-count">{{ getNormalizedUpdates(item).length }} pacotes</span>
                      </div>
                      <div class="table-kbs-inline">
                        <span v-for="(up, uIdx) in getNormalizedUpdates(item).slice(0, 2)" :key="uIdx" class="table-kb-badge">
                          <span class="tag-bullet">›</span> {{ up.Title }}
                          <span class="tag-status-mini" :class="getUpdateTagClass(up.Status)">{{ up.Status }}</span>
                        </span>
                        <span v-if="getNormalizedUpdates(item).length > 2" class="table-more-hint">+{{ getNormalizedUpdates(item).length - 2 }} mais...</span>
                      </div>
                    </div>
                    <!-- Resumo Operacional Real -->
                    <div v-else-if="item.recentSummary" class="table-summary-text">
                      📢 {{ item.recentSummary }}
                    </div>
                    <div v-else-if="item.updatesFound !== null && item.updatesFound !== undefined" class="table-summary-text">
                      🔍 {{ item.updatesFound > 0 ? `${item.updatesFound} atualização(ões) encontrada(s)` : '0 atualizações pendentes (Sistema em dia)' }}
                    </div>
                    <div v-else-if="item.history && item.history.length > 0" class="table-kb-text font-mono">
                      🛡️ Última KB: {{ item.history[0].Title }}
                    </div>
                    <div v-else class="table-subtle-log font-mono">
                      {{ item.log || 'Aguardando telemetria...' }}
                    </div>

                    <span class="log-hint-text">ver detalhes</span>
                  </div>
                </td>

                <!-- Ações -->
                <td class="col-action" style="text-align: center;">
                  <div class="row-actions">
                    <button
                      class="btn btn-outline btn-xs"
                      :class="{ 'is-loading': item.isQuerying, 'is-success': item.justUpdated }"
                      @click="checkSingleHostStatus(item.originalIndex)"
                      :disabled="isRunning || item.isQuerying"
                      title="Consultar status deste computador agora"
                    >
                      <svg
                        v-if="!item.justUpdated"
                        viewBox="0 0 24 24"
                        width="11"
                        height="11"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.2"
                        :class="{ 'spin-infinite': item.isQuerying }"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <svg v-else viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#16a34a" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>{{ item.isQuerying ? 'Consultando...' : (item.justUpdated ? 'Atualizado!' : 'Consultar') }}</span>
                    </button>
                    <button
                      class="btn btn-danger-ghost btn-xs"
                      @click="removeMachine(item.originalIndex)"
                      :disabled="isRunning"
                      title="Remover máquina da lista"
                    >
                      &times;
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <!-- Modal Detalhado de Acompanhamento Real do Windows Update -->
    <div v-if="selectedItem" class="modal-overlay" @click="selectedItem = null">
      <div class="modal-dialog" @click.stop>
        <div class="modal-top">
          <div>
            <h3 class="modal-heading">Telemetria Real do Computador</h3>
            <p class="modal-subheading">
              Host: <strong class="font-mono text-blue">{{ selectedItem.host }}</strong>
              <span v-if="selectedItem.computerName && selectedItem.computerName !== selectedItem.host">
                (Nome NetBIOS: <span class="font-mono">{{ selectedItem.computerName }}</span>)
              </span>
              • Última consulta: <span class="font-mono">{{ selectedItem.lastCheck || 'Agora' }}</span>
            </p>
          </div>
          <button class="modal-close-button" @click="selectedItem = null">&times;</button>
        </div>

        <div class="modal-middle">
          <!-- Metadados da Máquina Real -->
          <div class="machine-meta-strip">
            <div class="meta-strip-item">
              <span class="meta-strip-label">Sistema Operacional:</span>
              <span class="meta-strip-value">{{ selectedItem.osCaption || 'Windows' }} {{ selectedItem.osBuild ? `(Build ${selectedItem.osBuild})` : '' }}</span>
            </div>
            <div class="meta-strip-item">
              <span class="meta-strip-label">Última Inicialização (Boot):</span>
              <span class="meta-strip-value font-mono">{{ selectedItem.lastBoot || 'N/A' }}</span>
            </div>
          </div>

          <!-- Destaque do Hero Status e Stepper no Modal -->
          <div class="status-hero-card" :class="getStageHero(selectedItem).cardClass">
            <div class="hero-top-row">
              <div class="hero-icon-title">
                <span class="hero-icon" :class="'icon-' + getStageHero(selectedItem).type">
                  <svg v-if="getStageHero(selectedItem).type === 'scanning'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" class="spin-infinite">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <svg v-else-if="getStageHero(selectedItem).type === 'downloading'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" class="bounce-subtle">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <svg v-else-if="getStageHero(selectedItem).type === 'installing'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" class="spin-infinite">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  <svg v-else-if="getStageHero(selectedItem).type === 'completed'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <svg v-else-if="getStageHero(selectedItem).type === 'reboot_pending'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <svg v-else-if="getStageHero(selectedItem).type === 'error'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </span>
                <div class="hero-titles">
                  <h4 class="hero-headline">{{ getStageHero(selectedItem).title }}</h4>
                  <p class="hero-desc">{{ getStageHero(selectedItem).description }}</p>
                </div>
              </div>
              <span class="hero-badge" :class="getStageHero(selectedItem).badgeClass">
                <span v-if="['scanning', 'downloading', 'installing'].includes(selectedItem.stage)" class="hero-dot-pulse"></span>
                {{ getStageHero(selectedItem).badge }}
              </span>
            </div>

            <!-- Stepper Horizontal -->
            <div class="stepper-horizontal">
              <div
                v-for="(step, sIdx) in getMachineSteps(selectedItem)"
                :key="sIdx"
                class="stepper-step"
                :class="['step-' + step.status]"
              >
                <div class="step-indicator">
                  <span v-if="step.status === 'done'" class="step-check">✔</span>
                  <span v-else-if="step.status === 'active'" class="step-active-dot"></span>
                  <span v-else-if="step.status === 'error'" class="step-error-x">✖</span>
                  <span v-else-if="step.status === 'reboot'" class="step-reboot-icon">⚠️</span>
                  <span v-else class="step-num">{{ sIdx + 1 }}</span>
                </div>
                <span class="step-label">{{ step.label }}</span>
                <div v-if="sIdx < 3" class="step-connector" :class="{ 'connector-done': step.status === 'done' }"></div>
              </div>
            </div>

            <!-- Barra de Progresso no Modal -->
            <div v-if="selectedItem.stage && selectedItem.stage !== 'idle'" class="hero-progress-section">
              <div class="hero-progress-header">
                <span class="hero-progress-label">
                  {{ selectedItem.stageTitle || selectedItem.currentPhase || 'Progresso da Operação' }}
                </span>
                <span class="hero-progress-pct font-mono">{{ selectedItem.progress || 0 }}%</span>
              </div>
              <div class="hero-progress-track">
                <div
                  class="hero-progress-fill"
                  :class="{
                    'fill-active': ['scanning', 'downloading', 'installing'].includes(selectedItem.stage),
                    'fill-completed': selectedItem.stage === 'completed',
                    'fill-reboot': selectedItem.stage === 'reboot_pending',
                    'fill-error': selectedItem.stage === 'error'
                  }"
                  :style="{ width: Math.max(selectedItem.progress || 0, 5) + '%' }"
                ></div>
              </div>
            </div>
          </div>

          <!-- 3 Indicadores Principais Solicitados -->
          <div class="modal-summary-grid">
            <div class="summary-box">
              <span class="summary-label">1. Precisa de Reinicialização?</span>
              <span v-if="selectedItem.rebootRequired === true" class="summary-val text-rose font-bold">
                ⚠️ SIM (Reboot Pendente)
              </span>
              <span v-else-if="selectedItem.rebootRequired === false" class="summary-val text-emerald font-bold">
                NÃO (Reinicialização não necessária)
              </span>
              <span v-else class="summary-val text-muted">
                Não verificado
              </span>
              <span v-if="selectedItem.rebootReason" class="summary-subreason">
                Motivo: {{ selectedItem.rebootReason }}
              </span>
            </div>

            <div class="summary-box">
              <span class="summary-label">2. Como está o Progresso?</span>
              <span class="summary-val text-blue font-bold">
                {{ selectedItem.currentPhase || 'Ocioso / Concluído' }}
              </span>
              <span class="summary-subreason">
                Serviço Windows Update: {{ selectedItem.wuauservStatus || 'N/A' }}
              </span>
            </div>

            <div class="summary-box">
              <span class="summary-label">3. Varredura Recente</span>
              <span v-if="selectedItem.updatesFound !== null && selectedItem.updatesFound !== undefined" class="summary-val font-bold" :class="selectedItem.updatesFound > 0 ? 'text-amber' : 'text-emerald'">
                {{ selectedItem.updatesFound }} atualização(ões)
              </span>
              <span v-else class="summary-val font-bold">
                Varredura executada
              </span>
              <span class="summary-subreason">
                {{ selectedItem.updatesFound > 0 ? 'Pacotes prontos para download' : 'Nenhuma atualização pendente' }}
              </span>
            </div>
          </div>

          <!-- ATUALIZAÇÕES DO MICROSOFT UPDATE ONLINE ENCONTRADAS COM STATUS DETALHADO -->
          <div v-if="getNormalizedUpdates(selectedItem).length > 0" class="detail-section online-highlight-section">
            <div class="online-section-header">
              <h4 class="detail-section-title text-blue">🌐 Atualizações do Microsoft Update Online (Nuvem)</h4>
              <span class="online-badge font-mono">{{ getNormalizedUpdates(selectedItem).length }} atualização(ões)</span>
            </div>
            <p class="online-section-sub">
              Buscadas diretamente no catálogo oficial da Microsoft (ignorando WSUS local) em {{ selectedItem.onlineLastCheck || 'recente' }}:
            </p>
            <div class="online-items-container">
              <div v-for="(up, idx) in getNormalizedUpdates(selectedItem)" :key="idx" class="online-item-card font-mono">
                <div class="online-item-content">
                  <span class="online-item-icon">⚡</span>
                  <span class="online-item-title">{{ up.Title }}</span>
                </div>
                <span class="update-status-tag" :class="getUpdateTagClass(up.Status)">
                  <span v-if="up.Status === 'Instalado'" class="tag-icon">✔</span>
                  <span v-else-if="up.Status === 'Baixado'" class="tag-icon">⬇</span>
                  <span v-else-if="up.Status && up.Status.includes('Instalando')" class="tag-icon spin-infinite">⚙</span>
                  <span v-else-if="up.Status && up.Status.includes('Falha')" class="tag-icon">✖</span>
                  {{ up.Status }}
                </span>
              </div>
            </div>
          </div>

          <!-- O QUE ESTÁ ATUALIZANDO: KBs Reais Instaladas do Windows -->
          <div class="detail-section">
            <h4 class="detail-section-title">Últimas Atualizações do Windows (KBs / HotFixes Reais)</h4>
            <div v-if="selectedItem.history && selectedItem.history.length > 0" class="history-table-box">
              <table class="history-table">
                <thead>
                  <tr>
                    <th>Código da Atualização (KB)</th>
                    <th style="width: 140px;">Data de Instalação</th>
                    <th style="width: 130px;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(h, idx) in selectedItem.history" :key="idx">
                    <td class="font-mono font-bold text-blue">{{ h.Title }}</td>
                    <td class="font-mono">{{ h.Date }}</td>
                    <td>
                      <span class="badge-result success">
                        {{ h.Result }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-subbox">
              <span>Consultando lista de KBs instaladas no computador...</span>
            </div>
          </div>

          <!-- Eventos Reais do Windows Update Client da Máquina -->
          <div v-if="selectedItem.recentEvents && selectedItem.recentEvents.length > 0" class="detail-section">
            <h4 class="detail-section-title">Log Operacional Real do Windows Update neste Computador</h4>
            <div class="events-list">
              <div v-for="(ev, idx) in selectedItem.recentEvents" :key="idx" class="event-item">
                <span class="event-time font-mono">{{ ev.Time }}</span>
                <span class="event-msg">{{ ev.Message }}</span>
              </div>
            </div>
          </div>

          <!-- Log Bruto da Execução -->
          <div class="detail-section">
            <div class="log-terminal-frame">
              <div class="log-terminal-bar">
                <span class="terminal-title">Console de Disparo / Último Retorno</span>
                <button class="btn btn-outline btn-xs" @click="copyText(selectedItem.log)">Copiar</button>
              </div>
              <pre class="log-terminal-body font-mono">{{ selectedItem.log || 'Sem mensagens adicionais.' }}</pre>
            </div>
          </div>
        </div>

        <div class="modal-bottom">
          <button class="btn btn-secondary" @click="selectedItem = null">Fechar Detalhes</button>
        </div>
      </div>
    </div>

    <!-- Toast de Notificação -->
    <div v-if="toastMessage" class="toast-popup">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

// Chaves de Armazenamento Local (v2 para descartar cache antigo corrompido)
const STORAGE_MACHINES_KEY = 'remote_update_machines_v2';
const STORAGE_MONITORING_KEY = 'remote_update_monitoring_active_v2';

// Estado Reativo
const serverOnline = ref(false);
const rawHostList = ref('');
const machines = ref([]);
const isRunning = ref(false);
const isCancelled = ref(false);
const currentIndex = ref(-1);
const selectedItem = ref(null);
const toastMessage = ref('');
const searchQuery = ref('');
const currentFilter = ref('all');
const viewMode = ref('cards'); // 'cards' (padrão espaçoso) ou 'table' (tabela detalhada)

// Estado do Monitoramento de 1 em 1 Minuto
const monitoringActive = ref(true);
const countdownSeconds = ref(60);
const isPollingNow = ref(false);
let timerInterval = null;

// Filtros Disponíveis
const filters = [
  { id: 'all', label: 'Todos' },
  { id: 'online', label: 'Online' },
  { id: 'offline', label: 'Offline' },
  { id: 'working', label: 'Atualizando' },
  { id: 'reboot', label: 'Requer Reinicialização' }
];

// Contador de hosts na textarea
const parsedHostCount = computed(() => {
  if (!rawHostList.value) return 0;
  return rawHostList.value
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0).length;
});

// Estatísticas Agregadas
const stats = computed(() => {
  let online = 0;
  let offline = 0;
  let completed = 0;
  let rebootRequired = 0;
  let working = 0;

  for (const m of machines.value) {
    if (m.pingStatus === 'online') online++;
    if (m.pingStatus === 'offline') offline++;
    if (m.updateStatus === 'completed') completed++;
    if (m.rebootRequired === true) rebootRequired++;
    if (m.isWorking === true) working++;
  }

  return { online, offline, completed, rebootRequired, working };
});

// Percentual de progresso do disparo
const processedCount = computed(() => {
  return machines.value.filter(m => m.pingStatus !== 'pending' && m.pingStatus !== 'testing').length;
});

const progressPercent = computed(() => {
  if (machines.value.length === 0) return 0;
  return Math.round((processedCount.value / machines.value.length) * 100);
});

// Lista filtrada e buscável
const filteredMachines = computed(() => {
  let list = machines.value.map((item, originalIndex) => ({
    ...item,
    originalIndex
  }));

  if (currentFilter.value === 'online') {
    list = list.filter(m => m.pingStatus === 'online');
  } else if (currentFilter.value === 'offline') {
    list = list.filter(m => m.pingStatus === 'offline');
  } else if (currentFilter.value === 'working') {
    list = list.filter(m => m.isWorking || (m.currentPhase && !m.currentPhase.includes('Ocioso') && !m.currentPhase.includes('em dia')));
  } else if (currentFilter.value === 'reboot') {
    list = list.filter(m => m.rebootRequired === true);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(m =>
      m.host.toLowerCase().includes(q) ||
      (m.osCaption && m.osCaption.toLowerCase().includes(q)) ||
      (m.log && m.log.toLowerCase().includes(q)) ||
      (m.currentPhase && m.currentPhase.toLowerCase().includes(q))
    );
  }

  return list;
});

function getFilterCount(filterId) {
  if (filterId === 'all') return machines.value.length;
  if (filterId === 'online') return stats.value.online;
  if (filterId === 'offline') return stats.value.offline;
  if (filterId === 'working') return stats.value.working;
  if (filterId === 'reboot') return stats.value.rebootRequired;
  return 0;
}

// Persistência segura isolada por máquina
function persistState() {
  try {
    localStorage.setItem(STORAGE_MACHINES_KEY, JSON.stringify(machines.value));
    localStorage.setItem(STORAGE_MONITORING_KEY, JSON.stringify(monitoringActive.value));

    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machines: machines.value,
        monitoringActive: monitoringActive.value
      })
    }).catch(() => {});
  } catch (err) {
    console.error('Erro ao persistir estado:', err);
  }
}

function cleanMojibake(val) {
  if (typeof val === 'string') {
    return val
      .replace(/Ã£/g, 'ã')
      .replace(/Ã§/g, 'ç')
      .replace(/Ãµ/g, 'õ')
      .replace(/Ã©/g, 'é')
      .replace(/Ãª/g, 'ê')
      .replace(/Ã¡/g, 'á')
      .replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/Ãº/g, 'ú')
      .replace(/Ã€/g, 'À')
      .replace(/Â/g, '');
  }
  if (Array.isArray(val)) {
    return val.map(item => {
      if (typeof item === 'string') return cleanMojibake(item);
      if (item && typeof item === 'object') {
        const cleaned = {};
        for (const k in item) {
          cleaned[k] = cleanMojibake(item[k]);
        }
        return cleaned;
      }
      return item;
    });
  }
  return val;
}

// Restaura estado inicial
async function restoreState() {
  let restored = false;

  try {
    const savedMachines = localStorage.getItem(STORAGE_MACHINES_KEY);
    const savedMonitoring = localStorage.getItem(STORAGE_MONITORING_KEY);

    if (savedMachines) {
      const parsed = JSON.parse(savedMachines);
      if (Array.isArray(parsed) && parsed.length > 0) {
        machines.value = parsed.map(m => ({
          ...m,
          currentPhase: cleanMojibake(m.currentPhase),
          stageTitle: cleanMojibake(m.stageTitle),
          recentSummary: cleanMojibake(m.recentSummary),
          detailedUpdates: cleanMojibake(m.detailedUpdates || []),
          onlineUpdates: cleanMojibake(m.onlineUpdates || [])
        }));
        restored = true;
      }
    }

    if (savedMonitoring !== null) {
      monitoringActive.value = JSON.parse(savedMonitoring);
    }

    const savedView = localStorage.getItem('remote_update_view_mode');
    if (savedView) {
      viewMode.value = savedView;
    }
  } catch (e) {
    console.warn('Erro ao ler LocalStorage:', e);
  }

  if (!restored) {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.machines) && data.machines.length > 0) {
          machines.value = data.machines.map(m => ({
            ...m,
            currentPhase: cleanMojibake(m.currentPhase),
            stageTitle: cleanMojibake(m.stageTitle),
            recentSummary: cleanMojibake(m.recentSummary),
            detailedUpdates: cleanMojibake(m.detailedUpdates || []),
            onlineUpdates: cleanMojibake(m.onlineUpdates || [])
          }));
          if (data.monitoringActive !== undefined) {
            monitoringActive.value = data.monitoringActive;
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao restaurar do servidor:', e);
    }
  }
}

watch(machines, () => {
  persistState();
}, { deep: true });

watch(monitoringActive, () => {
  persistState();
});

watch(viewMode, (newMode) => {
  try {
    localStorage.setItem('remote_update_view_mode', newMode);
  } catch (e) {}
});

async function checkBackendHealth() {
  try {
    const res = await fetch('/api/health');
    serverOnline.value = res.ok;
  } catch {
    serverOnline.value = false;
  }
}

function loadList() {
  const lines = rawHostList.value
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const existingHosts = new Set(machines.value.map(m => m.host.toLowerCase()));
  let addedCount = 0;

  for (const host of lines) {
    if (!existingHosts.has(host.toLowerCase())) {
      machines.value.push({
        id: `${host}-${Date.now()}-${Math.random()}`,
        host,
        computerName: host,
        osCaption: '',
        osBuild: '',
        lastBoot: '',
        pingStatus: 'pending',
        updateStatus: 'pending',
        currentPhase: 'Aguardando Disparo',
        stage: 'idle',
        stageTitle: 'Aguardando Disparo',
        progress: 0,
        currentUpdate: '',
        detailedUpdates: [],
        pipelineError: '',
        isPipelineActive: false,
        rebootRequired: null,
        rebootReason: '',
        isWorking: false,
        wuauservStatus: '',
        recentSummary: '',
        updatesFound: null,
        history: [],
        recentEvents: [],
        log: '',
        lastCheck: '',
        timestamp: ''
      });
      existingHosts.add(host.toLowerCase());
      addedCount++;
    }
  }

  currentIndex.value = -1;
  persistState();
  showToast(`${addedCount} máquina(s) adicionada(s).`);
}

function loadSampleList() {
  rawHostList.value = [
    'rioce03',
    'rioinf05'
  ].join('\n');
}

function clearAll() {
  rawHostList.value = '';
  machines.value = [];
  currentIndex.value = -1;
  searchQuery.value = '';
  currentFilter.value = 'all';
  persistState();
  showToast('Lista de computadores esvaziada.');
}

function removeMachine(index) {
  if (isRunning.value) return;
  machines.value.splice(index, 1);
  persistState();
}

async function startScanAndUpdate() {
  if (machines.value.length === 0 || isRunning.value) return;

  isRunning.value = true;
  isCancelled.value = false;

  for (let i = 0; i < machines.value.length; i++) {
    if (isCancelled.value) {
      showToast('Execução interrompida pelo operador.');
      break;
    }

    currentIndex.value = i;
    const machine = machines.value[i];
    await executeForMachine(machine);
  }

  currentIndex.value = -1;
  isRunning.value = false;
  persistState();

  if (!isCancelled.value) {
    showToast('Disparo concluído! Iniciando consulta contínua das máquinas.');
    monitoringActive.value = true;
    pollAllMachinesNow();
  }
}

async function executeForMachine(machine) {
  machine.pingStatus = 'testing';
  machine.updateStatus = 'pending';
  machine.stage = 'scanning';
  machine.stageTitle = 'Testando conectividade de rede (Ping)...';
  machine.progress = 5;
  machine.log = 'Executando teste de ping (ICMP)...';
  machine.timestamp = new Date().toLocaleTimeString('pt-BR');

  try {
    const pingRes = await fetch('/api/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: machine.host })
    });

    if (!pingRes.ok) {
      const errData = await pingRes.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${pingRes.status} no ping`);
    }

    const pingData = await pingRes.json();

    if (pingData.online) {
      machine.pingStatus = 'online';
      machine.updateStatus = 'running';
      machine.stage = 'scanning';
      machine.stageTitle = 'Disparando verificação online na nuvem Microsoft...';
      machine.progress = 15;
      machine.log = 'Ping respondido (Online). Disparando Windows Update...';

      const updateRes = await fetch('/api/trigger-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: machine.host })
      });

      const updateData = await updateRes.json().catch(() => ({
        success: false,
        message: 'Resposta inválida do servidor.'
      }));

      machine.timestamp = new Date().toLocaleTimeString('pt-BR');

      if (updateData.success) {
        machine.updateStatus = 'completed';
        machine.stage = 'downloading';
        machine.stageTitle = 'Varredura online disparada com êxito! Iniciando pipeline...';
        machine.progress = 25;
        machine.currentPhase = 'Disparo Concluído';
        machine.log = updateData.message || 'Verificação online de atualizações disparada com sucesso.';
      } else {
        machine.updateStatus = 'error';
        machine.stage = 'error';
        machine.stageTitle = 'Falha no Disparo';
        machine.pipelineError = updateData.message;
        machine.currentPhase = 'Falha no Disparo';
        machine.log = updateData.message || 'Falha ao disparar Windows Update remotamente via WinRM.';
      }
    } else {
      machine.pingStatus = 'offline';
      machine.updateStatus = 'skipped';
      machine.stage = 'idle';
      machine.currentPhase = 'Ignorado (Offline)';
      machine.timestamp = new Date().toLocaleTimeString('pt-BR');
      machine.log = 'Sem resposta ao Ping (Offline). Ação remota ignorada.';
    }
  } catch (err) {
    machine.pingStatus = 'offline';
    machine.updateStatus = 'error';
    machine.stage = 'error';
    machine.stageTitle = 'Erro de Comunicação';
    machine.pipelineError = err.message;
    machine.currentPhase = 'Erro de Comunicação';
    machine.timestamp = new Date().toLocaleTimeString('pt-BR');
    machine.log = `Erro de comunicação: ${err.message}`;
  }
}

async function pollAllMachinesNow() {
  if (isPollingNow.value || machines.value.length === 0) return;

  isPollingNow.value = true;

  try {
    // Itera sequencialmente garantindo isolamento total por máquina
    for (let i = 0; i < machines.value.length; i++) {
      const m = machines.value[i];
      await queryHostStatus(m);
    }
    countdownSeconds.value = 60;
    persistState();
  } finally {
    isPollingNow.value = false;
  }
}

async function checkSingleHostStatus(index) {
  const m = machines.value[index];
  if (!m || m.isQuerying) return;

  m.isQuerying = true;
  m.justUpdated = false;
  m.log = 'Consultando status detalhado...';

  try {
    await queryHostStatus(m);
    persistState();
    m.justUpdated = true;
    setTimeout(() => {
      m.justUpdated = false;
    }, 2500);
    showToast(`Telemetria atualizada para ${m.host}`);
  } catch (err) {
    showToast(`Erro ao consultar ${m.host}: ${err.message}`);
  } finally {
    m.isQuerying = false;
  }
}

async function queryHostStatus(machine) {
  try {
    const res = await fetch('/api/check-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: machine.host })
    });

    if (!res.ok) return;

    const data = await res.json();

    // VALIDAÇÃO CRÍTICA: Os dados só são aplicados se o host bater com o da máquina atual
    if (data.host && data.host.toLowerCase() === machine.host.toLowerCase()) {
      if (data.success) {
        machine.pingStatus = 'online';
        machine.computerName = data.computerName;
        machine.osCaption = data.osCaption;
        machine.osBuild = data.osBuild;
        machine.lastBoot = data.lastBoot;
        machine.rebootRequired = data.rebootRequired;
        machine.rebootReason = cleanMojibake(data.rebootReason);
        machine.currentPhase = cleanMojibake(data.currentPhase);
        machine.isWorking = data.isWorking;
        machine.stage = data.stage || 'idle';
        machine.stageTitle = cleanMojibake(data.stageTitle || data.currentPhase || '');
        machine.progress = typeof data.progress === 'number' ? data.progress : 0;
        machine.currentUpdate = cleanMojibake(data.currentUpdate || '');
        machine.detailedUpdates = cleanMojibake(Array.isArray(data.detailedUpdates) ? data.detailedUpdates : []);
        machine.pipelineError = cleanMojibake(data.pipelineError || '');
        machine.isPipelineActive = Boolean(data.isPipelineActive);
        machine.wuauservStatus = data.wuauservStatus;
        machine.recentSummary = cleanMojibake(data.recentSummary);
        machine.updatesFound = data.updatesFound;
        machine.onlineUpdates = cleanMojibake(data.onlineUpdates || []);
        machine.onlineCount = data.onlineCount;
        machine.onlineSource = data.onlineSource;
        machine.onlineLastCheck = data.onlineLastCheck;
        machine.recentEvents = cleanMojibake(data.recentEvents || []);
        machine.history = cleanMojibake(data.history || []);
        machine.lastCheck = data.lastCheck || new Date().toLocaleTimeString('pt-BR');

        if (data.onlineUpdates && data.onlineUpdates.length > 0) {
          machine.log = `Microsoft Update Online: ${data.onlineUpdates.length} atualização(ões) online encontrada(s).`;
        } else if (data.recentSummary) {
          machine.log = data.recentSummary;
        } else if (data.history && data.history.length > 0) {
          machine.log = `Última KB instalada: ${data.history[0].Title}`;
        }
      } else {
        if (data.message && data.message.includes('não respondeu')) {
          machine.pingStatus = 'offline';
        }
        machine.lastCheck = new Date().toLocaleTimeString('pt-BR');
        if (data.message) {
          machine.log = data.message;
        }
      }
    }
  } catch (err) {
    machine.lastCheck = new Date().toLocaleTimeString('pt-BR');
  }
}

function toggleMonitoring(enable) {
  monitoringActive.value = enable;
  if (enable) {
    countdownSeconds.value = 60;
    pollAllMachinesNow();
    showToast('Acompanhamento a cada 1 minuto ativado.');
  } else {
    showToast('Acompanhamento automático encerrado manualmente.');
  }
  persistState();
}

function startTimerLoop() {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    if (!monitoringActive.value || machines.value.length === 0) return;

    if (countdownSeconds.value > 1) {
      countdownSeconds.value--;
    } else {
      countdownSeconds.value = 60;
      pollAllMachinesNow();
    }
  }, 1000);
}

function cancelExecution() {
  isCancelled.value = true;
}

function openDetailsModal(item) {
  selectedItem.value = item;
}

function getPhaseClass(item) {
  if (item.stage === 'installing' || (item.currentPhase && item.currentPhase.includes('Instalando'))) return 'phase-installing';
  if (item.stage === 'downloading' || (item.currentPhase && item.currentPhase.includes('Baixando'))) return 'phase-downloading';
  if (item.stage === 'completed' || (item.currentPhase && item.currentPhase.includes('em dia'))) return 'phase-completed';
  if (item.stage === 'reboot_pending' || item.rebootRequired) return 'phase-reboot';
  if (item.stage === 'error') return 'phase-error';
  if (item.isWorking) return 'phase-active';
  return 'phase-default';
}

// Helper para obter os passos do Stepper Horizontal (1. Varredura -> 2. Download -> 3. Instalacao -> 4. Conclusao)
function getMachineSteps(item) {
  const stage = item.stage || 'idle';
  const progress = typeof item.progress === 'number' ? item.progress : 0;
  
  let s1 = { label: 'Varredura', status: 'pending' };
  let s2 = { label: 'Download', status: 'pending' };
  let s3 = { label: 'Instalação', status: 'pending' };
  let s4 = { label: 'Conclusão', status: 'pending' };

  if (stage === 'scanning') {
    s1.status = 'active';
  } else if (['downloading', 'installing', 'completed', 'reboot_pending'].includes(stage)) {
    s1.status = 'done';
  }

  if (stage === 'downloading') {
    s2.status = 'active';
  } else if (['installing', 'completed', 'reboot_pending'].includes(stage)) {
    s2.status = 'done';
  }

  if (stage === 'installing') {
    s3.status = 'active';
  } else if (['completed', 'reboot_pending'].includes(stage)) {
    s3.status = 'done';
  }

  if (stage === 'completed') {
    s4.status = 'done';
    s4.label = 'Concluído';
  } else if (stage === 'reboot_pending') {
    s4.status = 'reboot';
    s4.label = 'Requer Reinício';
  } else if (stage === 'error') {
    if (progress >= 50) s3.status = 'error';
    else if (progress >= 20) s2.status = 'error';
    else s1.status = 'error';
    s4.status = 'error';
  }

  return [s1, s2, s3, s4];
}

// Helper para metadados ricos do Hero Status Banner
function getStageHero(item) {
  const stage = item.stage || 'idle';
  const progress = typeof item.progress === 'number' ? item.progress : 0;

  switch (stage) {
    case 'scanning':
      return {
        type: 'scanning',
        badge: 'Varredura Online',
        title: 'Verificando atualizações na nuvem Microsoft',
        description: 'Consultando catálogo oficial do Microsoft Update (bypassa WSUS local)',
        badgeClass: 'hero-badge-scanning',
        cardClass: 'hero-scanning',
        icon: 'radar'
      };
    case 'downloading':
      return {
        type: 'downloading',
        badge: `Baixando (${progress}%)`,
        title: 'Download de Atualizações em Andamento',
        description: item.stageTitle || 'Transferindo pacotes da nuvem Microsoft diretamente para a máquina',
        badgeClass: 'hero-badge-downloading',
        cardClass: 'hero-downloading',
        icon: 'download'
      };
    case 'installing':
      return {
        type: 'installing',
        badge: `Instalando (${progress}%)`,
        title: 'Instalando Atualizações no Windows',
        description: item.currentUpdate ? `Processando: ${item.currentUpdate}` : (item.stageTitle || 'Aplicando pacotes de sistema com TiWorker e TrustedInstaller'),
        badgeClass: 'hero-badge-installing',
        cardClass: 'hero-installing',
        icon: 'gear'
      };
    case 'completed':
      return {
        type: 'completed',
        badge: '100% Concluído ✔',
        title: 'Atualização Concluída com Êxito',
        description: 'Todas as atualizações online foram instaladas. Sistema 100% em dia.',
        badgeClass: 'hero-badge-completed',
        cardClass: 'hero-completed',
        icon: 'check'
      };
    case 'reboot_pending':
      return {
        type: 'reboot_pending',
        badge: 'Reinício Pendente ⚠️',
        title: 'Instalação Concluída — Reinício Necessário',
        description: item.rebootReason || 'As atualizações foram aplicadas. Reinicie o computador para finalizar.',
        badgeClass: 'hero-badge-reboot',
        cardClass: 'hero-reboot',
        icon: 'reboot'
      };
    case 'error':
      return {
        type: 'error',
        badge: 'Erro ❌',
        title: 'Falha no Processo de Atualização',
        description: item.pipelineError || item.currentPhase || 'Ocorreu um erro durante o download ou instalação.',
        badgeClass: 'hero-badge-error',
        cardClass: 'hero-error',
        icon: 'alert'
      };
    default:
      if (item.rebootRequired) {
        return {
          type: 'reboot_pending',
          badge: 'Reinício Pendente ⚠️',
          title: 'Reinicialização Necessária',
          description: item.rebootReason || 'O Windows possui atualizações aguardando reinício.',
          badgeClass: 'hero-badge-reboot',
          cardClass: 'hero-reboot',
          icon: 'reboot'
        };
      }
      return {
        type: 'idle',
        badge: 'Pronto / Ocioso',
        title: item.currentPhase || 'Aguardando Disparo',
        description: 'Clique em "Disparar" para iniciar ou "Consultar" para verificar o estado da máquina.',
        badgeClass: 'hero-badge-idle',
        cardClass: 'hero-idle',
        icon: 'clock'
      };
  }
}

// Normaliza a lista de atualizações detalhadas garantindo título e status
function getNormalizedUpdates(item) {
  if (item.detailedUpdates && Array.isArray(item.detailedUpdates) && item.detailedUpdates.length > 0) {
    return item.detailedUpdates;
  }
  if (item.onlineUpdates && Array.isArray(item.onlineUpdates) && item.onlineUpdates.length > 0) {
    const stage = item.stage || 'idle';
    let defaultStatus = 'Pendente';
    if (stage === 'downloading') defaultStatus = 'Baixando...';
    else if (stage === 'installing') defaultStatus = 'Baixado';
    else if (stage === 'completed' || stage === 'reboot_pending') defaultStatus = 'Instalado';

    return item.onlineUpdates.map(title => ({
      Title: typeof title === 'object' && title.Title ? title.Title : String(title),
      Status: typeof title === 'object' && title.Status ? title.Status : defaultStatus
    }));
  }
  return [];
}

// Retorna classe CSS para as tags individuais de cada KB
function getUpdateTagClass(status) {
  if (!status) return 'tag-pending';
  const s = String(status).toLowerCase();
  if (s.includes('instalado')) return 'tag-installed';
  if (s.includes('baixado')) return 'tag-downloaded';
  if (s.includes('instalando') || s.includes('baixando')) return 'tag-working';
  if (s.includes('falha') || s.includes('erro')) return 'tag-failed';
  return 'tag-pending';
}

function copyText(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copiado para a área de transferência!');
  }).catch(() => {
    showToast('Não foi possível copiar.');
  });
}

function showToast(msg) {
  toastMessage.value = msg;
  setTimeout(() => {
    if (toastMessage.value === msg) {
      toastMessage.value = '';
    }
  }, 3500);
}

onMounted(async () => {
  await restoreState();
  await checkBackendHealth();
  setInterval(checkBackendHealth, 10000);
  startTimerLoop();

  if (machines.value.length > 0 && monitoringActive.value) {
    pollAllMachinesNow();
  }
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<style>
/* Reset e Variáveis Claras */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg-page: #f8fafc;
  --bg-card: #ffffff;
  --bg-subtle: #f1f5f9;
  --bg-input: #ffffff;
  --border-light: #e2e8f0;
  --border-subtle: #edf2f7;

  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --text-subtle: #94a3b8;

  --color-primary: #2563eb;
  --color-emerald: #059669;
  --color-rose: #dc2626;
  --color-amber: #d97706;
  --color-sky: #0284c7;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04);

  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
}

body {
  background-color: var(--bg-page);
  color: var(--text-primary);
  font-family: var(--font-sans);
  line-height: 1.6;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

.font-mono {
  font-family: var(--font-mono);
}

.font-bold {
  font-weight: 600;
}

.text-blue { color: var(--color-primary); }
.text-emerald { color: var(--color-emerald); }
.text-rose { color: var(--color-rose); }
.text-amber { color: var(--color-amber); }
.text-sky { color: var(--color-sky); }
.text-muted { color: var(--text-muted); }

.bg-blue-subtle { background-color: #eff6ff; }
.bg-emerald-subtle { background-color: #ecfdf5; }
.bg-rose-subtle { background-color: #fef2f2; }
.bg-amber-subtle { background-color: #fffbeb; }
.bg-sky-subtle { background-color: #f0f9ff; }

/* Layout Geral */
.app-layout {
  max-width: 1280px;
  margin: 0 auto;
  padding: 36px 24px 64px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* Header */
.app-header {
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-light);
}

.header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.brand-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand-avatar {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #2563eb, #38bdf8);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.2);
  flex-shrink: 0;
}

.brand-avatar svg {
  width: 26px;
  height: 26px;
}

.brand-title-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.badge-version {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  background-color: #eff6ff;
  color: var(--color-primary);
  border: 1px solid #bfdbfe;
  border-radius: 9999px;
}

.brand-tagline {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 15px;
  background-color: #ffffff;
  border: 1px solid var(--border-light);
  border-radius: 9999px;
  box-shadow: var(--shadow-sm);
  font-size: 0.84rem;
  font-weight: 500;
}

.status-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.is-online .status-indicator-dot {
  background-color: var(--color-emerald);
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.2);
}

.status-indicator.is-offline .status-indicator-dot {
  background-color: var(--color-rose);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
}

/* Banner de Monitoramento Ativo (1 min) */
.monitor-banner {
  border-color: #bfdbfe;
  background: linear-gradient(180deg, #ffffff 0%, #f0f7ff 100%);
  padding: 20px 28px;
}

.monitor-banner-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
}

.monitor-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.monitor-pulse-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.92rem;
  font-weight: 700;
}

.monitor-pulse-badge.active .pulse-core {
  width: 10px;
  height: 10px;
  background-color: var(--color-emerald);
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.2);
  animation: pulse-ring 1.3s infinite;
}

.monitor-pulse-badge.paused .pulse-core {
  width: 10px;
  height: 10px;
  background-color: var(--text-subtle);
  border-radius: 50%;
}

.monitor-subtext {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.monitor-timer-col {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.countdown-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #ffffff;
  border: 1px solid #bfdbfe;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 0.84rem;
  color: var(--text-secondary);
  box-shadow: var(--shadow-sm);
}

.monitor-actions {
  display: flex;
  gap: 10px;
}

/* Cards & Superfícies */
.card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 28px 32px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
}

/* Grid de Estatísticas */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 20px;
}

.stat-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 14px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 18px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-wrapper svg {
  width: 24px;
  height: 24px;
}

.stat-details {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-number {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
}

/* Painel de Entrada de Hosts */
.panel-entry {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 14px;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.section-subtitle {
  font-size: 0.88rem;
  color: var(--text-secondary);
  margin-top: 3px;
}

.panel-quick-actions {
  display: flex;
  gap: 8px;
}

.entry-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.textarea-container {
  position: relative;
}

.clear-textarea {
  width: 100%;
  background-color: var(--bg-input);
  border: 1.5px solid var(--border-light);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 0.9rem;
  padding: 16px 20px 40px;
  line-height: 1.6;
  resize: vertical;
  min-height: 95px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.clear-textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.clear-textarea::placeholder {
  color: var(--text-subtle);
}

.textarea-badge {
  position: absolute;
  bottom: 12px;
  right: 14px;
  font-size: 0.76rem;
  color: var(--text-muted);
  background-color: var(--bg-subtle);
  padding: 3px 9px;
  border-radius: 6px;
  border: 1px solid var(--border-light);
}

.actions-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

/* Botões */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.88rem;
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.btn:active:not(:disabled) {
  transform: translateY(1.5px) scale(0.97);
  filter: brightness(0.96);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.08);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
}

.btn-primary-action {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
}

.btn-primary-action:hover:not(:disabled) {
  background: linear-gradient(135deg, #1d4ed8, #1e40af);
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.35);
}

.btn-primary-action:active:not(:disabled) {
  transform: translateY(1.5px) scale(0.97);
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.25);
}

.btn-secondary {
  background-color: #ffffff;
  color: var(--text-primary);
  border-color: var(--border-light);
  box-shadow: var(--shadow-sm);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--bg-subtle);
}

.btn-outline {
  background-color: transparent;
  color: var(--text-secondary);
  border-color: var(--border-light);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.btn-outline:hover:not(:disabled) {
  background-color: var(--bg-subtle);
  color: var(--text-primary);
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.btn-outline:active:not(:disabled) {
  transform: translateY(1.5px) scale(0.96);
  background-color: #e2e8f0;
  border-color: #94a3b8;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-outline.is-loading {
  background-color: #f0f9ff !important;
  border-color: #7dd3fc !important;
  color: #0284c7 !important;
  cursor: wait;
}

.btn-outline.is-success {
  background-color: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #16a34a !important;
  font-weight: 700;
  animation: successPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn-danger-action {
  background-color: #fef2f2;
  color: var(--color-rose);
  border-color: #fecaca;
}

.btn-danger-action:hover:not(:disabled) {
  background-color: #fee2e2;
}

.btn-danger-ghost {
  background-color: transparent;
  color: var(--text-subtle);
  border: none;
  font-size: 1.2rem;
  line-height: 1;
  padding: 2px 6px;
  cursor: pointer;
}

.btn-danger-ghost:hover {
  color: var(--color-rose);
}

.btn-sm {
  padding: 7px 14px;
  font-size: 0.82rem;
  border-radius: 8px;
}

.btn-xs {
  padding: 5px 9px;
  font-size: 0.76rem;
  border-radius: 6px;
}

.btn-copy-icon {
  background: transparent;
  border: none;
  color: var(--text-subtle);
  cursor: pointer;
  padding: 3px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-copy-icon:hover {
  color: var(--text-primary);
  background-color: var(--bg-subtle);
}

.btn-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spin-infinite {
  animation: spin 0.75s linear infinite;
  transform-origin: center center;
  display: inline-block;
}

@keyframes successPop {
  0% { transform: scale(0.92); }
  50% { transform: scale(1.06); }
  100% { transform: scale(1); }
}

/* Barra de Progresso */
.progress-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--border-light);
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  font-weight: 500;
}

.progress-status-text {
  color: var(--color-primary);
}

.progress-numbers {
  color: var(--text-muted);
}

.progress-rail {
  width: 100%;
  height: 8px;
  background-color: var(--bg-subtle);
  border-radius: 9999px;
  overflow: hidden;
  border: 1px solid var(--border-light);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #38bdf8);
  transition: width 0.3s ease;
  border-radius: 9999px;
}

/* Painel de Resultados */
.panel-results {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.panel-header-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 4px;
}

.panel-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-controls-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.segmented-filters {
  display: flex;
  background-color: var(--bg-subtle);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 3px;
  gap: 3px;
}

.filter-button {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 7px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
  user-select: none;
}

.filter-button:hover {
  color: var(--text-primary);
}

.filter-button.active {
  background-color: #ffffff;
  color: var(--color-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.filter-qty {
  font-size: 0.72rem;
  background-color: var(--bg-subtle);
  padding: 2px 6px;
  border-radius: 9999px;
  color: var(--text-muted);
}

.search-field {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #ffffff;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 7px 14px;
  color: var(--text-subtle);
}

.search-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 0.84rem;
  width: 190px;
}

/* View Switcher */
.view-switcher {
  display: flex;
  background-color: var(--bg-subtle);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 3px;
  gap: 3px;
}

.view-switch-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 7px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
  user-select: none;
}

.view-switch-btn:hover {
  color: var(--text-primary);
}

.view-switch-btn.active {
  background-color: #ffffff;
  color: var(--color-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* Estado Vazio */
.empty-state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  background-color: #f8fafc;
  border: 1px dashed var(--border-light);
  border-radius: 14px;
}

.empty-icon-circle {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background-color: #ffffff;
  color: var(--text-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  box-shadow: var(--shadow-sm);
}

.empty-heading {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.empty-text {
  font-size: 0.88rem;
  color: var(--text-muted);
  max-width: 420px;
}

/* ============================================================
   1. GRID DE CARDS MODERNOS COM ALTO RESPIRO
   ============================================================ */
.machines-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(460px, 1fr));
  gap: 20px;
}

.machine-card {
  background-color: #ffffff;
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  position: relative;
}

.machine-card:hover {
  box-shadow: var(--shadow-md);
  border-color: #cbd5e1;
}

.machine-card.card-running {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.machine-card.card-querying {
  border-color: #38bdf8 !important;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2), var(--shadow-md) !important;
}

/* Card Header */
.machine-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f1f5f9;
}

.machine-id-col {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.machine-host-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.machine-host-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.netbios-pill {
  font-size: 0.74rem;
  color: var(--text-muted);
  background-color: #f1f5f9;
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.machine-os-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.os-text {
  font-weight: 500;
}

.build-tag {
  background-color: #f8fafc;
  border: 1px solid var(--border-light);
  color: var(--text-muted);
  font-size: 0.72rem;
  padding: 1px 6px;
  border-radius: 4px;
}

/* Status Pills */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: currentColor;
}

.pill-online {
  background-color: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.pill-offline {
  background-color: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.pill-testing {
  background-color: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
}

.pill-pending {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

/* Card Body */
.machine-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.phase-display-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.phase-chip-large {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 9px;
  font-size: 0.84rem;
  font-weight: 600;
}

.phase-chip-large .phase-icon-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: currentColor;
  flex-shrink: 0;
}

.uptime-hint {
  font-size: 0.78rem;
  color: var(--text-muted);
}

/* ============================================================
   DESIGN SYSTEM DE HERO STATUS CARD & STEPPER (Inconfundível)
   ============================================================ */
.status-hero-card {
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid transparent;
  transition: all 0.25s ease;
}

/* Temas do Hero Banner */
.hero-scanning {
  background: linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%);
  border-color: #bae6fd;
  color: #0369a1;
}

.hero-downloading {
  background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.hero-installing {
  background: linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%);
  border-color: #a5f3fc;
  color: #0e7490;
}

.hero-completed {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #86efac;
  color: #15803d;
}

.hero-reboot {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border-color: #fde68a;
  color: #b45309;
}

.hero-error {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border-color: #fecaca;
  color: #b91c1c;
}

.hero-idle {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #475569;
}

/* Topo do Hero Banner */
.hero-top-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.hero-icon-title {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.hero-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.icon-scanning { color: #0284c7; }
.icon-downloading { color: #2563eb; }
.icon-installing { color: #0891b2; }
.icon-completed { color: #16a34a; }
.icon-reboot_pending { color: #d97706; }
.icon-error { color: #dc2626; }
.icon-idle { color: #64748b; }

.hero-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hero-headline {
  font-size: 0.96rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: inherit;
  margin: 0;
}

.hero-desc {
  font-size: 0.8rem;
  opacity: 0.88;
  margin: 0;
  line-height: 1.4;
  word-break: normal;
}

/* Badges do Hero */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 9999px;
  white-space: nowrap;
  flex-shrink: 0;
  border: 1px solid transparent;
}

.hero-dot-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: currentColor;
  animation: pulse-ring 1.2s infinite;
}

.hero-badge-scanning { background-color: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
.hero-badge-downloading { background-color: #dbeafe; color: #1d4ed8; border-color: #bfdbfe; }
.hero-badge-installing { background-color: #cffafe; color: #0891b2; border-color: #a5f3fc; }
.hero-badge-completed { background-color: #dcfce7; color: #15803d; border-color: #86efac; }
.hero-badge-reboot { background-color: #fef3c7; color: #b45309; border-color: #fde68a; }
.hero-badge-error { background-color: #fee2e2; color: #b91c1c; border-color: #fecaca; }
.hero-badge-idle { background-color: #f1f5f9; color: #64748b; border-color: #e2e8f0; }

/* Stepper Horizontal */
.stepper-horizontal {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px dashed rgba(0, 0, 0, 0.08);
}

.stepper-step {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.stepper-step:last-child {
  flex: 0 0 auto;
}

.step-indicator {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.step-label {
  font-size: 0.74rem;
  font-weight: 600;
  white-space: nowrap;
}

.step-connector {
  height: 2px;
  flex: 1;
  min-width: 14px;
  background-color: rgba(0, 0, 0, 0.08);
  margin: 0 6px;
  border-radius: 1px;
}

.connector-done {
  background-color: #16a34a !important;
}

/* Estados das Etapas do Stepper */
.step-done .step-indicator {
  background-color: #16a34a;
  color: #ffffff;
}
.step-done .step-label {
  color: #16a34a;
  font-weight: 600;
}

.step-active .step-indicator {
  background-color: #0284c7;
  color: #ffffff;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.25);
}
.step-active .step-label {
  color: #0284c7;
  font-weight: 700;
}

.step-active-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #ffffff;
  animation: pulse-ring 1.1s infinite;
}

.step-error .step-indicator {
  background-color: #dc2626;
  color: #ffffff;
}
.step-error .step-label {
  color: #dc2626;
  font-weight: 700;
}

.step-reboot .step-indicator {
  background-color: #d97706;
  color: #ffffff;
}
.step-reboot .step-label {
  color: #d97706;
  font-weight: 700;
}

.step-pending .step-indicator {
  background-color: rgba(0, 0, 0, 0.05);
  color: #94a3b8;
  border: 1px solid rgba(0, 0, 0, 0.08);
}
.step-pending .step-label {
  color: #94a3b8;
}

/* Barra de Progresso Animada */
.hero-progress-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 4px;
}

.hero-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.74rem;
  font-weight: 600;
  opacity: 0.9;
}

.hero-progress-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-progress-track {
  width: 100%;
  height: 8px;
  background-color: rgba(0, 0, 0, 0.08);
  border-radius: 9999px;
  overflow: hidden;
  position: relative;
}

.hero-progress-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.4s ease;
}

.hero-progress-fill.fill-active {
  background: linear-gradient(90deg, #0284c7 0%, #38bdf8 50%, #0284c7 100%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite linear;
}

.hero-progress-fill.fill-completed {
  background-color: #16a34a;
}

.hero-progress-fill.fill-reboot {
  background-color: #d97706;
}

.hero-progress-fill.fill-error {
  background-color: #dc2626;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes bounceSubtle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(2px); }
}

.bounce-subtle {
  animation: bounceSubtle 1.2s infinite ease-in-out;
}

/* ============================================================
   LISTA DE ATUALIZAÇÕES DETALHADA COM STATUS TAGS
   ============================================================ */
.detailed-updates-card {
  background-color: #ffffff;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.updates-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.updates-header-left {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #0284c7;
}

.updates-count-badge {
  font-size: 0.72rem;
  font-weight: 700;
  background-color: #f0f9ff;
  color: #0284c7;
  padding: 2px 8px;
  border-radius: 9999px;
  border: 1px solid #bae6fd;
}

.updates-list-body {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.update-row-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
  border-bottom: 1px solid #f8fafc;
}

.update-row-item:last-child {
  border-bottom: none;
}

.update-title-col {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 0.78rem;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.update-bullet {
  color: #0284c7;
  font-weight: 700;
  font-size: 0.85rem;
}

.update-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

/* Tags Individuais de Status da KB */
.update-status-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  white-space: nowrap;
  flex-shrink: 0;
  border: 1px solid transparent;
}

.tag-installed {
  background-color: #ecfdf5;
  color: #047857;
  border-color: #a7f3d0;
}

.tag-downloaded {
  background-color: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.tag-working {
  background-color: #ecfeff;
  color: #0891b2;
  border-color: #a5f3fc;
}

.tag-failed {
  background-color: #fef2f2;
  color: #b91c1c;
  border-color: #fecaca;
}

.tag-pending {
  background-color: #f8fafc;
  color: #64748b;
  border-color: #e2e8f0;
}

.tag-icon {
  font-size: 0.72rem;
}

.updates-more-row {
  padding-top: 4px;
}

.btn-more-link {
  background: transparent;
  border: none;
  color: #0284c7;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-align: left;
}

.btn-more-link:hover {
  text-decoration: underline;
}

/* Tabela Espaçosa - Componentes de Status */
.table-phase-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.table-mini-progress {
  width: 100%;
  max-width: 120px;
  height: 4px;
  background-color: #e2e8f0;
  border-radius: 9999px;
  overflow: hidden;
}

.table-mini-fill {
  height: 100%;
  border-radius: 9999px;
}

.table-mini-fill.scanning,
.table-mini-fill.downloading,
.table-mini-fill.installing {
  background-color: #0284c7;
}

.table-mini-fill.completed {
  background-color: #16a34a;
}

.table-mini-fill.reboot_pending {
  background-color: #d97706;
}

.table-mini-fill.error {
  background-color: #dc2626;
}

.table-kbs-inline {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.table-kb-badge {
  font-size: 0.74rem;
  color: #334155;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-status-mini {
  font-size: 0.68rem;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 600;
}

.online-item-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ============================================================
   DESIGN SYSTEM DE ALERTS MINIMALISTAS (Com Alto Respiro)
   ============================================================ */
.alert-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  line-height: 1.45;
  font-size: 0.84rem;
}

.alert-icon-col {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  margin-top: 1px;
}

.alert-text-col {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.alert-headline {
  font-weight: 700;
  font-size: 0.85rem;
}

.alert-description {
  color: var(--text-secondary);
  font-size: 0.82rem;
  word-break: normal;
}

/* Alerta de Reboot */
.alert-reboot {
  background-color: #fff1f2;
  border: 1px solid #fecdd3;
  color: #9f1239;
}

.alert-reboot .alert-description {
  color: #881337;
}

/* Alerta Informativo */
.alert-info {
  background-color: #f0f7ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
}

.alert-info .alert-description {
  color: #1e3a8a;
}

/* Alerta do Microsoft Update Online (Destaque Nuvem) */
.alert-online-updates {
  background-color: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-online-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.alert-online-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 0.82rem;
  color: #0284c7;
}

.alert-online-count {
  font-size: 0.74rem;
  font-weight: 700;
  background-color: #0284c7;
  color: #ffffff;
  padding: 2px 8px;
  border-radius: 9999px;
  white-space: nowrap;
}

.alert-online-items {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.online-single-item {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  font-size: 0.8rem;
  color: #0f172a;
  line-height: 1.4;
}

.online-bullet {
  color: #0284c7;
  font-weight: 700;
  font-size: 0.9rem;
  line-height: 1.2;
}

.online-item-text {
  font-weight: 500;
  word-break: normal;
}

.online-more-hint {
  font-size: 0.75rem;
  color: #0284c7;
  font-weight: 600;
  padding-left: 14px;
}

.simple-log-strip {
  background-color: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.8rem;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Card Footer */
.machine-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
}

.card-timestamp {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.card-actions-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-action-minimal {
  background: #ffffff;
  border: 1px solid var(--border-light);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 6px 13px;
  border-radius: 7px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  user-select: none;
}

.btn-action-minimal:hover:not(:disabled) {
  background-color: var(--bg-subtle);
  color: var(--text-primary);
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.06);
}

.btn-action-minimal:active:not(:disabled) {
  transform: translateY(1.5px) scale(0.94);
  background-color: #e2e8f0;
  border-color: #94a3b8;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-action-minimal.is-loading {
  background-color: #f0f9ff;
  border-color: #7dd3fc;
  color: #0284c7;
  cursor: wait;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.22);
}

.btn-action-minimal.is-success {
  background-color: #f0fdf4;
  border-color: #86efac;
  color: #16a34a;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.22);
  animation: successPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn-action-primary-sm {
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-action-primary-sm:hover {
  background-color: #dbeafe;
  transform: translateY(-1px);
}

.btn-action-primary-sm:active {
  transform: translateY(1.5px) scale(0.95);
  background-color: #bfdbfe;
}

.btn-action-delete {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-subtle);
  padding: 6px;
  border-radius: 7px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-action-delete:hover:not(:disabled) {
  background-color: #fef2f2;
  color: var(--color-rose);
  border-color: #fecaca;
  transform: translateY(-1px);
}

.btn-action-delete:active:not(:disabled) {
  transform: scale(0.90);
  background-color: #fee2e2;
}

/* ============================================================
   2. TABELA ESPAÇOSA COM ROLAGEM HORIZONTAL ADEQUADA
   ============================================================ */
.table-wrapper-spacious {
  overflow-x: auto;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  background-color: #ffffff;
}

.table-wrapper-spacious .clear-table {
  min-width: 1100px;
  width: 100%;
}

.clear-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.clear-table th {
  background-color: #f8fafc;
  color: var(--text-secondary);
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 14px 16px;
  border-bottom: 1.5px solid var(--border-light);
}

.clear-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 0.88rem;
  vertical-align: middle;
}

.table-row {
  transition: background-color 0.15s ease;
}

.table-row:hover {
  background-color: #f8fafc;
}

.table-row.row-active {
  background-color: #eff6ff;
}

.col-seq {
  color: var(--text-subtle);
  font-size: 0.82rem;
}

.host-pill-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.host-title-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.host-tag {
  font-weight: 700;
  color: var(--text-primary);
  background-color: var(--bg-subtle);
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-light);
}

.os-mini-caption {
  font-size: 0.74rem;
  color: var(--text-muted);
  white-space: nowrap;
}

/* Badges e Chips */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border-radius: 9999px;
  font-size: 0.78rem;
  font-weight: 600;
  border: 1px solid transparent;
  white-space: nowrap;
}

.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: currentColor;
}

.dot-pulse {
  animation: pulse-ring 1.2s infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.95); opacity: 0.7; }
  50% { transform: scale(1.35); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.7; }
}

.badge-pending {
  background-color: #f1f5f9;
  color: #475569;
  border-color: #e2e8f0;
}

.badge-running {
  background-color: #fffbeb;
  color: #b45309;
  border-color: #fde68a;
}

.badge-success {
  background-color: #ecfdf5;
  color: #047857;
  border-color: #a7f3d0;
}

.badge-danger {
  background-color: #fef2f2;
  color: #b91c1c;
  border-color: #fecaca;
}

.badge-reboot-required {
  background-color: #fef2f2;
  color: #b91c1c;
  border-color: #fca5a5;
  font-weight: 700;
}

.badge-reboot-ok {
  background-color: #ecfdf5;
  color: #047857;
  border-color: #a7f3d0;
}

/* Phase Chip */
.phase-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
}

.phase-chip .phase-icon-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
  flex-shrink: 0;
}

.table-telemetry-box {
  background-color: #f8fafc;
  border: 1px solid var(--border-light);
  border-radius: 9px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.table-telemetry-box.clickable {
  cursor: pointer;
}

.table-telemetry-box.clickable:hover {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
}

.table-online-strip {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.table-online-badge-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.online-pill-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #e0f2fe;
  color: #0284c7;
  font-size: 0.74rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  white-space: nowrap;
}

.online-pill-count {
  font-size: 0.72rem;
  color: #0369a1;
  font-weight: 600;
  white-space: nowrap;
}

.table-online-preview {
  font-size: 0.78rem;
  color: #334155;
  line-height: 1.35;
}

.table-summary-text {
  font-size: 0.8rem;
  color: #0f172a;
  font-weight: 600;
}

.table-kb-text {
  font-size: 0.8rem;
  color: #1d4ed8;
  font-weight: 600;
}

.table-subtle-log {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.log-hint-text {
  font-size: 0.72rem;
  color: var(--color-primary);
  text-decoration: underline;
  margin-top: 2px;
  font-weight: 500;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* Modal Claro */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-dialog {
  background-color: #ffffff;
  border: 1px solid var(--border-light);
  border-radius: 16px;
  width: 100%;
  max-width: 780px;
  max-height: 90vh;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modal-fade 0.2s ease-out;
}

@keyframes modal-fade {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

.modal-top {
  padding: 20px 26px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-heading {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
}

.modal-subheading {
  font-size: 0.86rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.modal-close-button {
  background: transparent;
  border: none;
  font-size: 1.6rem;
  color: var(--text-subtle);
  cursor: pointer;
  line-height: 1;
}

.modal-close-button:hover {
  color: var(--text-primary);
}

.modal-middle {
  padding: 22px 26px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
}

/* Machine Meta Strip */
.machine-meta-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 10px 14px;
  background-color: #f8fafc;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  font-size: 0.82rem;
}

.meta-strip-item {
  display: flex;
  gap: 6px;
}

.meta-strip-label {
  color: var(--text-muted);
  font-weight: 500;
}

.meta-strip-value {
  color: var(--text-primary);
  font-weight: 600;
}

.modal-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.summary-box {
  background-color: var(--bg-subtle);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.summary-val {
  font-size: 0.92rem;
}

.summary-subreason {
  font-size: 0.74rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-section-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* History Table */
.history-table-box {
  border: 1px solid var(--border-light);
  border-radius: 10px;
  overflow: hidden;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.history-table th {
  background-color: #f8fafc;
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-light);
  font-weight: 600;
  color: var(--text-secondary);
}

.history-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.badge-result {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 9999px;
  font-size: 0.74rem;
  font-weight: 600;
  background-color: #f1f5f9;
  color: #475569;
}

.badge-result.success {
  background-color: #ecfdf5;
  color: #047857;
}

.badge-result.danger {
  background-color: #fef2f2;
  color: #b91c1c;
}

.empty-subbox {
  padding: 14px;
  background-color: #f8fafc;
  border: 1px dashed var(--border-light);
  border-radius: 8px;
  font-size: 0.82rem;
  color: var(--text-muted);
  text-align: center;
}

/* Events List */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
}

.event-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background-color: #f8fafc;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  font-size: 0.82rem;
}

.event-time {
  color: var(--color-primary);
  font-weight: 600;
  flex-shrink: 0;
}

.event-msg {
  color: var(--text-primary);
}

.log-terminal-frame {
  background-color: #f8fafc;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  overflow: hidden;
}

.log-terminal-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background-color: #f1f5f9;
  border-bottom: 1px solid var(--border-light);
}

.terminal-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.log-terminal-body {
  padding: 14px;
  font-size: 0.82rem;
  color: #1e293b;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow-y: auto;
}

.modal-bottom {
  padding: 16px 26px;
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: flex-end;
}

/* Toast */
.toast-popup {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background-color: #0f172a;
  color: #ffffff;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.16);
  z-index: 2000;
  animation: toast-fly 0.25s ease-out;
}

@keyframes toast-fly {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Microsoft Update Online Styles */
.latest-online-text {
  font-size: 0.82rem;
  color: #0369a1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  line-height: 1.35;
}

.online-pill-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #e0f2fe;
  color: #0284c7;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 9999px;
  width: fit-content;
}

.online-pill-preview {
  color: #475569;
  font-size: 0.76rem;
}

.online-highlight-section {
  background-color: #f0f9ff;
  border: 1px solid #bae6fd !important;
  border-radius: 12px;
  padding: 16px 18px;
}

.online-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.online-badge {
  background-color: #0284c7;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 9999px;
}

.online-section-sub {
  font-size: 0.8rem;
  color: #0369a1;
  margin-bottom: 12px;
}

.online-items-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
}

.online-item-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #ffffff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.82rem;
  color: #0f172a;
}

.online-item-icon {
  font-size: 1rem;
}

.online-item-title {
  font-weight: 600;
  color: #0369a1;
}

/* Responsividade */
@media (max-width: 768px) {
  .app-layout {
    padding: 20px 14px;
    gap: 20px;
  }
  .card {
    padding: 18px 16px;
  }
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .modal-summary-grid {
    grid-template-columns: 1fr;
  }
  .latest-event-text, .latest-kb-text, .log-snippet {
    max-width: 170px;
  }
}
</style>
