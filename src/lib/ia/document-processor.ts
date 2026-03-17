// Utilidades para procesamiento de documentos

import mammoth from 'mammoth';
import { getModel } from './gemini';

export interface DocumentChunk {
  texto: string;
  pagina?: number;
  metadata: {
    inicio: number;
    fin: number;
  };
}

/**
 * Extrae metadata (título y autor) del documento usando IA
 */
export async function extractMetadata(texto: string): Promise<{
  titulo: string | null;
  autor: string | null;
}> {
  try {
    if (!texto || texto.length < 50) {
      console.log('Texto muy corto para extraer metadata');
      return { titulo: null, autor: null };
    }

    // Solo usar las primeras 3000 caracteres para ser más eficiente
    const textoInicial = texto.slice(0, 3000);
    
    const prompt = `Analiza el siguiente texto de un documento académico o psicopedagógico y extrae:
1. El título del documento
2. El autor o autores

Responde SOLO en formato JSON sin markdown:
{
  "titulo": "título exacto del documento",
  "autor": "nombre del autor o autores"
}

Si no puedes identificar alguno, usa null.

Texto del documento:
${textoInicial}`;

    console.log('Llamando a Gemini para extraer metadata...');
    const result = await getModel().generateContent(prompt);
    const response = result.response.text();
    console.log('Respuesta de Gemini:', response);
    
    // Limpiar markdown code blocks si existen
    const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Extraer JSON
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const metadata = JSON.parse(jsonMatch[0]);
      console.log('Metadata extraída:', metadata);
      return {
        titulo: metadata.titulo || null,
        autor: metadata.autor || null
      };
    }
    
    console.log('No se encontró JSON en la respuesta');
    return { titulo: null, autor: null };
  } catch (error) {
    console.error('Error extrayendo metadata:', error);
    return { titulo: null, autor: null };
  }
}

/**
 * Extrae texto de un PDF usando pdf2json (compatible con Next.js)
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const PDFParser = require('pdf2json');
      const pdfParser = new PDFParser();

      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('Error parseando PDF:', errData.parserError);
        reject(new Error('No se pudo procesar el PDF: ' + errData.parserError));
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extraer texto de todas las páginas
          let texto = '';
          if (pdfData.Pages) {
            for (const page of pdfData.Pages) {
              if (page.Texts) {
                for (const text of page.Texts) {
                  if (text.R && text.R[0] && text.R[0].T) {
                    try {
                      // Intentar decodificar URI component (pdf2json codifica el texto)
                      texto += decodeURIComponent(text.R[0].T) + ' ';
                    } catch (e) {
                      // Si falla el decode, usar el texto tal cual
                      texto += text.R[0].T.replace(/%20/g, ' ') + ' ';
                    }
                  }
                }
              }
              texto += '\n'; // Separador de página
            }
          }
          
          if (!texto.trim()) {
            reject(new Error('El PDF no contiene texto extraíble'));
          } else {
            resolve(texto);
          }
        } catch (error) {
          console.error('Error procesando datos del PDF:', error);
          reject(error);
        }
      });

      // Parsear el buffer
      pdfParser.parseBuffer(buffer);
    } catch (error) {
      console.error('Error iniciando parser de PDF:', error);
      reject(new Error('No se pudo iniciar el parser de PDF: ' + (error as Error).message));
    }
  });
}

/**
 * Extrae texto de un DOCX
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error extrayendo texto de DOCX:', error);
    throw new Error('No se pudo procesar el DOCX');
  }
}

/**
 * Divide texto en chunks con overlap para mantener contexto
 */
export function chunkText(
  texto: string,
  chunkSize: number = 1000,
  overlap: number = 200
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const palabras = texto.split(/\s+/);
  
  let inicio = 0;
  
  while (inicio < palabras.length) {
    const fin = Math.min(inicio + chunkSize, palabras.length);
    const chunk = palabras.slice(inicio, fin).join(' ');
    
    chunks.push({
      texto: chunk,
      metadata: {
        inicio,
        fin
      }
    });
    
    // Avanzar con overlap
    inicio += chunkSize - overlap;
  }
  
  return chunks;
}

/**
 * Limpia y normaliza texto extraído
 */
export function cleanText(texto: string): string {
  return texto
    .replace(/\s+/g, ' ') // Normalizar espacios
    .replace(/\n{3,}/g, '\n\n') // Máximo 2 saltos de línea
    .trim();
}

/**
 * Detecta el tipo de archivo por extensión
 */
export function getFileType(filename: string): 'pdf' | 'docx' | 'txt' | 'unknown' {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (extension === 'pdf') return 'pdf';
  if (extension === 'docx' || extension === 'doc') return 'docx';
  if (extension === 'txt') return 'txt';
  
  return 'unknown';
}

/**
 * Procesa un archivo y extrae su texto
 */
export async function processDocument(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const tipo = getFileType(filename);
  
  switch (tipo) {
    case 'pdf':
      return await extractTextFromPDF(buffer);
    
    case 'docx':
      return await extractTextFromDOCX(buffer);
    
    case 'txt':
      return buffer.toString('utf-8');
    
    default:
      throw new Error('Tipo de archivo no soportado. Usa PDF, DOCX o TXT');
  }
}
