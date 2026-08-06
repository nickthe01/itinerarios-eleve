(function () {
  const DIA_LABEL = { terca: 'terça-feira', quarta: 'quarta-feira' };

  const els = {
    nome: document.getElementById('input-nome'),
    turma: document.getElementById('input-turma'),
    btnSalvar: document.getElementById('btn-salvar-aluno'),
    statusAluno: document.getElementById('status-aluno'),
    lembrete: document.getElementById('lembrete'),
    tabs: document.querySelectorAll('.tab-btn'),
    lista: document.getElementById('lista-itinerarios'),
    template: document.getElementById('template-card'),
  };

  let currentDia = 'terca';
  let escolhas = { terca: null, quarta: null };
  let pollTimer = null;

  function getAluno() {
    return {
      nome: (els.nome.value || '').trim(),
      turma: (els.turma.value || '').trim(),
    };
  }

  function alunoIdentificado() {
    const { nome, turma } = getAluno();
    return Boolean(nome && turma);
  }

  function loadAlunoFromStorage() {
    els.nome.value = localStorage.getItem('itin_nome') || '';
    els.turma.value = localStorage.getItem('itin_turma') || '';
    atualizarStatusAluno();
  }

  function salvarAluno() {
    const { nome, turma } = getAluno();
    if (!nome || !turma) {
      els.statusAluno.textContent = 'Preencha nome e turma para continuar.';
      els.statusAluno.className = 'hint';
      return;
    }
    localStorage.setItem('itin_nome', nome);
    localStorage.setItem('itin_turma', turma);
    atualizarStatusAluno();
    carregarMinhasEscolhas();
    carregarLista();
  }

  function atualizarStatusAluno() {
    if (alunoIdentificado()) {
      els.statusAluno.textContent = `Identificado como ${getAluno().nome} (${getAluno().turma}).`;
      els.statusAluno.className = 'hint ok';
    } else {
      els.statusAluno.textContent = 'Preencha seu nome e turma e clique em Salvar antes de escolher um itinerário.';
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
      return;
    }
    const faltando = ['terca', 'quarta'].filter((d) => !escolhas[d]);
    if (faltando.length === 0) {
      els.lembrete.hidden = true;
      return;
    }
    els.lembrete.hidden = false;
    els.lembrete.textContent = `Você ainda não escolheu um itinerário para: ${faltando.map((d) => DIA_LABEL[d]).join(' e ')}.`;
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

    const btn = node.querySelector('.btn-escolher');
    if (isSelected) {
      btn.textContent = 'Sua escolha atual';
      btn.classList.add('selecionado');
      article.classList.add('escolhido');
    } else if (item.bloqueado) {
      btn.textContent = 'Vagas encerradas';
      btn.disabled = true;
    } else {
      btn.textContent = 'Escolher este itinerário';
    }

    btn.addEventListener('click', () => escolherItinerario(item, dia));

    return node;
  }

  async function escolherItinerario(item, dia) {
    if (!alunoIdentificado()) {
      alert('Preencha seu nome e turma e clique em Salvar antes de escolher um itinerário.');
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
      if (!resp.ok) {
        alert('Não foi possível registrar sua escolha. Tente novamente.');
        return;
      }
      await carregarMinhasEscolhas();
      await carregarLista();
    } catch (err) {
      alert('Erro de conexão. Verifique sua internet e tente novamente.');
    }
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

  function trocarAba(dia) {
    currentDia = dia;
    els.tabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.dia === dia));
    carregarLista();
  }

  els.tabs.forEach((btn) => btn.addEventListener('click', () => trocarAba(btn.dataset.dia)));
  els.btnSalvar.addEventListener('click', salvarAluno);

  window.addEventListener('focus', () => {
    carregarLista();
    carregarMinhasEscolhas();
  });

  pollTimer = setInterval(() => {
    carregarLista();
  }, 25000);

  loadAlunoFromStorage();
  carregarMinhasEscolhas().then(carregarLista);
})();
