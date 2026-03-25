# Reembolsar Back-end

API RESTful para gerenciamento de solicitações de reembolso, desenvolvida com Node.js, Express e Firebase Admin SDK.

## 📋 Pré-requisitos

- Node.js (v18 ou superior)
- npm
- Firebase Admin SDK configurado

## 🚀 Instalação

1. Clone o repositório:
   ```bash
   git clone <url-do-repositorio>
   cd reembolsar-back
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:
   Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
   ```env
   PORT=3001
   FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
   ```

## ⚙️ Configuração do Firebase

1. Obtenha o arquivo `serviceAccountKey.json` do console do Firebase
2. Coloque o arquivo na raiz do projeto
3. Verifique se a variável `FIREBASE_SERVICE_ACCOUNT_PATH` está apontando para o arquivo correto

## 🏃 Execução

### Desenvolvimento

```bash
npm run dev
```

### Produção

```bash
npm start
```

## 📂 Estrutura do Projeto

```
src/
├── controllers/      # Controladores das rotas
├── models/           # Modelos de dados e schemas
├── routes/           # Rotas da API
├── services/         # Lógica de negócio
├── utils/            # Funções utilitárias
└── index.ts          # Ponto de entrada da aplicação
```

## 🗄️ Banco de Dados

O projeto utiliza Firebase Firestore como banco de dados. As seguintes coleções são utilizadas:

- `requests`: Solicitações de reembolso
- `receipts`: Comprovantes de despesas
- `users`: Usuários do sistema
- `masterData`: Dados mestres (subsidiárias, departamentos, classes)

## 🔐 Autenticação

O sistema utiliza autenticação baseada em tokens JWT gerados pelo Firebase Admin SDK. As rotas protegidas requerem um token válido no header `Authorization`.

## 📝 Endpoints

### Autenticação

- `POST /api/auth/login`: Autenticar usuário

### Solicitações

- `GET /api/requests`: Listar solicitações (com filtros)
- `GET /api/requests/:id`: Obter solicitação por ID
- `POST /api/requests`: Criar nova solicitação
- `PATCH /api/requests/:id/draft`: Salvar rascunho
- `PATCH /api/requests/:id/status`: Atualizar status
- `DELETE /api/requests/:id`: Deletar solicitação

### Comprovantes

- `POST /api/receipts/process`: Processar comprovante (OCR)
- `GET /api/receipts/:id`: Obter comprovante

### Dados Mestres

- `GET /api/master/subsidiaries`: Listar subsidiárias
- `GET /api/master/departments`: Listar departamentos
- `GET /api/master/classes`: Listar classes

### Usuários

- `GET /api/users`: Listar usuários

## 🧪 Testes

```bash
npm test
```

## 📄 Licença

Este projeto é de propriedade da Codenu e está sob licença proprietária.
