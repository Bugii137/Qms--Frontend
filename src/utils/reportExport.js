export async function downloadExcelReport(records, columns, filename) {
  const XLSX = await import('xlsx')
  const rows = [
    columns.map(([, heading]) => heading),
    ...records.map(record => columns.map(([key]) => record[key] ?? '')),
  ]
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')
  XLSX.writeFile(workbook, filename)
}
