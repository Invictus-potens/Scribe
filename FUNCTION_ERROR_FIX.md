# Correção do Erro de Função PostgreSQL

## 🚨 **Erro Encontrado**

```
ERROR: 42P13: cannot change return type of existing function
HINT: Use DROP FUNCTION create_missing_user_profiles() first.
```

## 🔧 **Causa do Problema**

O erro ocorre quando tentamos alterar o tipo de retorno de uma função que já existe no banco de dados. O PostgreSQL não permite alterar o tipo de retorno de uma função existente sem removê-la primeiro.

## ✅ **Solução**

### **Opção 1: Usar o Script de Correção (Recomendado)**

Execute o arquivo `fix-function-errors.sql` no editor SQL do Supabase:

```sql
-- Execute este script no Supabase SQL Editor
-- fix-function-errors.sql
```

### **Opção 2: Correção Manual**

Se preferir fazer manualmente, execute os comandos na seguinte ordem:

```sql
-- 1. Remover as funções existentes
DROP FUNCTION IF EXISTS public.create_missing_user_profiles();
DROP FUNCTION IF EXISTS public.verify_user_profiles();
DROP FUNCTION IF EXISTS public.get_user_by_email(TEXT);
DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID, TEXT, TEXT);

-- 2. Recriar as funções com os novos tipos de retorno
-- (Execute o conteúdo do supabase-schema.sql novamente)
```

### **Opção 3: Verificar e Corrigir**

```sql
-- Verificar funções existentes
SELECT 
  routine_name,
  data_type,
  parameter_defaults
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'create_missing_user_profiles',
  'verify_user_profiles',
  'get_user_by_email',
  'ensure_user_profile'
);

-- Remover funções problemáticas
DROP FUNCTION IF EXISTS public.create_missing_user_profiles();
DROP FUNCTION IF EXISTS public.verify_user_profiles();
DROP FUNCTION IF EXISTS public.get_user_by_email(TEXT);
DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID, TEXT, TEXT);
```

## 🚀 **Passos para Resolver**

### **1. Execute o Script de Correção**

```bash
# No Supabase SQL Editor, execute:
fix-function-errors.sql
```

### **2. Verifique se as Funções Foram Criadas**

```sql
-- Verificar se as funções foram criadas corretamente
SELECT 
  routine_name,
  data_type as return_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'create_missing_user_profiles',
  'verify_user_profiles',
  'get_user_by_email',
  'ensure_user_profile'
);
```

### **3. Teste as Funções**

```sql
-- Testar a função de verificação
SELECT * FROM public.verify_user_profiles();

-- Testar a função de criação de perfis
SELECT * FROM public.create_missing_user_profiles();

-- Testar a função de garantia de perfil
SELECT public.ensure_user_profile(
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT email FROM auth.users LIMIT 1),
  'Test User'
);
```

## 🛡️ **Prevenção**

Para evitar esse erro no futuro:

1. **Sempre use `DROP FUNCTION IF EXISTS`** antes de `CREATE OR REPLACE`
2. **Verifique os tipos de retorno** antes de alterar funções
3. **Use scripts de migração** para alterações de schema
4. **Teste em ambiente de desenvolvimento** primeiro

## 📋 **Comandos Úteis**

### **Verificar Funções Existentes**
```sql
SELECT 
  routine_name,
  data_type,
  parameter_defaults
FROM information_schema.routines 
WHERE routine_schema = 'public';
```

### **Remover Todas as Funções (Cuidado!)**
```sql
-- ⚠️ CUIDADO: Remove todas as funções do schema public
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT routine_name, routine_type
    FROM information_schema.routines 
    WHERE routine_schema = 'public'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS public.' || func_record.routine_name || ' CASCADE';
  END LOOP;
END $$;
```

### **Verificar Permissões**
```sql
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public';
```

## ✅ **Verificação Final**

Após executar a correção, verifique se tudo está funcionando:

```sql
-- 1. Verificar status dos perfis
SELECT * FROM public.verify_user_profiles();

-- 2. Testar criação de perfil
SELECT public.ensure_user_profile(
  gen_random_uuid(),
  'test@example.com',
  'Test User'
);

-- 3. Verificar permissões
SELECT 
  grantee,
  privilege_type
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public';
```

## 🎯 **Resultado Esperado**

Após a correção, você deve ver:

- ✅ Funções criadas sem erros
- ✅ Tipos de retorno corretos
- ✅ Permissões adequadas
- ✅ Funções funcionando corretamente

Se ainda houver problemas, execute o script `verify-user-system.sql` para uma verificação completa do sistema. 