# ADR: Tailwind CSS Implementation Strategy

## Status

Accepted ✅ (2025-05-20)

## Context

The application needed a CSS strategy that would:

- Provide consistent styling across components
- Support responsive design for map and list layouts
- Integrate well with component-based architecture
- Maintain good developer experience

Available options included pure CSS modules, styled-components, Emotion, or Tailwind CSS.

## Decision

Use Tailwind CSS with component-scoped customizations and CSS variables for theming.

## Alternatives Considered

1. **CSS Modules only** - Component scoping but verbose for utilities
2. **Styled-components** - CSS-in-JS with theme support
3. **Tailwind CSS** - Chosen for utility-first approach with customization

## Consequences

### Positive
- Utility-first approach enables rapid UI development
- Consistent design system through Tailwind's design tokens
- Excellent responsive design support for map/list layout
- Integration with shadcn/ui component library
- CSS variables enable runtime theming if needed

### Negative
- Initial learning curve for utility-first approach
- Potential for large class strings in components
- Build-time dependency for purging unused styles

### Implementation Details
- Tailwind configured for Next.js with content purging
- Custom CSS variables in `globals.css` for theme values
- shadcn/ui components provide consistent base styling
- Component-specific styles via Tailwind utilities

### Affected Components
- All UI components use Tailwind utility classes
- `src/app/globals.css` - Global styles and CSS variables
- `tailwind.config.js` - Tailwind configuration with custom theme
- `src/components/ui/` - shadcn/ui component library integration