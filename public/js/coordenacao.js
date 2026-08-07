(function () {
  const els = {
    loginBox: document.getElementById('login-box'),
    inputLogin: document.getElementById('input-login'),
    inputSenha: document.getElementById('input-senha'),
    btnEntrar: document.getElementById('btn-entrar'),
    loginErro: document.getElementById('login-erro'),
    painel: document.getElementById('painel'),
    lista: document.getElementById('relatorio-lista'),
    btnAtualizar: document.getElementById('btn-atualizar'),
    btnExportTudo: document.getElementById('btn-export-tudo'),
    template: document.getElementById('template-relatorio-card'),
  };

  function getAuthHeader() {
    const creds = sessionStorage.getItem('coordenacao_creds') || '';
    return { Authorization: `Basic ${creds}` };
  }

  async function tentarEntrar(login, senha) {
    const encoded = btoa(`${login}:${senha}`);
    const resp = await fetch('/api/coordenacao/relatorio', { headers: { Authorization: `Basic ${encoded}` } });
    if (resp.status === 401) {
      els.loginErro.textContent = 'Usuário ou senha inválidos.';
      return false;
    }
    if (!resp.ok) {
      els.loginErro.textContent = 'Erro ao conectar ao servidor.';
      return false;
    }
    sessionStorage.setItem('coordenacao_creds', encoded);
    els.loginBox.hidden = true;
    els.painel.hidden = false;
    const items = await resp.json();
    render(items);
    return true;
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
    const items = await resp.json();
    render(items);
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
      tr.innerHTML = '<td></td><td></td><td></td><td></td>';
      tr.children[0].textContent = idx + 1;
      tr.children[1].textContent = aluno.nome_aluno;
      tr.children[2].textContent = aluno.turma_aluno;
      tr.children[3].textContent = aluno.created_at;
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

  const savedCreds = sessionStorage.getItem('coordenacao_creds');
  if (savedCreds) {
    fetch('/api/coordenacao/relatorio', { headers: { Authorization: `Basic ${savedCreds}` } }).then(async (resp) => {
      if (resp.ok) {
        els.loginBox.hidden = true;
        els.painel.hidden = false;
        render(await resp.json());
      }
    });
  }
})();
