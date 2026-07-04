// ============================================================
//  SCA – Preenchimento de Cadastro com IA  (frontend)
//  Arquivo: sca_ia_preencher.js
//  Carregue APÓS o sca_pastas.js (usa window.R2_WORKER_URL e
//  window.scaLerArquivosDaPasta).
//
//  Dois jeitos de usar:
//   A) GERENCIADOR (principal): abra a pasta do cliente e clique
//      em "🤖 Preencher com IA". Ele lê os documentos JÁ salvos
//      na pasta (descriptografa), manda pra IA e abre a conferência.
//   B) UPLOAD avulso: botão 🤖 na página de Clientes, onde você
//      solta uma foto/PDF na hora.
//
//  Em ambos: tela de conferência → você revisa/edita → aplica.
//  O preenchimento manual continua funcionando normalmente.
// ============================================================

(function () {
  'use strict';
  const LOG = '[SCA IA]';

  const LABELS = {
    'cl-nome': 'Nome do cliente', 'cl-cpf': 'CPF',
    'end-logradouro': 'Logradouro', 'end-numero': 'Número',
    'end-bairro': 'Bairro', 'end-cidade': 'Cidade', 'end-uf': 'UF',
    'end-cep': 'CEP', 'end-email': 'E-mail',
    'prop-prop-nome': 'Nome da propriedade', 'prop-prop-cidade': 'Município (propriedade)',
    'prop-prop-uf': 'UF (propriedade)',
    'prop-ger-denom': 'Denominação do imóvel', 'prop-ger-municipio': 'Município do imóvel',
    'prop-ger-incra': 'Código INCRA', 'prop-ger-ccir-sncr': 'CCIR / SNCR',
    'prop-ger-nirf': 'NIRF / CIB', 'prop-ger-num-car': 'Nº do CAR',
    'prop-ger-matriculas': 'Matrícula', 'prop-ger-nome-cartorio': 'Cartório',
    'prop-area-total': 'Área total (ha)', 'prop-area-agri': 'Área agrícola (ha)',
    'prop-area-past': 'Área de pastagem (ha)',
    'prop-viz-norte': 'Confrontante Norte', 'prop-viz-sul': 'Confrontante Sul',
    'prop-viz-leste': 'Confrontante Leste', 'prop-viz-oeste': 'Confrontante Oeste',
    'banc-agencia-conta': 'Agência', 'banc-conta': 'Conta',
    'banc-porte': 'Porte / enquadramento'
  };

  const $ = (id) => document.getElementById(id);
  function aviso(msg, tipo) {
    if (typeof window.toast === 'function') window.toast(msg, tipo || 'info');
    else console.log(LOG, msg);
  }
  function workerURL() {
    const base = (window.R2_WORKER_URL || '').replace(/\/$/, '');
    return base ? base + '/extrair' : null;
  }

  // ─── Converte arquivo/blob em base64 (imagem é reduzida p/ baratear) ──
  function paraBase64(blob) {
    return new Promise((resolve, reject) => {
      const tipo = blob.type || '';
      if (!tipo.startsWith('image/')) {
        const r = new FileReader();
        r.onload = () => resolve({ base64: String(r.result).split(',')[1], media_type: tipo || 'application/pdf' });
        r.onerror = reject;
        r.readAsDataURL(blob);
        return;
      }
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const max = 1568;
        let { width: w, height: h } = img;
        if (w > max || h > max) { const s = max / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve({ base64: c.toDataURL('image/jpeg', 0.85).split(',')[1], media_type: 'image/jpeg' });
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function extrairUm(blob, nome) {
    const url = workerURL();
    if (!url) { aviso('Configure o R2_WORKER_URL primeiro.', 'err'); return {}; }
    const { base64, media_type } = await paraBase64(blob);
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ arquivo_base64: base64, media_type, nome: nome || 'documento' })
    });
    const data = await resp.json();
    if (!data.ok) { console.warn(LOG, 'Erro:', data); aviso('Não consegui ler ' + (nome || 'o documento'), 'warn'); return {}; }
    return data.campos || {};
  }

  // lista = [{ blob, name }]
  async function processar(lista) {
    garantirModal();
    $('ia-modal-corpo').innerHTML = '';
    $('ia-modal').classList.add('aberto');
    if (!lista || !lista.length) { setStatus('Nenhum documento encontrado nesta pasta.'); return; }

    const acumulado = {};
    for (let i = 0; i < lista.length; i++) {
      setStatus(`Lendo documento ${i + 1} de ${lista.length} com IA...`);
      try {
        const campos = await extrairUm(lista[i].blob, lista[i].name);
        for (const [k, v] of Object.entries(campos)) if (v && !acumulado[k]) acumulado[k] = v;
      } catch (e) { console.warn(LOG, 'Erro doc', lista[i].name, e); }
    }
    if (!Object.keys(acumulado).length) { setStatus('A IA não reconheceu dados nos documentos.'); return; }
    setStatus('');
    mostrarConferencia(acumulado);
  }

  // ─── Fluxo A: ler da pasta aberta no Gerenciador ────────────
  window.preencherIAdaPasta = async function () {
    if (typeof window.scaLerArquivosDaPasta !== 'function') {
      aviso('Função de leitura da pasta não encontrada (atualize o sca_pastas.js).', 'err');
      return;
    }
    garantirModal();
    $('ia-modal-corpo').innerHTML = '';
    $('ia-modal').classList.add('aberto');
    setStatus('🔓 Descriptografando documentos da pasta...');
    let arquivos = [];
    try { arquivos = await window.scaLerArquivosDaPasta(); }
    catch (e) { setStatus('Erro ao ler a pasta: ' + (e.message || e)); return; }
    await processar(arquivos.map(a => ({ blob: a.blob, name: a.name })));
  };

  // ─── Fluxo B: upload avulso (página Clientes) ───────────────
  window.abrirPreenchimentoIA = function () {
    garantirModal();
    $('ia-modal-corpo').innerHTML = `
      <div id="ia-drop">📎 Toque para escolher ou arraste os documentos<br>
        <span style="font-size:.74rem;color:#888;">CPF, comprovante, CCIR, matrícula, CAR, extrato...</span></div>
      <input type="file" id="ia-file-input" accept="image/*,application/pdf" multiple style="display:none" />`;
    setStatus('');
    const drop = $('ia-drop'), input = $('ia-file-input');
    drop.onclick = () => input.click();
    input.onchange = () => { if (input.files.length) processar([...input.files].map(f => ({ blob: f, name: f.name }))); };
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('hover'); };
    drop.ondragleave = () => drop.classList.remove('hover');
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('hover');
      const fs = [...(e.dataTransfer?.files || [])]; if (fs.length) processar(fs.map(f => ({ blob: f, name: f.name }))); };
    $('ia-modal').classList.add('aberto');
  };

  // ─── TELA DE CONFERÊNCIA ────────────────────────────────────
  function mostrarConferencia(campos) {
    const linhas = Object.entries(campos).map(([id, valor]) => {
      const label = LABELS[id] || id;
      const existe = !!$(id);
      const jaTem = existe && $(id).value && $(id).value.trim() !== '';
      return `<div class="ia-linha" data-id="${id}">
        <input type="checkbox" class="ia-chk" ${existe ? 'checked' : 'disabled'} />
        <div class="ia-campo">
          <label>${label}${jaTem ? ' <span style="color:#c0392b;font-size:.66rem">(já preenchido)</span>' : ''}${!existe ? ' <span style="color:#999;font-size:.66rem">(campo não encontrado)</span>' : ''}</label>
          <input type="text" class="ia-valor" value="${String(valor).replace(/"/g, '&quot;')}" />
        </div></div>`;
    }).join('');
    $('ia-modal-corpo').innerHTML = `
      <p style="font-size:.84rem;color:#555;margin-bottom:10px;">Revise os dados lidos pela IA. Edite o que precisar e desmarque o que não quiser aplicar.</p>
      ${linhas}
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button id="ia-aplicar" class="ia-btn-verde">✅ Aplicar selecionados</button>
        <button id="ia-cancelar2" class="ia-btn-cinza">Cancelar</button>
      </div>`;
    $('ia-aplicar').onclick = aplicarCampos;
    $('ia-cancelar2').onclick = fecharModal;
  }

  function aplicarCampos() {
    let n = 0;
    document.querySelectorAll('#ia-modal-corpo .ia-linha').forEach((linha) => {
      const chk = linha.querySelector('.ia-chk');
      if (!chk.checked || chk.disabled) return;
      const el = $(linha.dataset.id);
      const valor = linha.querySelector('.ia-valor').value;
      if (el && valor) {
        el.value = valor;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        n++;
      }
    });
    fecharModal();
    aviso(n + ' campo(s) preenchido(s) pela IA. Confira e salve.', 'ok');
  }

  // ─── MODAL ──────────────────────────────────────────────────
  function setStatus(msg) {
    const s = $('ia-modal-status');
    if (s) { s.textContent = msg || ''; s.style.display = msg ? 'block' : 'none'; }
  }
  function fecharModal() { const m = $('ia-modal'); if (m) m.classList.remove('aberto'); }

  function garantirModal() {
    if ($('ia-modal')) return;
    const css = `
      #ia-modal{display:none;position:fixed;inset:0;z-index:9995;background:rgba(0,0,0,.55);
        align-items:center;justify-content:center;padding:16px}
      #ia-modal.aberto{display:flex}
      #ia-modal-card{background:#e8edda;border:1px solid #b8c9a8;border-radius:14px;width:520px;
        max-width:96vw;max-height:88vh;overflow-y:auto;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.3)}
      #ia-modal h3{font-family:'Rajdhani',sans-serif;color:#1a5c38;font-size:1.15rem;margin:0 0 8px}
      #ia-drop{border:2px dashed #1a5c38;border-radius:10px;padding:26px;text-align:center;
        background:#f0f7f3;cursor:pointer;color:#1a5c38;font-size:.9rem}
      #ia-drop.hover{background:#dff0e6}
      #ia-modal-status{display:none;margin-top:12px;font-size:.86rem;color:#1a5c38;font-weight:700}
      .ia-linha{display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid #d4dcc5}
      .ia-chk{margin-top:20px;width:18px;height:18px;flex-shrink:0}
      .ia-campo{flex:1}
      .ia-campo label{display:block;font-size:.72rem;color:#555;font-weight:700;margin-bottom:2px}
      .ia-valor{width:100%;border:1px solid #b8c9a8;border-radius:6px;padding:6px 9px;font-size:.86rem;background:#fff}
      .ia-btn-verde{background:#1a5c38;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-weight:700;cursor:pointer}
      .ia-btn-cinza{background:#7f8c8d;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-weight:700;cursor:pointer}`;
    const style = document.createElement('style');
    style.textContent = css; document.head.appendChild(style);
    const modal = document.createElement('div');
    modal.id = 'ia-modal';
    modal.innerHTML = `<div id="ia-modal-card">
      <h3>🤖 Preencher cadastro com IA</h3>
      <div id="ia-modal-status"></div>
      <div id="ia-modal-corpo"></div></div>`;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) fecharModal(); };
  }

  // ─── Injeta os botões (Clientes e Gerenciador) ──────────────
  function injetarBotoes() {
    // Botão no Gerenciador (barra da pasta)
    const toolbar = $('pasta-toolbar');
    if (toolbar && !$('btn-ia-pasta')) {
      const b = document.createElement('button');
      b.id = 'btn-ia-pasta';
      b.className = 'pt-btn';
      b.style.cssText = 'background:#6c3483;color:#fff';
      b.innerHTML = '🤖 Preencher com IA';
      b.onclick = window.preencherIAdaPasta;
      const addBtn = toolbar.querySelector('#pasta-upload-input');
      if (addBtn) toolbar.insertBefore(b, addBtn.nextSibling);
      else toolbar.appendChild(b);
    }
    // Botão na página de Clientes (upload avulso)
    const alvo = document.querySelector('#page-clientes .action-btn.btn-save');
    if (alvo && !$('btn-ia-cliente')) {
      const btn = document.createElement('button');
      btn.id = 'btn-ia-cliente';
      btn.className = 'action-btn';
      btn.title = 'Preencher com IA';
      btn.textContent = '🤖';
      btn.style.cssText = 'background:#6c3483;color:#fff';
      btn.onclick = window.abrirPreenchimentoIA;
      alvo.parentNode.insertBefore(btn, alvo.nextSibling);
    }
  }

  function iniciar() {
    injetarBotoes();
    new MutationObserver(injetarBotoes).observe(document.body, { childList: true, subtree: true });
    console.log(LOG, '✅ Preenchimento com IA pronto (Gerenciador + Clientes).');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
