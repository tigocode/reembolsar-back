import { Router } from 'express';
import multer from 'multer';
import { RequestController } from '../controllers/RequestController.js';
import { ReceiptController } from '../controllers/ReceiptController.js';
import { MasterDataController } from '../controllers/MasterDataController.js';
import { UserController } from '../controllers/UserController.js';
import { AuthController } from '../controllers/AuthController.js';

const router = Router();
router.post('/auth/login', AuthController.login);
const upload = multer({ dest: 'uploads/' });

// Solicitações
router.post('/requests', RequestController.create);
router.get('/requests', RequestController.list);
router.get('/requests/:id', RequestController.getDetails);
router.patch('/requests/:id/status', RequestController.updateStatus);
router.patch('/requests/:id/draft', RequestController.updateDraft);

// Recibos (Upload + OCR + Persistência)
router.post('/receipts/process', upload.single('image'), ReceiptController.uploadAndProcess);
router.post('/receipts', ReceiptController.createReceipt);

// Tabelas Mestras (Master Data)
router.get('/master/subsidiaries', MasterDataController.listSubsidiaries);
router.post('/master/subsidiaries', MasterDataController.createSubsidiary);
router.delete('/master/subsidiaries/:id', MasterDataController.deleteSubsidiary);

router.get('/master/departments', MasterDataController.listDepartments);
router.post('/master/departments', MasterDataController.createDepartment);
router.delete('/master/departments/:id', MasterDataController.deleteDepartment);

router.get('/master/classes', MasterDataController.listChargeClasses);
router.post('/master/classes', MasterDataController.createChargeClass);
router.delete('/master/classes/:id', MasterDataController.deleteChargeClass);

// Gestão de Usuários
router.get('/users', UserController.list);
router.post('/users', UserController.create);
router.delete('/users/:id', UserController.delete);

export default router;
