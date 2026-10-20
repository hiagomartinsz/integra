// não hospedamos curso nenhum, só recomendamos do YouTube e acompanhamos:
// sugerido -> em andamento -> concluído -> ajudou?

const STATUS_CURSO = {
  sugerido: { rotulo: 'Novo', classe: 'selo-novo' },
  andamento: { rotulo: 'Em andamento', classe: 'selo-andamento' },
  concluido: { rotulo: 'Concluído', classe: 'selo-sucesso' },
};

// extrai o id de um link do YouTube (ou null se não for do YouTube)
function idDoYoutube(url) {
  const encontrado = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return encontrado ? encontrado[1] : null;
}

function enderecoDoCurso(curso) {
  return curso.url || `https://www.youtube.com/watch?v=${curso.videoId}`;
}

function plataformaDoCurso(curso) {
  if (curso.videoId) return 'YouTube';
  try {
    return new URL(curso.url).hostname.replace('www.', '');
  } catch (erro) {
    return 'Link externo';
  }
}

function cartaoCursoExterno(dados, curso, { editavel = true } = {}) {
  const tema = buscarTema(dados, curso.temaId);
  const status = STATUS_CURSO[curso.status];
  const origem = curso.origem === 'gestor'
    ? `${icone('usuario')}Indicado por ${primeiroNome(dados.gestor.nome)}`
    : `${icone('brilho')}Recomendado pela IA`;
  const capa = curso.videoId
    ? `<img src="https://i.ytimg.com/vi/${curso.videoId}/mqdefault.jpg" alt="" loading="lazy">`
    : `<span class="curso-externo-sem-capa">${icone('link')}</span>`;

  let acoes = '';
  if (editavel) {
    if (curso.status === 'sugerido') {
      acoes = `
        <a class="btn btn-primario btn-pequeno" href="${enderecoDoCurso(curso)}" target="_blank" rel="noopener" data-acao-curso="abrir" data-curso="${curso.id}">${icone('externo')}Começar curso</a>
        <button class="btn btn-texto btn-pequeno" data-acao-curso="dispensar" data-curso="${curso.id}">Dispensar</button>`;
    } else if (curso.status === 'andamento') {
      acoes = `
        <a class="btn btn-secundario btn-pequeno" href="${enderecoDoCurso(curso)}" target="_blank" rel="noopener">${icone('externo')}Continuar</a>
        <button class="btn btn-primario btn-pequeno" data-acao-curso="concluir" data-curso="${curso.id}">${icone('check')}Concluí</button>`;
    } else if (curso.ajudou === null) {
      acoes = `
        <span class="curso-externo-pergunta">Ajudou com sua dificuldade?</span>
        <button class="btn btn-secundario btn-pequeno" data-acao-curso="ajudou-sim" data-curso="${curso.id}">Sim</button>
        <button class="btn btn-secundario btn-pequeno" data-acao-curso="ajudou-nao" data-curso="${curso.id}">Não</button>`;
    } else if (curso.ajudou === false && curso.semAlternativa && !curso.enviadoAoGestor) {
      acoes = `<button class="btn btn-primario btn-pequeno" data-acao-curso="pedir-gestor" data-curso="${curso.id}">${icone('enviar')}Pedir ajuda ao gestor</button>`;
    }
  }

  let resultado = '';
  if (curso.status === 'concluido' && curso.ajudou === true) resultado = `<span class="curso-externo-resultado bom">${icone('check')}Ajudou</span>`;
  if (curso.status === 'concluido' && curso.ajudou === false) resultado = `<span class="curso-externo-resultado ruim">Não ajudou${curso.enviadoAoGestor ? ' · enviado ao gestor' : ''}</span>`;

  return `
    <article class="curso-externo">
      <a class="curso-externo-capa" href="${enderecoDoCurso(curso)}" target="_blank" rel="noopener" ${editavel ? `data-acao-curso="abrir" data-curso="${curso.id}"` : ''}>
        ${capa}
        <span class="curso-externo-plataforma">${icone('externo')}${plataformaDoCurso(curso)}</span>
      </a>
      <div class="curso-externo-corpo">
        <div class="curso-externo-meta">
          <span class="selo ${status.classe}">${status.rotulo}</span>
          <span class="curso-externo-origem">${origem}</span>
        </div>
        <h3>${escaparHtml(curso.titulo)}</h3>
        <p class="curso-externo-canal">${escaparHtml(curso.canal || '')}</p>
        ${tema ? `<p class="curso-externo-tema">Para: <strong>${tema.nome}</strong></p>` : ''}
        ${resultado}
        ${acoes ? `<div class="curso-externo-acoes">${acoes}</div>` : ''}
      </div>
    </article>`;
}

function executarAcaoCurso(dados, colaborador, acao, cursoId) {
  const curso = colaborador.cursos.find((c) => c.id === cursoId);
  if (!curso) return null;
  const agora = new Date().toISOString();
  const registro = colaborador.registros.find((r) => r.id === curso.registroId);
  const tema = buscarTema(dados, curso.temaId);

  if (acao === 'abrir') {
    if (curso.status !== 'sugerido') return null;
    curso.status = 'andamento';
    curso.iniciadoEm = agora;
    return 'Curso aberto em uma nova aba. Quando terminar, volte aqui e marque como concluído.';
  }

  if (acao === 'dispensar') {
    curso.status = 'dispensado';
    return 'Curso dispensado.';
  }

  if (acao === 'concluir') {
    curso.status = 'concluido';
    curso.concluidoEm = agora;
    return 'Curso concluído! Conte se ele ajudou com a sua dificuldade.';
  }

  if (acao === 'ajudou-sim') {
    curso.ajudou = true;
    if (registro) registro.resolvida = true;
    notificar(dados, ID_GESTOR, `${colaborador.nome} superou uma dificuldade${tema ? ` em ${tema.nome}` : ''} com o curso “${curso.titulo}”.`, `pessoa.html?id=${colaborador.id}#duvidas`);
    return 'Que ótimo! Dificuldade marcada como resolvida.';
  }

  if (acao === 'ajudou-nao') {
    curso.ajudou = false;
    const jaRecebidos = colaborador.cursos.map((c) => c.videoId).filter(Boolean);
    const proximo = curso.temaId ? proximoCursoDoTema(dados, curso.temaId, jaRecebidos) : null;
    if (proximo) {
      colaborador.cursos.unshift({
        id: novoId('c'), ...proximo, temaId: curso.temaId, origem: 'ia', registroId: curso.registroId,
        status: 'sugerido', sugeridoEm: agora, iniciadoEm: null, concluidoEm: null, ajudou: null,
      });
      return `A IA separou outro curso para você: "${proximo.titulo}".`;
    }
    curso.semAlternativa = true;
    return 'Não há outros cursos sobre esse tema. Que tal pedir ajuda ao seu gestor?';
  }

  if (acao === 'pedir-gestor') {
    curso.enviadoAoGestor = true;
    const texto = `Fiz os cursos recomendados${tema ? ` sobre ${tema.nome.toLowerCase()}` : ''}, mas ainda tenho dificuldade.${registro ? ` Minha dificuldade: "${registro.texto}"` : ''}`;
    colaborador.registros.unshift({ id: novoId('r'), texto, destino: 'gestor', data: agora });
    notificar(dados, ID_GESTOR, `${colaborador.nome} pediu sua ajuda com uma dificuldade.`, `pessoa.html?id=${colaborador.id}#duvidas`);
    return `Enviado para ${dados.gestor.nome}. A resposta vai aparecer em Dúvidas.`;
  }

  return null;
}

function configurarAcoesDeCurso(dados, colaborador, aoAtualizar) {
  document.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-acao-curso]');
    if (!botao) return;
    const mensagem = executarAcaoCurso(dados, colaborador, botao.dataset.acaoCurso, botao.dataset.curso);
    if (!mensagem) return;
    salvarDados(dados);
    // links abrem o curso normalmente; o redesenho espera a nova aba abrir
    setTimeout(aoAtualizar, 0);
    mostrarAviso(mensagem, botao.dataset.acaoCurso === 'abrir' ? 'externo' : 'check');
  });
}
