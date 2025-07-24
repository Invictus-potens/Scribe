# Scribe - Your Ultimate Productivity Workspace

Scribe é uma aplicação completa de produtividade construída com Next.js e Supabase, oferecendo um workspace integrado para gerenciar notas, calendário, kanban e assistente de IA.

## 🚀 Funcionalidades

- **📝 Editor de Notas Avançado**: Crie, edite e organize suas notas com formatação rica
- **📁 Sistema de Pastas**: Organize suas notas em pastas personalizadas
- **🏷️ Sistema de Tags**: Marque e categorize suas notas com tags coloridas
- **📅 Calendário Integrado**: Gerencie eventos e lembretes
- **📋 Kanban Board**: Organize tarefas em um quadro visual
- **🤖 Assistente de IA**: Integração com IA para melhorar sua produtividade
- **🌙 Modo Escuro**: Interface adaptável com tema claro/escuro
- **🔐 Autenticação Segura**: Sistema de login/registro com Supabase Auth
- **📱 Responsivo**: Funciona perfeitamente em desktop e mobile

## 🛠️ Tecnologias

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React Icons
- **Calendar**: React Big Calendar
- **Drag & Drop**: DND Kit
- **Charts**: Recharts

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta no Supabase
- npm, yarn, pnpm ou bun

## 🚀 Configuração Rápida

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd scribe
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o Supabase

Siga o guia detalhado em [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 5. Execute o projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) para ver a aplicação.

## 📁 Estrutura do Projeto

```
scribe/
├── app/                    # App Router do Next.js
│   ├── globals.css        # Estilos globais
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Página inicial
├── components/            # Componentes React
│   ├── AIAssistant.tsx    # Assistente de IA
│   ├── AuthModal.tsx      # Modal de autenticação
│   ├── Calendar.tsx       # Componente do calendário
│   ├── Header.tsx         # Cabeçalho da aplicação
│   ├── KanbanBoard.tsx    # Quadro Kanban
│   ├── NotesEditor.tsx    # Editor de notas
│   └── Sidebar.tsx        # Barra lateral
├── lib/                   # Utilitários e configurações
│   └── supabase.ts        # Cliente e helpers do Supabase
├── supabase-schema.sql    # Schema do banco de dados
└── SUPABASE_SETUP.md      # Guia de configuração do Supabase
```

## 🔧 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Constrói a aplicação para produção
- `npm run start` - Inicia o servidor de produção
- `npm run lint` - Executa o linter

## 📊 Banco de Dados

O projeto usa Supabase com as seguintes tabelas:

- **users**: Perfis de usuários
- **folders**: Pastas para organizar notas
- **notes**: Notas dos usuários
- **tags**: Tags para categorização
- **calendar_events**: Eventos do calendário

Todas as tabelas incluem Row Level Security (RLS) para garantir que os usuários só acessem seus próprios dados.

## 🎨 Personalização

### Temas
A aplicação suporta temas claro e escuro, que podem ser alternados através do botão no cabeçalho.

### Cores
As cores podem ser personalizadas editando o arquivo `tailwind.config.js`.

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Se você encontrar algum problema ou tiver dúvidas:

1. Verifique o [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
2. Abra uma issue no GitHub
3. Consulte a documentação do [Supabase](https://supabase.com/docs)

## 🔮 Roadmap

- [ ] Autenticação social (Google, GitHub)
- [ ] Upload de arquivos
- [ ] Notificações push
- [ ] Backup automático
- [ ] Busca avançada
- [ ] Compartilhamento de notas
- [ ] Sincronização offline
- [ ] API REST pública
