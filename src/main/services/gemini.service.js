const { safeStorage } = require('electron');
const Store = require('electron-store').default;

const store = new Store();
const STORE_KEY = 'gemini_encrypted_api_key';

class GeminiService {
  constructor() {
    this.fallbackModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-8b',
      'gemini-2.5-pro'
    ];
  }

  // --- ARMAZENAMENTO SEGURO DA API KEY ---

  hasKey() {
    const stored = store.get(STORE_KEY);
    return Boolean(stored);
  }

  getKey() {
    try {
      const stored = store.get(STORE_KEY);
      if (!stored) return null;

      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(stored, 'hex');
        return safeStorage.decryptString(buffer);
      } else {
        // Fallback para ambientes onde safeStorage não está disponível (ex: testes)
        return Buffer.from(stored, 'base64').toString('utf8');
      }
    } catch (err) {
      console.error('Erro ao descriptografar chave do Gemini:', err);
      return null;
    }
  }

  setKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      throw new Error('Chave de API inválida');
    }

    const cleanKey = apiKey.trim();
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const encryptedBuffer = safeStorage.encryptString(cleanKey);
      store.set(STORE_KEY, encryptedBuffer.toString('hex'));
    } else {
      store.set(STORE_KEY, Buffer.from(cleanKey).toString('base64'));
    }
  }

  removeKey() {
    store.delete(STORE_KEY);
  }

  // --- VALIDAÇÃO DA CHAVE COM A API DO GOOGLE ---

  async validateKey(apiKey) {
    const key = apiKey || this.getKey();
    if (!key) {
      return { valid: false, error: 'Chave não informada.' };
    }

    try {
      // Faz uma requisição leve para listar os modelos disponíveis com a chave informada
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `Código HTTP ${response.status}`;
        return { valid: false, error: `Falha na verificação: ${message}` };
      }

      const data = await response.json();
      const hasGeminiModels = Array.isArray(data.models) && data.models.length > 0;
      if (!hasGeminiModels) {
        return { valid: false, error: 'Nenhum modelo Gemini disponível para esta chave.' };
      }

      return { valid: true };
    } catch (err) {
      console.error('Erro ao validar chave Gemini:', err);
      return { valid: false, error: `Erro de conexão: ${err.message}` };
    }
  }

  // Descobre dinamicamente quais modelos suportam generateContent para esta chave
  async getAvailableModels(key) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
      if (!response.ok) return this.fallbackModels;

      const data = await response.json();
      if (!Array.isArray(data.models)) return this.fallbackModels;

      const supported = data.models
        .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''));

      const preferredPriority = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash-8b',
        'gemini-1.5-flash',
        'gemini-2.5-pro',
        'gemini-2.0-pro-exp-02-05'
      ];

      const orderedList = [];
      for (const pref of preferredPriority) {
        if (supported.includes(pref)) {
          orderedList.push(pref);
        }
      }

      // Adiciona outros modelos Gemini disponíveis que não estejam na lista prioritária
      for (const model of supported) {
        if (!orderedList.includes(model) && model.startsWith('gemini')) {
          orderedList.push(model);
        }
      }

      return orderedList.length > 0 ? orderedList : this.fallbackModels;
    } catch (err) {
      console.warn('Erro ao consultar lista de modelos, usando lista padrão:', err.message);
      return this.fallbackModels;
    }
  }

  // --- EXTRAÇÃO E PROCESSAMENTO DE FATURA / EXTRATO ---

  async extractFinancialRecords({ fileBuffer, fileName, mimeType, categories = [], people = [], documentType = 'credit_card' }) {
    const key = this.getKey();
    if (!key) {
      throw new Error('Chave da API do Gemini não configurada ou não verificada.');
    }

    const categoriesPrompt = categories.length > 0
      ? categories.map(c => `- ID ${c.id}: "${c.name}" (tipo: ${c.type})`).join('\n')
      : 'Nenhuma categoria cadastrada.';

    const peoplePrompt = people.length > 0
      ? people.map(p => `- ID ${p.id}: "${p.name}"`).join('\n')
      : 'Nenhuma pessoa cadastrada.';

    const isCreditCard = documentType === 'credit_card';

    const systemPrompt = `Você é um assistente financeiro especialista em leitura e conciliação de faturas de cartão de crédito e extratos bancários.
Sua missão é extrair com precisão absoluta todas as transações financeiras individuais contidas no documento fornecido.

INSTRUÇÕES DE EXTRAÇÃO:
1. Retorne APENAS um JSON válido seguindo a estrutura solicitada abaixo, sem marcações markdown como \`\`\`json.
2. Identifique cada transação com:
   - "date": Data no formato YYYY-MM-DD. Se o ano não constar, infira pelo ano corrente ou contexto da fatura.
   - "description": Nome limpo e claro do estabelecimento ou lançamento (ex: "Posto Ipiranga", "iFood", "Netflix").
   - "amount": Valor numérico (positivo para despesas normais, ex: 45.90; e NEGATIVO para estornos, reembolsos, devoluções ou redução de anuidade/mensalidade na fatura de cartão, ex: -31.00).
   - "type": "expense" para despesas/compras ou "income" para receitas/estornos/reembolsos.
   - "suggested_category_id": O ID numérico da categoria mais provável dentre as categorias fornecidas abaixo, ou null.
   - "suggested_person_id": O ID da pessoa correspondente se houver menção ao nome/portador, ou null.
   - "installments": Total de parcelas (ex: se for compra 2/10, installments é 10). Se for à vista, 1.
   - "installment_number": Número da parcela atual (ex: se for compra 2/10, installment_number é 2). Se for à vista, 1.
3. Ignore linhas de totais, subtotais, limites, taxas de juros informativas ou propagandas.
4. Para faturas de cartão de crédito: Extraia as compras normais e também ESTORNOS, DEVOLUÇÕES, REEMBOLSOS ou REDUÇÕES DE MENSALIDADE/ANUIDADE (sempre com amount NEGATIVO, ex: -31.00). NUNCA inclua pagamentos de fatura anterior (ex: "Pagamento de fatura", "Pagamento de fatura anterior", "Pagto fatura", "Pagamento recebido"), pois o pagamento quita o mês anterior e não é um lançamento da fatura atual.

CATEGORIAS CADASTRADAS NO APP:
${categoriesPrompt}

PESSOAS CADASTRADAS NO APP:
${peoplePrompt}

ESTRUTURA JSON OBRIGATÓRIA:
{
  "institution": "Nome do Banco ou Cartão identificado (string)",
  "period": { "start": "YYYY-MM-DD ou null", "end": "YYYY-MM-DD ou null" },
  "total_amount": 0.00,
  "records": [
    {
      "date": "YYYY-MM-DD",
      "description": "Texto",
      "amount": 0.00,
      "type": "expense",
      "suggested_category_id": null,
      "suggested_person_id": null,
      "installments": 1,
      "installment_number": 1
    }
  ]
}`;

    // Monta o payload do Gemini
    const parts = [];

    // Se for PDF ou Imagem, envia como inlineData
    const isBinaryDocument = mimeType.startsWith('image/') || mimeType === 'application/pdf';

    if (isBinaryDocument) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: fileBuffer.toString('base64')
        }
      });
      parts.push({
        text: `Por favor, analise este arquivo de ${isCreditCard ? 'fatura de cartão de crédito' : 'extrato bancário'} e extraia as transações financeiras conforme as instruções.`
      });
    } else {
      // Arquivo de texto (CSV, OFX, TXT)
      let textContent = '';
      try {
        textContent = fileBuffer.toString('utf8');
      } catch (_) {
        textContent = fileBuffer.toString('latin1');
      }

      parts.push({
        text: `Analise o seguinte arquivo de texto de ${isCreditCard ? 'fatura de cartão' : 'extrato bancário'} (${fileName}):\n\n${textContent}`
      });
    }

    // Busca os modelos suportados para a chave
    const candidateModels = await this.getAvailableModels(key);
    let lastError = null;

    for (const model of candidateModels) {
      let attempts = 0;
      const maxAttempts = 2; // tenta até 2 vezes se for sobrecarga temporária

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
          const body = {
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: [
              {
                role: 'user',
                parts: parts
              }
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json'
            }
          };

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });

          if (!response.ok) {
            const errRes = await response.json().catch(() => ({}));
            const errMsg = errRes?.error?.message || `Erro HTTP ${response.status} no modelo ${model}`;

            // Se for sobrecarga temporária ("high demand", 503 ou 429), aguarda 1s e tenta novamente
            const isHighDemand = errMsg.includes('high demand') || response.status === 503 || response.status === 429;
            if (isHighDemand && attempts < maxAttempts) {
              console.warn(`Modelo ${model} com alta demanda. Tentando novamente em 1s...`);
              await new Promise(r => setTimeout(r, 1000));
              continue;
            }

            throw new Error(errMsg);
          }

          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!rawText) {
            throw new Error('IA retornou uma resposta vazia.');
          }

          // Limpeza de blocos de markdown caso venham
          const cleanJson = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
          const parsed = JSON.parse(cleanJson);

          if (!parsed.records || !Array.isArray(parsed.records)) {
            throw new Error('Formato retornado pela IA não contém a lista de lançamentos.');
          }

          return parsed;
        } catch (err) {
          console.warn(`Tentativa ${attempts} com modelo ${model} falhou:`, err.message);
          lastError = err;
          // Se não for erro de alta demanda, interrompe o loop de tentativas deste modelo e vai para o próximo modelo
          if (!err.message.includes('high demand')) {
            break;
          }
        }
      }
    }

    throw lastError || new Error('Não foi possível processar o documento com os modelos Gemini disponíveis.');
  }
}

module.exports = new GeminiService();
