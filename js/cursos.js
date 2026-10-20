const dados = carregarDados();
const sessao = exigirSessao(dados, 'colaborador');
const eu = sessao && buscarColaborador(dados, sessao.id);

function renderizar() {
  const visiveis = eu.cursos.filter((c) => c.status !== 'dispensado');
  const grupos = [
    { titulo: 'Para começar', itens: visiveis.filter((c) => c.status === 'sugerido') },
    { titulo: 'Em andamento', itens: visiveis.filter((c) => c.status === 'andamento') },
    { titulo: 'Concluídos', itens: visiveis.filter((c) => c.status === 'concluido') },
  ];
  const concluidos = grupos[2].itens.length;
  const ajudaram = visiveis.filter((c) => c.ajudou === true).length;
  const podeRegistrar = moduloAtivo(dados, eu, 'duvidas');

  document.getElementById('pagina').innerHTML = `
    <div class="cabecalho-pagina">
      <div>
        <h1>Meus cursos</h1>
        <p>Cursos gratuitos de outras plataformas, escolhidos pela IA ou pelo seu gestor a partir das dificuldades que você relatou.</p>
      </div>
      ${podeRegistrar ? `<a class="btn btn-secundario" href="duvidas.html">${icone('mais')}Relatar uma dificuldade</a>` : ''}
    </div>

    ${visiveis.length ? `
      <div class="resumo-numeros">
        <div><strong>${grupos[0].itens.length + grupos[1].itens.length}</strong><span>para fazer</span></div>
        <div><strong>${concluidos}</strong><span>${concluidos === 1 ? 'concluído' : 'concluídos'}</span></div>
        <div><strong>${ajudaram}</strong><span>${ajudaram === 1 ? 'ajudou' : 'ajudaram'} de verdade</span></div>
      </div>
      ${grupos.filter((g) => g.itens.length).map((g) => `
        <h2 class="subtitulo-bloco">${g.titulo} (${g.itens.length})</h2>
        <div class="cursos-externos">${g.itens.map((c) => cartaoCursoExterno(dados, c)).join('')}</div>`).join('')}`
    : `
      <div class="estado-vazio">
        ${icone('play')}
        <h2>Nenhum curso ainda</h2>
        <p>Quando você relatar uma dificuldade para a IA, ela recomenda cursos que aparecem aqui.</p>
        ${podeRegistrar ? '<a class="btn btn-primario" href="duvidas.html">Relatar uma dificuldade</a>' : ''}
      </div>`}`;
}

if (eu) {
  montarLayout({ dados, perfil: 'colaborador', pagina: 'cursos', pessoa: eu });
  renderizar();
  configurarAcoesDeCurso(dados, eu, renderizar);
}
