import { visionClient } from '../config/services.js';
export class OcrService {
    static async extractReceiptData(imageUri) {
        try {
            const [result] = await visionClient.textDetection(imageUri);
            const fullText = result.fullTextAnnotation?.text || '';
            if (!fullText)
                return {};
            return this.parseReceiptText(fullText);
        }
        catch (error) {
            console.error('OCR Error:', error);
            return {};
        }
    }
    static parseReceiptText(text) {
        const lines = text.split('\n');
        const data = {};
        // 1. Tentar extrair Estabelecimento (Geralmente a primeira linha)
        if (lines.length > 0) {
            data.merchantName = lines[0].trim();
        }
        // 2. Tentar extrair Valor Total
        const totalRegex = /(?:TOTAL|VALOR|PAGAR|SUM|AMOUNT|PAGO)[\s:€$]*([\d.,]+)/i;
        const matchTotal = text.match(totalRegex);
        if (matchTotal && matchTotal[1]) {
            const cleanValue = matchTotal[1].replace(',', '.');
            data.totalValue = parseFloat(cleanValue);
        }
        // 3. Tentar extrair Data
        const dateRegex = /(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/;
        const matchDate = text.match(dateRegex);
        if (matchDate && matchDate[1]) {
            const dateStr = matchDate[1];
            const dateParts = dateStr.split(/[\/\-]/);
            if (dateParts.length === 3) {
                if (dateParts[0]?.length === 2 && dateParts[2]?.length === 4) {
                    // DD/MM/YYYY -> YYYY-MM-DD
                    data.date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
                }
                else {
                    data.date = new Date(dateStr);
                }
            }
        }
        return data;
    }
}
