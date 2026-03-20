import { getRepository } from 'fireorm';
import { Receipt, Request as AppRequest } from '../models/Schemas.js';
import { OcrService } from '../services/OcrService.js';
import { cloudinary } from '../config/services.js';
import fs from 'fs';
export class ReceiptController {
    static async uploadAndProcess(req, res) {
        try {
            if (!req.file)
                return res.status(400).json({ error: 'Nenhuma imagem enviada' });
            const { solicitacaoId } = req.body;
            // 1. Upload para Cloudinary
            const uploadResult = await cloudinary.uploader.upload(req.file.path, {
                folder: 'reembolsos',
            });
            // 2. Processamento OCR
            const extracted = await OcrService.extractReceiptData(uploadResult.secure_url);
            // 3. Salvar no Firebase
            const receiptRepo = getRepository(Receipt);
            const newReceipt = new Receipt();
            newReceipt.solicitacaoId = solicitacaoId;
            newReceipt.description = extracted.merchantName || 'Recibo sem descrição';
            newReceipt.value = extracted.totalValue || 0;
            newReceipt.receiptUrl = uploadResult.secure_url;
            newReceipt.merchantName = extracted.merchantName;
            newReceipt.receiptDate = extracted.date;
            const savedReceipt = await receiptRepo.create(newReceipt);
            // Atualizar totalValue na solicitação
            const requestRepo = getRepository(AppRequest);
            const request = await requestRepo.findById(solicitacaoId);
            if (request) {
                request.totalValue = (request.totalValue || 0) + newReceipt.value;
                const allReceipts = await receiptRepo.whereEqualTo('solicitacaoId', solicitacaoId).find();
                request.isMultiple = allReceipts.length > 1;
                await requestRepo.update(request);
            }
            // Remover arquivo temporário localmente
            if (fs.existsSync(req.file.path))
                fs.unlinkSync(req.file.path);
            res.status(201).json(savedReceipt);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao processar recibo' });
        }
    }
}
