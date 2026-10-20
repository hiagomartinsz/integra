// dúvidas/dificuldades. vão pra própria pessoa, pro gestor ou pra IA

function destinosDeRegistro(dados) {
  return {
    ia: { rotulo: 'IA', descricao: 'Analisa e recomenda cursos. Seu gestor vê só o tema, não o texto.', icone: 'brilho' },
    gestor: { rotulo: 'Meu gestor', descricao: `${primeiroNome(dados.gestor.nome)} lê e responde por aqui.`, icone: 'usuario' },
    pessoal: { rotulo: 'Só para mim', descricao: 'Fica guardado como uma anotação. Ninguém mais vê.', icone: 'cadeado' },
  };
}

function formularioDeRegistro(dados) {
  const destinos = destinosDeRegistro(dados);
  return `
    <form class="form-registro" data-form-registro>
      <label class="so-leitor" for="textoRegistro">Sua dúvida ou dificuldade</label>
      <textarea id="textoRegistro" name="texto" rows="3" required
        placeholder="Ex.: Tenho dificuldade com planilhas e demoro muito para montar os relatórios."></textarea>
      <fieldset class="destinos">
        <legend>Enviar para</legend>
        ${Object.entries(destinos).map(([id, destino], i) => `
          <label class="destino">
            <input type="radio" name="destino" value="${id}" ${i === 0 ? 'checked' : ''}>
            <span class="destino-cartao">
              <span class="destino-titulo">${icone(destino.icone)}${destino.rotulo}</span>
              <span class="destino-descricao">${destino.descricao}</span>
            </span>
          </label>`).join('')}
      </fieldset>
      <button class="btn btn-destaque" type="submit">${icone('enviar')}Registrar</button>
    </form>`;
}

// aplica a análise da IA a um registro: guarda a mensagem e adiciona os cursos
async function analisarComIA(dados, colaborador, registro) {
  const jaRecebidos = colaborador.cursos.map((c) => c.videoId).filter(Boolean);
  const analise = await analisarRegistro(registro.texto, jaRecebidos, colaborador, dados.empresa);
  registro.analise = {
    temaId: analise.temaId, mensagem: analise.mensagem, semResultado: analise.semResultado,
    faltaInformacao: analise.faltaInformacao, perguntaParaGestor: analise.perguntaParaGestor,
  };
  registro.resolvida = false;
  const agora = new Date().toISOString();
  analise.cursos.forEach((curso) => {
    colaborador.cursos.unshift({
      id: novoId('c'), ...curso, temaId: analise.temaId, origem: 'ia', registroId: registro.id,
      status: 'sugerido', sugeridoEm: agora, iniciadoEm: null, concluidoEm: null, ajudou: null,
    });
  });
  return analise;
}

async function registrar(dados, colaborador, texto, destino) {
  const registro = { id: novoId('r'), texto, destino, data: new Date().toISOString() };
  colaborador.registros.unshift(registro);
  return processarDestino(dados, colaborador, registro);
}

async function processarDestino(dados, colaborador, registro) {
  if (registro.destino === 'gestor') {
    notificar(dados, ID_GESTOR, `${colaborador.nome} enviou uma dúvida: “${registro.texto.slice(0, 80)}${registro.texto.length > 80 ? '…' : ''}”`, `pessoa.html?id=${colaborador.id}#duvidas`);
    return `Enviado para ${dados.gestor.nome}. Você será avisado quando a resposta chegar.`;
  }
  if (registro.destino === 'ia') {
    const analise = await analisarComIA(dados, colaborador, registro);
    return analise.cursos.length
      ? `A IA recomendou ${analise.cursos.length === 1 ? 'um curso' : `${analise.cursos.length} cursos`} para você.`
      : 'A IA analisou sua mensagem.';
  }
  return 'Anotação guardada só para você.';
}

// a IA não achou a informação: manda só a pergunta genérica pro gestor cadastrar a resposta
function pedirRespostaAoGestor(dados, colaborador, registroId, pergunta) {
  const registro = colaborador.registros.find((r) => r.id === registroId);
  registro.analise.perguntaParaGestor = pergunta; // o colaborador pode ter editado a sugestão da IA
  const pedido = {
    id: novoId('pp'), pergunta,
    colaboradorId: colaborador.id, registroId: registro.id, data: new Date().toISOString(),
  };
  dados.empresa.perguntasPendentes.push(pedido);
  registro.analise.pedido = { id: pedido.id, situacao: 'aguardando' };
  notificar(dados, ID_GESTOR, `A IA não soube responder: “${pedido.pergunta}”. Cadastre a resposta para todos.`, 'empresa.html#pendentes');
  return `Pergunta enviada para ${dados.gestor.nome}. A resposta vai aparecer aqui.`;
}

// parte da análise da IA sobre a pergunta sem resposta (pedido ao gestor)
function htmlPedidoAoGestor(dados, registro, editavel) {
  const { analise } = registro;
  if (!analise.faltaInformacao) return '';
  const pedido = analise.pedido;
  if (pedido && pedido.situacao === 'respondida') {
    return `
      <div class="registro-resposta">
        <span class="registro-resposta-autor">${icone('usuario')}${dados.gestor.nome} respondeu · ${tempoRelativo(pedido.respondidaEm)}</span>
        <p>${escaparHtml(pedido.resposta)}</p>
      </div>`;
  }
  if (pedido && pedido.situacao === 'aguardando') {
    return `<div class="registro-aguardando">${icone('relogio')}Pergunta enviada a ${primeiroNome(dados.gestor.nome)}: “${escaparHtml(analise.perguntaParaGestor)}”</div>`;
  }
  if (pedido && pedido.situacao === 'descartada') {
    return `<p class="registro-nota">${primeiroNome(dados.gestor.nome)} não cadastrou uma resposta geral para essa pergunta.</p>
      ${editavel ? `<button class="btn btn-secundario btn-pequeno" data-encaminhar="gestor" data-registro="${registro.id}">${icone('enviar')}Enviar minha dúvida para o gestor</button>` : ''}`;
  }
  if (!editavel) return '';
  return `
    <form class="registro-pedido" data-form-pedido="${registro.id}">
      <label for="pedido-${registro.id}">${primeiroNome(dados.gestor.nome)} pode cadastrar essa resposta para todos. Revise a pergunta que vai para ele:</label>
      <textarea id="pedido-${registro.id}" name="pergunta" rows="2" maxlength="300" required>${escaparHtml(analise.perguntaParaGestor)}</textarea>
      <small>Ele verá seu nome e só esta pergunta, não a sua mensagem original.</small>
      <button class="btn btn-secundario btn-pequeno" type="submit">${icone('enviar')}Pedir para o gestor responder</button>
    </form>`;
}

function excluirRegistro(dados, colaborador, registroId) {
  colaborador.registros = colaborador.registros.filter((r) => r.id !== registroId);
  // pergunta pendente com o gestor deixa de existir
  dados.empresa.perguntasPendentes = dados.empresa.perguntasPendentes.filter((p) => p.registroId !== registroId);
  // cursos recomendados que a pessoa nem chegou a abrir saem junto; os iniciados ou concluídos ficam
  colaborador.cursos = colaborador.cursos.filter((c) => c.registroId !== registroId || c.status !== 'sugerido');
}

async function encaminharRegistro(dados, colaborador, registroId, destino) {
  const registro = colaborador.registros.find((r) => r.id === registroId);
  registro.destino = destino;
  registro.data = new Date().toISOString();
  return processarDestino(dados, colaborador, registro);
}

function htmlRegistro(dados, colaborador, registro, { editavel = true } = {}) {
  const destino = destinosDeRegistro(dados)[registro.destino];
  let corpo = '';

  if (registro.destino === 'gestor') {
    if (registro.resposta) {
      const cursoIndicado = registro.resposta.cursoId && colaborador.cursos.find((c) => c.id === registro.resposta.cursoId);
      corpo = `
        <div class="registro-resposta">
          <span class="registro-resposta-autor">${icone('usuario')}${dados.gestor.nome} respondeu · ${tempoRelativo(registro.resposta.data)}</span>
          <p>${escaparHtml(registro.resposta.texto)}</p>
          ${cursoIndicado ? `<a class="registro-curso" href="cursos.html">${icone('play')}Curso indicado: ${escaparHtml(cursoIndicado.titulo)}</a>` : ''}
        </div>`;
    } else {
      corpo = `<div class="registro-aguardando">${icone('relogio')}Aguardando resposta de ${primeiroNome(dados.gestor.nome)}</div>`;
    }
  }

  if (registro.destino === 'ia' && registro.analise) {
    const cursos = colaborador.cursos.filter((c) => c.registroId === registro.id && c.status !== 'dispensado');
    corpo = `
      <div class="registro-ia">
        <span class="registro-resposta-autor">${icone('brilho')}Análise da IA${registro.resolvida ? ' · <strong>dificuldade resolvida</strong>' : ''}</span>
        <p>${escaparHtml(registro.analise.mensagem)}</p>
        ${cursos.length ? `<ul class="registro-cursos">
          ${cursos.map((c) => `<li><a href="cursos.html">${icone('play')}${escaparHtml(c.titulo)}</a><span class="selo ${STATUS_CURSO[c.status].classe}">${STATUS_CURSO[c.status].rotulo}</span></li>`).join('')}
        </ul>` : ''}
        ${htmlPedidoAoGestor(dados, registro, editavel)}
        ${editavel && registro.analise.semResultado && !registro.analise.faltaInformacao ? `<button class="btn btn-secundario btn-pequeno" data-encaminhar="gestor" data-registro="${registro.id}">${icone('enviar')}Enviar para o gestor</button>` : ''}
      </div>`;
  }

  if (registro.destino === 'pessoal' && editavel) {
    corpo = `
      <div class="registro-acoes">
        <button class="btn btn-texto btn-pequeno" data-encaminhar="ia" data-registro="${registro.id}">${icone('brilho')}Pedir análise da IA</button>
        <button class="btn btn-texto btn-pequeno" data-encaminhar="gestor" data-registro="${registro.id}">${icone('enviar')}Enviar ao gestor</button>
      </div>`;
  }

  return `
    <article class="registro destino-${registro.destino}" data-registro-id="${registro.id}">
      <header class="registro-topo">
        <span class="selo selo-destino-${registro.destino}">${icone(destino.icone)}${destino.rotulo}</span>
        <span class="registro-topo-direita">
          <small>${tempoRelativo(registro.data)}</small>
          <button class="btn-fechar btn-excluir-registro" type="button" data-excluir-registro aria-label="Excluir esta dúvida" title="Excluir">${icone('lixeira')}</button>
        </span>
      </header>
      <div class="registro-confirmar" hidden>
        <span>Excluir esta dúvida?${registro.destino === 'gestor' || (registro.analise && registro.analise.pedido) ? ` ${primeiroNome(dados.gestor.nome)} também deixa de vê-la.` : ''}</span>
        <button class="btn btn-texto btn-pequeno" type="button" data-cancelar-exclusao>Cancelar</button>
        <button class="btn btn-perigo btn-pequeno" type="button" data-confirmar-exclusao>Excluir</button>
      </div>
      <p class="registro-texto">${escaparHtml(registro.texto)}</p>
      ${corpo}
    </article>`;
}

function configurarRegistros(dados, colaborador, aoAtualizar) {
  function esperando(botao, ativo) {
    if (ativo) {
      botao.dataset.textoOriginal = botao.innerHTML;
      botao.innerHTML = `${icone('brilho')}Analisando…`;
    } else if (botao.dataset.textoOriginal) {
      botao.innerHTML = botao.dataset.textoOriginal;
    }
    botao.disabled = ativo;
  }

  document.addEventListener('submit', async (evento) => {
    const formulario = evento.target.closest('[data-form-registro]');
    if (!formulario) return;
    evento.preventDefault();
    const texto = formulario.texto.value.trim();
    if (!texto) return;
    const botao = formulario.querySelector('[type="submit"]');
    if (botao.disabled) return;
    const destino = formulario.destino.value;
    if (destino === 'ia') esperando(botao, true);
    const mensagem = await registrar(dados, colaborador, texto, destino);
    salvarDados(dados);
    esperando(botao, false);
    formulario.reset();
    aoAtualizar();
    mostrarAviso(mensagem, 'enviar');
  });

  document.addEventListener('submit', (evento) => {
    const formulario = evento.target.closest('[data-form-pedido]');
    if (!formulario) return;
    evento.preventDefault();
    const pergunta = formulario.pergunta.value.trim();
    if (!pergunta) return;
    const mensagem = pedirRespostaAoGestor(dados, colaborador, formulario.dataset.formPedido, pergunta);
    salvarDados(dados);
    aoAtualizar();
    mostrarAviso(mensagem, 'enviar');
  });

  // excluir: primeiro pede confirmação dentro do próprio cartão
  document.addEventListener('click', (evento) => {
    const cartao = evento.target.closest('[data-registro-id]');
    if (!cartao) return;
    const confirmacao = cartao.querySelector('.registro-confirmar');
    if (evento.target.closest('[data-excluir-registro]')) {
      confirmacao.hidden = false;
      confirmacao.querySelector('[data-cancelar-exclusao]').focus();
    } else if (evento.target.closest('[data-cancelar-exclusao]')) {
      confirmacao.hidden = true;
    } else if (evento.target.closest('[data-confirmar-exclusao]')) {
      excluirRegistro(dados, colaborador, cartao.dataset.registroId);
      salvarDados(dados);
      aoAtualizar();
      mostrarAviso('Dúvida excluída.', 'lixeira');
    }
  });

  document.addEventListener('click', async (evento) => {
    const botao = evento.target.closest('[data-encaminhar]');
    if (!botao || botao.disabled) return;
    if (botao.dataset.encaminhar === 'ia') esperando(botao, true);
    const mensagem = await encaminharRegistro(dados, colaborador, botao.dataset.registro, botao.dataset.encaminhar);
    salvarDados(dados);
    aoAtualizar();
    mostrarAviso(mensagem, 'enviar');
  });
}
