# Teste das Funcionalidades do Calendário

## Pré-requisitos

1. **Banco de Dados**: Certifique-se de que o schema do Supabase foi aplicado
2. **Autenticação**: Usuário deve estar logado no sistema
3. **Notificações**: Navegador deve suportar Web Notifications API

## Testes a Realizar

### 1. Teste de Salvamento no Banco de Dados

**Objetivo**: Verificar se os eventos são salvos corretamente no banco de dados.

**Passos**:
1. Abra o calendário
2. Clique em "New Event"
3. Preencha os campos:
   - Title: "Teste de Evento"
   - Date: Data atual
   - Time: Hora atual + 1 hora
   - Description: "Descrição do teste"
4. Clique em "Create Event"
5. Verifique se o evento aparece no calendário
6. Recarregue a página e verifique se o evento persiste

**Resultado Esperado**: ✅ Evento deve ser salvo e persistir após recarregar

### 2. Teste de Sincronização dos Dias da Semana

**Objetivo**: Verificar se os dias da semana estão alinhados corretamente.

**Passos**:
1. Observe o calendário atual
2. Verifique se o primeiro dia do mês está na coluna correta
3. Navegue para o mês anterior e próximo
4. Verifique se a sincronização se mantém

**Resultado Esperado**: ✅ Dias devem estar alinhados corretamente com os cabeçalhos (Sun, Mon, Tue, etc.)

### 3. Teste de Seleção de Cores

**Objetivo**: Verificar se a seleção de cores funciona corretamente.

**Passos**:
1. Clique em "New Event"
2. Observe a seção "Event Color"
3. Clique em diferentes cores
4. Verifique se a cor selecionada fica destacada
5. Crie o evento
6. Verifique se a cor aparece corretamente no calendário

**Resultado Esperado**: ✅ Cores devem ser selecionáveis e aplicadas aos eventos

### 4. Teste de Sistema de Lembretes

**Objetivo**: Verificar se as notificações funcionam corretamente.

**Passos**:
1. Verifique se há um botão "Enable Notifications"
2. Clique no botão se necessário
3. Permita notificações no navegador
4. Crie um evento com:
   - Data: Hoje
   - Hora: 15 minutos a partir de agora
   - Marque "Set reminder"
5. Aguarde 15 minutos
6. Verifique se a notificação aparece

**Resultado Esperado**: ✅ Notificação deve aparecer 15 minutos antes do evento

### 5. Teste de Navegação entre Meses

**Objetivo**: Verificar se a navegação entre meses funciona.

**Passos**:
1. Observe o mês atual
2. Clique na seta para o mês anterior
3. Verifique se o mês muda corretamente
4. Clique na seta para o próximo mês
5. Verifique se volta ao mês original

**Resultado Esperado**: ✅ Navegação deve funcionar corretamente

### 6. Teste de Exclusão de Eventos

**Objetivo**: Verificar se a exclusão de eventos funciona.

**Passos**:
1. Crie um evento de teste
2. Clique no dia do evento
3. No painel lateral, clique no ícone de lixeira
4. Verifique se o evento desaparece
5. Recarregue a página
6. Verifique se o evento não reaparece

**Resultado Esperado**: ✅ Evento deve ser excluído permanentemente

### 7. Teste de Responsividade

**Objetivo**: Verificar se o calendário funciona em diferentes tamanhos de tela.

**Passos**:
1. Teste em desktop (tela grande)
2. Redimensione a janela para tablet
3. Redimensione para mobile
4. Verifique se todos os elementos permanecem funcionais

**Resultado Esperado**: ✅ Interface deve ser responsiva

## Verificações no Banco de Dados

### Consulta para Verificar Eventos Criados:
```sql
SELECT 
  id,
  title,
  description,
  start_date,
  color,
  reminder_set,
  reminder_minutes,
  created_at
FROM calendar_events 
WHERE user_id = 'SEU_USER_ID'
ORDER BY start_date DESC;
```

### Verificar Políticas RLS:
```sql
-- Verificar se as políticas estão ativas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'calendar_events';
```

## Problemas Comuns e Soluções

### 1. Eventos não aparecem
- **Causa**: Usuário não autenticado
- **Solução**: Fazer login no sistema

### 2. Notificações não funcionam
- **Causa**: Permissão negada pelo navegador
- **Solução**: Habilitar notificações nas configurações do navegador

### 3. Cores não aparecem
- **Causa**: CSS não carregado
- **Solução**: Verificar se Tailwind CSS está funcionando

### 4. Erro ao salvar evento
- **Causa**: Problema de conexão com Supabase
- **Solução**: Verificar variáveis de ambiente e conexão

## Logs para Debug

### Console do Navegador:
```javascript
// Verificar se eventos estão sendo carregados
console.log('Events loaded:', events);

// Verificar permissão de notificações
console.log('Notification permission:', Notification.permission);

// Verificar usuário autenticado
console.log('User authenticated:', isAuthenticated);
```

### Logs do Supabase:
- Verificar logs de erro no dashboard do Supabase
- Verificar se as políticas RLS estão funcionando
- Verificar se os triggers estão executando

## Critérios de Sucesso

✅ **Funcionalidade Completa**: Todas as 4 funcionalidades principais implementadas
✅ **Integração**: Eventos salvos corretamente no banco de dados
✅ **Sincronização**: Dias da semana alinhados corretamente
✅ **Cores**: Sistema de seleção de cores funcionando
✅ **Notificações**: Sistema de lembretes funcionando
✅ **UX**: Interface intuitiva e responsiva
✅ **Segurança**: Autenticação e RLS funcionando 