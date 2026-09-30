# BabáAgendada 👶🍼

Sistema completo de agendamento de diárias, validação e controle financeiro para contratação de babás.

## 🚀 Funcionalidades

- **Módulo Clientes**:
  - Cadastro de solicitações de diárias individuais ou em lote (calendário interativo).
  - Opção de aplicar horário e valor padrão para todas as diárias ou personalizar por data.
  - Edição com replicação automática de horários/valores para todos os dias pendentes.
  - Bloqueio automático de alterações e cancelamentos após validação ("OK") da babá.
  - Notificação de pagamento realizado via Pix / Dinheiro / Transferência.

- **Módulo Babás Profissionais**:
  - Painel com resumo financeiro (Valores Recebidos e A Receber).
  - Confirmação de diárias com botão **"Dar OK (Validar)"** que fixa a data e o valor.
  - Opção de **"Recusar"** diárias com envio de justificativa para a cliente.
  - Confirmação de recebimento de pagamentos na conta.

- **Módulo Administrador**:
  - Relatório geral de diárias e faturamento da plataforma.
  - Gestão de usuários (clientes e babás cadastradas).
  - Trilha de auditoria completa com histórico de todas as ações e validações.

- **Segurança & Autenticação**:
  - Autenticação integrada com Firebase Auth (E-mail/Senha).
  - Controle de acesso baseado em papéis (RBAC: Cliente, Babá, Admin).
  - API Express segura e sincronização contínua de dados.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend**: Node.js, Express, TypeScript
- **Autenticação**: Firebase Authentication
- **Persistência**: Base de dados local com auditoria

## 📦 Como Rodar o Projeto

1. Clone o repositório:
```bash
git clone https://github.com/thiagogja27/baba.git
cd baba
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:3000`.

## 📜 Licença

Distribuído sob a licença MIT.
