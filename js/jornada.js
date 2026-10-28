const dados = carregarDados();
const sessao = exigirSessao(dados, 'colaborador');
const eu = sessao && buscarColaborador(dados, sessao.id);

function htmlFase(fase, situacao, treinamentos) {
  let status = 'futura';
  if (situacao.concluido || situacao.dia > fase.fimDia) status = 'passada';
  else if (situacao.dia >= fase.inicioDia) status = 'atual';

  const inicio = somarDias(eu.inicio, fase.inicioDia - 1);
  const fim = somarDias(eu.inicio, fase.fimDia - 1);
  const datas = inicio === fim ? formatarData(inicio, true) : `${formatarData(inicio, true)} a ${formatarData(fim, true)}`;
  const selos = {
    passada: `<span class="selo selo-sucesso">${icone('check')}Concluída</span>`,
    atual: `<span class="selo selo-andamento">Você está aqui · faltam ${situacao.diasRestantesNaFase} ${situacao.diasRestantesNaFase === 1 ? 'dia' : 'dias'}</span>`,
    futura: `<span class="selo selo-neutro">${icone('calendario')}Começa em ${formatarData(inicio, true)}</span>`,
  };
  const marcador = status === 'passada' ? icone('check') : status === 'futura' ? icone('cadeado') : fase.numero;
  const daFase = treinamentos.filter((t) => t.faseId === fase.id);

  return `
    <li class="etapa ${status}" id="fase-${fase.numero}">
      <span class="etapa-marcador">${marcador}</span>
      <article class="cartao etapa-cartao">
        <header class="etapa-topo">
          <div>
            <span class="etapa-periodo">Fase ${fase.numero} · ${textoDoPeriodo(fase)} · ${datas}</span>
            <h2>${fase.nome}</h2>
          </div>
          ${selos[status]}
        </header>
        <p class="etapa-descricao"><strong>Objetivo:</strong> ${fase.objetivo}</p>

        ${fase.modulos.length ? `
          <h3 class="subtitulo-bloco">O que você usa nesta fase</h3>
          <div class="chips">${fase.modulos.map((m) => `<span class="chip-modulo claro">${icone(MODULOS[m].icone)}${MODULOS[m].nome}</span>`).join('')}</div>` : ''}

        ${daFase.length ? `
          <h3 class="subtitulo-bloco">Treinamentos</h3>
          <ul class="lista-treinamentos-mini">
            ${daFase.map((t) => `
              <li>
                ${t.liberado ? `<a href="treinamento.html?id=${t.id}" class="${t.concluidoEm ? 'feito' : ''}">` : '<div class="bloqueado">'}
                  <span class="formato-icone">${icone(t.liberado ? FORMATOS_TREINAMENTO[t.formato].icone : 'cadeado')}</span>
                  <span class="treinamento-mini-texto">
                    <strong>${escaparHtml(t.titulo)}</strong>
                    <span>${FORMATOS_TREINAMENTO[t.formato].nome}${t.obrigatorio ? ' · obrigatório' : ''}</span>
                  </span>
                  ${t.concluidoEm ? `<span class="selo selo-sucesso">${icone('check')}Feito</span>` : t.liberado ? '<span class="selo selo-novo">Pendente</span>' : ''}
                ${t.liberado ? '</a>' : '</div>'}
              </li>`).join('')}
          </ul>` : ''}
      </article>
    </li>`;
}

function renderizar() {
  const situacao = situacaoNaJornada(dados, eu);
  const treinamentos = treinamentosDaPessoa(dados, eu);
  const fim = somarDias(eu.inicio, situacao.duracao - 1);

  document.getElementById('pagina').innerHTML = `
    <div class="cabecalho-pagina">
      <div>
        <h1>Minha jornada</h1>
        <p>Seu acompanhamento vai de ${formatarDataExtensa(eu.inicio)} a ${formatarDataExtensa(fim)}. Cada fase tem um objetivo e libera ferramentas diferentes.</p>
      </div>
    </div>

    <section class="resumo-jornada">
      ${anelProgresso(situacao.progresso, { tamanho: 72, espessura: 7, texto: situacao.concluido ? '✓' : situacao.dia >= 1 ? `${situacao.dia}º` : `${situacao.diasParaEntrar}d` })}
      <div class="resumo-jornada-texto">
        <span>${textoDoDia(situacao)}</span>
        <strong>${situacao.concluido ? 'Você completou a integração' : situacao.fase.nome}</strong>
        <p>${situacao.concluido ? 'Parabéns por chegar até aqui!' : situacao.fase.objetivo}</p>
      </div>
    </section>

    <ol class="linha-do-tempo">${situacao.fases.map((f) => htmlFase(f, situacao, treinamentos)).join('')}</ol>

    ${eu.funcoes.length ? `
      <section class="cartao" id="funcoes">
        <h2 class="titulo-cartao titulo-com-icone">${icone('maleta')}Minhas funções</h2>
        <ol class="lista-funcoes">
          ${eu.funcoes.map((f) => `<li><strong>${escaparHtml(f.titulo)}</strong><span>${escaparHtml(f.descricao)}</span></li>`).join('')}
        </ol>
      </section>` : ''}`;
}

if (eu) {
  montarLayout({ dados, perfil: 'colaborador', pagina: 'jornada', pessoa: eu });
  renderizar();
  if (location.hash) {
    const alvo = document.querySelector(location.hash);
    if (alvo) alvo.scrollIntoView();
  }
}
