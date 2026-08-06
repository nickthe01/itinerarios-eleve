(function () {
  const els = {
    loginBox: document.getElementById('login-box'),
    inputToken: document.getElementById('input-token'),
    btnEntrar: document.getElementById('btn-entrar'),
    loginErro: document.getElementById('login-erro'),
    painel: document.getElementById('painel'),
    lista: document.getElementById('admin-lista'),
    btnAtualizar: document.getElementById('btn-atualizar'),
    linkExportTudo: document.getElementById('link-export-tudo'),
    template: document.getElementById('template-admin-card'),
  };

  function getToken() {
    return sessionStorage.getItem('admin_token') || '';
  }

  function authHeaders() {
    return { Authorization: `Bearer ${getToken()}` };
  }

  async function tentarEntrar(token) {
    const resp = await fetch('/api/admin/itinerarios', { headers: { Authorization: `Bearer ${token}` } });
    if (resp.status === 401) {
      els.loginErro.textContent = 'Token inválido.';
      return false;
    }
    if (!resp.ok) {
      els.loginErro.textContent = 'Erro ao conectar ao servidor.';
      return false;
    }
    sessionStorage.setItem('admin_token', token);
    els.loginBox.hidden = true;
    els.painel.hidden = false;
    const items = await resp.json();
    render(items);
    return true;
  }

  els.btnEntrar.addEventListener('click', () => {
    const token = els.inputToken.value.trim();
    if (!token) return;
    tentarEntrar(token);
  });

  els.btnAtualizar.addEventListener('click', carregar);

  async function carregar() {
    const resp = await fetch('/api/admin/itinerarios', { headers: authHeaders() });
    if (resp.status === 401) {
      sessionStorage.removeItem('admin_token');
      els.loginBox.hidden = false;
      els.painel.hidden = true;
      els.loginErro.textContent = 'Sessão expirada, entre novamente.';
      return;
    }
    const items = await resp.json();
    render(items);
  }

  function renderCard(item) {
    const node = els.template.content.cloneNode(true);
    const article = node.querySelector('.admin-card');

    node.querySelector('.dia-tag').textContent = item.dia === 'terca' ? 'Terça-feira' : 'Quarta-feira';
    node.querySelector('.titulo').textContent = item.titulo;
    node.querySelector('.professor').textContent = `Professor(a): ${item.professor}`;
    node.querySelector('.pendente-badge').hidden = !item.placeholder;

    const badge = node.querySelector('.badge-vagas');
    badge.textContent = `${item.alunos.length} / ${item.capacidade} vagas ocupadas`;
    if (item.bloqueado) badge.classList.add('esgotado');

    const token = getToken();
    node.querySelector('.btn-export').href = `/api/admin/export.csv?itinerarioId=${item.id}&token=${encodeURIComponent(token)}`;

    const form = node.querySelector('.form-editar');
    form.titulo.value = item.titulo;
    form.professor.value = item.professor;
    form.descricao.value = item.descricao;
    form.video_url.value = item.video_url;
    form.capacidade.value = item.capacidade;

    const btnToggleEditar = node.querySelector('.btn-toggle-editar');
    btnToggleEditar.addEventListener('click', () => {
      form.hidden = !form.hidden;
    });

    const msg = node.querySelector('.salvo-msg');

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const body = {
        titulo: form.titulo.value.trim(),
        professor: form.professor.value.trim(),
        descricao: form.descricao.value.trim(),
        video_url: form.video_url.value.trim(),
        capacidade: parseInt(form.capacidade.value, 10),
        placeholder: 0,
      };
      const resp = await fetch(`/api/admin/itinerarios/${item.id}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        msg.textContent = 'Salvo!';
        await carregar();
      } else {
        msg.textContent = 'Erro ao salvar.';
      }
      setTimeout(() => {
        msg.textContent = '';
      }, 3000);
    });

    const listaAlunos = node.querySelector('.lista-alunos');
    const tbody = listaAlunos.querySelector('tbody');
    const semAlunos = listaAlunos.querySelector('.sem-alunos');
    item.alunos.forEach((aluno, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx + 1}</td><td></td><td></td><td></td>`;
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
    const token = getToken();
    els.linkExportTudo.href = `/api/admin/export.csv?token=${encodeURIComponent(token)}`;
    items.forEach((item) => els.lista.appendChild(renderCard(item)));
  }

  const savedToken = getToken();
  if (savedToken) {
    tentarEntrar(savedToken);
  }
})();
