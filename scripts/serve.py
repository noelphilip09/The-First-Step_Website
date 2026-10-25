#!/usr/bin/env python3
"""Dev server: static files with Cache-Control: no-store so edits show on reload.
Usage: python3 scripts/serve.py [port]  (default 5173)"""
import sys, os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml'}
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()
    def log_message(self, fmt, *args):
        if '404' in (args[1] if len(args) > 1 else ''):
            super().log_message(fmt, *args)

if __name__ == '__main__':
    try:
        httpd = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    except OSError as e:
        if getattr(e, 'errno', None) == 48:
            sys.exit(f'Port {PORT} is already in use (another copy of this server?). '
                     f'Stop it, or run: python3 scripts/serve.py {PORT + 1}')
        raise
    with httpd:
        print(f'Serving {ROOT} at http://127.0.0.1:{PORT}/ (no-store)', flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
