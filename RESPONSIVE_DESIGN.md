# Sistema de Design Responsivo - Scribe

## Visão Geral

O Scribe agora possui um sistema de design responsivo completo que se adapta automaticamente ao tamanho do monitor. O sistema utiliza CSS custom properties (variáveis CSS), breakpoints personalizados do Tailwind CSS e hooks React para detectar e responder às mudanças de resolução em tempo real.

## Breakpoints Implementados

| Breakpoint | Largura Mínima | Dispositivo | Sidebar Width | Header Height | Content Padding |
|------------|----------------|-------------|---------------|---------------|-----------------|
| xs         | 475px          | Mobile      | 280px         | 60px          | 1rem            |
| sm         | 640px          | Mobile      | 320px         | 64px          | 1.25rem         |
| md         | 768px          | Tablet      | 360px         | 68px          | 1.5rem          |
| lg         | 1024px         | Desktop     | 400px         | 72px          | 2rem            |
| xl         | 1280px         | Desktop     | 440px         | 76px          | 2.5rem          |
| 2xl        | 1536px         | Large Desktop | 480px      | 80px          | 3rem            |
| 3xl        | 1920px         | Large Desktop | 520px      | 84px          | 3.5rem          |
| 4xl        | 2560px         | Ultra Wide  | 560px         | 88px          | 4rem            |
| 5xl        | 3840px         | Ultra Wide  | 600px         | 92px          | 4.5rem          |

## Características do Sistema

### 1. CSS Custom Properties
- **Variáveis Dinâmicas**: O sistema usa variáveis CSS que mudam automaticamente baseadas no breakpoint atual
- **Transições Suaves**: Mudanças de tamanho são aplicadas instantaneamente sem recarregamento
- **Consistência**: Todos os componentes usam as mesmas variáveis para manter consistência

### 2. Classes Utilitárias Responsivas
- **Texto Responsivo**: Classes como `text-responsive-xl` que usam `clamp()` para escalar suavemente
- **Espaçamento Responsivo**: Classes como `space-responsive-lg` para gaps adaptativos
- **Padding/Margin Responsivo**: Classes como `p-responsive-md` para espaçamento adaptativo

### 3. Hooks React Personalizados

#### `useResponsive()`
```typescript
const screenSize = useResponsive();
// Retorna: { width, height, isMobile, isTablet, isDesktop, isLargeDesktop, isUltraWide, breakpoint }
```

#### `useOrientation()`
```typescript
const orientation = useOrientation();
// Retorna: 'portrait' | 'landscape'
```

#### `useTouchDevice()`
```typescript
const isTouchDevice = useTouchDevice();
// Retorna: boolean
```

#### `usePixelDensity()`
```typescript
const pixelDensity = usePixelDensity();
// Retorna: number (ex: 1, 2, 3)
```

## Como Usar

### 1. Classes CSS Responsivas
```jsx
// Texto que escala automaticamente
<h1 className="text-responsive-3xl">Título Responsivo</h1>

// Espaçamento que se adapta
<div className="space-responsive-lg">Conteúdo</div>

// Padding responsivo
<div className="p-responsive-md">Conteúdo</div>
```

### 2. Variáveis CSS
```jsx
// Sidebar com largura automática
<div className="sidebar-width">Sidebar</div>

// Header com altura automática
<header className="header-height">Header</header>

// Conteúdo com padding automático
<main className="content-padding">Conteúdo</main>
```

### 3. Hooks em Componentes
```jsx
import { useResponsive } from '../lib/useResponsive';

function MyComponent() {
  const screenSize = useResponsive();
  
  return (
    <div className={screenSize.isMobile ? 'mobile-layout' : 'desktop-layout'}>
      {/* Conteúdo adaptativo */}
    </div>
  );
}
```

## Componentes Atualizados

### 1. Sidebar
- Usa `sidebar-width` para largura responsiva
- Adapta-se automaticamente ao tamanho da tela
- Mantém proporções adequadas em todos os breakpoints

### 2. Header
- Usa `header-height` para altura responsiva
- Texto e espaçamentos escalam automaticamente
- Botões e elementos se adaptam ao tamanho da tela

### 3. Layout Principal
- Usa `content-padding` para espaçamento responsivo
- Flexbox se adapta automaticamente
- Mantém proporções adequadas

## Debug e Desenvolvimento

### Componente ResponsiveDebug
```jsx
import ResponsiveDebug from '../components/ResponsiveDebug';

// Ativar debug (apenas em desenvolvimento)
<ResponsiveDebug show={true} />
```

O componente de debug mostra:
- Resolução atual
- Breakpoint ativo
- Orientação do dispositivo
- Capacidades de touch
- Densidade de pixels
- Tipo de dispositivo

## Benefícios

1. **Adaptação Automática**: Não precisa de configuração manual
2. **Performance**: Mudanças são aplicadas via CSS, sem JavaScript
3. **Consistência**: Todos os componentes seguem o mesmo padrão
4. **Manutenibilidade**: Centralizado em variáveis CSS
5. **Flexibilidade**: Fácil de ajustar breakpoints e tamanhos
6. **Acessibilidade**: Funciona bem em todos os tipos de dispositivo

## Personalização

### Alterar Breakpoints
Edite `tailwind.config.js`:
```javascript
screens: {
  'xs': '475px',
  'sm': '640px',
  // ... adicione ou modifique breakpoints
}
```

### Alterar Tamanhos
Edite `app/globals.css`:
```css
:root {
  --sidebar-width-xs: 280px;
  --header-height-xs: 60px;
  --content-padding-xs: 1rem;
  // ... modifique valores conforme necessário
}
```

### Adicionar Novas Classes
Adicione ao `app/globals.css`:
```css
@layer utilities {
  .minha-classe-responsiva {
    /* propriedades responsivas */
  }
}
```

## Compatibilidade

- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers
- ✅ Tablets
- ✅ Desktop
- ✅ Ultra-wide monitors
- ✅ High-DPI displays 