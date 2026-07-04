// ============================================================
//  SCA – Autopreenchimento de Endereço (CEP) e Empresa (CNPJ)
//  Arquivo: sca_cep_cnpj_auto.js
//  Carregue APÓS o index.html e APÓS o sca_masks.js
//
//  O que faz:
//  ✅ Digitou o CEP e saiu do campo  → preenche logradouro, bairro,
//     cidade e UF automaticamente (fonte: ViaCEP).
//  ✅ Digitou o CNPJ e saiu do campo → preenche razão social, nome
//     fantasia, abertura, atividade, telefone e e-mail (fonte: BrasilAPI).
//
//  O que NÃO faz (de propósito, pra não duplicar o sca_masks.js):
//  ✗ Não valida dígito de CPF/CNPJ  → o sca_masks.js já faz isso.
//  ✗ Não aplica máscara de CNPJ     → o sca_masks.js já faz isso.
//  ✗ Não altera as funções de salvar.
//
//  Detalhes de segurança:
//  • Só preenche campos VAZIOS — nunca sobrescreve o que foi digitado.
//  • Usa delegação de evento no document, então não conflita com o
//    sca_masks.js (que troca os nós de CNPJ por clones).
//  • APIs públicas, gratuitas, com CORS liberado (rodam no navegador).
// ============================================================

(function () {
  'use strict';

  const LOG = '[SCA CEP/CNPJ]';

  /* ─────────────────────────── CONFIGURAÇÃO ─────────────────────────── */
  // Campo de CEP  →  campos de destino do endereço.
  const MAPA_CEP = {
    'end-cep': {
      logradouro: 'end-logradouro',
      bairro:     'end-bairro',
      cidade:     'end-cidade',
      uf:         'end-uf'
    },
    'prop-prop-cep': {
      logradouro: 'prop-prop-logr',
      bairro:     'prop-prop-bairro',
      cidade:     'prop-prop-cidade',
      uf:         'prop-prop-uf'
    }
  };

  // Campo de CNPJ  →  campos de destino dos dados da empresa.
  const MAPA_CNPJ = {
    'emp-cnpj': {
      razao_social:    'emp-razao',
      nome_fantasia:   'emp-fantasia',
      abertura:        'emp-abertura',
      atividade:       'emp-atividade',
      ddd:             'emp-ddd',
      telefone:        'emp-tel',
      email:           'emp-email'
    },
    'empresa-cnpj': {
      razao_social:    'empresa-razao',
      cidade:          'empresa-cidade'
    }
  };

  const CONFIG = {
    autoCEP:  true,
    autoCNPJ: true,
    mascaraCEP: true,      // aplica 00000-000 enquanto digita no campo de CEP
    soPreencherVazios: true
  };

  /* ─────────────────────────── UTILITÁRIOS ──────────────────────────── */
  const digitos = (s) => (s || '').replace(/\D/g, '');
  const $ = (id) => document.getElementById(id);

  function aviso(msg, tipo) {
    if (typeof window.toast === 'function') window.toast(msg, tipo || 'info');
    else console.log(LOG, msg);
  }

  // Preenche um campo só se ele existir e (conforme config) estiver vazio.
  function setCampo(id, valor) {
    if (!id || valor == null || valor === '') return;
    const el = $(id);
    if (!el) return;
    if (CONFIG.soPreencherVazios && el.value && el.value.trim() !== '') return;
    el.value = valor;
    // Dispara 'input' e 'change' para o resto do sistema reagir (selects, etc.)
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ──────────────────────────── CEP (ViaCEP) ─────────────────────────── */
  const _cepEmAndamento = {};

  async function buscarCEP(idCampo) {
    const campo = $(idCampo);
    if (!campo) return;
    const cep = digitos(campo.value);
    if (cep.length !== 8) return;
    if (_cepEmAndamento[idCampo] === cep) return; // evita busca repetida
    _cepEmAndamento[idCampo] = cep;

    const mapa = MAPA_CEP[idCampo];
    try {
      const r = await fetch('https://viacep.com.br/ws/' + cep + '/json/');
      const d = await r.json();
      if (d.erro) { aviso('CEP não encontrado.', 'warn'); return; }
      setCampo(mapa.logradouro, d.logradouro);
      setCampo(mapa.bairro,     d.bairro);
      setCampo(mapa.cidade,     d.localidade);
      setCampo(mapa.uf,         d.uf);
      aviso('Endereço preenchido pelo CEP.', 'ok');
      console.log(LOG, 'CEP', cep, '→', d.localidade + '/' + d.uf);
    } catch (e) {
      console.warn(LOG, 'Falha ViaCEP:', e.message || e);
      aviso('Não foi possível consultar o CEP agora.', 'warn');
    } finally {
      setTimeout(() => { delete _cepEmAndamento[idCampo]; }, 1500);
    }
  }

  function mascararCEP(campo) {
    let v = digitos(campo.value).substring(0, 8);
    if (v.length > 5) v = v.replace(/(\d{5})(\d{1,3})/, '$1-$2');
    campo.value = v;
  }

  /* ─────────────────────────── CNPJ (BrasilAPI) ──────────────────────── */
  const _cnpjEmAndamento = {};

  async function buscarCNPJ(idCampo) {
    const campo = $(idCampo);
    if (!campo) return;
    const cnpj = digitos(campo.value);
    if (cnpj.length !== 14) return;
    // Se o sca_masks.js expõe validarCNPJ, respeita a validação dele.
    if (typeof window.validarCNPJ === 'function' && !window.validarCNPJ(cnpj)) return;
    if (_cnpjEmAndamento[idCampo] === cnpj) return;
    _cnpjEmAndamento[idCampo] = cnpj;

    const mapa = MAPA_CNPJ[idCampo];
    try {
      const r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + cnpj);
      if (!r.ok) { aviso('CNPJ não encontrado na base pública.', 'warn'); return; }
      const d = await r.json();

      if (mapa.razao_social)  setCampo(mapa.razao_social,  d.razao_social);
      if (mapa.nome_fantasia) setCampo(mapa.nome_fantasia, d.nome_fantasia);
      if (mapa.atividade)     setCampo(mapa.atividade,     d.cnae_fiscal_descricao);
      if (mapa.cidade)        setCampo(mapa.cidade,        d.municipio);
      if (mapa.uf)            setCampo(mapa.uf,            d.uf);

      // Data de abertura: BrasilAPI devolve "AAAA-MM-DD" (ideal p/ input date)
      if (mapa.abertura && d.data_inicio_atividade) {
        setCampo(mapa.abertura, d.data_inicio_atividade);
      }

      // Telefone: "ddd_telefone_1" vem como dígitos colados (ex.: 1140048922)
      const tel = digitos(d.ddd_telefone_1);
      if (tel.length >= 10) {
        if (mapa.ddd)      setCampo(mapa.ddd, tel.substring(0, 2));
        if (mapa.telefone) setCampo(mapa.telefone, tel.substring(2));
      } else if (mapa.telefone && tel) {
        setCampo(mapa.telefone, tel);
      }

      if (mapa.email && d.email) setCampo(mapa.email, (d.email || '').toLowerCase());

      aviso('Dados da empresa preenchidos pelo CNPJ.', 'ok');
      console.log(LOG, 'CNPJ', cnpj, '→', d.razao_social);
    } catch (e) {
      console.warn(LOG, 'Falha BrasilAPI:', e.message || e);
      aviso('Não foi possível consultar o CNPJ agora.', 'warn');
    } finally {
      setTimeout(() => { delete _cnpjEmAndamento[idCampo]; }, 1500);
    }
  }

  /* ─────────────────── DELEGAÇÃO DE EVENTOS NO DOCUMENT ──────────────── */
  // focusout = blur que "borbulha", então um único listener cobre todos os
  // campos, mesmo os que aparecem depois (troca de página) ou que o
  // sca_masks.js recria como clones.
  document.addEventListener('focusout', function (e) {
    const id = e.target && e.target.id;
    if (!id) return;
    if (CONFIG.autoCEP  && MAPA_CEP[id])  buscarCEP(id);
    if (CONFIG.autoCNPJ && MAPA_CNPJ[id]) buscarCNPJ(id);
  });

  // Máscara leve de CEP durante a digitação (não interfere no CNPJ).
  if (CONFIG.mascaraCEP) {
    document.addEventListener('input', function (e) {
      const id = e.target && e.target.id;
      if (id && MAPA_CEP[id]) mascararCEP(e.target);
    });
  }

  /* ──────────────────────────── API GLOBAL ───────────────────────────── */
  window.scaAutoPreencher = {
    buscarCEP, buscarCNPJ,
    config: CONFIG, mapaCEP: MAPA_CEP, mapaCNPJ: MAPA_CNPJ
  };

  console.log(LOG, '✅ Autopreenchimento de CEP e CNPJ ativo.');
})();
