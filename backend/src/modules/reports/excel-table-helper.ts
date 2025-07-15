// Excel Table Formatting Helper for Indonesian Reports
import * as ExcelJS from 'exceljs';

export class ExcelTableHelper {
  
  /**
   * Apply professional table formatting to a worksheet
   */
  static formatAsTable(
    worksheet: ExcelJS.Worksheet, 
    startRow: number, 
    endRow: number, 
    startCol: number, 
    endCol: number,
    tableName: string
  ): void {
    // Create table range
    const tableRange = `${this.getColumnLetter(startCol)}${startRow}:${this.getColumnLetter(endCol)}${endRow}`;
    
    // Apply table formatting
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cell = worksheet.getCell(row, col);
        
        // Add borders to all cells
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        
        // Header row formatting
        if (row === startRow) {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' } // Professional blue
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          worksheet.getRow(row).height = 25;
          
          // Thick border for header
          cell.border = {
            top: { style: 'thick', color: { argb: 'FF000000' } },
            left: { style: 'thick', color: { argb: 'FF000000' } },
            bottom: { style: 'thick', color: { argb: 'FF000000' } },
            right: { style: 'thick', color: { argb: 'FF000000' } }
          };
        }
        // Data rows formatting
        else if (row < endRow) {
          // Alternate row colors
          if ((row - startRow) % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8F9FA' } // Light gray
            };
          }
          
          // Alignment based on content type
          if (typeof cell.value === 'number') {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        }
        // Summary row formatting
        else {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF70AD47' } // Green for totals
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          worksheet.getRow(row).height = 25;
          
          // Thick border for summary
          cell.border = {
            top: { style: 'thick', color: { argb: 'FF000000' } },
            left: { style: 'thick', color: { argb: 'FF000000' } },
            bottom: { style: 'thick', color: { argb: 'FF000000' } },
            right: { style: 'thick', color: { argb: 'FF000000' } }
          };
        }
      }
    }
  }
  
  /**
   * Format monthly summary table (vertical month list)
   */
  static formatMonthlySummaryTable(
    worksheet: ExcelJS.Worksheet,
    startRow: number,
    monthCount: number,
    isSingleMonth: boolean = false
  ): void {
    const endRow = startRow + monthCount + 1; // +1 for summary row
    
    // Apply table formatting
    this.formatAsTable(worksheet, startRow, endRow, 1, 2, 'MonthlySummary');
    
    // Set column widths
    worksheet.getColumn(1).width = 15; // Month names
    worksheet.getColumn(2).width = 18; // Amounts
  }
  
  /**
   * Format client summary table (horizontal client list)
   */
  static formatClientSummaryTable(
    worksheet: ExcelJS.Worksheet,
    startRow: number,
    clientCount: number,
    columnCount: number,
    isSingleMonth: boolean = false
  ): void {
    const endRow = startRow + clientCount + 1; // +1 for summary row
    
    // Apply table formatting
    this.formatAsTable(worksheet, startRow, endRow, 1, columnCount, 'ClientSummary');
    
    // Set column widths
    worksheet.getColumn(1).width = 20; // Client names
    for (let i = 2; i <= columnCount; i++) {
      worksheet.getColumn(i).width = isSingleMonth ? 18 : 12;
    }
  }
  
  /**
   * Add professional title formatting
   */
  static formatTitle(worksheet: ExcelJS.Worksheet, titleRows: number[]): void {
    titleRows.forEach((rowNum, index) => {
      const row = worksheet.getRow(rowNum);
      row.font = { 
        bold: true, 
        size: 14 - index, // Decreasing size for hierarchy
        color: { argb: 'FF2F5597' } // Professional dark blue
      };
      row.alignment = { horizontal: 'left', vertical: 'middle' };
      row.height = 20;
    });
  }
  
  /**
   * Convert column number to Excel letter (1 = A, 2 = B, etc.)
   */
  private static getColumnLetter(columnNumber: number): string {
    let letter = '';
    while (columnNumber > 0) {
      const remainder = (columnNumber - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      columnNumber = Math.floor((columnNumber - 1) / 26);
    }
    return letter;
  }
  
  /**
   * Apply Indonesian currency number formatting
   */
  static applyCurrencyFormat(worksheet: ExcelJS.Worksheet, columns: number[]): void {
    columns.forEach(colNum => {
      const column = worksheet.getColumn(colNum);
      column.numFmt = '"Rp "#,##0';
    });
  }
  
  /**
   * Apply Indonesian date formatting
   */
  static applyDateFormat(worksheet: ExcelJS.Worksheet, columns: number[]): void {
    columns.forEach(colNum => {
      const column = worksheet.getColumn(colNum);
      column.numFmt = 'dd/mm/yyyy';
    });
  }
}