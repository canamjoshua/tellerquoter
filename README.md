# Teller Quoting System

A production-ready web application for generating professional quotes and implementation plans for Can/Am's Teller product.

## 📋 Documentation

This repository contains comprehensive planning documentation for the Teller Quoting System implementation:

### Core Documents

1. **[Teller_Quoting_System_Requirements_v1.5.md](Teller_Quoting_System_Requirements_v1.5.md)**
   - Complete requirements specification (161 requirements)
   - 133 Functional Requirements (FR-1 to FR-133)
   - 16 Non-Functional Requirements (NFR-1 to NFR-16)
   - 12 Technical Requirements (TR-1 to TR-12)
   - Data model specifications
   - Business context and design rationale

2. **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)**
   - Full production implementation roadmap
   - 8-phase, 22-week delivery plan
   - Complete technical architecture
   - Database schema (PostgreSQL)
   - API design (40+ endpoints)
   - Frontend architecture (React + TypeScript)
   - AWS infrastructure plan (Terraform)
   - Testing strategy
   - Budget: $493,046 total project cost

3. **[REQUIREMENTS_TRACEABILITY_MATRIX.md](REQUIREMENTS_TRACEABILITY_MATRIX.md)**
   - 100% requirements coverage verification
   - Maps all 161 requirements to implementation phases
   - Gap analysis (all gaps addressed in v1.1)
   - Detailed phase-by-phase coverage breakdown

4. **[DEVELOPMENT_QUICKSTART.md](DEVELOPMENT_QUICKSTART.md)** ⭐ **Start Here for Developers**
   - Quick reference for naming conventions
   - TDD workflow examples
   - Pre-commit checklist
   - Integration test templates
   - Common tasks and troubleshooting

## 🎯 Project Overview

**Current State:** Excel-based quoting (Pricing Investment Template V11.xlsx)
- Manual document creation
- 30-45 minutes per quote
- No version control
- Prone to errors

**Future State:** Web-based quoting system
- Automated document generation
- < 15 minutes per quote
- Full version control (quotes & pricing)
- 99.9% accuracy

## 🏗️ System Architecture

### Technology Stack
- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Python 3.11 + FastAPI
- **Database:** PostgreSQL 15
- **Document Generation:** python-docx
- **Authentication:** Microsoft Entra ID (SSO)
- **Infrastructure:** AWS (ECS Fargate, App Runner, RDS, S3)
- **IaC:** Terraform
- **CI/CD:** GitHub Actions

### Key Features

#### Quote Management
- Auto-assigned quote numbers (Q-2025-0001)
- Quote versioning (v1, v2, v3...)
- Version comparison
- Search and organization by client

#### Pricing Management
- Pricing versioning (immutable snapshots)
- 26 Setup Package SKUs
- SaaS tiered pricing
- Travel zone pricing
- Admin UI for all configuration

#### Document Generation
1. **Teller Order Form** (client-facing)
2. **Teller Implementation Plan / Exhibit C** (client-facing)
3. **Internal Quote Detail Document** (internal)

All documents in Word (.docx) and PDF formats.

#### Advanced Features
- Multi-year SaaS projections (3 escalation models)
- Level loading option
- Discount system (percentage & fixed)
- Referral fee tracking
- Two payment milestone styles
- Conditional assumptions
- GSA per diem lookup
- Population-based tier suggestions

## 📊 Implementation Phases

| Phase | Duration | Focus | Deliverables |
|-------|----------|-------|--------------|
| **1. Foundation** | 3 weeks | Infrastructure, auth | AWS setup, SSO working |
| **2. Pricing Management** | 3 weeks | Admin UI, versioning | Pricing configuration complete |
| **3. Quote Builder Core** | 4 weeks | Quote creation, versioning | Quote builder functional |
| **4. Implementation Plan** | 3 weeks | Payment milestones, discounts | Full quote workflow |
| **5. Document Generation** | 3 weeks | Word/PDF generation | All 3 documents generating |
| **6. Lookups & Integrations** | 2 weeks | GSA/Census APIs | Auto-suggest features |
| **7. Testing & Refinement** | 2 weeks | UAT, performance, security | Production-ready |
| **8. Deployment & Training** | 2 weeks | Go-live, training | Live system |

**Total Timeline:** 22 weeks from kickoff to production

## 💰 Budget

| Category | Amount |
|----------|--------|
| Development (22 weeks, 5-person team) | $444,400 |
| AWS Infrastructure (Year 1) | $3,500 |
| Third-Party Services (Year 1) | $324 |
| Contingency (10%) | $44,822 |
| **Total Project Cost** | **$493,046** |
| **Annual Ongoing Cost** | **$92,704** |

## 🎯 Success Metrics

| Metric | Current (Excel) | Target (System) |
|--------|----------------|----------------|
| Time to create quote | 30-45 minutes | < 15 minutes |
| Document generation | 5-10 minutes (manual) | < 10 seconds |
| Quote search | N/A (file browsing) | < 2 seconds |
| Calculation accuracy | 100% (baseline) | 100% (verified) |
| System availability | N/A | 99% (business hours) |
| User capacity | Limited | 20 concurrent users |

## 🔐 Security

- Microsoft Entra ID SSO authentication
- JWT tokens (8-hour inactivity timeout)
- Role-based access control (Sales, Admin, Finance)
- All data encrypted at rest and in transit (TLS 1.3)
- AWS Secrets Manager for credentials
- Comprehensive audit logging
- OWASP Top 10 security testing

## 📈 Requirements Coverage

✅ **100% Complete** (161/161 requirements)

- ✅ 133 Functional Requirements
- ✅ 16 Non-Functional Requirements
- ✅ 12 Technical Requirements

See [REQUIREMENTS_TRACEABILITY_MATRIX.md](REQUIREMENTS_TRACEABILITY_MATRIX.md) for detailed coverage.

## 🚀 Next Steps

1. **Review Documentation**
   - Stakeholder review of requirements
   - Approval of implementation plan
   - Budget approval

2. **Team Formation**
   - Hire/assign development team
   - Set up communication channels
   - Schedule kickoff meeting

3. **Environment Setup**
   - Create AWS accounts
   - Configure Microsoft Entra ID
   - Set up GitHub repository
   - Initialize development environment

4. **Phase 1 Kickoff**
   - Week 1 team onboarding
   - Infrastructure provisioning
   - First sprint planning

## 📞 Stakeholders

- **Sales Leadership** - Requirements validation, UAT
- **Finance** - Pricing validation, Quickbooks mapping
- **IT Security** - Security review, Entra ID setup
- **Implementation Team** - SKU scope validation

## 🛠️ Development Standards

The implementation plan includes comprehensive development standards to ensure code quality, reliability, and maintainability:

### Naming Conventions
- **Database Tables:** PascalCase (e.g., `PricingVersions`, `QuoteVersions`)
- **Database Columns:** snake_case (e.g., `pricing_version_id`, `created_at`)
- **Python:** PascalCase classes, snake_case functions/variables
- **TypeScript:** PascalCase components/types, camelCase functions/variables

### Testing Requirements
- **Business Logic:** 95% coverage (CI/CD enforced)
- **API Endpoints:** 90% coverage (CI/CD enforced)
- **Overall Project:** 80% minimum coverage
- **Test-Driven Development (TDD):** Required workflow
- **Integration Tests:** Must cover all major requirements examples

### Code Quality
- **Type Safety:** Strict mypy + TypeScript strict mode
- **Linting:** ruff (Python) + ESLint (TypeScript)
- **Pre-Commit Hooks:** All tests must pass before commit
- **Build Verification:** Code must compile successfully before handoff

### Integration Test Examples
All major examples from requirements must have integration tests:
- City of Fond du Lac reference implementation ($213,840 quote)
- Multi-year projection with level loading
- Travel cost calculation (Zone 1 example)
- Deliverable-based payment milestones

See [IMPLEMENTATION_PLAN.md Section 9](IMPLEMENTATION_PLAN.md#9-development-standards--best-practices) for complete standards.

## 📄 License

Internal Can/Am project - Proprietary

---

**Document Version:** 1.2
**Last Updated:** December 3, 2025
**Status:** Ready for Stakeholder Review
