const dados = carregarDados();
const sessao = exigirSessao(dados, 'gestor');
const pagina = document.getElementById('pagina');
const DURACAO_RECOMENDADA = 90;

function salvar() {
  salvarDados(dados);
  const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const status = document.getElementById('statusSalvo');
  if (status) status.innerHTML = `${icone('check')}Salvo às ${agora}`;
}

function pessoasNaFase(fase) {
  return dados.colaboradores.filter((c) => {
    const s = situacaoNaJornada(dados, c);
    return !s.concluido && !s.naoComecou && s.fase.id === fase.id;
  });
}

function htmlResumoDuracao() {
  const total = duracaoDoPrograma(dados);
  const ok = total === DURACAO_RECOMENDADA;
  return `
    <div class="resumo-duracao ${ok ? 'ok' : 'alerta'}" id="resumoDuracao">
      ${icone(ok ? 'check' : 'alerta')}
      <span>Duração total: <strong>${total} dias</strong>.
      ${ok ? 'O acompanhamento termina no fim do 3º mês.' : `O recomendado é ${DURACAO_RECOMENDADA} dias (3 meses). Ajuste a duração das fases.`}</span>
    </div>`;
}

function htmlFase(fase) {
  const pessoas = pessoasNaFase(fase);
  const treinamentos = dados.treinamentos.filter((t) => t.faseId === fase.id).length;

  return `
    <section class="cartao config-fase" data-fase="${fase.id}">
      <header class="config-fase-topo">
        <span class="trilha-numero">${fase.indice + 1}</span>
        <div class="config-fase-campos">
          <label class="so-leitor" for="nome-${fase.id}">Nome da fase</label>
          <input id="nome-${fase.id}" class="campo-inline campo-titulo" value="${escaparHtml(fase.nome)}" data-campo="nome">
          <div class="config-duracao">
            <label for="dias-${fase.id}">Duração</label>
            <input id="dias-${fase.id}" type="number" min="1" max="90" value="${fase.dias}" data-campo="dias">
            <span>${fase.dias === 1 ? 'dia' : 'dias'} · <strong data-periodo>${textoDoPeriodo(fase)}</strong></span>
          </div>
        </div>
        <div class="trilha-pessoas" title="${pessoas.map((p) => p.nome).join(', ') || 'Ninguém nesta fase agora'}">
          ${pessoas.slice(0, 4).map((p) => avatarPequeno(dados, p)).join('')}
          <span>${pessoas.length ? `${pessoas.length} ${pessoas.length === 1 ? 'pessoa' : 'pessoas'} agora` : 'Ninguém agora'}</span>
        </div>
      </header>

      <label class="subtitulo-bloco" for="objetivo-${fase.id}">Objetivo</label>
      <textarea id="objetivo-${fase.id}" class="campo-inline campo-descricao" rows="2" data-campo="objetivo" placeholder="O que a pessoa deve alcançar nesta fase?">${escaparHtml(fase.objetivo)}</textarea>

      <h3 class="subtitulo-bloco">Funcionalidades desta fase</h3>
      <div class="modulos-config">
        ${Object.entries(MODULOS).map(([id, modulo]) => `
          <label class="interruptor">
            <input type="checkbox" data-modulo="${id}" ${fase.modulos.includes(id) ? 'checked' : ''}>
            <span class="interruptor-trilho"><span class="interruptor-bola"></span></span>
            <span class="interruptor-texto">
              <strong>${icone(modulo.icone)}${modulo.nome}</strong>
              <small>${modulo.descricao}</small>
            </span>
          </label>`).join('')}
      </div>

      <footer class="config-fase-rodape">
        <a class="link-discreto" href="gestor-treinamentos.html">${icone('livro')}${treinamentos} ${treinamentos === 1 ? 'treinamento liberado' : 'treinamentos liberados'} nesta fase</a>
        <button class="btn-texto-perigo" data-remover-fase="${fase.id}" ${dados.fases.length > 1 ? '' : 'disabled'}>${icone('lixeira')}Remover fase</button>
      </footer>
    </section>`;
}

function renderizar() {
  pagina.innerHTML = `
    <div class="cabecalho-pagina">
      <div>
        <h1>Fases da jornada</h1>
        <p>Defina quanto tempo dura cada fase, o objetivo dela e quais funcionalidades o colaborador usa. As mudanças valem para todos na hora.</p>
      </div>
      <span class="status-salvo" id="statusSalvo">${icone('check')}Alterações salvas automaticamente</span>
    </div>
    ${htmlResumoDuracao()}
    ${fasesComPeriodo(dados).map(htmlFase).join('')}
    <button class="btn-adicionar-fase" data-adicionar-fase>${icone('mais')}Adicionar fase</button>`;
}

// atualiza períodos e o total sem redesenhar (mantém o foco no campo)
function atualizarPeriodos() {
  fasesComPeriodo(dados).forEach((fase) => {
    const cartao = pagina.querySelector(`[data-fase="${fase.id}"]`);
    cartao.querySelector('[data-periodo]').textContent = textoDoPeriodo(fase);
  });
  document.getElementById('resumoDuracao').outerHTML = htmlResumoDuracao();
}

function iniciar() {
  if (!sessao) return;
  renderizarIcones();
  montarLayout({ dados, perfil: 'gestor', pagina: 'fases' });
  renderizar();

  pagina.addEventListener('change', (evento) => {
    const cartao = evento.target.closest('[data-fase]');
    if (!cartao) return;
    const fase = dados.fases.find((f) => f.id === cartao.dataset.fase);
    const campo = evento.target.dataset.campo;
    const modulo = evento.target.dataset.modulo;

    if (modulo) {
      fase.modulos = evento.target.checked
        ? Object.keys(MODULOS).filter((m) => m === modulo || fase.modulos.includes(m))
        : fase.modulos.filter((m) => m !== modulo);
      salvar();
      return;
    }
    if (campo === 'dias') {
      fase.dias = Math.min(90, Math.max(1, Math.round(Number(evento.target.value) || 1)));
      evento.target.value = fase.dias;
      salvar();
      atualizarPeriodos();
      return;
    }
    if (campo) {
      const valor = evento.target.value.trim();
      if (campo === 'nome' && !valor) {
        evento.target.value = fase.nome;
        mostrarAviso('A fase precisa de um nome.', 'alerta');
        return;
      }
      fase[campo] = valor;
      salvar();
    }
  });

  pagina.addEventListener('click', (evento) => {
    if (evento.target.closest('[data-adicionar-fase]')) {
      dados.fases.push({ id: novoId('f'), nome: `Nova fase ${dados.fases.length + 1}`, dias: 30, objetivo: '', modulos: [] });
      salvar();
      renderizar();
      const titulos = pagina.querySelectorAll('.campo-titulo');
      titulos[titulos.length - 1].select();
      mostrarAviso('Fase criada. Dê um nome e escolha as funcionalidades.', 'mais');
      return;
    }
    const remover = evento.target.closest('[data-remover-fase]');
    if (remover && !remover.disabled) {
      const indice = dados.fases.findIndex((f) => f.id === remover.dataset.removerFase);
      const destino = dados.fases[indice - 1] || dados.fases[indice + 1];
      // treinamentos da fase removida passam para a fase vizinha
      dados.treinamentos.forEach((t) => { if (t.faseId === remover.dataset.removerFase) t.faseId = destino.id; });
      dados.fases.splice(indice, 1);
      salvar();
      renderizar();
      mostrarAviso(`Fase removida. Os treinamentos dela foram para "${destino.nome}".`, 'lixeira');
    }
  });
}

iniciar();
