const dados = carregarDados();
const sessao = exigirSessao(dados, 'colaborador');
const eu = sessao && buscarColaborador(dados, sessao.id);
const pagina = document.getElementById('pagina');

// banner da fase

function htmlBanner(situacao) {
  const nome = primeiroNome(eu.nome);

  if (situacao.naoComecou) {
    return `
      <section class="banner-fase">
        <span class="banner-rotulo">Bem-vindo(a)</span>
        <h1>Olá, ${nome}!</h1>
        <p>Seu primeiro dia é ${formatarDataExtensa(eu.inicio)}. Até lá, você já pode conhecer os treinamentos.</p>
      </section>`;
  }

  if (situacao.concluido) {
    return `
      <section class="banner-fase">
        <span class="banner-rotulo">Programa de integração concluído</span>
        <h1>Parabéns, ${nome}!</h1>
        <p>Você completou os ${situacao.duracao} dias de integração. Seus registros continuam disponíveis para consulta.</p>
        ${trilhaDeFases(situacao)}
      </section>`;
  }

  const proxima = situacao.fases[situacao.fase.indice + 1];
  const modulos = situacao.fase.modulos.map((m) => `<span class="chip-modulo">${icone(MODULOS[m].icone)}${MODULOS[m].nome}</span>`).join('');

  return `
    <section class="banner-fase">
      <div class="banner-topo">
        <div>
          <span class="banner-rotulo">${situacao.preIntegracao
            ? `Fase 0 · Antes da sua entrada em ${formatarDataExtensa(eu.inicio)}`
            : `Fase ${situacao.fase.numero} de ${situacao.totalDeFases} · ${textoDoPeriodo(situacao.fase)}`}</span>
          <h1>Olá, ${nome}! Você está em: ${situacao.fase.nome}</h1>
          <p>${situacao.fase.objetivo}</p>
        </div>
        ${situacao.preIntegracao
          ? `<div class="banner-dia"><strong>${situacao.diasParaEntrar}</strong><span>${situacao.diasParaEntrar === 1 ? 'dia' : 'dias'} para entrar</span></div>`
          : `<div class="banner-dia"><strong>${situacao.dia}º</strong><span>dia de ${situacao.duracao}</span></div>`}
      </div>
      ${trilhaDeFases(situacao)}
      <div class="banner-rodape">
        ${modulos ? `<div class="banner-modulos"><span>Nesta fase:</span>${modulos}</div>` : ''}
        <span class="banner-proxima">${proxima
          ? `${situacao.diasRestantesNaFase === 1 ? 'Último dia' : `Faltam ${situacao.diasRestantesNaFase} dias`} para a fase <strong>${proxima.nome}</strong>`
          : `${situacao.diasRestantesNaFase === 1 ? 'Último dia' : `Faltam ${situacao.diasRestantesNaFase} dias`} para o fim do programa`}</span>
      </div>
    </section>`;
}

// o que precisa de atenção agora

function pendencias() {
  const itens = [];
  treinamentosDaPessoa(dados, eu)
    .filter((t) => t.liberado && !t.concluidoEm && t.obrigatorio)
    .forEach((t) => itens.push({
      icone: FORMATOS_TREINAMENTO[t.formato].icone,
      texto: `Treinamento obrigatório: <strong>${escaparHtml(t.titulo)}</strong>${t.atrasado ? ' <span class="selo selo-atencao">Atrasado</span>' : ''}`,
      href: `treinamento.html?id=${t.id}`,
    }));
  if (moduloAtivo(dados, eu, 'funcoes') && !eu.funcoesConfirmadasEm && eu.funcoes.length) {
    itens.push({ icone: 'maleta', texto: 'Leia suas <strong>funções</strong> e confirme que entendeu', href: '#funcoes' });
  }
  if (moduloAtivo(dados, eu, 'checkin') && proximoCheckin(eu).pendente) {
    itens.push({ icone: 'coracao', texto: 'Faça o <strong>check-in da semana</strong>', href: '#checkin' });
  }
  const novos = eu.cursos.filter((c) => c.status === 'sugerido').length;
  if (novos) itens.push({ icone: 'play', texto: `${novos} ${novos === 1 ? '<strong>curso novo</strong> recomendado' : '<strong>cursos novos</strong> recomendados'} para você`, href: 'cursos.html' });
  return itens;
}

function htmlPendencias() {
  const itens = pendencias();
  if (!itens.length) return '';
  return `
    <section class="cartao pendencias">
      <h2 class="titulo-cartao titulo-com-icone">${icone('alerta')}Para fazer agora</h2>
      <ul>
        ${itens.map((item) => `<li><a href="${item.href}">${icone(item.icone)}<span>${item.texto}</span>${icone('seta', 'pendencia-seta')}</a></li>`).join('')}
      </ul>
    </section>`;
}

// módulos

function htmlFuncoes() {
  if (!eu.funcoes.length) {
    return `
      <section class="cartao" id="funcoes">
        <h2 class="titulo-cartao titulo-com-icone">${icone('maleta')}Minhas funções</h2>
        <p class="texto-vazio">Seu gestor ainda está definindo suas funções. Elas vão aparecer aqui.</p>
      </section>`;
  }
  return `
    <section class="cartao" id="funcoes">
      <div class="cabecalho-cartao">
        <div>
          <h2 class="titulo-cartao titulo-com-icone">${icone('maleta')}Minhas funções</h2>
          <p class="subtitulo">O que se espera de você como ${escaparHtml(eu.cargo)}</p>
        </div>
      </div>
      <ol class="lista-funcoes">
        ${eu.funcoes.map((f) => `<li><strong>${escaparHtml(f.titulo)}</strong><span>${escaparHtml(f.descricao)}</span></li>`).join('')}
      </ol>
      ${eu.funcoesConfirmadasEm
        ? `<p class="confirmado">${icone('check')}Você confirmou que leu suas funções em ${formatarData(eu.funcoesConfirmadasEm)}.</p>`
        : `<button class="btn btn-primario" data-confirmar-funcoes>${icone('check')}Li e entendi minhas funções</button>`}
    </section>`;
}

function htmlChecklist() {
  const tarefas = tarefasDeHoje(eu).sort((a, b) => {
    const feitaA = tarefaFeitaHoje(a);
    const feitaB = tarefaFeitaHoje(b);
    if (feitaA !== feitaB) return feitaA ? 1 : -1;
    return (a.prazo || '').localeCompare(b.prazo || '');
  });
  const feitas = tarefas.filter(tarefaFeitaHoje).length;
  const valor = porcentagem(feitas, tarefas.length);

  return `
    <section class="cartao" id="checklist">
      <div class="checklist-topo">
        <div>
          <h2 class="titulo-cartao titulo-com-icone">${icone('lista')}Tarefas de hoje</h2>
          <p class="subtitulo">${dataDeHojeExtenso()}</p>
        </div>
        <div class="checklist-progresso">
          <span>${feitas} de ${tarefas.length}</span>
          ${barraProgresso(valor)}
        </div>
      </div>
      ${tarefas.length
        ? `<ul class="lista-tarefas">${tarefas.map((t) => itemTarefa(t)).join('')}</ul>`
        : '<p class="texto-vazio">Nenhuma tarefa para hoje. Seu gestor ainda não atribuiu tarefas.</p>'}
      ${tarefas.length && feitas === tarefas.length ? `<div class="checklist-concluido">${icone('brilho')}Tudo feito por hoje. Ótimo trabalho!</div>` : ''}
    </section>`;
}

function htmlDuvidas() {
  const recentes = eu.registros.slice(0, 2);
  return `
    <section class="cartao" id="duvidas">
      <div class="cabecalho-cartao">
        <div>
          <h2 class="titulo-cartao titulo-com-icone">${icone('ajuda')}Dúvidas e dificuldades</h2>
          <p class="subtitulo">Conte o que está difícil. Você escolhe quem vai ler.</p>
        </div>
        ${eu.registros.length ? '<a class="link-discreto" href="duvidas.html">Ver histórico</a>' : ''}
      </div>
      ${formularioDeRegistro(dados)}
      ${recentes.length ? `<div class="registros-recentes">${recentes.map((r) => htmlRegistro(dados, eu, r)).join('')}</div>` : ''}
    </section>`;
}

const NOTAS_CHECKIN = [
  { nota: 1, rotulo: 'Muito difícil' },
  { nota: 2, rotulo: 'Difícil' },
  { nota: 3, rotulo: 'Ok' },
  { nota: 4, rotulo: 'Bem' },
  { nota: 5, rotulo: 'Muito bem' },
];

function htmlCheckin() {
  const proximo = proximoCheckin(eu);
  if (!proximo.pendente) {
    const rotulo = NOTAS_CHECKIN.find((n) => n.nota === proximo.ultimo.nota).rotulo;
    return `
      <section class="cartao" id="checkin">
        <h2 class="titulo-cartao titulo-com-icone">${icone('coracao')}Check-in de adaptação</h2>
        <p class="checkin-feito">Na última semana você disse que está <strong>${rotulo.toLowerCase()}</strong>.</p>
        <p class="subtitulo">Próximo check-in em ${proximo.emDias} ${proximo.emDias === 1 ? 'dia' : 'dias'}.</p>
      </section>`;
  }
  return `
    <section class="cartao" id="checkin">
      <h2 class="titulo-cartao titulo-com-icone">${icone('coracao')}Check-in de adaptação</h2>
      <p class="subtitulo">Como você está se sentindo na empresa nesta semana? Seu gestor vê sua resposta.</p>
      <form class="form-checkin" data-form-checkin>
        <div class="notas" role="radiogroup" aria-label="Como você está">
          ${NOTAS_CHECKIN.map((n) => `
            <label class="nota nota-${n.nota}">
              <input type="radio" name="nota" value="${n.nota}" required>
              <span><strong>${n.nota}</strong>${n.rotulo}</span>
            </label>`).join('')}
        </div>
        <label class="so-leitor" for="comentarioCheckin">Comentário</label>
        <textarea id="comentarioCheckin" name="comentario" rows="2" placeholder="Quer contar algo? (opcional)"></textarea>
        <button class="btn btn-primario" type="submit">Enviar check-in</button>
      </form>
    </section>`;
}

// coluna lateral

function htmlTreinamentos() {
  const lista = treinamentosDaPessoa(dados, eu).filter((t) => t.liberado);
  if (!lista.length) return '';
  const pendentes = lista.filter((t) => !t.concluidoEm);
  const ordenada = [...pendentes, ...lista.filter((t) => t.concluidoEm)].slice(0, 4);
  return `
    <section class="cartao">
      <div class="cabecalho-cartao">
        <h2 class="titulo-cartao titulo-com-icone">${icone('livro')}Treinamentos</h2>
        <a class="link-discreto" href="treinamentos.html">Ver todos</a>
      </div>
      <ul class="lista-treinamentos-mini">
        ${ordenada.map((t) => `
          <li>
            <a href="treinamento.html?id=${t.id}" class="${t.concluidoEm ? 'feito' : ''}">
              <span class="formato-icone">${icone(FORMATOS_TREINAMENTO[t.formato].icone)}</span>
              <span class="treinamento-mini-texto">
                <strong>${escaparHtml(t.titulo)}</strong>
                <span>${FORMATOS_TREINAMENTO[t.formato].nome}${t.obrigatorio ? ' · obrigatório' : ''}</span>
              </span>
              ${t.concluidoEm ? `<span class="selo selo-sucesso">${icone('check')}Feito</span>` : t.atrasado ? '<span class="selo selo-atencao">Atrasado</span>' : '<span class="selo selo-novo">Pendente</span>'}
            </a>
          </li>`).join('')}
      </ul>
    </section>`;
}

function htmlCursos() {
  const ativos = eu.cursos.filter((c) => c.status === 'sugerido' || c.status === 'andamento' || (c.status === 'concluido' && c.ajudou === null));
  if (!ativos.length) return '';
  return `
    <section class="cartao">
      <div class="cabecalho-cartao">
        <h2 class="titulo-cartao titulo-com-icone">${icone('play')}Meus cursos</h2>
        <a class="link-discreto" href="cursos.html">Ver todos</a>
      </div>
      <div class="cursos-externos compactos">${ativos.slice(0, 2).map((c) => cartaoCursoExterno(dados, c)).join('')}</div>
    </section>`;
}

function htmlProximaFase(situacao) {
  if (situacao.concluido || situacao.naoComecou) return '';
  const proxima = situacao.fases[situacao.fase.indice + 1];
  if (!proxima) return '';
  return `
    <section class="cartao proxima-fase">
      <span class="banner-rotulo">Próxima fase · a partir de ${formatarDataExtensa(somarDias(eu.inicio, proxima.inicioDia - 1))}</span>
      <h2 class="titulo-cartao">${proxima.nome}</h2>
      <p>${proxima.objetivo}</p>
      ${proxima.modulos.length ? `<div class="chips">${proxima.modulos.map((m) => `<span class="chip-modulo claro">${icone(MODULOS[m].icone)}${MODULOS[m].nome}</span>`).join('')}</div>` : ''}
    </section>`;
}

// renderização

function renderizar() {
  const situacao = situacaoNaJornada(dados, eu);
  const ordem = ['funcoes', 'checklist', 'duvidas', 'checkin'];
  const geradores = { funcoes: htmlFuncoes, checklist: htmlChecklist, duvidas: htmlDuvidas, checkin: htmlCheckin };
  const modulos = ordem.filter((m) => moduloAtivo(dados, eu, m)).map((m) => geradores[m]()).join('');

  pagina.innerHTML = `
    ${htmlBanner(situacao)}
    <div class="grade-inicio">
      <div class="coluna">
        ${htmlPendencias()}
        ${modulos || (situacao.concluido ? '' : '<section class="cartao"><p class="texto-vazio">Nenhuma atividade nesta fase. Aproveite para ver os treinamentos.</p></section>')}
      </div>
      <div class="coluna">
        ${htmlTreinamentos()}
        ${htmlCursos()}
        ${htmlProximaFase(situacao)}
      </div>
    </div>`;
}

function iniciar() {
  if (!eu) return;
  renderizarIcones();
  montarLayout({ dados, perfil: 'colaborador', pagina: 'inicio', pessoa: eu });
  renderizar();

  configurarRegistros(dados, eu, renderizar);
  configurarAcoesDeCurso(dados, eu, renderizar);

  pagina.addEventListener('change', (evento) => {
    const caixa = evento.target.closest('[data-tarefa]');
    if (!caixa) return;
    marcarTarefa(eu.tarefas.find((t) => t.id === caixa.dataset.tarefa), caixa.checked);
    salvarDados(dados);
    renderizar();
  });

  pagina.addEventListener('click', (evento) => {
    if (!evento.target.closest('[data-confirmar-funcoes]')) return;
    eu.funcoesConfirmadasEm = dataISO();
    notificar(dados, ID_GESTOR, `${eu.nome} confirmou que leu as funções.`, `pessoa.html?id=${eu.id}`);
    salvarDados(dados);
    renderizar();
    mostrarAviso('Obrigado! Seu gestor foi avisado.');
  });

  pagina.addEventListener('submit', (evento) => {
    const formulario = evento.target.closest('[data-form-checkin]');
    if (!formulario) return;
    evento.preventDefault();
    const nota = Number(formulario.nota.value);
    eu.checkins.push({ id: novoId('k'), data: dataISO(), nota, comentario: formulario.comentario.value.trim() });
    notificar(dados, ID_GESTOR, `${eu.nome} fez o check-in da semana: nota ${nota}.`, `pessoa.html?id=${eu.id}#checkins`);
    salvarDados(dados);
    renderizar();
    mostrarAviso('Check-in enviado. Obrigado por contar como está!', 'coracao');
  });

  if (location.hash) {
    const alvo = document.querySelector(location.hash);
    if (alvo) alvo.scrollIntoView();
  }
}

iniciar();
