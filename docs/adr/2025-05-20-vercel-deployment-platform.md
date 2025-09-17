# ADR: Vercel as Primary Deployment Platform

## Status

Accepted ✅ (2025-05-20)

## Context

The Calendar Map Filter application needed a deployment platform that would:

- Support Next.js applications with App Router
- Handle serverless API routes efficiently
- Provide reliable geocoding cache integration
- Offer simple environment variable management
- Support automatic deployments from Git

Available options included Vercel, Netlify, Railway, AWS/GCP, and self-hosted solutions.

## Decision

Use Vercel as the primary deployment platform for the Calendar Map Filter application.

## Alternatives Considered

1. **Netlify** - Similar JAMstack platform with Next.js support
2. **Railway** - Container-based deployment with database options
3. **AWS/GCP** - Cloud platforms requiring more configuration
4. **Self-hosted** - Maximum control but requires infrastructure management
5. **Vercel** - Chosen for optimal Next.js integration

## Consequences

### Positive

- Zero-configuration deployment for Next.js applications
- Built-in edge functions optimize API route performance
- Seamless integration with Upstash Redis cache
- Automatic SSL certificates and global CDN
- Simple environment variable management through dashboard
- Git-based deployments with preview environments
- Excellent developer experience with instant deployments

### Negative

- Vendor lock-in to Vercel platform
- Function execution time limits (10 seconds on Hobby plan)
- Build time limitations for large applications
- Costs can increase with higher usage

### Implementation Requirements

- Connect GitHub repository to Vercel project
- Configure environment variables in Vercel dashboard
- Automatic deployment on push to main branch
- Preview deployments for pull requests

### Affected Configuration

- `vercel.json` configuration for custom settings (if needed)
- Environment variables: API keys and service URLs
- Build settings optimized for Next.js App Router
- Edge function deployment for `/api/events` and `/api/geocode`

### Alternative Deployment Notes

- **Netlify**: Requires Next.js adapter, similar serverless model
- **Railway**: Good for applications requiring persistent databases
- **Self-hosted**: Suitable for high-control requirements or cost optimization
