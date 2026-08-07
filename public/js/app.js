(function () {
  const DIA_LABEL = { terca: 'terça-feira', quarta: 'quarta-feira' };
  const DIA_TITULO = { terca: 'Terça-feira', quarta: 'Quarta-feira' };
  const STEP_ORDER = ['identificacao', 'terca', 'quarta', 'revisao'];

  const els = {
    identificacao: document.getElementById('etapa-identificacao'),
    formIdentificacao: document.getElementById('form-identificacao'),
    nome: document.getElementById('input-nome'),
    turma: document.getElementById('input-turma'),
    erroIdentificacao: document.getElementById('erro-identificacao'),
    btnIdentificar: document.getElementById('btn-identificar'),
    areaMatricula: document.getElementById('area-matricula'),
    alunoResumo: document.getElementById('aluno-resumo'),
    alunoAvatar: document.querySelector('.student-avatar'),
    btnTrocarAluno: document.getElementById('btn-trocar-aluno'),
    steps: document.querySelectorAll('.step'),
    dayButtons: document.querySelectorAll('.day-button'),
    etapaEscolha: document.getElementById('etapa-escolha'),
    etapaIndicador: document.getElementById('etapa-indicador'),
    tituloEtapa: document.getElementById('titulo-etapa'),
    textoEtapa: document.getElementById('texto-etapa'),
    atualizacaoVagas: document.getElementById('atualizacao-vagas'),
    listaLoading: document.getElementById('lista-loading'),
    listaErro: document.getElementById('lista-erro'),
    listaVazia: document.getElementById('lista-vazia'),
    lista: document.getElementById('lista-itinerarios'),
    btnTentarNovamente: document.getElementById('btn-tentar-novamente'),
    selectionAction: document.getElementById('selection-action'),
    selectionTitle: document.getElementById('selection-title'),
    btnAvancar: document.getElementById('btn-avancar'),
    template: document.getElementById('template-card'),
    etapaRevisao: document.getElementById('etapa-revisao'),
    reviewTercaTitulo: document.getElementById('review-terca-titulo'),
    reviewTercaProfessor: document.getElementById('review-terca-professor'),
    reviewQuartaTitulo: document.getElementById('review-quarta-titulo'),
    reviewQuartaProfessor: document.getElementById('review-quarta-professor'),
    btnEditarDia: document.querySelectorAll('.btn-editar-dia'),
    btnConfirmar: document.getElementById('btn-confirmar-matricula'),
    erroConfirmacao: document.getElementById('erro-confirmacao'),
    etapaSucesso: document.getElementById('etapa-sucesso'),
    sucessoAluno: document.getElementById('sucesso-aluno'),
    sucessoTerca: document.getElementById('sucesso-terca'),
    sucessoQuarta: document.getElementById('sucesso-quarta'),
    btnAlterarEscolhas: document.getElementById('btn-alterar-escolhas'),
    btnEncerrar: document.getElementById('btn-encerrar'),
  };

  const state = {
    aluno: null,
    currentDia: 'terca',
    listas: { terca: null, quarta: null },
    confirmadas: { terca: null, quarta: null },
    rascunho: { terca: null, quarta: null },
    pollTimer: null,
    loadingDay: null,
  };

  const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const ALUNOS_POR_TURMA = window.ALUNOS_POR_TURMA || {};

  function setButtonLoading(button, loading, label) {
    button.classList.toggle('loading', loading);
    button.disabled = loading;
    button.setAttribute('aria-busy', String(loading));
    if (label) button.querySelector('.btn-label').textContent = label;
  }

  function showError(element, message) {
    element.textContent = message;
    element.hidden = !message;
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'erro_requisicao');
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  function getFormAluno() {
    return {
      nome: els.nome.value.trim(),
      turma: els.turma.value,
    };
  }

  function normalizeChoice(choice) {
    if (!choice) return null;
    return {
      id: Number(choice.itinerario_id || choice.id),
      titulo: choice.titulo,
      professor: choice.professor,
      descricao: choice.descricao || '',
      video_url: choice.video_url || '',
      capacidade: choice.capacidade,
      confirmado: Boolean(choice.confirmado),
    };
  }

  function sameChoice(a, b) {
    return Number(a?.id || 0) === Number(b?.id || 0);
  }

  function hasUnsavedChanges() {
    if (!state.aluno || isEnrollmentLocked()) return false;
    return !sameChoice(state.rascunho.terca, state.confirmadas.terca)
      || !sameChoice(state.rascunho.quarta, state.confirmadas.quarta);
  }

  function isEnrollmentLocked() {
    return Boolean(state.confirmadas.terca?.confirmado || state.confirmadas.quarta?.confirmado);
  }

  function persistAluno() {
    if (!state.aluno) return;
    localStorage.setItem('itin_nome', state.aluno.nome);
    localStorage.setItem('itin_turma', state.aluno.turma);
  }

  function populateTurmas() {
    els.turma.innerHTML = '<option value="">Selecione sua turma…</option>';
    Object.keys(ALUNOS_POR_TURMA).forEach((turma) => {
      const option = document.createElement('option');
      option.value = turma;
      option.textContent = turma;
      els.turma.appendChild(option);
    });
  }

  function populateNomes(turma) {
    const nomes = (ALUNOS_POR_TURMA[turma] || []).slice().sort((a, b) => a.localeCompare(b, 'pt-BR'));
    els.nome.innerHTML = '';
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = nomes.length ? 'Selecione seu nome…' : 'Selecione a turma primeiro…';
    els.nome.appendChild(emptyOption);
    nomes.forEach((nome) => {
      const option = document.createElement('option');
      option.value = nome;
      option.textContent = nome;
      els.nome.appendChild(option);
    });
    els.nome.disabled = nomes.length === 0;
  }

  function prefillAluno() {
    populateTurmas();
    const turmaSalva = localStorage.getItem('itin_turma') || '';
    const nomeSalvo = localStorage.getItem('itin_nome') || '';
    els.turma.value = turmaSalva;
    populateNomes(turmaSalva);
    if (nomeSalvo && Array.from(els.nome.options).some((option) => option.value === nomeSalvo)) {
      els.nome.value = nomeSalvo;
    }
  }

  function setProgress(stepName, complete = false) {
    const activeIndex = STEP_ORDER.indexOf(stepName);
    els.steps.forEach((step) => {
      const stepIndex = STEP_ORDER.indexOf(step.dataset.step);
      const isActive = !complete && stepIndex === activeIndex;
      const isDone = complete || stepIndex < activeIndex;
      step.classList.toggle('active', isActive);
      step.classList.toggle('done', isDone);
      if (isActive) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
      const number = step.querySelector('.step-number');
      number.textContent = isDone ? '✓' : String(stepIndex + 1);
    });
  }

  function focusSection(element, heading) {
    requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    });
  }

  function updateStudentBar() {
    els.alunoResumo.textContent = `${state.aluno.nome} · ${state.aluno.turma}`;
    els.alunoAvatar.textContent = state.aluno.nome.charAt(0).toLocaleUpperCase('pt-BR');
  }

  function updateDayButtons() {
    els.dayButtons.forEach((button) => {
      const dia = button.dataset.dia;
      const active = dia === state.currentDia && !els.etapaEscolha.hidden;
      button.classList.toggle('active', active);
      button.classList.toggle('done', Boolean(state.rascunho[dia]));
      button.setAttribute('aria-pressed', String(active));
      button.disabled = dia === 'quarta' && !state.rascunho.terca;
    });
  }

  function vacancyLabel(count) {
    if (count <= 0) return 'Turma Lotada';
    return count === 1 ? '1 Vaga' : `${count} Vagas`;
  }

  function updateCardState(article, item, dia) {
    const selected = sameChoice(state.rascunho[dia], item);
    const unavailable = item.bloqueado && !selected;
    const locked = isEnrollmentLocked();
    const badge = article.querySelector('.badge-vagas');
    const button = article.querySelector('.btn-escolher');
    const label = button.querySelector('.btn-label');

    badge.textContent = vacancyLabel(item.vagas_restantes);
    badge.classList.toggle('pouco', item.vagas_restantes > 0 && item.vagas_restantes <= 3);
    badge.classList.toggle('esgotado', item.vagas_restantes <= 0);

    article.classList.toggle('selected', selected);
    article.classList.toggle('sold-out', unavailable);
    button.disabled = selected || unavailable || locked;
    button.setAttribute('aria-pressed', String(selected));

    if (locked) label.textContent = selected ? 'Inscrição Confirmada' : 'Inscrição Encerrada';
    else if (selected) label.textContent = `Escolhido para ${DIA_TITULO[dia]}`;
    else if (unavailable) label.textContent = 'Turma Lotada';
    else label.textContent = `Escolher para ${DIA_TITULO[dia]}`;
  }

  function buildVideo(item, selectedChoice) {
    const container = document.createDocumentFragment();
    const url = selectedChoice?.video_url || item.video_url;

    if (!url) {
      const empty = document.createElement('p');
      empty.className = 'video-empty';
      empty.textContent = 'Apresentação em breve';
      container.appendChild(empty);
      return container;
    }

    const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
    const drive = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);

    if (youtube || drive) {
      const iframe = document.createElement('iframe');
      iframe.src = youtube
        ? `https://www.youtube.com/embed/${youtube[1]}`
        : `https://drive.google.com/file/d/${drive[1]}/preview`;
      iframe.title = `Apresentação do itinerário ${item.titulo}`;
      iframe.loading = 'lazy';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      container.appendChild(iframe);
      return container;
    }

    if (/\.mp4($|\?)/i.test(url)) {
      const video = document.createElement('video');
      video.src = url;
      video.controls = true;
      video.preload = 'metadata';
      video.setAttribute('aria-label', `Apresentação do itinerário ${item.titulo}`);
      container.appendChild(video);
      return container;
    }

    const link = document.createElement('a');
    link.className = 'video-link';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Assistir à Apresentação';
    container.appendChild(link);
    return container;
  }

  function renderCard(item, dia) {
    const node = els.template.content.cloneNode(true);
    const article = node.querySelector('.course-card');
    const selectedChoice = sameChoice(state.rascunho[dia], item) ? state.rascunho[dia] : null;
    article.dataset.itemId = String(item.id);

    node.querySelector('.course-subject').textContent = DIA_TITULO[dia];
    node.querySelector('.titulo').textContent = item.titulo;
    node.querySelector('.professor').textContent = `Com professor(a) ${item.professor}`;
    node.querySelector('.descricao').textContent = item.descricao;
    node.querySelector('.video-area').appendChild(buildVideo(item, selectedChoice));

    const details = node.querySelector('.btn-detalhes');
    const description = node.querySelector('.course-description');
    if ((item.descricao || '').length < 170) {
      details.hidden = true;
    } else {
      details.addEventListener('click', () => {
        const expanded = description.classList.toggle('expanded');
        details.setAttribute('aria-expanded', String(expanded));
        details.textContent = expanded ? 'Mostrar Menos' : 'Ver Detalhes';
      });
    }

    const chooseButton = node.querySelector('.btn-escolher');
    chooseButton.addEventListener('click', () => selectItem(item, dia));
    updateCardState(article, item, dia);
    return node;
  }

  function renderList(dia) {
    const items = state.listas[dia] || [];
    els.lista.innerHTML = '';
    els.listaVazia.hidden = items.length > 0;
    for (const item of items) els.lista.appendChild(renderCard(item, dia));
    updateSelectionAction();
  }

  function updateSelectionAction() {
    const selected = state.rascunho[state.currentDia];
    const showAction = Boolean(selected) && !isEnrollmentLocked();
    els.etapaEscolha.classList.toggle('has-selection', showAction);
    els.selectionAction.hidden = !showAction;
    if (!selected) return;
    els.selectionTitle.textContent = selected.titulo;
    els.btnAvancar.textContent = state.currentDia === 'terca'
      ? 'Continuar para Quarta-feira'
      : 'Revisar Matrícula';
  }

  function selectItem(item, dia) {
    if (isEnrollmentLocked()) return;
    state.rascunho[dia] = { ...item };
    for (const card of els.lista.querySelectorAll('.course-card')) {
      const cardItem = state.listas[dia].find((entry) => Number(entry.id) === Number(card.dataset.itemId));
      if (cardItem) updateCardState(card, cardItem, dia);
    }
    updateDayButtons();
    updateSelectionAction();
    requestAnimationFrame(() => els.btnAvancar.focus());
  }

  function setListState({ loading = false, error = false } = {}) {
    els.listaLoading.hidden = !loading;
    els.listaErro.hidden = !error;
    if (loading || error) {
      els.lista.hidden = true;
      els.listaVazia.hidden = true;
      els.selectionAction.hidden = true;
    } else {
      els.lista.hidden = false;
    }
  }

  async function loadDay(dia, { force = false } = {}) {
    if (state.loadingDay === dia) return;
    if (state.listas[dia] && !force) {
      renderList(dia);
      return;
    }

    state.loadingDay = dia;
    setListState({ loading: true });
    try {
      const items = await fetchJson(`/api/itinerarios/${dia}`);
      state.listas[dia] = items;
      setListState();
      renderList(dia);
      els.atualizacaoVagas.textContent = `Vagas atualizadas às ${timeFormatter.format(new Date())}.`;
    } catch (error) {
      setListState({ error: true });
    } finally {
      state.loadingDay = null;
    }
  }

  async function updateAvailability(dia) {
    if (!state.aluno || document.hidden || state.loadingDay) return;
    try {
      const items = await fetchJson(`/api/itinerarios/${dia}`);
      const previousIds = (state.listas[dia] || []).map((item) => Number(item.id)).join(',');
      const nextIds = items.map((item) => Number(item.id)).join(',');
      state.listas[dia] = items;

      if (dia === state.currentDia && !els.etapaEscolha.hidden) {
        if (previousIds !== nextIds) {
          renderList(dia);
        } else {
          for (const article of els.lista.querySelectorAll('.course-card')) {
            const item = items.find((entry) => Number(entry.id) === Number(article.dataset.itemId));
            if (item) updateCardState(article, item, dia);
          }
        }
        els.atualizacaoVagas.textContent = `Vagas atualizadas às ${timeFormatter.format(new Date())}.`;
      }
    } catch (error) {
      if (dia === state.currentDia) {
        els.atualizacaoVagas.textContent = 'Não foi possível atualizar as vagas agora.';
      }
    }
  }

  function startPolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(() => updateAvailability(state.currentDia), 25000);
  }

  function showChoice(dia, { focus = true } = {}) {
    state.currentDia = dia;
    els.etapaRevisao.hidden = true;
    els.etapaSucesso.hidden = true;
    els.etapaEscolha.hidden = false;
    els.etapaIndicador.textContent = dia === 'terca' ? 'Etapa 2 de 4' : 'Etapa 3 de 4';
    els.tituloEtapa.textContent = `Escolha seu itinerário de ${DIA_LABEL[dia]}`;
    els.textoEtapa.textContent = dia === 'terca'
      ? 'Assista aos vídeos e selecione a proposta que mais combina com você.'
      : 'Agora escolha sua segunda experiência para completar a matrícula.';
    setProgress(dia);
    updateDayButtons();
    loadDay(dia);
    if (focus) focusSection(els.etapaEscolha, els.tituloEtapa);
  }

  function showReview() {
    if (!state.rascunho.terca || !state.rascunho.quarta) return;
    els.etapaEscolha.hidden = true;
    els.etapaSucesso.hidden = true;
    els.etapaRevisao.hidden = false;
    showError(els.erroConfirmacao, '');
    els.reviewTercaTitulo.textContent = state.rascunho.terca.titulo;
    els.reviewTercaProfessor.textContent = `Com professor(a) ${state.rascunho.terca.professor}`;
    els.reviewQuartaTitulo.textContent = state.rascunho.quarta.titulo;
    els.reviewQuartaProfessor.textContent = `Com professor(a) ${state.rascunho.quarta.professor}`;
    setProgress('revisao');
    updateDayButtons();
    focusSection(els.etapaRevisao, document.getElementById('titulo-revisao'));
  }

  function showSuccess() {
    els.etapaEscolha.hidden = true;
    els.etapaRevisao.hidden = true;
    els.etapaSucesso.hidden = false;
    els.sucessoAluno.textContent = `${state.aluno.nome}, sua matrícula foi registrada para ${state.aluno.turma}.`;
    els.sucessoTerca.textContent = state.confirmadas.terca.titulo;
    els.sucessoQuarta.textContent = state.confirmadas.quarta.titulo;
    els.btnAlterarEscolhas.hidden = isEnrollmentLocked();
    setProgress('revisao', true);
    updateDayButtons();
    focusSection(els.etapaSucesso, document.getElementById('titulo-sucesso'));
  }

  async function identifyAluno(event) {
    event.preventDefault();
    const aluno = getFormAluno();
    showError(els.erroIdentificacao, '');

    if (!aluno.turma) {
      showError(els.erroIdentificacao, 'Selecione sua turma para continuar.');
      els.turma.focus();
      return;
    }
    if (!aluno.nome || !(ALUNOS_POR_TURMA[aluno.turma] || []).includes(aluno.nome)) {
      showError(els.erroIdentificacao, 'Selecione seu nome na lista da turma para continuar.');
      els.nome.focus();
      return;
    }

    setButtonLoading(els.btnIdentificar, true, 'Consultando…');
    try {
      const escolhas = await fetchJson(`/api/minhas-escolhas?nome=${encodeURIComponent(aluno.nome)}&turma=${encodeURIComponent(aluno.turma)}`);
      state.aluno = aluno;
      state.confirmadas = {
        terca: normalizeChoice(escolhas.terca),
        quarta: normalizeChoice(escolhas.quarta),
      };
      state.rascunho = {
        terca: state.confirmadas.terca ? { ...state.confirmadas.terca } : null,
        quarta: state.confirmadas.quarta ? { ...state.confirmadas.quarta } : null,
      };
      state.listas = { terca: null, quarta: null };
      persistAluno();
      updateStudentBar();
      els.identificacao.hidden = true;
      els.areaMatricula.hidden = false;
      startPolling();

      if (state.confirmadas.terca && state.confirmadas.quarta) {
        showSuccess();
      } else {
        showChoice(state.confirmadas.terca ? 'quarta' : 'terca');
      }
    } catch (error) {
      showError(els.erroIdentificacao, 'Não foi possível consultar seus dados. Verifique sua conexão e tente novamente.');
    } finally {
      setButtonLoading(els.btnIdentificar, false, 'Ver Itinerários');
    }
  }

  async function confirmEnrollment() {
    showError(els.erroConfirmacao, '');
    setButtonLoading(els.btnConfirmar, true, 'Confirmando…');
    try {
      const result = await fetchJson('/api/inscricoes/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: state.aluno.nome,
          turma: state.aluno.turma,
          tercaId: state.rascunho.terca.id,
          quartaId: state.rascunho.quarta.id,
        }),
      });
      state.confirmadas = {
        terca: normalizeChoice(result.escolhas.terca),
        quarta: normalizeChoice(result.escolhas.quarta),
      };
      state.rascunho = {
        terca: { ...state.confirmadas.terca },
        quarta: { ...state.confirmadas.quarta },
      };
      showSuccess();
    } catch (error) {
      if (error.status === 409) {
        const dia = error.data.dia ? DIA_LABEL[error.data.dia] : 'um dos dias';
        showError(els.erroConfirmacao, `O itinerário de ${dia} acabou de lotar. Edite essa escolha e tente novamente.`);
      } else if (error.status === 403) {
        showError(els.erroConfirmacao, 'Esta matrícula já foi confirmada e não pode mais ser alterada.');
      } else {
        showError(els.erroConfirmacao, 'Não foi possível confirmar agora. Suas escolhas foram mantidas; tente novamente.');
      }
    } finally {
      setButtonLoading(els.btnConfirmar, false, 'Confirmar Matrícula');
    }
  }

  function resetAluno({ clearStorage = false } = {}) {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = null;
    state.aluno = null;
    state.currentDia = 'terca';
    state.listas = { terca: null, quarta: null };
    state.confirmadas = { terca: null, quarta: null };
    state.rascunho = { terca: null, quarta: null };
    els.areaMatricula.hidden = true;
    els.identificacao.hidden = false;
    setProgress('identificacao');
    if (clearStorage) {
      localStorage.removeItem('itin_nome');
      localStorage.removeItem('itin_turma');
      els.formIdentificacao.reset();
      populateTurmas();
      populateNomes('');
    }
    focusSection(els.identificacao, document.getElementById('titulo-identificacao'));
  }

  els.formIdentificacao.addEventListener('submit', identifyAluno);
  els.turma.addEventListener('change', () => {
    localStorage.removeItem('itin_nome');
    populateNomes(els.turma.value);
    showError(els.erroIdentificacao, '');
  });
  els.btnTentarNovamente.addEventListener('click', () => loadDay(state.currentDia, { force: true }));

  els.dayButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const dia = button.dataset.dia;
      if (dia === 'quarta' && !state.rascunho.terca) return;
      showChoice(dia);
    });
  });

  els.btnAvancar.addEventListener('click', () => {
    if (state.currentDia === 'terca') showChoice('quarta');
    else showReview();
  });

  els.btnEditarDia.forEach((button) => {
    button.addEventListener('click', () => showChoice(button.dataset.dia));
  });

  els.btnConfirmar.addEventListener('click', confirmEnrollment);

  els.btnAlterarEscolhas.addEventListener('click', () => {
    if (isEnrollmentLocked()) return;
    state.rascunho = {
      terca: { ...state.confirmadas.terca },
      quarta: { ...state.confirmadas.quarta },
    };
    showChoice('terca');
  });

  els.btnTrocarAluno.addEventListener('click', () => {
    if (hasUnsavedChanges() && !window.confirm('Trocar de aluno e descartar as escolhas que ainda não foram confirmadas?')) return;
    resetAluno({ clearStorage: true });
  });

  els.btnEncerrar.addEventListener('click', () => resetAluno({ clearStorage: true }));

  window.addEventListener('focus', () => updateAvailability(state.currentDia));
  window.addEventListener('beforeunload', (event) => {
    if (!hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = '';
  });

  prefillAluno();
  setProgress('identificacao');
})();
