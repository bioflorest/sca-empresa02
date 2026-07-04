// ============================================================
//  SCA – Reset completo ao criar novo cliente
//  Arquivo: sca_novo_cliente_reset.js
//  Carregue APÓS o sca_core.js (sobrescreve novoCliente).
//
//  O que faz:
//  Quando o usuário clica em "+" (Novo Cliente), limpa todas as
//  seções sem pedir confirmação:
//   ✅ Clientes (campos principais)
//   ✅ Dados Pessoais / Endereço / Bancário
//   ✅ Participantes (Cônjuge, Avalista, Empresa, Arrendante)
//   ✅ Propriedades
//   ✅ Prod. Agrícola (todos os itens de todas as abas)
//   ✅ Prod. Pecuária
//   ✅ SAF – Agrofloresta
// ============================================================

(function () {
  'use strict';

  function limparTudo() {

    // ── 1. Participantes ──────────────────────────────────────
    const PART_IDS = {
      conjugue:   ['conj-cpf','conj-nome','conj-nasc','conj-tipo-id','conj-di','conj-emissao','conj-orgao','conj-uf-orgao','conj-sexo','conj-escolaridade','conj-profissao','conj-pai','conj-mae','conj-ddd','conj-cel','conj-email'],
      avalista:   ['aval-cpf','aval-nome','aval-nasc','aval-tipo-id','aval-di','aval-emissao','aval-orgao','aval-uf-orgao','aval-sexo','aval-estado-civil','aval-profissao','aval-pai','aval-mae','aval-ddd','aval-cel','aval-email'],
      empresa:    ['emp-cnpj','emp-razao','emp-fantasia','emp-abertura','emp-atividade','emp-responsavel','emp-cargo','emp-ddd','emp-tel','emp-email'],
      arrendante: ['arr-cpf','arr-nome','arr-tipo-id','arr-di','arr-emissao','arr-orgao','arr-logradouro','arr-bairro','arr-uf','arr-cidade','arr-tel','arr-email']
    };
    Object.values(PART_IDS).flat().forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.tagName === 'SELECT' ? el.selectedIndex = 0 : el.value = '';
    });

    // ── 2. Propriedades (todos os inputs/selects com id prop-*) ──
    document.querySelectorAll('[id^="prop-"]').forEach(el => {
      if (el.tagName === 'INPUT')  el.value = '';
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      if (el.tagName === 'TEXTAREA') el.value = '';
    });
    // Recalcula totais de área e benfeitorias (funções no sca_core)
    if (typeof calcAreas === 'function')       try { calcAreas(); } catch(e) {}
    if (typeof calcBenfeitorias === 'function') try { calcBenfeitorias(); } catch(e) {}

    // ── 3. Prod. Agrícola (esvazia as listas de itens e reinicia) ──
    ['temp','perm','outras','extr','agro','renda'].forEach(key => {
      const lista = document.getElementById('agr-' + key + '-lista');
      if (lista) {
        lista.innerHTML = '';
        // Adiciona um item vazio inicial se a função existir
        if (typeof agrAdicionarItem === 'function') try { agrAdicionarItem(key); } catch(e) {}
      }
    });
    if (typeof atualizarTotalAgricola === 'function') try { atualizarTotalAgricola(); } catch(e) {}

    // ── 4. Prod. Pecuária ─────────────────────────────────────
    const PEC_IDS = {
      bov:  ['pec-bov-raca','pec-bov-cabecas','pec-bov-peso','pec-bov-finalidade','pec-bov-preco','pec-bov-vendidas','pec-bov-receita','pec-bov-rebanho'],
      leite:['pec-leite-vacas','pec-leite-prod-dia','pec-leite-dias','pec-leite-total','pec-leite-preco','pec-leite-receita'],
      equ:  ['pec-equ-raca','pec-equ-cabecas','pec-equ-finalidade','pec-equ-preco','pec-equ-vendidas','pec-equ-receita'],
      cap:  ['pec-cap-raca','pec-cap-cabecas','pec-cap-finalidade','pec-cap-preco','pec-cap-vendidas','pec-cap-receita'],
      lcap: ['pec-lcap-cabras','pec-lcap-prod-dia','pec-lcap-dias','pec-lcap-total','pec-lcap-preco','pec-lcap-receita'],
      ovi:  ['pec-ovi-raca','pec-ovi-cabecas','pec-ovi-finalidade','pec-ovi-preco','pec-ovi-vendidas','pec-ovi-receita'],
      sui:  ['pec-sui-raca','pec-sui-cabecas','pec-sui-peso','pec-sui-preco','pec-sui-vendidas','pec-sui-receita'],
      aves: ['pec-aves-especie','pec-aves-qtd','pec-aves-ovos','pec-aves-preco','pec-aves-vendidas','pec-aves-receita'],
      out:  ['pec-out-desc','pec-out-qtd','pec-out-unidade','pec-out-preco','pec-out-vendidas','pec-out-receita']
    };
    Object.values(PEC_IDS).flat().forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.tagName === 'SELECT' ? el.selectedIndex = 0 : el.value = '';
    });
    if (typeof atualizarTotalPec === 'function') try { atualizarTotalPec(); } catch(e) {}

    // ── 5. SAF – Agrofloresta ─────────────────────────────────
    document.querySelectorAll('[id^="saf-"]').forEach(el => {
      if (el.tagName === 'INPUT')    el.value = '';
      if (el.tagName === 'SELECT')   el.selectedIndex = 0;
      if (el.tagName === 'TEXTAREA') el.value = '';
    });

    // ── 6. Dados pessoais / endereço / bancário / campos cl-* ──
    // (os cl-codigo, cl-cpf, cl-nome, cl-data são tratados pelo
    //  limparCamposCliente original; limpa o restante)
    const extras = [
      // dados pessoais
      'cl-sexo','cl-nasc','cl-escolaridade','cl-profissao','cl-estado-civil',
      'cl-regime-casamento','cl-uf-nasc','cl-naturalidade','cl-apelido',
      'cl-tipo-id','cl-di','cl-emissao','cl-orgao','cl-uf-orgao','cl-pai','cl-mae',
      // endereço
      'end-logradouro','end-numero','end-bairro','end-cidade','end-uf','end-cep',
      'end-ddd','end-cel','end-cel2','end-email','end-zona',
      // bancário
      'banc-banco-nome','banc-agencia-conta','banc-conta','banc-porte',
      'banc-linha-credito','banc-finalidade','banc-renda-bruta',
      'banc-dap-numero','banc-dap-validade'
    ];
    extras.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.tagName === 'SELECT' ? el.selectedIndex = 0 : el.value = '';
    });
  }

  // ── Sobrescreve novoCliente após o DOM carregar ─────────────
  function instalar() {
    const _original = window.novoCliente;
    if (typeof _original !== 'function') {
      // Tenta de novo em 500ms (script ainda carregando)
      setTimeout(instalar, 500);
      return;
    }
    window.novoCliente = function () {
      limparTudo();          // limpa todas as abas SEM confirm
      _original.call(this);  // executa o original (código, foco, Supabase etc.)
    };
    console.log('[SCA Reset] ✅ Novo cliente com reset completo ativo.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', instalar);
  else instalar();
})();
