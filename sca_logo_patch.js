/**
 * SCA – Logo Patch v2.0
 * ─────────────────────────────────────────────────────────────────────────────
 * PROBLEMA:
 *   O docxtemplater-image-module-free falha silenciosamente em cabeçalhos
 *   (header1.xml), causando o erro "XMLSerializer: parameter 1 is not of
 *   type 'Node'" internamente. A tag <<logotipo>> no cabeçalho nunca é
 *   processada como imagem.
 *
 * SOLUÇÃO:
 *   Em vez de usar o image module, substituímos o arquivo
 *   word/media/image2.png diretamente no ZIP do template antes de
 *   qualquer renderização. O cabeçalho já aponta para image2.png via
 *   rId1 (confirmado em word/_rels/header1.xml.rels), então a logo
 *   aparece automaticamente sem nenhuma tag de template.
 *
 * COMO USAR:
 *   Adicione esta linha no index.html LOGO APÓS <script src="sca_core.js">:
 *     <script src="sca_logo_patch.js"></script>
 *
 * FUNCIONAMENTO:
 *   1. Aguarda o sca_core.js definir gerarDocDOCX e gerarTodosDOCX
 *   2. Envolve a função original com um wrapper que:
 *      a) Busca a logo da empresa em window._scaCache.empresa_logo_url
 *      b) Converte para Uint8Array via fetch
 *      c) Injeta em word/media/image2.png no ZIP antes do render
 *      d) Remove qualquer ImageModule para evitar conflito com cabeçalhos
 *   3. Se não houver logo ou fetch falhar, executa o fluxo original
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // ── Arquivos de imagem no ZIP que serão substituídos pela logo ──────────────
  // Baseado em: unzip -l → word/media/image2.png  (21.205 bytes)
  // e word/_rels/header1.xml.rels → rId1 aponta para media/image2.png
  const IMAGEM_NO_ZIP = 'word/media/image2.png';

  // ── Converte URL de imagem para Uint8Array ───────────────────────────────────
  async function urlParaUint8Array(url) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const buf = await resp.arrayBuffer();
      return new Uint8Array(buf);
    } catch (e) {
      console.warn('[SCA Logo Patch] fetch da logo falhou:', e.message);
      return null;
    }
  }

  // ── Inicia o patch: aguarda gerarDocDOCX estar disponível ───────────────────
  function aplicarPatch() {
    if (typeof window.gerarDocDOCX !== 'function') return false;

    const _original = window.gerarDocDOCX;

    window.gerarDocDOCX = async function (nomeTemplate, btnEl) {
      const logoUrl = window._scaCache && window._scaCache.empresa_logo_url;

      // Sem logo cadastrada → executa fluxo original sem modificar nada
      if (!logoUrl) {
        console.info('[SCA Logo Patch] Sem logo cadastrada, usando fluxo original.');
        return _original.apply(this, arguments);
      }

      console.info('[SCA Logo Patch] Logo encontrada:', logoUrl);

      // Busca os bytes da logo
      const logoBytes = await urlParaUint8Array(logoUrl);
      if (!logoBytes) {
        console.warn('[SCA Logo Patch] Não foi possível carregar logo, usando fluxo original.');
        return _original.apply(this, arguments);
      }

      console.info('[SCA Logo Patch] Logo OK (' + logoBytes.length + ' bytes). Injetando no ZIP...');

      // ── Intercepta PizZip para injetar a logo antes do render ─────────────
      const _PizZip = window.PizZip;

      window.PizZip = function (data, opts) {
        const zip = new _PizZip(data, opts);

        // Só injeta se o arquivo existir no ZIP
        if (zip.files[IMAGEM_NO_ZIP]) {
          zip.file(IMAGEM_NO_ZIP, logoBytes);
          console.info('[SCA Logo Patch] ✅ Logo injetada em', IMAGEM_NO_ZIP);
        } else {
          console.warn('[SCA Logo Patch] ⚠️ Arquivo', IMAGEM_NO_ZIP, 'não encontrado no ZIP. Verificar template.');
        }

        return zip;
      };

      // Copia propriedades estáticas (loadAsync, etc.)
      Object.assign(window.PizZip, _PizZip);

      try {
        // ── Desativa o ImageModule temporariamente para evitar conflito ───────
        // O erro "XMLSerializer: parameter 1 is not of type 'Node'" ocorre
        // quando o image module tenta processar cabeçalhos. Como já injetamos
        // a logo diretamente no ZIP, o module não é mais necessário.
        const _ImageModule = window.ImageModule;
        window.ImageModule = undefined;

        const resultado = await _original.apply(this, arguments);

        // Restaura
        window.ImageModule = _ImageModule;
        return resultado;

      } finally {
        // Restaura PizZip em qualquer caso (erro ou sucesso)
        window.PizZip = _PizZip;
      }
    };

    console.info('[SCA Logo Patch] ✅ gerarDocDOCX interceptada com sucesso.');
    return true;
  }

  // ── Aguarda até 5 s para sca_core.js definir gerarDocDOCX ──────────────────
  let tentativas = 0;
  const intervalo = setInterval(function () {
    tentativas++;
    if (aplicarPatch()) {
      clearInterval(intervalo);
    } else if (tentativas >= 50) {
      clearInterval(intervalo);
      console.error('[SCA Logo Patch] ❌ gerarDocDOCX não encontrada após 5 s. Patch não aplicado.');
    }
  }, 100);

})();
