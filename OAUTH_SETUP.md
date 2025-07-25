# Configuração de OAuth no Supabase

Este documento explica como configurar os provedores de OAuth (Google e GitHub) no Supabase para permitir login social.

## Configuração do Google OAuth

### 1. Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a API do Google+ (se necessário)

### 2. Configurar Credenciais OAuth

1. Vá para "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure o tipo de aplicação como "Web application"
4. Adicione as URLs autorizadas:
   - **Authorized JavaScript origins:**
     ```
     https://your-project-ref.supabase.co
     http://localhost:3000 (para desenvolvimento)
     ```
   - **Authorized redirect URIs:**
     ```
     https://your-project-ref.supabase.co/auth/v1/callback
     http://localhost:3000/auth/callback (para desenvolvimento)
     ```

### 3. Configurar no Supabase

1. Acesse o dashboard do Supabase
2. Vá para "Authentication" > "Providers"
3. Ative o Google provider
4. Adicione as credenciais:
   - **Client ID:** Seu Google Client ID
   - **Client Secret:** Seu Google Client Secret

## Configuração do GitHub OAuth

### 1. Criar OAuth App no GitHub

1. Acesse [GitHub Developer Settings](https://github.com/settings/developers)
2. Clique em "New OAuth App"
3. Preencha os campos:
   - **Application name:** Nome do seu app
   - **Homepage URL:** URL do seu site
   - **Authorization callback URL:** 
     ```
     https://your-project-ref.supabase.co/auth/v1/callback
     ```

### 2. Configurar no Supabase

1. Acesse o dashboard do Supabase
2. Vá para "Authentication" > "Providers"
3. Ative o GitHub provider
4. Adicione as credenciais:
   - **Client ID:** Seu GitHub Client ID
   - **Client Secret:** Seu GitHub Client Secret

## Configuração de URLs de Redirecionamento

### URLs Necessárias

Para que o OAuth funcione corretamente, você precisa configurar as seguintes URLs:

1. **URL de Redirecionamento Principal:**
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```

2. **URL de Redirecionamento para Desenvolvimento:**
   ```
   http://localhost:3000/auth/callback
   ```

3. **URL de Redirecionamento para Produção:**
   ```
   https://yourdomain.com/auth/callback
   ```

### Configuração no Código

O código já está configurado para usar as URLs corretas:

```typescript
// Em AuthModal.tsx
const { error } = await supabase.auth.signInWithOAuth({
  provider,
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
});
```

## Variáveis de Ambiente

Certifique-se de que suas variáveis de ambiente estão configuradas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Testando a Configuração

### 1. Teste Local

1. Execute `npm run dev`
2. Acesse `http://localhost:3000`
3. Tente fazer login com Google ou GitHub
4. Verifique se o redirecionamento funciona corretamente

### 2. Teste em Produção

1. Deploy sua aplicação
2. Configure as URLs de redirecionamento no Google/GitHub
3. Teste o login social

## Solução de Problemas

### Erro: "redirect_uri_mismatch"

- Verifique se as URLs de redirecionamento estão configuradas corretamente
- Certifique-se de que não há espaços extras ou caracteres especiais

### Erro: "invalid_client"

- Verifique se o Client ID e Client Secret estão corretos
- Certifique-se de que o OAuth app está ativo

### Erro: "access_denied"

- Verifique se o usuário autorizou o acesso
- Verifique as permissões configuradas no OAuth app

## Segurança

### Boas Práticas

1. **Nunca exponha Client Secrets** no código frontend
2. **Use HTTPS** em produção
3. **Configure URLs de redirecionamento** específicas
4. **Monitore logs** de autenticação
5. **Implemente rate limiting** se necessário

### Configurações de Segurança no Supabase

1. **Enable Row Level Security (RLS)** em todas as tabelas
2. **Configure políticas de acesso** adequadas
3. **Monitore tentativas de login** suspeitas
4. **Configure notificações** de segurança

## Próximos Passos

Após configurar o OAuth:

1. **Teste todos os fluxos** de autenticação
2. **Configure notificações** de email
3. **Implemente logout** adequado
4. **Adicione validação** de dados do usuário
5. **Configure backup** de autenticação

## Recursos Adicionais

- [Documentação do Supabase Auth](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps) 