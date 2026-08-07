(function () {
  const DIA_LABEL = { terca: 'terça-feira', quarta: 'quarta-feira' };
  const DIA_TITULO = { terca: 'Terça-feira', quarta: 'Quarta-feira' };

  const els = {
    nome: document.getElementById('input-nome'),
    turma: document.getElementById('input-turma'),
    statusAluno: document.getElementById('status-aluno'),
    lembrete: document.getElementById('lembrete'),
    tabs: document.querySelectorAll('.tab-btn'),
    tabQuarta: document.getElementById('tab-quarta'),
    lista: document.getElementById('lista-itinerarios'),
    template: document.getElementById('template-card'),
    parabensOverlay: document.getElementById('parabens-overlay'),
    parabensTitulo: document.getElementById('parabens-titulo'),
    parabensResumo: document.getElementById('parabens-resumo'),
    btnParabensAlterar: document.getElementById('btn-parabens-alterar'),
    btnParabensProximo: document.getElementById('btn-parabens-proximo'),
    confirmarInscricaoOverlay: document.getElementById('confirmar-inscricao-overlay'),
    confirmarInscricaoResumo: document.getElementById('confirmar-inscricao-resumo'),
    btnConfirmarInscricaoOk: document.getElementById('btn-confirmar-inscricao-ok'),
    btnConfirmarInscricaoAlterar: document.getElementById('btn-confirmar-inscricao-alterar'),
  };

  let currentDia = 'terca';
  let escolhas = { terca: null, quarta: null };
  let pollTimer = null;

  function getAluno() {
    return {
      nome: (els.nome.value || '').trim(),
      turma: els.turma.value || '',
    };
  }

  function alunoIdentificado() {
    const { nome, turma } = getAluno();
    return Boolean(nome && turma);
  }

  const ALUNOS_POR_TURMA = window.ALUNOS_POR_TURMA || {};

  function popularTurmas() {
    els.turma.innerHTML = '<option value="">Selecione sua turma...</option>';
    Object.keys(ALUNOS_POR_TURMA).forEach((turma) => {
      const opt = document.createElement('option');
      opt.value = turma;
      opt.textContent = turma;
      els.turma.appendChild(opt);
    });
  }

  function popularNomes(turma) {
    const nomes = (ALUNOS_POR_TURMA[turma] || []).slice().sort((a, b) => a.localeCompare(b, 'pt-BR'));
    els.nome.innerHTML = '';
    const optVazia = document.createElement('option');
    optVazia.value = '';
    optVazia.textContent = nomes.length ? 'Selecione seu nome...' : 'Selecione a turma primeiro...';
    els.nome.appendChild(optVazia);
    nomes.forEach((nome) => {
      const opt = document.createElement('option');
      opt.value = nome;
      opt.textContent = nome;
      els.nome.appendChild(opt);
    });
    els.nome.disabled = nomes.length === 0;
  }

  function loadAlunoFromStorage() {
    popularTurmas();
    const turmaSalva = localStorage.getItem('itin_turma') || '';
    const nomeSalvo = localStorage.getItem('itin_nome') || '';
    els.turma.value = turmaSalva;
    popularNomes(turmaSalva);
    if (nomeSalvo && Array.from(els.nome.options).some((o) => o.value === nomeSalvo)) {
      els.nome.value = nomeSalvo;
    }
    atualizarStatusAluno();
  }

  function persistirAluno() {
    const { nome, turma } = getAluno();
    if (nome) localStorage.setItem('itin_nome', nome);
    if (turma) localStorage.setItem('itin_turma', turma);
    atualizarStatusAluno();
  }

  function atualizarAposIdentificar() {
    if (!alunoIdentificado()) return;
    carregarMinhasEscolhas().then(() => {
      currentDia = escolhas.terca && !escolhas.quarta ? 'quarta' : 'terca';
      atualizarTabs();
      carregarLista();
    });
  }

  function atualizarStatusAluno() {
    if (alunoIdentificado()) {
      els.statusAluno.textContent = `Identificado como ${getAluno().nome} (${getAluno().turma}).`;
      els.statusAluno.className = 'hint ok';
    } else {
      els.statusAluno.textContent = 'Selecione sua turma e depois seu nome antes de escolher um itinerário.';
      els.statusAluno.className = 'hint';
    }
  }

  function videoEmbedHtml(url) {
    if (!url) return '';
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
    if (yt) {
      return `<iframe src="https://www.youtube.com/embed/${yt[1]}" allowfullscreen loading="lazy"></iframe>`;
    }
    const drive = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    if (drive) {
      return `<iframe src="https://drive.google.com/file/d/${drive[1]}/preview" allowfullscreen loading="lazy"></iframe>`;
    }
    if (/\.mp4($|\?)/i.test(url)) {
      return `<video src="${url}" controls></video>`;
    }
    return `<a class="video-vazio" href="${url}" target="_blank" rel="noopener">Ver vídeo</a>`;
  }

  function renderLembrete() {
    if (!alunoIdentificado()) {
      els.lembrete.hidden = true;
      els.lembrete.classList.remove('lembrete-confirmado');
      return;
    }
    if (escolhas.terca && escolhas.terca.confirmado && escolhas.quarta && escolhas.quarta.confirmado) {
      els.lembrete.hidden = false;
      els.lembrete.classList.add('lembrete-confirmado');
      els.lembrete.textContent = 'Sua inscrição já foi confirmada nos dois itinerários e não pode mais ser alterada.';
      return;
    }
    els.lembrete.classList.remove('lembrete-confirmado');
    const faltando = ['terca', 'quarta'].filter((d) => !escolhas[d]);
    if (faltando.length === 0) {
      els.lembrete.hidden = true;
      return;
    }
    els.lembrete.hidden = false;
    els.lembrete.textContent = `Você ainda não escolheu um itinerário para: ${faltando.map((d) => DIA_LABEL[d]).join(' e ')}.`;
  }

  function atualizarTabs() {
    els.tabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.dia === currentDia));
    els.tabQuarta.disabled = !escolhas.terca;
  }

  function renderCard(item, dia) {
    const node = els.template.content.cloneNode(true);
    const article = node.querySelector('.itinerario-card');
    const minhaEscolhaDia = escolhas[dia];
    const isSelected = Boolean(minhaEscolhaDia && minhaEscolhaDia.itinerario_id === item.id);

    node.querySelector('.titulo').textContent = item.titulo;
    node.querySelector('.professor').textContent = `Professor(a): ${item.professor}`;
    node.querySelector('.descricao').textContent = item.descricao;

    const badge = node.querySelector('.badge-vagas');
    if (item.vagas_restantes <= 0) {
      badge.textContent = 'Esgotado';
      badge.classList.add('esgotado');
    } else if (item.vagas_restantes <= 3) {
      badge.textContent = `${item.vagas_restantes} vaga(s)`;
      badge.classList.add('pouco');
    } else {
      badge.textContent = `${item.vagas_restantes} vaga(s)`;
    }

    const videoArea = node.querySelector('.video-area');
    const videoUrl = isSelected ? minhaEscolhaDia.video_url : item.video_url;
    if (isSelected) {
      videoArea.innerHTML = videoUrl ? videoEmbedHtml(videoUrl) : '<p class="video-vazio">Vídeo em breve.</p>';
    } else if (item.bloqueado) {
      videoArea.innerHTML = '<p class="video-bloqueado">Vagas encerradas — vídeo indisponível.</p>';
      article.classList.add('esgotado');
    } else {
      videoArea.innerHTML = videoUrl ? videoEmbedHtml(videoUrl) : '<p class="video-vazio">Vídeo em breve.</p>';
    }

    const confirmadoNoDia = Boolean(minhaEscolhaDia && minhaEscolhaDia.confirmado);

    const btn = node.querySelector('.btn-escolher');
    if (confirmadoNoDia) {
      btn.textContent = isSelected ? 'Inscrição confirmada' : 'Inscrição encerrada';
      btn.disabled = true;
      if (isSelected) article.classList.add('escolhido');
    } else if (isSelected) {
      btn.textContent = 'Selecionado';
      btn.classList.add('selecionado');
      article.classList.add('escolhido');
    } else if (item.bloqueado) {
      btn.textContent = 'Vagas encerradas';
      btn.disabled = true;
    } else {
      btn.textContent = 'Selecionar este itinerário';
    }

    const podeSelecionar = !confirmadoNoDia && (!item.bloqueado || isSelected);
    if (podeSelecionar) {
      btn.addEventListener('click', () => escolherItinerario(item, dia));
    }

    if (isSelected && !confirmadoNoDia) {
      const btnRemover = document.createElement('button');
      btnRemover.type = 'button';
      btnRemover.className = 'btn-remover-aluno btn-remover-escolha';
      btnRemover.textContent = 'Remover escolha';
      btnRemover.addEventListener('click', () => removerEscolha(dia));
      article.appendChild(btnRemover);
    }

    return node;
  }

  async function removerEscolha(dia) {
    if (!confirm(`Remover sua escolha de ${DIA_LABEL[dia]}? A vaga ficará livre para outro aluno.`)) return;
    const { nome, turma } = getAluno();
    try {
      const resp = await fetch('/api/inscricoes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, turma, dia }),
      });
      if (resp.status === 403) {
        alert('Sua inscrição já foi confirmada e não pode mais ser alterada.');
        await carregarMinhasEscolhas();
        await carregarLista();
        return;
      }
      if (!resp.ok) {
        alert('Não foi possível remover sua escolha. Tente novamente.');
        return;
      }
      await carregarMinhasEscolhas();
      atualizarTabs();
      await carregarLista();
    } catch (err) {
      alert('Erro de conexão. Verifique sua internet e tente novamente.');
    }
  }

  async function escolherItinerario(item, dia) {
    if (!alunoIdentificado()) {
      alert('Preencha seu nome, selecione a série e clique em Salvar antes de escolher um itinerário.');
      els.nome.focus();
      return;
    }
    const { nome, turma } = getAluno();
    try {
      const resp = await fetch('/api/inscricoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, turma, itinerarioId: item.id }),
      });
      if (resp.status === 409) {
        alert('Esse itinerário acabou de lotar. Escolha outro, por favor.');
        await carregarLista();
        return;
      }
      if (resp.status === 403) {
        alert('Sua inscrição já foi confirmada e não pode mais ser alterada.');
        await carregarMinhasEscolhas();
        await carregarLista();
        return;
      }
      if (!resp.ok) {
        alert('Não foi possível registrar sua escolha. Tente novamente.');
        return;
      }
      await carregarMinhasEscolhas();
      atualizarTabs();
      await carregarLista();

      if (dia === 'quarta') {
        abrirConfirmarInscricao();
      } else {
        abrirParabens(item, dia);
      }
    } catch (err) {
      alert('Erro de conexão. Verifique sua internet e tente novamente.');
    }
  }

  function abrirParabens(item, dia) {
    els.parabensTitulo.textContent = 'Parabéns pela escolha!';
    els.parabensResumo.textContent = `Você escolheu "${item.titulo}" para ${DIA_LABEL[dia]}.`;
    els.btnParabensAlterar.hidden = false;

    els.btnParabensAlterar.onclick = () => {
      els.parabensOverlay.hidden = true;
    };

    els.btnParabensProximo.textContent = 'Escolher o Próximo';
    els.btnParabensProximo.onclick = () => {
      els.parabensOverlay.hidden = true;
      mudarDia('quarta');
    };

    els.parabensOverlay.hidden = false;
  }

  function abrirParabensFinal() {
    els.parabensTitulo.textContent = 'Inscrição confirmada!';
    els.parabensResumo.innerHTML = `Você está inscrito em:<br><strong>Terça-feira:</strong> ${escolhas.terca.titulo}<br><strong>Quarta-feira:</strong> ${escolhas.quarta.titulo}`;
    els.btnParabensAlterar.hidden = true;

    els.btnParabensProximo.textContent = 'Fechar';
    els.btnParabensProximo.onclick = () => {
      els.parabensOverlay.hidden = true;
    };

    els.parabensOverlay.hidden = false;
  }

  function abrirConfirmarInscricao() {
    els.confirmarInscricaoResumo.innerHTML = '';
    [
      ['Terça-feira', escolhas.terca],
      ['Quarta-feira', escolhas.quarta],
    ].forEach(([label, escolha]) => {
      const div = document.createElement('div');
      div.className = 'linha';
      div.innerHTML = `<strong>${label}:</strong> ${escolha ? escolha.titulo : ''}`;
      els.confirmarInscricaoResumo.appendChild(div);
    });
    els.confirmarInscricaoOverlay.hidden = false;
  }

  async function carregarLista() {
    const resp = await fetch(`/api/itinerarios/${currentDia}`);
    const items = await resp.json();
    els.lista.innerHTML = '';
    for (const item of items) {
      els.lista.appendChild(renderCard(item, currentDia));
    }
  }

  async function carregarMinhasEscolhas() {
    if (!alunoIdentificado()) {
      escolhas = { terca: null, quarta: null };
      renderLembrete();
      return;
    }
    const { nome, turma } = getAluno();
    const resp = await fetch(`/api/minhas-escolhas?nome=${encodeURIComponent(nome)}&turma=${encodeURIComponent(turma)}`);
    escolhas = await resp.json();
    renderLembrete();
  }

  function mudarDia(dia) {
    if (dia === 'quarta' && !escolhas.terca) return;
    currentDia = dia;
    atualizarTabs();
    carregarLista();
  }

  els.tabs.forEach((btn) => btn.addEventListener('click', () => mudarDia(btn.dataset.dia)));

  els.turma.addEventListener('change', () => {
    localStorage.removeItem('itin_nome');
    els.nome.value = '';
    popularNomes(els.turma.value);
    persistirAluno();
    atualizarAposIdentificar();
  });

  els.nome.addEventListener('change', () => {
    persistirAluno();
    atualizarAposIdentificar();
  });

  els.parabensOverlay.addEventListener('click', (ev) => {
    if (ev.target === els.parabensOverlay) els.parabensOverlay.hidden = true;
  });

  els.btnConfirmarInscricaoOk.addEventListener('click', async () => {
    const { nome, turma } = getAluno();
    els.btnConfirmarInscricaoOk.disabled = true;
    try {
      const resp = await fetch('/api/confirmar-inscricao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, turma }),
      });
      if (!resp.ok) {
        alert('Não foi possível confirmar sua inscrição. Tente novamente.');
        return;
      }
      await carregarMinhasEscolhas();
      atualizarTabs();
      await carregarLista();
      els.confirmarInscricaoOverlay.hidden = true;
      abrirParabensFinal();
    } catch (err) {
      alert('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      els.btnConfirmarInscricaoOk.disabled = false;
    }
  });
  els.btnConfirmarInscricaoAlterar.addEventListener('click', () => {
    els.confirmarInscricaoOverlay.hidden = true;
  });
  els.confirmarInscricaoOverlay.addEventListener('click', (ev) => {
    if (ev.target === els.confirmarInscricaoOverlay) els.confirmarInscricaoOverlay.hidden = true;
  });

  window.addEventListener('focus', () => {
    carregarLista();
    carregarMinhasEscolhas();
  });

  pollTimer = setInterval(() => {
    carregarLista();
  }, 25000);

  loadAlunoFromStorage();
  carregarMinhasEscolhas().then(() => {
    currentDia = escolhas.terca && !escolhas.quarta ? 'quarta' : 'terca';
    atualizarTabs();
    carregarLista();
  });
})();
