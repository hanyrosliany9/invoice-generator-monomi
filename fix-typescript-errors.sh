#!/bin/bash

# Fix QuotationDetailPage.tsx - missing message import
sed -i "s/import React, { useEffect, useState, useMemo } from 'react'/import React, { useEffect, useState, useMemo } from 'react'\nimport { App } from 'antd'/" /home/jeff-pc/Project/invoice-generator-monomi/frontend/src/pages/QuotationDetailPage.tsx
sed -i "s/export const QuotationDetailPage: React.FC = () => {/export const QuotationDetailPage: React.FC = () => {\n  const { message } = App.useApp()/" /home/jeff-pc/Project/invoice-generator-monomi/frontend/src/pages/QuotationDetailPage.tsx

# Fix QuotationEditPage.tsx - remove undefined setAutoSaving references
sed -i "s/setAutoSaving(true)/\/\/ setAutoSaving(true)/g" /home/jeff-pc/Project/invoice-generator-monomi/frontend/src/pages/QuotationEditPage.tsx
sed -i "s/setAutoSaving(false)/\/\/ setAutoSaving(false)/g" /home/jeff-pc/Project/invoice-generator-monomi/frontend/src/pages/QuotationEditPage.tsx

# Fix ProjectCreatePage.tsx - Fix filter event handler
sed -i "261s/.filter(e => e.categoryId && e.amount > 0)/.filter((expense: EstimatedExpense) => expense.categoryId \&\& expense.amount > 0)/" /home/jeff-pc/Project/invoice-generator-monomi/frontend/src/pages/ProjectCreatePage.tsx
sed -i "262,263d" /home/jeff-pc/Project/invoice-generator-monomi/frontend/src/pages/ProjectCreatePage.tsx

echo "TypeScript error fixes applied"
