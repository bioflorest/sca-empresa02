/**
 * SCA – Raças/Espécies da Produção Pecuária v1.1
 * ─────────────────────────────────────────────────────────────────────────────
 * PROBLEMA:
 *   Os campos "RAÇA / TIPO" (Bovino, Equino, Caprino, Ovino, Suíno) e
 *   "ESPÉCIE" (Aves) eram inputs de texto livre, sem padronização.
 *
 * SOLUÇÃO:
 *   Este patch transforma esses campos em menus suspensos (<select>) com
 *   listas de raças/espécies pré-definidas, fechadas (sem opção "Outros" —
 *   quem precisar de um valor fora da lista usa a aba "Outros" já existente
 *   na Produção Pecuária).
 *
 *   O HTML (index.html) já contém, para cada campo:
 *     - um <select id="pec-{key}-{field}-select"> com as opções
 *     - um <input type="hidden" id="pec-{key}-{field}"> que guarda o valor
 *       final (é esse campo que o sca_core.js e o sca_supabase.js leem/gravam
 *       — por isso o id não muda, e nada mais no projeto precisa ser tocado)
 *
 *   Este arquivo NÃO modifica o sca_core.js. Ele apenas:
 *     1. Define as funções globais chamadas pelo onchange do HTML
 *        (pecRacaChange, pecRacaSync)
 *     2. Aguarda o sca_core.js definir carregarPecuaria/limparPecuaria e
 *        envolve essas duas funções (igual ao padrão do sca_logo_patch.js)
 *        para manter o select sincronizado quando um cliente é carregado
 *        ou quando o usuário clica em "Limpar"
 *
 * COMO USAR:
 *   Adicione esta linha no index.html LOGO APÓS <script src="sca_core.js">:
 *     <script src="sca_pec_racas.js"></script>
 *
 * PARA ADICIONAR/EDITAR UMA LISTA DE RAÇAS:
 *   Não mexa neste arquivo — as opções ficam direto no <select> do
 *   index.html (basta editar/adicionar <option> ali). Este arquivo só cuida
 *   do comportamento (sincronizar o valor do select com o campo oculto).
 *
 * PARA ADICIONAR UMA NOVA ABA COM ESSE COMPORTAMENTO (ex.: futuramente):
 *   1. No index.html, monte o <select id="pec-{key}-{field}-select"> e
 *      o <input type="hidden" id="pec-{key}-{field}">, seguindo o mesmo
 *      padrão dos campos já existentes.
 *   2. Adicione uma linha em PEC_RACA_FIELDS abaixo, ex.: { ..., nova:'raca' }
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // ── Mapa: chave da espécie pecuária → nome do campo (raça ou espécie) ──────
  const PEC_RACA_FIELDS = { bov: 'raca', equ: 'raca', cap: 'raca', ovi: 'raca', sui: 'raca', aves: 'especie' };

  // ── Usuário troca a opção do <select> ───────────────────────────────────────
  function pecRacaChange(key, field) {
    field = field || 'raca';
    const sel = document.getElementById('pec-' + key + '-' + field + '-select');
    const hidden = document.getElementById('pec-' + key + '-' + field);
    if (!sel || !hidden) return;
    hidden.value = sel.value;
  }

  // ── Sincroniza o select a partir do valor salvo no hidden ──────────────────
  //    (usado ao carregar um cliente já salvo e ao limpar o formulário)
  function pecRacaSync(key, field) {
    field = field || 'raca';
    const hidden = document.getElementById('pec-' + key + '-' + field);
    const sel = document.getElementById('pec-' + key + '-' + field + '-select');
    if (!hidden || !sel) return;
    const val = hidden.value || '';
    const opt = Array.from(sel.options).find(o => o.value === val && val !== '');
    sel.value = opt ? val : '';
  }

  // Expõe globalmente — são chamadas pelo onchange inline no HTML
  window.pecRacaChange = pecRacaChange;
  window.pecRacaSync = pecRacaSync;

  // ── Envolve carregarPecuaria/limparPecuaria do sca_core.js, sem editá-lo ───
  function aplicarPatch() {
    if (typeof window.carregarPecuaria !== 'function' || typeof window.limparPecuaria !== 'function') return false;

    const _carregarOriginal = window.carregarPecuaria;
    window.carregarPecuaria = function (i) {
      const resultado = _carregarOriginal.apply(this, arguments);
      Object.entries(PEC_RACA_FIELDS).forEach(([key, field]) => pecRacaSync(key, field));
      return resultado;
    };

    const _limparOriginal = window.limparPecuaria;
    window.limparPecuaria = function (key) {
      const resultado = _limparOriginal.apply(this, arguments);

      // Sincroniza o select visual de raça/espécie (já zerado pelo limpar original)
      if (PEC_RACA_FIELDS[key]) pecRacaSync(key, PEC_RACA_FIELDS[key]);

      // Recalcula a receita bruta da aba e atualiza o total geral.
      // O limpar original zera os campos mas não dispara os cálculos,
      // então a receita ficava com o valor anterior na tela.
      if (typeof window.calcPec === 'function' && ['bov','leite','lcap'].includes(key)) {
        window.calcPec(key);
      } else if (typeof window.calcPecSimples === 'function') {
        window.calcPecSimples(key);
      }
      if (typeof window.atualizarTotalPec === 'function') {
        window.atualizarTotalPec();
      }

      return resultado;
    };

    console.info('[SCA Raças Pecuária] ✅ carregarPecuaria/limparPecuaria interceptadas com sucesso.');
    return true;
  }

  // ── Aguarda até 5 s para sca_core.js definir as funções ─────────────────────
  let tentativas = 0;
  const intervalo = setInterval(function () {
    tentativas++;
    if (aplicarPatch()) {
      clearInterval(intervalo);
    } else if (tentativas >= 50) {
      clearInterval(intervalo);
      console.error('[SCA Raças Pecuária] ❌ carregarPecuaria/limparPecuaria não encontradas após 5 s. Patch não aplicado.');
    }
  }, 100);

})();
