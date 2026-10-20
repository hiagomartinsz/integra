// usado no painel e na página da pessoa

function formularioDeResposta(colaboradorId, registroId) {
  return `
    <form class="form-resposta" data-responder="${registroId}" data-colaborador="${colaboradorId}">
      <label class="so-leitor" for="resposta-${colaboradorId}-${registroId}">Sua resposta</label>
      <textarea id="resposta-${colaboradorId}-${registroId}" name="texto" rows="2" placeholder="Escreva sua resposta..." required></textarea>
      <details class="indicar-curso">
        <summary>${icone('play')}Indicar um curso junto (opcional)</summary>
        <input type="url" name="link" placeholder="Cole o link do curso (YouTube ou outro site)">
        <input type="text" name="tituloCurso" placeholder="Nome do curso">
      </details>
      <button class="btn btn-primario btn-pequeno" type="submit">${icone('enviar')}Responder</button>
    </form>`;
}

function indicarCurso(dados, colaborador, { titulo, url, registroId = null }) {
  const videoId = idDoYoutube(url);
  const curso = {
    id: novoId('c'), titulo: titulo || 'Curso indicado', url, videoId, canal: '', temaId: null,
    origem: 'gestor', registroId, status: 'sugerido', sugeridoEm: new Date().toISOString(),
    iniciadoEm: null, concluidoEm: null, ajudou: null,
  };
  colaborador.cursos.unshift(curso);
  notificar(dados, colaborador.id, `${dados.gestor.nome} indicou um curso para você: “${curso.titulo}”.`, 'cursos.html');
  return curso;
}

function responderDuvida(dados, colaborador, registroId, texto, link, tituloCurso) {
  const registro = colaborador.registros.find((r) => r.id === registroId);
  registro.resposta = { texto, data: new Date().toISOString() };
  if (link) registro.resposta.cursoId = indicarCurso(dados, colaborador, { titulo: tituloCurso, url: link, registroId }).id;
  notificar(dados, colaborador.id, `${dados.gestor.nome} respondeu sua dúvida.`, 'duvidas.html');
}

function configurarRespostas(dados, aoAtualizar) {
  document.addEventListener('submit', (evento) => {
    const formulario = evento.target.closest('[data-responder]');
    if (!formulario) return;
    evento.preventDefault();
    const texto = formulario.texto.value.trim();
    if (!texto) return;
    const colaborador = buscarColaborador(dados, formulario.dataset.colaborador);
    responderDuvida(dados, colaborador, formulario.dataset.responder, texto, formulario.link.value.trim(), formulario.tituloCurso.value.trim());
    salvarDados(dados);
    aoAtualizar();
    mostrarAviso(`Resposta enviada para ${colaborador.nome}.`, 'enviar');
  });
}

function seloDeSituacao(resumo) {
  if (resumo.situacao.concluido) return `<span class="selo selo-sucesso">${icone('check')}Concluiu o programa</span>`;
  if (resumo.situacao.naoComecou) return '<span class="selo selo-neutro">Ainda não começou</span>';
  if (resumo.motivos.length) return `<span class="selo selo-atencao" title="${resumo.motivos.join(' · ')}">${icone('alerta')}Atenção</span>`;
  return '<span class="selo selo-sucesso">Em dia</span>';
}
