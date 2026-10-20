// topo e menus das páginas internas. a página precisa ter #topo, #menuLateral e #navInferior

// o menu do colaborador acompanha a fase: só mostra o que está liberado
function menuDoColaborador(dados, colaborador) {
  const itens = [
    { pagina: 'inicio', rotulo: 'Início', icone: 'home', href: 'colaborador.html' },
    { pagina: 'jornada', rotulo: 'Minha jornada', curto: 'Jornada', icone: 'mapa', href: 'jornada.html' },
    { pagina: 'treinamentos', rotulo: 'Treinamentos', icone: 'livro', href: 'treinamentos.html' },
  ];
  const temDuvidas = moduloAtivo(dados, colaborador, 'duvidas') || colaborador.registros.length > 0;
  if (temDuvidas) itens.push({ pagina: 'duvidas', rotulo: 'Dúvidas', icone: 'ajuda', href: 'duvidas.html' });
  if (temDuvidas || colaborador.cursos.length > 0) itens.push({ pagina: 'cursos', rotulo: 'Meus cursos', curto: 'Cursos', icone: 'play', href: 'cursos.html' });
  return itens;
}

const MENU_GESTOR = [
  { pagina: 'painel', rotulo: 'Painel', icone: 'home', href: 'gestor.html' },
  { pagina: 'treinamentos', rotulo: 'Treinamentos', icone: 'livro', href: 'gestor-treinamentos.html' },
  { pagina: 'fases', rotulo: 'Fases da jornada', curto: 'Fases', icone: 'mapa', href: 'fases.html' },
  { pagina: 'empresa', rotulo: 'Informações da empresa', curto: 'Empresa', icone: 'maleta', href: 'empresa.html' },
];

function itemDeMenu(item, paginaAtual, classe) {
  const ativo = item.pagina === paginaAtual;
  const rotulo = classe === 'menu-item' ? item.rotulo : (item.curto || item.rotulo);
  return `<a class="${classe} ${ativo ? 'ativo' : ''}" href="${item.href}" ${ativo ? 'aria-current="page"' : ''}>${icone(item.icone)}<span class="rotulo">${rotulo}</span></a>`;
}

// perfil: 'colaborador' | 'gestor'
// pagina: identificador do item de menu ativo
// pessoa: colaborador logado (só no perfil colaborador)
function montarLayout({ dados, perfil, pagina, pessoa = null }) {
  const ehGestor = perfil === 'gestor';
  const usuario = ehGestor ? dados.gestor : pessoa;
  const itens = ehGestor ? MENU_GESTOR : menuDoColaborador(dados, pessoa);

  let blocoJornada = '';
  if (!ehGestor) {
    const situacao = situacaoNaJornada(dados, pessoa);
    const texto = situacao.concluido ? 'Programa concluído' : `Dia ${situacao.dia} de ${situacao.duracao} · ${situacao.fase.nome}`;
    blocoJornada = `
      <a class="nivel-topo" href="jornada.html" title="Ver minha jornada">
        <span class="nivel-texto">${texto}</span>
        ${anelProgresso(situacao.progresso, { tamanho: 38 })}
      </a>`;
  }

  const topo = document.getElementById('topo');
  topo.className = 'topo';
  topo.innerHTML = `
    <div class="topo-marca">
      <a class="marca" href="${ehGestor ? 'gestor.html' : 'colaborador.html'}">
        <span class="marca-logo"><img src="assets/logo.png" alt=""></span>
        Integra<span class="marca-mais">+</span>
      </a>
      ${ehGestor ? '<span class="pilula-topo">Painel do Gestor</span>' : ''}
    </div>
    <div class="topo-acoes">
      ${blocoJornada}
      <button class="btn-icone-topo" data-abrir-notificacoes aria-label="Notificações">
        ${icone('sino')}
        <span class="contador" data-contador-notificacoes hidden></span>
      </button>
      <span class="divisor-vertical"></span>
      <div class="perfil">
        <span class="avatar">${iniciais(usuario.nome)}</span>
        <div class="perfil-textos">
          <div class="perfil-nome">${usuario.nome}</div>
          <div class="perfil-cargo">${usuario.cargo}</div>
        </div>
      </div>
      <button class="btn-icone-topo so-mobile" data-sair aria-label="Sair">${icone('sair')}</button>
    </div>`;

  const menu = document.getElementById('menuLateral');
  menu.className = 'menu-lateral';
  menu.setAttribute('aria-label', 'Menu principal');
  menu.innerHTML = `
    ${itens.map((item) => itemDeMenu(item, pagina, 'menu-item')).join('')}
    <div class="menu-rodape">
      <button class="menu-item" data-sair>${icone('sair')}<span class="rotulo">Sair</span></button>
    </div>`;

  const navInferior = document.getElementById('navInferior');
  navInferior.className = 'nav-inferior';
  navInferior.setAttribute('aria-label', 'Menu principal');
  navInferior.innerHTML = itens.map((item) => itemDeMenu(item, pagina, 'nav-inferior-item')).join('');

  document.addEventListener('click', (evento) => {
    if (evento.target.closest('[data-sair]')) {
      encerrarSessao();
      location.href = 'index.html';
    }
  });

  configurarNotificacoes(dados, ehGestor ? ID_GESTOR : pessoa.id);
  configurarModais();
}
