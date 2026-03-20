import { Request as ExpressRequest, Response } from 'express';
import { getRepository } from 'fireorm';
import { Request, RequestStatus, Receipt, History } from '../models/Schemas.js';

export class RequestController {
  static async create(req: ExpressRequest, res: Response) {
    try {
      const requestRepo = getRepository(Request);
      const historyRepo = getRepository(History);
      const { 
        title, userId, status, type, project, 
        paymentMethod, location, date,
        paymentDate, subsidiary, department, chargeClass, competence, nfNumber
      } = req.body;

      const newRequest = new Request();
      newRequest.title = title;
      newRequest.userId = userId;
      newRequest.status = status || RequestStatus.RASCUNHO;
      newRequest.type = type;
      newRequest.project = project;
      newRequest.paymentMethod = paymentMethod;
      newRequest.location = location;
      newRequest.date = date ? new Date(date) : new Date();
      newRequest.totalValue = 0;
      newRequest.isMultiple = false;

      // Atribuir novos campos
      newRequest.paymentDate = paymentDate ? new Date(paymentDate) : undefined;
      newRequest.subsidiary = subsidiary;
      newRequest.department = department;
      newRequest.chargeClass = chargeClass;
      newRequest.competence = competence;
      newRequest.nfNumber = nfNumber;

      const savedRequest = await requestRepo.create(newRequest);

      const initialHistory = new History();
      initialHistory.solicitacaoId = savedRequest.id;
      initialHistory.action = status === RequestStatus.PENDENTE ? 'Solicitação criada e enviada para aprovação' : 'Rascunho inicial criado';
      initialHistory.date = new Date();
      initialHistory.userName = (userId as string) || 'Colaborador';
      await historyRepo.create(initialHistory);

      res.status(201).json(savedRequest);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar solicitação' });
    }
  }

  static async updateStatus(req: ExpressRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { 
        title, type, project, paymentMethod, location, date, status, note, userName,
        paymentDate, subsidiary, department, chargeClass, competence, nfNumber
      } = req.body;
      const requestRepo = getRepository(Request);
      const historyRepo = getRepository(History);

      const request = await requestRepo.findById(id);
      if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

      // BLOCO DE EDIÇÃO: Permitido apenas para Rascunho ou Devolvido
      const isEditingFields = title || type || project || paymentMethod || location || date || 
                               paymentDate || subsidiary || department || chargeClass || competence || nfNumber;
      
      if (isEditingFields) {
        if (request.status !== RequestStatus.RASCUNHO && request.status !== RequestStatus.DEVOLVIDO) {
          return res.status(403).json({ error: 'Apenas rascunhos ou pedidos devolvidos podem ter seus campos editados' });
        }
      }

      // Regra para nota obrigatória em rejeição/devolução
      if ((status === RequestStatus.DEVOLVIDO || status === RequestStatus.REJEITADO) && !note) {
        return res.status(400).json({ error: 'O preenchimento do campo "note" (observação) é obrigatório para devoluções ou rejeições.' });
      }

      // Atualizar campos se fornecidos
      if (title) request.title = title;
      if (type) request.type = type;
      if (project) request.project = project;
      if (paymentMethod) request.paymentMethod = paymentMethod;
      if (location) request.location = location;
      if (date) request.date = new Date(date);
      if (paymentDate) request.paymentDate = new Date(paymentDate);
      if (subsidiary !== undefined) request.subsidiary = subsidiary;
      if (department !== undefined) request.department = department;
      if (chargeClass !== undefined) request.chargeClass = chargeClass;
      if (competence !== undefined) request.competence = competence;
      if (nfNumber !== undefined) request.nfNumber = nfNumber;

      if (status) request.status = status;
      await requestRepo.update(request);

      const actionMap = {
        [RequestStatus.APROVADO]: 'Aprovado pelo Financeiro',
        [RequestStatus.DEVOLVIDO]: 'Devolvido para Correção',
        [RequestStatus.REJEITADO]: 'Rejeitado pelo Financeiro',
        [RequestStatus.PENDENTE]: 'Enviado para Aprovação',
      };

      const history = new History();
      history.solicitacaoId = id;
      history.action = actionMap[status as keyof typeof actionMap] || `Status alterado para ${status}`;
      history.date = new Date();
      history.userName = (userName as string) || 'Admin Financeiro';
      history.note = note;
      await historyRepo.create(history);

      res.json(request);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar status' });
    }
  }

  static async updateDraft(req: ExpressRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const payload = req.body;
      const requestRepo = getRepository(Request);
      const historyRepo = getRepository(History);
      const receiptRepo = getRepository(Receipt);

      const request = await requestRepo.findById(id);
      if (!request) return res.status(404).json({ error: 'Rascunho não encontrado' });

      const currentReceipts = await receiptRepo.whereEqualTo('solicitacaoId', id).find();
      const currentReceiptsCount = currentReceipts.length;
      const payloadReceiptsCount = payload.receipts ? payload.receipts.length : currentReceiptsCount;
      
      let actionMessage = 'Rascunho guardado';
      if (payloadReceiptsCount > currentReceiptsCount) actionMessage = 'Novo recibo adicionado ao rascunho';
      else if (payloadReceiptsCount < currentReceiptsCount) actionMessage = 'Recibo removido do rascunho';
      else if (payload.totalValue !== request.totalValue) actionMessage = 'Valores do rascunho atualizados';

      Object.assign(request, payload);
      await requestRepo.update(request);

      const history = new History();
      history.solicitacaoId = id;
      history.action = actionMessage;
      history.date = new Date();
      history.userName = (payload.userId as string) || 'Colaborador';
      await historyRepo.create(history);

      res.json(request);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar rascunho' });
    }
  }

  static async list(req: ExpressRequest, res: Response) {
    try {
      const role = req.query.role as string;
      const userId = req.query.userId as string;
      const requestRepo = getRepository(Request);
      
      if (role === 'admin') {
         const requests = await requestRepo.whereArrayContainsAny('status', [
           RequestStatus.PENDENTE,
           RequestStatus.APROVADO,
           RequestStatus.REJEITADO,
           RequestStatus.DEVOLVIDO
         ]).find();
         return res.json(requests);
      } else {
        const requests = await requestRepo.whereEqualTo('userId', userId).find();
        return res.json(requests);
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao listar solicitações' });
    }
  }

  static async getDetails(req: ExpressRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const requestRepo = getRepository(Request);
      const receiptRepo = getRepository(Receipt);
      const historyRepo = getRepository(History);

      const request = await requestRepo.findById(id);
      if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

      const receipts = await receiptRepo.whereEqualTo('solicitacaoId', id).find();
      const history = await historyRepo.whereEqualTo('solicitacaoId', id).find();

      res.json({ ...request, receipts, history });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar detalhes' });
    }
  }
}
