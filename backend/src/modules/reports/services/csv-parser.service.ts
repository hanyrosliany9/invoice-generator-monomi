import { Injectable, BadRequestException } from "@nestjs/common";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";

export type DataType = "DATE" | "NUMBER" | "STRING";

export interface ColumnTypes {
  [columnName: string]: DataType;
}

export interface ParsedCSVData {
  headers: string[];
  rows: any[];
  rowCount: number;
  columnTypes: ColumnTypes;
}

export interface VisualizationSuggestion {
  type: "line" | "bar" | "pie" | "area" | "table" | "metric_card";
  title: string;
  xAxis?: string;
  yAxis?: string | string[];
  nameKey?: string; // For pie charts
  valueKey?: string; // For pie charts and metric cards
  aggregation?: "sum" | "average" | "count" | "min" | "max";
  precision?: number; // For metric cards
  color?: string;
}

@Injectable()
export class UniversalCSVParserService {
  /**
   * Parse uploaded file into structured data
   */
  async parseFile(file: Buffer, filename: string): Promise<ParsedCSVData> {
    const extension = filename.split(".").pop()?.toLowerCase();

    let data: any[];

    if (extension === "csv") {
      data = await this.parseCSV(file);
    } else if (extension === "xlsx" || extension === "xls") {
      data = await this.parseExcel(file);
    } else {
      throw new BadRequestException(
        "Unsupported file format. Please upload CSV or Excel files.",
      );
    }

    if (!data || data.length === 0) {
      throw new BadRequestException("File is empty or invalid.");
    }

    // CRITICAL FIX: Filter out completely empty rows
    // Empty rows cause chart rendering failures in frontend
    const filteredData = this.filterEmptyRows(data);

    if (filteredData.length === 0) {
      throw new BadRequestException("File contains no valid data rows.");
    }

    const headers = Object.keys(filteredData[0]);
    const columnTypes = this.detectColumnTypes(filteredData);

    return {
      headers,
      rows: filteredData,
      rowCount: filteredData.length,
      columnTypes,
    };
  }

  /**
   * Filter out rows that are completely empty or have all empty values
   * Critical for chart rendering - empty rows break Recharts
   */
  private filterEmptyRows(data: any[]): any[] {
    return data.filter((row) => {
      // Get all values from the row
      const values = Object.values(row);

      // Check if at least ONE value is non-empty
      const hasValidData = values.some((value) => {
        if (value === null || value === undefined) return false;
        const str = String(value).trim();
        return str !== "";
      });

      return hasValidData;
    });
  }

  /**
   * Parse CSV file using PapaParse
   */
  private async parseCSV(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const content = buffer.toString("utf-8");

      Papa.parse(content, {
        header: true,
        dynamicTyping: false, // We'll handle type detection ourselves
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(
              new BadRequestException(
                `CSV parsing error: ${results.errors[0].message}`,
              ),
            );
          } else {
            resolve(results.data as any[]);
          }
        },
        error: (error: Error) => {
          reject(
            new BadRequestException(`CSV parsing failed: ${error.message}`),
          );
        },
      });
    });
  }

  /**
   * Parse Excel file using XLSX
   */
  private async parseExcel(buffer: Buffer): Promise<any[]> {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        throw new BadRequestException("Excel file is empty.");
      }

      return data as any[];
    } catch (error) {
      throw new BadRequestException(
        `Excel parsing failed: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Detect data type for each column
   * Returns: { columnName: "DATE" | "NUMBER" | "STRING" }
   */
  detectColumnTypes(data: any[]): ColumnTypes {
    const columns = Object.keys(data[0] || {});
    const types: ColumnTypes = {};

    for (const column of columns) {
      types[column] = this.inferDataType(data, column);
    }

    return types;
  }

  /**
   * Infer data type for a single column using DuckDB-inspired algorithm
   * References:
   * - DuckDB CSV Sniffer (2023): Chunk-based type detection with casting trials
   * - Pandas type inference: Hierarchical type testing with confidence thresholds
   * - Best practice: Sample-based detection for performance (2025)
   */
  private inferDataType(data: any[], columnName: string): DataType {
    // Adaptive sampling: use more samples for larger datasets
    const sampleSize = Math.min(
      Math.max(100, Math.floor(data.length * 0.1)),
      2048,
    );
    const samples = data.slice(0, sampleSize).map((row) => row[columnName]);

    // Remove nulls/undefined/empty strings
    const validSamples = samples.filter(
      (v) => v != null && String(v).trim() !== "",
    );

    if (validSamples.length === 0) return "STRING";

    // Calculate confidence threshold (85% for strict typing, allows 15% nulls/errors)
    const confidenceThreshold = 0.85;

    // TYPE HIERARCHY: Test in order from most specific to least specific
    // This prevents false positives (e.g., "1" being detected as date)

    // 1. NUMBER detection (BEFORE date to prevent "1" being detected as date)
    const numberCount = validSamples.filter((v) =>
      this.isValidNumber(v),
    ).length;
    const numberConfidence = numberCount / validSamples.length;

    if (numberConfidence >= confidenceThreshold) {
      return "NUMBER";
    }

    // 2. DATE detection (AFTER number, with strict pattern matching)
    const dateCount = validSamples.filter((v) => this.isValidDate(v)).length;
    const dateConfidence = dateCount / validSamples.length;

    if (dateConfidence >= confidenceThreshold) {
      return "DATE";
    }

    // 3. STRING (default fallback)
    // If mixed types or low confidence, treat as STRING for safety
    return "STRING";
  }

  /**
   * Check if value is a valid date using strict pattern matching
   * Based on 2025 best practices for date detection heuristics
   *
   * Strategy: Pattern-first approach to avoid false positives
   * - Rejects pure integers ("1", "42", "2025")
   * - Requires date-like structure (separators: -, /, space)
   * - Validates against common date formats
   */
  private isValidDate(value: any): boolean {
    if (value instanceof Date) return !isNaN(value.getTime());

    const str = String(value).trim();
    if (!str || str.length < 6) return false; // Minimum date length: "1/1/24"

    // REJECT: Pure integers without separators (e.g., "1", "42", "2025")
    // These are numbers, not dates, even if Date() can parse them
    if (/^\d+$/.test(str)) return false;

    // REJECT: Decimal numbers (e.g., "1.5", "42.99")
    if (/^\d+\.\d+$/.test(str)) return false;

    // ACCEPT: Date patterns with separators
    // Comprehensive list of common date formats worldwide (2025)
    const datePatterns = [
      // ISO 8601 formats (most reliable)
      /^\d{4}-\d{1,2}-\d{1,2}(T|\s)/i, // YYYY-MM-DD T HH:MM:SS or YYYY-MM-DD HH:MM:SS
      /^\d{4}-\d{1,2}-\d{1,2}$/, // YYYY-MM-DD

      // Slash-separated formats
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // MM/DD/YYYY, DD/MM/YYYY, M/D/YY
      /^\d{4}\/\d{1,2}\/\d{1,2}$/, // YYYY/MM/DD

      // Dash-separated formats
      /^\d{1,2}-\d{1,2}-\d{2,4}$/, // MM-DD-YYYY, DD-MM-YYYY

      // Dot-separated formats (European)
      /^\d{1,2}\.\d{1,2}\.\d{2,4}$/, // DD.MM.YYYY

      // Month name formats
      /^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}$/, // Month DD, YYYY or Month DD YYYY
      /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$/, // DD Month YYYY

      // Short month formats
      /^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/, // DD-MMM-YYYY (e.g., "15-Jan-2025")
    ];

    // Must match at least one pattern
    const matchesPattern = datePatterns.some((pattern) => pattern.test(str));
    if (!matchesPattern) return false;

    // Secondary validation: Can it be parsed as a date?
    const parsed = new Date(str);
    if (isNaN(parsed.getTime())) return false;

    // Sanity check: Reject unrealistic years (1800-2100)
    const year = parsed.getFullYear();
    if (year < 1800 || year > 2100) return false;

    return true;
  }

  /**
   * Check if value is a valid number
   * Handles various numeric formats including currency, percentages, scientific notation
   * Based on 2025 best practices for robust number parsing
   */
  private isValidNumber(value: any): boolean {
    // Handle native numeric types
    if (typeof value === "number") return !isNaN(value) && isFinite(value);

    const str = String(value).trim();
    if (!str) return false;

    // Clean common numeric formats:
    // - Currency symbols: $, €, £, ¥, Rp, etc.
    // - Thousands separators: commas, spaces, periods (in some locales)
    // - Percentage signs: %
    // - Parentheses for negatives: (42.50)
    let cleaned = str
      .replace(/[$€£¥₹Rp%\s]/g, "") // Remove currency and % symbols
      .replace(/,/g, "") // Remove commas (thousands separator)
      .replace(/^\((.+)\)$/, "-$1"); // Convert (42) to -42

    // Accept scientific notation (e.g., "1.5e10", "1.5E-3")
    if (/^[+-]?\d+\.?\d*[eE][+-]?\d+$/.test(cleaned)) {
      const num = parseFloat(cleaned);
      return !isNaN(num) && isFinite(num);
    }

    // Accept standard decimal numbers
    // Patterns: "42", "-42", "42.5", "-42.5", ".5", "-.5"
    if (/^[+-]?\d*\.?\d+$/.test(cleaned)) {
      const num = parseFloat(cleaned);
      return !isNaN(num) && isFinite(num);
    }

    return false;
  }

  /**
   * Generate visualization suggestions based on column types
   * Smart visualization recommendations based on data structure
   * Handles various CSV structures: time-series, categorical, numeric-only, etc.
   */
  suggestVisualizations(
    data: any[],
    columnTypes: ColumnTypes,
  ): VisualizationSuggestion[] {
    const suggestions: VisualizationSuggestion[] = [];

    // Find columns by type
    const dateColumns = Object.keys(columnTypes).filter(
      (k) => columnTypes[k] === "DATE",
    );
    const numberColumns = Object.keys(columnTypes).filter(
      (k) => columnTypes[k] === "NUMBER",
    );
    const stringColumns = Object.keys(columnTypes).filter(
      (k) => columnTypes[k] === "STRING",
    );

    // STRATEGY 1: Time series (if has date + numbers)
    if (dateColumns.length > 0 && numberColumns.length > 0) {
      const dateCol = dateColumns[0];

      // Create line chart for each numeric column (max 3)
      numberColumns.slice(0, 3).forEach((numCol) => {
        suggestions.push({
          type: "line",
          title: `${this.humanize(numCol)} Over Time`,
          xAxis: dateCol,
          yAxis: [numCol],
          color: this.getRandomColor(),
        });
      });
    }

    // STRATEGY 2: Category comparison (if has strings + numbers)
    if (stringColumns.length > 0 && numberColumns.length > 0) {
      const stringCol = stringColumns[0];
      const numCol = numberColumns[0];

      suggestions.push({
        type: "bar",
        title: `${this.humanize(numCol)} by ${this.humanize(stringCol)}`,
        xAxis: stringCol,
        yAxis: [numCol],
        color: this.getRandomColor(),
      });

      // Add pie chart for categorical data (top categories)
      if (data.length >= 3) {
        suggestions.push({
          type: "pie",
          title: `Distribution of ${this.humanize(numCol)}`,
          nameKey: stringCol,
          valueKey: numCol,
          color: this.getRandomColor(),
        });
      }
    }

    // STRATEGY 3: All numeric columns (e.g., Facebook Ads metrics)
    // When X-axis is also numeric (not date), use bar charts
    if (
      numberColumns.length >= 2 &&
      dateColumns.length === 0 &&
      stringColumns.length === 0
    ) {
      // Use first numeric column as X-axis, rest as Y-axes
      const xCol = numberColumns[0];

      numberColumns.slice(1, 4).forEach((yCol) => {
        suggestions.push({
          type: "bar",
          title: `${this.humanize(yCol)} vs ${this.humanize(xCol)}`,
          xAxis: xCol,
          yAxis: [yCol],
          color: this.getRandomColor(),
        });
      });
    }

    // STRATEGY 4: Metric cards (for all numbers)
    // Show key metrics as cards
    numberColumns.slice(0, 4).forEach((numCol) => {
      suggestions.push({
        type: "metric_card",
        title: `Total ${this.humanize(numCol)}`,
        valueKey: numCol,
        aggregation: "sum",
        precision: 2,
      });
    });

    // STRATEGY 5: Always include table view as fallback
    suggestions.push({
      type: "table",
      title: "Data Table",
    });

    return suggestions;
  }

  /**
   * Convert column name to human-readable
   * "amount_spent" → "Amount Spent"
   */
  private humanize(columnName: string): string {
    return columnName
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  /**
   * Get random chart color
   */
  private getRandomColor(): string {
    const colors = [
      "#1890ff",
      "#52c41a",
      "#faad14",
      "#eb2f96",
      "#722ed1",
      "#13c2c2",
      "#fa8c16",
      "#a0d911",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
