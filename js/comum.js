// funções usadas em várias páginas

// evita que textos digitados pelo usuário quebrem o HTML
function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

// remove acentos e deixa tudo minúsculo (para buscas e comparações)
function normalizar(texto) {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function iniciais(nome) {
  const partes = nome.trim().split(/\s+/);
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

function primeiroNome(nome) {
  return nome.split(' ')[0];
}

// "2026-10-20" -> "20/10/2026" (ou "20/10" se curto = true)
function formatarData(iso, curto = false) {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return curto ? `${dia}/${mes}` : `${dia}/${mes}/${ano}`;
}

// "2026-10-20" -> "20 de outubro"
function formatarDataExtensa(iso) {
  return new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

// ex: "Segunda-feira, 5 de outubro"
function dataDeHojeExtenso() {
  const texto = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ex: "agora", "há 5 min", "há 3 horas", "ontem", "há 4 dias"
function tempoRelativo(isoDataHora) {
  const minutos = Math.round((Date.now() - new Date(isoDataHora).getTime()) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  const dias = Math.round(horas / 24);
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}

// componentes visuais

function barraProgresso(valor, variante = '') {
  return `
    <div class="barra ${variante}" role="progressbar" aria-valuenow="${valor}" aria-valuemin="0" aria-valuemax="100">
      <div class="barra-preenchida" style="width: ${valor}%"></div>
    </div>`;
}

function anelProgresso(valor, { tamanho = 40, espessura = 4, classe = '', texto = `${valor}%` } = {}) {
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const deslocamento = circunferencia * (1 - valor / 100);
  const centro = tamanho / 2;
  return `
    <div class="anel ${classe}" style="width:${tamanho}px;height:${tamanho}px" role="img" aria-label="${valor}%">
      <svg width="${tamanho}" height="${tamanho}" viewBox="0 0 ${tamanho} ${tamanho}">
        <circle class="anel-trilha" cx="${centro}" cy="${centro}" r="${raio}" fill="none" stroke-width="${espessura}"/>
        <circle class="anel-valor" cx="${centro}" cy="${centro}" r="${raio}" fill="none" stroke-width="${espessura}"
          stroke-linecap="round" stroke-dasharray="${circunferencia}" stroke-dashoffset="${deslocamento}"/>
      </svg>
      <span class="anel-texto">${texto}</span>
    </div>`;
}

function avatarPequeno(dados, pessoa) {
  const indice = dados.colaboradores.findIndex((p) => p.id === pessoa.id);
  return `<span class="avatar-pequeno cor-${Math.max(indice, 0) % 6}">${iniciais(pessoa.nome)}</span>`;
}

// posição (em %) do marcador de hoje: as fases têm a mesma largura,
// e o marcador anda dentro da fase atual conforme os dias passam
function posicaoDeHoje(situacao) {
  const fase = situacao.fase;
  const dentroDaFase = (situacao.dia - fase.inicioDia + 0.5) / fase.dias;
  return ((fase.indice + dentroDaFase) / situacao.fases.length) * 100;
}

function trilhaDeFases(situacao) {
  const segmentos = situacao.fases.map((fase) => {
    let estado = 'futura';
    if (situacao.concluido || situacao.dia > fase.fimDia) estado = 'passada';
    else if (situacao.dia >= fase.inicioDia) estado = 'atual';
    return `
      <div class="trilha-segmento ${estado}">
        <span class="trilha-barra"></span>
        <span class="trilha-nome">${fase.nome}</span>
      </div>`;
  }).join('');
  return `
    <div class="trilha-fases">
      ${segmentos}
      ${situacao.concluido || situacao.naoComecou ? '' : `<span class="trilha-hoje" style="left:${posicaoDeHoje(situacao)}%" title="Hoje: dia ${situacao.dia}"></span>`}
    </div>`;
}

function itemTarefa(tarefa, { editavel = true } = {}) {
  const feita = tarefaFeitaHoje(tarefa);
  const selos = [];
  if (tarefa.tipo === 'rotina') selos.push('<span class="selo selo-rotina">Rotina diária</span>');
  if (tarefa.tipo === 'pontual' && !feita) {
    const dias = diferencaEmDias(dataISO(), tarefa.prazo);
    if (dias < 0) selos.push(`<span class="selo selo-atencao">${icone('alerta')}Atrasada</span>`);
    else if (dias === 0) selos.push(`<span class="selo selo-atencao">${icone('relogio')}Vence hoje</span>`);
    else selos.push(`<span class="selo selo-neutro">${icone('calendario')}Até ${formatarData(tarefa.prazo, true)}</span>`);
  }

  return `
    <li>
      <label class="tarefa ${editavel ? '' : 'somente-leitura'}">
        <input type="checkbox" data-tarefa="${tarefa.id}" ${feita ? 'checked' : ''} ${editavel ? '' : 'disabled'}>
        <span class="caixa">${icone('check')}</span>
        <span class="tarefa-texto">
          <span class="tarefa-titulo">${escaparHtml(tarefa.titulo)}</span>
          ${selos.length ? `<span class="tarefa-selos">${selos.join('')}</span>` : ''}
        </span>
      </label>
    </li>`;
}

// aviso rápido (toast)

let temporizadorAviso;
function mostrarAviso(texto, nomeIcone = 'check') {
  let aviso = document.getElementById('aviso');
  if (!aviso) {
    aviso = document.createElement('div');
    aviso.id = 'aviso';
    aviso.className = 'aviso';
    aviso.setAttribute('role', 'status');
    document.body.appendChild(aviso);
  }
  aviso.innerHTML = `${icone(nomeIcone)}<span>${escaparHtml(texto)}</span>`;
  aviso.classList.remove('visivel');
  void aviso.offsetWidth; // reinicia a animação
  aviso.classList.add('visivel');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.classList.remove('visivel'), 3400);
}

// janelas (modal)

// fecha qualquer <dialog> ao clicar no fundo ou em [data-fechar-modal]
function configurarModais() {
  document.addEventListener('click', (evento) => {
    if (evento.target.closest('[data-fechar-modal]')) evento.target.closest('dialog').close();
    if (evento.target.tagName === 'DIALOG') evento.target.close();
  });
}

// painel de notificações

function configurarNotificacoes(dados, destinatarioId) {
  if (!dados.notificacoes[destinatarioId]) dados.notificacoes[destinatarioId] = [];
  const lista = () => dados.notificacoes[destinatarioId];

  const painel = document.createElement('div');
  painel.className = 'painel-notificacoes';
  painel.hidden = true;
  document.body.appendChild(painel);

  function atualizarContadores() {
    const naoLidas = lista().filter((n) => !n.lida).length;
    document.querySelectorAll('[data-contador-notificacoes]').forEach((contador) => {
      contador.textContent = naoLidas;
      contador.hidden = naoLidas === 0;
    });
  }

  function abrir() {
    painel.innerHTML = `
      <div class="notificacoes-topo">
        <strong>Notificações</strong>
        <button class="btn-fechar" data-fechar-notificacoes aria-label="Fechar">${icone('fechar')}</button>
      </div>
      <ul class="notificacoes-lista">
        ${lista().length === 0 ? '<li class="notificacao-vazia">Você está em dia. Nenhuma notificação.</li>' : ''}
        ${lista().slice(0, 20).map((n) => `
          <li>
            <a class="notificacao ${n.lida ? '' : 'nao-lida'}" href="${n.link || '#'}">
              <span class="notificacao-ponto"></span>
              <span><p>${escaparHtml(n.texto)}</p><small>${tempoRelativo(n.data)}</small></span>
            </a>
          </li>`).join('')}
      </ul>`;
    painel.hidden = false;
    lista().forEach((n) => { n.lida = true; });
    salvarDados(dados);
    atualizarContadores();
  }

  document.addEventListener('click', (evento) => {
    if (evento.target.closest('[data-abrir-notificacoes]')) {
      if (painel.hidden) abrir();
      else painel.hidden = true;
    } else if (!evento.target.closest('.painel-notificacoes') || evento.target.closest('[data-fechar-notificacoes], .notificacao')) {
      painel.hidden = true;
    }
  });
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') painel.hidden = true;
  });

  atualizarContadores();
  return { atualizarContadores };
}
