# Configuração do Supabase para o Projeto Scribe

Este guia explica como configurar o Supabase para o projeto Scribe.

## 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Escolha sua organização
5. Digite um nome para o projeto (ex: "scribe-app")
6. Escolha uma senha para o banco de dados
7. Escolha uma região próxima
8. Clique em "Create new project"

## 2. Configurar Variáveis de Ambiente

1. No painel do Supabase, vá para **Settings** > **API**
2. Copie a **URL** e a **anon public key**
3. Crie um arquivo `.env.local` na raiz do projeto com:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
```

## 3. Configurar o Banco de Dados

1. No painel do Supabase, vá para **SQL Editor**
2. Clique em **New query**
3. Cole o conteúdo do arquivo `supabase-schema.sql`
4. Clique em **Run** para executar o script

## 4. Configurar Autenticação

1. No painel do Supabase, vá para **Authentication** > **Settings**
2. Em **Site URL**, adicione: `http://localhost:3000`
3. Em **Redirect URLs**, adicione: `http://localhost:3000`
4. Salve as configurações

### Configuração Opcional para Produção

Se você planeja fazer deploy, adicione também:
- `https://seu-dominio.com`
- `https://seu-dominio.com/auth/callback`

## 5. Configurar Row Level Security (RLS)

O script SQL já configura as políticas RLS automaticamente. Isso garante que:
- Usuários só podem ver seus próprios dados
- Usuários só podem criar/editar/deletar seus próprios dados
- Dados são isolados por usuário

## 6. Testar a Configuração

1. Execute o projeto: `npm run dev`
2. Acesse `http://localhost:3000`
3. Tente criar uma conta ou fazer login
4. Teste criar notas, pastas e eventos

## 7. Estrutura das Tabelas

### Users
- `id`: UUID (referência ao auth.users)
- `email`: Email do usuário
- `full_name`: Nome completo
- `created_at`: Data de criação
- `updated_at`: Data de atualização

### Folders
- `id`: UUID único
- `name`: Nome da pasta
- `user_id`: ID do usuário proprietário
- `created_at`: Data de criação
- `updated_at`: Data de atualização

### Notes
- `id`: UUID único
- `user_id`: ID do usuário proprietário
- `title`: Título da nota
- `content`: Conteúdo da nota
- `folder`: Nome da pasta (opcional)
- `tags`: Array de tags
- `is_pinned`: Se a nota está fixada
- `is_private`: Se a nota é privada
- `created_at`: Data de criação
- `updated_at`: Data de atualização

### Tags
- `id`: UUID único
- `name`: Nome da tag
- `user_id`: ID do usuário proprietário
- `color`: Cor da tag (hex)
- `created_at`: Data de criação
- `updated_at`: Data de atualização

### Calendar Events
- `id`: UUID único
- `user_id`: ID do usuário proprietário
- `title`: Título do evento
- `description`: Descrição do evento
- `start_date`: Data/hora de início
- `end_date`: Data/hora de fim (opcional)
- `all_day`: Se é evento de dia inteiro
- `color`: Cor do evento
- `reminder_minutes`: Minutos antes do lembrete
- `reminder_set`: Se o lembrete está ativo
- `created_at`: Data de criação
- `updated_at`: Data de atualização

## 8. Funcionalidades Implementadas

- ✅ Autenticação com email/senha
- ✅ Criação automática de perfil de usuário
- ✅ CRUD de notas
- ✅ CRUD de pastas
- ✅ CRUD de tags
- ✅ CRUD de eventos do calendário
- ✅ Row Level Security (RLS)
- ✅ Atualização automática de timestamps
- ✅ Índices para performance

## 9. Próximos Passos

1. Implementar autenticação social (Google, GitHub)
2. Adicionar upload de arquivos
3. Implementar notificações push
4. Adicionar backup automático
5. Implementar busca avançada

## 10. Troubleshooting

### Erro de CORS
- Verifique se as URLs estão corretas nas configurações de autenticação

### Erro de RLS
- Verifique se as políticas foram criadas corretamente
- Confirme se o usuário está autenticado

### Erro de conexão
- Verifique se as variáveis de ambiente estão corretas
- Confirme se o projeto está ativo no Supabase

## 11. Recursos Úteis

- [Documentação do Supabase](https://supabase.com/docs)
- [Guia de Autenticação](https://supabase.com/docs/guides/auth)
- [Guia de RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [API Reference](https://supabase.com/docs/reference/javascript) 