import { useState } from 'react';
import Papa from 'papaparse';
import { App } from 'antd';

interface CSVData {
  columns: string[];
  data: any[];
}

/**
 * Hook for processing CSV files
 * Extracts CSV parsing logic from components
 *
 * @returns CSV processor functions and state
 * @property {CSVData | null} csvData - Parsed CSV data with columns and rows
 * @property {boolean} isProcessing - Whether CSV is currently being processed
 * @property {Function} processFile - Process a CSV file and extract columns/data
 * @property {Function} filterColumns - Filter CSV data to selected columns
 * @property {Function} reset - Reset CSV processor state
 *
 * @example
 * const { csvData, processFile, filterColumns } = useCSVProcessor();
 * const data = await processFile(file);
 * const csv = filterColumns(['name', 'email']);
 */
export const useCSVProcessor = () => {
  const { message } = App.useApp();
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = (file: File): Promise<CSVData> => {
    return new Promise((resolve, reject) => {
      setIsProcessing(true);

      Papa.parse(file, {
        header: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const columns = Object.keys(results.data[0] as object);
            const data = {
              columns,
              data: results.data,
            };
            setCsvData(data);
            setIsProcessing(false);
            resolve(data);
          } else {
            const error = new Error('CSV file is empty or invalid');
            setIsProcessing(false);
            reject(error);
          }
        },
        error: (error: any) => {
          const errorMessage = error?.message || 'Unknown error occurred';
          message.error(`Failed to parse CSV: ${errorMessage}`);
          setIsProcessing(false);
          reject(error);
        },
      });
    });
  };

  const filterColumns = (selectedColumns: string[]): string => {
    if (!csvData) return '';

    const filteredData = csvData.data.map((row) => {
      const filteredRow: any = {};
      selectedColumns.forEach((col) => {
        filteredRow[col] = row[col];
      });
      return filteredRow;
    });

    return Papa.unparse(filteredData);
  };

  const reset = () => {
    setCsvData(null);
    setIsProcessing(false);
  };

  return {
    csvData,
    isProcessing,
    processFile,
    filterColumns,
    reset,
  };
};
