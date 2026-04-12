import { Request as ExpressRequest, Response } from 'express';
import { getRepository } from 'fireorm';
import { Request, RequestStatus, Receipt, History } from '../models/Schemas.js';
import { cloudinary } from '../config/services.js';

export class RequestController {
  private static toJSDate(d: any): Date | undefined {
    if (!d) return undefined;
    if (d instanceof Date) return d;
    if (typeof d.toDate === 'function') return d.toDate();
    if (d._seconds && d._nanoseconds) return new Date(d._seconds * 1000);
    return undefined;
  }

  private static formatRequest(r: Request) {
    const formatDate = (rawDate?: any) => {
      const date = RequestController.toJSDate(rawDate);
      if (!date) return undefined;
      const d = date.getDate().toString().padStart(2, '0');
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear();
      return `${y}-${m}-${d}`;
    };

    return {
      id: r.id,
      userId: r.userId,
      user: r.user || 'Usuário Não Identificado',
      title: r.title,
      paymentMethod: r.paymentMethod,
      observation: r.observation,
      date: formatDate(r.date),
      status: r.status,
      totalValue: r.totalValue,
      isMultiple: !!r.isMultiple,
      paymentDate: formatDate(r.paymentDate),
      subsidiary: r.subsidiary,
      department: r.department,
      chargeClass: r.chargeClass,
      competence: r.competence,
      nfNumber: r.nfNumber,
      displayId: `SOL-${r.id.substring(0, 4).toUpperCase()}`,
      approverId: r.approverId
    };
  }

  private static formatReceipts(receipts: Receipt[]) {
    return receipts.map(r => {
      const date = RequestController.toJSDate(r.receiptDate);
      return {
        ...r,
        receiptDate: date ? date.toLocaleDateString('pt-BR').replace(/\//g, '-') : r.receiptDate
      };
    });
  }

  private static formatHistory(history: History[]) {
    return history.map(h => {
      const date = RequestController.toJSDate(h.date);
      return {
        ...h,
        date: date ? date.toLocaleDateString('pt-BR').replace(/\//g, '-') : h.date
      };
    });
  }

  private static async getFullResponse(requestId: string) {
    const requestRepo = getRepository(Request);
    const receiptRepo = getRepository(Receipt);
    const historyRepo = getRepository(History);

    const request = await requestRepo.findById(requestId);
    if (!request) return null;

    const receipts = await receiptRepo.whereEqualTo('solicitacaoId', requestId).find();
    const history = await historyRepo.whereEqualTo('solicitacaoId', requestId).find();

    return {
      ...RequestController.formatRequest(request),
      receipts: RequestController.formatReceipts(receipts),
      history: RequestController.formatHistory(history)
    };
  }

  private static async syncReceipts(requestId: string, receiptsPayload: any[]) {
    const receiptRepo = getRepository(Receipt);
    const requestRepo = getRepository(Request);
    
    const currentReceipts = await receiptRepo.whereEqualTo('solicitacaoId', requestId).find();
    const currentIds = currentReceipts.map(r => r.id);
    const payloadIds = receiptsPayload.map(r => r.id).filter(id => id && !id.startsWith('REC-NEW-'));

    const toDelete = currentIds.filter(id => !payloadIds.includes(id));
    for (const id of toDelete) {
      await receiptRepo.delete(id);
    }

    for (const r of receiptsPayload) {
      let receipt: Receipt;
      const isNew = !r.id || r.id.startsWith('REC-NEW-');

      if (isNew) {
        receipt = new Receipt();
        receipt.solicitacaoId = requestId;
      } else {
        const existing = currentReceipts.find(cr => cr.id === r.id);
        if (!existing) continue;
        receipt = existing;
      }

      receipt.description = r.description || r.merchantName || 'Recibo';
      receipt.merchantName = r.merchantName || r.description;
      receipt.value = Number(r.value) || 0;
      receipt.receiptDate = r.receiptDate;

      if (r.receiptUrl && r.receiptUrl.startsWith('data:image/')) {
        try {
          const uploadResult = await cloudinary.uploader.upload(r.receiptUrl, {
            folder: 'reembolsos',
          });
          receipt.receiptUrl = uploadResult.secure_url;
        } catch (error) {
          console.error('[SYNC] Cloudinary upload failed:', error);
          receipt.receiptUrl = r.receiptUrl;
        }
      } else {
        receipt.receiptUrl = r.receiptUrl;
      }

      if (isNew) await receiptRepo.create(receipt);
      else await receiptRepo.update(receipt);
    }

    const finalReceipts = await receiptRepo.whereEqualTo('solicitacaoId', requestId).find();
    const request = await requestRepo.findById(requestId);
    if (request) {
      request.totalValue = finalReceipts.reduce((sum, r) => sum + (r.value || 0), 0);
      request.isMultiple = finalReceipts.length > 1;
      await requestRepo.update(request);
    }
  }

  static async create(req: ExpressRequest, res: Response) {
    try {
      const requestRepo = getRepository(Request);
      const historyRepo = getRepository(History);
      const { 
        title, userId, status, 
        paymentMethod, observation, date,
        paymentDate, subsidiary, department, chargeClass, competence, nfNumber,
        userLevel, approverId, userName, user, isMultiple
      } = req.body;

      const newRequest = new Request();
      newRequest.title = title;
      newRequest.userId = userId;
      newRequest.user = user || userName || 'Usuário';
      newRequest.paymentMethod = paymentMethod;
      newRequest.observation = observation;
      newRequest.date = date ? new Date(date) : new Date();
      newRequest.totalValue = 0;
      newRequest.isMultiple = !!isMultiple;

      // Status logic based on level
      if (status === RequestStatus.PENDENTE_DIRETOR || status === 'Pendente') {
        if (userLevel === 'Diretor') {
          newRequest.status = RequestStatus.PENDENTE_FINANCEIRO;
        } else {
          newRequest.status = RequestStatus.PENDENTE_DIRETOR;
        }
      } else {
        newRequest.status = status || RequestStatus.RASCUNHO;
      }

      newRequest.paymentDate = paymentDate ? new Date(paymentDate) : undefined;
      newRequest.subsidiary = subsidiary;
      newRequest.department = department;
      newRequest.chargeClass = chargeClass;
      newRequest.competence = competence;
      newRequest.nfNumber = nfNumber;
      newRequest.approverId = approverId;

      const savedRequest = await requestRepo.create(newRequest);

      // Sincronizar Recibos se vierem no payload
      if (req.body.receipts && Array.isArray(req.body.receipts)) {
        await RequestController.syncReceipts(savedRequest.id, req.body.receipts);
      }

      const history = new History();
      history.solicitacaoId = savedRequest.id;
      let historyAction = 'Rascunho inicial criado';
      if (newRequest.status === RequestStatus.PENDENTE_DIRETOR) historyAction = 'Solicitação enviada para aprovação do Diretor';
      if (newRequest.status === RequestStatus.PENDENTE_FINANCEIRO) historyAction = 'Solicitação enviada direto para o Financeiro';
      
      history.action = historyAction;
      history.date = new Date();
      history.userName = (userName as string) || 'Colaborador';
      await historyRepo.create(history);

      res.status(201).json(RequestController.formatRequest(savedRequest));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar solicitação' });
    }
  }

  static async updateStatus(req: ExpressRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { 
        title, paymentMethod, date, status, note, userName,
        paymentDate, subsidiary, department, chargeClass, competence, nfNumber,
        userLevel, isMultiple
      } = req.body;
      const requestRepo = getRepository(Request);
      const historyRepo = getRepository(History);

      const request = await requestRepo.findById(id);
      if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

      // Edit block: only for Draft or Returned
      const isEditingFields = title || paymentMethod || date || 
        paymentDate || subsidiary || department || chargeClass || competence || nfNumber || isMultiple !== undefined;
      
      if (isEditingFields) {
        if (request.status !== RequestStatus.RASCUNHO && request.status !== RequestStatus.DEVOLVIDO) {
          return res.status(403).json({ error: 'Apenas rascunhos ou pedidos devolvidos podem ter seus campos editados' });
        }
      }

      if ((status === RequestStatus.DEVOLVIDO || status === RequestStatus.REJEITADO) && !note) {
        return res.status(400).json({ error: 'O preenchimento do campo "note" é obrigatório para devoluções ou rejeições.' });
      }

      if (title) request.title = title;
      if (paymentMethod) request.paymentMethod = paymentMethod;
      if (date) request.date = new Date(date);
      if (paymentDate) request.paymentDate = new Date(paymentDate);
      if (subsidiary !== undefined) request.subsidiary = subsidiary;
      if (department !== undefined) request.department = department;
      if (chargeClass !== undefined) request.chargeClass = chargeClass;
      if (competence !== undefined) request.competence = competence;
      if (nfNumber !== undefined) request.nfNumber = nfNumber;
      if (isMultiple !== undefined) request.isMultiple = !!isMultiple;

      const actionMap = {
        [RequestStatus.APROVADO]: 'Aprovado pelo Financeiro',
        [RequestStatus.DEVOLVIDO]: 'Devolvido para Correção',
        [RequestStatus.REJEITADO]: 'Rejeitado pelo Financeiro',
        [RequestStatus.PENDENTE_DIRETOR]: 'Enviado para Aprovação do Diretor',
        [RequestStatus.PENDENTE_FINANCEIRO]: 'Enviado para o Financeiro',
      };

      const history = new History();
      history.solicitacaoId = id;
      history.date = new Date();
      history.userName = (userName as string) || 'Admin Financeiro';
      history.note = note;

      const isDirectorApproving = userLevel === 'Diretor' && status === RequestStatus.APROVADO;
      const wasPendingDirector = request.status === RequestStatus.PENDENTE_DIRETOR || (request.status as string) === 'Pendente';

      if (isDirectorApproving && wasPendingDirector) {
        request.status = RequestStatus.PENDENTE_FINANCEIRO;
        history.action = 'Aprovado pelo Diretor (Enviado ao Financeiro)';
      } else {
        if (status) request.status = status;
        history.action = actionMap[status as keyof typeof actionMap] || `Status alterado para ${status}`;
      }

      await requestRepo.update(request);
      
      // Sincronizar Recibos se vierem no payload (Edição de Devolvidos/Rascunhos via Status)
      if (req.body.receipts && Array.isArray(req.body.receipts) && 
         (request.status === RequestStatus.RASCUNHO || request.status === RequestStatus.DEVOLVIDO)) {
        await RequestController.syncReceipts(id, req.body.receipts);
      }

      await historyRepo.create(history);

      const fullResponse = await RequestController.getFullResponse(id);
      res.json(fullResponse);
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
      
      // FIX: Status logic based on level for drafts being submitted
      if (payload.status === RequestStatus.PENDENTE_DIRETOR || payload.status === 'Pendente' || payload.status === 'Aguardando Diretor') {
        if (payload.userLevel === 'Diretor') {
          request.status = RequestStatus.PENDENTE_FINANCEIRO;
        } else {
          request.status = RequestStatus.PENDENTE_DIRETOR;
        }
      }

      if (payload.date) request.date = new Date(payload.date);
      if (payload.paymentDate) request.paymentDate = new Date(payload.paymentDate);

      // Sincronizar Recibos
      if (payload.receipts && Array.isArray(payload.receipts)) {
        await RequestController.syncReceipts(id, payload.receipts);
      }

      await requestRepo.update(request);

      const history = new History();
      history.solicitacaoId = id;
      history.action = actionMessage;
      history.date = new Date();
      history.userName = (payload.userName as string) || 'Colaborador';
      await historyRepo.create(history);

      const fullResponse = await RequestController.getFullResponse(id);
      res.json(fullResponse);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar rascunho' });
    }
  }

  static async list(req: ExpressRequest, res: Response) {
    try {
      const { role, userId, level } = req.query;
      
      if (!role && !userId) return res.json([]);

      const requestRepo = getRepository(Request);
      let requests: Request[] = [];

       if (role === 'admin') {
          requests = await requestRepo.whereIn('status', [
            RequestStatus.PENDENTE_FINANCEIRO,
            RequestStatus.APROVADO,
            RequestStatus.REJEITADO,
            RequestStatus.DEVOLVIDO
          ]).find();
       } else if (level === 'Diretor') {
          const userIdStr = userId as string;
          const all = await requestRepo.find();
          requests = all.filter(r => 
            r.userId === userIdStr || 
            (r.approverId === userIdStr && (r.status === RequestStatus.PENDENTE_DIRETOR || (r.status as string) === 'Pendente'))
          );
       } else {
        const all = await requestRepo.find();
        requests = all.filter(r => r.userId === userId);
      }
      const formattedRequests = requests.map(r => RequestController.formatRequest(r));
      return res.json(formattedRequests);
    } catch (error) {
      console.error('[LIST ERROR]', error);
      res.status(500).json({ error: 'Erro ao listar solicitações' });
    }
  }

  static async getDetails(req: ExpressRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const fullResponse = await RequestController.getFullResponse(id);
      if (!fullResponse) return res.status(404).json({ error: 'Solicitação não encontrada' });
      res.json(fullResponse);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar detalhes' });
    }
  }
}
