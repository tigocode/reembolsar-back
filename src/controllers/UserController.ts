import { Request, Response } from 'express';
import { getRepository } from 'fireorm';
import { User, UserLevel } from '../models/Schemas.js';

export class UserController {
  static async list(_req: Request, res: Response) {
    try {
      const repo = getRepository(User);
      const users = await repo.find();
      // Ordenar por nome
      const sortedUsers = users.sort((a, b) => a.name.localeCompare(b.name));
      return res.json(sortedUsers);
    } catch (error) {
      console.error('Error listing users:', error);
      return res.status(500).json({ error: 'Erro ao listar usuários' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { name, email, level, approverId, approverName } = req.body;
      const repo = getRepository(User);

      // Gerar um Login ID único: USR + 4 dígitos aleatórios
      // Em um cenário real, deveríamos validar a unicidade no banco
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const loginId = `USR-${randomDigits}`;

      const user = new User();
      user.name = name;
      user.email = level === UserLevel.DIRETOR ? email : (email || '');
      user.level = level as UserLevel;
      user.approverId = approverId;
      user.approverName = approverName;
      user.loginId = loginId;
      user.active = true;

      const created = await repo.create(user);
      return res.status(201).json(created);
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const repo = getRepository(User);
      await repo.delete(id);
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
  }
}
