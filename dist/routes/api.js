import { Router } from 'express';
import multer from 'multer';
import { RequestController } from '../controllers/RequestController.js';
import { ReceiptController } from '../controllers/ReceiptController.js';
const router = Router();
const upload = multer({ dest: 'uploads/' });
// Solicitações
router.post('/requests', RequestController.create);
router.get('/requests', RequestController.list);
router.get('/requests/:id', RequestController.getDetails);
router.patch('/requests/:id/status', RequestController.updateStatus);
router.patch('/requests/:id/draft', RequestController.updateDraft);
// Recibos (Upload + OCR)
router.post('/receipts/process', upload.single('image'), ReceiptController.uploadAndProcess);
export default router;
