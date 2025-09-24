import { z } from 'zod';

let cachedSchemas = null;

// Fetch schemas from server API
export const getSchemas = async () => {
  if (!cachedSchemas) {
    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/schemas' 
        : 'http://localhost:3001/api/schemas';
      const response = await fetch(apiUrl);
      const schemaData = await response.json();
      
      // Convert server schema data to Zod schemas
      cachedSchemas = {
        teamName: z.string()
          .min(schemaData.teamName.min, schemaData.teamName.message)
          .max(schemaData.teamName.max, schemaData.teamName.message)
          .trim()
      };
    } catch (error) {
      // Fallback schemas if API fails
      cachedSchemas = {
        teamName: z.string().min(1, "Team name is required").max(30, "Team name must be 30 characters or less").trim()
      };
    }
  }
  return cachedSchemas;
};