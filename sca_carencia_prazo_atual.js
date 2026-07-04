// ============================================================
//  SCA – Cálculo automático de Carência Atual e Prazo Atual
//  Arquivo: sca_carencia_prazo_atual.js
//  Carregue APÓS sca_core.js e sca_supabase.js
//
//  Fórmulas (definidas pelo usuário):
//  Carência Atual = meses entre HOJE e "Data 1ª parcela" (oat-parc1)
//  Prazo Atual    = meses entre HOJE e "Data parcela final" (oat-parc-final)
//
//  Os dois valores são limitados a um mínimo de 0 (se a data já
//  passou, o campo mostra 0 em vez de número negativo). O cálculo
//  é refeito a cada carregamento da página/operação, então
//  acompanha a passagem do tempo automaticamente.
// ============================================================

(function () {
  'use strict';

  // ─── Meses completos entre hoje e uma data-alvo (yyyy-mm-dd) ───
  // Retorna 0 se a data-alvo já passou (ou é igual a hoje).
  function mesesAte(dataAlvoStr) {
    if (!dataAlvoStr) return 0;
    const alvo = new Date(dataAlvoStr + 'T00:00:00');
    if (isNaN(alvo.getTime())) return 0;
    const hoje = new Date();

    let meses = (alvo.getFullYear() - hoje.getFullYear()) * 12 +
                (alvo.getMonth() - hoje.getMonth());

    // Se o dia da data-alvo ainda não foi alcançado dentro do mês,
    // o mês corrente não conta como completo.
    if (alvo.getDate() < hoje.getDate()) meses -= 1;

    return Math.max(0, meses);
  }

  function calcCarenciaPrazoAtual() {
    const parc1      = document.getElementById('oat-parc1')?.value || '';
    const parcFinal  = document.getElementById('oat-parc-final')?.value || '';

    const carenciaAtual = mesesAte(parc1);
    const prazoAtual     = mesesAte(parcFinal);

    const elC = document.getElementById('oat-carencia-atual');
    const elP = document.getElementById('oat-prazo-atual');
    if (elC) elC.value = carenciaAtual;
    if (elP) elP.value = prazoAtual;
  }

  // Exposta globalmente para poder ser chamada por outros módulos
  // (ex: antes de salvar) ou pelo console para depuração.
  window.calcCarenciaPrazoAtual = calcCarenciaPrazoAtual;

  // ─── Instala os listeners que disparam o recálculo ────────────
  function instalarListeners(tentativas) {
    const ids = ['oat-parc1', 'oat-parc-final'];
    const elementos = ids.map(id => document.getElementById(id));

    if (elementos.some(el => !el)) {
      if (tentativas > 0) setTimeout(() => instalarListeners(tentativas - 1), 400);
      else console.warn('[SCA Carência/Prazo Atual] ⚠️ campos não encontrados após várias tentativas.');
      return;
    }

    elementos.forEach(el => {
      el.addEventListener('input', calcCarenciaPrazoAtual);
      el.addEventListener('change', calcCarenciaPrazoAtual);
    });

    calcCarenciaPrazoAtual();
    console.log('[SCA Carência/Prazo Atual] ✅ listeners instalados e cálculo inicial executado.');
  }

  // ─── Recalcula sempre que uma operação é carregada do banco ───
  function interceptarCarregarOperacaoAtual(tentativas) {
    const fn = window.carregarOperacaoAtual;
    if (typeof fn !== 'function') {
      if (tentativas > 0) setTimeout(() => interceptarCarregarOperacaoAtual(tentativas - 1), 400);
      return;
    }
    if (fn.__scaCarenciaPatched) return;

    const wrapped = function () {
      fn.apply(this, arguments);
      // Aguarda o DOM ser preenchido pelos demais módulos antes de calcular
      setTimeout(calcCarenciaPrazoAtual, 100);
    };
    wrapped.__scaCarenciaPatched = true;
    window.carregarOperacaoAtual = wrapped;
  }

  // ─── Recalcula imediatamente antes de salvar (rede de segurança) ───
  function interceptarSalvarOperacaoAtual(tentativas) {
    const fn = window.salvarOperacaoAtual;
    if (typeof fn !== 'function') {
      if (tentativas > 0) setTimeout(() => interceptarSalvarOperacaoAtual(tentativas - 1), 400);
      return;
    }
    if (fn.__scaCarenciaPatched) return;

    const wrapped = function () {
      calcCarenciaPrazoAtual();
      return fn.apply(this, arguments);
    };
    wrapped.__scaCarenciaPatched = true;
    window.salvarOperacaoAtual = wrapped;
  }

  function inicializar() {
    instalarListeners(15);
    interceptarCarregarOperacaoAtual(20);
    interceptarSalvarOperacaoAtual(20);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
  } else {
    inicializar();
  }

})();
