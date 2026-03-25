import { Request, Response } from 'express';
import { getRepository } from 'fireorm';
import { User } from '../models/Schemas.js';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { loginId } = req.body;
      if (!loginId) {
        return res.status(400).json({ error: 'Login ID é obrigatório' });
      }

      // Fallback para o Admin fixo da Fase 1 (facilitar testes)
      if (loginId.toUpperCase() === 'ADM-001') {
        return res.json({
          id: 'adm-001',
          name: 'Admin Financeiro',
          role: 'admin',
          level: 'Financeiro',
          loginId: 'ADM-001'
        });
      }

      const repo = getRepository(User);
      const user = await repo.whereEqualTo('loginId', loginId).findOne();

      if (!user || !user.active) {
        return res.status(401).json({ error: 'Login ID inválido ou usuário inativo' });
      }

      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        level: user.level,
        role: 'user', // Usuários cadastrados pelo Financeiro sempre entram com visão 'user' (Colaborador/Diretor)
        loginId: user.loginId,
        approverId: user.approverId
      });
    } catch (error) {
      console.error('Error during login:', error);
      return res.status(500).json({ error: 'Erro interno no servidor' });
    }
  }
}
