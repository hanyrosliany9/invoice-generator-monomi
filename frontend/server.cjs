#!/usr/bin/env node

const http = require('http')
const fs = require('fs')
const path = require('path')
const { URL } = require('url')

const PORT = process.env.FRONTEND_PORT || 3000
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'
const DIST_DIR = path.join(__dirname, 'dist')

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' })
      res.end('<h1>404 - Not Found</h1>')
      return
    }

    const mimeType = getMimeType(filePath)
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': data.length,
      'Cache-Control': filePath.includes('assets') ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    res.end(data)
  })
}

function proxyToBackend(pathname, method, headers, req, res) {
  const backendUrl = new URL(pathname, BACKEND_URL)

  const options = {
    hostname: new URL(BACKEND_URL).hostname,
    port: new URL(BACKEND_URL).port || 80,
    path: backendUrl.pathname + backendUrl.search,
    method: method,
    headers: {
      ...headers,
      host: new URL(BACKEND_URL).host,
    },
  }

  let body = ''
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    req.on('data', (chunk) => {
      body += chunk
    })
  }

  req.on('end', () => {
    const backendReq = http.request(options, (backendRes) => {
      res.writeHead(backendRes.statusCode, backendRes.headers)
      backendRes.pipe(res)
    })

    backendReq.on('error', (err) => {
      console.error('Backend proxy error:', err)
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Bad Gateway', details: err.message }))
    })

    if (body) {
      backendReq.write(body)
    }
    backendReq.end()
  })
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`)

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (pathname.startsWith('/api/')) {
    proxyToBackend(pathname, req.method, req.headers, req, res)
    return
  }

  if (pathname === '/health' || pathname === '/health/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }))
    return
  }

  let filePath = path.join(DIST_DIR, pathname)

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(DIST_DIR, 'index.html')
    }

    serveFile(filePath, res)
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Frontend Production Server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('Shutting down...')
  server.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('Shutting down...')
  server.close(() => process.exit(0))
})
