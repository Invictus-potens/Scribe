# Scribe - Your Ultimate Productivity Workspace

Scribe é uma aplicação completa de produtividade que combina notas, calendário, kanban board e assistente de IA em uma interface moderna e intuitiva.

## 🚀 Funcionalidades

### 📝 **Sistema de Notas**
- Editor de texto rico com formatação
- Organização por pastas
- Sistema de tags
- Notas fixadas
- Busca avançada
- Modo de visualização dividida

### 📅 **Calendário**
- Visualização mensal
- Criação e edição de eventos
- Lembretes configuráveis
- Cores personalizadas para eventos
- Integração com banco de dados

### 📋 **Kanban Board**
- Quadros personalizáveis
- Colunas customizáveis
- Cards com prioridades, tags e datas
- Drag & drop para mover cards
- Sistema de cores por prioridade

### 🤖 **Assistente de IA**
- Interface conversacional
- Integração com IA para produtividade
- Histórico de conversas

### 🔐 **Autenticação**
- Login/Registro com email e senha
- Confirmação de email via Supabase
- Sessões persistentes
- Logout seguro

## 🛠️ Tecnologias

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Deploy**: Railway (configurado)

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta no Supabase
- Conta no Railway (opcional para deploy)

## ⚙️ Configuração

### 1. Clone o repositório
```bash
git clone <seu-repositorio>
cd Scribe
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o Supabase

#### 3.1 Crie um projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie uma nova conta ou faça login
3. Crie um novo projeto
4. Anote a URL e a chave anônima

#### 3.2 Configure o banco de dados
1. No painel do Supabase, vá para "SQL Editor"
2. Execute o conteúdo do arquivo `supabase-schema.sql`
3. Isso criará todas as tabelas e políticas de segurança necessárias

#### 3.3 Configure a autenticação
1. No painel do Supabase, vá para "Authentication" > "Settings"
2. Configure o redirecionamento de email para: `http://localhost:3000`
3. Ative a confirmação de email

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase

# Optional: Supabase Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

### 5. Execute o projeto
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 🚀 Deploy no Railway

### 1. Conecte ao Railway
```bash
npm install -g @railway/cli
railway login
```

### 2. Configure as variáveis de ambiente no Railway
1. Acesse o painel do Railway
2. Vá para "Variables"
3. Adicione as mesmas variáveis do `.env.local`

### 3. Deploy
```bash
railway up
```

## 📊 Estrutura do Banco de Dados

### Tabelas Principais:
- **users**: Perfis de usuários
- **notes**: Notas com tags e pastas
- **folders**: Pastas para organização
- **tags**: Tags personalizadas
- **calendar_events**: Eventos do calendário
- **kanban_boards**: Quadros kanban
- **kanban_columns**: Colunas dos quadros
- **kanban_cards**: Cards com prioridades e tags

### Segurança:
- Row Level Security (RLS) habilitado
- Políticas de acesso por usuário
- Triggers para timestamps automáticos

## 🎨 Funcionalidades Implementadas

### ✅ Autenticação Completa
- [x] Registro com confirmação de email
- [x] Login seguro
- [x] Sessões persistentes
- [x] Logout

### ✅ Sistema de Notas
- [x] CRUD completo de notas
- [x] Editor de texto rico
- [x] Sistema de pastas
- [x] Tags personalizadas
- [x] Busca avançada
- [x] Notas fixadas

### ✅ Calendário
- [x] Visualização mensal
- [x] Criação de eventos
- [x] Edição e exclusão
- [x] Lembretes
- [x] Cores personalizadas

### ✅ Kanban Board
- [x] Quadros personalizáveis
- [x] Drag & drop
- [x] Cards com metadados
- [x] Sistema de prioridades
- [x] Tags nos cards

### ✅ Interface
- [x] Design responsivo
- [x] Modo escuro/claro
- [x] Componentes reutilizáveis
- [x] UX otimizada

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento local
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # Verificação de código
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Se você encontrar algum problema ou tiver dúvidas:

1. Verifique se todas as variáveis de ambiente estão configuradas
2. Confirme se o schema do banco foi executado corretamente
3. Verifique os logs do console para erros
4. Abra uma issue no repositório

## 🎯 Próximos Passos

- [ ] Integração com Google Calendar
- [ ] Notificações push
- [ ] Compartilhamento de notas
- [ ] Templates de notas
- [ ] Backup automático
- [ ] API pública
- [ ] Mobile app

---

**Scribe** - Transformando sua produtividade com uma interface moderna e funcionalidades poderosas! 🚀
