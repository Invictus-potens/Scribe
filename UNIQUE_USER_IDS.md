# Sistema de IDs Únicos para Usuários

## 🎯 **Objetivo**

Garantir que todos os usuários que fazem login no sistema tenham IDs únicos no Supabase, evitando conflitos e problemas de integridade de dados.

## 🔧 **Como Funciona**

### **1. Estrutura do Banco de Dados**

```sql
-- Tabela de usuários com ID único
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,  -- Email único
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Características importantes:**
- ✅ **ID único**: Cada usuário tem um UUID único do Supabase Auth
- ✅ **Email único**: Não permite emails duplicados
- ✅ **Referência**: ID referencia diretamente `auth.users(id)`
- ✅ **Cascade**: Se o usuário for deletado do auth, o perfil também é removido

### **2. Criação Automática de Perfis**

#### **Trigger Automático**
```sql
-- Função que cria perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que executa a função
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### **Função de Garantia**
```sql
-- Função para garantir que o perfil existe
CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
    INSERT INTO public.users (id, email, full_name)
    VALUES (user_id, user_email, user_full_name);
    RETURN TRUE;
  ELSE
    RETURN TRUE;
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RETURN FALSE;
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **3. Fluxo de Criação de Usuário**

```
1. Usuário se registra → Supabase Auth cria usuário
2. Trigger on_auth_user_created é executado
3. Função handle_new_user() cria perfil automaticamente
4. Se falhar, ensure_user_profile() garante criação
5. Usuário tem ID único garantido
```

## 🛡️ **Proteções Implementadas**

### **1. Constraints de Banco**
- ✅ **PRIMARY KEY**: ID único obrigatório
- ✅ **UNIQUE email**: Email único obrigatório
- ✅ **FOREIGN KEY**: Referência válida para auth.users
- ✅ **CASCADE DELETE**: Limpeza automática

### **2. Validações de Aplicação**
- ✅ **Verificação de existência**: Antes de criar perfil
- ✅ **Tratamento de erros**: Para emails duplicados
- ✅ **Fallback**: Múltiplas tentativas de criação
- ✅ **Logs**: Rastreamento de operações

### **3. Políticas de Segurança (RLS)**
```sql
-- Usuários só podem ver/editar seus próprios perfis
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

## 🔍 **Verificação e Diagnóstico**

### **Scripts de Verificação**

1. **`verify-user-system.sql`** - Verificação completa do sistema
2. **`fix-user-profiles.sql`** - Correção de perfis faltantes
3. **Funções de diagnóstico**:
   - `verify_user_profiles()` - Status geral
   - `create_missing_user_profiles()` - Criar perfis faltantes
   - `get_user_by_email()` - Buscar por email

### **Comandos de Verificação**

```sql
-- Verificar status geral
SELECT * FROM public.verify_user_profiles();

-- Verificar emails duplicados
SELECT email, COUNT(*) FROM public.users GROUP BY email HAVING COUNT(*) > 1;

-- Verificar usuários sem perfil
SELECT au.id, au.email FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
```

## 🚀 **Como Usar**

### **1. Configuração Inicial**

```bash
# Execute os scripts na ordem:
1. supabase-schema.sql      # Schema principal
2. fix-user-profiles.sql    # Corrigir perfis existentes
3. verify-user-system.sql   # Verificar tudo
```

### **2. No Código da Aplicação**

```typescript
// O sistema já está configurado para garantir perfis
const { data, error } = await authHelpers.ensureUserProfile(
  user.id, 
  user.email, 
  user.user_metadata?.full_name
);
```

### **3. Monitoramento**

```sql
-- Verificar periodicamente
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM public.users) as profiles,
  (SELECT COUNT(*) FROM auth.users au 
   LEFT JOIN public.users pu ON au.id = pu.id 
   WHERE pu.id IS NULL) as missing_profiles;
```

## 🐛 **Solução de Problemas**

### **Problema: Usuário sem perfil**
```sql
-- Solução: Criar perfil manualmente
SELECT public.ensure_user_profile(
  'user-uuid-here',
  'user@email.com',
  'User Name'
);
```

### **Problema: Email duplicado**
```sql
-- Solução: Verificar e limpar
SELECT email, COUNT(*) FROM public.users 
GROUP BY email HAVING COUNT(*) > 1;
```

### **Problema: Trigger não funciona**
```sql
-- Solução: Recriar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## ✅ **Garantias do Sistema**

1. **ID Único**: Cada usuário tem UUID único do Supabase Auth
2. **Email Único**: Não há emails duplicados
3. **Criação Automática**: Perfis criados automaticamente no registro
4. **Fallback**: Múltiplas camadas de proteção
5. **Integridade**: Referências válidas entre auth e public
6. **Segurança**: RLS protege dados dos usuários
7. **Monitoramento**: Scripts para verificar e corrigir

## 📊 **Métricas de Sucesso**

- ✅ **100% dos usuários auth têm perfis**
- ✅ **0 emails duplicados**
- ✅ **0 perfis órfãos**
- ✅ **Trigger funcionando corretamente**
- ✅ **RLS políticas ativas**

Este sistema garante que **todos os usuários que logarem terão IDs únicos** e perfis criados automaticamente no Supabase. 