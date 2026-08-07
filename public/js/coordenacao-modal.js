(function () {
  const els = {
    overlay: document.getElementById('coordenacao-overlay'),
    btnAbrir: document.getElementById('btn-abrir-coordenacao'),
    btnFechar: document.getElementById('btn-fechar-coordenacao'),
    loginBox: document.getElementById('coord-login-box'),
    inputLogin: document.getElementById('coord-input-login'),
    inputSenha: document.getElementById('coord-input-senha'),
    btnEntrar: document.getElementById('coord-btn-entrar'),
    loginErro: document.getElementById('coord-login-erro'),
    painel: document.getElementById('coord-painel'),
    lista: document.getElementById('coord-relatorio-lista'),
    btnAtualizar: document.getElementById('coord-btn-atualizar'),
    btnExportTudo: document.getElementById('coord-btn-export-tudo'),
    template: document.getElementById('template-relatorio-card'),
  };

  if (!els.overlay) return;

  function getAuthHeader() {
    const creds = sessionStorage.getItem('coordenacao_creds') || '';
    return { Authorization: `Basic ${creds}` };
  }

  function abrirModal() {
    els.overlay.hidden = false;
    const savedCreds = sessionStorage.getItem('coordenacao_creds');
    if (savedCreds) {
      carregar();
    }
  }

  function fecharModal() {
    els.overlay.hidden = true;
  }

  els.btnAbrir.addEventListener('click', abrirModal);
  els.btnFechar.addEventListener('click', fecharModal);
  els.overlay.addEventListener('click', (ev) => {
    if (ev.target === els.overlay) fecharModal();
  });

  async function tentarEntrar(login, senha) {
    const encoded = btoa(`${login}:${senha}`);
    const resp = await fetch('/api/coordenacao/relatorio', { headers: { Authorization: `Basic ${encoded}` } });
    if (resp.status === 401) {
      els.loginErro.textContent = 'Usuário ou senha inválidos.';
      return;
    }
    if (!resp.ok) {
      els.loginErro.textContent = 'Erro ao conectar ao servidor.';
      return;
    }
    sessionStorage.setItem('coordenacao_creds', encoded);
    els.loginBox.hidden = true;
    els.painel.hidden = false;
    render(await resp.json());
  }

  els.btnEntrar.addEventListener('click', () => {
    const login = els.inputLogin.value.trim();
    const senha = els.inputSenha.value;
    if (!login || !senha) return;
    tentarEntrar(login, senha);
  });

  els.btnAtualizar.addEventListener('click', carregar);

  async function carregar() {
    const resp = await fetch('/api/coordenacao/relatorio', { headers: getAuthHeader() });
    if (resp.status === 401) {
      sessionStorage.removeItem('coordenacao_creds');
      els.loginBox.hidden = false;
      els.painel.hidden = true;
      els.loginErro.textContent = 'Sessão expirada, entre novamente.';
      return;
    }
    els.loginBox.hidden = true;
    els.painel.hidden = false;
    render(await resp.json());
  }

  async function baixarCsv(itinerarioId) {
    const url = itinerarioId ? `/api/coordenacao/export.csv?itinerarioId=${itinerarioId}` : '/api/coordenacao/export.csv';
    const resp = await fetch(url, { headers: getAuthHeader() });
    if (!resp.ok) {
      alert('Não foi possível exportar o CSV.');
      return;
    }
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = 'inscricoes.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }

  els.btnExportTudo.addEventListener('click', () => baixarCsv());

  async function removerAluno(id, nome) {
    if (!confirm(`Remover a inscrição de "${nome}"? A vaga volta a ficar disponível.`)) return;
    const resp = await fetch(`/api/coordenacao/inscricoes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!resp.ok) {
      alert('Não foi possível remover essa inscrição.');
      return;
    }
    await carregar();
  }

  function renderCard(item) {
    const node = els.template.content.cloneNode(true);

    node.querySelector('.dia-tag').textContent = item.dia === 'terca' ? 'Terça-feira' : 'Quarta-feira';
    node.querySelector('.titulo').textContent = item.titulo;
    node.querySelector('.professor').textContent = `Professor(a): ${item.professor}`;

    const badge = node.querySelector('.badge-vagas');
    badge.textContent = `${item.alunos.length} / ${item.capacidade} vagas ocupadas`;
    if (item.bloqueado) badge.classList.add('esgotado');

    node.querySelector('.btn-export-item').addEventListener('click', () => baixarCsv(item.id));

    const listaAlunos = node.querySelector('.lista-alunos');
    const tbody = listaAlunos.querySelector('tbody');
    const semAlunos = listaAlunos.querySelector('.sem-alunos');
    item.alunos.forEach((aluno, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td></td><td></td><td></td><td></td><td></td>';
      tr.children[0].textContent = idx + 1;
      tr.children[1].textContent = aluno.nome_aluno;
      tr.children[2].textContent = aluno.turma_aluno;
      tr.children[3].textContent = aluno.created_at;
      const btnRemover = document.createElement('button');
      btnRemover.textContent = 'Remover';
      btnRemover.className = 'btn-remover-aluno';
      btnRemover.type = 'button';
      btnRemover.addEventListener('click', () => removerAluno(aluno.id, aluno.nome_aluno));
      tr.children[4].appendChild(btnRemover);
      tbody.appendChild(tr);
    });
    semAlunos.hidden = item.alunos.length > 0;

    node.querySelector('.btn-toggle-alunos').addEventListener('click', () => {
      listaAlunos.hidden = !listaAlunos.hidden;
    });

    return node;
  }

  function render(items) {
    els.lista.innerHTML = '';
    items.forEach((item) => els.lista.appendChild(renderCard(item)));
  }
})();
