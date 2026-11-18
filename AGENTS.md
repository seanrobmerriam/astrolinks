# AGENTS.md — Tailwind CSS Project Guidelines

## 1. Core Principles

- Use **Tailwind CSS v4** and its CSS-first configuration system.
- Establish a consistent design system before building UI components.
- Prefer utility classes over custom CSS.
- Use semantic design tokens instead of hardcoded values.
- Build mobile-first, responsive, accessible interfaces.
- Extract repeated UI patterns into reusable components.
- Keep dependencies, abstractions, and configuration minimal.
- Use relative units (`rem`, `em`, `%`, `fr`) wherever practical.

## 2. Initial Setup

### 2.1 Establish the Design System

Before implementing the UI:

1. Determine the project's color palette, typography, spacing, border radii, and visual style.
2. Ask the user for preferences when these are not already defined.
3. Define design tokens using Tailwind's `@theme` directive.
4. Use OKLCH for color definitions.
5. Use semantic names for application-level tokens.

```css
@import "tailwindcss";

@theme {
  /* Colors */
  --color-primary: oklch(0.65 0.16 250);
  --color-secondary: oklch(0.7 0.12 180);
  --color-surface: oklch(0.98 0 0);
  --color-foreground: oklch(0.2 0 0);
  --color-muted: oklch(0.55 0 0);

  /* Typography */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;

  /* Additional spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
}
```

Use Tailwind's existing spacing scale by default. Introduce custom spacing tokens only when the design system requires them.

### 2.2 Create Layout Components

Create reusable layout primitives to avoid duplicating structural utilities.

**Astro:**
- `Layout.astro`
- `Container.astro`
- `Section.astro`
- `Main.astro`
- `Sidebar.astro`

**React:**
- `Container.tsx`
- `Section.tsx`
- `Main.tsx`
- `Sidebar.tsx`

Requirements:

- Use typed props.
- Allow customization through `class` or `className`.
- Prefer composition over excessive configuration.
- Avoid unnecessary wrapper elements.
- Do not create components for patterns used only once unless they provide meaningful structure.

## 3. Responsive Design

### 3.1 Mobile-First

Always implement mobile styles first, then progressively enhance layouts at larger breakpoints.

```html
<div class="w-full md:w-1/2 lg:w-1/3">
  ...
</div>
```

Unprefixed utilities apply to all viewport sizes. Breakpoint variants apply from their minimum width upward.

### 3.2 Breakpoints

Use Tailwind's default breakpoints unless the project specifies otherwise.

| Prefix | Minimum width | Typical use |
|---|---|---|
| `sm` | 40rem | Large phones |
| `md` | 48rem | Tablets |
| `lg` | 64rem | Laptops |
| `xl` | 80rem | Desktops |
| `2xl` | 96rem | Large desktops |

Rules:

- Use breakpoints based on content needs, not specific devices.
- Prefer fluid layouts over breakpoint-heavy implementations.
- Do not introduce custom breakpoints without a demonstrated need.
- Avoid fixed widths that cause horizontal overflow.

### 3.3 Container Queries

Use container queries for components that should respond to their available space rather than the viewport.

```html
<div class="@container">
  <div class="grid grid-cols-1 gap-4 @sm:grid-cols-2 @lg:grid-cols-4">
    <!-- Responsive to parent container -->
  </div>
</div>
```

Use viewport breakpoints for page-level layouts and container queries for reusable, independently responsive components.

## 4. Design Tokens and Theming

### 4.1 Token Hierarchy

Organize design tokens into three levels:

1. **Primitive tokens:** Raw values such as `--blue-100` or `--gray-900`.
2. **Semantic tokens:** Purpose-based values such as `--color-primary` or `--color-surface`.
3. **Component tokens:** Component-specific values such as `--button-bg` or `--card-border`.

Use semantic tokens in application markup whenever possible.

### 4.2 Colors

- Define colors using OKLCH.
- Avoid hardcoded hexadecimal or RGB values in components.
- Use meaningful token names rather than visual descriptions.
- Maintain sufficient contrast across all supported themes.
- Avoid introducing new colors when existing tokens satisfy the requirement.

### 4.3 Dark Mode

Support dark mode when required by the project.

Use Tailwind's `dark:` variant for straightforward theme changes:

```html
<div class="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
  ...
</div>
```

For applications with extensive semantic theming, prefer CSS variables to repeated light/dark utility pairs.

Example with class-based dark mode:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --surface: oklch(0.98 0 0);
  --foreground: oklch(0.2 0 0);
}

.dark {
  --surface: oklch(0.15 0 0);
  --foreground: oklch(0.95 0 0);
}

@theme inline {
  --color-surface: var(--surface);
  --color-foreground: var(--foreground);
}
```

Components can then use:

```html
<div class="bg-surface text-foreground">
  ...
</div>
```

Rules:

- Keep semantic token names identical across themes.
- Change token values rather than duplicating component styles.
- Avoid mixing incompatible theming strategies.
- Ensure dark-mode contrast meets accessibility requirements.

## 5. Layout Guidelines

### 5.1 Grid vs. Flexbox

**Use Grid for:**
- Two-dimensional layouts.
- Page structures.
- Card galleries.
- Bento grids.
- Sidebar/content arrangements.
- Layouts requiring explicit column or row alignment.

**Use Flexbox for:**
- Navigation bars.
- Button groups.
- Inline controls.
- Icon/text combinations.
- One-dimensional alignment and distribution.

Prefer the simplest layout system that satisfies the requirement.

### 5.2 Preferred Grid Patterns

**Responsive auto-fit grid:**

```html
<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4">
  ...
</div>
```

**Asymmetric Bento grid:**

```html
<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
  <div class="md:col-span-2">...</div>
  <div>...</div>
  <div>...</div>
  <div class="md:col-span-2">...</div>
</div>
```

**Sidebar layout:**

```html
<div class="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
  <aside>...</aside>
  <main class="min-w-0">...</main>
</div>
```

Guidelines:

- Consider asymmetric layouts for dashboards, landing pages, and editorial content.
- Use symmetric grids when content consistency or comparability is more important.
- Avoid fixed heights unless the layout specifically requires them.
- Prefer `gap` over margins between repeated children.
- Use `min-w-0` where grid or flex content needs to shrink.

## 6. Component Architecture

### 6.1 Extract Repeated Patterns

Extract repeated groups of utilities into reusable components when they represent a consistent UI pattern.

Avoid duplicating complex class strings throughout the application.

**Bad:**

```tsx
<button className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
  Save
</button>
```

Repeated independently throughout the project, this becomes difficult to maintain.

**Good:**

```tsx
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-primary text-white",
    secondary: "bg-surface text-foreground border",
  };

  return (
    <button
      className={`rounded-lg px-4 py-2 transition-colors ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

Requirements:

- Use TypeScript for component props and variant types.
- Prefer explicit variant maps over complex conditional class expressions.
- Preserve native HTML attributes and semantics.
- Support class overrides when appropriate.
- Avoid unnecessary variant systems for simple components.

### 6.2 Dynamic Classes

Never construct Tailwind class names using incomplete string interpolation.

**Bad:**

```tsx
const className = `bg-${color}-500`;
```

**Good:**

```tsx
const colors = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  red: "bg-red-500",
} as const;

const className = colors[color];
```

Tailwind must be able to identify complete class names during source scanning.

## 7. CSS Organization

### 7.1 Prefer Utilities

Use Tailwind utilities directly in markup for ordinary styling.

Write custom CSS when:

- Implementing complex animations.
- Styling third-party content.
- Defining reusable global primitives.
- Implementing styles that are awkward or impractical with utilities.
- Defining project-wide design tokens and theme behavior.

### 7.2 Use `@apply` Sparingly

Avoid `@apply` as the default method for extracting repeated styles.

Prefer reusable components for component-level styling.

Reserve `@apply` for situations where reusable CSS selectors are necessary and utility classes are impractical.

### 7.3 Use CSS Layers

Place custom CSS in the appropriate layer when necessary:

```css
@layer base {
  body {
    @apply bg-surface text-foreground;
  }
}

@layer components {
  .prose-content {
    /* Styles for externally generated content */
  }
}
```

Avoid excessive global selectors or broad overrides of Tailwind utilities.

## 8. Utility Class Ordering

Group classes logically to improve readability:

1. Layout: `flex`, `grid`, `block`
2. Positioning: `relative`, `absolute`, `sticky`
3. Sizing and spacing: `w-*`, `h-*`, `p-*`, `m-*`
4. Typography: `font-*`, `text-*`, `leading-*`
5. Appearance: `bg-*`, `border-*`, `rounded-*`, `shadow-*`
6. Interaction: `hover:*`, `focus:*`, `transition-*`
7. Responsive and state variants

Use Prettier's Tailwind plugin as the authoritative ordering mechanism when available.

```bash
bun add -d prettier prettier-plugin-tailwindcss
```

Do not manually reorder classes in ways that conflict with the project's formatter.

## 9. Accessibility

All components must use appropriate semantic HTML and accessible interactions.

Requirements:

- Prefer native HTML elements over ARIA-based replacements.
- Provide visible keyboard focus indicators.
- Ensure interactive elements are keyboard accessible.
- Associate form controls with labels.
- Provide accessible names for icon-only buttons.
- Maintain sufficient text and UI contrast.
- Respect reduced-motion preferences.
- Avoid using color alone to communicate meaning.

Example:

```html
<button
  type="button"
  aria-label="Close dialog"
  class="rounded-md p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
>
  <span aria-hidden="true">×</span>
</button>
```

For animations, use `motion-safe:` and `motion-reduce:` appropriately.

## 10. Common Pitfalls

| Problem | Rule |
|---|---|
| Class soup | Extract repeated patterns into components. |
| Excessive abstractions | Create components only when they improve reuse or structure. |
| Arbitrary values everywhere | Prefer design tokens and existing utilities. |
| Hardcoded colors | Use semantic color tokens. |
| Desktop-first layouts | Start with mobile styles. |
| Breakpoint overload | Prefer fluid layouts and container queries. |
| Dynamic class generation | Use complete, statically detectable class names. |
| Excessive `@apply` | Prefer utilities and components. |
| Inaccessible controls | Use semantic HTML and keyboard-accessible patterns. |
| Inconsistent spacing | Use the established spacing scale. |
| Unnecessary custom CSS | Prefer existing Tailwind utilities. |
| Fixed dimensions | Prefer flexible and intrinsic sizing. |

## 11. Implementation Checklist

Before considering a UI implementation complete, verify:

- [ ] Design tokens are defined and consistently used.
- [ ] Layout is mobile-first and responsive.
- [ ] Appropriate Grid/Flexbox patterns are used.
- [ ] Repeated UI patterns are componentized.
- [ ] Props and variants are type-safe.
- [ ] No unnecessary arbitrary values or hardcoded colors exist.
- [ ] Theme behavior is consistent.
- [ ] Semantic HTML and accessibility requirements are met.
- [ ] Keyboard focus states are visible.
- [ ] No horizontal overflow occurs at supported viewport sizes.
- [ ] Tailwind classes are statically detectable.
- [ ] Formatting and project checks pass.

## 12. Agent Behavior

When implementing or modifying UI:

1. Inspect the existing project structure, dependencies, components, and theme definitions before making changes.
2. Follow established conventions unless explicitly instructed to replace them.
3. Reuse existing tokens and components before introducing new ones.
4. Implement the simplest solution that meets the requirements.
5. Avoid adding dependencies without a clear need.
6. Do not introduce unrelated design changes.
7. Preserve existing functionality, accessibility, and responsive behavior.
8. Run available formatting, type-checking, and build commands after changes.
9. Correct errors introduced by the implementation.
10. Keep the resulting code maintainable, consistent, and minimal.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
