// pessoa.html?id=ID

const dados = carregarDados();
const sessao = exigirSessao(dados, 'gestor');
const pessoa = buscarColaborador(dados, new URLSearchParams(location.search).get('id'));
const pagina = document.getElementById('pagina');

// aviso de quando um módulo passa a aparecer pra pessoa
function avisoDeModulo(modulo) {
  if (moduloAtivo(dados, pessoa, modulo)) return '';
  const situacao = situacaoNaJornada(dados, pessoa);
  if (situacao.concluido) return '';
  const proxima = situacao.fases.find((f) => f.inicioDia > situacao.dia && f.modulos.includes(modulo));
  const texto = proxima
    ? `Aparece para ${primeiroNome(pessoa.nome)} a partir da fase ${proxima.nome} (${formatarData(somarDias(pessoa.inicio, proxima.inicioDia - 1), true)}). Você já pode preparar.`
    : modulo === 'funcoes'
      ? `${primeiroNome(pessoa.nome)} já passou da fase de apresentação e consulta as funções em "Minha jornada".`
      : `Não está ligado na fase atual de ${primeiroNome(pessoa.nome)}.`;
  return `<p class="aviso-modulo pequeno">${icone('relogio')}${texto}</p>`;
}

// cabeçalho

function htmlCabecalho(resumo) {
  const s = resumo.situacao;
  let texto;
  if (s.concluido) texto = `Concluiu o programa em ${formatarData(somarDias(pessoa.inicio, s.duracao - 1))}`;
  else if (s.naoComecou) texto = `Começa em ${formatarDataExtensa(pessoa.inicio)}`;
  else texto = `Dia ${s.dia} de ${s.duracao} · ${s.fase.nome}`;

  return `
    <a class="voltar" href="gestor.html"><span class="seta-voltar">${icone('seta')}</span>Painel</a>
    <section class="cartao cabecalho-pessoa">
      <div class="cabecalho-pessoa-topo">
        <span class="avatar avatar-grande">${iniciais(pessoa.nome)}</span>
        <div>
          <h1>${pessoa.nome}</h1>
          <p class="subtitulo">${pessoa.cargo} · começou em ${formatarData(pessoa.inicio)}</p>
        </div>
        ${seloDeSituacao(resumo)}
      </div>
      <div class="cabecalho-pessoa-jornada">
        <span>${texto}</span>
        ${trilhaDeFases(s)}
      </div>
      ${resumo.motivos.length ? `<ul class="lista-motivos">${resumo.motivos.map((m) => `<li>${icone('alerta')}${m}</li>`).join('')}</ul>` : ''}
      <nav class="atalhos" aria-label="Seções">
        <a href="#tarefas">Tarefas</a><a href="#funcoes">Funções</a><a href="#treinamentos">Treinamentos</a><a href="#duvidas">Dúvidas e cursos</a><a href="#checkins">Check-ins</a>
      </nav>
    </section>`;
}

// tarefas

function htmlUltimosDias(tarefa) {
  const dias = [];
  for (let d = 6; d >= 0; d--) {
    const dia = diasAPartirDeHoje(-d);
    const antes = dia < tarefa.criadaEm;
    const folga = !rotinaNoDia(tarefa, dia);
    const feita = tarefa.feitas.includes(dia);
    const estado = antes ? 'vazio' : feita ? 'feito' : folga ? 'folga' : d === 0 ? 'hoje' : 'perdido';
    const legenda = antes ? 'antes da tarefa existir' : feita ? 'feita' : folga ? 'não programada para este dia' : d === 0 ? 'ainda não feita hoje' : 'não feita';
    dias.push(`<span class="dia-ponto ${estado}" title="${formatarData(dia, true)}: ${legenda}"></span>`);
  }
  return `<span class="ultimos-dias" aria-label="Últimos 7 dias">${dias.join('')}</span>`;
}

const DIAS_UTEIS = [1, 2, 3, 4, 5];
let tarefaEmEdicao = null; // id da tarefa aberta no lápis

function diasMarcados(formulario) {
  return [...formulario.querySelectorAll('[name="dias"]:checked')].map((caixa) => Number(caixa.value));
}

function resumoDosDias(dias) {
  if (!dias.length) return 'Escolha pelo menos um dia';
  return dias.length === 7 ? 'Todos os dias' : descricaoDosDias({ dias });
}

// sem "dias" na tarefa = todos os dias
function diasParaSalvar(dias) {
  return dias.length < 7 ? dias : undefined;
}

function htmlDiasSemana(marcados) {
  return `
    <fieldset class="dias-semana">
      <legend class="so-leitor">Dias da semana</legend>
      <span class="dias-semana-rotulo">Repete:</span>
      ${DIAS_DA_SEMANA.map((d) => `
        <label class="dia-semana">
          <input type="checkbox" name="dias" value="${d.numero}" ${marcados.includes(d.numero) ? 'checked' : ''}>
          <span>${d.curto}</span>
        </label>`).join('')}
      <span class="dias-semana-resumo">${resumoDosDias(marcados)}</span>
    </fieldset>`;
}

function htmlEdicaoDeTarefa(tarefa) {
  const campo = tarefa.tipo === 'rotina'
    ? htmlDiasSemana(tarefa.dias || DIAS_DA_SEMANA.map((d) => d.numero))
    : `<label class="campo-prazo">Prazo <input name="prazo" type="date" value="${tarefa.prazo}" required></label>`;
  return `
    <li class="editando">
      <form class="form-editar-tarefa" data-editar-tarefa="${tarefa.id}">
        <span class="lista-gestao-texto">${escaparHtml(tarefa.titulo)}</span>
        ${campo}
        <div class="acoes-edicao">
          <button class="btn btn-secundario btn-pequeno" type="button" data-cancelar-edicao>Cancelar</button>
          <button class="btn btn-primario btn-pequeno" type="submit">${icone('check')}Salvar</button>
        </div>
      </form>
    </li>`;
}

function botoesDaTarefa(tarefa) {
  return `
    <button class="btn-fechar" data-editar-tarefa-id="${tarefa.id}" aria-label="Editar tarefa">${icone('lapis')}</button>
    <button class="btn-fechar" data-remover-tarefa="${tarefa.id}" aria-label="Remover tarefa">${icone('lixeira')}</button>`;
}

function htmlTarefas(resumo) {
  const rotinas = pessoa.tarefas.filter((t) => t.tipo === 'rotina');
  const pontuais = pessoa.tarefas.filter((t) => t.tipo === 'pontual').sort((a, b) => a.prazo.localeCompare(b.prazo));

  return `
    <section class="cartao" id="tarefas">
      <div class="cabecalho-cartao">
        <div>
          <h2 class="titulo-cartao titulo-com-icone">${icone('lista')}Tarefas</h2>
          <p class="subtitulo">Rotinas aparecem no checklist todos os dias ou só nos dias escolhidos. Pontuais têm prazo.${resumo.assiduidade !== null ? ` Rotina feita em <strong>${resumo.assiduidade}%</strong> dos dias na última semana.` : ''}</p>
        </div>
      </div>
      ${avisoDeModulo('checklist')}

      <form class="form-linha" id="formTarefa">
        <label class="so-leitor" for="tituloTarefa">Nova tarefa</label>
        <input id="tituloTarefa" name="titulo" placeholder="Nova tarefa para ${primeiroNome(pessoa.nome)}..." required>
        <select name="tipo" aria-label="Tipo">
          <option value="rotina">Rotina</option>
          <option value="pontual">Pontual</option>
        </select>
        <input name="prazo" type="date" aria-label="Prazo" hidden>
        <button class="btn btn-primario btn-pequeno" type="submit">${icone('mais')}Atribuir</button>
        ${htmlDiasSemana(DIAS_UTEIS)}
      </form>

      ${rotinas.length ? `
        <h3 class="subtitulo-bloco">Rotina</h3>
        <ul class="lista-gestao">
          ${rotinas.map((t) => (t.id === tarefaEmEdicao ? htmlEdicaoDeTarefa(t) : `
            <li>
              <span class="lista-gestao-texto">${escaparHtml(t.titulo)}<br><small>${descricaoDosDias(t)}</small></span>
              ${htmlUltimosDias(t)}
              ${botoesDaTarefa(t)}
            </li>`)).join('')}
        </ul>` : ''}

      ${pontuais.length ? `
        <h3 class="subtitulo-bloco">Pontuais</h3>
        <ul class="lista-gestao">
          ${pontuais.map((t) => {
            if (t.id === tarefaEmEdicao) return htmlEdicaoDeTarefa(t);
            let selo;
            if (t.concluidaEm) selo = `<span class="selo selo-sucesso">${icone('check')}Feita em ${formatarData(t.concluidaEm, true)}</span>`;
            else if (t.prazo < dataISO()) selo = `<span class="selo selo-atencao">Atrasada · ${formatarData(t.prazo, true)}</span>`;
            else selo = `<span class="selo selo-neutro">Até ${formatarData(t.prazo, true)}</span>`;
            return `
              <li>
                <span class="lista-gestao-texto">${escaparHtml(t.titulo)}</span>
                ${selo}
                ${botoesDaTarefa(t)}
              </li>`;
          }).join('')}
        </ul>` : ''}
      ${!pessoa.tarefas.length ? '<p class="texto-vazio">Nenhuma tarefa atribuída ainda.</p>' : ''}
    </section>`;
}

// funções

function htmlFuncoes() {
  return `
    <section class="cartao" id="funcoes">
      <div class="cabecalho-cartao">
        <div>
          <h2 class="titulo-cartao titulo-com-icone">${icone('maleta')}Funções</h2>
          <p class="subtitulo">${pessoa.funcoesConfirmadasEm
            ? `${primeiroNome(pessoa.nome)} confirmou que leu em ${formatarData(pessoa.funcoesConfirmadasEm)}.`
            : `As responsabilidades de ${primeiroNome(pessoa.nome)} no cargo. A pessoa confirma que leu.`}</p>
        </div>
      </div>
      ${avisoDeModulo('funcoes')}
      ${pessoa.funcoes.length ? `
        <ol class="lista-funcoes editavel">
          ${pessoa.funcoes.map((f) => `
            <li>
              <span><strong>${escaparHtml(f.titulo)}</strong><span>${escaparHtml(f.descricao)}</span></span>
              <button class="btn-fechar" data-remover-funcao="${f.id}" aria-label="Remover função">${icone('lixeira')}</button>
            </li>`).join('')}
        </ol>` : '<p class="texto-vazio">Nenhuma função definida ainda.</p>'}
      <form class="form-funcao" id="formFuncao">
        <input name="titulo" placeholder="Função (ex.: Atendimento a clientes)" required aria-label="Função">
        <input name="descricao" placeholder="O que a pessoa faz nessa função" aria-label="Descrição">
        <button class="btn btn-secundario btn-pequeno" type="submit">${icone('mais')}Adicionar função</button>
      </form>
    </section>`;
}

// treinamentos

function htmlTreinamentos() {
  const lista = treinamentosDaPessoa(dados, pessoa);
  return `
    <section class="cartao" id="treinamentos">
      <h2 class="titulo-cartao titulo-com-icone">${icone('livro')}Treinamentos</h2>
      <ul class="lista-gestao">
        ${lista.map((t) => {
          let selo;
          if (t.concluidoEm) selo = `<span class="selo selo-sucesso">${icone('check')}Concluído em ${formatarData(t.concluidoEm, true)}</span>`;
          else if (!t.liberado) selo = `<span class="selo selo-neutro">Libera em ${formatarData(t.liberaEm, true)}</span>`;
          else if (t.atrasado) selo = '<span class="selo selo-atencao">Atrasado</span>';
          else selo = '<span class="selo selo-novo">Pendente</span>';
          return `
            <li>
              <span class="formato-icone">${icone(FORMATOS_TREINAMENTO[t.formato].icone)}</span>
              <a class="lista-gestao-texto" href="treinamento.html?id=${t.id}">${escaparHtml(t.titulo)}${t.obrigatorio ? ' <small>· obrigatório</small>' : ''}</a>
              ${selo}
            </li>`;
        }).join('') || '<li class="texto-vazio">Nenhum treinamento cadastrado.</li>'}
      </ul>
    </section>`;
}

// dúvidas e cursos

function htmlDuvidas() {
  const paraMim = pessoa.registros.filter((r) => r.destino === 'gestor');
  const daIA = pessoa.registros.filter((r) => r.destino === 'ia' && r.analise);
  const cursos = pessoa.cursos.filter((c) => c.status !== 'dispensado');

  return `
    <section class="cartao" id="duvidas">
      <div class="cabecalho-cartao">
        <div>
          <h2 class="titulo-cartao titulo-com-icone">${icone('ajuda')}Dúvidas e cursos</h2>
          <p class="subtitulo">Anotações pessoais não aparecem aqui. Do que foi enviado à IA, você vê só o tema identificado.</p>
        </div>
        <button class="btn btn-secundario btn-pequeno" data-indicar-curso>${icone('play')}Indicar curso</button>
      </div>
      ${avisoDeModulo('duvidas')}

      <h3 class="subtitulo-bloco">Enviadas para você (${paraMim.length})</h3>
      ${paraMim.length ? `
        <ul class="lista-duvidas">
          ${paraMim.map((r) => `
            <li class="duvida">
              <div class="duvida-topo"><small>${tempoRelativo(r.data)}</small></div>
              <p class="duvida-pergunta">“${escaparHtml(r.texto)}”</p>
              ${r.resposta
                ? `<div class="registro-resposta"><span class="registro-resposta-autor">${icone('check')}Você respondeu · ${tempoRelativo(r.resposta.data)}</span><p>${escaparHtml(r.resposta.texto)}</p></div>`
                : formularioDeResposta(pessoa.id, r.id)}
            </li>`).join('')}
        </ul>` : '<p class="texto-vazio">Nenhuma dúvida enviada para você.</p>'}

      <h3 class="subtitulo-bloco">Dificuldades analisadas pela IA (${daIA.length})</h3>
      ${daIA.length ? `
        <ul class="lista-gestao">
          ${daIA.map((r) => {
            const tema = buscarTema(dados, r.analise.temaId);
            return `
              <li>
                <span class="formato-icone">${icone('brilho')}</span>
                <span class="lista-gestao-texto">${tema ? tema.nome : 'Assunto não identificado'} <small>· ${tempoRelativo(r.data)}</small></span>
                ${r.resolvida ? `<span class="selo selo-sucesso">${icone('check')}Resolvida</span>` : '<span class="selo selo-novo">Em acompanhamento</span>'}
              </li>`;
          }).join('')}
        </ul>` : '<p class="texto-vazio">Nenhuma dificuldade enviada à IA.</p>'}

      <h3 class="subtitulo-bloco">Cursos (${cursos.length})</h3>
      ${cursos.length
        ? `<div class="cursos-externos compactos">${cursos.map((c) => cartaoCursoExterno(dados, c, { editavel: false })).join('')}</div>`
        : '<p class="texto-vazio">Nenhum curso recomendado ainda.</p>'}
    </section>`;
}

// check-ins

function htmlCheckins() {
  const rotulos = ['', 'Muito difícil', 'Difícil', 'Ok', 'Bem', 'Muito bem'];
  return `
    <section class="cartao" id="checkins">
      <h2 class="titulo-cartao titulo-com-icone">${icone('coracao')}Check-ins de adaptação</h2>
      ${avisoDeModulo('checkin')}
      ${pessoa.checkins.length ? `
        <ul class="lista-checkins">
          ${[...pessoa.checkins].reverse().map((k) => `
            <li>
              <span class="nota-bolha nota-${k.nota}">${k.nota}</span>
              <div>
                <strong>${rotulos[k.nota]}</strong> <small>· ${formatarData(k.data)}</small>
                ${k.comentario ? `<p>${escaparHtml(k.comentario)}</p>` : ''}
              </div>
            </li>`).join('')}
        </ul>` : '<p class="texto-vazio">Nenhum check-in ainda.</p>'}
    </section>`;
}

// página

function renderizar() {
  const resumo = resumoParaGestor(dados, pessoa);
  document.title = `${pessoa.nome} — Integra`;
  pagina.innerHTML = `
    ${htmlCabecalho(resumo)}
    <div class="coluna">
      ${htmlTarefas(resumo)}
      ${htmlFuncoes()}
      ${htmlTreinamentos()}
      ${htmlDuvidas()}
      ${htmlCheckins()}
    </div>`;
}

function iniciar() {
  if (!sessao) return;
  renderizarIcones();
  montarLayout({ dados, perfil: 'gestor', pagina: 'painel' });

  if (!pessoa) {
    pagina.innerHTML = `<div class="estado-vazio">${icone('usuario')}<h1>Colaborador não encontrado</h1><a class="btn btn-primario" href="gestor.html">Voltar ao painel</a></div>`;
    return;
  }
  renderizar();
  configurarRespostas(dados, renderizar);

  // rotina mostra os dias da semana (todos marcados = todos os dias); pontual mostra o prazo
  pagina.addEventListener('change', (evento) => {
    const formulario = evento.target.form;
    if (!formulario) return;
    if (evento.target.name === 'dias') {
      formulario.querySelector('.dias-semana-resumo').textContent = resumoDosDias(diasMarcados(formulario));
      return;
    }
    if (evento.target.name !== 'tipo' || formulario.id !== 'formTarefa') return;
    evento.target.form.querySelector('.dias-semana').hidden = evento.target.value !== 'rotina';
    const prazo = evento.target.form.prazo;
    prazo.hidden = evento.target.value !== 'pontual';
    prazo.required = !prazo.hidden;
    if (!prazo.value) prazo.value = diasAPartirDeHoje(3);
  });

  pagina.addEventListener('submit', (evento) => {
    const formulario = evento.target;
    if (formulario.id === 'formTarefa') {
      evento.preventDefault();
      const tipo = formulario.tipo.value;
      const tarefa = { id: novoId('t'), titulo: formulario.titulo.value.trim(), tipo, criadaEm: dataISO() };
      if (tipo === 'rotina') {
        const dias = diasMarcados(formulario);
        if (!dias.length) {
          mostrarAviso('Escolha pelo menos um dia da semana.', 'alerta');
          return;
        }
        tarefa.feitas = [];
        if (diasParaSalvar(dias)) tarefa.dias = dias;
      } else {
        Object.assign(tarefa, { prazo: formulario.prazo.value, concluidaEm: null });
      }
      pessoa.tarefas.push(tarefa);
      notificar(dados, pessoa.id, `Nova tarefa${tipo === 'rotina' ? ' de rotina' : ''}: ${tarefa.titulo}.`, 'colaborador.html#checklist');
      salvarDados(dados);
      renderizar();
      document.getElementById('tituloTarefa').focus();
      mostrarAviso(`Tarefa atribuída a ${primeiroNome(pessoa.nome)}.`);
    }
    if (formulario.dataset.editarTarefa) {
      evento.preventDefault();
      const tarefa = pessoa.tarefas.find((t) => t.id === formulario.dataset.editarTarefa);
      let mudanca;
      if (tarefa.tipo === 'rotina') {
        const dias = diasMarcados(formulario);
        if (!dias.length) {
          mostrarAviso('Escolha pelo menos um dia da semana.', 'alerta');
          return;
        }
        if (diasParaSalvar(dias)) tarefa.dias = dias;
        else delete tarefa.dias;
        mudanca = tarefa.dias ? descricaoDosDias(tarefa) : 'todos os dias';
      } else {
        tarefa.prazo = formulario.prazo.value;
        mudanca = `prazo até ${formatarData(tarefa.prazo, true)}`;
      }
      notificar(dados, pessoa.id, `Tarefa atualizada: ${tarefa.titulo} (${mudanca}).`, 'colaborador.html#checklist');
      tarefaEmEdicao = null;
      salvarDados(dados);
      renderizar();
      mostrarAviso('Tarefa atualizada.');
    }
    if (formulario.id === 'formFuncao') {
      evento.preventDefault();
      pessoa.funcoes.push({ id: novoId('fn'), titulo: formulario.titulo.value.trim(), descricao: formulario.descricao.value.trim() });
      pessoa.funcoesConfirmadasEm = null; // mudou: a pessoa precisa confirmar de novo
      salvarDados(dados);
      renderizar();
      mostrarAviso('Função adicionada.');
    }
  });

  pagina.addEventListener('click', (evento) => {
    const editar = evento.target.closest('[data-editar-tarefa-id]');
    if (editar) {
      tarefaEmEdicao = editar.dataset.editarTarefaId;
      renderizar();
    }
    if (evento.target.closest('[data-cancelar-edicao]')) {
      tarefaEmEdicao = null;
      renderizar();
    }
    const tarefa = evento.target.closest('[data-remover-tarefa]');
    if (tarefa) {
      pessoa.tarefas = pessoa.tarefas.filter((t) => t.id !== tarefa.dataset.removerTarefa);
      salvarDados(dados);
      renderizar();
      mostrarAviso('Tarefa removida.', 'lixeira');
    }
    const funcao = evento.target.closest('[data-remover-funcao]');
    if (funcao) {
      pessoa.funcoes = pessoa.funcoes.filter((f) => f.id !== funcao.dataset.removerFuncao);
      salvarDados(dados);
      renderizar();
    }
    if (evento.target.closest('[data-indicar-curso]')) {
      document.getElementById('formIndicarCurso').reset();
      document.getElementById('modalIndicarCurso').showModal();
    }
  });

  document.getElementById('formIndicarCurso').addEventListener('submit', (evento) => {
    evento.preventDefault();
    indicarCurso(dados, pessoa, { titulo: evento.target.titulo.value.trim(), url: evento.target.link.value.trim() });
    salvarDados(dados);
    document.getElementById('modalIndicarCurso').close();
    renderizar();
    mostrarAviso(`Curso indicado para ${primeiroNome(pessoa.nome)}.`);
  });

  if (location.hash) {
    const alvo = document.querySelector(location.hash);
    if (alvo) alvo.scrollIntoView();
  }
}

iniciar();
