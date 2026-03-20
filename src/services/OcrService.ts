import { visionClient } from '../config/services.js';
import { createWorker } from 'tesseract.js';

export interface ExtractedData {
  merchantName?: string;
  date?: Date;
  totalValue?: number;
}

export class OcrService {
  static async extractReceiptData(imageUri: string): Promise<ExtractedData> {
    try {
      console.log('--- Tentando OCR com Google Vision ---');
      const [result] = await visionClient.textDetection(imageUri);
      const fullText = result.fullTextAnnotation?.text || '';
      if (!fullText) throw new Error('Sem texto no Google.');
      return this.parseReceiptText(fullText);
    } catch (error) {
      console.warn('⚠️ Fallback para Tesseract.js...');
      try {
        const worker = await createWorker('por');
        const { data: { text } } = await worker.recognize(imageUri);
        await worker.terminate();
        return this.parseReceiptText(text);
      } catch (tesseractError) {
        return {};
      }
    }
  }

  private static parseReceiptText(text: string): ExtractedData {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    const data: ExtractedData = {};

    console.log('--- OCR: ANALISANDO TEXTO ---');
    
    // 1. ESTABELECIMENTO
    let viaIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/VIA DO (ESTABELECIMENTO|CLIENTE|CONSUMIDOR)/i)) {
            viaIndex = i;
            break;
        }
    }

    if (viaIndex !== -1 && lines[viaIndex + 1]) {
        data.merchantName = lines[viaIndex + 1];
    } else {
        for (const line of lines) {
            const alphaOnly = line.replace(/[^a-zA-ZÀ-ÿ]/g, '');
            if (line.match(/(ENTER|SHIFT|TAB|SPACE|ALT|CTRL|P\[|A\]|VIA DO|SICOOB)/i)) continue;
            if (line.match(/(CNPJ|IE:|IM:|CPF|DANFE|CUPOM|FISCAL|SUBTOTAL)/i)) continue;
            if (alphaOnly.length < 8) continue;
            data.merchantName = line;
            break;
        }
    }

    // 2. DATA (Versão Robusta)
    // Padrões comuns: DD/MM/YY, DD/MM/YYYY, DD-MM-YY, DD.MM.YY e variações com letras mal lidas
    const dateRegexStr = '(\\d{2})[\\/\\-\\.\\s](\\d{2})[\\/\\-\\.\\s](\\d{2,4})';
    const dateMatches = text.match(new RegExp(dateRegexStr, 'g')) || [];
    
    console.log(`Candidatos de data encontrados: ${dateMatches.join(' | ')}`);

    for (const matchStr of dateMatches) {
        // Limpar a string de data (remover espaços e garantir separador padrão)
        const clean = matchStr.replace(/[\.\s]/g, '/').replace(/-/g, '/');
        const parts = clean.split('/');
        
        if (parts.length === 3) {
            let day = parseInt(parts[0]);
            let month = parseInt(parts[1]) - 1;
            let yearStr = parts[2];
            
            if (yearStr.length === 2) {
                // Heurística simples: se for > 50, é 19xx, senão 20xx
                const y = parseInt(yearStr);
                yearStr = y > 50 ? '19' + yearStr : '20' + yearStr;
            }
            const year = parseInt(yearStr);

            // Validação de intervalo real de data de recibo
            if (day > 0 && day <= 31 && month >= 0 && month <= 11 && year >= 2000 && year <= 2030) {
                data.date = new Date(year, month, day);
                console.log(`>> DATA VALIDADA: ${data.date.toLocaleDateString('pt-BR')}`);
                break; // Pega a primeira data válida encontrada
            }
        }
    }

    // 3. VALOR TOTAL
    const valueKeywords = [
        'VALOR PAGO', 'CARTAO.*CREDITO', 'CREDITO', 'TOTAL.*PAGO', 
        'VALOR.*VENDA', 'VALOR.*PAGAR', 'VALOR.*TOTAL', 'TOTAL.*R\\$', 'PAGAR.*R\\$', 'TOTAL.*(=)'
    ];

    let foundValue = 0;
    const allLines = text.split('\n').map(l => l.trim());
    for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i];
        const isMatch = valueKeywords.some(kw => new RegExp(kw, 'i').test(line));
        if (isMatch) {
            const block = (allLines[i] + ' ' + (allLines[i+1] || '')).replace(/\s+/g, ' ');
            const priceMatch = block.match(/([\d]+[.,]\d{2})/);
            if (priceMatch) {
                foundValue = parseFloat(priceMatch[1].replace(',', '.'));
                break;
            }
        }
    }

    if (foundValue === 0) {
        const prices = text.match(/([\d]+[.,]\d{2})/g) || [];
        foundValue = Math.max(...prices.map(p => parseFloat(p.replace(',', '.'))).filter(v => v < 2000));
    }
    data.totalValue = foundValue;

    return data;
  }
}
