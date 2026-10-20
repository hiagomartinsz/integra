const dados = carregarDados();
const sessao = exigirSessao(dados, 'colaborador');
const eu = sessao && buscarColaborador(dados, sessao.id);

function cartaoTreinamento(t) {
  const formato = FORMATOS_TREINAMENTO[t.formato];
  let estado;
  if (!t.liberado) estado = `<span class="selo selo-neutro">${icone('cadeado')}Libera em ${formatarData(t.liberaEm, true)}</span>`;
  else if (t.concluidoEm) estado = `<span class="selo selo-sucesso">${icone('check')}Concluído em ${formatarData(t.concluidoEm, true)}</span>`;
  else if (t.atrasado) estado = `<span class="selo selo-atencao">${icone('alerta')}Atrasado</span>`;
  else estado = '<span class="selo selo-novo">Pendente</span>';

  const conteudo = `
    <span class="treinamento-icone formato-${t.formato}">${icone(t.liberado ? formato.icone : 'cadeado')}</span>
    <span class="treinamento-texto">
      <span class="treinamento-meta">${formato.nome} · ${t.fase.nome}${t.obrigatorio ? ' · <strong>Obrigatório</strong>' : ''}</span>
      <strong>${escaparHtml(t.titulo)}</strong>
      <span class="treinamento-descricao">${escaparHtml(t.descricao)}</span>
    </span>
    ${estado}`;

  return t.liberado
    ? `<a class="cartao treinamento" href="treinamento.html?id=${t.id}">${conteudo}</a>`
    : `<div class="cartao treinamento bloqueado">${conteudo}</div>`;
}

function renderizar() {
  const lista = treinamentosDaPessoa(dados, eu);
  const pendentes = lista.filter((t) => t.liberado && !t.concluidoEm);
  const concluidos = lista.filter((t) => t.concluidoEm);
  const futuros = lista.filter((t) => !t.liberado);

  const secao = (titulo, itens) => itens.length
    ? `<h2 class="subtitulo-bloco">${titulo} (${itens.length})</h2><div class="lista-treinamentos">${itens.map(cartaoTreinamento).join('')}</div>`
    : '';

  document.getElementById('pagina').innerHTML = `
    <div class="cabecalho-pagina">
      <div>
        <h1>Treinamentos</h1>
        <p>Materiais preparados pela empresa para você. Novos treinamentos são liberados conforme você avança nas fases.</p>
      </div>
    </div>
    ${lista.length ? '' : `<div class="estado-vazio">${icone('livro')}<h2>Nenhum treinamento por enquanto</h2><p>Quando a empresa publicar um treinamento, ele aparece aqui.</p></div>`}
    ${secao('Para fazer', pendentes)}
    ${secao('Próximas fases', futuros)}
    ${secao('Concluídos', concluidos)}`;
}

if (eu) {
  montarLayout({ dados, perfil: 'colaborador', pagina: 'treinamentos', pessoa: eu });
  renderizar();
}
