import { Request as ExpressRequest, Response } from 'express';
import { getRepository } from 'fireorm';
import { Receipt, Request as AppRequest, History } from '../models/Schemas.js';
import { OcrService } from '../services/OcrService.js';
import { cloudinary } from '../config/services.js';
import fs from 'fs';

export class ReceiptController {
  static async uploadAndProcess(req: ExpressRequest, res: Response) {
    try {
      if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
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
      newReceipt.description = extracted.merchantName || 'Recibo enviado';
      newReceipt.value = extracted.totalValue || 0;
      newReceipt.receiptUrl = uploadResult.secure_url;
      newReceipt.merchantName = extracted.merchantName;
      newReceipt.receiptDate = extracted.date;

      const savedReceipt = await receiptRepo.create(newReceipt);

      // 4. Atualizar totalValue na solicitação e Adicionar Histórico
      const requestRepo = getRepository(AppRequest);
      const historyRepo = getRepository(History);
      const request = await requestRepo.findById(solicitacaoId);
      
      if (request) {
        const allReceipts = await receiptRepo.whereEqualTo('solicitacaoId', solicitacaoId).find();
        request.totalValue = allReceipts.reduce((sum, r) => sum + (r.value || 0), 0);
        request.isMultiple = allReceipts.length > 1;
        await requestRepo.update(request);

        const history = new History();
        history.solicitacaoId = solicitacaoId;
        history.action = `Novo recibo adicionado: ${newReceipt.description} (R$ ${newReceipt.value})`;
        history.date = new Date();
        history.userName = 'Colaborador';
        await historyRepo.create(history);
      }

      // Remover arquivo temporário localmente
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      res.status(201).json(savedReceipt);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao processar recibo' });
    }
  }
}
