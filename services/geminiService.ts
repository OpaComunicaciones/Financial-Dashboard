import { GoogleGenerativeAI } from "@google/generative-ai";import { GoogleGenAI } from "@google/genai";
import { formatNumber } from "../utils/formatting";

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

export const getFinancialInsights = async (data: Record<string, any>, lang: 'es' | 'en', apiKey: string): Promise<string> => {
    if (!apiKey) {
        return Promise.resolve(
          lang === 'es' 
          ? "Las funciones de IA están deshabilitadas. Por favor, configure la clave de API de Gemini en la página de Configuración." 
          : "AI features are disabled. Please configure the Gemini API Key in the Configuration page."
        );
    }

  const ai = new GoogleGenerativeAI({ apiKey });
  const modelName = 'gemini-pro';
  
  const prompt = getPrompt(data, lang);
  console.log("Sending prompt to Gemini:", prompt); // Log the prompt

  try {
    const model = ai.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return lang === 'es'
      ? `Ocurrió un error al generar el análisis de IA. Por favor, revise la consola para más detalles. Error: ${errorMessage}`
      : `An error occurred while generating AI insights. Please check the console for details. Error: ${errorMessage}`;
  }
};