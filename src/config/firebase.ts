import admin from 'firebase-admin';
import { initialize } from 'fireorm';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

let serviceAccount: any;
const saValue = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!saValue) {
  console.error('❌ ERRO: A variável FIREBASE_SERVICE_ACCOUNT não foi encontrada no arquivo .env');
  process.exit(1);
}

try {
  // 1. Tentar ler como o caminho de um arquivo físico
  if (fs.existsSync(saValue)) {
    const fileContent = fs.readFileSync(saValue, 'utf8');
    serviceAccount = JSON.parse(fileContent);
  } 
  // 2. Caso contrário, tratar como uma string JSON diretamente
  else {
    serviceAccount = JSON.parse(saValue);
  }
} catch (error) {
  console.error('❌ ERRO CRÍTICO AO LER CREDENCIAIS DO FIREBASE:');
  console.error('- Verifique se o conteúdo da variável FIREBASE_SERVICE_ACCOUNT no .env é um JSON válido.');
  console.error('- Certifique-se de não usar placeholders como "..." no JSON.');
  console.error('- Erro técnico:', (error as Error).message);
  process.exit(1);
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin inicializado com sucesso.');
  } catch (error) {
    console.error('❌ ERRO AO INICIALIZAR FIREBASE ADMIN:', (error as Error).message);
    process.exit(1);
  }
}

const firestore = admin.firestore();
firestore.settings({ ignoreUndefinedProperties: true });
initialize(firestore);

export { firestore, admin };