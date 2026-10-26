// treinamento.html?id=ID

const dados = carregarDados();
const sessaoAtual = obterSessao();
const ehGestor = sessaoAtual && sessaoAtual.perfil === 'gestor';
const sessao = exigirSessao(dados, ehGestor ? 'gestor' : 'colaborador');
const eu = sessao && !ehGestor ? buscarColaborador(dados, sessao.id) : null;
const treinamento = dados.treinamentos.find((t) => t.id === new URLSearchParams(location.search).get('id'));
const pagina = document.getElementById('pagina');

// conteúdo (PDF, vídeo, slides ou link)

function enderecoDeIncorporacao(url) {
  // google slides: troca /edit (ou /pub) por /embed
  if (/docs\.google\.com\/presentation/.test(url)) return url.replace(/\/(edit|pub|view)[^/]*$/, '/embed');
  return url;
}

function htmlYoutube(id) {
  return `
    <div class="player" id="player">
      <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="">
      <button class="player-play" data-tocar="${id}" aria-label="Assistir ao vídeo">${icone('play')}</button>
    </div>`;
}

function tocarYoutube(id) {
  // aberto direto do computador (file://), o YouTube bloqueia o vídeo incorporado
  if (location.protocol === 'file:') {
    window.open(`https://www.youtube.com/watch?v=${id}`, '_blank', 'noopener');
    return;
  }
  const player = document.getElementById('player');
  player.classList.add('tocando');
  player.innerHTML = `
    <iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="${escaparHtml(treinamento.titulo)}"
      referrerpolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen></iframe>`;
}

function htmlPorEndereco(url, formato) {
  if (formato === 'video' && /\.(mp4|webm|ogg)(\?|$)/i.test(url)) {
    return `<video class="visualizador-video" src="${url}" controls preload="metadata"></video>`;
  }
  if (formato === 'link' || !/(\.pdf(\?|$)|^blob:|docs\.google\.com\/presentation)/i.test(url)) {
    return `
      <div class="visualizador-link">
        ${icone('link')}
        <p>Este treinamento está em outro site.</p>
        <a class="btn btn-primario" href="${url}" target="_blank" rel="noopener">${icone('externo')}Abrir treinamento</a>
      </div>`;
  }
  return `<iframe class="visualizador-documento" src="${enderecoDeIncorporacao(url)}" title="${escaparHtml(treinamento.titulo)}" allowfullscreen></iframe>`;
}

async function carregarConteudo() {
  const area = document.getElementById('conteudoTreinamento');
  const { fonte, formato } = treinamento;

  if (fonte.tipo === 'youtube') {
    area.innerHTML = htmlYoutube(fonte.id);
    return;
  }
  if (fonte.tipo === 'url') {
    area.innerHTML = htmlPorEndereco(fonte.url, formato);
    return;
  }
  // arquivo enviado pelo gestor
  const endereco = await enderecoDoArquivo(fonte.arquivoId).catch(() => null);
  if (!endereco) {
    area.innerHTML = `<div class="visualizador-link">${icone('alerta')}<p>Não foi possível abrir o arquivo. Peça ao gestor para enviá-lo novamente.</p></div>`;
    return;
  }
  area.innerHTML = formato === 'video'
    ? `<video class="visualizador-video" src="${endereco}" controls preload="metadata"></video>`
    : `<iframe class="visualizador-documento" src="${endereco}" title="${escaparHtml(treinamento.titulo)}"></iframe>`;
  const baixar = document.getElementById('baixarArquivo');
  if (baixar) baixar.href = endereco;
}

// lateral

function htmlLateralColaborador(info) {
  if (info.concluidoEm) {
    return `
      <div class="cartao lateral-treinamento">
        <p class="confirmado">${icone('check')}Você concluiu este treinamento em ${formatarData(info.concluidoEm)}.</p>
        <button class="btn btn-texto btn-pequeno" data-desmarcar>Desmarcar</button>
      </div>`;
  }
  return `
    <div class="cartao lateral-treinamento">
      <p>${info.obrigatorio ? 'Este treinamento é <strong>obrigatório</strong>.' : 'Este treinamento é opcional.'} Quando terminar, marque como concluído para avisar seu gestor.</p>
      ${info.atrasado ? `<p class="selo selo-atencao">${icone('alerta')}O prazo era até o fim da fase ${info.fase.nome}</p>` : ''}
      <button class="btn btn-destaque btn-bloco" data-concluir>${icone('check')}Marcar como concluído</button>
    </div>`;
}

function htmlLateralGestor() {
  const pessoas = dados.colaboradores
    .map((c) => ({ c, info: treinamentosDaPessoa(dados, c).find((t) => t.id === treinamento.id), situacao: situacaoNaJornada(dados, c) }))
    .filter(({ info, situacao }) => info.liberado && !situacao.concluido);
  const feitos = pessoas.filter((p) => p.info.concluidoEm).length;

  return `
    <div class="cartao lateral-treinamento">
      <h2 class="titulo-cartao">Quem já concluiu</h2>
      <p class="subtitulo">${feitos} de ${pessoas.length} ${pessoas.length === 1 ? 'pessoa' : 'pessoas'} com o treinamento liberado</p>
      ${barraProgresso(porcentagem(feitos, pessoas.length))}
      <ul class="lista-pessoas-status">
        ${pessoas.map(({ c, info }) => `
          <li>
            <a href="pessoa.html?id=${c.id}">${avatarPequeno(dados, c)}<span>${c.nome}</span></a>
            ${info.concluidoEm ? `<span class="selo selo-sucesso">${formatarData(info.concluidoEm, true)}</span>` : info.atrasado ? '<span class="selo selo-atencao">Atrasado</span>' : '<span class="selo selo-neutro">Pendente</span>'}
          </li>`).join('') || '<li class="texto-vazio">Ninguém com este treinamento liberado agora.</li>'}
      </ul>
    </div>`;
}

// página

function renderizar() {
  const info = eu ? treinamentosDaPessoa(dados, eu).find((t) => t.id === treinamento.id) : null;
  const fase = fasesComPeriodo(dados).find((f) => f.id === treinamento.faseId);
  const formato = FORMATOS_TREINAMENTO[treinamento.formato];
  const temArquivo = treinamento.fonte.tipo === 'arquivo' || (treinamento.fonte.tipo === 'url' && /\.pdf$/i.test(treinamento.fonte.url));
  document.title = `${treinamento.titulo} — Integra`;

  if (info && !info.liberado) {
    pagina.innerHTML = `
      <div class="estado-vazio">${icone('cadeado')}<h1>Este treinamento ainda não foi liberado</h1>
      <p>Ele fica disponível em ${formatarDataExtensa(info.liberaEm)}, na fase ${info.fase.nome}.</p>
      <a class="btn btn-primario" href="treinamentos.html">Ver treinamentos</a></div>`;
    return;
  }

  pagina.innerHTML = `
    <a class="voltar" href="${ehGestor ? 'gestor-treinamentos.html' : 'treinamentos.html'}"><span class="seta-voltar">${icone('seta')}</span>Treinamentos</a>
    ${ehGestor ? `<div class="aviso-previa">${icone('olho')}Pré-visualização: é assim que o colaborador vê este treinamento.</div>` : ''}
    <div class="treinamento-layout">
      <div class="treinamento-principal">
        <div id="conteudoTreinamento" class="conteudo-treinamento"><div class="carregando">Carregando…</div></div>
        <div class="treinamento-cabecalho">
          <span class="aula-local">${formato.nome} · ${fase ? fase.nome : ''}${treinamento.obrigatorio ? ' · Obrigatório' : ''}</span>
          <h1 class="aula-titulo">${escaparHtml(treinamento.titulo)}</h1>
          <p class="treinamento-descricao-longa">${escaparHtml(treinamento.descricao)}</p>
          ${temArquivo ? `<a class="link-discreto" id="baixarArquivo" href="${treinamento.fonte.url || '#'}" download="${escaparHtml(treinamento.fonte.nomeArquivo || treinamento.titulo)}">${icone('baixar')}Baixar arquivo</a>` : ''}
        </div>
      </div>
      <aside id="lateralTreinamento">${ehGestor ? htmlLateralGestor() : htmlLateralColaborador(info)}</aside>
    </div>`;
  carregarConteudo();
}

// atualiza só a lateral, sem recarregar o vídeo/PDF
function atualizarLateral() {
  const info = treinamentosDaPessoa(dados, eu).find((t) => t.id === treinamento.id);
  document.getElementById('lateralTreinamento').innerHTML = htmlLateralColaborador(info);
}

function iniciar() {
  if (!sessao) return;
  montarLayout({ dados, perfil: ehGestor ? 'gestor' : 'colaborador', pagina: 'treinamentos', pessoa: eu });

  if (!treinamento) {
    pagina.innerHTML = `<div class="estado-vazio">${icone('livro')}<h1>Treinamento não encontrado</h1><p>Ele pode ter sido removido.</p>
      <a class="btn btn-primario" href="${ehGestor ? 'gestor-treinamentos.html' : 'treinamentos.html'}">Ver treinamentos</a></div>`;
    return;
  }
  renderizar();

  pagina.addEventListener('click', (evento) => {
    const tocar = evento.target.closest('[data-tocar]');
    if (tocar) tocarYoutube(tocar.dataset.tocar);

    if (evento.target.closest('[data-concluir]')) {
      eu.treinamentosConcluidos[treinamento.id] = dataISO();
      notificar(dados, ID_GESTOR, `${eu.nome} concluiu o treinamento “${treinamento.titulo}”.`, `pessoa.html?id=${eu.id}#treinamentos`);
      salvarDados(dados);
      atualizarLateral();
      mostrarAviso('Treinamento concluído. Seu gestor foi avisado.');
    }
    if (evento.target.closest('[data-desmarcar]')) {
      delete eu.treinamentosConcluidos[treinamento.id];
      salvarDados(dados);
      atualizarLateral();
    }
  });
}

iniciar();
