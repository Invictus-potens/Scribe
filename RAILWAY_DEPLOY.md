# 🚀 Deploy no Railway

Este guia te ajudará a fazer o deploy da aplicação Scribe no Railway.

## 📋 Pré-requisitos

1. Conta no [Railway](https://railway.app)
2. Projeto configurado no Supabase
3. Código da aplicação pronto

## ⚙️ Configuração

### 1. Instale o CLI do Railway

```bash
npm install -g @railway/cli
```

### 2. Faça login no Railway

```bash
railway login
```

### 3. Inicialize o projeto

```bash
railway init
```

### 4. Configure as variáveis de ambiente

No painel do Railway ou via CLI:

```bash
railway variables set NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
railway variables set SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

### 5. Configure o Supabase para produção

1. No painel do Supabase, vá para "Authentication" > "Settings"
2. Adicione o domínio do Railway aos redirecionamentos:
   - `https://seu-app.railway.app`
   - `https://seu-app.railway.app/auth/callback`

### 6. Deploy

```bash
railway up
```

## 🔧 Configurações Avançadas

### Build Command
O Railway detectará automaticamente que é um projeto Next.js, mas você pode configurar manualmente:

```json
{
  "build": "next build",
  "start": "next start"
}
```

### Port Configuration
O Railway detectará automaticamente a porta, mas você pode configurar:

```bash
railway variables set PORT=3000
```

### Environment Variables
Certifique-se de que todas as variáveis estão configuradas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (opcional)
- `NODE_ENV=production`

## 🚨 Troubleshooting

### Erro de Build
Se o build falhar:

1. Verifique se todas as dependências estão no `package.json`
2. Confirme se o Node.js está na versão correta
3. Verifique os logs do Railway

### Erro de Variáveis de Ambiente
Se a aplicação não conseguir conectar ao Supabase:

1. Verifique se as variáveis estão configuradas corretamente
2. Confirme se as URLs do Supabase estão corretas
3. Teste as chaves no painel do Supabase

### Erro de Autenticação
Se o login não funcionar:

1. Verifique se os redirecionamentos estão configurados no Supabase
2. Confirme se o domínio do Railway está na lista de redirecionamentos
3. Teste o fluxo de autenticação localmente primeiro

## 📊 Monitoramento

### Logs
Acesse os logs em tempo real:

```bash
railway logs
```

### Métricas
No painel do Railway, você pode monitorar:
- Uso de CPU e memória
- Requisições por minuto
- Tempo de resposta
- Erros

## 🔄 Atualizações

Para atualizar a aplicação:

```bash
git add .
git commit -m "Update application"
railway up
```

## 🌐 Domínio Customizado

1. No painel do Railway, vá para "Settings"
2. Clique em "Custom Domains"
3. Adicione seu domínio
4. Configure os DNS conforme instruído

## 💰 Custos

O Railway oferece:
- **Free Tier**: $5 de crédito mensal
- **Pro**: $20/mês com mais recursos
- **Team**: $20/mês por usuário

## 🆘 Suporte

Se você encontrar problemas:

1. Verifique a [documentação do Railway](https://docs.railway.app)
2. Consulte os [fóruns da comunidade](https://community.railway.app)
3. Abra um ticket de suporte no Railway

---

**Dica**: Sempre teste localmente antes de fazer deploy! 🧪 