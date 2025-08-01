# Fix para Erro de Signup (500 Internal Server Error)

## Problema Identificado

O erro 500 no signup está relacionado ao trigger `handle_new_user` que tenta criar automaticamente um perfil de usuário na tabela `public.users` quando um novo usuário se registra. O problema pode ser causado por:

1. **Problemas de permissões no banco de dados**
2. **Conflitos de constraint unique**
3. **Problemas na função `handle_new_user`**
4. **Políticas RLS (Row Level Security) mal configuradas**

## Soluções Implementadas

### 1. Melhorias no Código Frontend

- **Logs de Debug**: Adicionados logs detalhados para rastrear o processo de signup
- **Tratamento de Erros Robusto**: Melhor tratamento de erros com fallbacks
- **Feedback Melhorado**: Mensagens de erro mais claras para o usuário

### 2. Script SQL de Correção

Execute o script `fix-signup-errors.sql` no seu banco de dados Supabase:

```sql
-- Execute este script no SQL Editor do Supabase
-- Este script irá:
-- 1. Recriar o trigger com melhor tratamento de erros
-- 2. Corrigir as políticas RLS
-- 3. Garantir permissões adequadas
```

### 3. Como Aplicar a Correção

#### Passo 1: Execute o Script SQL
1. Acesse o dashboard do Supabase
2. Vá para "SQL Editor"
3. Execute o conteúdo do arquivo `fix-signup-errors.sql`

#### Passo 2: Verifique as Configurações
1. **Auth Settings**: Verifique se o email confirmation está configurado corretamente
2. **RLS Policies**: Confirme que as políticas estão aplicadas corretamente
3. **Permissions**: Verifique se as permissões estão adequadas

#### Passo 3: Teste o Signup
1. Tente criar uma nova conta
2. Verifique os logs no console do navegador
3. Confirme se o usuário foi criado corretamente

## Estrutura do Banco de Dados

### Tabela `users`
```sql
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Trigger `handle_new_user`
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    BEGIN
      INSERT INTO public.users (id, email, full_name)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL)
      );
      RAISE NOTICE 'User profile created for: %', NEW.email;
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'User with email % already exists', NEW.email;
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creating user profile: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Troubleshooting

### Se o erro persistir:

1. **Verifique os Logs do Supabase**:
   - Acesse "Logs" no dashboard
   - Procure por erros relacionados ao trigger

2. **Teste a Função Manualmente**:
   ```sql
   SELECT * FROM public.ensure_user_profile(
     'user-uuid-here',
     'test@example.com',
     'Test User'
   );
   ```

3. **Verifique as Permissões**:
   ```sql
   -- Verifique se as políticas RLS estão ativas
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
   FROM pg_policies 
   WHERE tablename = 'users';
   ```

4. **Teste o Trigger**:
   ```sql
   -- Verifique se o trigger existe
   SELECT trigger_name, event_manipulation, action_statement
   FROM information_schema.triggers
   WHERE event_object_table = 'users';
   ```

## Configurações Recomendadas

### Auth Settings no Supabase:
- **Enable email confirmations**: Sim (recomendado)
- **Secure email change**: Sim
- **Enable phone confirmations**: Não (opcional)

### RLS Policies:
- **Users can view own profile**: `auth.uid() = id`
- **Users can update own profile**: `auth.uid() = id`
- **Users can insert own profile**: `auth.uid() = id`
- **Allow trigger to insert user profiles**: `true`

## Logs de Debug

O código agora inclui logs detalhados que você pode verificar no console do navegador:

```
Starting signup process for: user@example.com
Auth signup successful, user: uuid-here
User created, email confirmation required
```

Se você vir erros específicos nos logs, eles ajudarão a identificar o problema exato.

## Contato

Se o problema persistir após aplicar estas correções, verifique:
1. Os logs do console do navegador
2. Os logs do Supabase
3. As configurações de Auth no dashboard do Supabase 