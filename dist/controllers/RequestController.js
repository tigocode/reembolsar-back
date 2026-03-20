import { getRepository } from 'fireorm';
import { Request, RequestStatus, Receipt, History } from '../models/Schemas.js';
export class RequestController {
    static async create(req, res) {
        try {
            const requestRepo = getRepository(Request);
            const historyRepo = getRepository(History);
            const { title, type, project, paymentMethod, location, status, userId } = req.body;
            const newRequest = new Request();
            newRequest.userId = userId || 'unknown';
            newRequest.title = title;
            newRequest.type = type;
            newRequest.project = project;
            newRequest.paymentMethod = paymentMethod;
            newRequest.location = location;
            newRequest.date = new Date();
            newRequest.status = status || RequestStatus.RASCUNHO;
            newRequest.totalValue = 0;
            newRequest.isMultiple = false;
            const savedRequest = await requestRepo.create(newRequest);
            const initialHistory = new History();
            initialHistory.solicitacaoId = savedRequest.id;
            initialHistory.action = status === RequestStatus.PENDENTE ? 'Solicitação criada e enviada para aprovação' : 'Rascunho inicial criado';
            initialHistory.date = new Date();
            initialHistory.userName = userId || 'Colaborador';
            await historyRepo.create(initialHistory);
            res.status(201).json(savedRequest);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao criar solicitação' });
        }
    }
    static async updateStatus(req, res) {
        try {
            const id = req.params.id;
            const { status, note, userName } = req.body;
            const requestRepo = getRepository(Request);
            const historyRepo = getRepository(History);
            const request = await requestRepo.findById(id);
            if (!request)
                return res.status(404).json({ error: 'Solicitação não encontrada' });
            if ((status === RequestStatus.DEVOLVIDO || status === RequestStatus.REJEITADO) && !note) {
                return res.status(400).json({ error: 'O preenchimento do campo "note" (observação) é obrigatório para devoluções ou rejeições.' });
            }
            request.status = status;
            await requestRepo.update(request);
            const actionMap = {
                [RequestStatus.APROVADO]: 'Aprovado pelo Financeiro',
                [RequestStatus.DEVOLVIDO]: 'Devolvido para Correção',
                [RequestStatus.REJEITADO]: 'Rejeitado pelo Financeiro',
            };
            const history = new History();
            history.solicitacaoId = id;
            history.action = actionMap[status] || `Status alterado para ${status}`;
            history.date = new Date();
            history.userName = userName || 'Admin Financeiro';
            history.note = note;
            await historyRepo.create(history);
            res.json(request);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao atualizar status' });
        }
    }
    static async updateDraft(req, res) {
        try {
            const id = req.params.id;
            const payload = req.body;
            const requestRepo = getRepository(Request);
            const historyRepo = getRepository(History);
            const receiptRepo = getRepository(Receipt);
            const request = await requestRepo.findById(id);
            if (!request)
                return res.status(404).json({ error: 'Rascunho não encontrado' });
            const currentReceipts = await receiptRepo.whereEqualTo('solicitacaoId', id).find();
            const currentReceiptsCount = currentReceipts.length;
            const payloadReceiptsCount = payload.receipts ? payload.receipts.length : currentReceiptsCount;
            let actionMessage = 'Rascunho guardado';
            if (payloadReceiptsCount > currentReceiptsCount)
                actionMessage = 'Novo recibo adicionado ao rascunho';
            else if (payloadReceiptsCount < currentReceiptsCount)
                actionMessage = 'Recibo removido do rascunho';
            else if (payload.totalValue !== request.totalValue)
                actionMessage = 'Valores do rascunho atualizados';
            Object.assign(request, payload);
            await requestRepo.update(request);
            const history = new History();
            history.solicitacaoId = id;
            history.action = actionMessage;
            history.date = new Date();
            history.userName = payload.userId || 'Colaborador';
            await historyRepo.create(history);
            res.json(request);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao atualizar rascunho' });
        }
    }
    static async list(req, res) {
        try {
            const role = req.query.role;
            const userId = req.query.userId;
            const requestRepo = getRepository(Request);
            if (role === 'admin') {
                const requests = await requestRepo.whereArrayContainsAny('status', [
                    RequestStatus.PENDENTE,
                    RequestStatus.APROVADO,
                    RequestStatus.REJEITADO,
                    RequestStatus.DEVOLVIDO
                ]).find();
                return res.json(requests);
            }
            else {
                const requests = await requestRepo.whereEqualTo('userId', userId).find();
                return res.json(requests);
            }
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao listar solicitações' });
        }
    }
    static async getDetails(req, res) {
        try {
            const id = req.params.id;
            const requestRepo = getRepository(Request);
            const receiptRepo = getRepository(Receipt);
            const historyRepo = getRepository(History);
            const request = await requestRepo.findById(id);
            if (!request)
                return res.status(404).json({ error: 'Solicitação não encontrada' });
            const receipts = await receiptRepo.whereEqualTo('solicitacaoId', id).find();
            const history = await historyRepo.whereEqualTo('solicitacaoId', id).find();
            res.json({ ...request, receipts, history });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao buscar detalhes' });
        }
    }
}
