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

      // Remover arquivo temporário localmente
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      // 3. Se não houver solicitacaoId, apenas retornar os dados extraídos (útil para "Nova Solicitação")
      if (!solicitacaoId) {
        return res.status(200).json({
          description: extracted.merchantName || 'Recibo enviado',
          value: extracted.totalValue || 0,
          receiptUrl: uploadResult.secure_url,
          merchantName: extracted.merchantName,
          receiptDate: extracted.date,
        });
      }

      // 4. Salvar no Firebase (caso haja solicitacaoId)
      const receiptRepo = getRepository(Receipt);
      const newReceipt = new Receipt();
      newReceipt.solicitacaoId = solicitacaoId;
      newReceipt.description = extracted.merchantName || 'Recibo enviado';
      newReceipt.value = extracted.totalValue || 0;
      newReceipt.receiptUrl = uploadResult.secure_url;
      newReceipt.merchantName = extracted.merchantName;
      newReceipt.receiptDate = extracted.date;

      const savedReceipt = await receiptRepo.create(newReceipt);

      // 5. Atualizar totalValue na solicitação e Adicionar Histórico
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

      res.status(201).json(savedReceipt);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao processar recibo' });
    }
  }

  static async createReceipt(req: ExpressRequest, res: Response) {
    try {
      const { solicitacaoId, description, value, receiptUrl, merchantName, receiptDate } = req.body;
      if (!solicitacaoId) return res.status(400).json({ error: 'solicitacaoId é obrigatório' });

      const receiptRepo = getRepository(Receipt);
      const newReceipt = new Receipt();
      newReceipt.solicitacaoId = solicitacaoId;
      newReceipt.description = description || 'Recibo';
      newReceipt.value = Number(value) || 0;
      newReceipt.receiptUrl = receiptUrl;
      newReceipt.merchantName = merchantName;
      newReceipt.receiptDate = receiptDate;

      const savedReceipt = await receiptRepo.create(newReceipt);

      // Atualizar totalValue na solicitação
      const requestRepo = getRepository(AppRequest);
      const request = await requestRepo.findById(solicitacaoId);
      if (request) {
        const allReceipts = await receiptRepo.whereEqualTo('solicitacaoId', solicitacaoId).find();
        request.totalValue = allReceipts.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
        request.isMultiple = allReceipts.length > 1;
        await requestRepo.update(request);
      }

      res.status(201).json(savedReceipt);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao salvar recibo' });
    }
  }
}
