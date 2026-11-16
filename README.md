# Australian Food Labelling Platform

A local-first web application in development to help Australian food businesses prepare label content from ingredient, formulation and product information. It assists label preparation; it does not certify legal compliance.

The project explores how complex, domain-specific regulatory requirements can be represented as software rules and used to generate consistent food-labelling information.

## Overview

Food labelling in Australia requires businesses to present information such as ingredients, allergens and nutritional information in specific formats.

For small food businesses, preparing this information manually can be time-consuming and error-prone.

The Australian Food Labelling Platform aims to provide a structured workflow for entering product and ingredient information and using that data to produce the information required for an Australian food label.

The intended workflow guides a user from ingredients and formulations through product questions to pack copy and a label. The current app is a development baseline: label PDF export is blocked while required content is not fully assessed. See the [implementation plan](docs/implementation-plan.md) for the reset, proposed steps and current limitations.

## Key Features

### Product Management

Products can be represented using structured information rather than treating a label as a collection of manually entered text fields.

The system is designed around products being composed of individual ingredients, allowing information about those ingredients to contribute to the final label.

### Ingredient Data

Ingredients can contain nutritional and other relevant information that can be used when generating product information.

This provides a foundation for calculating and formatting the nutritional information required for a finished label.

### Nutrition Information

The application is designed to generate a Nutrition Information Panel from structured product and ingredient data.

This allows nutritional information to be calculated and presented consistently rather than manually formatting every label.

### Ingredient & Allergen Information

The platform is intended to support generation of:

* Ingredient declarations
* Allergen information
* Nutritional information
* Other required food-labelling information

The long-term goal is to make these outputs derive from the underlying product data wherever possible.

## Rules-Driven Architecture

One of the primary goals of the project is to separate **product data** from **labelling rules**.

Rather than hard-coding individual labels, the application is being designed around the concept of a rules engine capable of determining how information should be represented.

For example:

```text id="x0v0vw"
Product
   │
   ├── Ingredients
   │      │
   │      ├── Nutritional information
   │      ├── Allergen information
   │      └── Ingredient declarations
   │
   └── Product properties
            │
            ▼
      Labelling rules
            │
            ▼
     Generated label
```

This approach provides a foundation for introducing additional rules without requiring the entire application to be rewritten.

## Australian Context

The project is specifically focused on Australian food-labelling requirements rather than attempting to create a generic international labelling system.

The application is being designed around requirements including:

* Nutrition Information Panels
* Ingredient declarations
* Allergen declarations
* Nutrient formatting
* Food-labelling claims
* Australian-specific labelling rules

Regulatory requirements are treated as domain rules that can be represented and applied by the application.

> **Disclaimer:** This project is a software engineering project and should not be treated as legal or regulatory advice. Food businesses should verify generated labels against current Australian requirements and obtain appropriate professional advice where necessary.

## Engineering Highlights

### Domain Modelling

The application models products and ingredients as structured data rather than storing completed labels as static documents.

This creates relationships between:

```text id="f8f0b0"
Products
   ↓
Ingredients
   ↓
Nutritional Data
   ↓
Labelling Rules
   ↓
Generated Output
```

This approach allows changes to an ingredient or product to flow through to generated labelling information.

### Rules Engine

A major focus of the project is developing a reusable rules layer capable of representing Australian food-labelling requirements.

The eventual goal is to allow rules to be evaluated independently of the user interface, making the system easier to test, maintain and extend.

### Structured Nutritional Data

Nutritional information is represented as structured values rather than manually formatted text.

This provides a foundation for performing calculations and applying the appropriate formatting when generating a Nutrition Information Panel.

## Technology Stack

* Vue 3
* TypeScript
* Vite and Tailwind CSS
* Dexie and IndexedDB for local storage

## Project Structure

```text id="q17a0p"
aus-food-labelling-platform/
│
├── apps/web/             guided local application
├── packages/             domain, engine, rules, storage and label packages
├── docs/                 requirements, plan, research and decisions
└── archive/              legacy code
```

The old `frontend/` prototype is not the current application. No cloud
service is required for the local MVP.

## Run locally

With the Node.js version in `.nvmrc` and Corepack available, from Windows
Command Prompt:

```cmd
cd /d "<path-to-repository>" && corepack pnpm install && corepack pnpm --filter @aus-food/web... run build && corepack pnpm --filter @aus-food/web dev
```

Open `http://127.0.0.1:4173` and stop the server with Ctrl+C. Ingredient and
formulation data stay in the local browser profile; use the app's backup
feature to retain a separate copy.

## Project Status

This project is an **active work in progress**.

The current implementation establishes the application's foundation and explores the modelling of food products, ingredients and nutritional information.

The rules engine and broader labelling functionality are planned to be expanded substantially as the project develops.

### Current Focus

* Product and ingredient modelling
* Nutritional data
* Firebase/Firestore integration
* Application structure
* Initial labelling functionality

### Planned Development

* Comprehensive Australian labelling rules engine
* Automated Nutrition Information Panel generation
* Ingredient declaration generation
* Allergen handling
* Nutrient formatting rules
* Rules for food-labelling claims
* Improved label preview and generation
* Automated testing of regulatory rules
* Expanded product and ingredient data

## Future Architecture

A major future goal is to introduce a dedicated domain/rules layer separating the application's interface from the logic responsible for determining compliance and generating labels.

The intended architecture is broadly:

```text id="k3qz9m"
             ┌─────────────────┐
             │    Vue UI       │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ Application     │
             │ Services        │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ Labelling Rules │
             │ Engine          │
             └────────┬────────┘
                      │
             ┌────────┴────────┐
             ▼                 ▼
       Product Data       Regulatory Rules
             │                 │
             └────────┬────────┘
                      ▼
             ┌─────────────────┐
             │ Generated Label │
             └─────────────────┘
```

This separation would allow the regulatory logic to be tested independently from the user interface.

## Future Possibilities

The project has potential to develop beyond a simple label generator into a broader platform for small food businesses.

Potential future functionality includes:

* Automated compliance checks
* Label templates
* Product versioning
* Exportable labels
* Regulatory rule updates

## Project Context

This project is being built to explore the intersection of software engineering and a highly domain-specific problem.

Rather than building a more standard CRUD application, the goal here is to investigate how complex real-world rules and structured data can be represented in software and transformed into useful, consistent outputs for end users.
