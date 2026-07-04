/**
 * SCA – Culturas/Produtos da Produção Agrícola v1.1
 * ─────────────────────────────────────────────────────────────────────────────
 * PROBLEMA:
 *   Os campos "CULTURA" (Temporária, Permanente), "PRODUTO" (Extrativismo,
 *   Agroindústria) e "DESCRIÇÃO DA RENDA" (Renda Fora) eram inputs de texto
 *   livre, sem padronização.
 *
 * SOLUÇÃO:
 *   Este patch transforma esses campos em menus suspensos (<select>) com
 *   listas pré-definidas (algumas agrupadas em optgroup), fechadas — sem
 *   opção "Outros". Quem precisar de um valor fora da lista usa a aba
 *   "Outras Culturas" (Produção Agrícola), que já é texto livre.
 *
 *   Diferente do sca_pec_racas.js (que atua sobre <select> já existentes no
 *   HTML estático), aqui os itens de Produção Agrícola são gerados 100% via
 *   JavaScript (agrGerarItem, dentro do sca_core.js), então este patch:
 *     1. Aguarda o sca_core.js definir agrAdicionarItem/carregarAgricola/
 *        agrGerarItem (igual ao padrão do sca_logo_patch.js)
 *     2. Envolve agrAdicionarItem e carregarAgricola: depois que o item é
 *        inserido no DOM, localiza o input de texto livre do campo-alvo
 *        (cultura/produto/desc) DENTRO daquele item específico e o
 *        substitui por um <select>, preservando o mesmo data-field (para
 *        o restante do sca_core.js continuar lendo/gravando o valor sem
 *        nenhuma alteração).
 *
 *   Este arquivo NÃO modifica o sca_core.js.
 *
 * COMO USAR:
 *   Adicione esta linha no index.html LOGO APÓS <script src="sca_core.js">
 *   (pode ficar ao lado do sca_pec_racas.js):
 *     <script src="sca_agr_culturas.js"></script>
 *
 * PARA ADICIONAR/EDITAR UMA LISTA:
 *   Edite os arrays/objetos AGR_LISTAS abaixo. Cada entrada pode ser:
 *     - um array simples de strings (lista única, sem agrupamento)
 *     - um objeto { "Nome do Grupo": [...], ... } (gera <optgroup>)
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // ── Mapa: aba agrícola (key) → campo de texto livre que vira select ───────
  // key   = mesma chave usada em agrAdicionarItem/agr-<key>-lista
  // field = mesmo data-field usado em agrGerarItem (sca_core.js)
  const AGR_CAMPO_ALVO = {
    temp:  'cultura',
    perm:  'cultura',
    extr:  'produto',
    agro:  'produto',
    renda: 'desc'
  };

  // ── Listas de opções por aba ───────────────────────────────────────────────
  const AGR_LISTAS = {

    // ── Cultura Temporária ───────────────────────────────────────────────
    temp: [
      'Abacaxi','Abóbora','Abobrinha','Alface','Alho','Amendoim','Arroz','Aveia',
      'Batata-doce','Batata-inglesa','Beterraba','Cebola','Cenoura','Cevada',
      'Coentro','Couve','Ervilha','Feijão','Fumo (tabaco)','Gergelim','Girassol',
      'Jiló','Mamona','Mandioca','Melancia','Melão','Milheto','Milho','Pepino',
      'Pimenta','Pimentão','Quiabo','Rabanete','Soja','Sorgo','Tomate','Trigo',
      'Triticale','Cana-de-açúcar','Algodão','Inhame','Cará','Maxixe','Repolho',
      'Brócolis','Couve-flor','Rúcula','Espinafre'
    ],

    // ── Cultura Permanente ───────────────────────────────────────────────
    perm: [
      'Abacate','Acerola','Açaí','Banana','Borracha (seringueira)','Cacau','Café',
      'Caju','Caqui','Coco-da-baía','Cupuaçu','Figo','Goiaba','Graviola','Guaraná',
      'Jabuticaba','Jaca','Kiwi','Laranja','Limão','Maçã','Mamão','Manga',
      'Maracujá','Nectarina','Noz-pecã','Oliveira (azeitona)','Palmito pupunha',
      'Pêra','Pêssego','Pimenta-do-reino','Tangerina','Uva','Umbu','Pitaya',
      'Seriguela','Atemoia','Fruta-do-conde','Araçá','Baru','Castanha-do-brasil',
      'Dendê','Erva-mate','Macadâmia'
    ],

    // ── Extrativismo (com subcategorias) ─────────────────────────────────
    extr: {
      'Extrativismo Vegetal': [
        'Açaí nativo','Castanha-do-brasil (castanha-do-pará)','Babaçu','Carnaúba',
        'Látex (borracha natural)','Piaçava','Buriti','Pequi','Baru','Jaborandi',
        'Andiroba','Copaíba (óleo)','Cumaru','Bacaba','Tucumã','Caju nativo',
        'Mangaba','Umbu','Licuri','Pinhão','Erva-mate nativa','Palmito',
        'Madeira em tora','Lenha','Carvão vegetal','Resinas vegetais',
        'Fibras vegetais','Óleos vegetais naturais'
      ],
      'Extrativismo Animal': [
        'Peixes','Camarão','Caranguejo','Siri','Mariscos','Ostras','Mexilhões',
        'Lagosta','Pirarucu','Tambaqui','Acará','Mel de abelhas nativas',
        'Própolis','Cera de abelha'
      ],
      'Extrativismo Mineral': [
        'Areia','Argila','Cascalho','Pedra brita','Calcário','Caulim','Ouro',
        'Ferro','Manganês','Cobre','Bauxita','Níquel','Estanho','Diamante',
        'Quartzo','Granito','Mármore','Petróleo','Gás natural','Sal marinho'
      ]
    },

    // ── Agroindústria (com subcategorias) ────────────────────────────────
    agro: {
      'Cereais e grãos': [
        'Farinha de mandioca','Farinha de milho','Fubá','Farinha de trigo',
        'Amido de mandioca','Polvilho doce','Polvilho azedo','Canjica',
        'Flocos de milho','Ração animal','Farelo de soja','Óleo de soja','Óleo de milho'
      ],
      'Leite e derivados': [
        'Leite pasteurizado','Leite em pó','Queijo','Requeijão','Manteiga',
        'Creme de leite','Iogurte','Doce de leite'
      ],
      'Carne e pescado': [
        'Carne resfriada','Carne congelada','Carne salgada','Carne seca',
        'Linguiça','Salsicha','Presunto','Embutidos','Peixe congelado',
        'Peixe salgado','Peixe defumado'
      ],
      'Frutas': [
        'Polpa de frutas','Suco de frutas','Néctar','Geleia','Compota',
        'Frutas desidratadas','Frutas cristalizadas','Doces de frutas','Açaí processado'
      ],
      'Cana-de-açúcar': [
        'Açúcar','Rapadura','Melado','Cachaça','Etanol'
      ],
      'Café e cacau': [
        'Café torrado','Café moído','Café solúvel','Chocolate','Cacau em pó'
      ],
      'Óleos e gorduras': [
        'Óleo de dendê','Óleo de coco','Óleo de girassol','Azeite de oliva','Margarina'
      ],
      'Apícolas': [
        'Mel','Própolis','Cera de abelha'
      ],
      'Vegetais beneficiados': [
        'Castanha beneficiada','Castanha-do-brasil descascada','Castanha de caju',
        'Erva-mate processada','Palmito em conserva','Conservas vegetais','Picles'
      ],
      'Panificação e derivados': [
        'Pão','Biscoito','Bolacha','Bolo','Massa alimentícia','Macarrão'
      ]
    },

    // ── Renda Fora (com subcategorias) ───────────────────────────────────
    renda: {
      'Aposentadorias e benefícios': [
        'Aposentadoria rural','Aposentadoria urbana','Pensão por morte',
        'Benefício assistencial (BPC/LOAS)','Auxílio-doença','Auxílio-acidente',
        'Salário-maternidade'
      ],
      'Trabalho assalariado': [
        'Salário de emprego público','Salário de emprego privado',
        'Trabalho com carteira assinada','Trabalho temporário',
        'Trabalho doméstico','Emprego em comércio','Emprego em indústria',
        'Emprego na construção civil'
      ],
      'Serviços e trabalhos autônomos': [
        'Diárias','Prestação de serviços','Pedreiro','Carpinteiro','Pintor',
        'Eletricista','Encanador','Mecânico','Motorista','Mototaxista',
        'Taxista','Serviços de manutenção','Costura','Artesanato',
        'Cabeleireiro','Manicure'
      ],
      'Comércio e atividades urbanas': [
        'Comércio próprio','Venda ambulante','Pequeno negócio','Loja',
        'Lanchonete','Bar','Mercearia'
      ],
      'Programas sociais e transferências': [
        'Bolsa Família','Auxílio estadual ou municipal','Benefícios sociais diversos',
        'Pensão alimentícia'
      ],
      'Rendimentos financeiros e patrimoniais': [
        'Aluguel de imóveis','Arrendamento de terras','Juros de aplicações',
        'Dividendos','Rendimentos bancários'
      ],
      'Outras fontes': [
        'Remessas de familiares','Doações regulares','Bolsas de estudo',
        'Estágio remunerado','Trabalho por aplicativo','Comissões','Freelance'
      ]
    }
  };

  // ── Gera o HTML das <option>/<optgroup> a partir de uma lista ou objeto ───
  function gerarOptionsHTML(lista) {
    let html = '<option value="">Selecione...</option>';
    if (Array.isArray(lista)) {
      lista.forEach(o => { html += `<option value="${o}">${o}</option>`; });
    } else {
      Object.entries(lista).forEach(([grupo, opts]) => {
        html += `<optgroup label="${grupo}">`;
        opts.forEach(o => { html += `<option value="${o}">${o}</option>`; });
        html += '</optgroup>';
      });
    }
    return html;
  }

  // ── Substitui o <input data-field="X"> de um item por <select> ───────────
  function transformarCampo(item, key, field) {
    if (!item) return;
    const lista = AGR_LISTAS[key];
    if (!lista) return;

    const input = item.querySelector(`input[data-field="${field}"]`);
    if (!input) return; // já transformado ou não encontrado

    const valorAtual = input.value || '';

    // Monta o <select>
    const select = document.createElement('select');
    select.className = 'form-input';
    select.style.width = '1px'; // previne overflow no Android quando há opções de texto longas (mesma causa/correção já aplicada em Aves/Equino)
    select.setAttribute('data-field', field);
    select.setAttribute('data-agr-select', '1');
    select.innerHTML = gerarOptionsHTML(lista);

    // Substitui o input antigo pelo select
    input.replaceWith(select);

    // Sincroniza valor já existente (ex.: item carregado do Supabase).
    // Se o valor salvo não estiver na lista atual, mantém em branco —
    // o usuário pode escolher de novo ou usar a aba de texto livre.
    const opt = Array.from(select.options).find(o => o.value === valorAtual && valorAtual !== '');
    select.value = opt ? valorAtual : '';

    // sca_core.js liga o cálculo via addEventListener('input', ...) no
    // input original (agrBindCalc). Disparamos 'input' manualmente no
    // 'change' do select para acionar o mesmo listener.
    select.addEventListener('change', function () {
      select.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  // ── Aplica a transformação em todos os itens já renderizados de uma aba ──
  function transformarTodosItens(key) {
    const field = AGR_CAMPO_ALVO[key];
    if (!field) return;
    const lista = document.getElementById('agr-' + key + '-lista');
    if (!lista) return;
    lista.querySelectorAll('.agr-item').forEach(item => transformarCampo(item, key, field));
  }

  // ── Envolve agrAdicionarItem e carregarAgricola, sem editar sca_core.js ───
  function aplicarPatch() {
    if (typeof window.agrAdicionarItem !== 'function' || typeof window.carregarAgricola !== 'function') return false;

    const _adicionarOriginal = window.agrAdicionarItem;
    window.agrAdicionarItem = function (key) {
      const resultado = _adicionarOriginal.apply(this, arguments);
      const field = AGR_CAMPO_ALVO[key];
      if (field) {
        const lista = document.getElementById('agr-' + key + '-lista');
        const ultimo = lista ? lista.querySelectorAll('.agr-item') : [];
        const item = ultimo[ultimo.length - 1];
        transformarCampo(item, key, field);
      }
      return resultado;
    };

    const _carregarOriginal = window.carregarAgricola;
    window.carregarAgricola = function (i) {
      const resultado = _carregarOriginal.apply(this, arguments);
      Object.keys(AGR_CAMPO_ALVO).forEach(key => transformarTodosItens(key));
      return resultado;
    };

    if (typeof window.carregarAgricolaMulti === 'function') {
      window.carregarAgricolaMulti = function (i) { return window.carregarAgricola(i); };
    }

    console.info('[SCA Culturas Agrícola] ✅ agrAdicionarItem/carregarAgricola interceptadas com sucesso.');
    return true;
  }

  // ── Aguarda até 5 s para sca_core.js definir as funções ─────────────────────
  let tentativas = 0;
  const intervalo = setInterval(function () {
    tentativas++;
    if (aplicarPatch()) {
      clearInterval(intervalo);
      // Transforma itens que já estiverem na tela no momento em que o patch carregou
      Object.keys(AGR_CAMPO_ALVO).forEach(key => transformarTodosItens(key));
    } else if (tentativas >= 50) {
      clearInterval(intervalo);
      console.error('[SCA Culturas Agrícola] ❌ agrAdicionarItem/carregarAgricola não encontradas após 5 s. Patch não aplicado.');
    }
  }, 100);

})();
