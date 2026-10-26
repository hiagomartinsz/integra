const dados = carregarDados();
const sessao = exigirSessao(dados, 'gestor');
const pagina = document.getElementById('pagina');
let mostrarConcluidos = false;

// métricas

function htmlMetricas(resumos) {
  const ativos = resumos.filter((r) => !r.resumo.situacao.concluido);
  const aguardando = resumos.reduce((soma, r) => soma + r.resumo.duvidasAguardando.length, 0);
  const atencao = ativos.filter((r) => r.resumo.motivos.length).length;
  const concluidos = resumos.length - ativos.length;

  const metrica = (rotulo, valor, iconeNome, classe = '', href = null) => `
    <${href ? `a href="${href}"` : 'div'} class="cartao metrica">
      <div>
        <div class="metrica-rotulo">${rotulo}</div>
        <div class="metrica-valor ${classe}">${valor}</div>
      </div>
      <span class="metrica-icone ${classe}">${icone(iconeNome)}</span>
    </${href ? 'a' : 'div'}>`;

  return `
    <section class="metricas" aria-label="Resumo">
      ${metrica('Em acompanhamento', ativos.length, 'equipe', 'azul')}
      ${metrica('Dúvidas aguardando você', aguardando, 'ajuda', aguardando ? 'laranja' : 'turquesa', aguardando ? '#duvidas' : null)}
      ${metrica('Precisam de atenção', atencao, 'alerta', atencao ? 'laranja' : 'turquesa')}
      ${metrica('Concluíram o programa', concluidos, 'check', 'turquesa')}
    </section>`;
}

// tabela de colaboradores

function htmlTabela(resumos) {
  const visiveis = resumos.filter((r) => mostrarConcluidos || !r.resumo.situacao.concluido);
  const concluidos = resumos.length - resumos.filter((r) => !r.resumo.situacao.concluido).length;

  return `
    <section class="cartao" id="colaboradores">
      <div class="cabecalho-cartao">
        <div>
          <h2 class="titulo-cartao">Colaboradores</h2>
          <p class="subtitulo">Clique em uma pessoa para atribuir tarefas, definir funções e acompanhar</p>
        </div>
        <button class="btn btn-primario btn-pequeno" data-novo-colaborador>${icone('mais')}Novo colaborador</button>
      </div>
      <div class="tabela-rolagem">
        <table class="tabela">
          <thead>
            <tr><th>Pessoa</th><th>Jornada</th><th>Checklist hoje</th><th>Treinamentos</th><th>Situação</th></tr>
          </thead>
          <tbody>
            ${visiveis.map(({ pessoa, resumo }) => {
              const s = resumo.situacao;
              return `
                <tr class="linha-clicavel" data-pessoa="${pessoa.id}">
                  <td>
                    <a class="pessoa" href="pessoa.html?id=${pessoa.id}">
                      ${avatarPequeno(dados, pessoa)}
                      <span><span class="pessoa-nome">${pessoa.nome}</span><span class="pessoa-cargo">${pessoa.cargo}</span></span>
                    </a>
                  </td>
                  <td>
                    <div class="pessoa-nome">${s.concluido ? 'Programa concluído' : s.naoComecou ? `Começa em ${formatarData(pessoa.inicio, true)}` : s.fase.nome}</div>
                    <div class="celula-progresso">${barraProgresso(s.progresso, 'azul')}<span>${s.concluido ? '' : `dia ${s.dia}`}</span></div>
                  </td>
                  <td class="texto-suave">${resumo.hojeTotal ? `${resumo.hojeFeitas} de ${resumo.hojeTotal}` : '—'}</td>
                  <td class="texto-suave">${resumo.obrigatoriosTotal ? `${resumo.obrigatoriosFeitos} de ${resumo.obrigatoriosTotal}` : '—'}</td>
                  <td>
                    ${seloDeSituacao(resumo)}
                    ${resumo.motivos.length ? `<ul class="motivos">${resumo.motivos.map((m) => `<li>${m}</li>`).join('')}</ul>` : ''}
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${concluidos ? `<button class="link-discreto alternar-concluidos" data-alternar-concluidos>${mostrarConcluidos ? 'Ocultar' : 'Mostrar'} quem já concluiu o programa (${concluidos})</button>` : ''}
    </section>`;
}

// dúvidas aguardando resposta

function htmlDuvidas() {
  const pendentes = dados.colaboradores.flatMap((pessoa) => pessoa.registros
    .filter((r) => r.destino === 'gestor' && !r.resposta)
    .map((registro) => ({ pessoa, registro })))
    .sort((a, b) => a.registro.data.localeCompare(b.registro.data));

  return `
    <section class="cartao" id="duvidas">
      <h2 class="titulo-cartao titulo-com-icone">${icone('ajuda')}Dúvidas aguardando você</h2>
      ${pendentes.length ? `
        <ul class="lista-duvidas">
          ${pendentes.map(({ pessoa, registro }) => `
            <li class="duvida">
              <div class="duvida-topo">
                ${avatarPequeno(dados, pessoa)}
                <div><a href="pessoa.html?id=${pessoa.id}"><strong>${pessoa.nome}</strong></a><small>${tempoRelativo(registro.data)}</small></div>
              </div>
              <p class="duvida-pergunta">“${escaparHtml(registro.texto)}”</p>
              ${formularioDeResposta(pessoa.id, registro.id)}
            </li>`).join('')}
        </ul>`
        : `<div class="estado-ok">${icone('check')}Nenhuma dúvida pendente.</div>`}
    </section>`;
}

// perguntas que a IA não soube responder

function htmlPerguntasSemResposta() {
  const pendentes = dados.empresa.perguntasPendentes;
  if (!pendentes.length) return '';
  return `
    <a class="cartao aviso-perguntas-ia" href="empresa.html#pendentes">
      <span class="metrica-icone laranja">${icone('brilho')}</span>
      <span>
        <strong>${pendentes.length === 1 ? '1 pergunta que a IA não soube responder' : `${pendentes.length} perguntas que a IA não soube responder`}</strong>
        <small>“${escaparHtml(pendentes[0].pergunta)}”${pendentes.length > 1 ? ' e outras' : ''}. Responda uma vez e a IA passa a saber para todos.</small>
      </span>
      ${icone('seta')}
    </a>`;
}

// lembrete enquanto houver informações de exemplo (empresa fictícia) na IA
function htmlAvisoDeExemplos() {
  const total = dados.empresa.informacoes.filter((i) => i.exemplo).length + dados.empresa.documentos.filter((d) => d.exemplo).length;
  if (!total) return '';
  return `
    <a class="cartao aviso-perguntas-ia" href="empresa.html#guia">
      <span class="metrica-icone">${icone('alerta')}</span>
      <span>
        <strong>A IA ainda usa ${total === 1 ? '1 informação de exemplo' : `${total} informações de exemplo`}</strong>
        <small>Elas são de uma empresa fictícia. Troque pelas regras da sua empresa em Informações da empresa.</small>
      </span>
      ${icone('seta')}
    </a>`;
}

// mapa de dificuldades (IA)

function htmlMapaDeDificuldades() {
  const temas = {};
  dados.colaboradores.forEach((pessoa) => {
    if (situacaoNaJornada(dados, pessoa).concluido) return;
    pessoa.registros.filter((r) => r.analise && r.analise.temaId).forEach((r) => {
      const tema = temas[r.analise.temaId] || (temas[r.analise.temaId] = { pessoas: new Map(), resolvidas: 0, total: 0 });
      tema.pessoas.set(pessoa.id, pessoa);
      tema.total += 1;
      if (r.resolvida) tema.resolvidas += 1;
    });
  });
  const lista = Object.entries(temas).sort((a, b) => b[1].pessoas.size - a[1].pessoas.size);

  return `
    <section class="cartao">
      <h2 class="titulo-cartao titulo-com-icone">${icone('brilho')}Dificuldades identificadas pela IA</h2>
      <p class="subtitulo">Você vê o tema e o andamento. O texto escrito por cada pessoa é privado.</p>
      ${lista.length ? `
        <ul class="mapa-dificuldades">
          ${lista.map(([temaId, info]) => `
            <li>
              <div class="dificuldade-topo">
                <span>${buscarTema(dados, temaId)?.nome || 'Tema removido do catálogo'}</span>
                <small>${info.resolvidas} de ${info.total} ${info.total === 1 ? 'resolvida' : 'resolvidas'}</small>
              </div>
              ${barraProgresso(porcentagem(info.resolvidas, info.total), 'verde')}
              <div class="mapa-pessoas">${[...info.pessoas.values()].map((p) => `<a href="pessoa.html?id=${p.id}#duvidas" title="${p.nome}">${avatarPequeno(dados, p)}</a>`).join('')}</div>
            </li>`).join('')}
        </ul>`
        : '<p class="texto-vazio">Nenhuma dificuldade relatada à IA ainda.</p>'}
    </section>`;
}

// página

function renderizar() {
  const resumos = dados.colaboradores
    .map((pessoa) => ({ pessoa, resumo: resumoParaGestor(dados, pessoa) }))
    .sort((a, b) => (b.resumo.motivos.length - a.resumo.motivos.length) || (a.resumo.situacao.dia - b.resumo.situacao.dia));

  pagina.innerHTML = `
    <h1 class="so-leitor">Painel do gestor</h1>
    ${htmlMetricas(resumos)}
    <div class="grade-gestor">
      <div class="coluna">${htmlTabela(resumos)}</div>
      <div class="coluna">${htmlAvisoDeExemplos()}${htmlPerguntasSemResposta()}${htmlDuvidas()}${htmlMapaDeDificuldades()}</div>
    </div>`;
}

function iniciar() {
  if (!sessao) return;
  renderizarIcones();
  montarLayout({ dados, perfil: 'gestor', pagina: 'painel' });
  renderizar();
  configurarRespostas(dados, renderizar);

  pagina.addEventListener('click', (evento) => {
    if (evento.target.closest('[data-novo-colaborador]')) {
      const formulario = document.getElementById('formNovoColaborador');
      formulario.reset();
      formulario.inicio.value = dataISO();
      document.getElementById('modalNovoColaborador').showModal();
      return;
    }
    if (evento.target.closest('[data-alternar-concluidos]')) {
      mostrarConcluidos = !mostrarConcluidos;
      renderizar();
      return;
    }
    const linha = evento.target.closest('[data-pessoa]');
    if (linha && !evento.target.closest('a')) location.href = `pessoa.html?id=${linha.dataset.pessoa}`;
  });

  document.getElementById('formNovoColaborador').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const formulario = evento.target;
    const pessoa = {
      id: novoId('p'), nome: formulario.nome.value.trim(), cargo: formulario.cargo.value.trim(), inicio: formulario.inicio.value,
      funcoes: [], funcoesConfirmadasEm: null, treinamentosConcluidos: {}, tarefas: [], registros: [], cursos: [], checkins: [],
    };
    dados.colaboradores.push(pessoa);
    dados.notificacoes[pessoa.id] = [{ texto: `Bem-vindo(a) ao Integra, ${primeiroNome(pessoa.nome)}! Sua jornada começa aqui.`, data: new Date().toISOString(), lida: false, link: 'jornada.html' }];
    salvarDados(dados);
    location.href = `pessoa.html?id=${pessoa.id}`;
  });
}

iniciar();
