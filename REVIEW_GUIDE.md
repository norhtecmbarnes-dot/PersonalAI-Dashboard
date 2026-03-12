# Project Review Guide

## Automated Checks

### CI/CD Pipeline (GitHub Actions)
- **On push/PR**: Type check + build
- **Security scan**: Weekly audit + secret detection
- **Weekly review**: File stats, dependency check, security audit

### Local Scripts

```bash
# Full review (type check + lint + build)
npm run review

# Quick review (type check + lint only)
npm run review:quick

# Security audit
npm run security:audit

# Fix security issues
npm run security:fix

# Fix linting issues
npm run lint:fix
```

### Pre-commit Hooks
- Lint-staged files before commit
- Format with Prettier

### Pre-push Hooks
- TypeScript type checking

## Project Statistics

| Metric | Count |
|--------|-------|
| Source files | 232 |
| API routes | 50+ |
| Components | 30+ |
| Services | 20+ |

## Key Architecture

```
src/
├── app/           # Next.js App Router pages & APIs
├── components/    # React components
├── lib/
│   ├── database/   # SQLite operations
│   ├── models/     # Model routing & SDK
│   ├── services/   # Business logic
│   ├── security/   # Security scanning
│   └── utils/      # Utilities
```

## Review Checklist

### Before Committing
- [ ] `npm run review:quick` passes
- [ ] No sensitive data in files
- [ ] Changes tested locally

### Before Pushing
- [ ] `npm run review` passes
- [ ] CI/CD pipeline passes
- [ ] Documentation updated

### Before Release
- [ ] `npm run security:audit` clean
- [ ] All tests pass
- [ ] CHANGELOG.md updated