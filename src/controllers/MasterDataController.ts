import { Request as ExpressRequest, Response } from 'express';
import { getRepository } from 'fireorm';
import { Subsidiary, Department, ChargeClass } from '../models/Schemas.js';

export class MasterDataController {
  // Generic list method for any collection
  private static async listAll<T extends { active: boolean }>(repo: any) {
    return await repo.whereEqualTo('active', true).find();
  }

  static async listSubsidiaries(req: ExpressRequest, res: Response) {
    try {
      const repo = getRepository(Subsidiary);
      const data = await MasterDataController.listAll(repo);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar subsidiárias' });
    }
  }

  static async createSubsidiary(req: ExpressRequest, res: Response) {
    try {
      const { name } = req.body;
      const repo = getRepository(Subsidiary);
      const newItem = new Subsidiary();
      newItem.name = name;
      const saved = await repo.create(newItem);
      res.status(201).json(saved);
    } catch (error) {
       res.status(500).json({ error: 'Erro ao criar subsidiária' });
    }
  }

  static async listDepartments(req: ExpressRequest, res: Response) {
    try {
      const repo = getRepository(Department);
      const data = await MasterDataController.listAll(repo);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar departamentos' });
    }
  }

  static async createDepartment(req: ExpressRequest, res: Response) {
    try {
      const { name } = req.body;
      const repo = getRepository(Department);
      const newItem = new Department();
      newItem.name = name;
      const saved = await repo.create(newItem);
      res.status(201).json(saved);
    } catch (error) {
       res.status(500).json({ error: 'Erro ao criar departamento' });
    }
  }

  static async listChargeClasses(req: ExpressRequest, res: Response) {
    try {
      const repo = getRepository(ChargeClass);
      const data = await MasterDataController.listAll(repo);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar classes de custo' });
    }
  }

  static async createChargeClass(req: ExpressRequest, res: Response) {
    try {
      const { name, subsidiaryId } = req.body;
      const repo = getRepository(ChargeClass);
      const newItem = new ChargeClass();
      newItem.name = name;
      if (subsidiaryId) newItem.subsidiaryId = subsidiaryId;
      const saved = await repo.create(newItem);
      res.status(201).json(saved);
    } catch (error) {
       res.status(500).json({ error: 'Erro ao criar classe de custo' });
    }
  }

  static async deleteSubsidiary(req: ExpressRequest, res: Response) {
    try {
      const { id } = req.params;
      const repo = getRepository(Subsidiary);
      await repo.delete(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao excluir subsidiária' });
    }
  }

  static async deleteDepartment(req: ExpressRequest, res: Response) {
    try {
      const { id } = req.params;
      const repo = getRepository(Department);
      await repo.delete(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao excluir departamento' });
    }
  }

  static async deleteChargeClass(req: ExpressRequest, res: Response) {
    try {
      const { id } = req.params;
      const repo = getRepository(ChargeClass);
      await repo.delete(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao excluir classe de custo' });
    }
  }
}
