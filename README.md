# Scribe - Plataforma de Produtividade

Uma aplicação web moderna para gerenciamento de tarefas, notas e colaboração em tempo real.

## 🚀 Funcionalidades

### 📋 **Gerenciamento de Tarefas**
- Quadro Kanban interativo
- Drag & drop intuitivo
- Categorização por status
- Priorização visual

### 📝 **Editor de Notas**
- Editor rico em texto
- Formatação avançada
- Salvamento automático
- Histórico de versões

### 🤖 **Assistente de IA**
- Integração com IA para produtividade
- Histórico de conversas

### 🔐 **Autenticação**
- Login seguro com Supabase
- Gerenciamento de perfis
- Recuperação de senha

### 🎨 **Interface Moderna**
- Design responsivo
- Modo escuro/claro
- Animações suaves
- Acessibilidade

## 🛠️ Tecnologias

- **Frontend**: Next.js 14, React 18, TypeScript
- **Estilização**: Tailwind CSS
- **Backend**: Supabase (Auth, Database)
- **Drag & Drop**: Dnd Kit
- **Estado**: React Hooks

## 📦 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/scribe.git
cd scribe
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp env.example .env.local
```

4. Configure as variáveis no arquivo `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

5. Execute o projeto:
```bash
npm run dev
```

6. Acesse `http://localhost:3000`

## 🗄️ Banco de Dados

Execute os scripts SQL na ordem:

1. `supabase-schema.sql` - Schema principal
2. `company-schema.sql` - Schema de empresas
3. `add-position-field.sql` - Campo de posição
4. `fix-user-profiles.sql` - Correções de perfis
5. `fix-signup-errors.sql` - Correções de cadastro
6. `fix-function-errors.sql` - Correções de funções

## 🎯 Próximos Passos

- [ ] Implementar notificações em tempo real
- [ ] Adicionar exportação de dados
- [ ] Criar API REST completa
- [ ] Implementar testes automatizados
- [ ] Adicionar mais integrações de IA

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 🆘 Suporte

1. Verifique a documentação
2. Procure por issues similares
3. Verifique os logs do console para erros
4. Abra uma issue no repositório
