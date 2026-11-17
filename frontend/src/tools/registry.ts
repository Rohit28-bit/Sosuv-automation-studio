import type { ToolDefinition } from '../types'

/**
 * The 7 starter tools. Later the backend will serve this list from GET /api/tools,
 * so adding a tool will only need a backend change. The settings form in the UI is
 * built from `fields`, so no new UI code is needed per tool.
 */
export const TOOLS: ToolDefinition[] = [
  {
    type: 'ftp',
    name: 'FTP / SFTP',
    description: 'Download files from, or upload files to, an FTP or SFTP server.',
    icon: 'server',
    color: '#2563eb',
    fields: [
      { key: 'action', label: 'Action', type: 'select', options: ['download', 'upload'], default: 'download', required: true },
      { key: 'protocol', label: 'Protocol', type: 'select', options: ['sftp', 'ftp'], default: 'sftp', required: true },
      { key: 'host', label: 'Server', type: 'text', placeholder: 'ftp.vendor.com', required: true },
      { key: 'port', label: 'Port', type: 'number', default: 22 },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', help: 'Stored encrypted on the server.' },
      { key: 'remoteFolder', label: 'Remote folder', type: 'text', placeholder: '/outbound', required: true },
      { key: 'filePattern', label: 'File pattern', type: 'text', placeholder: 'daily_*.xlsx', default: '*' },
      { key: 'localPath', label: 'Local folder', type: 'text', placeholder: 'incoming/' },
    ],
  },
  {
    type: 'run_sql',
    name: 'Run SQL',
    description: 'Run a SQL query or a stored procedure.',
    icon: 'database',
    color: '#7c3aed',
    fields: [
      { key: 'dbType', label: 'Database type', type: 'select', options: ['postgresql', 'mssql', 'mysql'], default: 'postgresql', required: true },
      { key: 'connection', label: 'Connection string', type: 'password', placeholder: 'postgresql://user:pass@host/db', required: true },
      { key: 'mode', label: 'Mode', type: 'select', options: ['query', 'stored procedure'], default: 'query', required: true },
      { key: 'sql', label: 'SQL / procedure name', type: 'textarea', placeholder: 'SELECT * FROM orders', required: true },
      { key: 'parameters', label: 'Parameters (JSON)', type: 'textarea', placeholder: '{"BusinessDate": "{{run.date}}"}' },
    ],
  },
  {
    type: 'postgres',
    name: 'PostgreSQL',
    description: 'Execute SQL queries, inserts, or updates against a PostgreSQL database.',
    icon: 'postgres',
    color: '#336791',
    fields: [
      { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost', default: 'localhost', required: true },
      { key: 'port', label: 'Port', type: 'number', default: 5432 },
      { key: 'database', label: 'Database', type: 'text', placeholder: 'app_db', required: true },
      { key: 'username', label: 'Username', type: 'text', placeholder: 'postgres', required: true },
      { key: 'password', label: 'Password', type: 'password', help: 'Stored encrypted on the server.' },
      { key: 'ssl', label: 'Use SSL / TLS', type: 'checkbox', default: false },
      { key: 'operation', label: 'Operation', type: 'select', options: ['query', 'insert', 'update', 'stored procedure'], default: 'query', required: true },
      { key: 'query', label: 'SQL query', type: 'textarea', placeholder: 'SELECT * FROM orders WHERE created_at >= CURRENT_DATE', required: true },
      { key: 'parameters', label: 'Parameters (JSON)', type: 'textarea', placeholder: '{"limit": 100}' },
    ],
  },
  {
    type: 'mongodb',
    name: 'MongoDB',
    description: 'Find, insert, update, delete, or aggregate documents in a MongoDB collection.',
    icon: 'mongodb',
    color: '#10aa50',
    fields: [
      { key: 'connectionUri', label: 'Connection URI', type: 'password', placeholder: 'mongodb+srv://user:pass@cluster.mongodb.net', required: true, help: 'Stored encrypted on the server.' },
      { key: 'database', label: 'Database', type: 'text', placeholder: 'production', required: true },
      { key: 'collection', label: 'Collection', type: 'text', placeholder: 'orders', required: true },
      { key: 'operation', label: 'Operation', type: 'select', options: ['find', 'insertOne', 'updateMany', 'deleteMany', 'aggregate'], default: 'find', required: true },
      { key: 'filter', label: 'Filter / Query (JSON)', type: 'textarea', placeholder: '{"status": "pending"}' },
      { key: 'documentOrPipeline', label: 'Document / Update / Pipeline (JSON)', type: 'textarea', placeholder: '{"$set": {"processed": true}}' },
      { key: 'limit', label: 'Limit (for find)', type: 'number', default: 100 },
    ],
  },
  {
    type: 'convert_excel',
    name: 'Convert Excel',
    description: 'Convert Excel to CSV, or CSV back to Excel.',
    icon: 'sheet',
    color: '#16a34a',
    fields: [
      { key: 'inputFile', label: 'Input file', type: 'text', placeholder: 'incoming/daily_file.xlsx', required: true },
      { key: 'outputFormat', label: 'Output format', type: 'select', options: ['csv', 'xlsx'], default: 'csv', required: true },
      { key: 'sheetName', label: 'Sheet name', type: 'text', placeholder: 'Sheet1' },
      { key: 'outputFile', label: 'Output file', type: 'text', placeholder: 'processed/daily_file.csv' },
    ],
  },
  {
    type: 'move_file',
    name: 'Move File',
    description: 'Move or copy files between folders.',
    icon: 'folder',
    color: '#ea580c',
    fields: [
      { key: 'source', label: 'Source', type: 'text', placeholder: 'processed/*.csv', required: true },
      { key: 'destination', label: 'Destination', type: 'text', placeholder: 'archive/', required: true },
      { key: 'mode', label: 'Mode', type: 'select', options: ['move', 'copy'], default: 'move' },
      { key: 'overwrite', label: 'Overwrite existing files', type: 'checkbox', default: false },
    ],
  },
  {
    type: 'api_call',
    name: 'API Call',
    description: 'Call an HTTP API with GET, POST, PUT or DELETE.',
    icon: 'globe',
    color: '#0891b2',
    fields: [
      { key: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET', required: true },
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/notify', required: true },
      { key: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Authorization": "Bearer ..."}' },
      { key: 'body', label: 'Body (JSON)', type: 'textarea', placeholder: '{"status": "done"}' },
      { key: 'expectedStatus', label: 'Expected status code', type: 'number', default: 200 },
    ],
  },
  {
    type: 'process_file',
    name: 'Process File',
    description: 'Read, validate and filter file contents.',
    icon: 'filecheck',
    color: '#db2777',
    fields: [
      { key: 'inputFile', label: 'Input file', type: 'text', placeholder: 'incoming/daily_file.csv', required: true },
      { key: 'format', label: 'Expected format', type: 'select', options: ['csv', 'xlsx', 'json'], default: 'csv', required: true },
      { key: 'requiredColumns', label: 'Required columns', type: 'text', placeholder: 'id, amount, date', help: 'Comma separated.' },
      { key: 'filter', label: 'Row filter', type: 'text', placeholder: 'amount > 0' },
      { key: 'failIfEmpty', label: 'Fail if the file is empty', type: 'checkbox', default: true },
    ],
  },
  {
    type: 'wait',
    name: 'Wait',
    description: 'Pause the workflow for a set time.',
    icon: 'timer',
    color: '#64748b',
    fields: [{ key: 'seconds', label: 'Duration (seconds)', type: 'number', default: 5, required: true }],
  },
]

export const getTool = (type: string) => TOOLS.find((t) => t.type === type)

export function defaultConfig(tool: ToolDefinition) {
  const config: Record<string, string | number | boolean> = {}
  for (const f of tool.fields) {
    if (f.default !== undefined) config[f.key] = f.default
    else config[f.key] = f.type === 'checkbox' ? false : ''
  }
  return config
}
