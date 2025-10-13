import { GoogleGenAI } from "@google/genai";
import { formatNumber } from "../utils/formatting";

const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

const getPrompt = (data: Record<string, any>, lang: 'es' | 'en'): string => {
  const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol: '$' });

  if (lang === 'es') {
    return `
      Analiza los siguientes datos financieros de un restaurante y proporciona un breve resumen de su salud financiera.
      Enfócate en el rendimiento de las ventas, la gestión de gastos y el flujo de caja. Ofrece una sugerencia práctica para mejorar.
      El análisis debe ser conciso, profesional y fácil de entender para un gerente de restaurante.
      Datos:
      - Ventas de Hoy: ${formatCurrency(data.sales)}
      - Gastos de Hoy: ${formatCurrency(data.expenses)}
      - Margen de Beneficio: ${formatNumber(data.profitMargin)}%
      - Principal Categoría de Gasto: ${data.topExpense.category} (${formatCurrency(data.topExpense.amount)})
      - Saldo de Caja: ${formatCurrency(data.cashBalance)}
      - Cuentas por Pagar (Pendientes): ${formatCurrency(data.accountsPayable)}
      
      Estructura tu respuesta en formato Markdown con las siguientes secciones:
      - **Resumen de Salud Financiera:**
      - **Observación Clave:**
      - **Sugerencia Práctica:**
    `;
  }

  // Default to English
  return `
    Analyze the following financial data for a restaurant and provide a brief summary of its financial health. 
    Focus on sales performance, expense management, and cash flow. Offer one actionable suggestion for improvement.
    The analysis should be concise, professional, and easy for a restaurant manager to understand.
    Data:
    - Today's Sales: ${formatCurrency(data.sales)}
    - Today's Expenses: ${formatCurrency(data.expenses)}
    - Profit Margin: ${formatNumber(data.profitMargin)}%
    - Top Expense Category: ${data.topExpense.category} (${formatCurrency(data.topExpense.amount)})
    - Cash Balance: ${formatCurrency(data.cashBalance)}
    - Accounts Payable (Pending): ${formatCurrency(data.accountsPayable)}
    
    Structure your response in Markdown format with the following sections:
    - **Financial Health Summary:**
    - **Key Observation:**
    - **Actionable Suggestion:**
  `;
};

export const getFinancialInsights = async (data: Record<string, any>, lang: 'es' | 'en'): Promise<string> => {
    if (!ai) {
        return Promise.resolve(
          lang === 'es' 
          ? "Las funciones de IA están deshabilitadas. Por favor, configure la variable de entorno API_KEY." 
          : "AI features are disabled. Please configure the API_KEY environment variable."
        );
    }
  const model = 'gemini-2.5-flash';
  
  const prompt = getPrompt(data, lang);

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return lang === 'es'
      ? "Ocurrió un error al generar el análisis de IA. Por favor, revise la consola para más detalles."
      : "An error occurred while generating AI insights. Please check the console for details.";
  }
};