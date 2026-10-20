// TODO: virar login de verdade quando tiver back-end

const dados = carregarDados();
salvarDados(dados);

function cartaoDeConta({ perfil, id, nome, detalhe, extra, classeAvatar }) {
  return `
    <button class="conta" data-perfil="${perfil}" data-id="${id}">
      <span class="avatar-pequeno ${classeAvatar}">${iniciais(nome)}</span>
      <span class="conta-textos">
        <strong>${nome}</strong>
        <span>${detalhe}</span>
      </span>
      ${extra}
      ${icone('seta', 'conta-seta')}
    </button>`;
}

document.getElementById('contaGestor').innerHTML = cartaoDeConta({
  perfil: 'gestor', id: ID_GESTOR, nome: dados.gestor.nome, detalhe: dados.gestor.cargo,
  extra: '<span class="selo selo-gestor">Painel do gestor</span>', classeAvatar: 'cor-gestor',
});

document.getElementById('contasColaboradores').innerHTML = dados.colaboradores.map((pessoa, indice) => {
  const situacao = situacaoNaJornada(dados, pessoa);
  const selo = situacao.concluido
    ? '<span class="selo selo-sucesso">Programa concluído</span>'
    : `<span class="selo selo-neutro">Dia ${situacao.dia} · ${situacao.fase.nome}</span>`;
  return cartaoDeConta({ perfil: 'colaborador', id: pessoa.id, nome: pessoa.nome, detalhe: pessoa.cargo, extra: selo, classeAvatar: `cor-${indice % 6}` });
}).join('');

renderizarIcones();

document.addEventListener('click', (evento) => {
  const conta = evento.target.closest('.conta');
  if (!conta) return;
  iniciarSessao(conta.dataset.perfil, conta.dataset.id);
  location.href = conta.dataset.perfil === 'gestor' ? 'gestor.html' : 'colaborador.html';
});
