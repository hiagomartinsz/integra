const dados = carregarDados();
const sessao = exigirSessao(dados, 'colaborador');
const eu = sessao && buscarColaborador(dados, sessao.id);
let filtro = 'todas';

const FILTROS_REGISTRO = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'ia', rotulo: 'IA' },
  { id: 'gestor', rotulo: 'Gestor' },
  { id: 'pessoal', rotulo: 'Só para mim' },
];

function renderizar() {
  const ativo = moduloAtivo(dados, eu, 'duvidas');
  const situacao = situacaoNaJornada(dados, eu);
  const primeira = primeiraFaseComModulo(dados, 'duvidas');
  const lista = eu.registros.filter((r) => filtro === 'todas' || r.destino === filtro);

  let topo;
  if (ativo) {
    topo = `<section class="cartao">${formularioDeRegistro(dados)}</section>`;
  } else if (situacao.concluido) {
    topo = `<div class="aviso-modulo">${icone('cadeado')}Seu programa de integração terminou. O histórico continua disponível para consulta.</div>`;
  } else {
    topo = `<div class="aviso-modulo">${icone('cadeado')}${primeira
      ? `Este espaço fica disponível a partir da fase <strong>${primeira.nome}</strong>, em ${formatarDataExtensa(somarDias(eu.inicio, primeira.inicioDia - 1))}.`
      : 'Este espaço não está ativo na sua jornada.'}</div>`;
  }

  document.getElementById('pagina').innerHTML = `
    <div class="cabecalho-pagina">
      <div>
        <h1>Dúvidas e dificuldades</h1>
        <p>Registre o que está difícil e escolha quem vai ler. Quando a IA analisa, ela recomenda cursos gratuitos de fora para ajudar você.</p>
      </div>
    </div>
    ${topo}
    ${eu.registros.length ? `
      <div class="barra-filtros">
        <div class="filtros" role="tablist">
          ${FILTROS_REGISTRO.map((f) => {
            const quantidade = f.id === 'todas' ? eu.registros.length : eu.registros.filter((r) => r.destino === f.id).length;
            return `<button class="filtro ${filtro === f.id ? 'ativo' : ''}" role="tab" aria-selected="${filtro === f.id}" data-filtro="${f.id}">${f.rotulo}<span>${quantidade}</span></button>`;
          }).join('')}
        </div>
      </div>
      <div class="lista-registros">
        ${lista.map((r) => htmlRegistro(dados, eu, r, { editavel: ativo })).join('') || '<p class="texto-vazio">Nada por aqui neste filtro.</p>'}
      </div>` : ''}`;
}

if (eu) {
  montarLayout({ dados, perfil: 'colaborador', pagina: 'duvidas', pessoa: eu });
  renderizar();
  configurarRegistros(dados, eu, () => { filtro = 'todas'; renderizar(); });
  document.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-filtro]');
    if (!botao) return;
    filtro = botao.dataset.filtro;
    renderizar();
  });
}
