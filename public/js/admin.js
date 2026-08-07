(function () {
  const els = {
    loginBox: document.getElementById('login-box'),
    formLogin: document.getElementById('form-login-admin'),
    inputToken: document.getElementById('input-token'),
    btnEntrar: document.getElementById('btn-entrar'),
    loginErro: document.getElementById('login-erro'),
    painel: document.getElementById('painel'),
    lista: document.getElementById('admin-lista'),
    btnAtualizar: document.getElementById('btn-atualizar'),
    linkExportTudo: document.getElementById('link-export-tudo'),
    adminStatus: document.getElementById('admin-status'),
    template: document.getElementById('template-admin-card'),
  };

  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  function getToken() {
    return sessionStorage.getItem('admin_token') || '';
  }

  function authHeaders() {
    return { Authorization: `Bearer ${getToken()}` };
  }

  async function tentarEntrar(token) {
    els.btnEntrar.disabled = true;
    els.btnEntrar.textContent = 'Entrando…';
    try {
      const resp = await fetch('/api/admin/itinerarios', { headers: { Authorization: `Bearer ${token}` } });
      if (resp.status === 401) {
        els.loginErro.textContent = 'Token inválido.';
        return false;
      }
      if (!resp.ok) {
        els.loginErro.textContent = 'Erro ao conectar ao servidor. Tente novamente.';
        return false;
      }
      sessionStorage.setItem('admin_token', token);
      els.loginBox.hidden = true;
      els.painel.hidden = false;
      const items = await resp.json();
      render(items);
      return true;
    } catch (error) {
      els.loginErro.textContent = 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
      return false;
    } finally {
      els.btnEntrar.disabled = false;
      els.btnEntrar.textContent = 'Entrar';
    }
  }

  els.formLogin.addEventListener('submit', (event) => {
    event.preventDefault();
    const token = els.inputToken.value.trim();
    if (!token) {
      els.loginErro.textContent = 'Informe o token de acesso.';
      els.inputToken.focus();
      return;
    }
    tentarEntrar(token);
  });

  els.btnAtualizar.addEventListener('click', carregar);

  async function carregar() {
    els.btnAtualizar.disabled = true;
    els.btnAtualizar.textContent = 'Atualizando…';
    els.adminStatus.textContent = '';
    try {
      const resp = await fetch('/api/admin/itinerarios', { headers: authHeaders() });
      if (resp.status === 401) {
        sessionStorage.removeItem('admin_token');
        els.loginBox.hidden = false;
        els.painel.hidden = true;
        els.loginErro.textContent = 'Sessão expirada, entre novamente.';
        return;
      }
      if (!resp.ok) throw new Error('erro_requisicao');
      const items = await resp.json();
      render(items);
      els.adminStatus.textContent = `Dados atualizados às ${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date())}.`;
    } catch (error) {
      els.adminStatus.textContent = 'Não foi possível atualizar. Tente novamente.';
    } finally {
      els.btnAtualizar.disabled = false;
      els.btnAtualizar.textContent = 'Atualizar Dados';
    }
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
      const expanded = !form.hidden;
      btnToggleEditar.setAttribute('aria-expanded', String(expanded));
      btnToggleEditar.textContent = expanded ? 'Cancelar Edição' : 'Editar';
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
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Salvando…';
      try {
        const resp = await fetch(`/api/admin/itinerarios/${item.id}`, {
          method: 'PUT',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!resp.ok) throw new Error('erro_requisicao');
        msg.textContent = 'Alterações salvas.';
        setTimeout(carregar, 1200);
      } catch (error) {
        msg.textContent = 'Erro ao salvar. Revise os campos e tente novamente.';
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar alterações';
      }
    });

    const listaAlunos = node.querySelector('.lista-alunos');
    const tbody = listaAlunos.querySelector('tbody');
    const semAlunos = listaAlunos.querySelector('.sem-alunos');
    item.alunos.forEach((aluno, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx + 1}</td><td></td><td></td><td></td>`;
      tr.children[1].textContent = aluno.nome_aluno;
      tr.children[2].textContent = aluno.turma_aluno;
      tr.children[3].textContent = dateFormatter.format(new Date(aluno.created_at));
      tbody.appendChild(tr);
    });
    semAlunos.hidden = item.alunos.length > 0;

    const btnToggleAlunos = node.querySelector('.btn-toggle-alunos');
    btnToggleAlunos.addEventListener('click', () => {
      listaAlunos.hidden = !listaAlunos.hidden;
      const expanded = !listaAlunos.hidden;
      btnToggleAlunos.setAttribute('aria-expanded', String(expanded));
      btnToggleAlunos.textContent = expanded ? 'Ocultar Alunos' : 'Ver Alunos';
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
